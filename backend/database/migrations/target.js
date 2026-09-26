import { readPostgresConfig } from "../postgres/config.js";

export class MigrationError extends Error {
  constructor(code) {
    super(`PostgreSQL migration refused: ${code}`);
    this.name = "MigrationError";
    this.code = code;
  }
}

// F2 is deliberately test-only. Do not reuse DATABASE_URL, dotenv or PG* defaults.
export function readMigrationTarget(env = process.env) {
  if (env.NODE_ENV !== "test") throw new MigrationError("F2_TEST_ENV_REQUIRED");
  const token = env.PG_MIGRATIONS_TEST_TOKEN;
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      token || "",
    )
  ) {
    throw new MigrationError("F2_TEST_TOKEN_REQUIRED");
  }
  const { pool } = readPostgresConfig({
    NODE_ENV: "test",
    DATABASE_URL: env.PG_MIGRATIONS_TEST_URL,
    DB_POOL_MAX: "1",
    DB_CONNECTION_TIMEOUT_MS: "5000",
    DB_STATEMENT_TIMEOUT_MS: "15000",
    DB_QUERY_TIMEOUT_MS: "17000",
    DB_TRANSACTION_IDLE_TIMEOUT_MS: "15000",
  });
  if (
    pool.host !== "127.0.0.1" ||
    pool.database !== "cloudacademy_f2_test" ||
    pool.user !== "cloudacademy_f2_test"
  ) {
    throw new MigrationError("F2_TEST_TARGET_REQUIRED");
  }
  return {
    pool: { ...pool, application_name: "cloudacademy-f2-migrations" },
    token,
  };
}

// Used by both runner and test cleanup BEFORE any DDL or destructive operation.
export async function assertMigrationTarget(client, target) {
  const {
    rows: [identity],
  } = await client.query(`SELECT
    current_database() AS database, session_user AS session_user,
    current_user AS current_user, pg_get_userbyid(datdba) AS owner,
    current_setting('server_version_num')::int AS version,
    pg_is_in_recovery() AS recovery, shobj_description(oid,'pg_database') AS marker
    FROM pg_database WHERE datname=current_database()`);
  if (identity?.version < 160000 || identity?.version >= 170000) {
    throw new MigrationError("F2_POSTGRES_VERSION_UNSUPPORTED");
  }
  if (
    !identity ||
    identity.database !== "cloudacademy_f2_test" ||
    identity.session_user !== "cloudacademy_f2_test" ||
    identity.current_user !== "cloudacademy_f2_test" ||
    identity.owner !== "cloudacademy_f2_test" ||
    identity.recovery ||
    identity.marker !== `cloudacademy-f2-test:${target.token}`
  ) {
    throw new MigrationError("F2_TEST_IDENTITY_MISMATCH");
  }
  return { database: identity.database, version: identity.version };
}
