/** @jest-environment node */
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  closeDatabase,
  createUser,
  initializeDatabase,
} from "../backend/database/db.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import app from "../backend/api/server.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { apiService } from "../src/frontend/js/services/api.js";

describe("API database availability preserves authenticated local state", () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  let dataDir;
  let server;
  let baseUrl;
  let user;
  let token;
  const storage = new Map();

  beforeAll(async () => {
    dataDir = await mkdtemp(
      join(tmpdir(), "cloudacademy-session-availability-"),
    );
    await initializeDatabase({ environment: "test", dataDir });
    user = await createUser("Availability test user");
    token = createSessionToken(user.id);
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
      },
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "127.0.0.1", protocol: "http:" },
    });
    globalThis.__APP_CONFIG__ = { apiBaseUrl: baseUrl };
    SessionManager.persist({
      user,
      provider: "backend",
      authenticationMode: "online",
      accessToken: token,
      tokenExpiresIn: 3600,
    });
    localStorage.setItem(
      `aws_sim_user:${user.id}:journey`,
      JSON.stringify({ completedStages: ["offline-progress"] }),
    );
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    await rm(dataDir, { recursive: true, force: true });
    delete globalThis.__APP_CONFIG__;
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete globalThis.localStorage;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else delete globalThis.location;
  });

  test("invalid token is 401; insufficient role is 403; CAS remains 409", async () => {
    const invalid = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(invalid.status).toBe(401);

    const forbidden = await fetch(`${baseUrl}/api/questions/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(forbidden.status).toBe(403);

    const saved = await apiService.saveModuleState(
      "journey",
      "CLF-C02",
      { stage: "first" },
      0,
    );
    expect(saved.data.version).toBe(1);
    await expect(
      apiService.saveModuleState("journey", "CLF-C02", { stage: "stale" }, 0),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test("database outage returns 503 and the same session recovers", async () => {
    expect((await apiService.getMe(user.id)).data.id).toBe(user.id);
    await closeDatabase();

    const unavailable = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      error: "Service unavailable",
      status: 503,
    });

    let outageError;
    try {
      await apiService.getMe(user.id);
    } catch (error) {
      outageError = error;
    }

    // Restore the same persistent test database even when the assertion below
    // detects the pre-fix 401 regression.
    await initializeDatabase({ environment: "test", dataDir });

    expect(outageError).toMatchObject({ statusCode: 503 });
    expect(SessionManager.restore()).toMatchObject({
      user: { id: user.id },
      accessToken: token,
      authenticationMode: "online",
    });
    expect(localStorage.getItem(`aws_sim_user:${user.id}:journey`)).toBe(
      JSON.stringify({ completedStages: ["offline-progress"] }),
    );
    expect((await apiService.getMe(user.id)).data.id).toBe(user.id);
    SessionManager.logout();
    expect(SessionManager.restore()).toBeNull();
    expect(
      localStorage.getItem(`aws_sim_user:${user.id}:journey`),
    ).not.toBeNull();
  });
});
