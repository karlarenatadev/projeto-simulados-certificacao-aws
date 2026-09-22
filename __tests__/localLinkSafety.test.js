import {
  beforeEach,
  afterEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { LOCAL_LINK_SCOPES } from "../src/frontend/js/core/contracts/localLinkMigration.js";

let raw;
beforeEach(() => {
  localStorage.clear();
  SessionManager.persist({
    user: { id: "safety" },
    provider: "google",
    authenticationMode: "online",
    accessToken: "fixture",
    tokenExpiresIn: 3600,
  });
  raw = new StorageManager();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

function stateFor(module, certId, id) {
  if (module === "diagnostic")
    return { history: [{ attemptId: id, certId, mode: "diagnostic" }] };
  if (module === "mistakes")
    return { mistakes: [{ questionId: id, certId, wrongCount: 1 }] };
  if (module === "flashcards")
    return { deck: [{ questionId: id, certId, reviewCount: 1 }] };
  return { completedStages: [id] };
}

describe("D4.2.2 versioned user module writes", () => {
  test("a missing remote reader cannot authorize a write", async () => {
    raw.setAccountModuleState("journey", "clf-c02", {
      completedStages: ["local"],
    });
    const api = { saveModuleState: jest.fn() };
    await expect(
      createDataRepository(raw, api).syncAccountModuleState(
        "journey",
        "clf-c02",
      ),
    ).resolves.toMatchObject({ syncPending: true });
    expect(api.saveModuleState).not.toHaveBeenCalled();
  });

  test.each(LOCAL_LINK_SCOPES)(
    "$module/$certId never writes after failed GET; creates with zero and retries conflicts with fresh versions",
    async ({ module, certId }) => {
      raw.setAccountModuleState(module, certId, stateFor(module, certId, "1"));
      const api = {
        getModuleState: jest
          .fn()
          .mockRejectedValueOnce(new Error("network error")),
        saveModuleState: jest.fn(),
      };
      const repository = createDataRepository(raw, api);
      await expect(
        repository.syncAccountModuleState(module, certId),
      ).resolves.toMatchObject({ syncPending: true });
      expect(api.saveModuleState).not.toHaveBeenCalled();
      api.getModuleState.mockResolvedValueOnce({ success: true, data: null });
      api.saveModuleState.mockResolvedValueOnce({
        success: true,
        data: { version: 1 },
      });
      await repository.syncAccountModuleState(module, certId);
      expect(api.saveModuleState.mock.calls[0][3]).toBe(0);

      api.getModuleState
        .mockResolvedValueOnce({
          success: true,
          data: { version: 2, state_json: stateFor(module, certId, "2") },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { version: 3, state_json: stateFor(module, certId, "3") },
        });
      api.saveModuleState
        .mockRejectedValueOnce({ statusCode: 409 })
        .mockResolvedValueOnce({ success: true, data: { version: 4 } });
      await repository.syncAccountModuleState(module, certId);
      expect(api.saveModuleState.mock.calls.map((call) => call[3])).toEqual([
        0, 2, 3,
      ]);
      const field =
        { diagnostic: "history", mistakes: "mistakes", flashcards: "deck" }[
          module
        ] || "completedStages";
      expect(api.saveModuleState.mock.calls.at(-1)[2][field]).toHaveLength(3);
      expect(raw.getAccountModuleState(module, certId)[field]).toHaveLength(3);
    },
  );

  const readFailures = [
    ["network", { error: new TypeError("Failed to fetch") }],
    ["timeout", { error: { statusCode: 0, message: "Request timeout" } }],
    ...[401, 403, 404, 409, 500, 503].map((statusCode) => [
      String(statusCode),
      { error: { statusCode } },
    ]),
    ["undefined response", { response: undefined }],
    ["unsuccessful null", { response: { success: false, data: null } }],
    [
      "HTTP error envelope",
      { response: { success: true, status: 500, data: null } },
    ],
    ["missing data", { response: { success: true } }],
    [
      "missing version",
      {
        response: {
          success: true,
          data: { state_json: { completedStages: ["remote"] } },
        },
      },
    ],
    [
      "invalid version",
      { response: { success: true, data: { version: 0, state_json: {} } } },
    ],
    [
      "invalid state",
      { response: { success: true, data: { version: 3, state_json: [] } } },
    ],
  ];
  describe.each(["sync", "hydrate"])("%s", (operation) => {
    test.each(readFailures)(
      "%s is not remote absence and cannot authorize PUT",
      async (_label, failure) => {
        raw.setAccountModuleState("journey", "clf-c02", {
          completedStages: ["local"],
        });
        const before = localStorage.getItem(
          raw.getUserScopedKey("gamification_clf-c02"),
        );
        const api = {
          getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
          getModuleState: failure.error
            ? jest.fn().mockRejectedValue(failure.error)
            : jest.fn().mockResolvedValue(failure.response),
          saveModuleState: jest.fn(),
        };
        const repository = createDataRepository(raw, api);
        const result =
          operation === "hydrate"
            ? await repository.hydrateAccountState()
            : await repository.syncAccountModuleState("journey", "clf-c02");
        if (operation === "sync") {
          expect(result.syncPending).toBe(true);
          if ([401, 403].includes(failure.error?.statusCode))
            expect(result.authRequired).toBe(true);
        }
        expect(api.saveModuleState).not.toHaveBeenCalled();
        expect(
          localStorage.getItem(raw.getUserScopedKey("gamification_clf-c02")),
        ).toBe(before);
        expect(
          raw.getAccountModuleState("journey", "clf-c02").completedStages,
        ).toEqual(["local"]);
      },
    );
  });

  test("hydration creation conflict re-reads, merges recent local study and writes the actual remote version", async () => {
    raw.setAccountModuleState("journey", "clf-c02", { completedStages: ["A"] });
    let reads = 0;
    const api = {
      getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
      getModuleState: jest.fn(async (module, cert) => {
        if (module !== "journey" || cert !== "clf-c02")
          throw new Error("unavailable");
        reads++;
        if (reads === 1) return { success: true, data: null };
        raw.setAccountModuleState("journey", "clf-c02", {
          completedStages: ["A", "B"],
        });
        return {
          success: true,
          data: { version: 6, state_json: { completedStages: ["R"] } },
        };
      }),
      saveModuleState: jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 409 })
        .mockResolvedValueOnce({ success: true, data: { version: 7 } }),
    };
    await createDataRepository(raw, api).hydrateAccountState();
    expect(api.saveModuleState.mock.calls.map((call) => call[3])).toEqual([
      0, 6,
    ]);
    expect(
      raw.getAccountModuleState("journey", "clf-c02").completedStages.sort(),
    ).toEqual(["A", "B", "R"]);
  });

  test("three version conflicts exhaust the existing retry limit without an unconditional write", async () => {
    raw.setAccountModuleState("journey", "clf-c02", {
      completedStages: ["local"],
    });
    let version = 3;
    const api = {
      getModuleState: jest.fn(async () => ({
        success: true,
        data: {
          version: version++,
          state_json: { completedStages: ["remote"] },
        },
      })),
      saveModuleState: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const result = await createDataRepository(raw, api).syncAccountModuleState(
      "journey",
      "clf-c02",
    );
    expect(result.syncPending).toBe(true);
    expect(api.getModuleState).toHaveBeenCalledTimes(3);
    expect(api.saveModuleState.mock.calls.map((call) => call[3])).toEqual([
      3, 4, 5,
    ]);
    expect(
      raw.getAccountModuleState("journey", "clf-c02").completedStages,
    ).toEqual(["remote", "local"]);
  });
});
