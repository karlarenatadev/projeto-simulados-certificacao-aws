import { describe, expect, jest, test } from "@jest/globals";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";

const CERTIFICATIONS = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"];

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
      { currentDay: 4 },
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
    expect(api.saveModuleState).toHaveBeenCalledTimes(1);
    expect(storage.applied.at(-1).state.completedStages).toEqual(["1", "2"]);
  });
});
