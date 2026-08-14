/**
 * @jest-environment node
 */

import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockQuestions = new Map();

const baseQuestion = {
  id: 'question-1',
  certification: 'CLF-C02',
  domain: 'cloud-concepts',
  difficulty: 'easy',
  question_text: 'Which statement best describes an AWS Region?',
  options: [
    { id: 'A', text: 'A single isolated data center.' },
    { id: 'B', text: 'A geographic area with multiple Availability Zones.' },
  ],
  correct_answer: ['B'],
  explanation: 'A Region is a geographic area containing multiple Availability Zones.',
  validation_status: 'PENDING',
  rejection_reason: null,
  validation_logs: [],
  validated_by: null,
  validated_at: null,
  is_active: true,
};

const getPendingQuestionsMock = jest.fn(async () =>
  Array.from(mockQuestions.values()).filter(
    (question) => question.is_active && question.validation_status === 'PENDING',
  ),
);

const validateQuestionMock = jest.fn(async (
  questionId,
  validatorId,
  status,
  rejectionReason = null,
) => {
  const question = mockQuestions.get(questionId);
  if (!question || !question.is_active) {
    return null;
  }

  const updatedQuestion = {
    ...question,
    validation_status: status,
    rejection_reason: status === 'REJECTED' ? rejectionReason : null,
    validated_by: validatorId,
    validated_at: '2026-06-18T12:00:00.000Z',
    validation_logs: [
      ...question.validation_logs,
      {
        validatorId,
        action: status,
        reason: status === 'REJECTED' ? rejectionReason : null,
      },
    ],
  };

  mockQuestions.set(questionId, updatedQuestion);
  return updatedQuestion;
});

jest.unstable_mockModule('../backend/database/db.js', () => ({
  initializeDatabase: jest.fn(),
  closeDatabase: jest.fn(),
  getQuestions: jest.fn(),
  getQuestionById: jest.fn(async (id) => mockQuestions.get(id) || null),
  insertQuestion: jest.fn(),
  updateQuestion: jest.fn(),
  deleteQuestion: jest.fn(),
  searchQuestions: jest.fn(),
  getPendingQuestions: getPendingQuestionsMock,
  validateQuestion: validateQuestionMock,
  getLeaderboard: jest.fn(async () => []),
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  upsertUserByEmail: jest.fn(),
  getUserStats: jest.fn(),
  getWeakDomains: jest.fn(),
  getGamification: jest.fn(),
  createQuizHistory: jest.fn(),
  getQuizById: jest.fn(),
  recordAnswer: jest.fn(),
  getAnswersByQuiz: jest.fn(),
  calculateQuizStats: jest.fn(),
  getAwsServices: jest.fn(),
  getServiceById: jest.fn(),
  executeQuery: jest.fn(),
  executeSql: jest.fn(),
  getCases: jest.fn(),
  getCaseById: jest.fn(),
  insertCase: jest.fn(),
  insertAwsService: jest.fn(),
  markCaseCompleted: jest.fn(),
  insertCaseDialogue: jest.fn(),
  insertCaseEvent: jest.fn(),
  insertCaseEvaluationCriteria: jest.fn(),
  default: {},
}));

const { default: app } = await import('../backend/api/server.js');

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

/**
 * Helper de request.
 * Usa X-Test-Role para simular autenticação em NODE_ENV=test (bypass no requireAuth).
 * validated_by é passado no body para os testes que precisam identificar o validador.
 */
async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Usa o bypass de test do requireAuth (ver requireRole.js)
      'X-Test-Role': 'VALIDATOR',
      'X-Test-Email': 'validator@a3data.com.br',
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json();
  return { response, body };
}

describe('question validation API', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) {
      await closeServer(server);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestions.clear();
    mockQuestions.set(baseQuestion.id, { ...baseQuestion, validation_logs: [] });
  });

  test('GET /api/questions/pending lists pending questions', async () => {
    const { response, body } = await request(baseUrl, '/api/questions/pending');

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].validation_status).toBe('PENDING');
    expect(getPendingQuestionsMock).toHaveBeenCalledWith({ limit: 50, offset: 0 });
  });

  test('POST /api/questions/:id/validate approves a question', async () => {
    const { response, body } = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      body: JSON.stringify({
        status: 'APPROVED',
        validated_by: 'Senior Reviewer',
      }),
    });

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.validation_status).toBe('APPROVED');
    expect(body.data.validated_by).toBe('Senior Reviewer');
    expect(validateQuestionMock).toHaveBeenCalledWith(
      'question-1',
      'Senior Reviewer',
      'APPROVED',
      null,
    );
  });

  test('POST /api/questions/:id/validate rejects a question with reason', async () => {
    const { response, body } = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      body: JSON.stringify({
        status: 'REJECTED',
        rejection_reason: 'The explanation needs a stronger AWS reference.',
        validated_by: 'Senior Reviewer',
      }),
    });

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.validation_status).toBe('REJECTED');
    expect(body.data.rejection_reason).toBe('The explanation needs a stronger AWS reference.');
  });

  test('POST /api/questions/:id/validate rejects invalid payloads', async () => {
    const { response, body } = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      body: JSON.stringify({
        status: 'PENDING',
        validated_by: 'Senior Reviewer',
      }),
    });

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'status must be one of: APPROVED, REJECTED',
      status: 400,
    });
    expect(validateQuestionMock).not.toHaveBeenCalled();
  });

  test('POST /api/questions/:id/validate requires a rejection reason', async () => {
    const { response, body } = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      body: JSON.stringify({
        status: 'REJECTED',
        validated_by: 'Senior Reviewer',
      }),
    });

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'rejection_reason with at least 10 characters is required when rejecting',
      status: 400,
    });
    expect(validateQuestionMock).not.toHaveBeenCalled();
  });

  test.each(['STUDENT', 'UNKNOWN'])('%s cannot list pending questions', async (role) => {
    const { response } = await request(baseUrl, '/api/questions/pending', {
      headers: { 'X-Test-Role': role },
    });

    expect(response.status).toBe(403);
    expect(getPendingQuestionsMock).not.toHaveBeenCalled();
  });

  test('STUDENT cannot approve or reject questions', async () => {
    const headers = { 'X-Test-Role': 'STUDENT' };
    const approve = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: 'APPROVED', validated_by: 'student' }),
    });
    const reject = await request(baseUrl, '/api/questions/question-1/validate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: 'REJECTED',
        rejection_reason: 'A sufficiently detailed rejection reason.',
        validated_by: 'student',
      }),
    });

    expect(approve.response.status).toBe(403);
    expect(reject.response.status).toBe(403);
    expect(validateQuestionMock).not.toHaveBeenCalled();
  });

  test('ADMIN retains validator access', async () => {
    const { response } = await request(baseUrl, '/api/questions/pending', {
      headers: { 'X-Test-Role': 'ADMIN' },
    });

    expect(response.status).toBe(200);
  });

  test('missing authenticated user is rejected', async () => {
    const { response } = await request(baseUrl, '/api/questions/pending', {
      headers: { 'X-Test-Role': '', 'X-User-Id': '' },
    });

    expect(response.status).toBe(401);
  });
});
