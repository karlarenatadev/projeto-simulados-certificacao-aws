import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { reconcileModuleState } from "../src/frontend/js/progressSync.js";
import { createXpEvent } from "../src/frontend/js/gamificationPolicy.js";
import { projectGamification } from "../src/frontend/js/gamificationProjection.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { LOCAL_LINK_SCOPES } from "../src/frontend/js/core/contracts/localLinkMigration.js";
import { apiService } from "../src/frontend/js/services/api.js";

const event = (sourceId) => ({
  ...createXpEvent({
    eventType: "interactive_lab_completed",
    sourceId,
    certification: "clf-c02",
    createdAt: "2026-10-07T12:00:00.000Z",
  }),
  metadata: { exercise: sourceId, nested: { preserved: true } },
});
const merge = (module, a, b) => reconcileModuleState(module, a, b).state;

describe("Labs grow-only reconciliation", () => {
  test("absent side still normalizes ordering and duplicates", () => {
    const state = { completedLabIds: ["b", "a", "b"] };
    expect(merge("labs", state, null)).toEqual({ completedLabIds: ["a", "b"] });
    expect(merge("labs", null, state)).toEqual({ completedLabIds: ["a", "b"] });
  });
  test.each([
    ["local only", ["lab-local"], [], ["lab-local"]],
    ["remote only", [], ["lab-remoto"], ["lab-remoto"]],
    ["union", ["lab-local"], ["lab-remoto"], ["lab-local", "lab-remoto"]],
    ["duplicates", ["a", "a"], ["a", "b", "b"], ["a", "b"]],
    ["different order", ["c", "a"], ["b", "a"], ["a", "b", "c"]],
    ["empty", [], [], []],
  ])("%s", (_name, a, b, expected) => {
    const left = { completedLabIds: a },
      right = { completedLabIds: b };
    const result = merge("labs", left, right);
    expect(result.completedLabIds).toEqual(expected);
    expect(merge("labs", right, left)).toEqual(result);
    expect(merge("labs", result, right)).toEqual(result);
    expect(left.completedLabIds).toEqual(a);
  });
});

describe("XP ledger reconciliation", () => {
  test("absent side still deduplicates identified events", () => {
    const state = { events: [event("b"), event("a"), event("b")] };
    expect(merge("gamification", state, null).events).toEqual([
      event("a"),
      event("b"),
    ]);
    expect(merge("gamification", null, state).events).toEqual([
      event("a"),
      event("b"),
    ]);
  });
  test("same ID uses earliest timestamp and retains extra metadata without mutating inputs", () => {
    const first = event("a");
    const later = {
      ...first,
      createdAt: "2026-10-08T12:00:00.000Z",
      deviceNote: "retained",
    };
    const result = merge(
      "gamification",
      { events: [later] },
      { events: [first] },
    );
    expect(result.events).toEqual([{ ...first, deviceNote: "retained" }]);
    expect(
      merge("gamification", { events: [first] }, { events: [later] }),
    ).toEqual(result);
    expect(later.createdAt).toBe("2026-10-08T12:00:00.000Z");
  });
  test.each([
    ["local only", [event("a")], []],
    ["remote only", [], [event("b")]],
    ["distinct at same instant and amount", [event("a")], [event("b")]],
    ["duplicate", [event("a")], [event("a")]],
    ["different order", [event("c"), event("a")], [event("b"), event("a")]],
  ])("%s retains identities, metadata and derived total", (_name, a, b) => {
    const result = merge(
      "gamification",
      { events: a, legacyBaselineXp: 20 },
      { events: b, legacyBaselineXp: 100 },
    );
    const expected = [
      ...new Map([...a, ...b].map((e) => [e.id, e])).values(),
    ].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    expect(result.events).toEqual(expected);
    expect(projectGamification(result).totalXp).toBe(
      100 + expected.length * 10,
    );
    expect(
      merge("gamification", result, { events: b, legacyBaselineXp: 100 }),
    ).toEqual(result);
    expect(
      merge(
        "gamification",
        { events: b, legacyBaselineXp: 100 },
        { events: a, legacyBaselineXp: 20 },
      ),
    ).toEqual(result);
  });
});

