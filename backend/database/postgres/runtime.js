import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { createHash } from "node:crypto";
import { createPostgresAdapter, readPostgresConfig } from "./index.js";
import { inspectSchema, schemaChecksum } from "../migrations/catalog.js";

const baseline = new URL(
  "../migrations/0001-effective-baseline.sql",
  import.meta.url,
);
const expectedSql = createHash("sha256")
  .update(readFileSync(baseline, "utf8").replace(/\r\n/g, "\n"))
  .digest("hex");
const expectedSchema = schemaChecksum(
  JSON.parse(
    readFileSync(
      new URL(
        "../migrations/0001-effective-baseline.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);

function refused(code) {
  return Object.assign(new Error("PostgreSQL runtime unavailable"), {
    code,
    statusCode: 503,
  });
}

// Existing HTTP clients require safe numeric versions/counts. Never round int8.
function compatibleResult(result) {
  for (const field of result.fields || []) {
    if (field.dataTypeID !== 20) continue;
    for (const row of result.rows) {
      if (row[field.name] === null) continue;
      const number = Number(row[field.name]);
      if (!Number.isSafeInteger(number)) throw refused("PG_UNSAFE_INTEGER");
      row[field.name] = number;
    }
  }
  return result;
}

/** F3 runtime only. Administrative runner and credentials are never imported. */
export function createTestPostgresRuntime(env = process.env) {
  const { pool } = readPostgresConfig(env);
  if (
    env.NODE_ENV !== "test" ||
    pool.host !== "127.0.0.1" ||
    pool.database !== "cloudacademy_f2_test" ||
    pool.user !== "cloudacademy_f3_runtime" ||
    !/^[a-f0-9-]{36}$/.test(env.PG_RUNTIME_TEST_TOKEN || "")
  ) {
    throw refused("PG_TEST_RUNTIME_REQUIRED");
  }
  const adapter = createPostgresAdapter({ env });
  const wrap = (executor) =>
    Object.freeze({
      async query(sql, values = []) {
        return compatibleResult(await executor.query(sql, values));
      },
    });
  async function checkReady() {
    if (adapter.stats().state !== "open") return false;
    try {
      return await adapter.withClient(async (client) => {
        await client.query("SET search_path TO public, pg_catalog");
        const {
          rows: [identity],
        } = await client.query(`SELECT
          current_database() AS database, current_user AS role,
          shobj_description(d.oid,'pg_database') AS marker,
          current_setting('server_version_num')::int AS version,
          r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls AS elevated,
          has_database_privilege(current_user,current_database(),'CREATE') OR
          has_database_privilege(current_user,current_database(),'TEMP') OR
          EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND
            has_schema_privilege(current_user,n.oid,'CREATE')) OR
          EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND pg_has_role(current_user,c.relowner,'MEMBER')) OR
          EXISTS (SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS ddl
          FROM pg_database d JOIN pg_roles r ON r.rolname=current_user
          WHERE d.datname=current_database()`);
        if (
          !identity ||
          identity.database !== pool.database ||
          identity.role !== pool.user ||
          identity.marker !==
            `cloudacademy-f2-test:${env.PG_RUNTIME_TEST_TOKEN}` ||
          identity.version < 160000 ||
          identity.version >= 170000 ||
          identity.elevated ||
          identity.ddl
        )
          return false;
        const { rows } = await client.query(
          "SELECT version,checksum,schema_checksum,runner_version FROM cloudacademy_migrations.history ORDER BY version",
        );
        if (
          rows.length !== 1 ||
          rows[0].version !== 1 ||
          rows[0].runner_version !== 1 ||
          rows[0].checksum !== expectedSql ||
          rows[0].schema_checksum !== expectedSchema
        )
          return false;
        return schemaChecksum(await inspectSchema(client)) === expectedSchema;
      });
    } catch {
      return false;
    }
  }
  return Object.freeze({
    ...wrap(adapter),
    transaction: (work) => adapter.transaction((tx) => work(wrap(tx))),
    close: () => adapter.close(),
    get closed() {
      return adapter.stats().state !== "open";
    },
    checkReady,
  });
}
