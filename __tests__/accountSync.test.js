import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";

const CERTIFICATIONS = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"];

function authenticateSyncFixture(
  expiresAt = new Date(Date.now() + 3600000).toISOString(),
) {
  SessionManager.persist({
    user: { id: "sync-fixture-user" },
    authenticationMode: "online",
    accessToken: "fixture-token-not-a-real-credential",
    expiresAt,
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function createStorage(localStates = {}) {
  const applied = [];
  return {
    applied,
    getAccountModuleState: jest.fn(
      (module, certification) =>
        localStates[`${module}:${certification}`] || null,
    ),
    setAccountModuleState: jest.fn((module, certification, state) => {
      applied.push({ module, certification, state });
      return true;
    }),
    saveSprintState: jest.fn(() => true),
  };
}

describe("account state synchronization policy", () => {
  beforeEach(() => authenticateSyncFixture());
  test("does not push an older local snapshot over newer remote state", async () => {
    const localState = { currentDay: 3 };
    const storage = createStorage({ "sprint:clf-c02": localState });
    const api = {
      getModuleState: jest.fn(async () => ({
        success: true,
        data: { version: 5, state_json: { currentDay: 6 } },
      })),
      saveModuleState: jest.fn(),
    };
    await createDataRepository(storage, api).syncAccountModuleState(
      "sprint",
      "clf-c02",
    );
    expect(api.saveModuleState).not.toHaveBeenCalledWith(
      "sprint",
      "clf-c02",
      localState,
    );
    expect(storage.applied.at(-1).state.currentDay).toBe(6);
  });

  test("server state wins over an older local cache", async () => {
    const storage = createStorage({ "sprint:clf-c02": { currentDay: 2 } });
    const api = {
      getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
      getModuleState: jest.fn(async (module, certification) =>
        module === "sprint" && certification === "clf-c02"
          ? { success: true, data: { state_json: { currentDay: 4 } } }
          : { success: true, data: null },
      ),
      saveModuleState: jest.fn(),
    };

    await createDataRepository(storage, api).hydrateAccountState();

    expect(storage.setAccountModuleState).toHaveBeenCalledWith(
      "sprint",
      "clf-c02",
      expect.objectContaining({
        completedStages: ["1", "2", "3"],
        currentDay: 4,
      }),
    );
    expect(api.saveModuleState).not.toHaveBeenCalledWith("sprint", "clf-c02", {
      currentDay: 2,
    });
  });

  test("migrates valid local state when the account has no server state", async () => {
    const localState = { completedStages: ["1"], currentDay: 1 };
    const storage = createStorage({ "sprint:saa-c03": localState });
    const api = {
      getMyProfile: jest.fn(async () => ({ success: true, data: {} })),
      getModuleState: jest.fn(async () => ({ success: true, data: null })),
      saveModuleState: jest.fn(async () => ({ success: true })),
    };

    await createDataRepository(storage, api).hydrateAccountState();

    expect(api.saveModuleState).toHaveBeenCalledWith(
      "sprint",
      "saa-c03",
      localState,
    );
    expect(
      api.saveModuleState.mock.calls.filter((call) => call[0] === "sprint"),
    ).toHaveLength(1);
    expect(CERTIFICATIONS).toContain("saa-c03");
  });

  test("re-reads and retries after an optimistic version conflict", async () => {
    const storage = createStorage({
      "journey:clf-c02": { completedStages: ["2"] },
    });
    const api = {
      getModuleState: jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { version: 5, state_json: { completedStages: ["1"] } },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { version: 6, state_json: { completedStages: ["1", "3"] } },
        }),
      saveModuleState: jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 409, message: "conflict" })
        .mockResolvedValueOnce({ success: true, data: { version: 7 } }),
    };

    await createDataRepository(storage, api).syncAccountModuleState(
      "journey",
      "clf-c02",
    );

    expect(api.getModuleState).toHaveBeenCalledTimes(2);
    expect(api.saveModuleState).toHaveBeenCalledTimes(2);
    expect(api.saveModuleState.mock.calls[0][3]).toBe(5);
    expect(api.saveModuleState.mock.calls[1][3]).toBe(6);
    expect(storage.applied.at(-1).state.completedStages).toEqual([
      "1",
      "3",
      "2",
    ]);
  });

  test("keeps local state pending when conflict retry cannot read remote", async () => {
    const localState = { completedStages: ["2"] };
    const storage = createStorage({ "journey:clf-c02": localState });
    const api = {
      getModuleState: jest
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { version: 5, state_json: { completedStages: ["1"] } },
        })
        .mockRejectedValueOnce(new Error("network down")),
      saveModuleState: jest.fn().mockRejectedValue({ statusCode: 409 }),
    };

    const result = await createDataRepository(
      storage,
      api,
    ).syncAccountModuleState("journey", "clf-c02");

    expect(result.syncPending).toBe(true);
    expect(result.authRequired).not.toBe(true);
    expect(api.getModuleState).toHaveBeenCalledTimes(2);
    expect(api.saveModuleState).toHaveBeenCalledTimes(1);
    expect(storage.applied.at(-1).state.completedStages).toEqual(["1", "2"]);
  });
});

