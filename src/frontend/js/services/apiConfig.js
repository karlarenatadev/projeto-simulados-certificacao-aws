// Public transport configuration only. No identity or authentication policy here.
export function resolveApiBaseUrl({
  hostname = "",
  protocol = "http:",
  configuredUrl = "",
  forceOffline = false,
} = {}) {
  if (forceOffline) return "";
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (!local &&
          ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(url.hostname))
      )
        return "";
      return url.href.replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  return local && ["http:", "https:"].includes(protocol)
    ? `${protocol}//${hostname}:3001`
    : "";
}

export function getApiBaseUrl(configuredUrl) {
  return resolveApiBaseUrl({
    hostname: globalThis.location?.hostname,
    protocol: globalThis.location?.protocol,
    configuredUrl:
      configuredUrl ||
      globalThis.__APP_CONFIG__?.apiBaseUrl ||
      import.meta.env?.VITE_API_URL ||
      "",
    forceOffline:
      globalThis.sessionStorage?.getItem("force_offline") === "true",
  });
}