describe("account Labs/XP synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    SessionManager.persist({
      user: { id: "correction-two" },
      accessToken: "synthetic-token",
      authenticationMode: "online",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  });
  test.each(["labs", "gamification"])(
    "%s retries 409 with union and positive version",
    async (module) => {
      const cert = module === "labs" ? "clf-c02" : null;
      const state = (id) =>
        module === "labs" ? { completedLabIds: [id] } : { events: [event(id)] };
      const storage = new StorageManager();
      storage.setAccountModuleState(module, cert, state("local"));
      const api = {
        getModuleState: jest
          .fn()
          .mockResolvedValueOnce({ success: true, data: null })
          .mockResolvedValueOnce({
            success: true,
            data: { version: 3, state_json: state("remote") },
          }),
        saveModuleState: jest
          .fn()
          .mockRejectedValueOnce({ statusCode: 409 })
          .mockResolvedValueOnce({ success: true, data: { version: 4 } }),
      };
      const result = await createDataRepository(
        storage,
        api,
      ).syncAccountModuleState(module, cert, { confirmRemote: true });
      expect(result).toMatchObject({ remoteConfirmed: true, version: 4 });
      expect(api.saveModuleState.mock.calls[0][3]).toBe(0);
      const saved = api.saveModuleState.mock.calls[1];
      expect(saved[3]).toBe(3);
      if (module === "labs")
        expect(saved[2].completedLabIds).toEqual(["local", "remote"]);
      else expect(saved[2].events).toEqual([event("local"), event("remote")]);
    },
  );
  test("global hydration restores the baseline and does not expand v1", () => {
    const storage = new StorageManager();
    storage.saveGamification({ legacyBaselineXp: 0 });
    storage.setAccountModuleState("gamification", null, {
      events: [event("remote")],
      legacyBaselineXp: 100,
    });
    expect(storage.getTotalXp()).toBe(110);
    expect(LOCAL_LINK_SCOPES).toHaveLength(20);
    expect(new Set(LOCAL_LINK_SCOPES.map((s) => s.module))).toEqual(
      new Set(["diagnostic", "mistakes", "flashcards", "journey", "sprint"]),
    );
  });

  test("Labs hydration writes the same normalized namespace as its reader and UI", () => {
    const storage = new StorageManager();
    storage.setAccountModuleState("labs", "CLF-C02", {
      completedLabIds: ["remote"],
    });
    expect(storage.getCompletedLabIds("clf-c02")).toEqual(["remote"]);
    expect(
      localStorage.getItem(storage.getUserScopedKey("completed_labs_CLF-C02")),
    ).toBeNull();
  });

  test.each(["labs", "gamification"])(
    "%s preserves progress on failed GET, PUT and conflict reread",
    async (module) => {
      const cert = module === "labs" ? "clf-c02" : null;
      const local =
        module === "labs"
          ? { completedLabIds: ["local"] }
          : { events: [event("local")] };
      const remote =
        module === "labs"
          ? { completedLabIds: ["remote"] }
          : { events: [event("remote")] };
      for (const failure of [
        Object.assign(new Error("timeout"), { name: "AbortError" }),
        new TypeError("network"),
        { statusCode: 503 },
      ]) {
        for (const stage of ["GET", "PUT", "conflict reread"]) {
          const storage = new StorageManager(
            `test-${stage}-${failure.name || failure.statusCode}-`,
          );
          storage.setAccountModuleState(module, cert, local);
          const api = {
            getModuleState: jest.fn().mockResolvedValue({
              success: true,
              data: { version: 2, state_json: remote },
            }),
            saveModuleState: jest.fn().mockRejectedValue(failure),
          };
          if (stage === "GET") api.getModuleState.mockRejectedValue(failure);
          if (stage === "conflict reread") {
            api.saveModuleState.mockRejectedValueOnce({ statusCode: 409 });
            api.getModuleState
              .mockResolvedValueOnce({
                success: true,
                data: { version: 2, state_json: remote },
              })
              .mockRejectedValueOnce(failure);
          }
          const repo = createDataRepository(storage, api);
          expect(
            await repo.syncAccountModuleState(module, cert, {
              confirmRemote: true,
            }),
          ).toMatchObject({ syncPending: true });
          const state = storage.getAccountModuleState(module, cert);
          if (module === "labs")
            expect(state.completedLabIds).toEqual(
              stage === "GET" ? ["local"] : ["local", "remote"],
            );
          else
            expect(state.events).toEqual(
              stage === "GET"
                ? [event("local")]
                : [event("local"), event("remote")],
            );
          if (stage === "GET")
            expect(api.saveModuleState).not.toHaveBeenCalled();
          expect(SessionManager.restore().accessToken).toBe("synthetic-token");
          api.getModuleState.mockResolvedValue({
            success: true,
            data: { version: 2, state_json: remote },
          });
          api.saveModuleState.mockResolvedValue({
            success: true,
            data: { version: 3 },
          });
          expect(
            await repo.syncAccountModuleState(module, cert, {
              confirmRemote: true,
            }),
          ).toMatchObject({ remoteConfirmed: true });
        }
      }
    },
  );

  test.each([
    ["unidentified", { amount: 10, createdAt: "2026-10-07T12:00:00.000Z" }],
    ["conflicting amount", { ...event("local"), amount: 99 }],
    [
      "conflicting metadata",
      { ...event("local"), metadata: { exercise: "different" } },
    ],
  ])(
    "%s XP remains pending without modifying either source",
    async (_name, ambiguous) => {
      const storage = new StorageManager();
      storage.setAccountModuleState("gamification", null, {
        events: [event("local")],
      });
      const remote = { events: [ambiguous] };
      const before = JSON.stringify(remote);
      const api = {
        getModuleState: jest.fn().mockResolvedValue({
          success: true,
          data: { version: 1, state_json: remote },
        }),
        saveModuleState: jest.fn(),
      };
      expect(
        await createDataRepository(storage, api).syncAccountModuleState(
          "gamification",
        ),
      ).toMatchObject({ syncPending: true });
      expect(storage.getXpState().events).toEqual([event("local")]);
      expect(JSON.stringify(remote)).toBe(before);
      expect(api.saveModuleState).not.toHaveBeenCalled();
    },
  );

  test("unidentified local legacy event is preserved; no retroactive ID", async () => {
    const storage = new StorageManager();
    const legacy = [{ amount: 10 }];
    localStorage.setItem(
      storage.getUserScopedKey("gamification_xp_events"),
      JSON.stringify(legacy),
    );
    const api = {
      getModuleState: jest.fn().mockResolvedValue({
        success: true,
        data: { version: 1, state_json: { events: [event("remote")] } },
      }),
      saveModuleState: jest.fn(),
    };
    expect(
      await createDataRepository(storage, api).syncAccountModuleState(
        "gamification",
      ),
    ).toMatchObject({ syncPending: true });
    expect(storage.getXpState().events).toEqual(legacy);
    expect(api.saveModuleState).not.toHaveBeenCalled();
    expect(
      storage.awardXpEvent({
        eventType: "interactive_lab_completed",
        sourceId: "new-local",
      }).added,
    ).toBe(true);
    expect(storage.getXpState().events[0]).toEqual(legacy[0]);
    expect(storage.getXpState().events).toHaveLength(2);
  });

  test("quiz and Pomodoro stay local even if injected clients expose speculative hooks", async () => {
    const storage = {
      saveQuizResult: jest.fn().mockReturnValue({ saved: "quiz" }),
      saveFocusSession: jest.fn().mockReturnValue({ saved: "focus" }),
    };
    const api = {
      syncQuizResult: jest.fn(),
      syncFocusSession: jest.fn(),
      saveModuleState: jest.fn(),
    };
    const repo = createDataRepository(storage, api);
    expect(await repo.saveQuizResult({ score: 50 })).toEqual({ saved: "quiz" });
    expect(await repo.saveFocusSession(25)).toEqual({ saved: "focus" });
    for (const fn of Object.values(api)) expect(fn).not.toHaveBeenCalled();
    for (const name of [
      "syncQuizResult",
      "syncGamification",
      "syncFocusSession",
    ])
      expect(apiService[name]).toBeUndefined();
  });

  test("global sync never aliases certification-specific journey state", async () => {
    const storage = new StorageManager();
    storage.saveGamification({ completedStages: ["clf-stage"] }, "clf-c02");
    storage.saveGamification({ completedStages: ["saa-stage"] }, "saa-c03");
    const key = storage.getUserScopedKey("gamification_clf-c02");
    const previous = localStorage.getItem(key);
    storage.setAccountModuleState("gamification", null, {
      events: [event("global")],
    });
    expect(localStorage.getItem(key)).toBe(previous);
    expect(
      storage.getAccountModuleState("journey", "saa-c03").completedStages,
    ).toEqual(["saa-stage"]);
    expect(() =>
      storage.setAccountModuleState("gamification", "clf-c02", { events: [] }),
    ).toThrow(/global/);
    await expect(
      apiService.getModuleState("gamification", "clf-c02"),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      apiService.saveModuleState("gamification", "clf-c02", {}, 0),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
