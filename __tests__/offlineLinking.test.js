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
  test("merges local namespace into the authenticated UUID without deleting source", async () => {
    userManager.createOfflineUser("offline@a3data.com.br");
    const localId = SessionManager.restore().user.id;
    const localHistoryKey = storageManager.getUserScopedKey("history");
    storageManager.saveQuizResult({
      certId: "clf-c02",
      attemptId: "offline-attempt",
      score: 8,
      total: 10,
      percentage: 80,
    });
    jest.spyOn(apiService, "loginWithGoogle").mockResolvedValue({
      success: true,
      data: {
        id: "remote-user",
        email: "offline@a3data.com.br",
        role: "STUDENT",
        access_token: "hmac-token",
        expires_in: 3600,
      },
    });
    jest.spyOn(storageManager, "hydrateAccountState").mockResolvedValue(null);

    await userManager.loginWithGoogle("credential");

    expect(SessionManager.restore().user.id).toBe("remote-user");
    expect(SessionManager.restore().linkedLocalUserId).toBe(localId);
    const remoteHistoryKey = storageManager.getUserScopedKey("history");
    expect(JSON.parse(localStorage.getItem(remoteHistoryKey))).toHaveLength(1);
    expect(localStorage.getItem(localHistoryKey)).not.toBeNull();
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
    expect(
      storageManager.getAccountModuleState("diagnostic", "clf-c02").history,
    ).toEqual([]);
  });
});
