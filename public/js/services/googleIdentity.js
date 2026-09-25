import { AuthService } from "./authService.js";
import { resolveAppUrl } from "../core/navigation.js";

let scriptPromise;
let configPromise;
let callbackBusy = false;

function getConfig() {
  const config = globalThis.__APP_CONFIG__ || {};
  return {
    clientId:
      config.googleClientId ||
      document.documentElement.dataset.googleClientId ||
      "",
    allowDevEmailLogin: config.allowDevEmailLogin === true,
  };
}

export function isLocalFirstMode() {
  return globalThis.__APP_CONFIG__?.localFirst === true;
}

export function isHybridMode() {
  return globalThis.__APP_CONFIG__?.hybrid === true;
}

export function isGoogleLoginConfigured() {
  const config = globalThis.__APP_CONFIG__ || {};
  return Boolean(config.googleClientId && config.apiBaseUrl);
}

function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      scriptPromise = null;
      reject(new Error("Google Identity Services indisponível."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Initialise GIS without persisting the Google credential in the browser. */
export async function initializeGoogleLogin({
  onSuccess,
  onError,
  onProgress,
  container: target,
} = {}) {
  // Secondary pages do not load the Home's runtime-config script at boot.
  if (
    !globalThis.__APP_CONFIG__ &&
    !document.documentElement.dataset.googleClientId
  ) {
    if (!configPromise)
      configPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = resolveAppUrl("js/runtimeConfig.js");
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          configPromise = null;
          reject(new Error("public_config_unavailable"));
        };
        document.head.appendChild(script);
      });
    await configPromise;
  }
  const { clientId } = getConfig();
  if (!clientId)
    throw new Error("GOOGLE_CLIENT_ID não configurado para o frontend.");
  await loadGoogleScript();
  if (!globalThis.google?.accounts?.id)
    throw new Error("Google Identity Services indisponível.");
  globalThis.google.accounts.id.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      if (callbackBusy) return;
      callbackBusy = true;
      const container =
        target || document.getElementById("google-login-container");
      const update = () =>
        onProgress?.(
          AuthService.getGoogleLoginState().migration === "syncing"
            ? "syncing"
            : "authenticating",
        );
      container?.setAttribute("inert", "");
      container?.setAttribute("aria-busy", "true");
      globalThis.window?.addEventListener("auth-flow-state", update);
      update();
      try {
        const user = await AuthService.loginWithGoogle(credential);
        onSuccess?.(user, AuthService.getGoogleLoginState());
      } catch (error) {
        onError?.(error);
      } finally {
        callbackBusy = false;
        container?.removeAttribute("inert");
        container?.setAttribute("aria-busy", "false");
        globalThis.window?.removeEventListener("auth-flow-state", update);
        onProgress?.(null);
      }
    },
  });
  const container = target || document.getElementById("google-login-container");
  if (!container) throw new Error("Container do login Google não encontrado.");
  container.replaceChildren();
  globalThis.google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    width: 320,
  });
}

export function isDevEmailLoginEnabled() {
  return getConfig().allowDevEmailLogin;
}
