/** @jest-environment node */

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const verifyGoogleIdToken = jest.fn();
jest.unstable_mockModule("../backend/api/services/googleIdentity.js", () => ({
  verifyGoogleIdToken,
}));

const { default: app } = await import("../backend/api/server.js");
const { closeDatabase, initializeDatabase } =
  await import("../backend/database/db.js");

describe("Google authentication route", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: "test" });
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    server?.close();
    await closeDatabase();
  });

  test("accepts verified Google identity and returns application HMAC", async () => {
    verifyGoogleIdToken.mockResolvedValueOnce({
      sub: "route-subject",
      email: "route-user@a3data.com.br",
      name: "Route User",
      given_name: "Route",
    });
    const response = await fetch(`${baseUrl}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "opaque-google-credential" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.provider).toBe("google");
    expect(body.data.access_token).toEqual(expect.any(String));
    expect(body.data.access_token.length).toBeGreaterThan(20);
  });

  test("rejects email-only login when production is selected", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "route-user@a3data.com.br" }),
      });
      expect(response.status).toBe(403);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  test.each(["http://127.0.0.1:8080", "http://localhost:8080"])(
    "development CORS allows %s explicitly, not with wildcard",
    async (origin) => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      try {
        const response = await fetch(`${baseUrl}/api/auth/google`, {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
          },
        });
        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-origin")).toBe(
          origin,
        );
        expect(response.headers.get("access-control-allow-headers")).toContain(
          "Content-Type",
        );
      } finally {
        process.env.NODE_ENV = previous;
      }
    },
  );
});
