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
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json();
  return { response, body };
}

describe('Express API integration', () => {
  let server;
  let baseUrl;
  let user;
  let question;

  beforeAll(async () => {
    process.env.DB_DATA_DIR = 'memory://';
    await initializeDatabase({ environment: 'test', dataDir: 'memory://' });

    user = await createUser(`IntegrationUser-${Date.now()}`);
    question = await insertQuestion({
      certification: 'CLF-C02',
      domain: 'faturamento',
      difficulty: 'easy',
      question_text: 'Which AWS pricing model charges only for actual usage in this integration test?',
      options: ['On-Demand', 'Reserved Instances', 'Savings Plans', 'Dedicated Hosts'],
      correct_answer: [0],
      explanation: 'On-Demand pricing charges only for the capacity that is actually used.',
      tags: ['integration-test'],
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
  });

  test('quiz lifecycle: start, answer, and fetch results', async () => {
    const started = await request(baseUrl, '/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        certification: 'CLF-C02',
        num_questions: 1,
      }),
    });

    expect(started.response.status).toBe(201);
    expect(started.body.success).toBe(true);
    expect(started.body.data.questions).toHaveLength(1);
    expect(started.body.data.questions[0].correct_answer).toBeUndefined();

    const quizId = started.body.data.quiz_id;
    const questionId = started.body.data.questions[0].id;

    const answered = await request(baseUrl, `/api/quiz/${quizId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        user_answer: 0,
        time_secs: 12,
      }),
    });

    expect(answered.response.status).toBe(200);
    expect(answered.body.success).toBe(true);
    expect(answered.body.data.answer_id).toBeTruthy();

    const results = await request(baseUrl, `/api/quiz/${quizId}/results`);

    expect(results.response.status).toBe(200);
    expect(results.body.success).toBe(true);
    expect(results.body.data.total_questions).toBe(1);
    expect(results.body.data.correct_answers).toBe(1);
    expect(results.body.data.percentage).toBe(100);
  });
});
