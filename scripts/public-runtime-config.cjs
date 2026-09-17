const fs = require("node:fs");
const path = require("node:path");

const SECRET_NAMES = [
  "AUTH_SESSION_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "DB_PASSWORD",
];

function createPublicConfig(env) {
  const apiBaseUrl = String(env.PUBLIC_API_BASE_URL || "").trim();
  if (apiBaseUrl) {
    let url;
    try {
      url = new URL(apiBaseUrl);
    } catch {
      throw new Error("Invalid PUBLIC_API_BASE_URL");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (env.NODE_ENV === "production" &&
        ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(url.hostname))
    )
      throw new Error("Unsafe PUBLIC_API_BASE_URL");
  }
  return {
    googleClientId: String(env.GOOGLE_CLIENT_ID || "").trim(),
    apiBaseUrl,
    allowDevEmailLogin: env.ALLOW_DEV_EMAIL_LOGIN === "true",
  };
}

function renderPublicConfig(env) {
  return `globalThis.__APP_CONFIG__ = Object.assign({}, globalThis.__APP_CONFIG__, ${JSON.stringify(createPublicConfig(env))});\n`;
}

function injectPublicConfig(html, prefix = "./") {
  if (html.includes("js/runtimeConfig.js")) return html;
  return html.replace(
    /<head\b[^>]*>/i,
    (head) => `${head}\n<script src="${prefix}js/runtimeConfig.js"></script>`,
  );
}

// Report names only: never include secret values or matching file contents.
function assertNoPublicSecrets(directory, env) {
  const needles = SECRET_NAMES.map((name) => ({
    name,
    values: [Buffer.from(name), ...(env[name] ? [Buffer.from(env[name])] : [])],
  }));
  function scan(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) scan(target);
      else {
        const contents = fs.readFileSync(target);
        for (const { name, values } of needles) {
          if (values.some((value) => contents.includes(value))) {
            throw new Error(
              `Public build exposes forbidden configuration: ${name}`,
            );
          }
        }
      }
    }
  }
  scan(directory);
}

module.exports = {
  createPublicConfig,
  renderPublicConfig,
  injectPublicConfig,
  assertNoPublicSecrets,
};
