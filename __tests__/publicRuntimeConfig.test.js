/** @jest-environment node */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const {
  renderPublicConfig,
  injectPublicConfig,
  assertNoPublicSecrets,
} = require("../scripts/public-runtime-config.cjs");

test("runtime exports only public allowlisted settings and handles missing client ID", () => {
  const env = {
    GOOGLE_CLIENT_ID: " client.apps.googleusercontent.com ",
    PUBLIC_API_BASE_URL: "https://api.example.com",
    AUTH_SESSION_SECRET: "private-session",
    GOOGLE_CLIENT_SECRET: "private-google",
    GOOGLE_API_KEY: "private-api",
    GROQ_API_KEY: "private-groq",
    DB_PASSWORD: "private-db",
  };
  const context = {};
  vm.runInNewContext(renderPublicConfig(env), context);
  expect(context.__APP_CONFIG__).toEqual({
    googleClientId: env.GOOGLE_CLIENT_ID.trim(),
    allowDevEmailLogin: false,
    apiBaseUrl: "https://api.example.com",
  });
  expect(renderPublicConfig(env)).not.toContain("private-");
  vm.runInNewContext(renderPublicConfig({}), context);
  expect(context.__APP_CONFIG__.googleClientId).toBe("");
});

test("public audit rejects forbidden names and secret values without printing values", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "public-config-test-"),
  );
  try {
    const file = path.join(directory, "runtime.js");
    fs.writeFileSync(
      file,
      renderPublicConfig({ GOOGLE_CLIENT_ID: "public-client" }),
    );
    expect(() => assertNoPublicSecrets(directory, {})).not.toThrow();
    for (const name of [
      "AUTH_SESSION_SECRET",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_API_KEY",
      "GROQ_API_KEY",
      "DB_PASSWORD",
    ]) {
      fs.writeFileSync(file, name);
      expect(() => assertNoPublicSecrets(directory, {})).toThrow(name);
      fs.writeFileSync(file, "private-fixture-value");
      expect(() =>
        assertNoPublicSecrets(directory, { [name]: "private-fixture-value" }),
      ).toThrow(name);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("production config refuses loopback and public URLs cannot embed credentials", () => {
  for (const url of [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://user:private@example.com",
  ]) {
    expect(() =>
      renderPublicConfig({ NODE_ENV: "production", PUBLIC_API_BASE_URL: url }),
    ).toThrow("Unsafe PUBLIC_API_BASE_URL");
  }
});

test("secondary pages load public API config before clients with base-path-safe URLs", () => {
  const html =
    '<html><head><script src="./js/client.js"></script></head></html>';
  const generated = injectPublicConfig(html);
  expect(generated.indexOf('src="./js/runtimeConfig.js"')).toBeLessThan(
    generated.indexOf('src="./js/client.js"'),
  );
  expect(injectPublicConfig(generated)).toBe(generated);
  expect(injectPublicConfig(html, "../")).toContain(
    'src="../js/runtimeConfig.js"',
  );
});

test("build loads root dotenv before config generation and page loads config before app", () => {
  const build = fs.readFileSync("scripts/build.cjs", "utf8");
  expect(build.indexOf("require('dotenv').config")).toBeLessThan(
    build.indexOf("renderPublicConfig(process.env)"),
  );
  const html = fs.readFileSync("src/frontend/pages/index.html", "utf8");
  expect(html.indexOf('src="./js/runtimeConfig.js"')).toBeLessThan(
    html.indexOf('src="./js/app.js"'),
  );
});
