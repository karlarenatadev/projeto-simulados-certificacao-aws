const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SECRET_NAMES = [
  "AUTH_SESSION_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "DB_PASSWORD",
];

function createPublicConfig(env) {
  const distribution = env.PUBLIC_BUILD_TARGET === "pages";
  const googleClientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const apiBaseUrl = String(env.PUBLIC_API_BASE_URL || "").trim();
  if (distribution) {
    for (const [name, value] of Object.entries({
      GOOGLE_CLIENT_ID: googleClientId,
      PUBLIC_API_BASE_URL: apiBaseUrl,
    })) {
      if (!value)
        throw new Error(
          `Pages build requires ${name}. Configure the GitHub Actions repository variable ${name}.`,
        );
    }
  }
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
      ((distribution || env.NODE_ENV === "production") &&
        url.protocol !== "https:") ||
      ((distribution || env.NODE_ENV === "production") &&
        ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(url.hostname))
    )
      throw new Error("Unsafe PUBLIC_API_BASE_URL");
  }
  return {
    googleClientId,
    apiBaseUrl,
    allowDevEmailLogin: env.ALLOW_DEV_EMAIL_LOGIN === "true",
  };
}

// Inspect the emitted file, not just the environment used to generate it.
function assertPublicConfigArtifact(file, env) {
  const expected = createPublicConfig(env);
  const context = {};
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { timeout: 1000 });
  const actual = context.__APP_CONFIG__;
  if (
    !actual ||
    Object.keys(actual).length !== Object.keys(expected).length ||
    Object.entries(expected).some(([key, value]) => actual[key] !== value)
  )
    throw new Error(
      "Generated runtimeConfig.js does not match public build configuration",
    );
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
  assertPublicConfigArtifact,
};
