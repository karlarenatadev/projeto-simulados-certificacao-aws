import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { runMigrations } from "../../backend/database/migrations/runner.js";
import {
  readMigrationTarget,
  assertMigrationTarget,
} from "../../backend/database/migrations/target.js";

const image =
  "postgres:16-alpine@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
const token = randomUUID();
const name = `cloudacademy-operational-test-${token}`;
const label = "io.cloudacademy.operational-test";
const database = "cloudacademy_f2_test";
const password = randomBytes(24).toString("hex");
const cwd = fileURLToPath(new URL("../../", import.meta.url));
let containerId;
let child;

function docker(args, env = process.env) {
  try {
    return execFileSync("docker", args, {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch {
    throw new Error(`Operational test Docker command failed: ${args[0]}`);
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
      "Refusing operation on an unidentified/non-ephemeral operational test container",
    );
  }
  return info;
}

async function unusedPort() {
  const net = await import("node:net");
  const server = net.createServer().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return String(port);
}

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
  if (binding?.HostIp !== "127.0.0.1" || !/^\d+$/.test(binding.HostPort))
    throw new Error("Operational test database must bind to IPv4 loopback");
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
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
  if (!ready) throw new Error("Disposable PostgreSQL 16 did not become ready");
  docker([
    "exec",
    containerId,
    "psql",
    "-X",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    database,
    "-d",
    database,
    "-c",
    `COMMENT ON DATABASE cloudacademy_f2_test IS 'cloudacademy-f2-test:${token}'`,
  ]);

  const adminUrl = `postgresql://${database}:${password}@127.0.0.1:${binding.HostPort}/${database}`;
  const adminEnv = {
    NODE_ENV: "test",
    PG_MIGRATIONS_TEST_URL: adminUrl,
    PG_MIGRATIONS_TEST_TOKEN: token,
  };
  const target = readMigrationTarget(adminEnv);
  await runMigrations({ env: adminEnv });
  const admin = new pg.Client(target.pool);
  const runtimePassword = randomBytes(24).toString("hex");
  await admin.connect();
  try {
    await assertMigrationTarget(admin, target);
    await admin.query(
      `CREATE ROLE cloudacademy_operational_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
    );
    await admin.query(`REVOKE CREATE,TEMP ON DATABASE cloudacademy_f2_test FROM PUBLIC;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT CONNECT ON DATABASE cloudacademy_f2_test TO cloudacademy_operational_runtime;
      GRANT USAGE ON SCHEMA public,cloudacademy_migrations TO cloudacademy_operational_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO cloudacademy_operational_runtime;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO cloudacademy_operational_runtime;
      GRANT SELECT ON cloudacademy_migrations.history TO cloudacademy_operational_runtime`);
  } finally {
    await admin.end();
  }

  console.log(
    `Operational PostgreSQL harness: PostgreSQL 16 disposable database at 127.0.0.1:${binding.HostPort}; tmpfs; runtime role has DML only.`,
  );
  const runtimeUrl = `postgresql://cloudacademy_operational_runtime:${runtimePassword}@127.0.0.1:${binding.HostPort}/${database}`;
  const port = await unusedPort();
  child = spawn(
    process.execPath,
    [
      "--experimental-vm-modules",
      "node_modules/jest/bin/jest.js",
      "--runInBand",
      "--runTestsByPath",
      "__tests__/postgresOperationalConfig.test.js",
      "__tests__/postgresOperationalRuntime.integration.test.js",
    ],
    {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "staging",
        DB_ENGINE: "postgres",
        DB_DATA_DIR: "",
        DATABASE_URL: runtimeUrl,
        DB_SSL_MODE: "disable",
        DB_CONNECTION_TIMEOUT_MS: "500",
        DB_STATEMENT_TIMEOUT_MS: "3000",
        DB_QUERY_TIMEOUT_MS: "6000",
        DB_SHUTDOWN_TIMEOUT_MS: "4000",
        AUTH_SESSION_SECRET:
          "0123456789abcdefghijklmnopqrstuvwxyz-OPERATIONAL-TEST",
        AUTH_ALLOWED_DOMAINS: "a3data.com.br,a3data.com",
        GOOGLE_CLIENT_ID: "123-test.apps.googleusercontent.com",
        CORS_ALLOWED_ORIGINS: "https://staging.example.invalid",
        TRUST_PROXY: "",
        PORT: port,
        DEBUG: "true",
        DB_DEBUG: "true",
        PG_OPERATIONAL_TEST_TOKEN: token,
        PG_OPERATIONAL_ADMIN_URL: adminUrl,
        PG_OPERATIONAL_CONTAINER_ID: containerId,
        PG_ADAPTER_INTEGRATION: "0",
        PG_MIGRATIONS_INTEGRATION: "0",
      },
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(
    error.message?.startsWith("Operational test Docker")
      ? error.message
      : "Operational PostgreSQL runner failed; no production endpoint was used.",
  );
  process.exitCode = 1;
} finally {
  if (child?.exitCode === null) child.kill();
  if (containerId) {
    try {
      const owned = inspectOwned();
      docker(["rm", "--force", owned.Id]);
      console.log(
        "Operational test container removed after ownership/tmpfs verification.",
      );
    } catch {
      console.error(
        `Operational test cleanup failed; inspect only owned container ${name}.`,
      );
      process.exitCode = 1;
    }
  }
}
