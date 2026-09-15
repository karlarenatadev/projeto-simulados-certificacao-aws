import { AuthService } from "./authService.js";

let scriptPromise;

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

function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Google Identity Services indisponível."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Initialise GIS without persisting the Google credential in the browser. */
export async function initializeGoogleLogin({ onSuccess, onError } = {}) {
  const { clientId } = getConfig();
  if (!clientId)
    throw new Error("GOOGLE_CLIENT_ID não configurado para o frontend.");
  await loadGoogleScript();
  if (!globalThis.google?.accounts?.id)
    throw new Error("Google Identity Services indisponível.");
  globalThis.google.accounts.id.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      try {
        const user = await AuthService.loginWithGoogle(credential);
        onSuccess?.(user);
      } catch (error) {
        onError?.(error);
      }
    },
  });
  const container = document.getElementById("google-login-container");
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
