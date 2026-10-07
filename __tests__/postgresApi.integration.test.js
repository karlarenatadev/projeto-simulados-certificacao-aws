/** @jest-environment node */
import { beforeAll, afterAll, describe, test, expect } from "@jest/globals";
import { spawn } from "node:child_process";
import { once } from "node:events";
import pg from "pg";
import {
  initializeDatabase,
  closeDatabase,
  getDatabase,
  executeQuery,
  createUser,
  upsertUserModuleState,
} from "../backend/database/db.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { apiService } from "../src/frontend/js/services/api.js";
import { createTestPostgresRuntime } from "../backend/database/postgres/runtime.js";
import {
  readMigrationTarget,
  assertMigrationTarget,
} from "../backend/database/migrations/target.js";

const integration =
  process.env.DB_ENGINE === "postgres-test" ? describe : describe.skip;
integration(
  "F3 Express runtime with real PostgreSQL and restricted role",
  () => {
    let admin,
      child,
      base,
      user,
      token,
      output = "";
    const storageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "localStorage",
    );
    const locationDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "location",
    );
    async function request(path, options = {}) {
      const response = await fetch(`${base}/api${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      return { status: response.status, body: await response.json() };
    }
    beforeAll(async () => {
      const target = readMigrationTarget({
        NODE_ENV: "test",
        PG_MIGRATIONS_TEST_URL: process.env.PG_F3_ADMIN_URL,
        PG_MIGRATIONS_TEST_TOKEN: process.env.PG_RUNTIME_TEST_TOKEN,
      });
      admin = new pg.Client(target.pool);
      await admin.connect();
      await assertMigrationTarget(admin, target);
      child = spawn(
        process.execPath,
        ["__tests__/fixtures/postgres-api-process.mjs"],
        {
          env: { ...process.env, PORT: "0", PG_F3_ADMIN_URL: "" },
          stdio: ["ignore", "pipe", "pipe", "ipc"],
        },
      );
      child.stdout.on("data", (data) => {
        output += data;
      });
      child.stderr.on("data", (data) => {
        output += data;
      });
      const [message] = await Promise.race([
        once(child, "message"),
        once(child, "exit").then(([code]) => {
          throw new Error(`API child exited ${code}: ${output}`);
        }),
      ]);
      expect(message.error).toBeUndefined();
      base = `http://127.0.0.1:${message.port}`;
      await initializeDatabase();
    }, 20000);
    afterAll(async () => {
      if (child?.exitCode === null) {
        child.send("shutdown");
        await once(child, "exit");
      }
      await closeDatabase();
      await admin?.end();
      delete globalThis.__APP_CONFIG__;
      if (storageDescriptor)
        Object.defineProperty(globalThis, "localStorage", storageDescriptor);
      else delete globalThis.localStorage;
      if (locationDescriptor)
        Object.defineProperty(globalThis, "location", locationDescriptor);
      else delete globalThis.location;
    });
    test("startup/readiness have no seeds and runtime cannot perform DDL or change ledger", async () => {
      expect((await request("/health")).status).toBe(200);
      expect((await request("/ready")).body).toEqual({ ready: true });
      for (const table of [
        "users",
        "questions",
        "cases",
        "domains",
        "aws_services",
      ]) {
        expect(
          (await executeQuery(`SELECT count(*)::int AS count FROM ${table}`))[0]
            .count,
        ).toBe(0);
      }
      for (const sql of [
        "CREATE TABLE public.forbidden(id int)",
        "CREATE TEMP TABLE forbidden(id int)",
        "ALTER TABLE users ADD COLUMN forbidden int",
        "CREATE SCHEMA forbidden",
        "UPDATE cloudacademy_migrations.history SET runner_version=1",
      ]) {
        await expect(executeQuery(sql)).rejects.toMatchObject({
          code: "42501",
        });
      }
      expect(getDatabase().exec).toBeUndefined();
    });
    test("rejects production, administrative credentials, wrong target and unknown engine without fallback", async () => {
      expect(() =>
        createTestPostgresRuntime({ ...process.env, NODE_ENV: "production" }),
      ).toThrow();
      expect(() =>
        createTestPostgresRuntime({
          ...process.env,
          DATABASE_URL: process.env.PG_F3_ADMIN_URL,
        }),
      ).toThrow();
      const wrong = new URL(process.env.DATABASE_URL);
      wrong.pathname = "/other";
      expect(() =>
        createTestPostgresRuntime({ ...process.env, DATABASE_URL: wrong.href }),
      ).toThrow();
      const wrongMarker = createTestPostgresRuntime({
        ...process.env,
        PG_RUNTIME_TEST_TOKEN: "00000000-0000-4000-8000-000000000000",
      });
      try {
        expect(await wrongMarker.checkReady()).toBe(false);
      } finally {
        await wrongMarker.close();
      }
      const engine = process.env.DB_ENGINE;
      process.env.DB_ENGINE = "unknown";
      try {
        await expect(initializeDatabase()).rejects.toThrow(
          "Invalid database engine",
        );
      } finally {
        process.env.DB_ENGINE = engine;
      }
    });
    test("startup refuses an unprepared database without bootstrapping it", async () => {
      await admin.query(
        "ALTER TABLE cloudacademy_migrations.history RENAME TO f3_hidden_history",
      );
      try {
        const rejected = spawn(
          process.execPath,
          ["__tests__/fixtures/postgres-api-process.mjs"],
          {
            env: { ...process.env, PORT: "0", PG_F3_ADMIN_URL: "" },
            stdio: ["ignore", "ignore", "ignore", "ipc"],
          },
        );
        const exited = once(rejected, "exit");
        const [message] = await once(rejected, "message");
        expect(message).toEqual({ error: "startup failed" });
        expect((await exited)[0]).toBe(1);
        expect(
          (
            await admin.query(
              "SELECT to_regclass('cloudacademy_migrations.history') AS ledger",
            )
          ).rows[0].ledger,
        ).toBeNull();
      } finally {
        await admin.query(
          "ALTER TABLE cloudacademy_migrations.f3_hidden_history RENAME TO history",
        );
      }
    });
    test("schema drift and ledger mismatch fail readiness while liveness remains healthy", async () => {
      await admin.query("ALTER TABLE users ADD COLUMN f3_drift text");
      try {
        expect((await request("/ready")).status).toBe(503);
        expect((await request("/health")).status).toBe(200);
      } finally {
        await admin.query("ALTER TABLE users DROP COLUMN f3_drift");
      }
      const {
        rows: [ledger],
      } = await admin.query(
        "SELECT checksum FROM cloudacademy_migrations.history",
      );
      await admin.query(
        "UPDATE cloudacademy_migrations.history SET checksum=repeat('0',64)",
      );
      try {
        expect((await request("/ready")).status).toBe(503);
      } finally {
        await admin.query(
          "UPDATE cloudacademy_migrations.history SET checksum=$1",
          [ledger.checksum],
        );
      }
      expect((await request("/ready")).status).toBe(200);
    });
    test("numeric versions, absent state, JSONB, UUID, CAS and unsafe BIGINT never round or write", async () => {
      user = await createUser("F3 runtime");
      token = createSessionToken(user.id);
      expect(
        (await request("/me/state/journey?certification=CLF-C02")).body.data,
      ).toBeNull();
      const saved = await upsertUserModuleState(
        user.id,
        "journey",
        "CLF-C02",
        { list: [1, "two"] },
        0,
      );
      expect(saved.version).toBe(1);
      expect(saved.user_id).toBe(user.id);
      expect(saved.state_json).toEqual({ list: [1, "two"] });
      const put = (version) =>
        request("/me/state/journey", {
          method: "PUT",
          body: JSON.stringify({
            certification: "CLF-C02",
            state: { changed: true },
            version,
          }),
        });
      expect((await put(1)).status).toBe(200);
      expect((await put(1)).status).toBe(409);
      await admin.query(
        "UPDATE user_module_state SET version=$1 WHERE user_id=$2",
        [String(Number.MAX_SAFE_INTEGER), user.id],
      );
      expect(
        (await request("/me/state/journey?certification=CLF-C02")).body.data
          .version,
      ).toBe(Number.MAX_SAFE_INTEGER);
      expect((await put(Number.MAX_SAFE_INTEGER)).status).toBe(503);
      await admin.query(
        "UPDATE user_module_state SET version=9223372036854775807 WHERE user_id=$1",
        [user.id],
      );
      expect(
        (await request("/me/state/journey?certification=CLF-C02")).status,
      ).toBe(503);
      expect(
        (
          await admin.query(
            "SELECT version FROM user_module_state WHERE user_id=$1",
            [user.id],
          )
        ).rows[0].version,
      ).toBe("9223372036854775807");
    });
    test("real connection refusal returns 503, invalid credential 401, role denial 403, same session recovers", async () => {
      const memory = new Map();
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: {
          getItem: (key) => memory.get(key) ?? null,
          setItem: (key, value) => memory.set(key, String(value)),
          removeItem: (key) => memory.delete(key),
        },
      });
      globalThis.__APP_CONFIG__ = { apiBaseUrl: base };
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: { hostname: "127.0.0.1", protocol: "http:" },
      });
      SessionManager.persist({
        user,
        authenticationMode: "online",
        provider: "google",
        accessToken: token,
        tokenExpiresIn: 3600,
      });
      const progressKey = `aws_sim_user:${user.id}:journey`;
      localStorage.setItem(progressKey, '{"completedStages":["local-work"]}');
      expect(
        (
          await request("/auth/me", {
            headers: { Authorization: "Bearer invalid" },
          })
        ).status,
      ).toBe(401);
      expect((await request("/questions/pending")).status).toBe(403);
      await admin.query(
        "REVOKE SELECT ON users FROM cloudacademy_f3_runtime",
      );
      try {
        expect((await request("/auth/me")).status).toBe(500);
      } finally {
        await admin.query(
          "GRANT SELECT ON users TO cloudacademy_f3_runtime",
        );
      }
      await admin.query("ALTER ROLE cloudacademy_f3_runtime NOLOGIN");
      await admin.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='cloudacademy_f3_runtime'",
      );
      try {
        await expect(
          apiService.getModuleState("journey", "CLF-C02"),
        ).rejects.toMatchObject({ statusCode: 503 });
        expect(SessionManager.restore().accessToken).toBe(token);
        expect(SessionManager.restore().authenticationMode).toBe("online");
        expect(localStorage.getItem(progressKey)).toBe(
          '{"completedStages":["local-work"]}',
        );
        expect((await request("/ready")).status).toBe(503);
        expect((await request("/health")).status).toBe(200);
        expect(await request("/auth/me")).toEqual({
          status: 503,
          body: { error: "Service unavailable", status: 503 },
        });
        expect((await request("/questions")).status).toBe(503);
        expect(
          (
            await request("/auth/me", {
              headers: { Authorization: "Bearer invalid" },
            })
          ).status,
        ).toBe(401);
      } finally {
        await admin.query("ALTER ROLE cloudacademy_f3_runtime LOGIN");
      }
      expect((await request("/auth/me")).body.data.id).toBe(user.id);
      expect((await request("/ready")).status).toBe(200);
    });
    test("facade transaction uses one backend and rolls back on failure", async () => {
      await expect(
        getDatabase().transaction(async (tx) => {
          const first = (
            await tx.query(
              "SELECT pg_backend_pid() AS pid, txid_current() AS xid",
            )
          ).rows[0];
          const second = (
            await tx.query(
              "SELECT pg_backend_pid() AS pid, txid_current() AS xid",
            )
          ).rows[0];
          expect(second).toEqual(first);
          await tx.query(
            "UPDATE users SET nickname='rollback-f3' WHERE id=$1",
            [user.id],
          );
          throw new Error("rollback requested");
        }),
      ).rejects.toThrow("rollback requested");
      expect(
        (
          await executeQuery("SELECT nickname FROM users WHERE id=$1", [
            user.id,
          ])
        )[0].nickname,
      ).not.toBe("rollback-f3");
    });
    test("graceful shutdown closes HTTP and pool without logging credentials", async () => {
      child.send("shutdown");
      const [code] = await once(child, "exit");
      expect(code).toBe(0);
      await closeDatabase();
      expect(
        (
          await admin.query(
            "SELECT count(*)::int AS count FROM pg_stat_activity WHERE usename='cloudacademy_f3_runtime'",
          )
        ).rows[0].count,
      ).toBe(0);
      expect(output).not.toContain(process.env.DATABASE_URL);
      expect(output).not.toContain(new URL(process.env.DATABASE_URL).password);
      expect(output).not.toContain(token);
    });
  },
);
