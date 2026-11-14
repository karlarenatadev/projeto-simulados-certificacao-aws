#!/usr/bin/env node
import { config as loadDotEnv } from "dotenv";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { isIP } from "node:net";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateApiConfig } from "../../backend/api/config.js";

export const STAGING_NODE_VERSION = "24.21.0";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const nginxPath = "docs/audits/staging/nginx/cloudacademy.conf.example";
const cidrPath = "docs/audits/staging/nginx/approved-cidrs.map.example";
const systemdPath =
  "docs/audits/staging/systemd/cloudacademy-api.service.example";
const requiredPublicFiles = [
  "public/index.html",
  "public/manifest.json",
  "public/sw.js",
];

function add(results, name, status, message) {
  results.push({ name, status, message });
}

function containsPlaceholder(value) {
  return /(?:replace_with|changeme|your[_ -]|placeholder|example\.com|\.(?:example|test|invalid)\b|employee1@)/i.test(
    value,
  );
}

function isLoopbackProxy(value) {
  const [address, prefix, extra] = value.split("/");
  if (extra !== undefined) return false;
  if (address === "127.0.0.1") return prefix === undefined || prefix === "32";
  if (address === "::1") return prefix === undefined || prefix === "128";
  return false;
}

function validAllowlistedNetworkEntry(line) {
  const match = line.match(/^\s*([^\s;]+)\s+1;\s*$/);
  if (!match) return false;
  const [address, prefix, extra] = match[1].split("/");
  const family = isIP(address);
  if (!family || extra !== undefined) return false;
  if (prefix === undefined) return true;
  const max = family === 4 ? 32 : 128;
  return /^\d+$/.test(prefix) && Number(prefix) > 0 && Number(prefix) <= max;
}

async function walkTextFiles(directory, root, results = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return results;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkTextFiles(path, root, results);
      continue;
    }
    if (
      !entry.isFile() ||
      !/\.(?:css|html|js|json|map|svg|txt|webmanifest|xml)$/i.test(entry.name)
    )
      continue;
    const info = await stat(path);
    if (info.size > 20 * 1024 * 1024) {
      results.push({ path: relative(root, path), oversized: true });
      continue;
    }
    const text = await readFile(path, "utf8");
    const patterns = [
      /\bAKIA[0-9A-Z]{16}\b/,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /AIza[0-9A-Za-z_-]{30,}/,
      /(?:AUTH_SESSION_SECRET|GOOGLE_API_KEY|GROQ_API_KEY|DATABASE_URL|DB_PASSWORD|BACKUP_AGE_IDENTITY)\s*[:=]\s*["']?(?!your[_ -]|replace[_ -]|changeme|process\.env)[A-Za-z0-9_+/=.-]{12,}/i,
    ];
    if (patterns.some((pattern) => pattern.test(text))) {
      results.push({ path: relative(root, path), credentialLikeValue: true });
    }
  }
  return results;
}

