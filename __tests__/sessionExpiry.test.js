import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";

const user = {
  id: "user-expiry",
  email: "user@a3data.com.br",
  role: "STUDENT",
};

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
});

describe("SessionManager expiration", () => {
  test("online without a token restores as offline-expired in the same namespace", () => {
    SessionManager.persist({
      user,
      authenticationMode: "online",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(SessionManager.restore()).toMatchObject({
      user,
      accessToken: null,
      authenticationMode: "offline-expired",
      sessionExpired: true,
    });
    expect(SessionManager.restore().user.id).toBe(user.id);
  });

  test("touch and restore do not renew absolute expiry, including the boundary", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    SessionManager.persist({
      user,
      accessToken: "fixture-token",
      authenticationMode: "online",
      tokenExpiresIn: 3600,
    });
    const expiresAt = SessionManager.restore().expiresAt;
    jest.setSystemTime(new Date("2026-09-15T12:30:00Z"));
    SessionManager.touch();
    expect(SessionManager.restore().expiresAt).toBe(expiresAt);
    jest.setSystemTime(new Date(expiresAt));
    expect(SessionManager.restore().authenticationMode).toBe("offline-expired");
    expect(SessionManager.restore().expiresAt).toBe(expiresAt);
  });
  test("persists and accepts a future online expiry", () => {
    SessionManager.persist({
      user,
      accessToken: "token",
      tokenExpiresIn: 3600,
      authenticationMode: "online",
      provider: "google",
    });
    const session = SessionManager.restore();
    expect(session.authenticationMode).toBe("online");
    expect(session.expiresAt).toBeTruthy();
    expect(SessionManager.isExpired(session)).toBe(false);
  });

  test("keeps local study available while invalidating an expired online token", () => {
    SessionManager.persist({
      user,
      accessToken: "expired-token",
      expiresAt: new Date(Date.now() - 1).toISOString(),
      authenticationMode: "online",
      provider: "google",
    });
    const session = SessionManager.restore();
    expect(session.user.id).toBe(user.id);
    expect(session.accessToken).toBeNull();
    expect(session.authenticationMode).toBe("offline-expired");
    expect(session.sessionExpired).toBe(true);
  });

  test("does not expire local-only sessions", () => {
    SessionManager.persist({
      user,
      authenticationMode: "offline",
      provider: "local",
    });
    expect(SessionManager.restore()?.authenticationMode).toBe("offline");
    expect(SessionManager.isExpired(SessionManager.restore())).toBe(false);
  });

  test("treats an online session without a trustworthy expiry as expired", () => {
    localStorage.setItem(
      "cloudacademy_session",
      JSON.stringify({
        user,
        accessToken: "legacy-token",
        authenticationMode: "online",
      }),
    );
    expect(SessionManager.restore()?.authenticationMode).toBe(
      "offline-expired",
    );
  });
});
