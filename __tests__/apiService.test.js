import { jest } from '@jest/globals';
import apiService from '../src/frontend/js/services/api.js';
import { QuizEngine } from '../src/frontend/js/quizEngine.js';
import { quizManager } from '../src/frontend/js/quizManager.js';
import { userManager } from '../src/frontend/js/userManager.js';
import { SessionManager } from '../src/frontend/js/core/sessionManager.js';
import { storageManager } from '../src/frontend/js/storageManager.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe('apiService response normalization', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    quizManager.currentQuizId = null;
    quizManager.currentUserId = null;
    quizManager.isAPIAvailable = true;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('unwraps an API envelope and preserves metadata', async () => {
    const questions = [{ id: 'question-1' }];
    global.fetch.mockResolvedValue(jsonResponse({
      success: true,
      data: questions,
      count: 1,
      pagination: { limit: 10, offset: 0 },
    }));

    const response = await apiService.loadQuestions({ limit: 10 });

    expect(response.data).toBe(questions);
    expect(response.data).toHaveLength(1);
    expect(response.count).toBe(1);
    expect(response.pagination).toEqual({ limit: 10, offset: 0 });
    expect(response.meta.count).toBe(1);
  });

  test('preserves a direct response body', async () => {
    const payload = { id: 'record-1', data: { value: 'domain data' } };
    global.fetch.mockResolvedValue(jsonResponse(payload));

    const response = await apiService.getQuestion('record-1');

    expect(response).toMatchObject({
      success: true,
      status: 200,
      data: payload,
    });
    expect(response.meta).toBeUndefined();
  });

  test('returns normalized user data to user login', async () => {
    global.fetch.mockResolvedValue(jsonResponse({
      success: true,
      data: {
        id: 'user-1',
        email: 'usuario@a3data.com.br',
        nickname: 'UsuarioA3',
        role: 'STUDENT',
      },
      message: 'Login realizado com sucesso.',
    }, 200));

    const apiResponse = await apiService.loginUser({ email: 'usuario@a3data.com.br' });
    jest.spyOn(apiService, 'loginUser').mockResolvedValue(apiResponse);

    const user = await userManager.login('usuario@a3data.com.br');

    expect(apiResponse.data.id).toBe('user-1');
    expect(user.id).toBe('user-1');
    expect(user.name).toBe('UsuarioA3');
    const session = JSON.parse(localStorage.getItem('cloudacademy_session') || 'null');
    expect(session?.user?.id).toBe('user-1');
  });

  test('invalidates a stale online session without deleting user-scoped data', async () => {
    SessionManager.persist({
      user: { id: 'stale-user', email: 'stale@a3data.com.br', role: 'ADMIN' },
      accessToken: 'stale-token',
      authenticationMode: 'online',
    });
    storageManager.saveQuizResult({
      certId: 'clf-c02',
      score: 8,
      total: 10,
      percentage: 80,
    });
    const historyKey = storageManager.getUserScopedKey('history');
    global.fetch.mockResolvedValue(jsonResponse({
      error: 'Usuário não encontrado ou desativado.',
      status: 401,
    }, 401));

    await expect(apiService.getMe('stale-user')).rejects.toMatchObject({ statusCode: 401 });

    expect(SessionManager.restore()).toBeNull();
    expect(localStorage.getItem(historyKey)).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('preserves a direct list response', async () => {
    const questions = [{ id: 'question-1' }];
    global.fetch.mockResolvedValue(jsonResponse(questions));

    const response = await apiService.loadQuestions();

    expect(response.data).toBe(questions);
    expect(response.data).toHaveLength(1);
  });

  test('unwraps quiz results and leaderboard lists', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        data: { quiz_id: 'quiz-1', percentage: 80 },
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        data: [{ id: 'user-1', best_score: 90 }],
        count: 1,
      }));

    const results = await apiService.getQuizResults('quiz-1');
    const leaderboard = await apiService.getLeaderboard();

    expect(results.data).toEqual({ quiz_id: 'quiz-1', percentage: 80 });
    expect(leaderboard.data).toHaveLength(1);
    expect(leaderboard.count).toBe(1);
  });

  test('returns normalized quiz data to quiz initialization', async () => {
    global.fetch.mockResolvedValue(jsonResponse({
      success: true,
      data: {
        quiz_id: 'quiz-1',
        questions: [{ id: 'question-1' }],
        total_questions: 1,
      },
      message: 'Quiz started successfully',
    }, 201));

    const apiResponse = await apiService.startQuiz({
      user_id: 'user-1',
      certification: 'clf-c02',
      num_questions: 1,
    });
    jest.spyOn(apiService, 'startQuiz').mockResolvedValue(apiResponse);

    quizManager.currentUserId = 'user-1';
    const quiz = await quizManager.startQuiz('clf-c02', 1);

    expect(apiResponse.data.quiz_id).toBe('quiz-1');
    expect(quiz).toEqual({
      quizId: 'quiz-1',
      questions: [{ id: 'question-1' }],
      totalQuestions: 1,
      fromAPI: true,
    });
  });

  test('keeps the JSON fallback working when the API is unavailable', async () => {
    const fallbackQuestions = [{
      id: 'local-question',
      domain: 'cloud',
      difficulty: 'easy',
      question: 'Which AWS service provides object storage?',
      options: ['EC2', 'S3'],
      correct: 1,
      explanation: 'Amazon S3 provides object storage.',
    }];

    global.fetch.mockResolvedValueOnce(jsonResponse(fallbackQuestions));

    const engine = new QuizEngine();
    const result = await engine.loadQuestions(
      'clf-c02',
      [{ id: 'cloud' }],
      { quantity: 1, difficulty: 'all', topic: '', mode: 'exam' },
      'pt',
    );

    expect(result).toEqual({ success: true, totalQuestions: 1 });
    expect(engine.state.questions).toHaveLength(1);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'data/questions/clf-c02.json',
    );
  });
});
