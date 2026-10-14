import { monitorEventLoopDelay, performance } from "node:perf_hooks";

const enabled = process.env.CLOUDACADEMY_PERF_DIAGNOSTICS === "1";
const limits = [
  1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000,
];
const sqlMetrics = new Map();
const httpMetrics = new Map();
const operationMetrics = new Map();
const eventLoop = enabled ? monitorEventLoopDelay({ resolution: 20 }) : null;
if (eventLoop) eventLoop.enable();
let activeQueries = 0;
let peakActiveQueries = 0;
let previousCpu = process.cpuUsage();
let previousElu = performance.eventLoopUtilization();

function metricFor(collection, label) {
  if (!collection.has(label)) {
    collection.set(label, {
      count: 0,
      errors: 0,
      totalMs: 0,
      maxMs: 0,
      buckets: new Array(limits.length + 1).fill(0),
    });
  }
  return collection.get(label);
}

function record(collection, label, durationMs, failed = false) {
  const metric = metricFor(collection, label);
  metric.count++;
  if (failed) metric.errors++;
  metric.totalMs += durationMs;
  metric.maxMs = Math.max(metric.maxMs, durationMs);
  const bucket = limits.findIndex((limit) => durationMs <= limit);
  metric.buckets[bucket === -1 ? limits.length : bucket]++;
}

function percentiles(metric) {
  const percentile = (fraction) => {
    if (!metric.count) return 0;
    const target = Math.ceil(metric.count * fraction);
    let seen = 0;
    for (let index = 0; index < metric.buckets.length; index++) {
      seen += metric.buckets[index];
      if (seen >= target) return limits[index] ?? ">60000";
    }
    return ">60000";
  };
  return {
    count: metric.count,
    errors: metric.errors,
    totalMs: Number(metric.totalMs.toFixed(2)),
    meanMs: Number((metric.totalMs / metric.count).toFixed(2)),
    maxMs: Number(metric.maxMs.toFixed(2)),
    p50UpperBoundMs: percentile(0.5),
    p95UpperBoundMs: percentile(0.95),
    p99UpperBoundMs: percentile(0.99),
  };
}

function snapshot(collection) {
  return Object.fromEntries(
    [...collection.entries()].map(([label, metric]) => [
      label,
      percentiles(metric),
    ]),
  );
}

function sqlLabel(sql) {
  const normalized = String(sql).replace(/\s+/g, " ").trim();
  const verb =
    normalized
      .match(
        /^(SELECT|INSERT|UPDATE|DELETE|WITH|BEGIN|COMMIT|ROLLBACK)\b/i,
      )?.[1]
      ?.toUpperCase() || "OTHER";
  const table = normalized
    .match(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/i)?.[1]
    ?.toLowerCase();
  return `${verb}${table ? ` ${table}` : ""}`;
}

export async function measureDatabaseQuery(executor, sql, params = []) {
  if (!enabled) return executor.query(sql, params);
  activeQueries++;
  peakActiveQueries = Math.max(peakActiveQueries, activeQueries);
  const started = performance.now();
  let failed = false;
  try {
    return await executor.query(sql, params);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    record(sqlMetrics, sqlLabel(sql), performance.now() - started, failed);
    activeQueries--;
  }
}

export function measureOperation(label, startedAt, failed = false) {
  if (enabled)
    record(operationMetrics, label, performance.now() - startedAt, failed);
}

export async function measureAsyncOperation(label, operation) {
  if (!enabled) return operation();
  const startedAt = performance.now();
  let failed = false;
  try {
    return await operation();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    measureOperation(label, startedAt, failed);
  }
}

export function trackHttpRequest(req, res) {
  if (!enabled || req.path.startsWith("/api/__diagnostics/")) return;
  const started = performance.now();
  let failed = false;
  res.once("finish", () => {
    const route =
      typeof req.route?.path === "string"
        ? `${req.baseUrl}${req.route.path}`
        : "<unmatched>";
    record(
      httpMetrics,
      `${req.method} ${route}`,
      performance.now() - started,
      failed || res.statusCode >= 500,
    );
  });
  res.once("close", () => {
    if (!res.writableFinished) failed = true;
  });
}

export function getPerformanceMetrics({ reset = false } = {}) {
  if (!enabled) return { enabled: false };
  const cpu = process.cpuUsage(previousCpu);
  previousCpu = process.cpuUsage();
  const elu = performance.eventLoopUtilization(previousElu);
  previousElu = performance.eventLoopUtilization();
  const delay = {
    meanMs: Number((eventLoop.mean / 1e6 || 0).toFixed(3)),
    maxMs: Number((eventLoop.max / 1e6 || 0).toFixed(3)),
    p95Ms: Number((eventLoop.percentile(95) / 1e6 || 0).toFixed(3)),
    p99Ms: Number((eventLoop.percentile(99) / 1e6 || 0).toFixed(3)),
  };
  const result = {
    enabled: true,
    measuredAt: new Date().toISOString(),
    http: snapshot(httpMetrics),
    sql: snapshot(sqlMetrics),
    operations: snapshot(operationMetrics),
    runtime: {
      rssMiB: Number((process.memoryUsage().rss / 1048576).toFixed(2)),
      heapUsedMiB: Number(
        (process.memoryUsage().heapUsed / 1048576).toFixed(2),
      ),
      externalMiB: Number(
        (process.memoryUsage().external / 1048576).toFixed(2),
      ),
      cpuUserMs: Number((cpu.user / 1000).toFixed(2)),
      cpuSystemMs: Number((cpu.system / 1000).toFixed(2)),
      eventLoopUtilization: Number(elu.utilization.toFixed(4)),
      eventLoopDelay: delay,
      activeQueries,
      peakActiveQueries,
    },
    histogramUpperBoundsMs: limits,
    note: "SQL wall duration includes PGlite queue wait and execution; PGlite exposes no supported per-query queue-wait metric.",
  };
  if (reset) {
    sqlMetrics.clear();
    httpMetrics.clear();
    operationMetrics.clear();
    peakActiveQueries = activeQueries;
    eventLoop.reset();
  }
  return result;
}
