import { jest } from "@jest/globals";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { createOfflineLinkingService } from "../src/frontend/js/services/offlineLinkingService.js";
import { createGoogleLoginOrchestrator } from "../src/frontend/js/services/googleLoginOrchestrator.js";
import { LOCAL_LINK_SCOPES } from "../src/frontend/js/core/contracts/localLinkMigration.js";

let raw, storage, api, linking, flow, owner, status, remote, sequence, failSync;
const userId = () => SessionManager.restore()?.user?.id;
const online = (id, expired = false) =>
  SessionManager.persist({
    user: { id },
    provider: "google",
    authenticationMode: "online",
    accessToken: `hmac-${id}`,
    expiresAt: new Date(Date.now() + (expired ? -1 : 3600000)).toISOString(),
  });
function local(withData = true) {
  SessionManager.persist({
    user: { id: "local_source" },
    provider: "local",
    authenticationMode: "offline",
  });
  if (withData)
    raw.setAccountModuleState("mistakes", "clf-c02", {
      mistakes: [
        { questionId: "q1", certId: "clf-c02", wrongCount: 3, resolved: false },
      ],
    });
}
const conflict = () =>
  Object.assign(new Error("local_identity_already_linked"), {
    statusCode: 409,
  });
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  owner = null;
  status = "unclaimed";
  remote = new Map();
  sequence = [];
  failSync = false;
  raw = new StorageManager();
  api = {
    loginWithGoogle: jest.fn(async (credential) => {
      sequence.push(["login", userId()]);
      return {
        success: true,
        data: {
          id: credential,
          role: "STUDENT",
          access_token: `hmac-${credential}`,
          expires_in: 3600,
        },
      };
    }),
    getLocalIdentityLink: jest.fn(async () => {
      if (owner && owner !== userId()) throw conflict();
      return {
        success: true,
        data: { status, ownedByCurrentUser: !!owner, migrationVersion: 1 },
      };
    }),
    claimLocalIdentity: jest.fn(async () => {
      sequence.push(["claim", userId()]);
      if (owner && owner !== userId()) throw conflict();
      owner = userId();
      status = status === "completed" ? status : "pending";
      return {
        success: true,
        data: { status, ownedByCurrentUser: true, migrationVersion: 1 },
      };
    }),
    completeLocalIdentityLink: jest.fn(async (_id, receipts) => {
      expect(receipts).toHaveLength(20);
      status = "completed";
      return {
        success: true,
        data: { status, ownedByCurrentUser: true, migrationVersion: 1 },
      };
    }),
    getModuleState: jest.fn(async (module, cert) => ({
      success: true,
      data: remote.get(`${userId()}:${module}:${cert}`) || null,
    })),
    saveModuleState: jest.fn(async (module, cert, state, version) => {
      if (failSync) throw new Error("network offline");
      const current = remote.get(`${userId()}:${module}:${cert}`);
      if (version !== (current?.version || 0))
        throw Object.assign(new Error("version conflict"), { statusCode: 409 });
      const value = { state_json: state, version: version + 1 };
      remote.set(`${userId()}:${module}:${cert}`, value);
      return { success: true, data: value };
    }),
  };
  storage = createDataRepository(raw, api);
  linking = createOfflineLinkingService(storage, api);
  flow = createGoogleLoginOrchestrator(storage, api, linking);
});

function scopeState(module, certId, ids) {
  if (module === "diagnostic")
    return {
      history: ids.map((id) => ({
        certId,
        mode: "diagnostic",
        date: `2026-09-${20 + Number(id)}T10:00:00Z`,
        score: Number(id),
        total: 10,
      })),
    }; // Deliberately legacy/no ID: D4.2.1 must survive recapture/resume.
  if (module === "mistakes")
    return {
      mistakes: ids.map((questionId) => ({
        questionId,
        cert: certId.toUpperCase(),
        wrongCount: 2,
      })),
    };
  if (module === "flashcards")
    return {
      deck: ids.map((questionId) => ({ questionId, certId, reviewCount: 2 })),
    };
  return { completedStages: ids };
}

