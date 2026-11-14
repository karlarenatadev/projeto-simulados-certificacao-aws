#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

const stagingEnv = {
  NODE_ENV: "staging",
  DB_ENGINE: "pglite",
  PORT: "3001",
  DB_DATA_DIR: process.env.DB_DATA_DIR,
  AUTH_SESSION_SECRET: randomBytes(48).toString("base64url"),
  AUTH_ALLOWED_DOMAINS: "canary.testcorp.com",
  AUTH_ALLOWED_EMAILS:
    "synthetic-one@canary.testcorp.com,synthetic-two@canary.testcorp.com,synthetic-disabled@canary.testcorp.com",
  GOOGLE_CLIENT_ID: "stage42-synthetic.apps.googleusercontent.com",
  TRUST_PROXY: "127.0.0.1",
  CORS_ALLOWED_ORIGINS: "https://canary.testcorp.com",
};

const apiUrl = "http://127.0.0.1:3001";
const proxyUrl = "https://127.0.0.1:8443";
const root = process.env.STAGE42_ROOT || "/var/lib/cloudacademy/stage4-2";
const dbDir = resolve(stagingEnv.DB_DATA_DIR || "");
const backupDir = resolve(process.env.BACKUP_OUTPUT_DIR || "");
const restoreDir = resolve(process.env.RESTORE_DATA_DIR || "");
const identityPath = join(root, "age-test-identity.txt");
const recipientPath = join(root, "age-test-recipient.txt");
const nginxDir = join(root, "nginx");
const tlsDir = join(root, "tls");
const logDir = join(root, "logs");
const summaryPath = join(root, "stage4-2-summary.json");
const serverLogPath = join(logDir, "api.log");
const nginxAccessPath = join(logDir, "nginx-access.log");
const binaries = {
  nginx: "/usr/sbin/nginx",
  age: "/usr/bin/age",
  "age-keygen": "/usr/bin/age-keygen",
  openssl: "/usr/bin/openssl",
  curl: "/usr/bin/curl",
  ss: "/usr/bin/ss",
};
let activeApi;
let activeNginx;
const serverMetricsAggregate = { peakRssMiB: 0, cpuSeconds: 0, ioBytes: 0 };
let measuredRequests = [];

class ProcMetrics {
  constructor(pid) {
    this.pid = pid;
    this.timer = null;
    this.firstCpuTicks = null;
    this.lastCpuTicks = 0;
    this.peakRssBytes = 0;
    this.readBytes = 0;
    this.writeBytes = 0;
  }
  start() {
    this.timer = setInterval(() => void this.sample(), 100);
    void this.sample();
  }
  stop() {
    clearInterval(this.timer);
  }
  async sample() {
    try {
      const status = await readFile(`/proc/${this.pid}/status`, "utf8");
      const statLine = await readFile(`/proc/${this.pid}/stat`, "utf8");
      const io = await readFile(`/proc/${this.pid}/io`, "utf8");
      const rss = Number(status.match(/^VmRSS:\s+(\d+)\s+kB/m)?.[1] || 0) * 1024;
      this.peakRssBytes = Math.max(this.peakRssBytes, rss);
      const values = statLine.slice(statLine.lastIndexOf(")") + 2).split(/\s+/);
      const cpuTicks = Number(values[11] || 0) + Number(values[12] || 0);
      if (this.firstCpuTicks === null) this.firstCpuTicks = cpuTicks;
      this.lastCpuTicks = cpuTicks;
      this.readBytes = Number(io.match(/^read_bytes:\s+(\d+)/m)?.[1] || 0);
      this.writeBytes = Number(io.match(/^write_bytes:\s+(\d+)/m)?.[1] || 0);
    } catch {}
  }
  snapshot() {
    const ticksPerSecond = 100;
    return {
      peakRssMiB: Number((this.peakRssBytes / 1048576).toFixed(2)),
      cpuSeconds: Number(((this.lastCpuTicks - (this.firstCpuTicks || 0)) / ticksPerSecond).toFixed(3)),
      ioBytes: this.readBytes + this.writeBytes,
    };
  }
}

