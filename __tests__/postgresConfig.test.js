/** @jest-environment node */
import { describe, expect, test } from "@jest/globals";
import {
  readPostgresConfig,
  createPostgresAdapter,
} from "../backend/database/postgres/index.js";
import { classifyPostgresError } from "../backend/database/postgres/errors.js";

const base = {
  NODE_ENV: "test",
  DATABASE_URL:
    "postgresql://test:local-test-only@127.0.0.1:5432/cloudacademy_f1_test",
};

describe("isolated PostgreSQL configuration", () => {
  test("explicit configuration, no pg environment or URL override", () => {
    const config = readPostgresConfig({
      ...base,
      PGHOST: "production.invalid",
      DB_POOL_MAX: "2",
    });
    expect(config.pool).toMatchObject({
      host: "127.0.0.1",
      port: 5432,
      database: "cloudacademy_f1_test",
      max: 2,
      ssl: false,
    });
    expect(config.pool.query_timeout).toBeGreaterThan(
      config.pool.statement_timeout,
    );
  });

  test.each([
    undefined,
    "",
    "not-a-url",
    "https://u:p@localhost/db",
    "postgres://localhost/db",
    "postgres://u:p@localhost/",
    "postgres://u:p@localhost/a/b",
    "postgres://u:p@localhost/db?sslmode=disable",
    "postgres://u:p@localhost/db#fragment",
    "postgres://u:p@localhost:0/db",
    "postgres://u:p@localhost:99999/db",
    "postgres://u:p@localhost/%ZZ",
    "postgres://u:%0a@localhost/db",
    " postgres://u:p@localhost/db",
  ])("rejects unsafe/incomplete URL (case %#) without echoing it", (url) => {
    expect(() => readPostgresConfig({ ...base, DATABASE_URL: url })).toThrow(
      "Invalid PostgreSQL configuration: DATABASE_URL",
    );
  });

  test("TLS verifies remote/production endpoints; disabling verification is unsupported", () => {
    expect(
      readPostgresConfig({ ...base, NODE_ENV: "production" }).pool.ssl,
    ).toEqual({ rejectUnauthorized: true });
    const remote = {
      ...base,
      DATABASE_URL: "postgres://user:secret@db.example.test/test",
    };
    expect(readPostgresConfig(remote).pool.ssl).toEqual({
      rejectUnauthorized: true,
    });
    expect(() =>
      readPostgresConfig({ ...remote, DB_SSL_MODE: "disable" }),
    ).toThrow("DB_SSL_MODE");
    expect(() =>
      readPostgresConfig({
        ...base,
        NODE_ENV: "production",
        DB_SSL_MODE: "disable",
      }),
    ).toThrow("DB_SSL_MODE");
    expect(() =>
      readPostgresConfig({ ...base, DB_SSL_MODE: "no-verify" }),
    ).toThrow("DB_SSL_MODE");
  });

  test.each([
    "DB_POOL_MAX",
    "DB_CONNECTION_TIMEOUT_MS",
    "DB_STATEMENT_TIMEOUT_MS",
    "DB_QUERY_TIMEOUT_MS",
    "DB_IDLE_TIMEOUT_MS",
    "DB_TRANSACTION_IDLE_TIMEOUT_MS",
    "DB_SHUTDOWN_TIMEOUT_MS",
  ])("bounds %s", (field) => {
    for (const value of ["0", "-1", "NaN", "1.5", "9999999999"]) {
      expect(() => readPostgresConfig({ ...base, [field]: value })).toThrow(
        field,
      );
    }
  });

  test("query deadline must exceed the server statement timeout", () => {
    expect(() =>
      readPostgresConfig({
        ...base,
        DB_STATEMENT_TIMEOUT_MS: "100",
        DB_QUERY_TIMEOUT_MS: "100",
      }),
    ).toThrow("DB_QUERY_TIMEOUT_MS");
  });

  test("lazy construction, sanitized diagnostics and idempotent close without a server", async () => {
    const db = createPostgresAdapter({ env: base });
    expect(db.stats()).toMatchObject({ total: 0, state: "open" });
    const closing = db.close();
    expect(db.close()).toBe(closing);
    await closing;
    await expect(db.executeQuery("SELECT 1")).rejects.toMatchObject({
      code: "PG_POOL_CLOSED",
    });
    const classified = classifyPostgresError(
      {
        code: "23505",
        message: base.DATABASE_URL,
        detail: "private@example.test",
      },
      "query",
    );
    expect(classified).toMatchObject({ kind: "constraint", code: "23505" });
    expect(JSON.stringify(classified)).not.toMatch(
      /local-test-only|private@example|postgresql:/,
    );
    expect(classified.cause).toBeUndefined();
  });
});
