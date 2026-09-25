/** @jest-environment node */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const {
  renderPublicConfig,
  injectPublicConfig,
  assertNoPublicSecrets,
  assertPublicConfigArtifact,
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

const distributionEnv = {
  PUBLIC_BUILD_TARGET: "pages",
  GOOGLE_CLIENT_ID: " fixture.apps.googleusercontent.com ",
  PUBLIC_API_BASE_URL: " https://api.example.test ",
};

test("Pages distribution emits and verifies both public settings in the final artifact", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pages-config-"));
  try {
    const file = path.join(directory, "runtimeConfig.js");
    const env = {
      ...distributionEnv,
      AUTH_SESSION_SECRET: "private-session-fixture",
      GOOGLE_CLIENT_SECRET: "private-google-fixture",
      DB_PASSWORD: "private-db-fixture",
      PRIVATE_TOKEN: "private-token-fixture",
    };
    fs.writeFileSync(file, renderPublicConfig(env));
    expect(() => assertPublicConfigArtifact(file, env)).not.toThrow();
    const context = {};
    vm.runInNewContext(fs.readFileSync(file, "utf8"), context);
    expect(context.__APP_CONFIG__).toEqual({
      googleClientId: "fixture.apps.googleusercontent.com",
      apiBaseUrl: "https://api.example.test",
      allowDevEmailLogin: false,
    });
    expect(fs.readFileSync(file, "utf8")).not.toContain("private-");
    expect(() => assertNoPublicSecrets(directory, env)).not.toThrow();
    // Detect an empty/stale artifact even when the build environment is valid.
    fs.writeFileSync(file, renderPublicConfig({}));
    expect(() => assertPublicConfigArtifact(file, env)).toThrow(
      "does not match",
    );
    fs.writeFileSync(
      file,
      renderPublicConfig(env) +
        "globalThis.__APP_CONFIG__.privateToken='unexpected';",
    );
    expect(() => assertPublicConfigArtifact(file, env)).toThrow(
      "does not match",
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test.each(["GOOGLE_CLIENT_ID", "PUBLIC_API_BASE_URL"])(
  "Pages build fails before cleaning output when %s is missing",
  (missing) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pages-build-"));
    try {
      fs.mkdirSync(path.join(directory, "scripts"));
      fs.mkdirSync(path.join(directory, "public", "js"), { recursive: true });
      for (const file of ["build.cjs", "public-runtime-config.cjs"])
        fs.copyFileSync(
          path.resolve("scripts", file),
          path.join(directory, "scripts", file),
        );
      const marker = path.join(directory, "public", "js", "existing.js");
      fs.writeFileSync(marker, "preserved");
      const result = spawnSync(process.execPath, ["scripts/build.cjs"], {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_PATH: path.resolve("node_modules"),
          ...distributionEnv,
          [missing]: " ",
        },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Pages build requires ${missing}`);
      expect(fs.readFileSync(marker, "utf8")).toBe("preserved");
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
);

test.each([
  "http://api.example.test",
  "https://localhost:3001",
  "https://127.0.0.1",
  "https://user:password@api.example.test",
  "https://api.example.test?token=private",
  "invalid",
])("Pages distribution rejects unsafe API URL %s", (url) =>
  expect(() =>
    renderPublicConfig({ ...distributionEnv, PUBLIC_API_BASE_URL: url }),
  ).toThrow(/PUBLIC_API_BASE_URL/),
);

test("runtime serialization preserves public strings without adding executable code", () => {
  const clientId = 'public"\\\n;globalThis.injected=true;//';
  const context = {};
  vm.runInNewContext(
    renderPublicConfig({ ...distributionEnv, GOOGLE_CLIENT_ID: clientId }),
    context,
  );
  expect(context.__APP_CONFIG__.googleClientId).toBe(clientId);
  expect(context.injected).toBeUndefined();
});

test("local/offline builds retain optional configuration and HTTP loopback support", () => {
  for (const env of [{}, { NODE_ENV: "production" }]) {
    const context = {};
    vm.runInNewContext(renderPublicConfig(env), context);
    expect(context.__APP_CONFIG__).toEqual({
      googleClientId: "",
      apiBaseUrl: "",
      allowDevEmailLogin: false,
    });
  }
  const context = {};
  vm.runInNewContext(
    renderPublicConfig({
      PUBLIC_API_BASE_URL: "http://localhost:3001",
      ALLOW_DEV_EMAIL_LOGIN: "true",
    }),
    context,
  );
  expect(context.__APP_CONFIG__.apiBaseUrl).toBe("http://localhost:3001");
  expect(context.__APP_CONFIG__.allowDevEmailLogin).toBe(true);
});

test("Pages workflow explicitly publishes the local-first artifact", () => {
  const workflow = fs.readFileSync(
    ".github/workflows/deploy-pages.yml",
    "utf8",
  );
  expect(workflow).toContain("PUBLIC_BUILD_TARGET: local-first");
  expect(workflow).not.toContain("GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }}");
  expect(workflow).not.toContain("PUBLIC_API_BASE_URL: ${{ vars.PUBLIC_API_BASE_URL }}");
  expect(workflow).toContain(
    "assertPublicConfigArtifact('public/js/runtimeConfig.js', process.env)",
  );
  expect(workflow).not.toContain("${{ secrets.");
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
