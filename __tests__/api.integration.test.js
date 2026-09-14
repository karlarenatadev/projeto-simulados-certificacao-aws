/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { randomUUID } from "node:crypto";
import app from "../backend/api/server.js";
import {
  closeDatabase,
  createUser,
  initializeDatabase,
  insertQuestion,
  insertCase,
  executeQuery,
  getQuizQuestions,
} from "../backend/database/db.js";

function listen(serverApp) {
  return new Promise((resolve) => {
    const server = serverApp.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await response.json();
  return { response, body };
}

describe("Express API integration", () => {
  let server;
  let baseUrl;
  let user;
  let question;
  let englishQuestion;
  let legacyQuestion;

  beforeAll(async () => {
    process.env.DB_DATA_DIR = "memory://";
    await initializeDatabase({ environment: "test", dataDir: "memory://" });

    user = await createUser(`IntegrationUser-${Date.now()}`);
    question = await insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: "integration-language-question",
      domain: "faturamento",
      difficulty: "easy",
      question_text:
        "Which AWS pricing model charges only for actual usage in this integration test?",
      options: [
        "On-Demand",
        "Reserved Instances",
        "Savings Plans",
        "Dedicated Hosts",
      ],
      correct_answer: [0],
      explanation:
        "On-Demand pricing charges only for the capacity that is actually used.",
      tags: ["integration-test"],
      validation_status: "APPROVED",
    });
    englishQuestion = await insertQuestion({
      certification: "CLF-C02",
      language: "en",
      source_question_id: "integration-language-question",
      domain: "faturamento",
      difficulty: "easy",
      question_text:
        "Which AWS pricing model charges only for actual usage in this English integration test?",
      options: [
        "On-Demand",
        "Reserved Instances",
        "Savings Plans",
        "Dedicated Hosts",
      ],
      correct_answer: [0],
      explanation:
        "On-Demand pricing charges only for the capacity that is actually used.",
      tags: ["integration-test"],
      validation_status: "APPROVED",
    });
    legacyQuestion = await insertQuestion({
      certification: "CLF-C02",
      domain: "faturamento",
      difficulty: "easy",
      question_text:
        "Which legacy question must never enter the current catalog?",
      options: ["A", "B"],
      correct_answer: [0],
      explanation: "Legacy fixture.",
    });

    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) {
      await closeServer(server);
    }
    await closeDatabase();
  });

  test("GET /api/health reports API health", async () => {
    const { response, body } = await request(baseUrl, "/api/health");

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("API is healthy");
  });

  test("GET /api/questions lists seeded questions", async () => {
    const { response, body } = await request(
      baseUrl,
      "/api/questions?certification=CLF-C02&limit=10",
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.some((item) => item.id === question.id)).toBe(true);
    expect(body.data.every((item) => item.correct_answer === undefined)).toBe(
      true,
    );
  });

  test("student catalog and quiz exclude non-approved questions", async () => {
    const pending = await insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: `integration-pending-${Date.now()}`,
      domain: "faturamento",
      difficulty: "easy",
      question_text: "Pending question must not be offered to students.",
      options: ["A", "B"],
      correct_answer: [0],
      explanation: "Pending fixture.",
      validation_status: "PENDING",
    });
    const rejected = await insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: `integration-rejected-${Date.now()}`,
      domain: "faturamento",
      difficulty: "easy",
      question_text: "Rejected question must not be offered to students.",
      options: ["A", "B"],
      correct_answer: [0],
      explanation: "Rejected fixture.",
      validation_status: "REJECTED",
    });

    const catalog = await request(
      baseUrl,
      `/api/questions?certification=CLF-C02&language=pt&limit=100&validation_status=PENDING`,
      { headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id } },
    );
    const singlePending = await request(
      baseUrl,
      `/api/questions/${pending.id}`,
    );
    const quiz = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        certification: "CLF-C02",
        num_questions: 20,
        language: "pt",
      }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });

    expect(catalog.response.status).toBe(200);
    expect(catalog.body.data.some((item) => item.id === pending.id)).toBe(
      false,
    );
    expect(catalog.body.data.some((item) => item.id === rejected.id)).toBe(
      false,
    );
    expect(singlePending.response.status).toBe(404);
    expect(quiz.response.status).toBe(201);
    expect(
      quiz.body.data.questions.some((item) => item.id === pending.id),
    ).toBe(false);
    expect(
      quiz.body.data.questions.some((item) => item.id === rejected.id),
    ).toBe(false);
  });

  test("GET /api/questions filters by the structured language", async () => {
    const pt = await request(
      baseUrl,
      "/api/questions?certification=CLF-C02&language=pt&limit=100",
    );
    const en = await request(
      baseUrl,
      "/api/questions?certification=CLF-C02&language=en&limit=100",
    );
    const searched = await request(
      baseUrl,
      "/api/questions?search=pricing&language=en&limit=100",
    );
    const invalid = await request(baseUrl, "/api/questions?language=es");

    expect(pt.response.status).toBe(200);
    expect(en.response.status).toBe(200);
    expect(searched.response.status).toBe(200);
    expect(invalid.response.status).toBe(400);
    expect(pt.body.data.some((item) => item.id === question.id)).toBe(true);
    expect(pt.body.data.some((item) => item.id === englishQuestion.id)).toBe(
      false,
    );
    expect(pt.body.data.some((item) => item.id === legacyQuestion.id)).toBe(
      false,
    );
    expect(en.body.data.some((item) => item.id === englishQuestion.id)).toBe(
      true,
    );
    expect(en.body.data.some((item) => item.id === question.id)).toBe(false);
    expect(pt.body.data.every((item) => item.language === "pt")).toBe(true);
    expect(en.body.data.every((item) => item.language === "en")).toBe(true);
    expect(searched.body.data.every((item) => item.language === "en")).toBe(
      true,
    );
    expect(
      searched.body.data.some((item) => item.id === legacyQuestion.id),
    ).toBe(false);
  });

  test("quiz start keeps all questions in the requested language", async () => {
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        certification: "CLF-C02",
        num_questions: 1,
        language: "en",
      }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });

    expect(started.response.status).toBe(201);
    expect(started.body.data.language).toBe("en");
    expect(started.body.data.questions).toHaveLength(1);
    expect(
      started.body.data.questions.every((item) => item.language === "en"),
    ).toBe(true);
    expect(
      started.body.data.questions.every((item) => item.source_question_id),
    ).toBe(true);
  });

  test("quiz start resolves domain aliases and applies the real domain filter", async () => {
    const filterUser = await createUser(`DomainFilterUser-${Date.now()}`);
    const headers = { "X-Test-Role": "STUDENT", "X-User-Id": filterUser.id };
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        certification: "CLF-C02",
        domain: "billing-and-pricing",
        difficulty: "EASY",
        num_questions: 10,
      }),
      headers,
    });

    expect(started.response.status).toBe(201);
    expect(started.body.data.questions.length).toBeGreaterThan(0);
    expect(
      started.body.data.questions.every(
        (question) => question.domain_id === "faturamento",
      ),
    ).toBe(true);
    const persisted = await getQuizQuestions(
      started.body.data.quiz_id,
      filterUser.id,
    );
    expect(
      persisted.every((question) => question.domain === "faturamento"),
    ).toBe(true);

    const invalid = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        certification: "CLF-C02",
        domain: "qualquer-coisa",
        num_questions: 1,
      }),
      headers,
    });
    expect(invalid.response.status).toBe(400);
    expect(invalid.body.error).toMatch(/invalid domain/i);
  });

  test.each([
    ["applications-foundation-models", "Applications of Foundation Models"],
    [
      "security-compliance-governance",
      "Security, Compliance, and Governance for AI Solutions",
    ],
  ])(
    "AIF %s filter persists only matching memberships",
    async (domainId, domainName) => {
      const filterUser = await createUser(
        `AifDomain-${domainId}-${Date.now()}`,
      );
      const headers = { "X-Test-Role": "STUDENT", "X-User-Id": filterUser.id };
      await insertQuestion({
        certification: "AIF-C01",
        language: "pt",
        source_question_id: `aif-b631-${domainId}`,
        domain: domainId,
        difficulty: "easy",
        question_text: `Fixture for ${domainName}`,
        options: ["Correct", "Incorrect"],
        correct_answer: [0],
        explanation: "Fixture",
        validation_status: "APPROVED",
      });
      const started = await request(baseUrl, "/api/quiz/start", {
        method: "POST",
        body: JSON.stringify({
          certification: "AIF-C01",
          domain: domainId,
          num_questions: 5,
        }),
        headers,
      });
      expect(started.response.status).toBe(201);
      expect(started.body.data.questions.length).toBeGreaterThan(0);
      expect(
        started.body.data.questions.every(
          (question) => question.domain_id === domainId,
        ),
      ).toBe(true);
      const persisted = await getQuizQuestions(
        started.body.data.quiz_id,
        filterUser.id,
      );
      expect(persisted.length).toBe(started.body.data.questions.length);
      expect(persisted.every((question) => question.domain === domainId)).toBe(
        true,
      );
    },
  );

  test("quiz lifecycle: start, answer, and fetch results", async () => {
    const lifecycleUser = await createUser(`LifecycleUser-${Date.now()}`);
    const headers = { "X-Test-Role": "STUDENT", "X-User-Id": lifecycleUser.id };
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        user_id: lifecycleUser.id,
        certification: "CLF-C02",
        num_questions: 1,
      }),
      headers,
    });

    expect(started.response.status).toBe(201);
    expect(started.body.success).toBe(true);
    expect(started.body.data.questions).toHaveLength(1);
    expect(started.body.data.questions[0].correct_answer).toBeUndefined();
    expect(started.body.data.questions[0].answerKey).toBeUndefined();
    expect(started.body.data.questions[0].is_correct).toBeUndefined();
    expect(started.body.data.questions[0].explanation).toBeUndefined();
    expect(JSON.stringify(started.body.data.questions[0])).not.toMatch(
      /correct_answer|answerKey|is_correct|explanation/i,
    );
    expect(started.body.data.questions[0].source_question_id).toBeTruthy();
    expect(started.body.data.status).toBe("started");
    expect(started.body.data.started_at).toBeTruthy();
    expect(started.body.data.completed_at).toBeNull();

    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;
    const statsBeforeAnswer = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsBeforeAnswer.body.data.total_quizzes).toBe(0);
    expect(statsBeforeAnswer.body.data.avg_score).toBe(0);

    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        user_answer: 0,
        is_correct: false,
        time_secs: 12,
      }),
      headers,
    });

    expect(answered.response.status).toBe(200);
    expect(answered.body.success).toBe(true);
    expect(answered.body.data.answer_id).toBeTruthy();
    expect(typeof answered.body.data.is_correct).toBe("boolean");
    expect(answered.body.data.explanation).toBeTruthy();
    const replayed = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        user_answer: 0,
        time_secs: 12,
      }),
      headers,
    });
    expect(replayed.response.status).toBe(200);
    expect(replayed.body.data.answer_id).toBe(answered.body.data.answer_id);
    const resumed = await request(baseUrl, `/api/quiz/${quizId}`, { headers });
    expect(resumed.body.data.id).toBe(quizId);
    expect(resumed.body.data.status).toBe("started");
    expect(resumed.body.data.completed_at).toBeNull();

    const statsBeforeFinish = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsBeforeFinish.body.data.total_quizzes).toBe(0);
    const prematureResults = await request(
      baseUrl,
      `/api/quiz/${quizId}/results`,
      { headers },
    );
    expect(prematureResults.response.status).toBe(409);

    const finished = await request(baseUrl, `/api/quiz/${quizId}/finish`, {
      method: "POST",
      headers,
    });
    expect(finished.response.status).toBe(200);
    expect(finished.body.data.status).toBe("completed");
    expect(finished.body.data.completed_at).toBeTruthy();

    const results = await request(baseUrl, `/api/quiz/${quizId}/results`, {
      headers,
    });

    expect(results.response.status).toBe(200);
    expect(results.body.success).toBe(true);
    expect(results.body.data.total_questions).toBe(1);
    expect(results.body.data.correct_answers).toBe(1);
    expect(results.body.data.percentage).toBe(100);
    const statsAfterFinish = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsAfterFinish.body.data.total_quizzes).toBe(1);
    expect(statsAfterFinish.body.data.avg_score).toBe(100);

    const repeated = await request(baseUrl, `/api/quiz/${quizId}/finish`, {
      method: "POST",
      headers,
    });
    expect(repeated.body.data.idempotent).toBe(true);
    expect(repeated.body.data.completed_at).toBe(
      finished.body.data.completed_at,
    );
    const statsAfterRepeat = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsAfterRepeat.body.data.total_quizzes).toBe(1);
    const lateAnswer = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, user_answer: 0 }),
      headers,
    });
    expect(lateAnswer.response.status).toBe(409);
  });

  test("quiz membership rejects forged questions and calculates score from five assigned questions", async () => {
    const attackUser = await createUser(`MembershipUser-${randomUUID()}`);
    const headers = { "X-Test-Role": "STUDENT", "X-User-Id": attackUser.id };
    const testQuestions = [];
    for (let index = 0; index < 5; index++) {
      testQuestions.push(
        await insertQuestion({
          certification: "CLF-C02",
          language: "pt",
          source_question_id: `membership-${randomUUID()}`,
          domain: "faturamento",
          difficulty: "easy",
          question_text: `Membership question ${index}?`,
          options: ["Correct", "Incorrect"],
          correct_answer: [0],
          explanation: "The first choice is correct.",
          validation_status: "APPROVED",
        }),
      );
    }
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      headers,
      body: JSON.stringify({
        certification: "CLF-C02",
        num_questions: 5,
        language: "pt",
        score: 100,
      }),
    });
    expect(started.response.status).toBe(201);
    const { quiz_id: quizId, questions } = started.body.data;
    expect(questions).toHaveLength(5);
    expect(questions.every((item) => item.correct_answer === undefined)).toBe(
      true,
    );
    expect(questions.every((item) => item.selection_count === 1)).toBe(true);
    const memberships = await executeQuery(
      "SELECT question_id, position FROM quiz_questions WHERE quiz_id = $1 ORDER BY position",
      [quizId],
    );
    expect(memberships.map((row) => row.question_id)).toEqual(
      questions.map((item) => item.id),
    );
    expect(memberships.map((row) => row.position)).toEqual([0, 1, 2, 3, 4]);

    const answer = (questionId, choice, extra = {}) =>
      request(baseUrl, `/api/quiz/${quizId}/answer`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question_id: questionId,
          user_answer: choice,
          ...extra,
        }),
      });
    const nonexistent = await answer(randomUUID(), 0);
    expect(nonexistent.response.status).toBe(404);

    const otherQuestion = await insertQuestion({
      certification: "CLF-C02",
      language: "pt",
      source_question_id: `outside-${randomUUID()}`,
      domain: "faturamento",
      difficulty: "easy",
      question_text: "Outside question?",
      options: ["Correct", "Incorrect"],
      correct_answer: [0],
      explanation: "Outside set.",
      validation_status: "APPROVED",
    });
    const otherQuiz = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      headers,
      body: JSON.stringify({
        certification: "CLF-C02",
        num_questions: 1,
        language: "pt",
      }),
    });
    expect(otherQuiz.body.data.questions[0].id).toBe(otherQuestion.id);
    expect((await answer(otherQuestion.id, 0)).response.status).toBe(409);

    const saaQuestion = await insertQuestion({
      certification: "SAA-C03",
      language: "pt",
      source_question_id: `saa-${randomUUID()}`,
      domain: "design",
      difficulty: "easy",
      question_text: "SAA question?",
      options: ["Correct", "Incorrect"],
      correct_answer: [0],
      explanation: "Different certification.",
      validation_status: "APPROVED",
    });
    expect((await answer(saaQuestion.id, 0)).response.status).toBe(409);

    const first = await answer(testQuestions[4].id, 0, {
      is_correct: false,
      score: 100,
    });
    expect(first.response.status).toBe(200);
    expect(first.body.data.is_correct).toBe(true);
    expect(first.body.data.correct_answer).toEqual([0]);
    const replay = await answer(testQuestions[4].id, 0);
    expect(replay.body.data.idempotent).toBe(true);
    expect(replay.body.data.answer_id).toBe(first.body.data.answer_id);
    expect((await answer(testQuestions[4].id, 1)).response.status).toBe(409);
    expect(
      await executeQuery("SELECT * FROM answers WHERE quiz_id = $1", [quizId]),
    ).toHaveLength(1);

    const finished = await request(baseUrl, `/api/quiz/${quizId}/finish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ score: 100, percentage: 100 }),
    });
    expect(finished.response.status).toBe(200);
    expect(finished.body.data).toMatchObject({
      status: "completed",
      score: 1,
      total_questions: 5,
      correct_answers: 1,
      incorrect_answers: 0,
      answered_questions: 1,
      unanswered_questions: 4,
    });
    expect(Number(finished.body.data.percentage)).toBe(20);
    expect((await answer(testQuestions[4].id, 0)).response.status).toBe(409);
  });

  test("quiz routes require authentication and enforce ownership", async () => {
    const unauthenticated = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ certification: "CLF-C02", num_questions: 1 }),
    });
    expect(unauthenticated.response.status).toBe(401);

    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({
        user_id: "attacker-supplied-id",
        certification: "CLF-C02",
        num_questions: 1,
      }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });
    expect(started.response.status).toBe(201);
    const quizId = started.body.data.quiz_id;
    const unauthenticatedDetail = await request(baseUrl, `/api/quiz/${quizId}`);
    const unauthenticatedResults = await request(
      baseUrl,
      `/api/quiz/${quizId}/results`,
    );
    const unauthenticatedAnswer = await request(
      baseUrl,
      `/api/quiz/${quizId}/answer`,
      {
        method: "POST",
        body: JSON.stringify({
          question_id: started.body.data.questions[0].id,
          user_answer: 0,
        }),
      },
    );
    expect(unauthenticatedDetail.response.status).toBe(401);
    expect(unauthenticatedResults.response.status).toBe(401);
    expect(unauthenticatedAnswer.response.status).toBe(401);
    const otherUser = await createUser(`OtherIntegrationUser-${Date.now()}`);

    for (const path of [`/api/quiz/${quizId}`, `/api/quiz/${quizId}/results`]) {
      const response = await request(baseUrl, path, {
        headers: { "X-Test-Role": "STUDENT", "X-User-Id": otherUser.id },
      });
      expect(response.response.status).toBe(404);
    }

    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: started.body.data.questions[0].id,
        user_answer: 0,
      }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": otherUser.id },
    });
    expect(answered.response.status).toBe(404);

    for (const action of ["finish", "abandon"]) {
      const denied = await request(baseUrl, `/api/quiz/${quizId}/${action}`, {
        method: "POST",
        headers: { "X-Test-Role": "STUDENT", "X-User-Id": otherUser.id },
      });
      expect(denied.response.status).toBe(404);
    }
  });

  test("starting another quiz does not implicitly abandon the earlier one", async () => {
    const multipleUser = await createUser(`MultipleStartedUser-${Date.now()}`);
    const headers = { "X-Test-Role": "STUDENT", "X-User-Id": multipleUser.id };
    const first = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ certification: "CLF-C02", num_questions: 1 }),
      headers,
    });
    const second = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ certification: "CLF-C02", num_questions: 1 }),
      headers,
    });
    const firstDetail = await request(
      baseUrl,
      `/api/quiz/${first.body.data.quiz_id}`,
      { headers },
    );
    const secondDetail = await request(
      baseUrl,
      `/api/quiz/${second.body.data.quiz_id}`,
      { headers },
    );
    const stats = await request(
      baseUrl,
      `/api/users/${multipleUser.id}/stats`,
      { headers },
    );

    expect(firstDetail.body.data.status).toBe("started");
    expect(secondDetail.body.data.status).toBe("started");
    expect(
      firstDetail.body.data.questions.every(
        (question) =>
          question.correct_answer === undefined &&
          question.answerKey === undefined &&
          question.is_correct === undefined &&
          question.explanation === undefined,
      ),
    ).toBe(true);
    expect(stats.body.data.total_quizzes).toBe(0);
  });

  test("quiz correctness is calculated by the server", async () => {
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ certification: "CLF-C02", num_questions: 1 }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });
    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;
    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        question_id: questionId,
        user_answer: 1,
        is_correct: true,
      }),
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });
    expect(answered.response.status).toBe(200);
    const finished = await request(baseUrl, `/api/quiz/${quizId}/finish`, {
      method: "POST",
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });
    expect(finished.body.data.status).toBe("completed");
    const results = await request(baseUrl, `/api/quiz/${quizId}/results`, {
      headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
    });
    expect(results.body.data.correct_answers).toBe(0);
    expect(results.body.data.percentage).toBe(0);
  });

  test("an unfinished or explicitly abandoned quiz does not contaminate stats", async () => {
    const lifecycleUser = await createUser(`UnfinishedUser-${Date.now()}`);
    const headers = { "X-Test-Role": "STUDENT", "X-User-Id": lifecycleUser.id };
    const started = await request(baseUrl, "/api/quiz/start", {
      method: "POST",
      body: JSON.stringify({ certification: "CLF-C02", num_questions: 1 }),
      headers,
    });
    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;
    const statsStarted = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsStarted.body.data.total_quizzes).toBe(0);

    const abandoned = await request(baseUrl, `/api/quiz/${quizId}/abandon`, {
      method: "POST",
      headers,
    });
    expect(abandoned.body.data.status).toBe("abandoned");
    expect(abandoned.body.data.completed_at).toBeNull();
    expect(abandoned.body.data.abandoned_at).toBeTruthy();
    const lateAnswer = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, user_answer: 0 }),
      headers,
    });
    expect(lateAnswer.response.status).toBe(409);
    const lateFinish = await request(baseUrl, `/api/quiz/${quizId}/finish`, {
      method: "POST",
      headers,
    });
    expect(lateFinish.response.status).toBe(409);
    const statsAbandoned = await request(
      baseUrl,
      `/api/users/${lifecycleUser.id}/stats`,
      { headers },
    );
    expect(statsAbandoned.body.data.total_quizzes).toBe(0);
  });

  test("case completion uses the authenticated user instead of body.user_id", async () => {
    const caseData = await insertCase({
      slug: `security-case-${Date.now()}`,
      title: "Security ownership case",
      scenario: "A case used to verify progress ownership.",
      objective: "Keep completion tied to the authenticated user.",
      certifications: ["CLF-C02"],
    });
    const otherUser = await createUser(`CaseBodyUser-${Date.now()}`);
    const completed = await request(
      baseUrl,
      `/api/cases/${caseData.id}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ user_id: otherUser.id }),
        headers: { "X-Test-Role": "STUDENT", "X-User-Id": user.id },
      },
    );

    expect(completed.response.status).toBe(200);
    expect(completed.body.data.user_id).toBe(user.id);
    expect(completed.body.data.user_id).not.toBe(otherUser.id);
  });
});