describe("D4.2.2 additive local snapshots", () => {
  test.each([1, 2])(
    "successful login after %i failures imports every intervening study session",
    async (failures) => {
      local(false);
      for (let attempt = 1; attempt <= failures; attempt++) {
        raw.setAccountModuleState("journey", "aif-c01", {
          completedStages: [String(attempt)],
        });
        api.loginWithGoogle.mockRejectedValueOnce({ statusCode: 0 });
        await expect(flow.login("A")).rejects.toMatchObject({ statusCode: 0 });
      }
      raw.setAccountModuleState("journey", "aif-c01", {
        completedStages: [String(failures + 1)],
      });
      await flow.login("A");
      expect(
        remote.get("A:journey:aif-c01").state_json.completedStages.sort(),
      ).toEqual(
        Array.from({ length: failures + 1 }, (_, index) => String(index + 1)),
      );
      expect(api.claimLocalIdentity).toHaveBeenCalledTimes(1);
    },
  );

  test.each(LOCAL_LINK_SCOPES)(
    "$module/$certId retains A + B + C through repeated failed logins",
    async ({ module, certId }) => {
      local(false);
      raw.setAccountModuleState(
        module,
        certId,
        scopeState(module, certId, ["1"]),
      );
      api.loginWithGoogle.mockRejectedValueOnce({ statusCode: 0 });
      await expect(flow.login("A")).rejects.toMatchObject({ statusCode: 0 });
      const base = storage.getLocalLinkSnapshot("local_source").modules;
      for (const id of ["2", "3"]) {
        // Keep only the new item in the live source to also prove that recapture
        // cannot erase items already protected by the original snapshot.
        raw.setAccountModuleState(
          module,
          certId,
          scopeState(module, certId, [id]),
        );
        api.loginWithGoogle.mockRejectedValueOnce({ statusCode: 503 });
        await expect(flow.login("A")).rejects.toMatchObject({
          statusCode: 503,
        });
        const captured = storage.getLocalLinkSnapshot("local_source");
        expect(captured.modules).toEqual(base);
        const candidate = captured.pendingModules.find(
          (s) => s.module === module && s.certId === certId,
        ).state;
        const field =
          { diagnostic: "history", mistakes: "mistakes", flashcards: "deck" }[
            module
          ] || "completedStages";
        expect(candidate[field]).toHaveLength(Number(id));
        expect(api.claimLocalIdentity).not.toHaveBeenCalled();
      }
      await flow.login("A");
      expect(flow.getState().migration).toBe("completed");
      const final = remote.get(`A:${module}:${certId}`).state_json;
      const field =
        { diagnostic: "history", mistakes: "mistakes", flashcards: "deck" }[
          module
        ] || "completedStages";
      expect(final[field]).toHaveLength(3);
      expect(storage.getLocalLinkSnapshot("local_source").modules).toEqual(
        base,
      );
    },
  );

  test("partial remote writes resume with fresh captures, confirmed versions and recent account study", async () => {
    local();
    const save = api.saveModuleState.getMockImplementation();
    let loseReply = true;
    api.saveModuleState.mockImplementation(async (...args) => {
      const result = await save(...args);
      if (loseReply && args[0] === "flashcards") {
        loseReply = false;
        throw new Error("reply lost after commit");
      }
      return result;
    });
    await flow.login("A");
    expect(flow.getState().migration).toBe("pending");
    expect(remote.size).toBe(9);
    const base = storage.getLocalLinkSnapshot("local_source").modules;
    const diagnosticVersion = remote.get("A:diagnostic:clf-c02").version;
    const deckVersion = remote.get("A:flashcards:clf-c02").version;
    raw.setAccountModuleState("journey", "aif-c01", {
      completedStages: ["account-new"],
    });
    local(false);
    raw.setAccountModuleState(
      "mistakes",
      "clf-c02",
      scopeState("mistakes", "clf-c02", ["2"]),
    );
    const remoteMistakes = remote.get("A:mistakes:clf-c02");
    remoteMistakes.version = 7;
    remoteMistakes.state_json.mistakes.push({
      questionId: "other-device",
      certId: "clf-c02",
      wrongCount: 4,
    });
    api.saveModuleState.mockClear();
    flow = createGoogleLoginOrchestrator(
      storage,
      api,
      createOfflineLinkingService(storage, api),
    );
    await flow.login("A");
    expect(flow.getState().migration).toBe("completed");
    expect(remote.size).toBe(20);
    expect(remote.get("A:diagnostic:clf-c02").version).toBe(diagnosticVersion);
    expect(remote.get("A:flashcards:clf-c02").version).toBe(deckVersion);
    expect(
      remote
        .get("A:mistakes:clf-c02")
        .state_json.mistakes.map((m) => m.questionId)
        .sort(),
    ).toEqual(["2", "other-device", "q1"]);
    expect(api.saveModuleState).toHaveBeenCalledWith(
      "mistakes",
      "clf-c02",
      expect.any(Object),
      7,
    );
    expect(
      remote.get("A:journey:aif-c01").state_json.completedStages,
    ).toContain("account-new");
    const receipts = api.completeLocalIdentityLink.mock.calls[0][1];
    expect(new Set(receipts.map((r) => `${r.module}:${r.certId}`)).size).toBe(
      20,
    );
    expect(storage.getLocalLinkSnapshot("local_source").modules).toEqual(base);
    const writes = api.saveModuleState.mock.calls.length;
    await flow.resume();
    expect(api.saveModuleState).toHaveBeenCalledTimes(writes);
  });

  test("includes progress produced during authentication before switching namespaces", async () => {
    local();
    const login = api.loginWithGoogle.getMockImplementation();
    api.loginWithGoogle.mockImplementationOnce(async (...args) => {
      raw.setAccountModuleState("journey", "aif-c01", {
        completedStages: ["during-login"],
      });
      return login(...args);
    });
    await flow.login("A");
    expect(
      remote.get("A:journey:aif-c01").state_json.completedStages,
    ).toContain("during-login");
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

test("no source and empty source login without local-link requests", async () => {
  await flow.login("A");
  expect(api.getLocalIdentityLink).not.toHaveBeenCalled();
  local(false);
  await flow.login("B");
  expect(api.claimLocalIdentity).not.toHaveBeenCalled();
  expect(storage.getLocalLinkSnapshot("local_source")).toBeNull();
});
test("capture precedes Google POST; auth precedes claim; source retained and 20 scopes confirmed", async () => {
  local();
  const key = raw.getUserScopedKey("mistakes"),
    before = localStorage.getItem(key);
  api.loginWithGoogle.mockImplementationOnce(async () => {
    expect(storage.getLocalLinkSnapshot("local_source")).not.toBeNull();
    expect(userId()).toBe("local_source");
    return {
      success: true,
      data: { id: "A", access_token: "hmac-A", expires_in: 3600 },
    };
  });
  await flow.login("A");
  expect(sequence).toEqual([["claim", "A"]]);
  expect(flow.getState().migration).toBe("completed");
  expect(raw.getAllMistakes("clf-c02")[0].wrongCount).toBe(3);
  expect(localStorage.getItem(key)).toBe(before);
  expect(flow.hasPending()).toBe(false);
  expect(api.saveModuleState).toHaveBeenCalledTimes(20);
});
test.each([401, 403, 0])(
  "failed login %s leaves local identity and snapshot without claim",
  async (statusCode) => {
    local();
    api.loginWithGoogle.mockRejectedValueOnce({ statusCode });
    await expect(flow.login("A")).rejects.toMatchObject({ statusCode });
    expect(userId()).toBe("local_source");
    expect(raw.getAllMistakes("clf-c02")).toHaveLength(1);
    expect(storage.getLocalLinkSnapshot("local_source")).not.toBeNull();
    expect(api.claimLocalIdentity).not.toHaveBeenCalled();
  },
);
test("partial failure leaves auth and durable pointer; refresh/new instance resumes once", async () => {
  local();
  failSync = true;
  await flow.login("A");
  expect(userId()).toBe("A");
  expect(status).toBe("pending");
  expect(flow.getState().migration).toBe("pending");
  expect(flow.hasPending()).toBe(true);
  failSync = false;
  flow = createGoogleLoginOrchestrator(
    storage,
    api,
    createOfflineLinkingService(storage, api),
  );
  await flow.resume();
  expect(status).toBe("completed");
  expect(flow.hasPending()).toBe(false);
  expect(raw.getAllMistakes("clf-c02")).toHaveLength(1);
  const calls = api.saveModuleState.mock.calls.length;
  await flow.resume();
  expect(api.saveModuleState).toHaveBeenCalledTimes(calls);
});
test.each(["pending", "completed"])(
  "source %s owned by A cannot import into B; B login remains valid",
  async (linkStatus) => {
    local();
    owner = "A";
    status = linkStatus;
    await flow.login("B");
    expect(userId()).toBe("B");
    expect(SessionManager.restore().authenticationMode).toBe("online");
    expect(flow.getState().migration).toBe("conflict");
    expect(api.getModuleState).not.toHaveBeenCalled();
    expect(api.saveModuleState).not.toHaveBeenCalled();
    expect(raw.getAllMistakes()).toEqual([]);
    expect(flow.hasPending()).toBe(false);
  },
);
test("completed same owner does not rerun migration", async () => {
  local();
  owner = "A";
  status = "completed";
  await flow.login("A");
  expect(api.saveModuleState).not.toHaveBeenCalled();
  expect(flow.getState().migration).toBe("completed");
});
test("expired A studies locally and reauth A syncs own state without first-link", async () => {
  online("A", true);
  SessionManager.restore();
  raw.setAccountModuleState("mistakes", "clf-c02", {
    mistakes: [{ questionId: "q-A", certId: "clf-c02", wrongCount: 1 }],
  });
  await flow.login("A");
  expect(api.claimLocalIdentity).not.toHaveBeenCalled();
  expect(
    remote.get("A:mistakes:clf-c02").state_json.mistakes[0].questionId,
  ).toBe("q-A");
});
test("expired A -> B never transfers A", async () => {
  online("A", true);
  SessionManager.restore();
  raw.setAccountModuleState("mistakes", "clf-c02", {
    mistakes: [{ questionId: "q-A", certId: "clf-c02" }],
  });
  const key = raw.getUserScopedKey("mistakes"),
    before = localStorage.getItem(key);
  await flow.login("B");
  expect(raw.getAllMistakes()).toEqual([]);
  expect(localStorage.getItem(key)).toBe(before);
  expect(api.saveModuleState).not.toHaveBeenCalled();
  expect(api.claimLocalIdentity).not.toHaveBeenCalled();
  expect(flow.getState().accountChanged).toBe(true);
});
test("duplicate Google callbacks share one auth request and migration", async () => {
  local();
  await Promise.all([flow.login("A"), flow.login("A")]);
  expect(api.loginWithGoogle).toHaveBeenCalledTimes(1);
  expect(api.claimLocalIdentity).toHaveBeenCalledTimes(1);
  expect(api.completeLocalIdentityLink).toHaveBeenCalledTimes(1);
});

test("in-flight D1 read for A cannot apply or write its response after switching to B", async () => {
  online("A");
  raw.setAccountModuleState("mistakes", "clf-c02", {
    mistakes: [{ questionId: "q-A", certId: "clf-c02" }],
  });
  let releaseRead;
  api.getModuleState.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        releaseRead = resolve;
      }),
  );
  const pending = storage.syncAccountModuleState("mistakes", "clf-c02");
  await Promise.resolve();
  expect(api.getModuleState).toHaveBeenCalledTimes(1);
  online("B");
  releaseRead({
    success: true,
    data: {
      version: 5,
      state_json: { mistakes: [{ questionId: "remote-A", certId: "clf-c02" }] },
    },
  });
  await expect(pending).resolves.toMatchObject({
    authRequired: true,
    syncPending: true,
  });
  expect(raw.getAllMistakes()).toEqual([]);
  expect(api.saveModuleState).not.toHaveBeenCalled();
});
test("pending pointer cannot authorize import when server reports another owner", async () => {
  online("B");
  owner = "A";
  status = "pending";
  storage.setUserData(
    "pending_local_link_v1",
    JSON.stringify({ localIdentityId: "local_source", migrationVersion: 1 }),
  );
  await flow.resume();
  expect(flow.getState().migration).toBe("conflict");
  expect(api.claimLocalIdentity).not.toHaveBeenCalled();
  expect(api.saveModuleState).not.toHaveBeenCalled();
});
