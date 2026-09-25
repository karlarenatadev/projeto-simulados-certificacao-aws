import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Local PostgreSQL 16 image pinned by digest. No existing service/volume is used.
const image =
  "postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
const token = randomUUID();
const name = `cloudacademy-f1-test-${token}`;
const label = "io.cloudacademy.f1-test";
const database = "cloudacademy_f1_test";
const password = randomBytes(24).toString("hex");
const cwd = fileURLToPath(new URL("../../", import.meta.url));
let containerId;
let child;
let interrupted = false;

function docker(args, env = process.env) {
  try {
    return execFileSync("docker", args, {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch {
    throw new Error(`Local Docker command failed: ${args[0]}`);
  }
}

function inspectOwned() {
  const [info] = JSON.parse(docker(["inspect", containerId || name]));
  if (
    info.Name !== `/${name}` ||
    info.Config.Labels?.[label] !== token ||
    !/^[a-f0-9]{64}$/.test(info.Id) ||
    (containerId && info.Id !== containerId) ||
    info.Mounts.some((mount) => mount.Type !== "tmpfs") ||
    info.HostConfig.Tmpfs?.["/var/lib/postgresql/data"] !== "rw"
  ) {
    throw new Error(
      "Refusing operation on an unidentified/non-ephemeral test container",
    );
  }
  return info;
}

function interrupt() {
  interrupted = true;
  child?.kill("SIGTERM");
}
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

try {
  containerId = docker(
    [
      "run",
      "--detach",
      "--name",
      name,
      "--label",
      `${label}=${token}`,
      "--publish",
      "127.0.0.1::5432",
      "--tmpfs",
      "/var/lib/postgresql/data:rw",
      "--env",
      "POSTGRES_PASSWORD",
      "--env",
      `POSTGRES_USER=${database}`,
      "--env",
      `POSTGRES_DB=${database}`,
      "--env",
      "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256",
      image,
    ],
    { ...process.env, POSTGRES_PASSWORD: password },
  );
  const info = inspectOwned();
  const [binding] = info.NetworkSettings.Ports["5432/tcp"] || [];
  if (binding?.HostIp !== "127.0.0.1" || !/^\d+$/.test(binding.HostPort)) {
    throw new Error("Test PostgreSQL must bind only to IPv4 loopback");
  }
  let ready = false;
  for (let attempt = 0; attempt < 40 && !interrupted; attempt++) {
    try {
      docker([
        "exec",
        containerId,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        database,
        "-d",
        database,
      ]);
      ready = true;
      break;
    } catch {
      await delay(500);
    }
  }
  if (!ready)
    throw new Error("PostgreSQL 16 test container did not become ready");
  console.log(
    `F1 PostgreSQL: ${name}; 127.0.0.1:${binding.HostPort}; database/user=${database}; tmpfs; SCRAM`,
  );
  const url = `postgresql://${database}:${password}@127.0.0.1:${binding.HostPort}/${database}`;
  const full = process.argv.includes("--full");
  const args = [
    "--experimental-vm-modules",
    "node_modules/jest/bin/jest.js",
    "--runInBand",
  ];
  if (!full)
    args.push(
      "--runTestsByPath",
      "__tests__/postgresConfig.test.js",
      "__tests__/postgresAdapter.integration.test.js",
    );
  child = spawn(process.execPath, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      DB_DATA_DIR: "memory://",
      PG_ADAPTER_INTEGRATION: "1",
      PG_ADAPTER_TEST_URL: url,
    },
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(
    error.message?.startsWith("Local Docker")
      ? error.message
      : "F1 PostgreSQL test runner failed; no production connection was used.",
  );
  process.exitCode = 1;
} finally {
  if (containerId) {
    try {
      const info = inspectOwned();
      docker(["rm", "--force", info.Id]);
      console.log(
        "F1 test container removed after ownership/tmpfs verification.",
      );
    } catch {
      console.error(`Test cleanup failed; inspect only container ${name}.`);
      process.exitCode = 1;
    }
  }
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
