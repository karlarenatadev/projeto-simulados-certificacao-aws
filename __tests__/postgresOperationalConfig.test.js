/** @jest-environment node */
import { describe, expect, test } from "@jest/globals";
import { validateApiConfig } from "../backend/api/config.js";
import { readOperationalPostgresConfig } from "../backend/database/postgres/operationalConfig.js";

const secret = "0123456789abcdefghijklmnopqrstuvwxyz-OPERATIONAL-TEST";
const base = {
  DB_ENGINE: "postgres",
  NODE_ENV: "staging",
  DATABASE_URL:
    "postgresql://cloudacademy_operational_runtime:secret@127.0.0.1:5432/cloudacademy_f2_test",
  DB_SSL_MODE: "disable",
  DB_POOL_MAX: "5",
  DB_CONNECTION_TIMEOUT_MS: "3000",
  DB_STATEMENT_TIMEOUT_MS: "5000",
  DB_QUERY_TIMEOUT_MS: "6000",
  DB_TRANSACTION_IDLE_TIMEOUT_MS: "10000",
  AUTH_SESSION_SECRET: secret,
  AUTH_ALLOWED_DOMAINS: "a3data.com.br,a3data.com",
  GOOGLE_CLIENT_ID: "123-test.apps.googleusercontent.com",
  PORT: "3001",
  TRUST_PROXY: "",
  CORS_ALLOWED_ORIGINS: "https://staging.example.invalid",
  PG_OPERATIONAL_TEST_TOKEN: "12345678-1234-4234-8234-123456789abc",
};

describe("operational PostgreSQL configuration", () => {
  test("accepts explicit local staging harness configuration", () => {
    expect(readOperationalPostgresConfig(base).pool.database).toBe(
      "cloudacademy_f2_test",
    );
    expect(validateApiConfig(base)).toMatchObject({
      port: 3001,
      trustProxy: false,
      corsAllowedOrigins: ["https://staging.example.invalid"],
    });
  });

  test("rejects missing settings and invalid pool bounds without exposing values", () => {
    for (const [field, value] of [
      ["DATABASE_URL", ""],
      ["DB_POOL_MAX", "0"],
      ["DB_POOL_MAX", "NaN"],
      ["DB_CONNECTION_TIMEOUT_MS", "-1"],
      ["DB_SSL_MODE", "disable-with-remote-host"],
      ["CORS_ALLOWED_ORIGINS", "*"],
      ["TRUST_PROXY", "true"],
      ["AUTH_ALLOWED_DOMAINS", ""],
    ]) {
      expect(() =>
        readOperationalPostgresConfig({ ...base, [field]: value }),
      ).toThrow(field);
    }
    try {
      readOperationalPostgresConfig({
        ...base,
        DATABASE_URL: "postgresql://private:password@host/db",
      });
    } catch (error) {
      expect(error.message).not.toContain("password");
      expect(error.message).not.toContain("private");
    }
  });

  test("accepts staging and production with real remote TLS config", () => {
    const remote = {
      ...base,
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://runtime:secret@db.example.invalid:5432/cloudacademy",
      DB_SSL_MODE: "verify-full",
      PG_OPERATIONAL_TEST_TOKEN: "",
    };
    expect(readOperationalPostgresConfig(remote).pool.ssl).toMatchObject({
      rejectUnauthorized: true,
    });
    expect(validateApiConfig(remote).port).toBe(3001);
    expect(() =>
      readOperationalPostgresConfig({ ...remote, NODE_ENV: "test" }),
    ).toThrow("NODE_ENV");
    expect(() =>
      readOperationalPostgresConfig({ ...remote, DB_ENGINE: "postgres-test" }),
    ).toThrow("DB_ENGINE");
  });
});
