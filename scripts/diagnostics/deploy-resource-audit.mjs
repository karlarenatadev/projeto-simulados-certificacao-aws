// Synthetic, loopback-only audit. Never accepts a database or remote API target.
// Retains its unique temporary databases and dumps for inspection; no deletion.
import { spawn } from "node:child_process";
import { mkdtemp, readdir, stat, writeFile, readFile } from "node:fs/promises";
import { tmpdir, cpus, totalmem, platform, arch } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(
  process.env.AUDIT_OUTPUT_PATH ||
    join(root, "docs/audits/evidence/2026-10-13/resources.json"),
);
const mib = (n) => Math.round((n / 1048576) * 100) / 100;
const ms = (n) => Math.round(n * 100) / 100;
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else if (entry.isFile())
      result.push({ path, bytes: (await stat(path)).size });
  }
  return result;
}
const disk = async (directory) =>
  (await files(directory)).reduce((n, f) => n + f.bytes, 0);
const memory = () =>
  Object.fromEntries(
    Object.entries(process.memoryUsage()).map(([k, v]) => [k + "MiB", mib(v)]),
  );

async function worker(concurrency, profile) {
  const temporary = await mkdtemp(
    join(tmpdir(), "cloudacademy-synthetic-audit-"),
  );
  // Set all runtime selectors before db.js loads dotenv; no real DB is opened.
  Object.assign(process.env, {
    NODE_ENV: "test",
    DB_ENGINE: "pglite",
    DB_DATA_DIR: join(temporary, "data"),
    AUTH_SESSION_SECRET:
      "synthetic-audit-only-0123456789abcdefghijklmnopqrstuvwxyz",
    ALLOW_DEV_EMAIL_LOGIN: "true",
    DEBUG: "false",
    DB_DEBUG: "false",
  });
  delete process.env.DATABASE_URL;
  console.log = () => {};
  const baseline = memory();
  const startup = performance.now();
  const database = await import("../../backend/database/db.js");
  const { default: app } = await import("../../backend/api/server.js");
  const imported = memory();
  await database.initializeDatabase();
  const initialized = memory();
  const startupMs = ms(performance.now() - startup);
  for (let i = 0; i < 40; i++)
    await database.insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: `audit-${i}`,
      domain: "faturamento",
      difficulty: "easy",
      question_text: `Synthetic audit question ${i}: select the first option.`,
      options: ["First", "Second", "Third", "Fourth"],
      correct_answer: [0],
      explanation: "Synthetic fixture; not educational content.",
      validation_status: "APPROVED",
    });
  // Distinct-IP mode models corporate proxy preserving client IPs. Shared-IP mode
  // intentionally exercises the unmodified real IP limiter; no rate limit bypass.
  app.set("trust proxy", ["127.0.0.1", "::1"]);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((accept) => server.once("listening", accept));
  const base = `http://127.0.0.1:${server.address().port}`;
  const beforeBytes = await disk(process.env.DB_DATA_DIR);
  const observations = [];
  const peaks = memory();
  const sampler = setInterval(() => {
    for (const [key, value] of Object.entries(memory()))
      peaks[key] = Math.max(peaks[key], value);
  }, 50);
  const loop = monitorEventLoopDelay({ resolution: 20 });
  loop.enable();
  const cpu = process.cpuUsage();
  const started = performance.now();
  let completed = 0;
  const failures = [];
  async function request(index, path, { token, body } = {}) {
    const begin = performance.now();
    let response;
    try {
      response = await fetch(base + path, {
        method:
          body === undefined
            ? "GET"
            : path.includes("/state/")
              ? "PUT"
              : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For":
            profile === "shared-ip" ? "192.0.2.1" : `192.0.2.${index + 1}`,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (error) {
      const cause = error.cause?.code || error.cause?.message || error.message;
      throw new Error(`FETCH ${path}: ${cause}`);
    }
    const text = await response.text();
    observations.push({
      path: path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ":id"),
      status: response.status,
      ms: ms(performance.now() - begin),
      bytes: Buffer.byteLength(text),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return JSON.parse(text).data;
  }
  await Promise.all(
    Array.from({ length: concurrency }, async (_, index) => {
      try {
        const login = await request(index, "/api/auth/login", {
          body: { email: `synthetic-${index}@a3data.com.br` },
        });
        const token = login.access_token;
        await request(index, "/api/auth/me", { token });
        await request(
          index,
          "/api/questions?certification=CLF-C02&language=pt&limit=10",
          { token },
        );
        const quiz = await request(index, "/api/quiz/start", {
          token,
          body: { certification: "CLF-C02", language: "pt", num_questions: 10 },
        });
        for (const question of quiz.questions)
          await request(index, `/api/quiz/${quiz.quiz_id}/answer`, {
            token,
            body: { question_id: question.id, user_answer: [0], time_secs: 1 },
          });
        await request(index, `/api/quiz/${quiz.quiz_id}/finish`, {
          token,
          body: {},
        });
        await request(index, `/api/quiz/${quiz.quiz_id}/results`, { token });
        await request(index, `/api/users/${login.id}/stats`, { token });
        await request(index, "/api/me/state/journey", {
          token,
          body: {
            certification: "CLF-C02",
            version: 0,
            state: { stage: "synthetic-completed" },
          },
        });
        completed++;
      } catch (error) {
        failures.push(error.message);
      }
    }),
  );
  const elapsedMs = performance.now() - started;
  const consumed = process.cpuUsage(cpu);
  clearInterval(sampler);
  loop.disable();
  const sorted = observations.map((v) => v.ms).sort((a, b) => a - b);
  const percentile = (p) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ??
    null;
  const counts = async () =>
    (
      await database.executeQuery(`SELECT
    (SELECT count(*)::int FROM users) AS users,
    (SELECT count(*)::int FROM quiz_history WHERE status='completed') AS completed,
    (SELECT count(*)::int FROM answers) AS answers,
    (SELECT count(*)::int FROM user_module_state) AS states,
    (SELECT count(*)::int FROM (SELECT quiz_id,question_id FROM answers GROUP BY quiz_id,question_id HAVING count(*)>1) AS duplicates) AS duplicates`)
    )[0];
  const integrity = await counts();
  assert.equal(integrity.duplicates, 0);
  if (profile === "distinct-ip") {
    assert.ok(integrity.completed <= concurrency);
    assert.ok(integrity.answers <= concurrency * 10);
    assert.ok(integrity.states <= concurrency);
  }
  const afterBytes = await disk(process.env.DB_DATA_DIR);
  const dumpStarted = performance.now();
  const dump = await database.getDatabase().dumpDataDir();
  await writeFile(
    join(temporary, "backup.tar.gz"),
    Buffer.from(await dump.arrayBuffer()),
  );
  const backupMs = ms(performance.now() - dumpStarted);
  await new Promise((accept) => server.close(accept));
  await database.closeDatabase();
  const restart = performance.now();
  await database.initializeDatabase();
  const restartMs = ms(performance.now() - restart);
  assert.deepEqual(await counts(), integrity);
  await database.closeDatabase();
  const { PGlite } = await import("@electric-sql/pglite");
  const restoreStarted = performance.now();
  const restored = await PGlite.create({
    dataDir: join(temporary, "restored"),
    loadDataDir: new Blob([await readFile(join(temporary, "backup.tar.gz"))]),
  });
  const restoredCount = (
    await restored.query("SELECT count(*)::int AS count FROM answers")
  ).rows[0].count;
  assert.equal(restoredCount, integrity.answers);
  const restoreMs = ms(performance.now() - restoreStarted);
  await restored.close();
  return {
    concurrency,
    profile,
    questionFixtureCount: 40,
    questionsPerQuiz: 10,
    completed,
    scenarioPassed: completed === concurrency,
    expectedCompleted: concurrency,
    failures,
    requestCount: observations.length,
    elapsedMs: ms(elapsedMs),
    rps: ms(observations.length / (elapsedMs / 1000)),
    latencyMs: {
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    },
    statusCounts: observations.reduce(
      (a, v) => ({ ...a, [v.status]: (a[v.status] || 0) + 1 }),
      {},
    ),
    cpu: {
      userMs: consumed.user / 1000,
      systemMs: consumed.system / 1000,
      averageOneCorePercent: ms(
        ((consumed.user + consumed.system) / 1000 / elapsedMs) * 100,
      ),
    },
    eventLoopP99Ms: ms(loop.percentile(99) / 1e6),
    memory: {
      baseline,
      imported,
      initialized,
      sampledPeaks: peaks,
      processLifetimeMaxRssMiB: mib(process.resourceUsage().maxRSS * 1024),
    },
    disk: { beforeBytes, afterBytes, growthBytes: afterBytes - beforeBytes },
    startupMs,
    backupMs,
    restartMs,
    restoreMs,
    integrity,
    restoredAnswers: restoredCount,
    temporary,
    limitations:
      "Synthetic email login, no Google network, no browser, closed-loop burst without think time; PGlite shares Node RSS. Restart is graceful, not crash/power-loss. Windows is not an AWS VM.",
  };
}

if (process.argv[2] === "--worker") {
  const n = Number(process.argv[3]);
  const profile = process.argv[4];
  assert.ok(
    [10, 30, 50, 150].includes(n) &&
      ["shared-ip", "distinct-ip"].includes(profile),
  );
  process.stdout.write(JSON.stringify(await worker(n, profile)));
} else {
  assert.equal(
    process.argv.length,
    2,
    "No remote targets or arguments accepted",
  );
  const inventory = await files(join(root, "public"));
  const build = {
    files: inventory.length,
    bytes: 0,
    gzipBytes: 0,
    extensions: {},
    largest: [],
  };
  for (const file of inventory) {
    const ext = file.path.split(".").pop();
    const gzip = gzipSync(await readFile(file.path)).length;
    build.bytes += file.bytes;
    build.gzipBytes += gzip;
    build.extensions[ext] = (build.extensions[ext] || 0) + file.bytes;
  }
  build.largest = inventory
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15)
    .map((v) => ({ path: v.path.slice(root.length), bytes: v.bytes }));
  const result = {
    recordedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0].model,
      logicalCpus: cpus().length,
      physicalRamMiB: mib(totalmem()),
    },
    build,
    scenarios: [],
  };
  for (const [n, profile] of [
    [10, "distinct-ip"],
    [30, "distinct-ip"],
    [50, "distinct-ip"],
    [150, "distinct-ip"],
    [30, "shared-ip"],
  ]) {
    const child = spawn(
      process.execPath,
      [fileURLToPath(import.meta.url), "--worker", String(n), profile],
      { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    const code = await new Promise((accept, reject) => {
      child.once("error", reject);
      child.once("exit", accept);
    });
    assert.equal(code, 0, `Synthetic worker failed: ${stderr.slice(-1500)}`);
    result.scenarios.push(JSON.parse(stdout));
    await writeFile(output, JSON.stringify(result, null, 2) + "\n");
    console.log(`Recorded ${n} users (${profile})`);
  }
  console.log(resolve(output));
}
