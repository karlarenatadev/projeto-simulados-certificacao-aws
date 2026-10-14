// HTTP client runs in a separate process/container from Express + PGlite.
import assert from "node:assert/strict";
import { request as httpRequest, Agent } from "node:http";
import { performance } from "node:perf_hooks";

const base = new URL(process.env.TARGET_URL || "http://127.0.0.1:3001");
assert.equal(base.protocol, "http:");
assert.ok(
  ["localhost", "127.0.0.1", "api"].includes(base.hostname),
  "Only local synthetic targets are allowed",
);
assert.equal(Number(base.port || 80), 3001);
const users = Number(process.env.USERS || 30);
const durationSeconds = Number(process.env.DURATION_SECONDS || 0);
const thinkMs = Number(process.env.THINK_MS || 0);
const metricsToken = process.env.CLOUDACADEMY_PERF_DIAGNOSTICS_TOKEN || "";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: users,
  maxTotalSockets: users,
});
assert.ok([10, 30, 50, 150].includes(users));
assert.ok(durationSeconds >= 0 && durationSeconds <= 1800);
assert.ok(thinkMs >= 0 && thinkMs <= 30000);
assert.ok(metricsToken.length >= 20);

const observations = new Map();
const statuses = {};
const failures = [];
let completedQuizzes = 0;
let totalAnswers = 0;
let duplicates = 0;
let stopAt = durationSeconds
  ? performance.now() + durationSeconds * 1000
  : Infinity;

