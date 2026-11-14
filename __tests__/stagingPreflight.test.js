/** @jest-environment node */
import { afterEach, expect, test } from "@jest/globals";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runStagingPreflight } from "../scripts/operations/staging-preflight.mjs";

let root;
let dataDir;

async function fixture() {
  root = await mkdtemp(join(tmpdir(), "cloudacademy-preflight-"));
  dataDir = join(root, "persistent-data");
  await mkdir(dataDir, { mode: 0o700 });
  for (const path of [
    "public",
    "docs/audits/staging/nginx",
    "docs/audits/staging/systemd",
  ]) {
    await mkdir(join(root, path), { recursive: true });
  }
  await writeFile(join(root, "public/index.html"), "<main>synthetic</main>");
  await writeFile(join(root, "public/manifest.json"), "{}");
  await writeFile(join(root, "public/sw.js"), "// synthetic");
  await writeFile(
    join(root, "docs/audits/staging/nginx/cloudacademy.conf.example"),
    `geo $cloudacademy_corporate_access { default 0; include /etc/nginx/cloudacademy/approved-cidrs.map; }\nserver { listen 443 ssl; server_name canary.testcorp.com; root /opt/cloudacademy/current/public; location ^~ /api/ { proxy_pass http://127.0.0.1:3001; } }`,
  );
  await writeFile(
    join(root, "docs/audits/staging/nginx/approved-cidrs.map.example"),
    "192.0.2.0/24 1;\n",
  );
  await writeFile(
    join(root, "docs/audits/staging/systemd/cloudacademy-api.service.example"),
    `[Service]\nEnvironment=NODE_ENV=staging\nEnvironment=DB_ENGINE=pglite\nEnvironment=DB_DATA_DIR=/var/lib/cloudacademy/pglite\nExecStart=/usr/bin/node backend/api/server.js\nRestart=on-failure\nTimeoutStopSec=30\n`,
  );
  return {
    NODE_ENV: "staging",
    DB_ENGINE: "pglite",
    DB_DATA_DIR: dataDir,
    AUTH_ALLOWED_DOMAINS: "canary.testcorp.com",
    AUTH_ALLOWED_EMAILS: "synthetic@canary.testcorp.com",
    AUTH_SESSION_SECRET:
      "synthetic-only-secret-with-sufficient-randomness-7291",
    GOOGLE_CLIENT_ID: "123456789-synthetic.apps.googleusercontent.com",
    TRUST_PROXY: "127.0.0.1",
    CORS_ALLOWED_ORIGINS: "https://canary.testcorp.com",
  };
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  dataDir = undefined;
});

test("accepts only the locally verifiable synthetic staging contract", async () => {
  const env = await fixture();
  const result = await runStagingPreflight({
    env,
    root,
    nodeVersion: "24.21.0",
    platform: "linux",
    directoryModeReader: async () => 0o40700,
  });
  expect(result.status).toBe("LOCAL_PREFLIGHT_PASS_EXTERNAL_GATES_OPEN");
  expect(result.deployAuthorized).toBe(false);
  expect(result.checks.every((check) => check.status === "PASS")).toBe(true);
  expect(result.externalGates.length).toBeGreaterThan(0);
});

test("fails closed on an unapproved runtime configuration without revealing secrets", async () => {
  const env = await fixture();
  const secret = env.AUTH_SESSION_SECRET;
  env.AUTH_ALLOWED_EMAILS = "";
  env.AUTH_ALLOWED_DOMAINS = "corp.example";
  env.AUTH_SESSION_SECRET = "too-short";
  const result = await runStagingPreflight({
    env,
    root,
    nodeVersion: "24.14.0",
  });
  expect(result.status).toBe("BLOCKED");
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(
    result.checks.find((check) => check.name === "employee-allowlist").status,
  ).toBe("FAIL");
  expect(
    result.checks.find((check) => check.name === "employee-domains").status,
  ).toBe("FAIL");
  expect(
    result.checks.find((check) => check.name === "node-version").status,
  ).toBe("FAIL");
});

test("blocks unresolved network placeholders and credential-like public assets", async () => {
  const env = await fixture();
  await writeFile(
    join(root, "public/config.js"),
    "const leaked = 'AKIA1234567890ABCDEF';",
  );
  const mapPath = join(
    root,
    "docs/audits/staging/nginx/approved-cidrs.map.example",
  );
  await writeFile(mapPath, "# no approved corporate range yet\n");
  const result = await runStagingPreflight({
    env,
    root,
    nodeVersion: "24.21.0",
    platform: "linux",
    directoryModeReader: async () => 0o40700,
  });
  expect(result.status).toBe("BLOCKED");
  expect(
    result.checks.find((check) => check.name === "network-placeholders").status,
  ).toBe("FAIL");
  expect(
    result.checks.find((check) => check.name === "public-credential-scan")
      .status,
  ).toBe("FAIL");
  expect(JSON.stringify(result)).not.toContain("AKIA1234567890ABCDEF");
});
