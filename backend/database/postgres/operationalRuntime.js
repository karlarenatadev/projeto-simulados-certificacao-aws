import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { createPostgresAdapter } from "./index.js";
import { readOperationalPostgresConfig } from "./operationalConfig.js";
import { inspectSchema, schemaChecksum } from "../migrations/catalog.js";

const baselineSqlUrl = new URL(
  "../migrations/0001-effective-baseline.sql",
  import.meta.url,
);
const baselineSchemaUrl = new URL(
  "../migrations/0001-effective-baseline.schema.json",
  import.meta.url,
);
const expectedSql = createHash("sha256")
  .update(readFileSync(baselineSqlUrl, "utf8").replace(/\r\n/g, "\n"))
  .digest("hex");
const expectedSchema = schemaChecksum(
  JSON.parse(readFileSync(baselineSchemaUrl, "utf8")),
);

function unavailable(code = "PG_OPERATIONAL_NOT_READY") {
  return Object.assign(
    new Error("Operational PostgreSQL runtime is not ready"),
    { statusCode: 503, code },
  );
}

function compatibleResult(result) {
  for (const field of result.fields || []) {
    if (field.dataTypeID !== 20) continue;
    for (const row of result.rows) {
      if (row[field.name] === null) continue;
      const number = Number(row[field.name]);
      if (!Number.isSafeInteger(number)) throw unavailable("PG_UNSAFE_INTEGER");
      row[field.name] = number;
    }
  }
  return result;
}

function compatibleExecutor(executor) {
  return Object.freeze({
    async query(sql, values = []) {
      return compatibleResult(await executor.query(sql, values));
    },
  });
}

/** Operational runtime. It never imports or invokes an F2 migration runner. */
export function createOperationalPostgresRuntime(env = process.env) {
  const config = readOperationalPostgresConfig(env);
  const adapter = createPostgresAdapter({
    env: { ...env, DB_SHUTDOWN_TIMEOUT_MS: String(config.shutdownTimeoutMs) },
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
          ,NOT has_schema_privilege(current_user,'public','USAGE') OR
            NOT has_schema_privilege(current_user,'cloudacademy_migrations','USAGE') OR
            EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS p(privilege)
              WHERE n.nspname='public' AND c.relkind IN ('r','p') AND
                NOT has_table_privilege(current_user,c.oid,p.privilege)) OR
            EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              CROSS JOIN unnest(ARRAY['USAGE','SELECT']) AS p(privilege)
              WHERE n.nspname='public' AND c.relkind='S' AND
                NOT has_sequence_privilege(current_user,c.oid,p.privilege)) OR
            NOT has_table_privilege(current_user,'cloudacademy_migrations.history','SELECT') AS permissions_missing
          FROM pg_database d JOIN pg_roles r ON r.rolname=current_user
          WHERE d.datname=current_database()`);
        if (
          !identity ||
          identity.database !== config.pool.database ||
          identity.role !== config.pool.user ||
          identity.version < 160000 ||
          identity.version >= 170000 ||
          identity.elevated ||
          identity.ddl ||
          identity.permissions_missing
        )
          return false;
        if (
          config.testToken &&
          identity.marker !== `cloudacademy-f2-test:${config.testToken}`
        )
          return false;
        const { rows: ledger } = await client.query(
          "SELECT version,checksum,schema_checksum,runner_version FROM cloudacademy_migrations.history ORDER BY version",
        );
        if (
          ledger.length !== 1 ||
          ledger[0].version !== 1 ||
          ledger[0].runner_version !== 1 ||
          ledger[0].checksum !== expectedSql ||
          ledger[0].schema_checksum !== expectedSchema
        )
          return false;
        return schemaChecksum(await inspectSchema(client)) === expectedSchema;
      });
    } catch {
      return false;
    }
  }

  const wrap = (executor) => compatibleExecutor(executor);
  return Object.freeze({
    query: (sql, values = []) =>
      adapter.query(sql, values).then(compatibleResult),
    executeQuery: async (sql, values = []) =>
      compatibleResult(await adapter.query(sql, values)).rows,
    exec: async (sql) => adapter.query(sql).then(compatibleResult),
    transaction: (work) => adapter.transaction((tx) => work(wrap(tx))),
    withClient: (work) => adapter.withClient((client) => work(wrap(client))),
    close: () => adapter.close(),
    stats: () => adapter.stats(),
    checkReady,
    get closed() {
      return adapter.stats().state !== "open";
    },
  });
}