/** Read-only staging checks. Injected dependencies are used only by unit tests. */
export async function runStagingPreflight({
  env = process.env,
  root = repoRoot,
  nodeVersion = process.versions.node,
  platform = process.platform,
  directoryModeReader = async (path) => (await stat(path)).mode,
} = {}) {
  const results = [];
  const rootPath = resolve(root);

  add(
    results,
    "node-version",
    nodeVersion === STAGING_NODE_VERSION ? "PASS" : "FAIL",
    nodeVersion === STAGING_NODE_VERSION
      ? `Node.js ${STAGING_NODE_VERSION} matches the Linux performance evidence.`
      : `Expected Node.js ${STAGING_NODE_VERSION}; found ${nodeVersion}.`,
  );

  try {
    if (env.NODE_ENV !== "staging") throw new Error("NODE_ENV must be staging");
    if (env.DB_ENGINE !== "pglite") throw new Error("DB_ENGINE must be pglite");
    const config = validateApiConfig(env);
    if (config.host !== "127.0.0.1")
      throw new Error("staging API bind is not loopback");
    add(
      results,
      "api-config",
      "PASS",
      "Required hardened PGlite settings are syntactically valid.",
    );
  } catch (error) {
    add(results, "api-config", "FAIL", error.message);
  }

  const domains = String(env.AUTH_ALLOWED_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);
  const emails = String(env.AUTH_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (!domains.length || domains.some(containsPlaceholder)) {
    add(
      results,
      "employee-domains",
      "FAIL",
      "Set explicit, non-placeholder employee domains.",
    );
  } else {
    add(
      results,
      "employee-domains",
      "PASS",
      `${domains.length} explicit domain entr${domains.length === 1 ? "y" : "ies"} configured; corporate ownership is not verified.`,
    );
  }
  add(
    results,
    "employee-allowlist",
    emails.length && !emails.some(containsPlaceholder) ? "PASS" : "FAIL",
    emails.length && !emails.some(containsPlaceholder)
      ? `${emails.length} explicit email entr${emails.length === 1 ? "y" : "ies"} configured; authorization and external identity remain unverified.`
      : "Set an explicit, non-placeholder employee email allowlist.",
  );

  const secret = String(env.AUTH_SESSION_SECRET || "");
  const secretLooksUsable =
    Buffer.byteLength(secret) >= 32 &&
    new Set(secret).size >= 8 &&
    !containsPlaceholder(secret);
  add(
    results,
    "session-secret",
    secretLooksUsable ? "PASS" : "FAIL",
    secretLooksUsable
      ? "Session secret meets local length/diversity checks; entropy and secret-store custody are not verified."
      : "AUTH_SESSION_SECRET is missing, too short, or a known placeholder.",
  );

  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const clientIdLooksConfigured =
    /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId) &&
    !containsPlaceholder(clientId);
  add(
    results,
    "google-client-id-format",
    clientIdLooksConfigured ? "PASS" : "FAIL",
    clientIdLooksConfigured
      ? "Client ID format is valid; Google Console, origin, consent and credential verification are not performed."
      : "GOOGLE_CLIENT_ID is missing or a known placeholder.",
  );

  const origins = String(env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const exactHttpsOrigins =
    origins.length > 0 &&
    origins.every((origin) => {
      try {
        const parsed = new URL(origin);
        return (
          parsed.origin === origin &&
          parsed.protocol === "https:" &&
          !containsPlaceholder(origin)
        );
      } catch {
        return false;
      }
    });
  const proxyEntries = String(env.TRUST_PROXY || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const explicitLocalProxy = proxyEntries.some(isLoopbackProxy);
  add(
    results,
    "proxy-and-origins",
    exactHttpsOrigins && explicitLocalProxy ? "PASS" : "FAIL",
    exactHttpsOrigins && explicitLocalProxy
      ? "Exact HTTPS origins and explicit same-host loopback proxy trust configured; live forwarded IP behavior remains unverified."
      : "Use exact HTTPS origins and explicitly trust only the same-host loopback proxy (127.0.0.1/32 or ::1/128).",
  );

  const dataDirInput = String(env.DB_DATA_DIR || "").trim();
  let directoryReady = false;
  let directoryMode = null;
  let directoryError = "";
  if (!isAbsolute(dataDirInput) || dataDirInput.includes("://")) {
    directoryError =
      "DB_DATA_DIR must be an absolute filesystem path, not a URI.";
  } else {
    try {
      const directory = await stat(dataDirInput);
      if (!directory.isDirectory())
        throw new Error("DB_DATA_DIR is not a directory.");
      await access(dataDirInput, constants.W_OK | constants.R_OK);
      directoryMode = await directoryModeReader(dataDirInput);
      if (platform === "linux" && (directoryMode & 0o077) !== 0) {
        throw new Error(
          "DB_DATA_DIR must not be accessible to group/other users (recommended mode 0700).",
        );
      }
      directoryReady = true;
    } catch (error) {
      directoryError =
        error.message === "ENOENT"
          ? "DB_DATA_DIR must already exist as a mounted persistent directory; preflight will not create it."
          : error.message;
    }
  }
  add(
    results,
    "pglite-directory",
    directoryReady ? "PASS" : "FAIL",
    directoryReady
      ? platform === "linux"
        ? "Existing directory is readable/writable and has no group/other permissions."
        : "Directory exists and is accessible; Linux ownership/mode must be checked on the target host."
      : directoryError,
  );

  for (const asset of requiredPublicFiles) {
    try {
      const info = await stat(join(rootPath, asset));
      add(
        results,
        `artifact:${asset}`,
        info.isFile() ? "PASS" : "FAIL",
        info.isFile()
          ? "Required built artifact exists."
          : "Expected a regular file.",
      );
    } catch {
      add(
        results,
        `artifact:${asset}`,
        "FAIL",
        "Required built artifact is missing. Run the approved build before packaging.",
      );
    }
  }

  let nginx = "";
  let cidrMap = "";
  let service = "";
  try {
    [nginx, cidrMap, service] = await Promise.all([
      readFile(join(rootPath, nginxPath), "utf8"),
      readFile(join(rootPath, cidrPath), "utf8"),
      readFile(join(rootPath, systemdPath), "utf8"),
    ]);
    const nginxContract =
      /listen\s+443\s+ssl/.test(nginx) &&
      /default\s+0;/.test(nginx) &&
      /proxy_pass\s+http:\/\/127\.0\.0\.1:3001/.test(nginx) &&
      /root\s+\/opt\/cloudacademy\/current\/public/.test(nginx);
    add(
      results,
      "nginx-contract",
      nginxContract ? "PASS" : "FAIL",
      nginxContract
        ? "TLS, deny-default network map, static root and loopback API proxy directives are present."
        : "Nginx template does not satisfy the expected single-host proxy contract.",
    );
    const activeCidrs = cidrMap
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    const networkValuesReady =
      !/REPLACE_WITH_|\.example\.invalid|\.invalid\b/i.test(nginx) &&
      activeCidrs.length > 0 &&
      activeCidrs.every(validAllowlistedNetworkEntry);
    add(
      results,
      "network-placeholders",
      networkValuesReady ? "PASS" : "FAIL",
      networkValuesReady
        ? "Hostname, certificate paths and approved CIDR entries are populated syntactically."
        : "Replace Nginx placeholders and provide at least one syntactically valid approved CIDR; values must come from A3Data Network.",
    );

    const serviceContract =
      /NODE_ENV=staging/.test(service) &&
      /DB_ENGINE=pglite/.test(service) &&
      /DB_DATA_DIR=\/var\/lib\/cloudacademy\/pglite/.test(service) &&
      /ExecStart=.*node backend\/api\/server\.js/.test(service) &&
      /Restart=on-failure/.test(service) &&
      /TimeoutStopSec=(?:1[5-9]|[2-9]\d|\d{3,})/.test(service) &&
      (service.match(/^ExecStart=/gm) || []).length === 1 &&
      !/pm2|cluster/i.test(service);
    add(
      results,
      "systemd-contract",
      serviceContract ? "PASS" : "FAIL",
      serviceContract
        ? "One PGlite API process, persistent path, restart policy and shutdown grace are represented."
        : "systemd unit does not match the single-process PGlite contract.",
    );
  } catch (error) {
    add(
      results,
      "host-templates",
      "FAIL",
      `Required Nginx/systemd template is unavailable: ${error.code || "read_error"}.`,
    );
  }

  try {
    const findings = await walkTextFiles(join(rootPath, "public"), rootPath);
    const leaks = findings.filter((item) => item.credentialLikeValue);
    const oversized = findings.filter((item) => item.oversized);
    const scanPassed = leaks.length === 0 && oversized.length === 0;
    add(
      results,
      "public-credential-scan",
      scanPassed ? "PASS" : "FAIL",
      scanPassed
        ? "No known credential patterns found in scanned text assets."
        : `Credential-like content or files above 20 MiB found in: ${[...leaks, ...oversized].map((item) => item.path).join(", ")}. Values are never printed.`,
    );
  } catch (error) {
    add(
      results,
      "public-credential-scan",
      "FAIL",
      `Unable to scan public artifacts: ${error.code || "read_error"}.`,
    );
  }

  const failed = results.some((result) => result.status !== "PASS");
  return {
    status: failed ? "BLOCKED" : "LOCAL_PREFLIGHT_PASS_EXTERNAL_GATES_OPEN",
    deployAuthorized: false,
    nodeVersionExpected: STAGING_NODE_VERSION,
    checks: results,
    externalGates: [
      "Google OAuth configuration and real identity validation",
      "A3Data approval of individual allowlist and network CIDRs",
      "AWS account/region, hostname/DNS/TLS and firewall verification",
      "Persistent volume lifecycle and encrypted off-host backup/restore",
      "Approved SLO, RPO/RTO, monitoring and incident ownership",
    ],
  };
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  loadDotEnv({ quiet: true });
  const report = await runStagingPreflight();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "BLOCKED") process.exitCode = 1;
}
