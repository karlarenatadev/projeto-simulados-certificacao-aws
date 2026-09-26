/** @jest-environment node */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  assertMigrationTarget,
  readMigrationTarget,
} from "../backend/database/migrations/target.js";
import { inspectSchema } from "../backend/database/migrations/catalog.js";
import {
  loadMigrations,
  migrationLock,
  runMigrations,
} from "../backend/database/migrations/runner.js";

const integration =
  process.env.PG_MIGRATIONS_INTEGRATION === "1" ? describe : describe.skip;
const tables = [
  "answers",
  "aws_services",
  "case_dialogues",
  "case_evaluation_criteria",
  "case_events",
  "case_progress",
  "case_questions",
  "case_services",
  "cases",
  "domains",
  "focus_sessions",
  "gamification",
  "local_identity_links",
  "questions",
  "quiz_history",
  "quiz_questions",
  "role_audit_log",
  "user_identities",
  "user_module_state",
  "users",
  "validator_certifications",
  "validator_requests",
];
const file = "0001-effective-baseline.sql";
const fixtureDirectories = [];
const executeFile = promisify(execFile);
let target, pool, admin, baseline;
jest.setTimeout(30000);

async function resetTestSchema() {
  await assertMigrationTarget(admin, target);
  // Only the exact test environment/host/user/database with its per-run marker.
  await admin.query(
    "DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS cloudacademy_migrations CASCADE",
  );
}
async function fixtureDirectory(sql = baseline.sql) {
  const directory = await mkdtemp(
    join(tmpdir(), "cloudacademy-f2-migrations-"),
  );
  fixtureDirectories.push(directory);
  await writeFile(join(directory, file), sql);
  await writeFile(
    join(directory, file.replace(".sql", ".schema.json")),
    JSON.stringify(baseline.expected),
  );
  return directory;
}
async function waitFor(query, values = []) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const { rows } = await admin.query(query, values);
    if (rows.length) return rows;
    await delay(30);
  }
  throw new Error("Expected PostgreSQL activity was not observed");
}
const ledger = () =>
  admin.query(
    "SELECT *, xmin::text AS row_version FROM cloudacademy_migrations.history ORDER BY version",
  );

