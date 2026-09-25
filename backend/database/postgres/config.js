import { URL } from "node:url";

function invalid(field) {
  // Never include the supplied value (or the URL parser's original error).
  throw new Error(`Invalid PostgreSQL configuration: ${field}`);
}

function integer(env, name, fallback, max = 300_000) {
  const value = env[name] ?? String(fallback);
  if (!/^\d+$/.test(String(value))) invalid(name);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    invalid(name);
  return number;
}

/** Explicit configuration only: no dotenv, pg environment defaults or I/O. */
export function readPostgresConfig(env = process.env) {
  const environment = env.NODE_ENV || "development";
  if (!["development", "test", "production"].includes(environment)) {
    invalid("NODE_ENV");
  }
  let url;
  let user;
  let password;
  let database;
  try {
    const raw = env.DATABASE_URL;
    if (
      typeof raw !== "string" ||
      raw.trim() !== raw ||
      [...raw].some((character) => character.charCodeAt(0) <= 32)
    ) {
      invalid("DATABASE_URL");
    }
    url = new URL(raw);
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    invalid("DATABASE_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !user ||
    !password ||
    !database ||
    database.includes("/") ||
    database.includes("\\") ||
    url.search ||
    url.hash ||
    [user, password, database].some((value) =>
      [...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ),
    )
  ) {
    invalid("DATABASE_URL");
  }
  const port = Number(url.port || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    invalid("DATABASE_URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const local = ["127.0.0.1", "localhost", "::1"].includes(host);
  const sslMode =
    env.DB_SSL_MODE ||
    (local && environment !== "production" ? "disable" : "verify-full");
  if (!["disable", "verify-full"].includes(sslMode)) invalid("DB_SSL_MODE");
  if (
    sslMode === "disable" &&
    (!local || environment === "production" || env.DB_SSL_CA)
  ) {
    invalid("DB_SSL_MODE");
  }
  const statementTimeout = integer(env, "DB_STATEMENT_TIMEOUT_MS", 5000);
  const queryTimeout = integer(
    env,
    "DB_QUERY_TIMEOUT_MS",
    statementTimeout + 1000,
    600_000,
  );
  if (queryTimeout <= statementTimeout) invalid("DB_QUERY_TIMEOUT_MS");
  return {
    pool: {
      host,
      port,
      user,
      password,
      database,
      ssl:
        sslMode === "disable"
          ? false
          : {
              rejectUnauthorized: true,
              ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}),
            },
      max: integer(env, "DB_POOL_MAX", 5, 100),
      connectionTimeoutMillis: integer(env, "DB_CONNECTION_TIMEOUT_MS", 3000),
      idleTimeoutMillis: integer(env, "DB_IDLE_TIMEOUT_MS", 10_000),
      statement_timeout: statementTimeout,
      query_timeout: queryTimeout,
      idle_in_transaction_session_timeout: integer(
        env,
        "DB_TRANSACTION_IDLE_TIMEOUT_MS",
        10_000,
      ),
      application_name: "cloudacademy-postgres-adapter",
      options: "-c timezone=UTC",
    },
    shutdownTimeoutMs: integer(env, "DB_SHUTDOWN_TIMEOUT_MS", 10_000),
  };
}