function send(url, options) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { ...options, agent: httpAgent },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.setTimeout(120000, () =>
      request.destroy(new Error("HTTP request timed out")),
    );
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function request(userIndex, path, { token, body, method } = {}) {
  const started = performance.now();
  const requestMethod = method || (body === undefined ? "GET" : "POST");
  try {
    const response = await send(new URL(path, base), {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const duration = performance.now() - started;
    statuses[response.status] = (statuses[response.status] || 0) + 1;
    const key = path.includes("/answer")
      ? "POST /api/quiz/:id/answer"
      : path.includes("/finish")
        ? "POST /api/quiz/:id/finish"
        : path.includes("/results")
          ? "GET /api/quiz/:id/results"
          : /^\/api\/users\/[^/]+\/stats$/.test(path)
            ? "GET /api/users/:id/stats"
            : path.split("?")[0];
    const samples = observations.get(key) || [];
    if (samples.length < 200000) samples.push(duration);
    observations.set(key, samples);
    if (response.status < 200 || response.status >= 300)
      throw new Error(
        `${requestMethod} ${key}: HTTP ${response.status} ${response.text.slice(0, 160)}`,
      );
    return response.text ? JSON.parse(response.text) : {};
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function userLoop(index) {
  try {
    const login = await request(index, "/api/auth/login", {
      body: { email: `stage3-${runId}-${index}@a3data.com.br` },
    });
    const token = login.data.access_token;
    let journeyVersion = 0;
    while (performance.now() < stopAt) {
      await request(index, "/api/auth/me", { token });
      await request(
        index,
        "/api/questions?certification=CLF-C02&language=pt&limit=10",
        { token },
      );
      const started = await request(index, "/api/quiz/start", {
        token,
        body: { certification: "CLF-C02", language: "pt", num_questions: 10 },
      });
      for (const question of started.data.questions) {
        const answer = await request(
          index,
          `/api/quiz/${started.data.quiz_id}/answer`,
          {
            token,
            body: { question_id: question.id, user_answer: [0], time_secs: 1 },
          },
        );
        totalAnswers++;
        if (answer.data.idempotent) duplicates++;
        if (thinkMs) await pause(thinkMs);
      }
      await request(index, `/api/quiz/${started.data.quiz_id}/finish`, {
        token,
        body: {},
      });
      await request(index, `/api/quiz/${started.data.quiz_id}/results`, {
        token,
      });
      await request(index, `/api/users/${login.data.id}/stats`, { token });
      const journey = await request(index, "/api/me/state/journey", {
        token,
        method: "PUT",
        body: {
          certification: "CLF-C02",
          version: journeyVersion,
          state: { stage: "stage3-synthetic" },
        },
      });
      journeyVersion = journey.data.version;
      completedQuizzes++;
      if (!durationSeconds) break;
      if (thinkMs) await pause(thinkMs * 2);
    }
  } catch (error) {
    failures.push(`user-${index}: ${error.message}`);
  }
}

const elapsedStarted = performance.now();
const initialIntegrityResponse = await send(
  new URL("/api/__diagnostics/integrity", base),
  {
    headers: { Authorization: `Bearer ${metricsToken}` },
  },
);
assert.equal(
  initialIntegrityResponse.status,
  200,
  "synthetic integrity baseline must be authenticated",
);
const initialIntegrity = JSON.parse(initialIntegrityResponse.text);
const resetResponse = await fetch(
  new URL("/api/__diagnostics/performance?reset=1", base),
  {
    headers: { Authorization: `Bearer ${metricsToken}` },
  },
);
assert.equal(
  resetResponse.status,
  200,
  "diagnostic reset must be authenticated",
);
stopAt = durationSeconds
  ? performance.now() + durationSeconds * 1000
  : Infinity;
await Promise.all(Array.from({ length: users }, (_, index) => userLoop(index)));
const elapsedMs = performance.now() - elapsedStarted;
const percentile = (items, fraction) => {
  const sorted = [...items].sort((a, b) => a - b);
  return (
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ] ?? null
  );
};
const allLatencies = [...observations.values()].flat();
const requestLatency = Object.fromEntries(
  [...observations].map(([key, values]) => [
    key,
    {
      count: values.length,
      p50Ms: percentile(values, 0.5),
      p95Ms: percentile(values, 0.95),
      p99Ms: percentile(values, 0.99),
      maxMs: values.reduce((max, value) => Math.max(max, value), 0),
    },
  ]),
);
const serverMetricsResponse = await send(
  new URL("/api/__diagnostics/performance?reset=0", base),
  {
    headers: { Authorization: `Bearer ${metricsToken}` },
  },
);
assert.equal(
  serverMetricsResponse.status,
  200,
  "diagnostic endpoint must be enabled and authenticated",
);
const serverMetrics = JSON.parse(serverMetricsResponse.text);
const integrityResponse = await send(
  new URL("/api/__diagnostics/integrity", base),
  {
    headers: { Authorization: `Bearer ${metricsToken}` },
  },
);
assert.equal(
  integrityResponse.status,
  200,
  "synthetic integrity endpoint must be authenticated",
);
const integrity = JSON.parse(integrityResponse.text);
assert.equal(
  integrity.duplicate_answers,
  0,
  "synthetic run must not create duplicate answers",
);
assert.equal(
  integrity.answers_without_membership,
  0,
  "every answer must belong to the persisted quiz question set",
);
const integrityDelta = Object.fromEntries(
  ["users", "completed_quizzes", "started_quizzes", "answers"].map((key) => [
    key,
    integrity[key] - initialIntegrity[key],
  ]),
);
assert.equal(
  integrityDelta.users,
  users,
  "all synthetic employees must be durably created",
);
assert.equal(
  integrityDelta.completed_quizzes,
  completedQuizzes,
  "all completed quizzes must be durable in the synthetic database",
);
assert.equal(
  integrityDelta.answers,
  totalAnswers,
  "all submitted answers must be durable in the synthetic database",
);
assert.equal(
  integrityDelta.started_quizzes,
  0,
  "the workload must leave no incomplete synthetic quizzes",
);
httpAgent.destroy();
process.stdout.write(
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      users,
      durationSeconds,
      thinkMs,
      elapsedMs,
      rps:
        Object.values(requestLatency).reduce(
          (sum, item) => sum + item.count,
          0,
        ) /
        (elapsedMs / 1000),
      aggregateRequests: {
        count: allLatencies.length,
        p50Ms: percentile(allLatencies, 0.5),
        p95Ms: percentile(allLatencies, 0.95),
        p99Ms: percentile(allLatencies, 0.99),
        maxMs: allLatencies.reduce((max, value) => Math.max(max, value), 0),
      },
      completedQuizzes,
      totalAnswers,
      idempotentResponses: duplicates,
      failures,
      statuses,
      requests: requestLatency,
      integrity: {
        before: initialIntegrity,
        after: integrity,
        delta: integrityDelta,
      },
      server: serverMetrics,
      client: {
        rssMiB: process.memoryUsage().rss / 1048576,
        heapUsedMiB: process.memoryUsage().heapUsed / 1048576,
      },
    },
    null,
    2,
  ),
);
if (failures.length)
  throw new Error(`${failures.length} synthetic user flow(s) failed`);
