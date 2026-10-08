import pg from "pg";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";
import { classifyPostgresError } from "../postgres/errors.js";
import { inspectSchema, schemaChecksum } from "./catalog.js";
import {
  assertMigrationTarget,
  MigrationError,
  readMigrationTarget,
} from "./target.js";

export const migrationDirectory = fileURLToPath(new URL("./", import.meta.url));
// Session lock covers ledger bootstrap, inspection and every migration transaction.
export const migrationLock = [1144270386, 2];

export async function loadMigrations(directory = migrationDirectory) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (!files.length) throw new MigrationError("F2_NO_MIGRATIONS");
  return Promise.all(
    files.map(async (file, index) => {
      const match = /^(\d{4})-([a-z][a-z0-9-]*)\.sql$/.exec(file);
      if (!match || Number(match[1]) !== index + 1) {
        throw new MigrationError("F2_INVALID_MIGRATION_SEQUENCE");
      }
      const sql = (await readFile(join(directory, file), "utf8")).replace(
        /\r\n/g,
        "\n",
      );
      const expected = JSON.parse(
        await readFile(
          join(directory, file.replace(/\.sql$/, ".schema.json")),
          "utf8",
        ),
      );
      return {
        version: Number(match[1]),
        name: match[2],
        sql,
        expected,
        checksum: createHash("sha256").update(sql).digest("hex"),
        schemaChecksum: schemaChecksum(expected),
      };
    }),
  );
}

async function validateSchema(client, migration) {
  const actual = await inspectSchema(client);
  if (schemaChecksum(actual) !== migration.schemaChecksum) {
    throw new MigrationError("F2_SCHEMA_DRIFT");
  }
  return actual;
}

async function assertEmpty(client) {
  const {
    rows: [row],
  } = await client.query(`SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public') +
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public') +
    (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public') +
    (SELECT count(*) FROM pg_namespace
      WHERE nspname NOT IN ('public','information_schema')
        AND nspname !~ '^pg_') AS objects`);
  if (row.objects !== "0")
    throw new MigrationError("F2_LEGACY_BASELINE_REFUSED");
}

const ledgerDDL = `CREATE SCHEMA cloudacademy_migrations;
  CREATE TABLE cloudacademy_migrations.history (
    version integer PRIMARY KEY CHECK (version > 0),
    name text NOT NULL UNIQUE,
    checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
    schema_checksum text NOT NULL CHECK (schema_checksum ~ '^[a-f0-9]{64}$'),
    runner_version integer NOT NULL CHECK (runner_version = 1),
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )`;

/** Explicit F2 entrypoint. No imports from PGlite/API and no global pool queries. */
export async function runMigrations({
  env = process.env,
  directory = migrationDirectory,
  signal,
} = {}) {
  const target = readMigrationTarget(env);
  const migrations = await loadMigrations(directory);
  const pool = new pg.Pool(target.pool);
  let client;
  let released = false;
  let locked = false;
  let inTransaction = false;
  let phase = "connect";
  const release = () => {
    if (client && !released) {
      released = true;
      client.release(true); // Dedicated administrative session never returns dirty to a pool.
    }
  };
  const abort = () => release();
  try {
    if (signal?.aborted) throw new MigrationError("F2_INTERRUPTED");
    client = await pool.connect();
    client.on("error", () => {}); // Active backend termination must reject work, not crash Node.
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) throw new MigrationError("F2_INTERRUPTED");
    phase = "identity";
    const identity = await assertMigrationTarget(client, target);
    await client.query("SET search_path TO public, pg_catalog");
    await client.query("SET timezone TO 'UTC'");
    phase = "lock";
    await client.query(
      "SELECT pg_advisory_lock($1::int,$2::int)",
      migrationLock,
    );
    locked = true;
    phase = "ledger";
    const {
      rows: [state],
    } = await client.query(
      "SELECT to_regclass('cloudacademy_migrations.history') AS ledger",
    );
    let history = [];
    if (state.ledger) {
      history = (
        await client.query(
          "SELECT * FROM cloudacademy_migrations.history ORDER BY version",
        )
      ).rows;
      if (!history.length) throw new MigrationError("F2_INVALID_LEDGER");
      for (const [index, entry] of history.entries()) {
        const migration = migrations[index];
        if (
          !migration ||
          entry.version !== migration.version ||
          entry.runner_version !== 1
        ) {
          throw new MigrationError("F2_MIGRATION_VERSION_UNSUPPORTED");
        }
        if (
          entry.name !== migration.name ||
          entry.checksum !== migration.checksum ||
          entry.schema_checksum !== migration.schemaChecksum
        ) {
          throw new MigrationError("F2_MIGRATION_CHECKSUM_MISMATCH");
        }
      }
      await validateSchema(client, migrations[history.length - 1]);
    } else {
      await assertEmpty(client);
    }
    const applied = [];
    for (const migration of migrations.slice(history.length)) {
      phase = "migration";
      await client.query("BEGIN");
      inTransaction = true;
      if (!state.ledger && !applied.length) await client.query(ledgerDDL);
      // Trusted, versioned SQL may contain function bodies and multiple statements.
      // It owns no BEGIN/COMMIT and uses this SAME reserved client throughout.
      await client.query(migration.sql);
      await validateSchema(client, migration);
      await client.query(
        `INSERT INTO cloudacademy_migrations.history
        (version,name,checksum,schema_checksum,runner_version) VALUES ($1,$2,$3,$4,1)`,
        [
          migration.version,
          migration.name,
          migration.checksum,
          migration.schemaChecksum,
        ],
      );
      phase = "commit";
      await client.query("COMMIT");
      inTransaction = false;
      applied.push(migration.version);
    }
    return { ...identity, applied, currentVersion: migrations.at(-1).version };
  } catch (error) {
    if (client && inTransaction && !released) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* Disconnect also rolls back on server. */
      }
    }
    if (signal?.aborted) {
      const interrupted = new MigrationError("F2_INTERRUPTED");
      if (phase === "commit") interrupted.commitOutcome = "unknown";
      throw interrupted;
    }
    if (error instanceof MigrationError) throw error;
    const safe = classifyPostgresError(error, phase);
    if (phase === "commit") safe.commitOutcome = "unknown";
    throw safe;
  } finally {
    signal?.removeEventListener("abort", abort);
    if (client && locked && !released) {
      try {
        await client.query(
          "SELECT pg_advisory_unlock($1::int,$2::int)",
          migrationLock,
        );
      } catch {
        /* release destroys session */
      }
    }
    release();
    await pool.end();
  }
}
