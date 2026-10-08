/** @jest-environment node */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import { randomUUID } from "node:crypto";
import pg from "pg";
import app from "../backend/api/server.js";
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  insertQuestion,
} from "../backend/database/db.js";
import { createSessionToken } from "../backend/api/services/sessionToken.js";
import {
  assertMigrationTarget,
  readMigrationTarget,
} from "../backend/database/migrations/target.js";

const integration =
  process.env.DB_ENGINE === "postgres-test" ? describe : describe.skip;
const questionInput = (overrides = {}) => ({
  certification: "CLF-C02",
  language: "en",
  source_question_id: `f44-${randomUUID()}`,
  domain: "cloud-concepts",
  difficulty: "easy",
  question_text: "Which AWS feature provides isolated virtual networks?",
  options: ["Amazon VPC", "Amazon S3"],
  correct_answer: [0],
  explanation: "Amazon VPC provides logically isolated virtual networks.",
  ...overrides,
});

integration("F4.4 editorial authorization on real PostgreSQL", () => {
  let admin;
  let server;
  let baseUrl;

  async function makeUser(role, email = `f44-${randomUUID()}@a3data.com.br`) {
    const rows = await executeQuery(
      "INSERT INTO users (email, role, is_active) VALUES ($1, $2, TRUE) RETURNING id::text AS id, role",
      [email, role],
    );
    return rows[0];
  }

  async function assign(userId, certificationId, isActive = true) {
    await executeQuery(
      `INSERT INTO validator_certifications
        (user_id, certification_id, verified_by, is_active)
       VALUES ($1, $2, $3, $4)`,
      [userId, certificationId, userId, isActive],
    );
  }

  async function request(user, method, path, body) {
    const route = path.startsWith("/access/")
      ? `/api${path}`
      : `/api/questions${path}`;
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createSessionToken(user.id)}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    await admin?.end();
  });

  beforeEach(async () => {
    await admin.query("TRUNCATE questions, users RESTART IDENTITY CASCADE");
  });

  test("STUDENT cannot create or edit through the HTTP surface", async () => {
    const student = await makeUser("STUDENT");
    const question = await insertQuestion(questionInput());
    expect((await request(student, "POST", "", questionInput())).status).toBe(
      403,
    );
    expect(
      (
        await request(student, "PUT", `/${question.id}`, {
          question_text: "Student forged editorial change.",
        })
      ).status,
    ).toBe(403);
  });

  test("VALIDATOR creates and edits only content in an assigned certification", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    const allowed = await insertQuestion(questionInput());
    const edit = await request(validator, "PUT", `/${allowed.id}`, {
      question_text: "Updated question within assigned certification scope.",
      reference: "https://docs.aws.amazon.com/",
    });
    const create = await request(
      validator,
      "POST",
      "",
      questionInput({
        source_question_id: `f44-created-${randomUUID()}`,
      }),
    );
    expect(edit.status).toBe(200);
    expect(edit.body.data.reference_url).toBe("https://docs.aws.amazon.com/");
    expect(create.status).toBe(201);
    expect(create.body.data.validation_status).toBe("PENDING");
  });

  test("VALIDATOR cannot edit, delete or validate a resource in another certification", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    const question = await insertQuestion(
      questionInput({ certification: "SAA-C03" }),
    );
    const before = await executeQuery(
      "SELECT question_text, validation_status, is_active FROM questions WHERE id=$1",
      [question.id],
    );
    const edit = await request(validator, "PUT", `/${question.id}`, {
      question_text: "Unauthorized edit must not be persisted.",
    });
    const deletion = await request(validator, "DELETE", `/${question.id}`);
    const validation = await request(
      validator,
      "POST",
      `/${question.id}/validate`,
      {
        status: "APPROVED",
      },
    );
    const after = await executeQuery(
      "SELECT question_text, validation_status, is_active FROM questions WHERE id=$1",
      [question.id],
    );
    expect([edit.status, deletion.status, validation.status]).toEqual([
      403, 403, 403,
    ]);
    expect(after).toEqual(before);
  });

  test("VALIDATOR cannot forge destination certification when moving A to B", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    const question = await insertQuestion(questionInput());
    const result = await request(validator, "PUT", `/${question.id}`, {
      certification: "SAA-C03",
      question_text: "Attempted move outside assigned destination.",
    });
    const rows = await executeQuery(
      "SELECT certification, question_text FROM questions WHERE id=$1",
      [question.id],
    );
    expect(result.status).toBe(403);
    expect(rows[0].certification).toBe("CLF-C02");
    expect(rows[0].question_text).toBe(question.question_text);
  });

  test("VALIDATOR can move content only when authorized for both source and destination", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    await assign(validator.id, "SAA-C03");
    const question = await insertQuestion(questionInput());
    const result = await request(validator, "PUT", `/${question.id}`, {
      certification: "SAA-C03",
      question_text: "Move within both assigned certification scopes.",
    });
    expect(result.status).toBe(200);
    expect(result.body.data.certification).toBe("SAA-C03");
  });

  test("server-owned fields cannot be mass-assigned on create or update", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    const question = await insertQuestion(questionInput());
    const before = await executeQuery(
      "SELECT validation_status, validated_by, validated_by_id, validation_logs FROM questions WHERE id=$1",
      [question.id],
    );
    const create = await request(validator, "POST", "", {
      ...questionInput({ source_question_id: `f44-forged-${randomUUID()}` }),
      validation_status: "APPROVED",
      validated_by: "forged-reviewer",
      approved_by: validator.id,
      role: "ADMIN",
      user_id: validator.id,
    });
    const forgedUpdates = [
      { validation_status: "APPROVED" },
      { validated_by: "forged-reviewer" },
      { validated_at: "2020-01-01T00:00:00.000Z" },
      { validation_logs: [{ action: "APPROVED" }] },
      { reviewer_id: validator.id },
      { approved_by: validator.id },
      { role: "ADMIN" },
      { user_id: validator.id },
      { is_active: false },
    ];
    const results = await Promise.all(
      forgedUpdates.map((payload) =>
        request(validator, "PUT", `/${question.id}`, payload),
      ),
    );
    const after = await executeQuery(
      "SELECT validation_status, validated_by, validated_by_id, validation_logs FROM questions WHERE id=$1",
      [question.id],
    );
    expect(create.status).toBe(400);
    expect(results.every((result) => result.status === 400)).toBe(true);
    expect(after).toEqual(before);
    expect(
      await executeQuery("SELECT count(*)::int AS count FROM questions"),
    ).toEqual([{ count: 1 }]);
  });

  test("validation derives reviewer from authenticated actor and enforces real resource scope", async () => {
    const validator = await makeUser("VALIDATOR");
    await assign(validator.id, "CLF-C02");
    const question = await insertQuestion(questionInput());
    const result = await request(
      validator,
      "POST",
      `/${question.id}/validate`,
      {
        status: "APPROVED",
        validated_by: "forged-reviewer",
        reviewer_id: "another-user",
        role: "ADMIN",
        user_id: "another-user",
      },
    );
    expect(result.status).toBe(200);
    expect(result.body.data.validated_by).toBe(validator.id);
    const saved = await executeQuery(
      "SELECT validated_by, validated_by_id::text AS validated_by_id FROM questions WHERE id=$1",
      [question.id],
    );
    expect(saved).toEqual([
      { validated_by: validator.id, validated_by_id: validator.id },
    ]);
  });

  test("ADMIN can edit, create and delete across certifications without validator assignment", async () => {
    const adminUser = await makeUser("ADMIN");
    const question = await insertQuestion(
      questionInput({ certification: "SAA-C03" }),
    );
    const edit = await request(adminUser, "PUT", `/${question.id}`, {
      question_text:
        "Administrator updates content without validator assignment.",
    });
    const create = await request(
      adminUser,
      "POST",
      "",
      questionInput({
        certification: "SAA-C03",
        source_question_id: `f44-admin-${randomUUID()}`,
      }),
    );
    const validationTarget = await insertQuestion(
      questionInput({
        certification: "SAA-C03",
        source_question_id: `f44-admin-review-${randomUUID()}`,
      }),
    );
    const validation = await request(
      adminUser,
      "POST",
      `/${validationTarget.id}/validate`,
      { status: "APPROVED" },
    );
    const deletion = await request(adminUser, "DELETE", `/${question.id}`);
    expect(edit.status).toBe(200);
    expect(create.status).toBe(201);
    expect(create.body.data.validation_status).toBe("PENDING");
    expect(validation.status).toBe(200);
    expect(deletion.status).toBe(200);
  });

  test("missing resources return 404 and invalid editorial payload returns 400", async () => {
    const adminUser = await makeUser("ADMIN");
    const missingId = randomUUID();
    expect(
      (
        await request(adminUser, "PUT", `/${missingId}`, {
          question_text: "Unknown question request.",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(adminUser, "POST", `/${missingId}/validate`, {
          status: "APPROVED",
        })
      ).status,
    ).toBe(404);
    expect(
      (await request(adminUser, "POST", "", { certification: "CLF-C02" }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(adminUser, "POST", "", {
          ...questionInput({
            source_question_id: `f44-invalid-${randomUUID()}`,
          }),
          privilege: true,
        })
      ).status,
    ).toBe(400);
  });

  test("revocation waits for an already-authorized edit; later edits are denied", async () => {
    const validator = await makeUser("VALIDATOR");
    const adminUser = await makeUser("ADMIN");
    await assign(validator.id, "CLF-C02");
    const question = await insertQuestion(questionInput());
    const barrier = 550044401;
    await admin.query(`
      CREATE FUNCTION f44_test_pause_question_update() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.question_text LIKE 'F44 barrier %' THEN
          PERFORM pg_advisory_xact_lock(${barrier});
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await admin.query(`
      CREATE TRIGGER f44_test_pause_question_update
      BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION f44_test_pause_question_update()
    `);
    await admin.query("SELECT pg_advisory_lock($1::bigint)", [barrier]);
    let releaseBarrier = true;
    try {
      const editPromise = request(validator, "PUT", `/${question.id}`, {
        question_text: "F44 barrier edit already authorized before revoke.",
      });
      let editWaiters = [];
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const { rows } = await admin.query(`
          SELECT pid, wait_event, query FROM pg_stat_activity
          WHERE datname=current_database() AND pid <> pg_backend_pid()
            AND wait_event_type='Lock' AND query ILIKE '%UPDATE questions%'
        `);
        editWaiters = rows;
        if (editWaiters.length) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(editWaiters).toHaveLength(1);

      const revokePromise = request(
        adminUser,
        "DELETE",
        `/access/validator-certifications/${validator.id}/CLF-C02`,
      );
      let revokeWaiters = [];
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const { rows } = await admin.query(`
          SELECT pid, wait_event, query FROM pg_stat_activity
          WHERE datname=current_database() AND pid <> pg_backend_pid()
            AND wait_event_type='Lock' AND query ILIKE '%FOR UPDATE%'
        `);
        revokeWaiters = rows;
        if (revokeWaiters.length) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      console.info("F4.4 revoke/edit lock order", {
        observerPid: admin.processID,
        editWaiters,
        revokeWaiters,
      });
      expect(revokeWaiters.length).toBeGreaterThan(0);
      await admin.query("SELECT pg_advisory_unlock($1::bigint)", [barrier]);
      releaseBarrier = false;
      const [edit, revoke] = await Promise.all([editPromise, revokePromise]);
      expect(edit.status).toBe(200);
      expect(revoke.status).toBe(200);
      const afterRevoke = await request(validator, "PUT", `/${question.id}`, {
        question_text: "F44 this edit happens after confirmed revocation.",
      });
      expect(afterRevoke.status).toBe(403);
      const row = await executeQuery(
        "SELECT question_text FROM questions WHERE id=$1",
        [question.id],
      );
      expect(row[0].question_text).toBe(
        "F44 barrier edit already authorized before revoke.",
      );
    } finally {
      if (releaseBarrier)
        await admin.query("SELECT pg_advisory_unlock($1::bigint)", [barrier]);
      await admin.query(
        "DROP TRIGGER IF EXISTS f44_test_pause_question_update ON questions",
      );
      await admin.query(
        "DROP FUNCTION IF EXISTS f44_test_pause_question_update()",
      );
    }
  });
});
