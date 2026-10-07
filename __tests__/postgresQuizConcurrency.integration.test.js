/** @jest-environment node */
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  abandonQuiz,
  closeDatabase,
  completeQuiz,
  createQuizWithQuestions,
  createQuizHistory,
  createUser,
  executeQuery,
  initializeDatabase,
  insertQuestion,
  recordAnswer,
} from "../backend/database/db.js";

const integration =
  process.env.DB_ENGINE === "postgres-test" ? describe : describe.skip;

integration("F4.1 quiz concurrency on real PostgreSQL", () => {
  let observerA;
  let observerB;
  let user;
  let otherUser;

  const validQuestion = {
    certification: "clf-c02",
    domain: "seguranca",
    difficulty: "medium",
    question_text: "Which service manages identities and access permissions?",
    options: [
      { id: "A", text: "Amazon EC2" },
      { id: "B", text: "AWS IAM" },
    ],
    correct_answer: ["B"],
    explanation: "AWS IAM manages identities and access permissions.",
    reference_url: "https://aws.amazon.com/iam/",
    tags: ["iam"],
  };

  beforeAll(async () => {
    observerA = new pg.Client(process.env.PG_F3_ADMIN_URL);
    observerB = new pg.Client(process.env.PG_F3_ADMIN_URL);
    await Promise.all([observerA.connect(), observerB.connect()]);
    const { rows } = await observerA.query("SELECT pg_backend_pid() AS pid");
    const other = await observerB.query("SELECT pg_backend_pid() AS pid");
    expect(rows[0].pid).not.toBe(other.rows[0].pid);
    await initializeDatabase();
    user = await createUser(`F4.1 owner ${randomUUID()}`);
    otherUser = await createUser(`F4.1 other ${randomUUID()}`);
  }, 20000);

  afterAll(async () => {
    await closeDatabase();
    await Promise.all([observerA?.end(), observerB?.end()]);
  });

  async function fixture() {
    const question = await insertQuestion(validQuestion);
    const [quiz] = await executeQuery(
      `INSERT INTO quiz_history (
         user_id, certification, score, total_questions, percentage,
         time_spent_secs, domain_scores, weak_domains, status, started_at
       ) VALUES ($1, 'CLF-C02', 0, 1, 0, 0, '{}', '{}', 'started', CURRENT_TIMESTAMP)
       RETURNING *`,
      [user.id],
    );
    await executeQuery(
      `INSERT INTO quiz_questions (quiz_id, question_id, position)
       VALUES ($1, $2, 0)`,
      [quiz.id, question.id],
    );
    return { quiz, question };
  }

  async function waitForQuizLockWaiters(expected) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const { rows } = await observerB.query(
        `SELECT count(*)::int AS count
         FROM pg_stat_activity
         WHERE datname = current_database()
           AND wait_event_type = 'Lock'
           AND query ILIKE '%FROM quiz_history%FOR UPDATE%'`,
      );
      if (rows[0].count >= expected) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Expected ${expected} quiz row-lock waiter(s)`);
  }

  async function queueBehindQuizLock(quizId, first, second) {
    await observerA.query("BEGIN");
    await observerA.query(
      "SELECT id FROM quiz_history WHERE id = $1 FOR UPDATE",
      [quizId],
    );
    let firstResult;
    let secondResult;
    try {
      firstResult = first();
      await waitForQuizLockWaiters(1);
      secondResult = second();
      await waitForQuizLockWaiters(2);
    } finally {
      await observerA.query("COMMIT");
    }
    return Promise.allSettled([firstResult, secondResult]);
  }

  test("parallel start requests create separate attempts because no idempotency key exists", async () => {
    await insertQuestion({
      ...validQuestion,
      language: "pt",
      source_question_id: `f4-1-${randomUUID()}`,
      validation_status: "APPROVED",
    });
    const [first, second] = await Promise.all([
      createQuizWithQuestions({
        user_id: user.id,
        certification: "CLF-C02",
        language: "pt",
        num_questions: 1,
      }),
      createQuizWithQuestions({
        user_id: user.id,
        certification: "CLF-C02",
        language: "pt",
        num_questions: 1,
      }),
    ]);
    expect(first.quiz.id).not.toBe(second.quiz.id);
    expect(first.quiz.status).toBe("started");
    expect(second.quiz.status).toBe("started");
    const memberships = await executeQuery(
      `SELECT quiz_id, count(*)::int AS count
       FROM quiz_questions
       WHERE quiz_id = ANY($1::uuid[])
       GROUP BY quiz_id`,
      [[first.quiz.id, second.quiz.id]],
    );
    expect(memberships).toHaveLength(2);
    expect(memberships.map(({ count }) => count)).toEqual([1, 1]);
  });

  test("two simultaneous answers serialize; one answer wins and the other conflicts", async () => {
    const { quiz, question } = await fixture();
    const results = await queueBehindQuizLock(
      quiz.id,
      () => recordAnswer(quiz.id, question.id, ["A"], 2, user.id),
      () => recordAnswer(quiz.id, question.id, ["B"], 3, user.id),
    );
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
    expect(
      await executeQuery("SELECT * FROM answers WHERE quiz_id = $1", [quiz.id]),
    ).toHaveLength(1);
  });

  test("finish waits for an earlier answer and scores its committed result", async () => {
    const { quiz, question } = await fixture();
    const results = await queueBehindQuizLock(
      quiz.id,
      () => recordAnswer(quiz.id, question.id, ["B"], 7, user.id),
      () => completeQuiz(quiz.id, user.id),
    );
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(results[1].value).toMatchObject({
      status: "completed",
      score: 1,
      correct_answers: 1,
      answered_questions: 1,
    });
  });

  test("two simultaneous finishes persist one transition and one timestamp", async () => {
    const { quiz } = await fixture();
    const results = await queueBehindQuizLock(
      quiz.id,
      () => completeQuiz(quiz.id, user.id),
      () => completeQuiz(quiz.id, user.id),
    );
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
    expect(results[0].value.idempotent).toBe(false);
    expect(results[1].value.idempotent).toBe(true);
    expect(results[1].value.completed_at).toEqual(
      results[0].value.completed_at,
    );
  });

  test("abandon queued before finish wins exactly once; reverse order completes", async () => {
    const abandonedFixture = await fixture();
    const abandonedResults = await queueBehindQuizLock(
      abandonedFixture.quiz.id,
      () => abandonQuiz(abandonedFixture.quiz.id, user.id),
      () => completeQuiz(abandonedFixture.quiz.id, user.id),
    );
    expect(abandonedResults[0].value.status).toBe("abandoned");
    expect(abandonedResults[1]).toMatchObject({
      status: "rejected",
      reason: { statusCode: 409 },
    });

    const completedFixture = await fixture();
    const completedResults = await queueBehindQuizLock(
      completedFixture.quiz.id,
      () => completeQuiz(completedFixture.quiz.id, user.id),
      () => abandonQuiz(completedFixture.quiz.id, user.id),
    );
    expect(completedResults[0].value.status).toBe("completed");
    expect(completedResults[1]).toMatchObject({
      status: "rejected",
      reason: { statusCode: 409 },
    });
  });

  test.each(["completed", "abandoned"])(
    "answer after %s is rejected",
    async (status) => {
      const { quiz, question } = await fixture();
      if (status === "completed") await completeQuiz(quiz.id, user.id);
      else await abandonQuiz(quiz.id, user.id);
      await expect(
        recordAnswer(quiz.id, question.id, ["B"], 1, user.id),
      ).rejects.toMatchObject({ statusCode: 409 });
    },
  );

  test("finish and abandon retries are idempotent without changing timestamps", async () => {
    const completed = await fixture();
    const firstFinish = await completeQuiz(completed.quiz.id, user.id);
    const secondFinish = await completeQuiz(completed.quiz.id, user.id);
    expect(secondFinish).toMatchObject({
      idempotent: true,
      completed_at: firstFinish.completed_at,
    });

    const abandoned = await fixture();
    const firstAbandon = await abandonQuiz(abandoned.quiz.id, user.id);
    const secondAbandon = await abandonQuiz(abandoned.quiz.id, user.id);
    expect(secondAbandon).toMatchObject({
      idempotent: true,
      abandoned_at: firstAbandon.abandoned_at,
    });
  });

  test("ownership is checked in the locked transaction under concurrent requests", async () => {
    const { quiz, question } = await fixture();
    const results = await Promise.allSettled([
      recordAnswer(quiz.id, question.id, ["B"], 1, user.id),
      recordAnswer(quiz.id, question.id, ["A"], 1, otherUser.id),
      completeQuiz(quiz.id, otherUser.id),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results.slice(1)).toEqual([
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ statusCode: 404 }),
      }),
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ statusCode: 404 }),
      }),
    ]);
    expect(
      (
        await executeQuery("SELECT user_id FROM quiz_history WHERE id=$1", [
          quiz.id,
        ])
      )[0].user_id,
    ).toBe(user.id);
  });

  test("failed summary update rolls back the answer insert", async () => {
    const { quiz, question } = await fixture();
    await observerA.query(
      "REVOKE UPDATE ON quiz_history FROM cloudacademy_f3_runtime",
    );
    try {
      await expect(
        recordAnswer(quiz.id, question.id, ["B"], 1, user.id),
      ).rejects.toMatchObject({ code: "42501" });
      expect(
        await executeQuery("SELECT * FROM answers WHERE quiz_id=$1", [quiz.id]),
      ).toHaveLength(0);
    } finally {
      await observerA.query(
        "GRANT UPDATE ON quiz_history TO cloudacademy_f3_runtime",
      );
    }
  });
});
