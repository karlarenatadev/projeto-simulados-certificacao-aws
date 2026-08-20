/**
 * @jest-environment node
 */

import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  calculateStats,
  closeDatabase,
  createQuizHistory,
  createUser,
  deleteQuestion,
  executeQuery,
  getDatabase,
  getAnswersByQuiz,
  getGamification,
  getLeaderboard,
  getQuestionById,
  getQuestions,
  getQuestionsByDomain,
  getQuizById,
  getQuizHistory,
  getUserById,
  getUserByName,
  getUserStats,
  getWeakDomains,
  initializeDatabase,
  insertQuestion,
  normalizeCertification,
  recordAnswer,
  searchQuestions,
  updateGamification,
  updateQuestion,
  updateUser,
} from './db.js';

async function resetTestData() {
  const database = getDatabase();
  await database.exec(`
    DELETE FROM role_audit_log;
    DELETE FROM validator_certifications;
    DELETE FROM validator_requests;
    DELETE FROM answers;
    DELETE FROM quiz_history;
    DELETE FROM focus_sessions;
    DELETE FROM gamification;
    DELETE FROM users;
    DELETE FROM questions;
    DELETE FROM domains;
  `);
}

describe('PGlite database lifecycle', () => {
  const originalDataDir = process.env.DB_DATA_DIR;

  beforeEach(async () => {
    await closeDatabase();
    delete process.env.DB_DATA_DIR;
  });

  afterEach(async () => {
    await closeDatabase();

    if (originalDataDir === undefined) {
      delete process.env.DB_DATA_DIR;
    } else {
      process.env.DB_DATA_DIR = originalDataDir;
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('initializes an isolated in-memory database in the test environment', async () => {
    const database = await initializeDatabase({ environment: 'test' });

    expect(database).toBe(getDatabase());
    expect(database.dataDir).toBe('memory://');
    expect(globalThis.TextEncoder).toBeDefined();
  });

  test('applies the schema during initialization', async () => {
    const database = await initializeDatabase({ environment: 'test' });
    const result = await database.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    expect(result.rows).toEqual([{ table_name: 'users' }]);
  });

  test('reuses the active instance without applying initialization twice', async () => {
    const firstInitialization = initializeDatabase({ environment: 'test' });
    const secondInitialization = initializeDatabase({ environment: 'test' });
    const [firstDatabase, secondDatabase] = await Promise.all([
      firstInitialization,
      secondInitialization,
    ]);

    expect(secondDatabase).toBe(firstDatabase);

    await firstDatabase.exec('CREATE TABLE lifecycle_marker (id INTEGER PRIMARY KEY);');
    await firstDatabase.exec('INSERT INTO lifecycle_marker (id) VALUES (1);');

    const reusedDatabase = await initializeDatabase({ environment: 'test' });
    const result = await reusedDatabase.query('SELECT COUNT(*)::int AS count FROM lifecycle_marker');

    expect(reusedDatabase).toBe(firstDatabase);
    expect(result.rows[0].count).toBe(1);
  });

  test('closes the active instance and clears the global reference', async () => {
    const database = await initializeDatabase({ environment: 'test' });

    await closeDatabase();

    expect(database.closed).toBe(true);
    expect(() => getDatabase()).toThrow('Database not initialized');
  });

  test('uses an explicitly configured in-memory dataDir in tests', async () => {
    const database = await initializeDatabase({
      dataDir: 'memory://',
      environment: 'test',
    });

    expect(database.dataDir).toBe('memory://');
  });

  test('requires persistent configuration outside the test environment', async () => {
    await expect(
      initializeDatabase({ environment: 'development' }),
    ).rejects.toThrow('DB_DATA_DIR is required outside the test environment');
  });

  test('normalizes certification IDs centrally', () => {
    expect(normalizeCertification('clf-c02')).toBe('CLF-C02');
    expect(normalizeCertification(' saa-c03 ')).toBe('SAA-C03');
  });
});

describe('Question CRUD operations', () => {
  beforeAll(async () => {
    await closeDatabase();
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  function validQuestion(overrides = {}) {
    return {
      certification: 'clf-c02',
      domain: 'seguranca',
      difficulty: 'medium',
      question_text: 'Which AWS service helps manage user permissions for workloads?',
      options: ['Amazon EC2', 'AWS IAM', 'Amazon S3', 'AWS Lambda'],
      correct_answer: [1],
      explanation: 'AWS IAM manages identities and permissions for AWS resources.',
      reference_url: 'https://aws.amazon.com/iam/',
      tags: ['iam', 'security'],
      ...overrides,
    };
  }

  async function insertQuestionWithText(questionText, overrides = {}) {
    return insertQuestion(validQuestion({
      question_text: questionText,
      ...overrides,
    }));
  }

  test('inserts a valid question and normalizes certification', async () => {
    const question = await insertQuestion(validQuestion());

    expect(question.id).toBeDefined();
    expect(question.certification).toBe('CLF-C02');
    expect(question.domain).toBe('seguranca');
    expect(question.options).toEqual(['Amazon EC2', 'AWS IAM', 'Amazon S3', 'AWS Lambda']);
    expect(question.correct_answer).toEqual([1]);
  });

  test('rejects invalid question payloads with clear errors', async () => {
    await expect(
      insertQuestion(validQuestion({ options: ['Only one option'] })),
    ).rejects.toThrow('options must be an array with at least 2 items');

    await expect(
      insertQuestion(validQuestion({ correct_answer: [99] })),
    ).rejects.toThrow('correct_answer[0] must reference a valid option index');

    await expect(
      insertQuestion(validQuestion({ difficulty: 'expert' })),
    ).rejects.toThrow('difficulty must be one of: easy, medium, hard');

    await expect(
      insertQuestion(validQuestion({ certification: 'XYZ-000' })),
    ).rejects.toThrow('Invalid certification: XYZ-000');
  });

  test('fetches a question by ID and returns null for a missing ID', async () => {
    const inserted = await insertQuestion(validQuestion());

    const found = await getQuestionById(inserted.id);
    const missing = await getQuestionById(randomUUID());

    expect(found.id).toBe(inserted.id);
    expect(missing).toBeNull();
  });

  test('lists questions by certification with lowercase input', async () => {
    await insertQuestion(validQuestion({ certification: 'clf-c02' }));
    await insertQuestion(validQuestion({
      certification: 'SAA-C03',
      domain: 'design-performance',
      question_text: 'Which AWS feature improves architecture performance for reads?',
    }));

    const questions = await getQuestions('clf-c02');

    expect(questions).toHaveLength(1);
    expect(questions[0].certification).toBe('CLF-C02');
  });

  test('filters questions by domain and difficulty', async () => {
    await insertQuestionWithText(
      'Which AWS service stores objects for compliance audit reports?',
      { domain: 'seguranca', difficulty: 'easy' },
    );
    await insertQuestionWithText(
      'Which AWS service improves cost visibility for monthly invoices?',
      { domain: 'faturamento', difficulty: 'hard' },
    );

    const byDomain = await getQuestions({ certification: 'CLF-C02', domain: 'seguranca' });
    const byDifficulty = await getQuestions('CLF-C02', undefined, 'hard');

    expect(byDomain).toHaveLength(1);
    expect(byDomain[0].domain).toBe('seguranca');
    expect(byDifficulty).toHaveLength(1);
    expect(byDifficulty[0].difficulty).toBe('hard');
  });

  test('supports canonical-only catalog queries without hiding legacy-compatible queries', async () => {
    const canonical = await insertQuestion(validQuestion({
      language: 'pt',
      source_question_id: 'canonical-catalog-question',
      question_text: 'Which canonical question belongs in the current catalog?',
    }));
    const legacy = await insertQuestion(validQuestion({
      question_text: 'Which legacy question remains for historical compatibility?',
    }));

    const allQuestions = await getQuestions({ certification: 'CLF-C02' });
    const canonicalQuestions = await getQuestions({ certification: 'CLF-C02', canonicalOnly: true });
    const canonicalSearch = await searchQuestions('question', 10, { canonicalOnly: true });

    expect(allQuestions.map((question) => question.id)).toEqual(
      expect.arrayContaining([canonical.id, legacy.id]),
    );
    expect(canonicalQuestions.map((question) => question.id)).toContain(canonical.id);
    expect(canonicalQuestions.map((question) => question.id)).not.toContain(legacy.id);
    expect(canonicalSearch.map((question) => question.id)).toContain(canonical.id);
    expect(canonicalSearch.map((question) => question.id)).not.toContain(legacy.id);
  });

  test('supports explicit approved-only queries without changing administrative defaults', async () => {
    const approved = await insertQuestion(validQuestion({
      language: 'pt',
      source_question_id: 'approved-question',
      question_text: 'Which approved question is available to the student quiz?',
      validation_status: 'APPROVED',
    }));
    const pending = await insertQuestion(validQuestion({
      language: 'pt',
      source_question_id: 'pending-question',
      question_text: 'Which pending question must remain in validation?',
      validation_status: 'PENDING',
    }));

    const official = await getQuestions({ certification: 'CLF-C02', approvedOnly: true });
    const search = await searchQuestions('question', 10, { approvedOnly: true });

    expect(official.map((question) => question.id)).toContain(approved.id);
    expect(official.map((question) => question.id)).not.toContain(pending.id);
    expect(search.map((question) => question.id)).toContain(approved.id);
    expect(search.map((question) => question.id)).not.toContain(pending.id);
    expect(await getQuestionById(pending.id)).not.toBeNull();
    expect(await getQuestionById(pending.id, { approvedOnly: true })).toBeNull();
  });

  test('gets questions by certification and domain', async () => {
    await insertQuestionWithText(
      'Which AWS service helps evaluate IAM permissions before production use?',
      { domain: 'seguranca' },
    );
    await insertQuestionWithText(
      'Which AWS billing feature helps forecast future costs?',
      { domain: 'faturamento' },
    );

    const questions = await getQuestionsByDomain('clf-c02', 'seguranca');

    expect(questions).toHaveLength(1);
    expect(questions[0].domain).toBe('seguranca');
  });

  test('searches questions by text', async () => {
    await insertQuestionWithText(
      'Which AWS database service provides DynamoDB single-digit millisecond latency?',
      { domain: 'tecnologia', tags: ['dynamodb'] },
    );
    await insertQuestionWithText(
      'Which AWS service tracks monthly billing anomalies?',
      { domain: 'faturamento' },
    );
    await insertQuestionWithText(
      'Which AWS sample mentions a 100% availability target for this scenario?',
      { domain: 'tecnologia' },
    );

    const results = await searchQuestions('DynamoDB', 10);
    const wildcardOnly = await searchQuestions('%', 10);
    const literalPercent = await searchQuestions('100%', 10);

    expect(results).toHaveLength(1);
    expect(results[0].question_text).toContain('DynamoDB');
    expect(wildcardOnly).toHaveLength(1);
    expect(wildcardOnly[0].question_text).toContain('100%');
    expect(literalPercent).toHaveLength(1);
    expect(literalPercent[0].question_text).toContain('100%');
  });

  test('paginates questions with safe limit and offset', async () => {
    const inserted = [];
    inserted.push(await insertQuestionWithText('Question one about AWS IAM and permissions?'));
    inserted.push(await insertQuestionWithText('Question two about AWS IAM and permissions?'));
    inserted.push(await insertQuestionWithText('Question three about AWS IAM and permissions?'));

    const firstPage = await getQuestions('CLF-C02', undefined, undefined, { limit: 2, offset: 0 });
    const secondPage = await getQuestions('CLF-C02', undefined, undefined, { limit: 2, offset: 2 });
    const capped = await getQuestions('CLF-C02', undefined, undefined, { limit: 999, offset: -5 });

    expect(inserted).toHaveLength(3);
    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
    expect(firstPage.map((question) => question.id)).not.toContain(secondPage[0].id);
    expect(capped).toHaveLength(3);
  });

  test('updates a question and validates updated answers', async () => {
    const inserted = await insertQuestion(validQuestion());

    expect(inserted.validation_status).toBe('PENDING');
    expect(inserted.rejection_reason).toBeNull();
    expect(inserted.validation_logs).toEqual([]);

    const updated = await updateQuestion(inserted.id, {
      difficulty: 'hard',
      question_text: 'Which AWS identity service should be used for permission management?',
      options: ['Amazon RDS', 'AWS IAM', 'Amazon VPC'],
      correct_answer: [1],
      validation_status: 'approved',
      rejection_reason: null,
      validation_logs: [
        {
          action: 'approved',
          validator: 'Tech Lead',
        },
      ],
    });

    expect(updated.id).toBe(inserted.id);
    expect(updated.difficulty).toBe('hard');
    expect(updated.options).toEqual(['Amazon RDS', 'AWS IAM', 'Amazon VPC']);
    expect(updated.validation_status).toBe('APPROVED');
    expect(updated.rejection_reason).toBeNull();
    expect(updated.validation_logs).toEqual([
      {
        action: 'approved',
        validator: 'Tech Lead',
      },
    ]);

    await expect(
      updateQuestion(inserted.id, { correct_answer: [9] }),
    ).rejects.toThrow('correct_answer[0] must reference a valid option index');

    await expect(
      updateQuestion(inserted.id, { validation_status: 'ARCHIVED' }),
    ).rejects.toThrow('validation_status must be one of: PENDING, APPROVED, REJECTED');

    await expect(
      updateQuestion(inserted.id, { ignored: 'value' }),
    ).rejects.toThrow('No valid fields to update');
  });

  test('returns null when updating a missing question', async () => {
    const result = await updateQuestion(randomUUID(), { difficulty: 'hard' });

    expect(result).toBeNull();
  });

  test('soft deletes a question and hides it from reads', async () => {
    const inserted = await insertQuestion(validQuestion());

    const deleted = await deleteQuestion(inserted.id);
    const fetched = await getQuestionById(inserted.id);
    const listed = await getQuestions('CLF-C02');
    const missingDelete = await deleteQuestion(randomUUID());

    expect(deleted.id).toBe(inserted.id);
    expect(fetched).toBeNull();
    expect(listed).toHaveLength(0);
    expect(missingDelete).toBeNull();
  });
});

describe('User, gamification, leaderboard, and user stats operations', () => {
  beforeAll(async () => {
    await closeDatabase();
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  function uniqueName(prefix = 'User') {
    return `${prefix}#${randomUUID()}`;
  }

  function validQuestion(overrides = {}) {
    return {
      certification: 'clf-c02',
      domain: 'seguranca',
      difficulty: 'medium',
      question_text: 'Which AWS service manages identity and access permissions?',
      options: [
        { id: 'A', text: 'Amazon EC2' },
        { id: 'B', text: 'AWS IAM' },
        { id: 'C', text: 'Amazon S3' },
      ],
      correct_answer: ['B'],
      explanation: 'AWS IAM manages identities and access permissions.',
      reference_url: 'https://aws.amazon.com/iam/',
      tags: ['iam', 'security'],
      ...overrides,
    };
  }

  test('creates a valid user', async () => {
    const user = await createUser(uniqueName('CloudNinja'));

    expect(user.id).toBeDefined();
    expect(user.anonymous_name).toMatch(/^CloudNinja#/);
    expect(user.created_at).toBeDefined();
  });

  test('fetches a user by ID', async () => {
    const user = await createUser(uniqueName('ById'));
    const found = await getUserById(user.id);

    expect(found.id).toBe(user.id);
    expect(found.anonymous_name).toBe(user.anonymous_name);
  });

  test('fetches a user by anonymous name', async () => {
    const user = await createUser(uniqueName('ByName'));
    const found = await getUserByName(user.anonymous_name);

    expect(found.id).toBe(user.id);
  });

  test('rejects duplicate anonymous names', async () => {
    const anonymousName = uniqueName('Duplicate');
    await createUser(anonymousName);

    await expect(createUser(anonymousName)).rejects.toThrow();
  });

  test('updates a user and returns null for a missing user', async () => {
    const user = await createUser(uniqueName('BeforeUpdate'));
    const updated = await updateUser(user.id, { anonymousName: uniqueName('AfterUpdate') });
    const missing = await updateUser(randomUUID(), { anonymousName: uniqueName('Missing') });

    expect(updated.id).toBe(user.id);
    expect(updated.anonymous_name).toMatch(/^AfterUpdate#/);
    expect(missing).toBeNull();
    await expect(createUser('')).rejects.toThrow('anonymousName must be at least 1 character');
    await expect(getUserById('')).rejects.toThrow('userId must be at least 1 character');
    await expect(updateUser(user.id, {})).rejects.toThrow('No valid fields to update');
  });

  test('gets default gamification for a user', async () => {
    const user = await createUser(uniqueName('Gamification'));
    const gamification = await getGamification(user.id);

    expect(gamification.user_id).toBe(user.id);
    expect(gamification.xp_points).toBe(0);
    expect(gamification.current_streak).toBe(0);
    expect(gamification.badges).toEqual([]);
    expect(gamification.completed_stages).toEqual([]);
  });

  test('updates gamification with validated arrays and counters', async () => {
    const user = await createUser(uniqueName('Progress'));
    const gamification = await updateGamification(user.id, {
      total_quizzes: 3,
      best_score: 88.5,
      current_streak: 2,
      longest_streak: 5,
      badges: ['first-quiz', 'streak-2'],
      completed_stages: ['clf-c02-basics'],
      unlocked_stages: ['clf-c02-advanced'],
      labs_completed: 1,
      xp_points: 250,
    });

    expect(gamification.user_id).toBe(user.id);
    expect(gamification.xp_points).toBe(250);
    expect(gamification.current_streak).toBe(2);
    expect(gamification.longest_streak).toBe(5);
    expect(gamification.badges).toEqual(['first-quiz', 'streak-2']);
    expect(gamification.completed_stages).toEqual(['clf-c02-basics']);
    expect(gamification.unlocked_stages).toEqual(['clf-c02-advanced']);
  });

  test('rejects negative XP and streak values', async () => {
    const user = await createUser(uniqueName('Validation'));

    await expect(
      updateGamification(user.id, { xp_points: -1 }),
    ).rejects.toThrow('xp_points must be a non-negative number');

    await expect(
      updateGamification(user.id, { current_streak: -1 }),
    ).rejects.toThrow('current_streak must be a non-negative number');

    await expect(
      updateGamification(user.id, { badges: 'first-quiz' }),
    ).rejects.toThrow('badges must be an array');

    await expect(
      updateGamification(user.id, { best_score: 101 }),
    ).rejects.toThrow('best_score must be between 0 and 100');

    await expect(
      updateGamification(user.id, { current_streak: 3, longest_streak: 2 }),
    ).rejects.toThrow('current_streak cannot be greater than longest_streak');
  });

  test('returns leaderboard ordered by XP', async () => {
    const first = await createUser(uniqueName('LeaderboardA'));
    const second = await createUser(uniqueName('LeaderboardB'));
    const third = await createUser(uniqueName('LeaderboardC'));
    await updateGamification(first.id, { xp_points: 100 });
    await updateGamification(second.id, { xp_points: 300 });
    await updateGamification(third.id, { xp_points: 200 });

    const leaderboard = await getLeaderboard();

    expect(leaderboard.map((entry) => entry.display_name)).toEqual([
      second.anonymous_name,
      third.anonymous_name,
      first.anonymous_name,
    ]);
    expect(leaderboard.map((entry) => entry.xp_points)).toEqual([300, 200, 100]);
  });

  test('applies leaderboard limit', async () => {
    const first = await createUser(uniqueName('LimitedA'));
    const second = await createUser(uniqueName('LimitedB'));
    await updateGamification(first.id, { xp_points: 10 });
    await updateGamification(second.id, { xp_points: 20 });

    const leaderboard = await getLeaderboard(1);
    const invalidLimit = await getLeaderboard(0);

    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].display_name).toBe(second.anonymous_name);
    expect(invalidLimit).toHaveLength(2);
    expect(invalidLimit[0].display_name).toBe(second.anonymous_name);
  });

  test('calculates complete user stats from quizzes, answers, focus, and gamification', async () => {
    const user = await createUser(uniqueName('Stats'));
    const quiz = await createQuizHistory({
      user_id: user.id,
      certification: 'CLF-C02',
      score: 1,
      total_questions: 2,
      percentage: 50,
      time_spent_secs: 90,
    });
    const firstQuestion = await insertQuestion(validQuestion());
    const secondQuestion = await insertQuestion(validQuestion({
      question_text: 'Which AWS service provides object storage with high durability?',
      domain: 'tecnologia',
      options: [
        { id: 'A', text: 'Amazon EBS' },
        { id: 'B', text: 'Amazon S3' },
        { id: 'C', text: 'Amazon EC2' },
      ],
      correct_answer: ['B'],
      explanation: 'Amazon S3 provides object storage designed for high durability.',
    }));
    await recordAnswer(quiz.id, firstQuestion.id, ['B'], 30);
    await recordAnswer(quiz.id, secondQuestion.id, ['A'], 45);
    await executeQuery(
      `INSERT INTO focus_sessions (user_id, minutes, session_type, session_date)
       VALUES ($1, 25, 'focus', CURRENT_DATE), ($1, 5, 'short_break', CURRENT_DATE)`,
      [user.id],
    );
    await updateGamification(user.id, {
      xp_points: 125,
      current_streak: 1,
      longest_streak: 2,
      badges: ['focused'],
      completed_stages: ['stage-1'],
    });

    const stats = await getUserStats(user.id);

    expect(stats.user_id).toBe(user.id);
    expect(stats.anonymous_name).toBe(user.anonymous_name);
    expect(stats.total_quizzes).toBe(1);
    expect(stats.total_time_secs).toBe(75);
    expect(stats.total_focus_minutes).toBe(25);
    expect(stats.total_answers).toBe(2);
    expect(stats.correct_answers).toBe(1);
    expect(stats.answer_accuracy).toBe(50);
    expect(stats.xp_points).toBe(125);
    expect(stats.current_streak).toBe(1);
    expect(stats.badges).toEqual(['focused']);
    expect(stats.completed_stages).toEqual(['stage-1']);
  });

  test('throws clear errors for missing user-dependent operations', async () => {
    const missingUserId = randomUUID();

    await expect(getGamification(missingUserId)).rejects.toThrow('User not found');
    await expect(getUserStats(missingUserId)).rejects.toThrow('User not found');
  });
});

describe('Quiz history and answers operations', () => {
  beforeAll(async () => {
    await closeDatabase();
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function createTestUser() {
    return createUser(`QuizUser#${randomUUID()}`);
  }

  function validQuestion(overrides = {}) {
    return {
      certification: 'clf-c02',
      domain: 'seguranca',
      difficulty: 'medium',
      question_text: 'Which AWS service manages identity and access permissions?',
      options: [
        { id: 'A', text: 'Amazon EC2' },
        { id: 'B', text: 'AWS IAM' },
        { id: 'C', text: 'Amazon S3' },
        { id: 'D', text: 'Amazon CloudWatch' },
      ],
      correct_answer: ['B'],
      explanation: 'AWS IAM manages identities and access permissions.',
      reference_url: 'https://aws.amazon.com/iam/',
      tags: ['iam', 'security'],
      ...overrides,
    };
  }

  async function createQuizForUser(overrides = {}) {
    const user = await createTestUser();
    const quiz = await createQuizHistory({
      user_id: user.id,
      certification: 'clf-c02',
      score: 0,
      total_questions: 2,
      percentage: 0,
      ...overrides,
    });

    return { user, quiz };
  }

  test('creates quiz history, normalizes certification, and fetches by ID', async () => {
    const user = await createTestUser();
    const quiz = await createQuizHistory(user.id, 'clf-c02', { total_questions: 3 });
    const fetched = await getQuizById(quiz.id);
    const missing = await getQuizById(randomUUID());

    expect(quiz.id).toBeDefined();
    expect(quiz.user_id).toBe(user.id);
    expect(quiz.certification).toBe('CLF-C02');
    expect(quiz.total_questions).toBe(3);
    expect(fetched.id).toBe(quiz.id);
    expect(missing).toBeNull();
    await expect(
      createQuizHistory(user.id, 'CLF-C02', {
        score: 2,
        total_questions: 1,
      }),
    ).rejects.toThrow('score cannot be greater than total_questions');
  });

  test('fetches quiz history by user with pagination', async () => {
    const user = await createTestUser();
    await createQuizHistory(user.id, 'CLF-C02', { total_questions: 1 });
    await createQuizHistory(user.id, 'CLF-C02', { total_questions: 1 });
    await createQuizHistory(user.id, 'CLF-C02', { total_questions: 1 });

    const firstPage = await getQuizHistory(user.id, 2, 0);
    const secondPage = await getQuizHistory(user.id, 2, 2);
    const safeDefaults = await getQuizHistory(user.id, 0, -10);

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
    expect(safeDefaults).toHaveLength(3);
  });

  test('records a correct answer calculated by the backend', async () => {
    const { quiz } = await createQuizForUser({ total_questions: 1 });
    const question = await insertQuestion(validQuestion());

    const answer = await recordAnswer({
      quiz_id: quiz.id,
      question_id: question.id,
      user_answer: ['B'],
      is_correct: false,
      time_secs: 12,
    });
    const updatedQuiz = await getQuizById(quiz.id);

    expect(answer.is_correct).toBe(true);
    expect(answer.explanation).toBe(question.explanation);
    expect(answer.correct_answer).toEqual(['B']);
    expect(updatedQuiz.score).toBe(1);
    expect(Number(updatedQuiz.percentage)).toBe(100);
    expect(updatedQuiz.time_spent_secs).toBe(12);
  });

  test('records an incorrect answer calculated by the backend', async () => {
    const { quiz } = await createQuizForUser({ total_questions: 1 });
    const question = await insertQuestion(validQuestion());

    const answer = await recordAnswer(quiz.id, question.id, ['A'], 8);
    const updatedQuiz = await getQuizById(quiz.id);

    expect(answer.is_correct).toBe(false);
    expect(updatedQuiz.score).toBe(0);
    expect(Number(updatedQuiz.percentage)).toBe(0);
  });

  test('does not trust is_correct sent by the caller', async () => {
    const { quiz } = await createQuizForUser({ total_questions: 1 });
    const question = await insertQuestion(validQuestion());

    const answer = await recordAnswer({
      quiz_id: quiz.id,
      question_id: question.id,
      user_answer: ['A'],
      is_correct: true,
      time_secs: 3,
    });

    expect(answer.is_correct).toBe(false);
  });

  test('fetches answers for a quiz in answer order', async () => {
    const { quiz } = await createQuizForUser({ total_questions: 2 });
    const firstQuestion = await insertQuestion(validQuestion());
    const secondQuestion = await insertQuestion(validQuestion({
      question_text: 'Which AWS storage service is object based and highly durable?',
      domain: 'tecnologia',
      options: [
        { id: 'A', text: 'Amazon EBS' },
        { id: 'B', text: 'Amazon S3' },
        { id: 'C', text: 'Amazon EFS' },
      ],
      correct_answer: ['B'],
      explanation: 'Amazon S3 is object storage designed for durability.',
    }));

    await recordAnswer(quiz.id, firstQuestion.id, ['B'], 5);
    await recordAnswer(quiz.id, secondQuestion.id, ['A'], 7);

    const answers = await getAnswersByQuiz(quiz.id);

    expect(answers).toHaveLength(2);
    expect(answers[0].question_id).toBe(firstQuestion.id);
    expect(answers[1].question_id).toBe(secondQuestion.id);
  });

  test('calculates user stats and weak domains from recorded answers', async () => {
    const { user, quiz } = await createQuizForUser({ total_questions: 2 });
    const securityQuestion = await insertQuestion(validQuestion({ domain: 'seguranca' }));
    const billingQuestion = await insertQuestion(validQuestion({
      question_text: 'Which AWS tool is used to inspect monthly billing anomalies?',
      domain: 'faturamento',
      options: [
        { id: 'A', text: 'AWS Cost Anomaly Detection' },
        { id: 'B', text: 'AWS IAM' },
        { id: 'C', text: 'Amazon EC2' },
      ],
      correct_answer: ['A'],
      explanation: 'AWS Cost Anomaly Detection identifies unusual spend patterns.',
    }));

    await recordAnswer(quiz.id, securityQuestion.id, ['B'], 5);
    await recordAnswer(quiz.id, billingQuestion.id, ['B'], 9);

    const stats = await calculateStats(user.id);
    const weakDomains = await getWeakDomains(user.id, 70);

    expect(stats.total_quizzes).toBe(1);
    expect(stats.total_questions).toBe(2);
    expect(stats.correct_answers).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(weakDomains).toEqual([
      {
        domain: 'faturamento',
        accuracy: 0,
        total_questions: 1,
        correct_answers: 0,
      },
    ]);
  });

  test('validates required quiz and answer inputs', async () => {
    const user = await createTestUser();
    const { quiz } = await createQuizForUser({ user_id: user.id, total_questions: 1 });
    const question = await insertQuestion(validQuestion());

    await expect(
      createQuizHistory('', 'CLF-C02', { total_questions: 1 }),
    ).rejects.toThrow('userId must be at least 1 character');

    await expect(
      createQuizHistory(user.id, 'invalid-cert', { total_questions: 1 }),
    ).rejects.toThrow('Invalid certification: invalid-cert');

    await expect(
      recordAnswer(quiz.id, question.id, undefined, 1),
    ).rejects.toThrow('userAnswer is required');

    await expect(
      recordAnswer(quiz.id, question.id, ['B'], -1),
    ).rejects.toThrow('timeSecs must be a non-negative number');
  });

  test('errors for missing quiz or question without leaving partial state', async () => {
    const { quiz } = await createQuizForUser({ total_questions: 1 });
    const question = await insertQuestion(validQuestion());

    await expect(
      recordAnswer(randomUUID(), question.id, ['B'], 1),
    ).rejects.toThrow('Quiz not found');

    await expect(
      recordAnswer(quiz.id, randomUUID(), ['B'], 1),
    ).rejects.toThrow('Question not found');

    const answers = await getAnswersByQuiz(quiz.id);
    const unchangedQuiz = await getQuizById(quiz.id);

    expect(answers).toHaveLength(0);
    expect(unchangedQuiz.score).toBe(0);
  });

  test('keeps user_stats aggregates from multiplying quiz and focus rows', async () => {
    const user = await createTestUser();
    await createQuizHistory({
      user_id: user.id,
      certification: 'CLF-C02',
      score: 1,
      total_questions: 1,
      percentage: 100,
      time_spent_secs: 30,
    });
    await createQuizHistory({
      user_id: user.id,
      certification: 'SAA-C03',
      score: 0,
      total_questions: 1,
      percentage: 0,
      time_spent_secs: 40,
    });
    await executeQuery(
      `INSERT INTO focus_sessions (user_id, minutes, session_type, session_date)
       VALUES ($1, 10, 'focus', CURRENT_DATE), ($1, 20, 'focus', CURRENT_DATE)`,
      [user.id],
    );

    const stats = await getUserStats(user.id);

    expect(Number(stats.total_quizzes)).toBe(2);
    expect(Number(stats.total_time_secs)).toBe(70);
    expect(Number(stats.total_focus_minutes)).toBe(30);
  });
});
