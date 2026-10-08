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
  changeUserAccess,
  closeDatabase,
  createUser,
  executeQuery,
  initializeDatabase,
  reviewValidatorRequest,
  removeValidatorCertification,
  updateUser,
} from "../backend/database/db.js";
import app from "../backend/api/server.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import {
  assertMigrationTarget,
  readMigrationTarget,
} from "../backend/database/migrations/target.js";

const integration =
  process.env.DB_ENGINE === "postgres-test" ? describe : describe.skip;
integration("F4.2 PostgreSQL ADMIN and RBAC integrity", () => {
  let admin;
  let server;
  let baseUrl;
  let suffix = 0;

  async function makeUser(role = "STUDENT", isActive = true) {
    suffix += 1;
    const user = await createUser(`F42 ${suffix} ${Date.now()}`);
    await updateUser(user.id, { role, is_active: isActive });
    return user;
  }

  async function activeAdminCount() {
    const rows = await executeQuery(
      "SELECT count(*)::int AS count FROM users WHERE role='ADMIN' AND is_active=TRUE",
    );
    return rows[0].count;
  }

  async function expectStatus(promise, statusCode) {
    await expect(promise).rejects.toMatchObject({ statusCode });
  }

  async function httpRequest(path, token, body) {
    const response = await fetch(`${baseUrl}/api${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

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
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  }, 20000);

  afterAll(async () => {
    await admin?.query(
      "DROP TRIGGER IF EXISTS f42_fail_role_audit ON role_audit_log",
    );
    await admin?.query("DROP FUNCTION IF EXISTS f42_fail_role_audit()");
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    await admin?.end();
  });

  beforeEach(async () => {
    await admin.query("TRUNCATE users RESTART IDENTITY CASCADE");
  });

  test("rejects demotion and deactivation of the sole active ADMIN with 409", async () => {
    const sole = await makeUser("ADMIN");
    expect(await activeAdminCount()).toBe(1);
    await expectStatus(
      changeUserAccess(sole.id, sole.id, { role: "STUDENT" }),
      409,
    );
    await expectStatus(
      changeUserAccess(sole.id, sole.id, { is_active: false }),
      409,
    );
    expect(await activeAdminCount()).toBe(1);
  });

  test("trusted updateUser role mutations share the same last-ADMIN guard", async () => {
    const first = await makeUser("ADMIN");
    const second = await makeUser("ADMIN");
    const results = await Promise.allSettled([
      updateUser(first.id, { role: "STUDENT" }),
      updateUser(second.id, { is_active: false }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected").reason,
    ).toMatchObject({
      statusCode: 409,
    });
    expect(await activeAdminCount()).toBe(1);
  });

  test("serializes two self-demotions across independent PostgreSQL sessions", async () => {
    const first = await makeUser("ADMIN");
    const second = await makeUser("ADMIN");
    const testBarrierKey = 550021337;
    await admin.query(`
      CREATE FUNCTION f42_test_pause_user_update() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
          PERFORM pg_advisory_xact_lock(${testBarrierKey});
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await admin.query(`
      CREATE TRIGGER f42_test_pause_user_update
      BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION f42_test_pause_user_update()
    `);
    await admin.query("SELECT pg_advisory_lock($1::bigint)", [testBarrierKey]);
    const operations = [
      changeUserAccess(first.id, first.id, { role: "STUDENT" }),
      changeUserAccess(second.id, second.id, { role: "STUDENT" }),
    ];
    let operationResults = null;
    const settled = Promise.allSettled(operations).then((results) => {
      operationResults = results;
      return results;
    });

    let waiters = [];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = await admin.query(`
        SELECT pid, wait_event
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND (query ILIKE '%pg_advisory_xact_lock%' OR query ILIKE '%UPDATE users%')
        ORDER BY pid
      `);
      waiters = result.rows;
      if (waiters.length === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const activities = await admin.query(`
      SELECT pid,state,wait_event_type,wait_event,query
      FROM pg_stat_activity
      WHERE datname=current_database() AND pid <> pg_backend_pid()
      ORDER BY pid
    `);
    const controllerPid = admin.processID;
    const diagnostic = {
      waiters,
      otherSessions: activities.rows,
      operationResults,
      controllerPid,
    };
    console.info("F4.2 advisory lock interleaving", {
      controllerPid,
      blockedBackends: waiters.map(({ pid, wait_event }) => ({
        pid,
        wait_event,
        statement: activities.rows.find((activity) => activity.pid === pid)
          ?.query,
      })),
    });
    await admin.query("SELECT pg_advisory_unlock($1::bigint)", [
      testBarrierKey,
    ]);
    const results = await settled;
    if (waiters.length !== 2)
      throw new Error(
        `Expected two PostgreSQL lock waiters: ${JSON.stringify(diagnostic)}`,
      );
    expect(waiters).toHaveLength(2);
    expect(new Set(waiters.map((row) => row.pid)).size).toBe(2);
    expect(waiters.every((row) => row.wait_event === "advisory")).toBe(true);
    expect(waiters.some((row) => row.pid === controllerPid)).toBe(false);
    expect(
      waiters.some((row) =>
        activities.rows.find(
          (activity) =>
            activity.pid === row.pid &&
            activity.query?.includes("pg_advisory_xact_lock"),
        ),
      ),
    ).toBe(true);
    expect(
      waiters.some((row) =>
        activities.rows.find(
          (activity) =>
            activity.pid === row.pid &&
            activity.query?.includes("UPDATE users"),
        ),
      ),
    ).toBe(true);
    await admin.query("DROP TRIGGER f42_test_pause_user_update ON users");
    await admin.query("DROP FUNCTION f42_test_pause_user_update()");
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected").reason,
    ).toMatchObject({
      statusCode: 409,
    });
    expect(await activeAdminCount()).toBe(1);
  }, 15000);

  test("two concurrent deactivations leave one active ADMIN", async () => {
    const first = await makeUser("ADMIN");
    const second = await makeUser("ADMIN");
    const results = await Promise.allSettled([
      changeUserAccess(first.id, first.id, { is_active: false }),
      changeUserAccess(second.id, second.id, { is_active: false }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await activeAdminCount()).toBe(1);
  });

  test("demotion racing deactivation leaves one active ADMIN", async () => {
    const first = await makeUser("ADMIN");
    const second = await makeUser("ADMIN");
    const results = await Promise.allSettled([
      changeUserAccess(first.id, first.id, { role: "VALIDATOR" }),
      changeUserAccess(second.id, second.id, { is_active: false }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(await activeAdminCount()).toBe(1);
  });

  test("promotion concurrent with demotion never removes all active ADMINs", async () => {
    const first = await makeUser("ADMIN");
    const second = await makeUser("ADMIN");
    const candidate = await makeUser("STUDENT");
    const results = await Promise.allSettled([
      changeUserAccess(first.id, first.id, { role: "STUDENT" }),
      changeUserAccess(second.id, candidate.id, { role: "ADMIN" }),
    ]);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    expect(await activeAdminCount()).toBe(2);
  });

  test("concurrent role changes to one target form an auditable transition chain", async () => {
    const actorA = await makeUser("ADMIN");
    const actorB = await makeUser("ADMIN");
    const target = await makeUser("STUDENT");
    await Promise.all([
      changeUserAccess(actorA.id, target.id, { role: "VALIDATOR" }),
      changeUserAccess(actorB.id, target.id, { role: "ADMIN" }),
    ]);
    const [user] = await executeQuery("SELECT role FROM users WHERE id=$1", [
      target.id,
    ]);
    const audits = await executeQuery(
      "SELECT old_role,new_role FROM role_audit_log WHERE target_user_id=$1 AND action='ROLE_CHANGED'",
      [target.id],
    );
    expect(["VALIDATOR", "ADMIN"]).toContain(user.role);
    expect(audits).toHaveLength(2);
    expect(audits.map((row) => row.old_role)).toContain("STUDENT");
    expect(audits.map((row) => row.new_role)).toContain(user.role);
    expect(
      audits.some(
        (row) => row.old_role === "VALIDATOR" || row.old_role === "ADMIN",
      ),
    ).toBe(true);
  });

  test("validator grant racing revoke keeps one certification and matching audit events", async () => {
    const reviewer = await makeUser("ADMIN");
    const revoker = await makeUser("ADMIN");
    const target = await makeUser("VALIDATOR");
    await admin.query(
      `INSERT INTO validator_certifications(user_id,certification_id,verified_by,is_active)
       VALUES ($1,'CLF-C02',$2,TRUE)`,
      [target.id, reviewer.id],
    );
    const request = await admin.query(
      `INSERT INTO validator_requests(user_id,certification_id,status)
       VALUES ($1,'CLF-C02','PENDING') RETURNING id`,
      [target.id],
    );
    await Promise.all([
      reviewValidatorRequest(request.rows[0].id, reviewer.id, "APPROVED"),
      removeValidatorCertification(revoker.id, target.id, "CLF-C02"),
    ]);
    const certs = await executeQuery(
      "SELECT is_active FROM validator_certifications WHERE user_id=$1 AND certification_id='CLF-C02'",
      [target.id],
    );
    const audit = await executeQuery(
      `SELECT action FROM role_audit_log
        WHERE target_user_id=$1 AND certification_id='CLF-C02'
          AND action IN ('VALIDATOR_CERTIFICATION_ADDED','VALIDATOR_CERTIFICATION_REMOVED')`,
      [target.id],
    );
    expect(certs).toHaveLength(1);
    expect(typeof certs[0].is_active).toBe("boolean");
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "VALIDATOR_CERTIFICATION_ADDED",
        "VALIDATOR_CERTIFICATION_REMOVED",
      ]),
    );
  });

  test("non-ADMIN actor and forged role payload are rejected by server-side RBAC", async () => {
    const student = await makeUser("STUDENT");
    const target = await makeUser("STUDENT");
    const response = await httpRequest(
      `/access/admin/users/${target.id}`,
      createSessionToken(student.id),
      { role: "ADMIN", is_active: true, actor_user_id: target.id },
    );
    expect(response.status).toBe(403);
    const [persisted] = await executeQuery(
      "SELECT role FROM users WHERE id=$1",
      [target.id],
    );
    expect(persisted.role).toBe("STUDENT");
    await expectStatus(
      changeUserAccess((await makeUser("VALIDATOR")).id, target.id, {
        role: "ADMIN",
      }),
      403,
    );
  });

  test("last ADMIN conflict is exposed as HTTP 409 and malformed payload as 400", async () => {
    const sole = await makeUser("ADMIN");
    const token = createSessionToken(sole.id);
    const conflict = await httpRequest(
      `/access/admin/users/${sole.id}`,
      token,
      {
        is_active: false,
      },
    );
    expect(conflict.status).toBe(409);
    const malformed = await httpRequest(
      `/access/admin/users/${sole.id}`,
      token,
      {
        is_active: "false",
      },
    );
    expect(malformed.status).toBe(400);
    expect(await activeAdminCount()).toBe(1);
  });

  test("audit failure rolls back role and active state without a success record", async () => {
    const actor = await makeUser("ADMIN");
    const target = await makeUser("STUDENT");
    await admin.query(`
      CREATE FUNCTION f42_fail_role_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'forced audit failure'; END;
      $$
    `);
    await admin.query(`
      CREATE TRIGGER f42_fail_role_audit
      BEFORE INSERT ON role_audit_log FOR EACH ROW EXECUTE FUNCTION f42_fail_role_audit()
    `);
    await expect(
      changeUserAccess(actor.id, target.id, {
        role: "VALIDATOR",
        is_active: false,
      }),
    ).rejects.toThrow();
    await admin.query("DROP TRIGGER f42_fail_role_audit ON role_audit_log");
    await admin.query("DROP FUNCTION f42_fail_role_audit()");

    const [user] = await executeQuery(
      "SELECT role,is_active FROM users WHERE id=$1",
      [target.id],
    );
    const audit = await executeQuery(
      "SELECT id FROM role_audit_log WHERE target_user_id=$1 AND action='ROLE_CHANGED'",
      [target.id],
    );
    expect(user).toMatchObject({ role: "STUDENT", is_active: true });
    expect(audit).toHaveLength(0);
  });

  test("review approval updates request, role, certification, and audit atomically", async () => {
    const reviewer = await makeUser("ADMIN");
    const target = await makeUser("STUDENT");
    const request = await admin.query(
      `INSERT INTO validator_requests(user_id,certification_id,status)
       VALUES ($1,'SAA-C03','PENDING') RETURNING id`,
      [target.id],
    );
    await reviewValidatorRequest(request.rows[0].id, reviewer.id, "APPROVED");
    const [user] = await executeQuery("SELECT role FROM users WHERE id=$1", [
      target.id,
    ]);
    const [validatorRequest] = await executeQuery(
      "SELECT status,reviewed_by FROM validator_requests WHERE id=$1",
      [request.rows[0].id],
    );
    const certs = await executeQuery(
      "SELECT is_active FROM validator_certifications WHERE user_id=$1 AND certification_id='SAA-C03'",
      [target.id],
    );
    const audits = await executeQuery(
      "SELECT action FROM role_audit_log WHERE target_user_id=$1 AND certification_id='SAA-C03'",
      [target.id],
    );
    expect(user.role).toBe("VALIDATOR");
    expect(validatorRequest).toMatchObject({
      status: "APPROVED",
      reviewed_by: reviewer.id,
    });
    expect(certs).toEqual([{ is_active: true }]);
    expect(audits.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "VALIDATOR_REQUEST_APPROVED",
        "VALIDATOR_CERTIFICATION_ADDED",
      ]),
    );
  });

  test("failed authorization and last-ADMIN conflicts create no success audit", async () => {
    const sole = await makeUser("ADMIN");
    const before = await executeQuery(
      "SELECT count(*)::int AS count FROM role_audit_log WHERE target_user_id=$1",
      [sole.id],
    );
    await expectStatus(
      changeUserAccess(sole.id, sole.id, { role: "STUDENT" }),
      409,
    );
    const after = await executeQuery(
      "SELECT count(*)::int AS count FROM role_audit_log WHERE target_user_id=$1",
      [sole.id],
    );
    expect(after[0].count).toBe(before[0].count);
  });
});
