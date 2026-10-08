/** @jest-environment node */
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import pg from "pg";
import { fork } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createOperationalPostgresRuntime } from "../backend/database/postgres/operationalRuntime.js";
import {
  closeDatabase,
  createUser,
  getDatabase,
  getUserModuleState,
  initializeDatabase,
} from "../backend/database/db.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import { createTestPostgresRuntime } from "../backend/database/postgres/runtime.js";

const enabled = Boolean(process.env.PG_OPERATIONAL_TEST_TOKEN);
const suite = enabled ? describe : describe.skip;
const children = new Set();
let admin;
let child;
let baseUrl;
let childOutput = "";
let user;
let otherUser;
let token;
let serverMessage;

async function unusedPort() {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return String(port);
}

function track(processHandle) {
  children.add(processHandle);
  processHandle.once("exit", () => children.delete(processHandle));
  processHandle.stdout.on("data", (chunk) => {
    childOutput += chunk.toString();
  });
  processHandle.stderr.on("data", (chunk) => {
    childOutput += chunk.toString();
  });
  return processHandle;
}

async function waitReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Operational API failed to become ready");
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}/api${path}`, options);
}

  suite(
    "DB_ENGINE=postgres operational runtime on disposable PostgreSQL 16",
    () => {
      beforeAll(async () => {
        await initializeDatabase();
        expect(await getDatabase().checkReady()).toBe(true);
        admin = new pg.Client({
        connectionString: process.env.PG_OPERATIONAL_ADMIN_URL,
      });
      await admin.connect();
      const port = await unusedPort();
      child = track(
        fork("__tests__/fixtures/postgres-operational-process.mjs", [], {
          env: { ...process.env, PORT: port },
          silent: true,
          execArgv: [],
        }),
      );
      const [message] = await Promise.race([
        once(child, "message"),
        once(child, "exit").then(([code]) => {
          throw new Error(
            `Operational API startup exited ${code}: ${childOutput}`,
          );
        }),
      ]);
      serverMessage = message;
      expect(message.error).toBeUndefined();
      baseUrl = `http://127.0.0.1:${port}`;
      await waitReady();
    }, 30_000);

    afterAll(async () => {
      if (child?.exitCode === null) {
        const stopped = once(child, "exit");
        child.send("shutdown");
        const [code, signal] = await stopped;
        expect({ code, signal }).toEqual({ code: 0, signal: null });
      }
      await closeDatabase();
      await admin?.end();
    });

    test("starts without DDL or migrations and checks the F2 baseline", async () => {
      expect(serverMessage.port).toBeGreaterThan(0);
      expect((await request("/ready")).status).toBe(200);
      const { rows } = await admin.query(
        "SELECT version,checksum FROM cloudacademy_migrations.history",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].version).toBe(1);
      expect(
        (await admin.query("SELECT count(*)::int AS count FROM users")).rows[0]
          .count,
      ).toBe(0);
      const runtime = createOperationalPostgresRuntime();
      try {
        expect(
          (await runtime.query("SELECT 9007199254740991::bigint AS value"))
            .rows[0].value,
        ).toBe(Number.MAX_SAFE_INTEGER);
        await expect(
          runtime.query(
            "CREATE TABLE public.operational_forbidden(id integer)",
          ),
        ).rejects.toMatchObject({ code: "42501" });
        await runtime
          .transaction(async (tx) => {
            await tx.query("SELECT 1");
            throw new Error("rollback probe");
          })
          .catch((error) => expect(error.message).toBe("rollback probe"));
        expect(runtime.stats().state).toBe("open");
      } finally {
        await runtime.close();
      }
      expect(runtime.stats().state).toBe("closed");
    });

    test("postgres-test still refuses operational environments and non-test targets", async () => {
      const testEnv = { ...process.env, NODE_ENV: "test", DB_SSL_MODE: "disable" };
      expect(() => createTestPostgresRuntime({ ...testEnv, NODE_ENV: "production", DB_SSL_MODE: "verify-full" })).toThrow();
      expect(() =>
        createTestPostgresRuntime({
          ...testEnv,
          DATABASE_URL:
            "postgresql://cloudacademy_f3_runtime:secret@remote.invalid:5432/cloudacademy_f2_test",
          DB_SSL_MODE: "verify-full",
        }),
      ).toThrow();
      const wrongRole = new URL(process.env.DATABASE_URL);
      wrongRole.username = "cloudacademy_f2_test";
      expect(() =>
        createTestPostgresRuntime({
          ...testEnv,
          DATABASE_URL: wrongRole.href,
        }),
      ).toThrow();
      const wrongDatabase = new URL(process.env.DATABASE_URL);
      wrongDatabase.pathname = "/cloudacademy_f1_test";
      expect(() =>
        createTestPostgresRuntime({
          ...testEnv,
          DATABASE_URL: wrongDatabase.href,
        }),
      ).toThrow();
    });

    test("liveness, readiness, request id and exact CORS origin work", async () => {
      expect((await request("/health")).status).toBe(200);
      const allowed = await request("/health", {
        headers: {
          Origin: "https://staging.example.invalid",
          "X-Request-Id": "forged-value",
        },
      });
      expect(allowed.headers.get("access-control-allow-origin")).toBe(
        "https://staging.example.invalid",
      );
      expect(allowed.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
      expect(allowed.headers.get("x-request-id")).not.toBe("forged-value");
      const denied = await request("/health", {
        headers: { Origin: "https://attacker.example.invalid" },
      });
      expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    });

    test("preserves 401, operational public-user 403, authorization 403 and CAS 409", async () => {
      expect((await request("/me/profile")).status).toBe(401);
      expect(
        (
          await request("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
      ).toBe(403);
      user = await createUser(`Operational-${randomUUID()}`);
      otherUser = await createUser(`Operational-other-${randomUUID()}`);
      token = createSessionToken(user.id);
      const auth = { Authorization: `Bearer ${token}` };
      expect(
        (await request(`/users/${otherUser.id}/stats`, { headers: auth }))
          .status,
      ).toBe(403);
      const put = (version) =>
        request("/me/state/journey", {
          method: "PUT",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            certification: "CLF-C02",
            version,
            state: { probe: true },
          }),
        });
      expect((await put(0)).status).toBe(200);
      expect((await put(0)).status).toBe(409);
    });

    test("schema drift returns ready 503 while health stays 200", async () => {
      await admin.query("ALTER TABLE users ADD COLUMN operational_probe text");
      try {
        expect((await request("/ready")).status).toBe(503);
        expect((await request("/health")).status).toBe(200);
      } finally {
        await admin.query("ALTER TABLE users DROP COLUMN operational_probe");
      }
      await waitReady();
    });

    test("query errors return sanitized 500 and roll back; DB outage returns 503 then recovers", async () => {
      await admin.query(
        "REVOKE SELECT ON user_module_state FROM cloudacademy_operational_runtime",
      );
      try {
        const response = await request(
          "/me/state/journey?certification=CLF-C02",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(response.status).toBe(500);
        expect((await response.json()).error).toBe("Internal server error");
      } finally {
        await admin.query(
          "GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO cloudacademy_operational_runtime",
        );
      }

      execFileSync(
        "docker",
        ["pause", process.env.PG_OPERATIONAL_CONTAINER_ID],
        { stdio: "ignore" },
      );
      try {
        expect((await request("/health")).status).toBe(200);
        expect((await request("/ready")).status).toBe(503);
        const response = await request("/me/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status).toBe(503);
      } finally {
        execFileSync(
          "docker",
          ["unpause", process.env.PG_OPERATIONAL_CONTAINER_ID],
          { stdio: "ignore" },
        );
      }
      await waitReady();
    }, 30_000);

    test("rollback leaves no module state and session/local identity remain untouched", async () => {
      const runtime = getDatabase();
      await expect(
        runtime.transaction(async (tx) => {
          await tx.query(
            "INSERT INTO user_module_state(user_id,module,certification_id,state_json,version) VALUES ($1,'labs','CLF-C02','{}',1)",
            [user.id],
          );
          throw new Error("rollback");
        }),
      ).rejects.toThrow("rollback");
      expect(await getUserModuleState(user.id, "labs", "CLF-C02")).toBeNull();
      expect(
        (
          await request("/me/profile", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).status,
      ).toBe(200);
    });

    test("operational logs do not contain credentials, tokens or database URL", async () => {
      expect(childOutput).not.toContain(process.env.DATABASE_URL);
      expect(childOutput).not.toContain(process.env.AUTH_SESSION_SECRET);
      expect(childOutput).not.toContain(token);
      expect(childOutput).not.toContain(process.env.PG_OPERATIONAL_ADMIN_URL);
      expect(childOutput).not.toContain("INSERT INTO users");
      expect(childOutput).not.toContain("SELECT id, user_id");
    });

    test("the facade refuses postgres-test when NODE_ENV is production", async () => {
      const engine = process.env.DB_ENGINE;
      const environment = process.env.NODE_ENV;
      const sslMode = process.env.DB_SSL_MODE;
      await closeDatabase();
      process.env.DB_ENGINE = "postgres-test";
      process.env.NODE_ENV = "production";
      process.env.DB_SSL_MODE = "verify-full";
      try {
        await expect(initializeDatabase()).rejects.toThrow(
          "PostgreSQL runtime unavailable",
        );
      } finally {
        process.env.DB_ENGINE = engine;
        process.env.NODE_ENV = environment;
        process.env.DB_SSL_MODE = sslMode;
        await initializeDatabase();
      }
      expect(await getDatabase().checkReady()).toBe(true);
    });
  },
);