describe("account sync authentication gate and local contract", () => {
  test("confirmed sync never treats a failed initial GET as an empty remote", async () => {
    authenticateSyncFixture();
    const api = {
      getModuleState: jest.fn().mockRejectedValue(new Error("offline")),
      saveModuleState: jest.fn(),
    };
    const repository = createDataRepository(
      createStorage({ "journey:clf-c02": { completedStages: ["local"] } }),
      api,
    );
    expect(
      await repository.syncAccountModuleState("journey", "clf-c02", {
        confirmRemote: true,
      }),
    ).toEqual({ syncPending: true });
    expect(api.saveModuleState).not.toHaveBeenCalled();
  });

  test("confirmed first write retries version zero conflict using the newly read version", async () => {
    authenticateSyncFixture();
    const api = {
      getModuleState: jest
        .fn()
        .mockResolvedValueOnce({ success: true, data: null })
        .mockResolvedValueOnce({
          success: true,
          data: { version: 1, state_json: { completedStages: ["other"] } },
        }),
      saveModuleState: jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 409 })
        .mockResolvedValueOnce({ success: true, data: { version: 2 } }),
    };
    const repository = createDataRepository(
      createStorage({ "journey:clf-c02": { completedStages: ["local"] } }),
      api,
    );
    expect(
      await repository.syncAccountModuleState("journey", "clf-c02", {
        confirmRemote: true,
      }),
    ).toEqual({ remoteConfirmed: true, version: 2 });
    expect(api.saveModuleState.mock.calls.map((c) => c[3])).toEqual([0, 1]);
    expect(api.saveModuleState.mock.calls[1][2].completedStages).toEqual([
      "other",
      "local",
    ]);
  });

  test("missing remote acknowledgement leaves confirmed sync pending", async () => {
    authenticateSyncFixture();
    const api = {
      getModuleState: jest
        .fn()
        .mockResolvedValue({ success: true, data: null }),
      saveModuleState: jest.fn().mockResolvedValue({ success: true }),
    };
    const repository = createDataRepository(
      createStorage({ "journey:clf-c02": { completedStages: ["local"] } }),
      api,
    );
    expect(
      await repository.syncAccountModuleState("journey", "clf-c02", {
        confirmRemote: true,
      }),
    ).toEqual({ syncPending: true });
  });

  test("a user switch during GET prevents local apply and remote write of the previous user", async () => {
    authenticateSyncFixture();
    const storage = createStorage({
      "journey:clf-c02": { completedStages: ["local"] },
    });
    const api = {
      getModuleState: jest.fn(async () => {
        SessionManager.persist({
          user: { id: "other-user" },
          authenticationMode: "online",
          accessToken: "other-token",
          tokenExpiresIn: 3600,
        });
        return {
          success: true,
          data: { version: 1, state_json: { completedStages: ["remote"] } },
        };
      }),
      saveModuleState: jest.fn(),
    };
    const repository = createDataRepository(storage, api);
    expect(
      await repository.syncAccountModuleState("journey", "clf-c02", {
        confirmRemote: true,
        expectedUserId: "sync-fixture-user",
      }),
    ).toMatchObject({ syncPending: true, authRequired: true });
    expect(storage.setAccountModuleState).not.toHaveBeenCalled();
    expect(api.saveModuleState).not.toHaveBeenCalled();
  });

  test("local mistakes writes use the normalized certification without altering error state", () => {
    const api = { getModuleState: jest.fn(), saveModuleState: jest.fn() };
    const repository = createDataRepository(new StorageManager(), api);
    const mistake = {
      questionId: "local-q1",
      certId: "aif-c01",
      wrongCount: 3,
      resolved: true,
    };
    expect(
      repository.setLocalModuleState("mistakes", "AIF-C01", {
        mistakes: [mistake],
      }),
    ).toBe(true);
    expect(
      repository.getLocalModuleState("mistakes", "aif-c01").mistakes,
    ).toEqual([expect.objectContaining(mistake)]);
    expect(api.getModuleState).not.toHaveBeenCalled();
    expect(api.saveModuleState).not.toHaveBeenCalled();
  });
  test.each(["absent", "expired"])(
    "blocks remote sync and hydrate with %s session",
    async (state) => {
      if (state === "expired")
        authenticateSyncFixture(new Date(Date.now() - 1000).toISOString());
      const storage = createStorage({
        "journey:clf-c02": { completedStages: ["1"] },
      });
      const api = {
        getMyProfile: jest.fn(),
        getModuleState: jest.fn(),
        saveModuleState: jest.fn(),
      };
      const repository = createDataRepository(storage, api);
      await expect(
        repository.syncAccountModuleState("journey", "clf-c02"),
      ).resolves.toEqual({ syncPending: true, authRequired: true });
      await expect(repository.hydrateAccountState()).resolves.toEqual({
        syncPending: true,
        authRequired: true,
      });
      for (const method of Object.values(api))
        expect(method).not.toHaveBeenCalled();
      expect(storage.setAccountModuleState).not.toHaveBeenCalled();
    },
  );

  test("local module reads and writes do not require a session or call the API", () => {
    const state = { completedStages: ["1"] };
    const storage = createStorage({ "journey:clf-c02": state });
    const api = {
      getMyProfile: jest.fn(),
      getModuleState: jest.fn(),
      saveModuleState: jest.fn(),
    };
    const repository = createDataRepository(storage, api);
    expect(repository.getLocalModuleState("journey", "clf-c02")).toEqual(state);
    expect(repository.setLocalModuleState("journey", "clf-c02", state)).toBe(
      true,
    );
    expect(storage.setAccountModuleState).toHaveBeenCalledWith(
      "journey",
      "clf-c02",
      state,
    );
    for (const method of Object.values(api))
      expect(method).not.toHaveBeenCalled();
  });
});
