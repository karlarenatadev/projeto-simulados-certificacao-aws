import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { userManager } from "../src/frontend/js/userManager.js";
import apiService from "../src/frontend/js/services/api.js";
import { storageManager } from "../src/frontend/js/storageManager.js";

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

describe("eligible offline progress linking", () => {
  test("merges supported diagnostic history into the authenticated UUID without deleting source", async () => {
    SessionManager.persist({
      user: { id: "remote-user" },
      authenticationMode: "offline",
    });
    storageManager.setLocalModuleState("diagnostic", "clf-c02", {
      history: [
        {
          certId: "clf-c02",
          attemptId: "remote-diagnostic",
          mode: "diagnostic",
        },
      ],
    });
    userManager.createOfflineUser("offline@a3data.com.br");
    const localId = SessionManager.restore().user.id;
    const localHistoryKey = storageManager.getUserScopedKey("history");
    storageManager.saveQuizResult({
      certId: "clf-c02",
      attemptId: "offline-attempt",
      mode: "diagnostic",
      score: 8,
      total: 10,
      percentage: 80,
    });
    const sourceBefore = localStorage.getItem(localHistoryKey);
    jest.spyOn(apiService, "loginWithGoogle").mockImplementation(async () => {
      expect(SessionManager.restore().user.id).toBe(localId);
      return {
        success: true,
        data: {
          id: "remote-user",
          email: "offline@a3data.com.br",
          role: "STUDENT",
          access_token: "hmac-token",
          expires_in: 3600,
        },
      };
    });
    jest.spyOn(storageManager, "hydrateAccountState").mockResolvedValue(null);
    jest.spyOn(apiService, "claimLocalIdentity").mockResolvedValue({
      success: true,
      data: {
        status: "pending",
        migrationVersion: 1,
        ownedByCurrentUser: true,
      },
    });
    jest
      .spyOn(storageManager, "syncAccountModuleState")
      .mockResolvedValue({ remoteConfirmed: true, version: 1 });
    jest.spyOn(apiService, "completeLocalIdentityLink").mockResolvedValue({
      success: true,
      data: {
        status: "completed",
        migrationVersion: 1,
        ownedByCurrentUser: true,
      },
    });

    await userManager.loginWithGoogle("credential");

    expect(SessionManager.restore().user.id).toBe("remote-user");
    expect(SessionManager.restore().linkedLocalUserId).toBeUndefined();
    expect(apiService.claimLocalIdentity).toHaveBeenCalledWith(localId);
    expect(apiService.completeLocalIdentityLink).toHaveBeenCalledWith(
      localId,
      expect.arrayContaining([
        { module: "diagnostic", certId: "clf-c02", version: 1 },
      ]),
    );
    expect(storageManager.hydrateAccountState).not.toHaveBeenCalled();
    const history = storageManager.getLocalModuleState(
      "diagnostic",
      "clf-c02",
    ).history;
    expect(history.map((item) => item.attemptId).sort()).toEqual([
      "offline-attempt",
      "remote-diagnostic",
    ]);
    expect(localStorage.getItem(localHistoryKey)).toBe(sourceBefore);
  });

  test("does not import a namespace already belonging to another remote user", async () => {
    SessionManager.persist({
      user: { id: "remote-a", email: "a@a3data.com.br" },
      accessToken: "token-a",
      tokenExpiresIn: 3600,
      authenticationMode: "online",
      provider: "google",
    });
    storageManager.saveQuizResult({
      certId: "clf-c02",
      attemptId: "a-history",
    });
    const sourceKey = storageManager.getUserScopedKey("history");
    const sourceBefore = localStorage.getItem(sourceKey);
    jest.spyOn(apiService, "claimLocalIdentity");
    expect(storageManager.getHistory()).toHaveLength(1);
    jest.spyOn(apiService, "loginWithGoogle").mockResolvedValue({
      success: true,
      data: {
        id: "remote-b",
        email: "b@a3data.com.br",
        role: "STUDENT",
        access_token: "hmac-b",
        expires_in: 3600,
      },
    });
    jest.spyOn(storageManager, "hydrateAccountState").mockResolvedValue(null);

    await userManager.loginWithGoogle("credential");
    expect(SessionManager.restore().user.id).toBe("remote-b");
    expect(storageManager.getHistory()).toEqual([]);
    expect(localStorage.getItem(sourceKey)).toBe(sourceBefore);
    expect(SessionManager.restore().linkedLocalUserId).toBeUndefined();
    expect(apiService.claimLocalIdentity).not.toHaveBeenCalled();
  });
});
