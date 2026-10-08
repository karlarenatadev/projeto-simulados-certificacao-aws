/** @jest-environment node */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import pg from "pg";
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  resolveGoogleIdentity,
} from "../backend/database/db.js";
import {
  assertMigrationTarget,
  readMigrationTarget,
} from "../backend/database/migrations/target.js";

const integration =
  process.env.DB_ENGINE === "postgres-test" ? describe : describe.skip;
integration("F4.3 PostgreSQL identity concurrency", () => {
  let admin;

  beforeAll(async () => {
    const target = readMigrationTarget({
      NODE_ENV: "test",
      PG_MIGRATIONS_TEST_URL: process.env.PG_F3_ADMIN_URL,
      PG_MIGRATIONS_TEST_TOKEN: process.env.PG_RUNTIME_TEST_TOKEN,
    });
    admin = new pg.Client(target.pool);
    await admin.connect();
    await assertMigrationTarget(admin, target);
    await initializeDatabase();
  }, 20000);

  afterAll(async () => {
    await admin?.query(
      "DROP TRIGGER IF EXISTS f43_test_pause_user_insert ON users",
    );
    await admin?.query("DROP FUNCTION IF EXISTS f43_test_pause_user_insert()");
    await admin?.query(
      "DROP TRIGGER IF EXISTS f43_test_fail_identity_insert ON user_identities",
    );
    await admin?.query(
      "DROP FUNCTION IF EXISTS f43_test_fail_identity_insert()",
    );
    await closeDatabase();
    await admin?.end();
  });

  beforeEach(async () => {
    await admin.query("TRUNCATE users RESTART IDENTITY CASCADE");
  });

  test("same subject first-login requests converge across independent sessions", async () => {
    const barrier = 550043001;
    await admin.query(`
      CREATE FUNCTION f43_test_pause_user_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(${barrier});
        RETURN NEW;
      END;
      $$
    `);
    await admin.query(`
      CREATE TRIGGER f43_test_pause_user_insert
      BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION f43_test_pause_user_insert()
    `);
    await admin.query("SELECT pg_advisory_lock($1::bigint)", [barrier]);
    const calls = [
      resolveGoogleIdentity({
        subject: "f43-same-sub",
        email: "f43-same@a3data.com.br",
      }),
      resolveGoogleIdentity({
        subject: "f43-same-sub",
        email: "f43-same@a3data.com.br",
      }),
    ];
    let outcomes;
    const settled = Promise.allSettled(calls).then((result) => {
      outcomes = result;
      return result;
    });
    let activities = [];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = await admin.query(`
        SELECT pid, wait_event, query FROM pg_stat_activity
        WHERE datname=current_database() AND pid <> pg_backend_pid()
          AND wait_event_type='Lock'
        ORDER BY pid
      `);
      activities = result.rows;
      if (activities.length >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const waiterPids = activities.map((row) => row.pid);
    await admin.query("SELECT pg_advisory_unlock($1::bigint)", [barrier]);
    await settled;
    await admin.query("DROP TRIGGER f43_test_pause_user_insert ON users");
    await admin.query("DROP FUNCTION f43_test_pause_user_insert()");
    const counts = await admin.query(`
      SELECT (SELECT count(*) FROM users) AS users,
             (SELECT count(*) FROM user_identities WHERE provider='google') AS identities
    `);
    console.info("F4.3 controlled first-login interleaving", {
      controllerPid: admin.processID,
      waiterPids,
      backendPids: waiterPids,
      observedWaitEvents: activities.map((row) => row.wait_event),
      waitingQueries: activities.map((row) => row.query),
      outcomes: outcomes.map((item) =>
        item.status === "fulfilled"
          ? { status: item.status, userId: item.value.user.id }
          : {
              status: item.status,
              code: item.reason.code,
              constraint: item.reason.constraint,
            },
      ),
      counts: counts.rows[0],
    });
    expect(activities).toHaveLength(2);
    expect(new Set(waiterPids).size).toBe(2);
    expect(activities.every((row) => row.wait_event === "advisory")).toBe(true);
    expect(
      activities.some((row) => row.query.includes("pg_advisory_xact_lock")),
    ).toBe(true);
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(
      2,
    );
    expect(new Set(outcomes.map((item) => item.value.user.id)).size).toBe(1);
    expect(counts.rows[0]).toEqual({ users: "1", identities: "1" });
  });

  test("same normalized email and subject converge and preserve an existing role", async () => {
    const calls = [
      resolveGoogleIdentity({
        subject: "f43-case-sub",
        email: "F43-Case@a3data.com.br",
      }),
      resolveGoogleIdentity({
        subject: "f43-case-sub",
        email: "f43-case@a3data.com.br",
      }),
    ];
    const [first, second] = await Promise.all(calls);
    expect(first.user.id).toBe(second.user.id);
    expect(first.user.email).toBe("f43-case@a3data.com.br");
    expect(first.user.role).toBe("STUDENT");
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM users"),
    ).toEqual([{ count: 1 }]);
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM user_identities"),
    ).toEqual([{ count: 1 }]);
  });

  test("same email with different subjects returns one success and one explicit conflict", async () => {
    const results = await Promise.allSettled([
      resolveGoogleIdentity({
        subject: "f43-email-sub-a",
        email: "f43-shared@a3data.com.br",
      }),
      resolveGoogleIdentity({
        subject: "f43-email-sub-b",
        email: "f43-shared@a3data.com.br",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected").reason,
    ).toMatchObject({ statusCode: 409 });
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM users"),
    ).toEqual([{ count: 1 }]);
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM user_identities"),
    ).toEqual([{ count: 1 }]);
  });

  test("existing subject is stable and concurrent calls never change its owner", async () => {
    const created = await resolveGoogleIdentity({
      subject: "f43-stable-sub",
      email: "f43-stable@a3data.com.br",
    });
    const results = await Promise.all([
      resolveGoogleIdentity({
        subject: "f43-stable-sub",
        email: "f43-stable@a3data.com.br",
      }),
      resolveGoogleIdentity({
        subject: "f43-stable-sub",
        email: "f43-stable@a3data.com.br",
      }),
    ]);
    expect(results.every((result) => result.user.id === created.user.id)).toBe(
      true,
    );
    const identities = await executeQuery(
      "SELECT DISTINCT user_id::text AS user_id FROM user_identities WHERE subject='f43-stable-sub'",
    );
    expect(identities).toEqual([{ user_id: created.user.id }]);
  });

  test("links an existing unlinked account once and preserves its server role", async () => {
    const [user] = await executeQuery(
      "INSERT INTO users (email, role) VALUES ($1, 'VALIDATOR') RETURNING id::text AS id, role, email",
      ["f43-existing@a3data.com.br"],
    );
    const results = await Promise.all([
      resolveGoogleIdentity({
        subject: "f43-existing-sub",
        email: user.email,
      }),
      resolveGoogleIdentity({
        subject: "f43-existing-sub",
        email: "F43-Existing@a3data.com.br",
      }),
    ]);
    expect(results.every((result) => result.user.id === user.id)).toBe(true);
    expect(results.every((result) => result.user.role === "VALIDATOR")).toBe(
      true,
    );
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM users"),
    ).toEqual([{ count: 1 }]);
  });

  test("inactive account remains inactive and returns 403", async () => {
    await executeQuery(
      "INSERT INTO users (email, role, is_active) VALUES ($1, 'STUDENT', FALSE)",
      ["f43-inactive@a3data.com.br"],
    );
    const results = await Promise.allSettled([
      resolveGoogleIdentity({
        subject: "f43-inactive-sub",
        email: "f43-inactive@a3data.com.br",
      }),
      resolveGoogleIdentity({
        subject: "f43-inactive-sub",
        email: "f43-inactive@a3data.com.br",
      }),
    ]);
    expect(
      results.every(
        (result) =>
          result.status === "rejected" && result.reason.statusCode === 403,
      ),
    ).toBe(true);
    expect(
      await executeQuery("SELECT is_active FROM users WHERE email=$1", [
        "f43-inactive@a3data.com.br",
      ]),
    ).toEqual([{ is_active: false }]);
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM user_identities"),
    ).toEqual([{ count: 0 }]);
  });

  test("does not reassign an existing subject on email conflict", async () => {
    const identityOwner = await resolveGoogleIdentity({
      subject: "f43-owner-sub",
      email: "f43-owner@a3data.com.br",
    });
    await executeQuery(
      "INSERT INTO users (email, role) VALUES ($1, 'STUDENT')",
      ["f43-other@a3data.com.br"],
    );
    await expect(
      resolveGoogleIdentity({
        subject: "f43-owner-sub",
        email: "f43-other@a3data.com.br",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    const rows = await executeQuery(
      "SELECT user_id::text AS user_id FROM user_identities WHERE subject='f43-owner-sub'",
    );
    expect(rows).toEqual([{ user_id: identityOwner.user.id }]);
  });

  test("rolls back user creation when identity insertion fails, then retry converges", async () => {
    await admin.query(`
      CREATE FUNCTION f43_test_fail_identity_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'f43 controlled identity failure'; END $$
    `);
    await admin.query(`
      CREATE TRIGGER f43_test_fail_identity_insert
      BEFORE INSERT ON user_identities FOR EACH ROW EXECUTE FUNCTION f43_test_fail_identity_insert()
    `);
    await expect(
      resolveGoogleIdentity({
        subject: "f43-rollback-sub",
        email: "f43-rollback@a3data.com.br",
      }),
    ).rejects.toBeDefined();
    await admin.query(
      "DROP TRIGGER f43_test_fail_identity_insert ON user_identities",
    );
    await admin.query("DROP FUNCTION f43_test_fail_identity_insert()");
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM users"),
    ).toEqual([{ count: 0 }]);
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM user_identities"),
    ).toEqual([{ count: 0 }]);
    const retry = await resolveGoogleIdentity({
      subject: "f43-rollback-sub",
      email: "f43-rollback@a3data.com.br",
    });
    expect(retry.user.role).toBe("STUDENT");
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM user_identities"),
    ).toEqual([{ count: 1 }]);
  });
});
