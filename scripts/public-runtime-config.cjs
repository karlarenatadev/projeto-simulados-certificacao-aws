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
  return {
    googleClientId: String(env.GOOGLE_CLIENT_ID || "").trim(),
    allowDevEmailLogin: env.ALLOW_DEV_EMAIL_LOGIN === "true",
  };
}

function renderPublicConfig(env) {
  return `globalThis.__APP_CONFIG__ = Object.assign({}, globalThis.__APP_CONFIG__, ${JSON.stringify(createPublicConfig(env))});\n`;
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
  assertNoPublicSecrets,
};