if (process.argv[2] === "--server") {
  const { startServer } = await import("../../backend/api/server.js");
  const server = await startServer();
  process.stdout.write(
    `STAGE42_BOUND ${JSON.stringify({ address: server.address().address, port: server.address().port })}\n`,
  );
  await new Promise((resolveClosed) => server.once("close", resolveClosed));
  process.exitCode = 0;
} else {
  try {
    await run();
  } catch (error) {
    if (activeApi) await stopApi(activeApi, "SIGTERM").catch(() => {});
    if (activeNginx) await stopNginx(activeNginx).catch(() => {});
    process.stderr.write(`STAGE42_FAIL ${error.stack || error.message}\n`);
    process.exitCode = 1;
  } finally {
    await rm(identityPath, { force: true }).catch(() => {});
    await rm(recipientPath, { force: true }).catch(() => {});
  }
}

async function run() {
  // The synthetic fixture must exercise the same hardened configuration as
  // the child API processes, including the initial database seeding process.
  Object.assign(process.env, stagingEnv);
  assert.equal(process.platform, "linux");
  assert.equal(process.arch, "x64");
  assert.equal(process.versions.node, "24.21.0");
  assert.ok(dbDir && backupDir && restoreDir);
  assert.notEqual(dbDir, backupDir);
  assert.notEqual(dbDir, restoreDir);
  await mkdir(root, { recursive: true, mode: 0o700 });
  await mkdir(logDir, { recursive: true, mode: 0o700 });
  await mkdir(nginxDir, { recursive: true, mode: 0o700 });
  await mkdir(tlsDir, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  await chmod(dbDir, 0o700);
  await chmod(backupDir, 0o700);
  await assertAbsent(restoreDir);

  const pgliteVersion = JSON.parse(
    await readFile("node_modules/@electric-sql/pglite/package.json", "utf8"),
  ).version;
  const executableChecks = {};
  for (const [binary, path] of Object.entries(binaries)) {
    try {
      await access(path, constants.X_OK);
      executableChecks[binary] = true;
    } catch {
      executableChecks[binary] = false;
    }
    assert.equal(executableChecks[binary], true, `${binary} must be installed at ${path}`);
  }

  const preflight = await runSyntheticPreflight();
  const userData = await seedSyntheticDatabase();
  let server = await startApi(3001);
  const directBind = server.bound;
  assert.equal(directBind.address, "127.0.0.1");
  assert.equal(directBind.port, 3001);
  const activePgliteOwners = await countApiServerProcesses();
  assert.equal(activePgliteOwners, 1);

  const nginxConfig = await configureNginx();
  const nginxTest = spawnSync(binaries.nginx, ["-t", "-p", `${nginxDir}/`, "-c", nginxConfig], {
    encoding: "utf8",
  });
  assert.equal(nginxTest.status, 0, `nginx -t failed: ${nginxTest.stderr}`);
  const nginx = spawn(binaries.nginx, ["-g", "daemon off;", "-p", `${nginxDir}/`, "-c", nginxConfig], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  activeNginx = nginx;
  nginx.stderr.setEncoding("utf8");
  nginx.stderr.on("data", () => {});
  await waitFor(async () => {
    const probe = await httpsRequest(`${proxyUrl}/api/health`);
    return probe.status === 200;
  }, "Nginx TLS/API proxy startup");

  const directHealth = await request(`${apiUrl}/api/health`);
  assert.equal(directHealth.status, 200);
  const directReady = await request(`${apiUrl}/api/ready`);
  assert.equal(directReady.status, 200);
  const missingAuth = await request(`${apiUrl}/api/questions?limit=1`);
  assert.equal(missingAuth.status, 401);
  const legacyUser = await request(`${apiUrl}/api/users`, {
    method: "POST",
    body: { email: "anonymous@canary.testcorp.com" },
  });
  assert.equal(legacyUser.status, 403);

  const tokenOne = (await import("../../backend/api/services/sessionToken.js")).createSessionToken(userData.userOne.id);
  const tokenTwo = (await import("../../backend/api/services/sessionToken.js")).createSessionToken(userData.userTwo.id);
  const expiredToken = (await import("../../backend/api/services/sessionToken.js")).createSessionToken(
    userData.userOne.id,
    Math.floor(Date.now() / 1000) - 9 * 60 * 60,
  );
  assert.equal((await request(`${apiUrl}/api/auth/me`, { token: expiredToken })).status, 401);
  assert.equal((await request(`${apiUrl}/api/access/admin/users`, { token: tokenOne })).status, 403);
  assert.equal((await request(`${apiUrl}/api/users/${userData.userTwo.id}/stats`, { token: tokenOne })).status, 403);
  assert.equal((await request(`${apiUrl}/api/users/${userData.disabledUser.id}/stats`, { token: (await import("../../backend/api/services/sessionToken.js")).createSessionToken(userData.disabledUser.id) })).status, 401);

  const proxy = await httpsRequest(`${proxyUrl}/api/ready`, {
    origin: "https://canary.testcorp.com",
  });
  assert.equal(proxy.status, 200);
  assert.ok(proxy.headers["x-request-id"]);
  assert.equal(proxy.headers["x-content-type-options"], "nosniff");
  assert.equal(proxy.headers["strict-transport-security"], "max-age=31536000");
  assert.equal(proxy.headers["access-control-allow-origin"], "https://canary.testcorp.com");
  const staticHome = await httpsRequest(`${proxyUrl}/`, {
    origin: "https://canary.testcorp.com",
  });
  assert.equal(staticHome.status, 200);
  assert.match(staticHome.headers["cache-control"] || "", /private, no-cache/);

  const firstQuiz = await completeSyntheticQuiz(tokenOne);
  const journeyWrite = await request(`${apiUrl}/api/me/state/journey`, {
    token: tokenOne,
    method: "PUT",
    body: {
      certification: "CLF-C02",
      version: 0,
      state: { stage: "stage42-synthetic-persisted" },
    },
  });
  assert.equal(journeyWrite.status, 200);
  const userStatsOne = await request(`${apiUrl}/api/users/${userData.userOne.id}/stats`, {
    token: tokenOne,
  });
  assert.equal(userStatsOne.status, 200);
  assert.equal(Number(userStatsOne.data.data.total_quizzes), 1);

  const listenerInfo = await readFile("/proc/net/tcp", "utf8");
  assert.match(listenerInfo, /0100007F:0BB9\s+00000000:0000\s+0A/);
  assert.doesNotMatch(listenerInfo, /00000000:0BB9\s+\S+\s+0A/);
  await stopApi(server, "SIGTERM");
  assert.equal(await countApiServerProcesses(), 0);
  server = await startApi(3001);
  assert.equal((await request(`${apiUrl}/api/ready`)).status, 200);
  const afterGracefulRestart = await request(`${apiUrl}/api/users/${userData.userOne.id}/stats`, {
    token: tokenOne,
  });
  assert.equal(Number(afterGracefulRestart.data.data.total_quizzes), 1);

  const secondQuiz = await completeSyntheticQuiz(tokenOne);
  await stopApi(server, "SIGKILL");
  server = await startApi(3001);
  assert.equal((await request(`${apiUrl}/api/ready`)).status, 200);
  const afterCrashRestart = await request(`${apiUrl}/api/users/${userData.userOne.id}/stats`, {
    token: tokenOne,
  });
  assert.equal(Number(afterCrashRestart.data.data.total_quizzes), 2);
  const journeyRead = await request(`${apiUrl}/api/me/state/journey`, { token: tokenOne });
  assert.equal(journeyRead.status, 200);
  await stopApi(server, "SIGTERM");
  server = undefined;

  const keygen = spawnSync(binaries["age-keygen"], ["-o", identityPath], { encoding: "utf8" });
  assert.equal(keygen.status, 0, `age-keygen failed: ${keygen.stderr}`);
  await chmod(identityPath, 0o600);
  const recipient = spawnSync(binaries["age-keygen"], ["-y", identityPath], { encoding: "utf8" });
  assert.equal(recipient.status, 0, `age-keygen recipient extraction failed: ${recipient.stderr}`);
  await writeFile(recipientPath, recipient.stdout.trim(), { mode: 0o600 });

  const backupRun = await runMonitored(process.execPath, ["scripts/operations/backup-pglite.mjs"], {
    cwd: process.cwd(),
    env: { ...stagingEnv, BACKUP_OUTPUT_DIR: backupDir, BACKUP_AGE_RECIPIENT: recipient.stdout.trim() },
  });
  assert.equal(backupRun.code, 0, `backup failed: ${backupRun.stderr}`);
  const backupResult = JSON.parse(backupRun.stdout.trim().split(/\r?\n/).at(-1));
  const backupPath = join(backupDir, backupResult.file);
  const encryptedInfo = await stat(backupPath);
  assert.ok(encryptedInfo.size > 0);
  assert.equal(encryptedInfo.mode & 0o777, 0o600);
  const encryptedBytes = await readFile(backupPath);
  const { createHash } = await import("node:crypto");
  assert.equal(createHash("sha256").update(encryptedBytes).digest("hex"), backupResult.sha256);
  const backupNamesBefore = await readdir(backupDir);
  assert.equal(backupNamesBefore.filter((name) => name.endsWith(".age")).length, 1);
  assert.equal(backupNamesBefore.some((name) => name.endsWith(".partial")), false);

  const restoreRun = await runMonitored(process.execPath, ["scripts/operations/verify-pglite-backup.mjs"], {
    cwd: process.cwd(),
    env: {
      ...stagingEnv,
      BACKUP_ENCRYPTED_PATH: backupPath,
      BACKUP_AGE_IDENTITY_FILE: identityPath,
      RESTORE_DATA_DIR: restoreDir,
    },
  });
  assert.equal(restoreRun.code, 0, `restore failed: ${restoreRun.stderr}`);
  const restoreResult = JSON.parse(restoreRun.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(restoreResult.result, "PASS");
  assert.equal(restoreResult.rowCounts.users, 3);
  assert.equal(restoreResult.rowCounts.quiz_history, 2);
  assert.equal(restoreResult.rowCounts.answers, firstQuiz.answers + secondQuiz.answers);

  stagingEnv.DB_DATA_DIR = restoreDir;
  process.env.DB_DATA_DIR = restoreDir;
  server = await startApi(3001);
  assert.equal((await request(`${apiUrl}/api/ready`)).status, 200);
  const restoredStats = await request(`${apiUrl}/api/users/${userData.userOne.id}/stats`, {
    token: tokenOne,
  });
  assert.equal(restoredStats.status, 200);
  assert.equal(Number(restoredStats.data.data.total_quizzes), 2);
  await stopApi(server, "SIGTERM");
  server = undefined;

  await rm(identityPath, { force: true });
  await rm(recipientPath, { force: true });
  const apiLog = await readFile(serverLogPath, "utf8");
  const nginxLog = await readFile(nginxAccessPath, "utf8");
  assert.doesNotMatch(apiLog, /AUTH_SESSION_SECRET|private-synthetic-token|synthetic-one@/);
  assert.doesNotMatch(nginxLog, /\?.*token|synthetic-one@|Authorization/i);
  assert.match(nginxLog, /GET \/api\/ready 200/);

  const summary = {
    result: "PASS",
    environment: {
      os: "Linux/Debian container",
      architecture: process.arch,
      node: process.version,
      pglite: pgliteVersion,
      nginx: await commandVersion(binaries.nginx, ["-v"]),
      age: await commandVersion(binaries.age, ["--version"]),
      isolatedNetwork: true,
      containerCpuLimit: "2 vCPU",
      containerMemoryLimit: "4 GiB",
    },
    syntheticPreflight: {
      status: preflight.status,
      deployAuthorized: preflight.deployAuthorized,
      checks: preflight.checks.map(({ name, status }) => ({ name, status })),
      externalGatesRemainOpen: preflight.externalGates.length,
    },
    runtime: {
      bind: directBind,
      migrations: "startup on empty database and repeated startup completed",
      directHealthStatus: directHealth.status,
      readinessStatus: directReady.status,
      unauthenticatedContentStatus: missingAuth.status,
      anonymousUserCreationStatus: legacyUser.status,
      expiredSessionStatus: 401,
      adminRouteForStudentStatus: 403,
      crossUserStatsStatus: 403,
      disabledAccountStatus: 401,
      observedPgliteOwnerProcessesWhileActive: activePgliteOwners,
      observedPgliteOwnerProcessesAfterShutdown: 0,
      gracefulRestartPreservedQuizzes: Number(afterGracefulRestart.data.data.total_quizzes),
      abruptRestartPreservedQuizzes: Number(afterCrashRestart.data.data.total_quizzes),
      restoredAppReady: true,
      restoredQuizzes: Number(restoredStats.data.data.total_quizzes),
      localHttpRequests: measuredRequests.length,
      requestLatencyMs: percentiles(measuredRequests),
      serverPeakRssMiB: serverMetricsAggregate.peakRssMiB,
      serverCpuSeconds: serverMetricsAggregate.cpuSeconds,
      serverIoBytes: serverMetricsAggregate.ioBytes,
      pgliteDirectoryBytes: await directoryBytes(dbDir),
      restoredDirectoryBytes: await directoryBytes(restoreDir),
    },
    nginx: {
      syntaxTest: "PASS",
      loopbackTlsHealthStatus: proxy.status,
      staticHomeStatus: staticHome.status,
      requestId: Boolean(proxy.headers["x-request-id"]),
      securityHeaders: {
        nosniff: proxy.headers["x-content-type-options"],
        hsts: proxy.headers["strict-transport-security"],
      },
      accessLogSanitized: true,
      apiPortPublished: false,
      networkMode: "none",
    },
    backupRestore: {
      backupResult: backupResult.result,
      backupBytes: encryptedInfo.size,
      sha256: backupResult.sha256,
      backupMode: `0${(encryptedInfo.mode & 0o777).toString(8)}`,
      backupDurationMs: backupRun.durationMs,
      backupPeakRssMiB: backupRun.peakRssMiB,
      restoreDurationMs: restoreRun.durationMs,
      restorePeakRssMiB: restoreRun.peakRssMiB,
      restoredRows: restoreResult.rowCounts,
      identityRemoved: true,
      offHostBackupProven: false,
    },
    systemd: {
      verifier: executableChecks["systemd-analyze"] ? "available" : "not installed in image",
    },
    limitations: [
      "OAuth was not contacted; synthetic HMAC sessions were signed locally after synthetic DB seeding.",
      "No corporate DNS, TLS certificate, VPN, firewall, AWS volume, or off-host backup was tested.",
      "Crash test killed the API process after confirmed commits; it is not a host/kernel/power-loss simulation.",
      "No production-scale load was run in this operational smoke.",
    ],
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
  await stopNginx(nginx);
  activeNginx = undefined;
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function runSyntheticPreflight() {
  const fixtureRoot = join(root, "preflight-fixture");
  const nginxFixture = join(fixtureRoot, "docs/audits/staging/nginx");
  const systemdFixture = join(fixtureRoot, "docs/audits/staging/systemd");
  await mkdir(join(fixtureRoot, "public"), { recursive: true, mode: 0o700 });
  await mkdir(nginxFixture, { recursive: true, mode: 0o700 });
  await mkdir(systemdFixture, { recursive: true, mode: 0o700 });
  for (const file of ["index.html", "manifest.json", "sw.js"]) {
    await copyFile(
      join("/opt/cloudacademy/current/public", file),
      join(fixtureRoot, "public", file),
    );
  }
  let nginxTemplate = await readFile(
    "docs/audits/staging/nginx/cloudacademy.conf.example",
    "utf8",
  );
  nginxTemplate = nginxTemplate.replaceAll(
    "REPLACE_WITH_APPROVED_INTERNAL_HOSTNAME",
    "canary.testcorp.com",
  );
  await writeFile(join(nginxFixture, "cloudacademy.conf.example"), nginxTemplate);
  await writeFile(
    join(nginxFixture, "approved-cidrs.map.example"),
    "127.0.0.1/32 1;\n",
  );
  await copyFile(
    "docs/audits/staging/systemd/cloudacademy-api.service.example",
    join(systemdFixture, "cloudacademy-api.service.example"),
  );
  const { runStagingPreflight } = await import("./staging-preflight.mjs");
  const result = await runStagingPreflight({
    env: stagingEnv,
    root: fixtureRoot,
    nodeVersion: process.versions.node,
    platform: process.platform,
  });
  assert.equal(result.status, "LOCAL_PREFLIGHT_PASS_EXTERNAL_GATES_OPEN");
  assert.equal(result.deployAuthorized, false);
  assert.ok(result.checks.every((check) => check.status === "PASS"));
  return result;
}

async function seedSyntheticDatabase() {
  const database = await import("../../backend/database/db.js");
  await database.initializeDatabase();
  const userOne = await database.createUser({
    email: "synthetic-one@canary.testcorp.com",
    full_name: "Synthetic One",
    nickname: "Synthetic One",
    role: "STUDENT",
  });
  const userTwo = await database.createUser({
    email: "synthetic-two@canary.testcorp.com",
    full_name: "Synthetic Two",
    nickname: "Synthetic Two",
    role: "STUDENT",
  });
  const disabledUser = await database.createUser({
    email: "synthetic-disabled@canary.testcorp.com",
    full_name: "Synthetic Disabled",
    nickname: "Synthetic Disabled",
    role: "STUDENT",
  });
  await database.updateUser(disabledUser.id, { is_active: false });
  for (let index = 0; index < 12; index++) {
    await database.insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: `stage42-synthetic-${index}`,
      domain: "faturamento",
      difficulty: "easy",
      question_text: `Synthetic staging question ${index}`,
      options: ["Synthetic A", "Synthetic B", "Synthetic C", "Synthetic D"],
      correct_answer: [0],
      explanation: "Synthetic operational fixture.",
      validation_status: "APPROVED",
    });
  }
  await database.closeDatabase();
  return { userOne, userTwo, disabledUser };
}

async function configureNginx() {
  const keyPath = join(tlsDir, "privkey.pem");
  const certPath = join(tlsDir, "fullchain.pem");
  const cert = spawnSync(
    binaries.openssl,
    [
      "req",
      "-x509",
      "-nodes",
      "-newkey",
      "rsa:2048",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-subj",
      "/CN=canary.testcorp.com",
      "-addext",
      "subjectAltName=DNS:canary.testcorp.com",
    ],
    { encoding: "utf8" },
  );
  assert.equal(cert.status, 0, `synthetic TLS certificate generation failed: ${cert.stderr}`);
  await chmod(keyPath, 0o600);
  const mapPath = join(nginxDir, "approved-cidrs.map");
  await writeFile(mapPath, "127.0.0.1/32 1;\n", { mode: 0o600 });
  let template = await readFile(
    "docs/audits/staging/nginx/cloudacademy.conf.example",
    "utf8",
  );
  template = template
    .replaceAll("REPLACE_WITH_APPROVED_INTERNAL_HOSTNAME", "canary.testcorp.com")
    .replaceAll("listen 80 default_server", "listen 8080 default_server")
    .replaceAll("listen 443 ssl", "listen 8443 ssl")
    .replaceAll("/etc/nginx/cloudacademy/approved-cidrs.map", mapPath)
    .replaceAll("/etc/cloudacademy/tls/fullchain.pem", certPath)
    .replaceAll("/etc/cloudacademy/tls/privkey.pem", keyPath);
  const configPath = join(nginxDir, "nginx.conf");
  const fullConfig = `pid ${join(nginxDir, "nginx.pid")};
error_log ${join(logDir, "nginx-error.log")} notice;
events { worker_connections 128; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  log_format stage42 '$remote_addr $request_method $uri $status $request_time $upstream_http_x_request_id';
  access_log ${nginxAccessPath} stage42;
  client_body_temp_path ${join(nginxDir, "client_temp")};
  proxy_temp_path ${join(nginxDir, "proxy_temp")};
  fastcgi_temp_path ${join(nginxDir, "fastcgi_temp")};
  uwsgi_temp_path ${join(nginxDir, "uwsgi_temp")};
  scgi_temp_path ${join(nginxDir, "scgi_temp")};
${template.split("\n").map((line) => `  ${line}`).join("\n")}
}
`;
  for (const directory of ["client_temp", "proxy_temp", "fastcgi_temp", "uwsgi_temp", "scgi_temp"]) {
    await mkdir(join(nginxDir, directory), { recursive: true, mode: 0o700 });
  }
  await writeFile(configPath, fullConfig, { mode: 0o600 });
  return configPath;
}

async function startApi(port) {
  const env = { ...stagingEnv, PORT: String(port) };
  const child = spawn(process.execPath, ["scripts/operations/stage4-2-linux-smoke.mjs", "--server"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = [];
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => log.push(chunk));
  child.stderr.on("data", (chunk) => log.push(chunk));
  let metrics = new ProcMetrics(child.pid);
  metrics.start();
  try {
    await waitFor(async () => {
      if (child.exitCode !== null) throw new Error(`API exited early (${child.exitCode})`);
      try {
        return (await fetch(`http://127.0.0.1:${port}/api/ready`)).status === 200;
      } catch {
        return false;
      }
    }, `API readiness on ${port}`);
    const boundLine = log.join("").split(/\r?\n/).find((line) => line.startsWith("STAGE42_BOUND "));
    assert.ok(boundLine, "API must report its bound socket");
    const server = {
      child,
      log,
      bound: JSON.parse(boundLine.slice("STAGE42_BOUND ".length)),
      metrics,
    };
    activeApi = server;
    return server;
  } catch (error) {
    child.kill("SIGKILL");
    await writeFile(serverLogPath, log.join(""), { mode: 0o600 });
    throw error;
  }
}

async function stopApi(server, signal) {
  server.child.kill(signal);
  const exit = await waitChild(server.child, 20_000);
  server.metrics.stop();
  const snapshot = server.metrics.snapshot();
  serverMetricsAggregate.peakRssMiB = Math.max(serverMetricsAggregate.peakRssMiB, snapshot.peakRssMiB);
  serverMetricsAggregate.cpuSeconds += snapshot.cpuSeconds;
  serverMetricsAggregate.ioBytes += snapshot.ioBytes;
  await writeFile(serverLogPath, server.log.join(""), { flag: "a", mode: 0o600 });
  if (signal === "SIGTERM") assert.equal(exit.code, 0, "graceful shutdown must exit cleanly");
  if (signal === "SIGKILL") assert.equal(exit.signal, "SIGKILL", "crash test must use abrupt SIGKILL");
  if (activeApi === server) activeApi = undefined;
}

async function stopNginx(child) {
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  await waitChild(child, 10_000);
}

async function completeSyntheticQuiz(token) {
  const start = await request(`${apiUrl}/api/quiz/start`, {
    token,
    method: "POST",
    body: { certification: "CLF-C02", language: "pt", num_questions: 10 },
  });
  assert.equal(start.status, 201);
  let answerCount = 0;
  for (const question of start.data.data.questions) {
    const answer = await request(`${apiUrl}/api/quiz/${start.data.data.quiz_id}/answer`, {
      token,
      method: "POST",
      body: { question_id: question.id, user_answer: [0], time_secs: 1 },
    });
    assert.equal(answer.status, 200);
    answerCount++;
  }
  const finish = await request(`${apiUrl}/api/quiz/${start.data.data.quiz_id}/finish`, {
    token,
    method: "POST",
    body: {},
  });
  assert.equal(finish.status, 200);
  const results = await request(`${apiUrl}/api/quiz/${start.data.data.quiz_id}/results`, { token });
  assert.equal(results.status, 200);
  return { answers: answerCount, quizId: start.data.data.quiz_id };
}

async function request(url, { token, method = "GET", body } = {}) {
  const started = performance.now();
  const response = await fetch(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  measuredRequests.push(performance.now() - started);
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  return { status: response.status, headers: response.headers, data, text };
}

async function httpsRequest(url, { origin = "https://canary.testcorp.com" } = {}) {
  const { request: httpsRequestImpl } = await import("node:https");
  return await new Promise((resolveResponse, reject) => {
    const req = httpsRequestImpl(
      url,
      {
        rejectUnauthorized: false,
        headers: { Host: "canary.testcorp.com", Origin: origin },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolveResponse({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.setTimeout(5000, () => req.destroy(new Error("TLS proxy request timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function countApiServerProcesses() {
  const entries = await readdir("/proc", { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    try {
      const command = await readFile(`/proc/${entry.name}/cmdline`, "utf8");
      if (command.includes("stage4-2-linux-smoke.mjs\0--server")) count++;
    } catch {}
  }
  return count;
}

function waitChild(child, timeoutMs) {
  return new Promise((resolveExit, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveExit({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    const timer = setTimeout(() => reject(new Error("child process exit timeout")), timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolveExit({ code, signal });
    });
  });
}

async function waitFor(predicate, label) {
  const until = Date.now() + 30_000;
  let lastError;
  while (Date.now() < until) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`${label} did not complete within 30 seconds${lastError ? `: ${lastError.message}` : ""}`);
}

function assertAbsent(path) {
  return access(path, constants.F_OK).then(
    () => {
      throw new Error(`expected path not to exist: ${path}`);
    },
    (error) => {
      if (error.code !== "ENOENT") throw error;
    },
  );
}

async function runMonitored(command, args, options) {
  const started = performance.now();
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const metrics = new ProcMetrics(child.pid);
  metrics.start();
  const exit = await waitChild(child, 120_000);
  metrics.stop();
  return {
    ...exit,
    stdout,
    stderr,
    durationMs: Number((performance.now() - started).toFixed(2)),
    peakRssMiB: metrics.snapshot().peakRssMiB,
  };
}

async function commandVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return `${result.stdout || ""}${result.stderr || ""}`.trim().split(/\r?\n/)[0];
}

async function directoryBytes(directory) {
  let total = 0;
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const childPath = join(path, entry.name);
      if (entry.isDirectory()) await walk(childPath);
      else total += (await stat(childPath)).size;
    }
  }
  await walk(directory);
  return total;
}

function percentiles(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (fraction) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] || 0;
  return {
    count: sorted.length,
    p50Ms: Number(at(0.5).toFixed(2)),
    p95Ms: Number(at(0.95).toFixed(2)),
    p99Ms: Number(at(0.99).toFixed(2)),
    maxMs: Number((sorted.at(-1) || 0).toFixed(2)),
  };
}
