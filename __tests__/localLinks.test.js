/** @jest-environment node */
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import app from "../backend/api/server.js";
import {
  closeDatabase,
  createUser,
  executeQuery,
  getDatabase,
  initializeDatabase,
} from "../backend/database/db.js";
import { migrateLocalLinks } from "../backend/database/localLinks.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import { LOCAL_LINK_SCOPES } from "../src/frontend/js/core/contracts/localLinkMigration.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { createOfflineLinkingService } from "../src/frontend/js/services/offlineLinkingService.js";

let server, baseUrl, a, b;
const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);

async function request(path, user = a, body, method = body ? "POST" : "GET") {
  const response = await fetch(`${baseUrl}/api/me${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user
        ? { Authorization: `Bearer ${createSessionToken(user.id)}` }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { status: response.status, ...result };
}

beforeAll(async () => {
  await initializeDatabase({ environment: "test", dataDir: "memory://" });
  a = await createUser("LocalLinkA");
  b = await createUser("LocalLinkB");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

describe("durable local links backend (real HMAC and PGlite)", () => {
  test("all endpoints require authentication and reject forged owner fields", async () => {
    expect(
      (
        await request("/local-links/claim", null, {
          localIdentityId: "local_auth",
        })
      ).status,
    ).toBe(401);
    expect((await request("/local-links/local_auth", null)).status).toBe(401);
    expect(
      (
        await request("/local-links/local_auth/complete", null, {
          receipts: [],
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request("/local-links/claim", a, {
          localIdentityId: "local_auth",
          userId: b.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (await request("/local-links/claim", a, { localIdentityId: a.id }))
        .status,
    ).toBe(400);
  });

  test("first claim is pending, same owner repeat/GET is idempotent", async () => {
    expect((await request("/local-links/local_first")).data.status).toBe(
      "unclaimed",
    );
    const first = await request("/local-links/claim", a, {
      localIdentityId: "local_first",
    });
    expect(first.status).toBe(200);
    expect(first.data).toMatchObject({
      status: "pending",
      ownedByCurrentUser: true,
      migrationVersion: 1,
    });
    expect(
      (
        await request("/local-links/claim", a, {
          localIdentityId: "local_first",
        })
      ).data,
    ).toEqual(first.data);
    expect((await request("/local-links/local_first")).data.id).toBe(
      first.data.id,
    );
  });

  test("another user cannot claim, read owner details or complete", async () => {
    for (const [path, body] of [
      ["/local-links/claim", { localIdentityId: "local_first" }],
      ["/local-links/local_first", undefined],
      ["/local-links/local_first/complete", { receipts: [] }],
    ]) {
      const denied = await request(path, b, body);
      expect(denied.status).toBe(409);
      expect(denied.error).toBe("local_identity_already_linked");
      expect(JSON.stringify(denied)).not.toContain(a.id);
      expect(denied.data).toBeUndefined();
    }
  });

  test("racing claims select one owner; same-user races share a single record", async () => {
    const results = await Promise.all(
      [a, b].map((user) =>
        request("/local-links/claim", user, { localIdentityId: "local_race" }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const rows = await executeQuery(
      "SELECT count(*)::int AS count FROM local_identity_links WHERE local_identity_id='local_race'",
    );
    expect(rows[0].count).toBe(1);
    const same = await Promise.all(
      [1, 2].map(() =>
        request("/local-links/claim", a, { localIdentityId: "local_same" }),
      ),
    );
    expect(same[0].data.id).toBe(same[1].data.id);
  });

  test("complete requires every v1 scope to exist remotely at the acknowledged version", async () => {
    expect(
      (await request("/local-links/local_first/complete", a, { receipts: [] }))
        .error,
    ).toBe("migration_incomplete");
    const fabricated = LOCAL_LINK_SCOPES.map((s) => ({ ...s, version: 9999 }));
    expect(
      (
        await request("/local-links/local_first/complete", a, {
          receipts: fabricated,
        })
      ).status,
    ).toBe(409);
    const receipts = [];
    for (const { module, certId } of LOCAL_LINK_SCOPES) {
      const saved = await request(
        `/state/${module}`,
        a,
        { certification: certId, state: {}, version: 0 },
        "PUT",
      );
      expect(saved.status).toBe(200);
      receipts.push({ module, certId, version: Number(saved.data.version) });
    }
    const completed = await request("/local-links/local_first/complete", a, {
      receipts,
    });
    expect(completed.data.status).toBe("completed");
    expect(completed.data.completedAt).toBeTruthy();
    expect(
      (await request("/local-links/local_first/complete", a, { receipts: [] }))
        .data,
    ).toEqual(completed.data);
    expect(
      (
        await request("/local-links/claim", a, {
          localIdentityId: "local_first",
        })
      ).data,
    ).toEqual(completed.data);
  });

  test("migration is additive/idempotent and keeps owner and users intact", async () => {
    const before = await request("/local-links/local_first");
    await migrateLocalLinks(getDatabase());
    await migrateLocalLinks(getDatabase());
    expect((await request("/local-links/local_first")).data).toEqual(
      before.data,
    );
  });

  test("version zero cannot overwrite a concurrent first write; stale positive version is rejected", async () => {
    const saves = await Promise.all(
      [1, 2].map((value) =>
        request(
          "/state/journey",
          b,
          {
            certification: "aif-c01",
            state: { completedStages: [String(value)] },
            version: 0,
          },
          "PUT",
        ),
      ),
    );
    expect(saves.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (
        await request(
          "/state/journey",
          b,
          { certification: "aif-c01", state: {}, version: 9 },
          "PUT",
        )
      ).status,
    ).toBe(409);
    const current = await request("/state/journey?certification=aif-c01", b);
    expect(current.data.version).toBe(1);
    expect(current.data.state_json.completedStages).toHaveLength(1);
  });
});

test("client failure, crash resume, CAS conflict, completed replay and B isolation against real API", async () => {
  const memory = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
      clear: () => memory.clear(),
      key: (i) => [...memory.keys()][i],
      get length() {
        return memory.size;
      },
    },
  });
  const raw = new StorageManager();
  const calls = [];
  let failDeck = true,
    conflict = true;
  const online = (user) =>
    SessionManager.persist({
      user,
      authenticationMode: "online",
      provider: "google",
      accessToken: createSessionToken(user.id),
      tokenExpiresIn: 3600,
    });
  const currentUser = () => SessionManager.restore().user;
  async function transport(path, body, method) {
    const result = await request(path, currentUser(), body, method);
    if (result.status >= 400)
      throw Object.assign(new Error(result.error), {
        statusCode: result.status,
      });
    return result;
  }
  const api = {
    claimLocalIdentity: (id) =>
      transport("/local-links/claim", { localIdentityId: id }),
    completeLocalIdentityLink: (id, receipts) =>
      transport(`/local-links/${id}/complete`, { receipts }),
    getModuleState: async (module, cert) => {
      calls.push(["get", module, cert]);
      return transport(`/state/${module}?certification=${cert}`);
    },
    saveModuleState: async (module, cert, state, version) => {
      calls.push(["save", module, cert, version]);
      if (module === "flashcards" && failDeck) {
        await transport(
          `/state/${module}`,
          { certification: cert, state, version },
          "PUT",
        );
        throw new Error("response lost after remote write");
      }
      if (module === "journey" && cert === "clf-c02" && conflict) {
        conflict = false;
        const other = await transport(`/state/${module}?certification=${cert}`);
        await transport(
          `/state/${module}`,
          {
            certification: cert,
            version: other.data.version,
            state: { completedStages: ["other-device"] },
          },
          "PUT",
        );
      }
      return transport(
        `/state/${module}`,
        { certification: cert, state, version },
        "PUT",
      );
    },
  };
  const repository = createDataRepository(raw, api);
  online(a);
  raw.setUserData("gamification", JSON.stringify({ legacyBaselineXp: 500 }));
  SessionManager.persist({
    user: { id: "local_resume" },
    authenticationMode: "offline",
    provider: "local",
  });
  raw.setAccountModuleState("diagnostic", "clf-c02", {
    history: [
      {
        attemptId: "diag-source",
        certId: "clf-c02",
        mode: "diagnostic",
        status: "completed",
      },
    ],
  });
  raw.setAccountModuleState("mistakes", "clf-c02", {
    mistakes: [
      {
        questionId: "q1",
        certId: "clf-c02",
        wrongCount: 3,
        resolved: false,
        lastOccurrence: "2026-09-15T10:00:00Z",
      },
    ],
  });
  raw.setAccountModuleState("flashcards", "clf-c02", {
    deck: [
      {
        questionId: "q1",
        certId: "clf-c02",
        question: "Saved",
        reviewCount: 2,
        reviewStatus: "mastered",
        lastReviewedAt: "2026-09-15T10:00:00Z",
      },
    ],
  });
  raw.setAccountModuleState("journey", "clf-c02", {
    completedStages: ["local-stage"],
  });
  raw.setAccountModuleState("sprint", "clf-c02", {
    completedStages: ["1", "2"],
  });
  raw.setUserData(
    "gamification",
    JSON.stringify({ legacyBaselineXp: 70, activityDays: ["2026-09-15"] }),
  );
  raw.setUserData(
    "gamification_xp_events",
    JSON.stringify([{ id: "source-xp", amount: 50 }]),
  );
  const sourceEntries = [...memory.entries()].filter(([k]) =>
    k.startsWith("aws_sim_user:local_resume:"),
  );
  let service = createOfflineLinkingService(repository, api);
  expect(service.captureSource()).toEqual({ localIdentityId: "local_resume" });
  online(a);
  const deckVersionBefore = (
    await request("/state/flashcards?certification=clf-c02")
  ).data.version;
  const failed = await service.migrateSource("local_resume");
  expect(failed.status).toBe("pending");
  expect((await request("/local-links/local_resume")).data.status).toBe(
    "pending",
  );
  expect(
    (await request("/state/flashcards?certification=clf-c02")).data.version,
  ).toBe(deckVersionBefore + 1);
  for (const [key, value] of sourceEntries) expect(memory.get(key)).toBe(value);
  SessionManager.logout();
  online(a); // New service + session: no in-memory checkpoint required.
  service = createOfflineLinkingService(repository, api);
  failDeck = false;
  const completed = await service.migrateSource("local_resume");
  expect(completed.status).toBe("completed");
  expect(
    (await request("/state/diagnostic?certification=clf-c02")).data.state_json
      .history,
  ).toHaveLength(1);
  expect(
    (await request("/state/mistakes?certification=clf-c02")).data.state_json
      .mistakes[0],
  ).toMatchObject({ wrongCount: 3, resolved: false });
  expect(
    (await request("/state/flashcards?certification=clf-c02")).data.state_json
      .deck,
  ).toHaveLength(1);
  expect(
    (await request("/state/flashcards?certification=clf-c02")).data.version,
  ).toBe(deckVersionBefore + 1); // Retry confirms the write without a version bump.
  expect(
    (await request("/state/journey?certification=clf-c02")).data.state_json
      .completedStages,
  ).toEqual(expect.arrayContaining(["local-stage", "other-device"]));
  expect(
    calls
      .filter(
        (c) => c[0] === "save" && c[1] === "journey" && c[2] === "clf-c02",
      )
      .map((c) => c[3]),
  ).toEqual([1, 2]);
  expect(raw.getTotalXp()).toBe(500); // Excluded: source baseline/events are not imported or doubled.
  expect(calls.some((c) => c[1] === "gamification")).toBe(false);
  const before = calls.length;
  SessionManager.logout();
  online(a);
  expect(
    (
      await createOfflineLinkingService(repository, api).migrateSource(
        "local_resume",
      )
    ).id,
  ).toBe(completed.id);
  expect(calls).toHaveLength(before);
  SessionManager.logout();
  online(b);
  await expect(service.migrateSource("local_resume")).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(calls).toHaveLength(before);
  expect(raw.getHistory()).toEqual([]);
  for (const [key, value] of sourceEntries) expect(memory.get(key)).toBe(value);
  SessionManager.persist({
    user: a,
    provider: "google",
    authenticationMode: "offline-expired",
  });
  expect(service.captureSource()).toBeNull();
  expect(SessionManager.restore().linkedLocalUserId).toBeUndefined();
});
