/** @jest-environment node */
import {
  afterAll,
  afterEach,
  beforeAll,
  expect,
  jest,
  test,
} from "@jest/globals";
import * as database from "../backend/database/db.js";
import { DatabaseUnavailableError } from "../backend/database/errors.js";
import { validateApiConfig } from "../backend/api/config.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";

const getUserModuleState = jest.fn();
jest.unstable_mockModule("../backend/database/db.js", () => ({
  ...database,
  getUserModuleState,
}));
const { default: app } = await import("../backend/api/server.js");
const original = { ...process.env };
let server;
let url;
beforeAll(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterEach(() => {
  for (const name of [
    "NODE_ENV",
    "DB_ENGINE",
    "ALLOW_DEV_EMAIL_LOGIN",
    "CORS_ALLOWED_ORIGINS",
  ]) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
  getUserModuleState.mockReset();
});
afterAll(async () => new Promise((resolve) => server.close(resolve)));

test.each(["staging", "production"])(
  "%s rejects legacy provisioning even with development login enabled",
  async (environment) => {
    process.env.NODE_ENV = environment;
    process.env.DB_ENGINE = "pglite";
    process.env.ALLOW_DEV_EMAIL_LOGIN = "true";
    for (const path of ["/api/auth/login", "/api/users"]) {
      const response = await fetch(url + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "synthetic@a3data.com.br" }),
      });
      expect(response.status).toBe(403);
    }
  },
);

test("PGlite uses the explicit corporate CORS allowlist without retaining the Pages origin", async () => {
  process.env.NODE_ENV = "production";
  process.env.DB_ENGINE = "pglite";
  process.env.CORS_ALLOWED_ORIGINS = "https://study.example.invalid";
  for (const origin of [
    "https://study.example.invalid",
    "https://karlarenatadev.github.io",
  ]) {
    const response = await fetch(url + "/api/health", {
      headers: { Origin: origin },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      origin === "https://study.example.invalid" ? origin : null,
    );
  }
});

test.each(["staging", "production"])(
  "%s validates PGlite secrets, persistence and explicit HTTPS origins",
  (environment) => {
    const config = {
      NODE_ENV: environment,
      DB_ENGINE: "pglite",
      DB_DATA_DIR: "/synthetic/data",
      AUTH_SESSION_SECRET: "0123456789abcdefghijklmnopqrstuvwxyz-TEST-ONLY",
      GOOGLE_CLIENT_ID: "123-test.apps.googleusercontent.com",
      CORS_ALLOWED_ORIGINS: "https://study.example.invalid",
    };
    expect(() => validateApiConfig(config)).not.toThrow();
    for (const origin of [
      "*",
      "",
      "http://study.example.invalid",
      "https://study.example.invalid/path",
    ]) {
      expect(() =>
        validateApiConfig({ ...config, CORS_ALLOWED_ORIGINS: origin }),
      ).toThrow("CORS_ALLOWED_ORIGINS");
    }
    expect(() =>
      validateApiConfig({ ...config, AUTH_SESSION_SECRET: "" }),
    ).toThrow("AUTH_SESSION_SECRET");
    expect(() =>
      validateApiConfig({ ...config, DB_DATA_DIR: "memory://" }),
    ).toThrow("DB_DATA_DIR");
  },
);

test("quiz preference database outage is 503, while invalid language remains 400", async () => {
  process.env.NODE_ENV = "test";
  const request = () =>
    fetch(url + "/api/quiz/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Test-Role": "STUDENT" },
      body: JSON.stringify({
        certification: "CLF-C02",
        language: "invalid-language",
      }),
    });
  getUserModuleState.mockRejectedValueOnce(new DatabaseUnavailableError());
  expect((await request()).status).toBe(503);
  getUserModuleState.mockResolvedValueOnce(null);
  expect((await request()).status).toBe(400);
});

test("signed accounts have separate quotas behind a shared IP; forged identity cannot evade the anonymous limit", async () => {
  process.env.NODE_ENV = "test";
  const first = createSessionToken("synthetic-rate-user-a");
  const second = createSessionToken("synthetic-rate-user-b");
  const health = (headers) => fetch(url + "/api/health", { headers });
  for (let i = 0; i < 300; i++) {
    const response = await health({ Authorization: `Bearer ${first}` });
    await response.arrayBuffer();
    expect(response.status).toBe(200);
  }
  expect((await health({ Authorization: `Bearer ${first}` })).status).toBe(429);
  expect((await health({ Authorization: `Bearer ${second}` })).status).toBe(
    200,
  );
  const forged = `${first.slice(0, -1)}${first.endsWith("a") ? "b" : "a"}`;
  let blocked = false;
  for (let i = 0; i <= 300; i++) {
    const response = await health({
      Authorization: `Bearer ${forged}`,
      "X-User-Id": `spoof-${i}`,
    });
    await response.arrayBuffer();
    if (response.status === 429) {
      blocked = true;
      break;
    }
    expect(response.status).toBe(200);
  }
  expect(blocked).toBe(true);
});
