import { SessionManager } from "../core/sessionManager.js";
import { AuthService } from "./authService.js";
import { initializeGoogleLogin } from "./googleIdentity.js";
import { storageManager } from "../storageManager.js";
import { getCurrentLanguage } from "../core/languageManager.js";
import { t } from "../i18n/useTranslation.js";

// Shared shell UX. Native dialog supplies focus containment/Escape; no auth data in DOM.
export function mountSessionUX({
  reload = () => window.location.reload(),
} = {}) {
  const tr = (key) => t(key, getCurrentLanguage());
  // This is an overlay region, not a page section (legacy mobile sections are full-width).
  const notice = document.createElement("div");
  notice.id = "auth-session-notice";
  notice.className = "a3-card auth-session-notice";
  notice.setAttribute("role", "region");
  notice.setAttribute("aria-label", tr("auth_session_status"));
  const text = document.createElement("p");
  text.setAttribute("role", "status");
  const actions = document.createElement("div");
  actions.className = "auth-session-actions";
  notice.append(text, actions);
  const dialog = document.createElement("dialog");
  dialog.id = "auth-session-dialog";
  dialog.className = "a3-card auth-session-dialog";
  dialog.setAttribute("aria-labelledby", "auth-session-title");
  dialog.setAttribute("aria-describedby", "auth-session-description");
  dialog.setAttribute("aria-modal", "true");
  document.body.append(notice, dialog);
  let disposed = false;
  let timer,
    checking = false,
    dialogBusy = false,
    focusBefore;
  let dismissedState = null;
  const attemptedResume = new Set();
  function button(key, onClick, primary = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `a3-btn ${primary ? "a3-btn-primary" : "a3-btn-secondary"}`;
    b.textContent = tr(key);
    b.addEventListener("click", onClick);
    return b;
  }
  function close() {
    if (dialogBusy) return;
    dialog.close();
    focusBefore?.focus?.();
  }
  function open() {
    if (!dialog.open) {
      focusBefore = document.activeElement;
      dialog.showModal();
    }
    dialog.querySelector("button")?.focus();
  }
  function frame(titleKey, descriptionKey) {
    dialog.replaceChildren();
    const title = document.createElement("h2");
    title.id = "auth-session-title";
    title.textContent = tr(titleKey);
    const description = document.createElement("p");
    description.id = "auth-session-description";
    description.textContent = tr(descriptionKey);
    dialog.append(title, description);
  }
  function continueOffline() {
    storageManager.setUserData(
      "expired_notice_dismissed",
      "true",
      sessionStorage,
    );
    close();
    check();
  }
  async function signIn() {
    frame("auth_sign_in_again", "auth_local_progress_preserved");
    const target = document.createElement("div");
    target.className = "auth-google-target";
    const progress = document.createElement("p");
    progress.setAttribute("role", "status");
    const cancel = button("cancel", close);
    dialog.append(target, progress, cancel);
    open();
    try {
      await initializeGoogleLogin({
        container: target,
        onProgress: (phase) => {
          dialogBusy = !!phase;
          cancel.disabled = !!phase;
          if (!phase && progress.getAttribute("role") === "alert") return;
          progress.setAttribute("role", "status");
          progress.textContent = phase
            ? tr(phase === "syncing" ? "auth_link_loading" : "auth_loading")
            : "";
        },
        onError: (error) => {
          progress.textContent = tr(
            error?.statusCode === 403
              ? "auth_google_denied"
              : "auth_google_failed",
          );
          progress.setAttribute("role", "alert");
        },
        onSuccess: (_user, result) => {
          storageManager.setUserData(
            "auth_login_notice",
            JSON.stringify(result),
            sessionStorage,
          );
          reload(); // Reboot page-local caches in the newly authenticated namespace.
        },
      });
    } catch {
      progress.textContent = tr("auth_google_failed");
      progress.setAttribute("role", "alert");
    }
  }
  function showExpired() {
    frame("auth_session_expired", "auth_local_progress_preserved");
    const row = document.createElement("div");
    row.className = "auth-session-actions";
    row.append(
      button("auth_sign_in_again", signIn, true),
      button("auth_continue_offline", continueOffline),
    );
    dialog.append(row);
    open();
  }
  async function retry() {
    storageManager.removeUserData("auth_login_notice", sessionStorage);
    await AuthService.resumeLocalLink();
    check();
  }
  function check() {
    if (checking || disposed) return;
    checking = true;
    clearTimeout(timer);
    try {
      const session = SessionManager.restore();
      notice.hidden = !session?.user;
      if (!session?.user) return;
      actions.replaceChildren();
      let state = AuthService.getGoogleLoginState();
      const saved = storageManager.getUserData(
        "auth_login_notice",
        sessionStorage,
      );
      if (saved) {
        try {
          state = JSON.parse(saved);
        } catch {
          /* ignore malformed UI cache */
        }
      }
      const dismiss = () => {
        storageManager.removeUserData("auth_login_notice", sessionStorage);
        dismissedState = JSON.stringify(state);
        notice.hidden = true;
      };
      if (session.authenticationMode === "offline-expired") {
        text.textContent = `${tr("auth_session_expired")} ${tr("auth_sync_paused")}`;
        actions.append(button("auth_sign_in_again", signIn, true));
        if (
          !dialog.open &&
          storageManager.getUserData(
            "expired_notice_dismissed",
            sessionStorage,
          ) !== "true"
        )
          showExpired();
      } else if (session.authenticationMode !== "online") {
        text.textContent = tr("auth_local_login");
        actions.append(button("auth_sign_in_again", signIn, true));
      } else {
        storageManager.removeUserData(
          "expired_notice_dismissed",
          sessionStorage,
        );
        timer = setTimeout(
          check,
          Math.min(
            2147483647,
            Math.max(1, Date.parse(session.expiresAt) - Date.now()),
          ),
        );
        const key = {
          syncing: "auth_link_loading",
          pending: "auth_link_pending",
          completed: "auth_link_completed",
          conflict: "auth_link_conflict",
        }[state.migration];
        text.textContent = tr(
          key || (state.accountChanged ? "auth_account_changed" : ""),
        );
        notice.hidden =
          (!key && !state.accountChanged) ||
          dismissedState === JSON.stringify(state);
        if (state.migration === "pending")
          actions.append(
            button(
              "auth_link_retry",
              async () => {
                storageManager.removeUserData(
                  "auth_login_notice",
                  sessionStorage,
                );
                await retry();
              },
              true,
            ),
          );
        if (state.migration !== "syncing") {
          actions.append(button("auth_continue_account", dismiss, true));
          if (state.migration === "conflict")
            actions.append(button("cancel", dismiss));
        }
        if (
          AuthService.hasPendingLocalLink() &&
          !attemptedResume.has(session.user.id) &&
          !state.phase
        ) {
          attemptedResume.add(session.user.id);
          void retry(); // Once per page load, never a polling loop.
        }
      }
    } finally {
      checking = false;
    }
  }
  const onCancel = (event) => {
    if (dialogBusy) {
      event.preventDefault();
      return;
    }
    if (SessionManager.restore()?.authenticationMode === "offline-expired")
      continueOffline();
  };
  dialog.addEventListener("cancel", onCancel);
  const onReauth = () => {
    check();
    showExpired();
  };
  const events = ["app-session-changed", "auth-flow-state", "storage", "focus"];
  events.forEach((event) => window.addEventListener(event, check));
  window.addEventListener("app-reauth-required", onReauth);
  document.addEventListener("visibilitychange", check);
  check();
  return () => {
    disposed = true;
    clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, check));
    window.removeEventListener("app-reauth-required", onReauth);
    document.removeEventListener("visibilitychange", check);
    dialog.remove();
    notice.remove();
  };
}
