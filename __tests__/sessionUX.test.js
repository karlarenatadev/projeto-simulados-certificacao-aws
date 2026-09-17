import { jest } from "@jest/globals";
import { mountSessionUX } from "../src/frontend/js/services/sessionUX.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { AuthService } from "../src/frontend/js/services/authService.js";
import apiService from "../src/frontend/js/services/api.js";

let dispose;
beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '<button id="study">Study</button>';
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  jest
    .spyOn(AuthService, "getGoogleLoginState")
    .mockReturnValue({ migration: "none" });
  jest.spyOn(AuthService, "hasPendingLocalLink").mockReturnValue(false);
});
afterEach(() => {
  dispose?.();
  jest.restoreAllMocks();
  jest.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
test.each(["pt", "en"])(
  "expiry UX %s preserves namespace, offline study and cleans timer",
  (language) => {
    SessionManager.persist({
      user: { id: "A", language },
      authenticationMode: "online",
      provider: "google",
      accessToken: "hmac",
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });
    const claim = jest.spyOn(apiService, "claimLocalIdentity");
    dispose = mountSessionUX();
    expect(document.querySelector("dialog").open).toBe(false);
    jest.advanceTimersByTime(1001);
    expect(document.querySelector("dialog").open).toBe(true);
    const buttons = [...document.querySelectorAll("dialog button")];
    expect(buttons[0].textContent).toBe(
      language === "pt" ? "Entrar novamente" : "Sign in again",
    );
    expect(buttons[1].textContent).toBe(
      language === "pt" ? "Continuar offline" : "Continue offline",
    );
    buttons[1].click();
    expect(document.querySelector("dialog").open).toBe(false);
    expect(SessionManager.restore()).toMatchObject({
      user: { id: "A" },
      authenticationMode: "offline-expired",
      accessToken: null,
    });
    expect(claim).not.toHaveBeenCalled();
    dispose();
    expect(jest.getTimerCount()).toBe(0);
  },
);
test("expired profile write requests reauth without a network call", async () => {
  SessionManager.persist({
    user: { id: "A" },
    authenticationMode: "offline-expired",
    provider: "google",
  });
  const fetch = jest.fn();
  const previous = global.fetch;
  global.fetch = fetch;
  dispose = mountSessionUX();
  try {
    await expect(
      apiService.updateMyProfile({ nickname: "Safe" }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("dialog").open).toBe(true);
  } finally {
    global.fetch = previous;
  }
});

test("legacy local session without authentication mode does not create an expiry timer", () => {
  SessionManager.persist({ user: { id: "local_old" } });
  dispose = mountSessionUX();
  expect(jest.getTimerCount()).toBe(0);
});