integration(
  "F2 real PostgreSQL migrations (dedicated database, no application runtime)",
  () => {
    beforeAll(async () => {
      target = readMigrationTarget();
      pool = new pg.Pool(target.pool);
      admin = await pool.connect();
      console.info(
        "F2 verified target",
        await assertMigrationTarget(admin, target),
      );
      await admin.query(
        "SET search_path TO public, pg_catalog; SET timezone TO 'UTC'",
      );
      [baseline] = await loadMigrations();
    });
    beforeEach(resetTestSchema);
    afterAll(async () => {
      if (admin) {
        try {
          await resetTestSchema();
        } finally {
          admin.release(true);
          await pool.end();
        }
      }
      for (const directory of fixtureDirectories) {
        const absolute = resolve(directory);
        const allowed = resolve(tmpdir()) + sep;
        if (
          !absolute.startsWith(allowed) ||
          !absolute
            .slice(allowed.length)
            .startsWith("cloudacademy-f2-migrations-")
        ) {
          throw new Error("Refusing cleanup outside owned fixture directory");
        }
        await rm(absolute, { recursive: true, force: true });
      }
    });

    test("empty database gets 22 tables, complete definitions and working extensions without seeds", async () => {
      expect(await runMigrations()).toMatchObject({
        applied: [1],
        currentVersion: 1,
      });
      const schema = await inspectSchema(admin);
      expect(
        schema.relations.filter((t) => t.kind === "r").map((t) => t.name),
      ).toEqual(tables);
      expect(schema.views.map((t) => t.name)).toEqual([
        "leaderboard",
        "user_stats",
      ]);
      expect(schema.enums.map((t) => t.name)).toEqual([
        "case_difficulty",
        "certification_type",
        "difficulty_level",
        "session_type",
      ]);
      expect(schema.constraints).toHaveLength(88);
      expect(schema.indexes).toHaveLength(83);
      expect(schema.triggers).toHaveLength(5);
      expect(schema.functions).toHaveLength(1);
      expect(schema).toEqual(baseline.expected);
      for (const table of tables)
        expect(
          (await admin.query(`SELECT count(*)::int AS count FROM ${table}`))
            .rows[0].count,
        ).toBe(0);
      expect(
        (
          await admin.query(
            "SELECT length(digest('f2','sha256')) AS bytes, similarity('f2','f2') AS similarity, gen_random_uuid()::text AS id",
          )
        ).rows[0],
      ).toEqual({
        bytes: 32,
        similarity: 1,
        id: expect.stringMatching(/^[a-f0-9-]{36}$/),
      });
      expect((await ledger()).rows).toEqual([
        expect.objectContaining({
          version: 1,
          name: "effective-baseline",
          checksum: baseline.checksum,
          schema_checksum: baseline.schemaChecksum,
          runner_version: 1,
          applied_at: expect.any(Date),
        }),
      ]);
      console.info("F2 inventory", {
        tables: 22,
        views: 2,
        enums: 4,
        constraints: 88,
        indexes: 83,
        functions: 1,
        triggers: 5,
        extensions: schema.extensions,
      });
    });
    test("explicit CLI applies, replays and refuses production with sanitized output", async () => {
      const cli = (env = process.env) =>
        executeFile(
          process.execPath,
          ["scripts/database/migrate-postgres.mjs"],
          { env, windowsHide: true, timeout: 20000 },
        );
      expect(JSON.parse((await cli()).stdout)).toMatchObject({ applied: [1] });
      expect(JSON.parse((await cli()).stdout)).toMatchObject({ applied: [] });
      const failure = await cli({
        ...process.env,
        NODE_ENV: "production",
      }).catch((error) => error);
      expect(failure.code).toBe(1);
      expect(JSON.parse(failure.stderr)).toEqual({
        code: "F2_TEST_ENV_REQUIRED",
      });
      expect(failure.stderr).not.toContain(process.env.PG_MIGRATIONS_TEST_URL);
    });
    test("second run changes no definitions, object OIDs or ledger row", async () => {
      await runMigrations();
      const before = await inspectSchema(admin),
        history = (await ledger()).rows;
      const sql =
        "SELECT oid::text,relname FROM pg_class WHERE relnamespace='public'::regnamespace ORDER BY relname";
      const objects = (await admin.query(sql)).rows;
      expect(await runMigrations()).toMatchObject({ applied: [] });
      expect(await inspectSchema(admin)).toEqual(before);
      expect((await ledger()).rows).toEqual(history);
      expect((await admin.query(sql)).rows).toEqual(objects);
    });
    test("edited applied SQL checksum is rejected without rewriting history", async () => {
      await runMigrations();
      const history = (await ledger()).rows;
      const directory = await fixtureDirectory(
        baseline.sql + "\n-- edited after application\n",
      );
      await expect(runMigrations({ directory })).rejects.toMatchObject({
        code: "F2_MIGRATION_CHECKSUM_MISMATCH",
      });
      expect((await ledger()).rows).toEqual(history);
    });
    test("edited applied expected-schema manifest is rejected", async () => {
      await runMigrations();
      const directory = await fixtureDirectory(),
        expected = structuredClone(baseline.expected);
      expected.indexes.pop();
      await writeFile(
        join(directory, file.replace(".sql", ".schema.json")),
        JSON.stringify(expected),
      );
      await expect(runMigrations({ directory })).rejects.toMatchObject({
        code: "F2_MIGRATION_CHECKSUM_MISMATCH",
      });
    });
    test("intermediate failure rolls back DDL, extensions, writes and initial ledger", async () => {
      const directory = await fixtureDirectory(
        baseline.sql +
          "\nINSERT INTO users(anonymous_name) VALUES ('synthetic-rollback'); SELECT 1/0;",
      );
      const error = await runMigrations({ directory }).catch((e) => e);
      expect(error).toMatchObject({
        code: "22012",
        kind: "query",
        phase: "migration",
      });
      expect(JSON.stringify(error)).not.toMatch(
        /synthetic-rollback|INSERT|postgresql:/,
      );
      expect((await inspectSchema(admin)).relations).toEqual([]);
      expect((await inspectSchema(admin)).extensions).toEqual([]);
      expect(
        (
          await admin.query(
            "SELECT to_regnamespace('cloudacademy_migrations') AS name",
          )
        ).rows[0].name,
      ).toBeNull();
      expect(await runMigrations()).toMatchObject({ applied: [1] });
    });
    test("failed later migration preserves committed prefix and releases lock", async () => {
      await runMigrations();
      const history = (await ledger()).rows,
        directory = await fixtureDirectory();
      await writeFile(
        join(directory, "0002-failing.sql"),
        "CREATE TABLE failure_probe(id int); SELECT 1/0;",
      );
      await writeFile(
        join(directory, "0002-failing.schema.json"),
        JSON.stringify(baseline.expected),
      );
      await expect(runMigrations({ directory })).rejects.toMatchObject({
        code: "22012",
      });
      expect(
        (await admin.query("SELECT to_regclass('failure_probe') AS name"))
          .rows[0].name,
      ).toBeNull();
      expect((await ledger()).rows).toEqual(history);
      expect(await runMigrations()).toMatchObject({ applied: [] });
    });
    test("a later version is applied transactionally and replays as a no-op", async () => {
      await runMigrations();
      const directory = await fixtureDirectory();
      const sql =
        "ALTER TABLE users ADD COLUMN fixture_revision bigint NOT NULL DEFAULT 1;";
      await admin.query("BEGIN");
      let expected;
      try {
        await admin.query(sql);
        expected = await inspectSchema(admin);
      } finally {
        await admin.query("ROLLBACK");
      }
      await writeFile(join(directory, "0002-fixture-upgrade.sql"), sql);
      await writeFile(
        join(directory, "0002-fixture-upgrade.schema.json"),
        JSON.stringify(expected),
      );
      expect(await runMigrations({ directory })).toMatchObject({
        applied: [2],
        currentVersion: 2,
      });
      expect((await ledger()).rows.map((entry) => entry.version)).toEqual([
        1, 2,
      ]);
      expect(
        (
          await admin.query(
            "INSERT INTO users(anonymous_name) VALUES ('upgrade-fixture') RETURNING fixture_revision",
          )
        ).rows[0].fixture_revision,
      ).toBe("1");
      expect(await runMigrations({ directory })).toMatchObject({
        applied: [],
        currentVersion: 2,
      });
      await expect(runMigrations()).rejects.toMatchObject({
        code: "F2_MIGRATION_VERSION_UNSUPPORTED",
      });
    });
    test("operations unsupported in transactions fail without an autocommit fallback", async () => {
      await runMigrations();
      const directory = await fixtureDirectory();
      await writeFile(
        join(directory, "0002-nontransactional.sql"),
        "CREATE INDEX CONCURRENTLY forbidden_autocommit ON users(full_name);",
      );
      await writeFile(
        join(directory, "0002-nontransactional.schema.json"),
        JSON.stringify(baseline.expected),
      );
      await expect(runMigrations({ directory })).rejects.toMatchObject({
        code: "25001",
      });
      expect((await ledger()).rows).toHaveLength(1);
      expect(
        (
          await admin.query(
            "SELECT to_regclass('forbidden_autocommit') AS name",
          )
        ).rows[0].name,
      ).toBeNull();
      expect(await runMigrations()).toMatchObject({ applied: [] });
    });
    test("two concurrent runners wait on one session lock and apply exactly once", async () => {
      await admin.query(
        "SELECT pg_advisory_lock($1::int,$2::int)",
        migrationLock,
      );
      const runners = Promise.allSettled([runMigrations(), runMigrations()]);
      try {
        await waitFor(
          "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND classid=$1 AND objid=$2 AND NOT granted HAVING count(*)=2",
          migrationLock,
        );
      } finally {
        await admin.query(
          "SELECT pg_advisory_unlock($1::int,$2::int)",
          migrationLock,
        );
      }
      const results = await runners;
      expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
      expect(results.map((r) => r.value.applied.length).sort()).toEqual([0, 1]);
      expect((await ledger()).rows).toHaveLength(1);
    });
    test.each(["backend termination", "abort signal"])(
      "interruption by %s rolls back and rerun recovers",
      async (mode) => {
        const directory = await fixtureDirectory(
          "CREATE TABLE interruption_probe(id int); SELECT pg_sleep(12);\n" +
            baseline.sql,
        );
        const controller = new AbortController();
        const running = runMigrations({
          directory,
          signal: controller.signal,
        }).then(
          (value) => ({ value }),
          (error) => ({ error }),
        );
        const [{ pid }] = await waitFor(
          "SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND application_name='cloudacademy-f2-migrations' AND pid<>pg_backend_pid() AND state='active' AND query LIKE 'CREATE TABLE interruption_probe%'",
        );
        await assertMigrationTarget(admin, target);
        if (mode === "abort signal") controller.abort();
        else
          await admin.query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=$1 AND datname=current_database() AND usename=current_user AND application_name='cloudacademy-f2-migrations'",
            [pid],
          );
        const result = await running;
        expect(result.error).toBeDefined();
        if (mode === "abort signal")
          expect(result.error.code).toBe("F2_INTERRUPTED");
        expect(await runMigrations()).toMatchObject({ applied: [1] });
        expect(
          (
            await admin.query(
              "SELECT to_regclass('interruption_probe') AS name",
            )
          ).rows[0].name,
        ).toBeNull();
        expect((await ledger()).rows).toHaveLength(1);
      },
    );
    test("unknown migration version is rejected and history remains intact", async () => {
      await runMigrations();
      await admin.query(
        "INSERT INTO cloudacademy_migrations.history(version,name,checksum,schema_checksum,runner_version) SELECT 2,'future-version',checksum,schema_checksum,runner_version FROM cloudacademy_migrations.history",
      );
      const history = (await ledger()).rows;
      await expect(runMigrations()).rejects.toMatchObject({
        code: "F2_MIGRATION_VERSION_UNSUPPORTED",
      });
      expect((await ledger()).rows).toEqual(history);
    });
    test("pre-existing schema without ledger is not adopted or upgraded", async () => {
      await admin.query(
        "CREATE TABLE legacy_sentinel(value text); INSERT INTO legacy_sentinel VALUES ('preserve-me')",
      );
      await expect(runMigrations()).rejects.toMatchObject({
        code: "F2_LEGACY_BASELINE_REFUSED",
      });
      expect((await admin.query("SELECT * FROM legacy_sentinel")).rows).toEqual(
        [{ value: "preserve-me" }],
      );
      expect(
        (
          await admin.query(
            "SELECT to_regclass('cloudacademy_migrations.history') AS name",
          )
        ).rows[0].name,
      ).toBeNull();
    });
    test("legacy objects outside public also prevent baseline adoption", async () => {
      await admin.query(
        "CREATE SCHEMA pgx_legacy_probe; CREATE TABLE pgx_legacy_probe.entries(value text); INSERT INTO pgx_legacy_probe.entries VALUES ('preserve-me')",
      );
      try {
        await expect(runMigrations()).rejects.toMatchObject({
          code: "F2_LEGACY_BASELINE_REFUSED",
        });
        expect(
          (await admin.query("SELECT * FROM pgx_legacy_probe.entries")).rows,
        ).toEqual([{ value: "preserve-me" }]);
        expect((await inspectSchema(admin)).relations).toEqual([]);
      } finally {
        await assertMigrationTarget(admin, target);
        await admin.query("DROP SCHEMA pgx_legacy_probe CASCADE");
      }
    });
    test.each([
      ["index", "DROP INDEX idx_questions_text_search"],
      [
        "constraint",
        "ALTER TABLE user_module_state DROP CONSTRAINT chk_user_module_state_module",
      ],
      ["enum", "ALTER TYPE session_type ADD VALUE 'unexpected'"],
      [
        "default",
        "ALTER TABLE quiz_history ALTER COLUMN status SET DEFAULT 'completed'",
      ],
      [
        "column",
        "ALTER TABLE local_identity_links ALTER COLUMN local_identity_id TYPE varchar(125)",
      ],
      ["trigger", "ALTER TABLE users DISABLE TRIGGER trg_users_updated_at"],
      ["view", "DROP VIEW user_stats"],
      [
        "function",
        "CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$",
      ],
      ["extension", "DROP EXTENSION pg_trgm"],
    ])(
      "all 22 tables existing does not hide drift in %s",
      async (_kind, sql) => {
        await runMigrations();
        await admin.query(sql);
        expect(
          (await inspectSchema(admin)).relations.filter((t) => t.kind === "r"),
        ).toHaveLength(22);
        await expect(runMigrations()).rejects.toMatchObject({
          code: "F2_SCHEMA_DRIFT",
        });
      },
    );
    test("post-migration validation failure rolls back before ledger insertion", async () => {
      const directory = await fixtureDirectory(
        baseline.sql + "\nDROP INDEX idx_questions_text_search;",
      );
      await expect(runMigrations({ directory })).rejects.toMatchObject({
        code: "F2_SCHEMA_DRIFT",
      });
      expect((await inspectSchema(admin)).relations).toEqual([]);
      expect(await runMigrations()).toMatchObject({ applied: [1] });
    });
    test("environment and identity guards reject other targets and ignore production DATABASE_URL", async () => {
      for (const env of [
        { ...process.env, NODE_ENV: "production" },
        {
          ...process.env,
          PG_MIGRATIONS_TEST_URL: undefined,
          DATABASE_URL: process.env.PG_MIGRATIONS_TEST_URL,
        },
        {
          ...process.env,
          PG_MIGRATIONS_TEST_URL:
            "postgres://u:secret@remote.invalid/production",
        },
        {
          ...process.env,
          PG_MIGRATIONS_TEST_URL:
            "postgres://u:secret@127.0.0.1/cloudacademy_f2_test",
        },
      ])
        await expect(runMigrations({ env })).rejects.toThrow();
      await expect(
        runMigrations({
          env: { ...process.env, PG_MIGRATIONS_TEST_TOKEN: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: "F2_TEST_IDENTITY_MISMATCH" });
      expect((await inspectSchema(admin)).relations).toEqual([]);
      expect(
        await runMigrations({
          env: {
            ...process.env,
            DATABASE_URL: "postgres://u:secret@production.invalid/production",
          },
        }),
      ).toMatchObject({ applied: [1] });
    });
    test("local links preserve length, uniqueness, status and restrictive user FK", async () => {
      await runMigrations();
      const {
        rows: [user],
      } = await admin.query(
        "INSERT INTO users(anonymous_name) VALUES ('synthetic-local') RETURNING id",
      );
      const local = "x".repeat(126);
      const {
        rows: [link],
      } = await admin.query(
        "INSERT INTO local_identity_links(local_identity_id,user_id) VALUES ($1,$2) RETURNING *",
        [local, user.id],
      );
      expect(link).toMatchObject({
        status: "pending",
        migration_version: 1,
        completed_at: null,
      });
      await expect(
        admin.query(
          "INSERT INTO local_identity_links(local_identity_id,user_id) VALUES ($1,$2)",
          [local, user.id],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      await expect(
        admin.query(
          "INSERT INTO local_identity_links(local_identity_id,user_id) VALUES ($1,$2)",
          [local + "x", user.id],
        ),
      ).rejects.toMatchObject({ code: "22001" });
      await expect(
        admin.query(
          "UPDATE local_identity_links SET status='completed' WHERE id=$1",
          [link.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        admin.query(
          "UPDATE local_identity_links SET migration_version=0 WHERE id=$1",
          [link.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        admin.query("DELETE FROM users WHERE id=$1", [user.id]),
      ).rejects.toMatchObject({ code: "23503" });
      await admin.query(
        "UPDATE local_identity_links SET status='completed',completed_at=NOW(),updated_at=NOW() WHERE id=$1",
        [link.id],
      );
    });
    test("eight modules, BIGINT, JSONB, UUID and timestamp defaults retain contracts", async () => {
      await runMigrations();
      const {
        rows: [user],
      } = await admin.query(
        "INSERT INTO users(anonymous_name,updated_at) VALUES ('synthetic-types','2000-01-01') RETURNING id",
      );
      for (const module of [
        "journey",
        "sprint",
        "flashcards",
        "labs",
        "diagnostic",
        "preferences",
        "gamification",
        "mistakes",
      ]) {
        const {
          rows: [row],
        } = await admin.query(
          "INSERT INTO user_module_state(user_id,module,state_json,version) VALUES ($1,$2,$3,$4) RETURNING *",
          [user.id, module, { ok: true }, "9223372036854775807"],
        );
        expect(row).toMatchObject({
          user_id: user.id,
          state_json: { ok: true },
          version: "9223372036854775807",
          certification_id: "",
        });
      }
      await expect(
        admin.query(
          "INSERT INTO user_module_state(user_id,module) VALUES ($1,'unknown')",
          [user.id],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        admin.query(
          "INSERT INTO user_module_state(user_id,module) VALUES ($1,'journey')",
          [user.id],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      expect(
        (
          await admin.query(
            "UPDATE users SET nickname='changed' WHERE id=$1 RETURNING updated_at > '2000-01-01'::timestamp AS touched, pg_typeof(updated_at)::text AS type",
            [user.id],
          )
        ).rows[0],
      ).toEqual({ touched: true, type: "timestamp without time zone" });
    });
    test("case RESTRICT, nullable answer FK, quiz lifecycle, views and arrays preserve integrity", async () => {
      await runMigrations();
      const {
        rows: [user],
      } = await admin.query(
        "INSERT INTO users(anonymous_name) VALUES ('synthetic-fk') RETURNING id",
      );
      const {
        rows: [question],
      } =
        await admin.query(`INSERT INTO questions(certification,domain,difficulty,question_text,options,correct_answer,explanation,tags)
      VALUES ('CLF-C02','test','easy','Synthetic question only','["A","B"]','[0]','Test',ARRAY['test']) RETURNING id,tags`);
      expect(question.tags).toEqual(["test"]);
      const {
        rows: [item],
      } = await admin.query(
        "INSERT INTO cases(slug,title,scenario,objective) VALUES ('synthetic','Test','Test','Test') RETURNING id",
      );
      await admin.query(
        "INSERT INTO case_questions(case_id,question_id) VALUES ($1,$2)",
        [item.id, question.id],
      );
      await expect(
        admin.query("DELETE FROM questions WHERE id=$1", [question.id]),
      ).rejects.toMatchObject({ code: "23503" });
      await expect(
        admin.query(
          "INSERT INTO case_questions(case_id,question_id) VALUES ($1,$2)",
          [item.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23503" });
      const {
        rows: [quiz],
      } = await admin.query(
        "INSERT INTO quiz_history(user_id,certification,score,total_questions,percentage) VALUES ($1,'CLF-C02',0,1,0) RETURNING *",
        [user.id],
      );
      expect(quiz).toMatchObject({
        status: "started",
        completed_at: null,
        abandoned_at: null,
        started_at: expect.any(Date),
      });
      expect(
        (
          await admin.query(
            "SELECT total_quizzes FROM user_stats WHERE user_id=$1",
            [user.id],
          )
        ).rows[0].total_quizzes,
      ).toBe("0");
      await expect(
        admin.query("UPDATE quiz_history SET status='completed' WHERE id=$1", [
          quiz.id,
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await admin.query(
        "UPDATE quiz_history SET status='completed',completed_at=NOW() WHERE id=$1",
        [quiz.id],
      );
      expect(
        (
          await admin.query(
            "SELECT total_quizzes FROM user_stats WHERE user_id=$1",
            [user.id],
          )
        ).rows[0].total_quizzes,
      ).toBe("1");
      await admin.query(
        "INSERT INTO answers(quiz_id,question_id,user_answer,is_correct) VALUES ($1,$2,'[0]',true)",
        [quiz.id, question.id],
      );
      await admin.query("DELETE FROM cases WHERE id=$1", [item.id]);
      expect((await admin.query("SELECT * FROM case_questions")).rows).toEqual(
        [],
      );
      await admin.query("DELETE FROM questions WHERE id=$1", [question.id]);
      expect(
        (
          await admin.query(
            "SELECT question_id,membership_enforced FROM answers",
          )
        ).rows,
      ).toEqual([{ question_id: null, membership_enforced: true }]);
      await admin.query("DELETE FROM users WHERE id=$1", [user.id]);
      expect((await admin.query("SELECT * FROM answers")).rows).toEqual([]);
    });
    test("baseline matches effective legacy SQL and JS DDL except documented differences", async () => {
      // Read trusted DDL only. Never import db.js, load .env, open PGlite or seed data.
      const source = (await readFile("backend/database/schema.sql", "utf8"))
        .replace(/\r\n/g, "\n")
        .replace(
          /INSERT INTO domains[\s\S]*?ON CONFLICT \(certification, slug\) DO NOTHING;/,
          "",
        );
      await admin.query(source);
      const js = (await readFile("backend/database/db.js", "utf8")).replace(
        /\r\n/g,
        "\n",
      );
      for (const name of [
        "migrateQuestionIdentity",
        "migrateCaseTranslations",
        "migrateQuizLifecycle",
        "migrateQuizMembership",
        "migrateUserIdentities",
      ]) {
        const start = js.indexOf(`export async function ${name}(`),
          next = js.indexOf("export async function ", start + 1);
        const body = js.slice(
          start,
          next < 0 ? js.indexOf("loadEnvironment(", start) : next,
        );
        const blocks = [...body.matchAll(/database\.exec\(`([\s\S]*?)`\)/g)];
        expect(blocks.length).toBeGreaterThan(0);
        for (const match of blocks) await admin.query(match[1]);
      }
      const links = await readFile("backend/database/localLinks.js", "utf8");
      await admin.query(links.match(/database\.exec\(`([\s\S]*?)`\)/)[1]);
      const legacy = await inspectSchema(admin);
      legacy.constraints = legacy.constraints.filter(
        (c) => c.name !== "chk_users_role",
      );
      legacy.constraints.find(
        (c) => c.name === "case_questions_question_id_fkey",
      ).definition =
        "FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT";
      const canonical = (schema) => ({
        ...schema,
        columns: schema.columns
          .map(({ position: _position, ...column }) => ({
            ...column,
            default_expression:
              column.default_expression === "CURRENT_TIMESTAMP"
                ? "now()"
                : column.default_expression,
          }))
          .sort((a, b) =>
            `${a.relation}.${a.name}`.localeCompare(`${b.relation}.${b.name}`),
          ),
      });
      expect(canonical(legacy)).toEqual(canonical(baseline.expected));
    });
  },
);
