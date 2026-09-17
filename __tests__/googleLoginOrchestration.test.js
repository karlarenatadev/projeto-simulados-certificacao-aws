import { jest } from "@jest/globals";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { StorageManager } from "../src/frontend/js/storageManager.js";
import { createDataRepository } from "../src/frontend/js/dataRepository.js";
import { createOfflineLinkingService } from "../src/frontend/js/services/offlineLinkingService.js";
import { createGoogleLoginOrchestrator } from "../src/frontend/js/services/googleLoginOrchestrator.js";

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
      const value = { state_json: state, version: version + 1 };
      remote.set(`${userId()}:${module}:${cert}`, value);
      return { success: true, data: value };
    }),
  };
  storage = createDataRepository(raw, api);
  linking = createOfflineLinkingService(storage, api);
  flow = createGoogleLoginOrchestrator(storage, api, linking);
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
