/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import app from '../backend/api/server.js';
import {
  closeDatabase,
  createUser,
  initializeDatabase,
  insertQuestion,
  insertCase,
} from '../backend/database/db.js';

function listen(serverApp) {
  return new Promise((resolve) => {
    const server = serverApp.listen(0, '127.0.0.1', () => {
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
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json();
  return { response, body };
}

describe('Express API integration', () => {
  let server;
  let baseUrl;
  let user;
  let question;
  let englishQuestion;
  let legacyQuestion;

  beforeAll(async () => {
    process.env.DB_DATA_DIR = 'memory://';
    await initializeDatabase({ environment: 'test', dataDir: 'memory://' });

    user = await createUser(`IntegrationUser-${Date.now()}`);
    question = await insertQuestion({
      certification: 'CLF-C02',
      language: 'pt',
      source_question_id: 'integration-language-question',
      domain: 'faturamento',
      difficulty: 'easy',
      question_text: 'Which AWS pricing model charges only for actual usage in this integration test?',
      options: ['On-Demand', 'Reserved Instances', 'Savings Plans', 'Dedicated Hosts'],
      correct_answer: [0],
      explanation: 'On-Demand pricing charges only for the capacity that is actually used.',
      tags: ['integration-test'],
    });
    englishQuestion = await insertQuestion({
      certification: 'CLF-C02',
      language: 'en',
      source_question_id: 'integration-language-question',
      domain: 'faturamento',
      difficulty: 'easy',
      question_text: 'Which AWS pricing model charges only for actual usage in this English integration test?',
      options: ['On-Demand', 'Reserved Instances', 'Savings Plans', 'Dedicated Hosts'],
      correct_answer: [0],
      explanation: 'On-Demand pricing charges only for the capacity that is actually used.',
      tags: ['integration-test'],
    });
    legacyQuestion = await insertQuestion({
      certification: 'CLF-C02',
      domain: 'faturamento',
      difficulty: 'easy',
      question_text: 'Which legacy question must never enter the current catalog?',
      options: ['A', 'B'],
      correct_answer: [0],
      explanation: 'Legacy fixture.',
    });

    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) {
      await closeServer(server);
    }
    await closeDatabase();
  });

  test('GET /api/health reports API health', async () => {
    const { response, body } = await request(baseUrl, '/api/health');

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('API is healthy');
  });

  test('GET /api/questions lists seeded questions', async () => {
    const { response, body } = await request(
      baseUrl,
      '/api/questions?certification=CLF-C02&limit=10',
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.some((item) => item.id === question.id)).toBe(true);
    expect(body.data.every((item) => item.correct_answer === undefined)).toBe(true);
  });

  test('GET /api/questions filters by the structured language', async () => {
    const pt = await request(baseUrl, '/api/questions?certification=CLF-C02&language=pt&limit=100');
    const en = await request(baseUrl, '/api/questions?certification=CLF-C02&language=en&limit=100');
    const searched = await request(baseUrl, '/api/questions?search=pricing&language=en&limit=100');
    const invalid = await request(baseUrl, '/api/questions?language=es');

    expect(pt.response.status).toBe(200);
    expect(en.response.status).toBe(200);
    expect(searched.response.status).toBe(200);
    expect(invalid.response.status).toBe(400);
    expect(pt.body.data.some((item) => item.id === question.id)).toBe(true);
    expect(pt.body.data.some((item) => item.id === englishQuestion.id)).toBe(false);
    expect(pt.body.data.some((item) => item.id === legacyQuestion.id)).toBe(false);
    expect(en.body.data.some((item) => item.id === englishQuestion.id)).toBe(true);
    expect(en.body.data.some((item) => item.id === question.id)).toBe(false);
    expect(pt.body.data.every((item) => item.language === 'pt')).toBe(true);
    expect(en.body.data.every((item) => item.language === 'en')).toBe(true);
    expect(searched.body.data.every((item) => item.language === 'en')).toBe(true);
    expect(searched.body.data.some((item) => item.id === legacyQuestion.id)).toBe(false);
  });

  test('quiz start keeps all questions in the requested language', async () => {
    const started = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ certification: 'CLF-C02', num_questions: 1, language: 'en' }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });

    expect(started.response.status).toBe(201);
    expect(started.body.data.language).toBe('en');
    expect(started.body.data.questions).toHaveLength(1);
    expect(started.body.data.questions.every((item) => item.language === 'en')).toBe(true);
    expect(started.body.data.questions.every((item) => item.source_question_id)).toBe(true);
  });

  test('quiz lifecycle: start, answer, and fetch results', async () => {
    const started = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        certification: 'CLF-C02',
        num_questions: 1,
      }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });

    expect(started.response.status).toBe(201);
    expect(started.body.success).toBe(true);
    expect(started.body.data.questions).toHaveLength(1);
    expect(started.body.data.questions[0].correct_answer).toBeUndefined();
    expect(started.body.data.questions[0].source_question_id).toBeTruthy();

    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;

    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        user_answer: 0,
        is_correct: false,
        time_secs: 12,
      }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });

    expect(answered.response.status).toBe(200);
    expect(answered.body.success).toBe(true);
    expect(answered.body.data.answer_id).toBeTruthy();

    const results = await request(baseUrl, `/api/quiz/${quizId}/results`, {
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });

    expect(results.response.status).toBe(200);
    expect(results.body.success).toBe(true);
    expect(results.body.data.total_questions).toBe(1);
    expect(results.body.data.correct_answers).toBe(1);
    expect(results.body.data.percentage).toBe(100);
  });

  test('quiz routes require authentication and enforce ownership', async () => {
    const unauthenticated = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ certification: 'CLF-C02', num_questions: 1 }),
    });
    expect(unauthenticated.response.status).toBe(401);

    const started = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'attacker-supplied-id', certification: 'CLF-C02', num_questions: 1 }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });
    expect(started.response.status).toBe(201);
    const quizId = started.body.data.quiz_id;
    const unauthenticatedDetail = await request(baseUrl, `/api/quiz/${quizId}`);
    const unauthenticatedResults = await request(baseUrl, `/api/quiz/${quizId}/results`);
    const unauthenticatedAnswer = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ question_id: started.body.data.questions[0].id, user_answer: 0 }),
    });
    expect(unauthenticatedDetail.response.status).toBe(401);
    expect(unauthenticatedResults.response.status).toBe(401);
    expect(unauthenticatedAnswer.response.status).toBe(401);
    const otherUser = await createUser(`OtherIntegrationUser-${Date.now()}`);

    for (const path of [`/api/quiz/${quizId}`, `/api/quiz/${quizId}/results`]) {
      const response = await request(baseUrl, path, {
        headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': otherUser.id },
      });
      expect(response.response.status).toBe(404);
    }

    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ question_id: started.body.data.questions[0].id, user_answer: 0 }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': otherUser.id },
    });
    expect(answered.response.status).toBe(404);
  });

  test('quiz correctness is calculated by the server', async () => {
    const started = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({ certification: 'CLF-C02', num_questions: 1 }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });
    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;
    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, user_answer: 1, is_correct: true }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });
    expect(answered.response.status).toBe(200);
    const results = await request(baseUrl, `/api/quiz/${quizId}/results`, {
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });
    expect(results.body.data.correct_answers).toBe(0);
    expect(results.body.data.percentage).toBe(0);
  });

  test('case completion uses the authenticated user instead of body.user_id', async () => {
    const caseData = await insertCase({
      slug: `security-case-${Date.now()}`,
      title: 'Security ownership case',
      scenario: 'A case used to verify progress ownership.',
      objective: 'Keep completion tied to the authenticated user.',
      certifications: ['CLF-C02'],
    });
    const otherUser = await createUser(`CaseBodyUser-${Date.now()}`);
    const completed = await request(baseUrl, `/api/cases/${caseData.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ user_id: otherUser.id }),
      headers: { 'X-Test-Role': 'STUDENT', 'X-User-Id': user.id },
    });

    expect(completed.response.status).toBe(200);
    expect(completed.body.data.user_id).toBe(user.id);
    expect(completed.body.data.user_id).not.toBe(otherUser.id);
  });
});
