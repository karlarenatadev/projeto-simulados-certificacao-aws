/** @jest-environment node */
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import app from "../backend/api/server.js";
import {
  initializeDatabase,
  closeDatabase,
  createUser,
} from "../backend/database/db.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import { apiService } from "../src/frontend/js/services/api.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { createXpEvent } from "../src/frontend/js/gamificationPolicy.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("gamification global API contract (real database, synthetic HMAC)", () => {
  let server, baseUrl, user, token, dataDir;
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  const values = new Map();
  beforeAll(async () => {
    // Only a fresh temporary PGlite directory; F3 ignores dataDir and uses its guarded target.
    if (process.env.DB_ENGINE !== "postgres-test")
      dataDir = await mkdtemp(join(tmpdir(), "cloudacademy-c02-"));
    await initializeDatabase({ environment: "test", dataDir });
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
      },
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "127.0.0.1", protocol: "http:" },
    });
    globalThis.__APP_CONFIG__ = { apiBaseUrl: baseUrl };
  });
  beforeEach(async () => {
    values.clear();
    user = await createUser(`Gamification-${Date.now()}`);
    token = createSessionToken(user.id);
    SessionManager.persist({
      user,
      accessToken: token,
      authenticationMode: "online",
      tokenExpiresIn: 3600,
    });
  });
  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
    delete globalThis.__APP_CONFIG__;
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete globalThis.localStorage;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else delete globalThis.location;
  });
  const xp = (sourceId) =>
    createXpEvent({
      eventType: "interactive_lab_completed",
      sourceId,
      createdAt: "2026-10-07T12:00:00.000Z",
    });

  test("global PUT version zero, GET/hydration, versioned update and 409", async () => {
    expect((await apiService.getModuleState("gamification")).data).toBeNull();
    const saved = await apiService.saveModuleState(
      "gamification",
      null,
      { events: [xp("remote")], legacyBaselineXp: 100 },
      0,
    );
    expect(saved.data.version).toBe(1);
    expect(saved.data.certification_id).toBe("");
    await expect(
      apiService.saveModuleState("gamification", null, {}, 0),
    ).rejects.toMatchObject({ statusCode: 409 });
    const storage = new StorageManager();
    const repo = createDataRepository(storage, apiService);
    await repo.syncAccountModuleState("gamification", null, {
      hydrateOnly: true,
    });
    expect(storage.getTotalXp()).toBe(110);
    storage.awardXpEvent({
      eventType: "interactive_lab_completed",
      sourceId: "local",
    });
    expect(
      await repo.syncAccountModuleState("gamification", null, {
        confirmRemote: true,
      }),
    ).toMatchObject({ remoteConfirmed: true, version: 2 });
    await expect(
      apiService.saveModuleState("gamification", null, {}, 1),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      (await apiService.getModuleState("gamification")).data.state_json.events,
    ).toHaveLength(2);
  });

  test("global allowlist, payload validation, account isolation and legitimate 401", async () => {
    const raw = (
      path,
      method = "GET",
      body,
      authorization = `Bearer ${token}`,
    ) =>
      fetch(`${baseUrl}/api/me/state/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    expect((await raw("gamification?certification=CLF-C02")).status).toBe(400);
    expect(
      (
        await raw("gamification", "PUT", {
          certification: "CLF-C02",
          state: {},
          version: 0,
        })
      ).status,
    ).toBe(400);
    expect(
      (await raw("labs", "PUT", { certification: null, state: {}, version: 0 }))
        .status,
    ).toBe(400);
    expect(
      (
        await raw("preferences", "PUT", {
          certification: null,
          state: {},
          version: 0,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await raw("gamification", "PUT", {
          certification: null,
          state: { events: [{ amount: 10 }] },
          version: 0,
        })
      ).status,
    ).toBe(400);
    expect((await apiService.getModuleState("gamification")).data).toBeNull();
    await apiService.saveModuleState(
      "gamification",
      null,
      { events: [xp("private")] },
      0,
    );
    const other = await createUser(`Other-${Date.now()}`);
    const response = await raw(
      "gamification",
      "GET",
      null,
      `Bearer ${createSessionToken(other.id)}`,
    );
    expect((await response.json()).data).toBeNull();
    expect(
      (await raw("gamification", "GET", null, "Bearer invalid")).status,
    ).toBe(401);
  });

  test.each(["labs", "gamification"])(
    "%s recovers an actual HTTP CAS conflict without losing either side",
    async (module) => {
      const cert = module === "labs" ? "clf-c02" : null;
      const state = (id) =>
        module === "labs" ? { completedLabIds: [id] } : { events: [xp(id)] };
      const storage = new StorageManager();
      storage.setAccountModuleState(module, cert, state("local"));
      let first = true;
      const versions = [];
      const api = {
        getModuleState: (...args) => apiService.getModuleState(...args),
        saveModuleState: async (...args) => {
          versions.push(args[3]);
          if (first) {
            first = false;
            // A second HTTP writer commits after our GET, before our create-only PUT.
            await apiService.saveModuleState(module, cert, state("remote"), 0);
          }
          return apiService.saveModuleState(...args);
        },
      };
      expect(
        await createDataRepository(storage, api).syncAccountModuleState(
          module,
          cert,
          { confirmRemote: true },
        ),
      ).toMatchObject({ remoteConfirmed: true, version: 2 });
      expect(versions).toEqual([0, 1]);
      const saved = (await apiService.getModuleState(module, cert)).data
        .state_json;
      if (module === "labs")
        expect(saved.completedLabIds).toEqual(["local", "remote"]);
      else expect(saved.events).toEqual([xp("local"), xp("remote")]);
    },
  );

  test("503 preserves global ledger/token/namespace and the same session resumes after database reopens", async () => {
    const storage = new StorageManager();
    const repo = createDataRepository(storage, apiService);
    await apiService.saveModuleState(
      "gamification",
      null,
      { events: [xp("remote")] },
      0,
    );
    storage.setAccountModuleState("gamification", null, {
      events: [xp("local")],
    });
    const namespace = storage.getStorageContext();
    await closeDatabase();
    try {
      await expect(
        apiService.getModuleState("gamification"),
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(await repo.syncAccountModuleState("gamification")).toMatchObject({
        syncPending: true,
      });
      expect(storage.getXpState().events).toEqual([xp("local")]);
      expect(storage.getStorageContext()).toBe(namespace);
      expect(SessionManager.restore()).toMatchObject({
        accessToken: token,
        user: { id: user.id },
      });
    } finally {
      await initializeDatabase({ environment: "test", dataDir });
    }
    expect(
      await repo.syncAccountModuleState("gamification", null, {
        confirmRemote: true,
      }),
    ).toMatchObject({ remoteConfirmed: true, version: 2 });
    expect(storage.getTotalXp()).toBe(20);
    expect(
      (await apiService.getModuleState("gamification")).data.state_json.events,
    ).toHaveLength(2);
    SessionManager.persist({
      user,
      accessToken: "invalid",
      authenticationMode: "online",
      tokenExpiresIn: 3600,
    });
    await expect(
      apiService.getModuleState("gamification"),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(storage.getXpState().events).toHaveLength(2);
  });
});
