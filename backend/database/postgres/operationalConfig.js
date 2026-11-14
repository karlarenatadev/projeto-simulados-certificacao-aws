import { isIP } from "node:net";
import { URL } from "node:url";
import { readPostgresConfig } from "./config.js";

function invalid(field) {
  throw new Error(`Invalid operational PostgreSQL configuration: ${field}`);
}

/** Runtime contract for staging/production; deliberately separate from F3. */
export function readOperationalPostgresConfig(env = process.env) {
  if (env.DB_ENGINE !== "postgres") invalid("DB_ENGINE");
  if (!["staging", "production"].includes(env.NODE_ENV)) invalid("NODE_ENV");
  if (!Object.hasOwn(env, "TRUST_PROXY")) invalid("TRUST_PROXY");
  if (!Object.hasOwn(env, "CORS_ALLOWED_ORIGINS"))
    invalid("CORS_ALLOWED_ORIGINS");
  if (!env.AUTH_SESSION_SECRET || !env.AUTH_ALLOWED_DOMAINS)
    invalid("AUTH_SESSION_SECRET/AUTH_ALLOWED_DOMAINS");
  if (
    !env.PORT ||
    !/^\d+$/.test(env.PORT) ||
    Number(env.PORT) < 1 ||
    Number(env.PORT) > 65535
  )
    invalid("PORT");

  const allowedDomains = env.AUTH_ALLOWED_DOMAINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !allowedDomains.length ||
    allowedDomains.some(
      (domain) =>
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain),
    )
  )
    invalid("AUTH_ALLOWED_DOMAINS");

  const origins = env.CORS_ALLOWED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const parsed = new URL(origin);
        return (
          parsed.origin !== origin ||
          parsed.username ||
          parsed.password ||
          parsed.pathname !== "/" ||
          parsed.search ||
          parsed.hash ||
          parsed.protocol !== "https:"
        );
      } catch {
        return true;
      }
    })
  )
    invalid("CORS_ALLOWED_ORIGINS");

  const googleClientId = (env.GOOGLE_CLIENT_ID || "").trim();
  if (!/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(googleClientId))
    invalid("GOOGLE_CLIENT_ID");
  const secret = env.AUTH_SESSION_SECRET;
  if (
    Buffer.byteLength(secret) < 32 ||
    new Set(secret).size < 8 ||
    /replace_with|changeme|your_secret/i.test(secret)
  )
    invalid("AUTH_SESSION_SECRET");

  const trustProxy = env.TRUST_PROXY.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const entry of trustProxy) {
    const [address, prefix, extra] = entry.split("/");
    const family = isIP(address);
    if (
      !family ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) > (family === 4 ? 32 : 128) ||
          Number(prefix) === 0))
    )
      invalid("TRUST_PROXY");
  }

  const testToken = env.PG_OPERATIONAL_TEST_TOKEN || "";
  if (
    testToken &&
    (!/^[a-f0-9-]{36}$/.test(testToken) || env.NODE_ENV !== "staging")
  )
    invalid("PG_OPERATIONAL_TEST_TOKEN");
  const localHarness = Boolean(testToken) && /^[a-f0-9-]{36}$/.test(testToken);
  const database = readPostgresConfig(env);
  if (database.pool.ssl === false) {
    const isExactHarness =
      localHarness &&
      ["127.0.0.1", "localhost", "::1"].includes(database.pool.host) &&
      database.pool.database === "cloudacademy_f2_test" &&
      database.pool.user === "cloudacademy_operational_runtime" &&
      env.DB_SSL_MODE === "disable";
    if (!isExactHarness) invalid("DB_SSL_MODE");
  } else if (env.DB_SSL_MODE !== "verify-full") {
    invalid("DB_SSL_MODE");
  }

  if (
    localHarness &&
    (!["127.0.0.1", "localhost", "::1"].includes(database.pool.host) ||
      database.pool.database !== "cloudacademy_f2_test" ||
      database.pool.user !== "cloudacademy_operational_runtime")
  )
    invalid("PG_OPERATIONAL_TEST_TOKEN");

  const shutdownTimeoutMs = Number(env.DB_SHUTDOWN_TIMEOUT_MS ?? 4000);
  if (
    !Number.isInteger(shutdownTimeoutMs) ||
    shutdownTimeoutMs < 1 ||
    shutdownTimeoutMs > 5000
  )
    invalid("DB_SHUTDOWN_TIMEOUT_MS");
  database.shutdownTimeoutMs = shutdownTimeoutMs;
  return Object.freeze({
    ...database,
    environment: env.NODE_ENV,
    testToken: localHarness ? testToken : null,
    corsAllowedOrigins: Object.freeze(origins),
    allowedDomains: Object.freeze(allowedDomains),
  });
}
