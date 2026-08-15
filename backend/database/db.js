/**
 * PGLite Database Connection Module
 * Handles database initialization and configuration
 */

import { PGlite } from '@electric-sql/pglite';
import { config as loadEnvironment } from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { normalizeCertificationId } from './normalizers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, 'schema.sql');
const MEMORY_DATA_DIR = 'memory://';
const VALID_CERTIFICATIONS = new Set([
  'CLF-C02',
  'SAA-C03',
  'SAP-C02',
  'DVA-C02',
  'SOA-C02',
  'DOP-C02',
  'ANS-C01',
  'DAS-C01',
  'MLS-C01',
  'SCS-C02',
  'PAS-C01',
  'AIF-C01',
]);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const VALID_VALIDATION_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const DEFAULT_QUESTION_LIMIT = 10;
const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_WEAK_DOMAIN_THRESHOLD = 70;
const MAX_QUESTION_LIMIT = 100;
const DEFAULT_LEADERBOARD_LIMIT = 100;
const MAX_LEADERBOARD_LIMIT = 100;
const USER_MODULES = new Set([
  'journey', 'sprint', 'flashcards', 'labs', 'diagnostic', 'preferences',
]);
const MAX_MODULE_STATE_BYTES = 256 * 1024;

loadEnvironment({ quiet: true });

let db = null;
let initializationPromise = null;
let closePromise = null;
let schemaSql = null;

function isDebugEnabled() {
  return process.env.DEBUG === 'true' || process.env.DB_DEBUG === 'true';
}

function debugQuery(query, params) {
  if (!isDebugEnabled()) {
    return;
  }

  console.log('[database:query]', query.replace(/\s+/g, ' ').trim(), params);
}

function rowsFromResult(result) {
  return Array.isArray(result) ? result : result.rows || [];
}

async function queryRows(executor, query, params = []) {
  debugQuery(query, params);
  const result = await executor.query(query, params);
  return rowsFromResult(result);
}

function resolveDatabaseOptions(options = {}) {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const configuredDataDir = options.dataDir || process.env.DB_DATA_DIR;

  if (configuredDataDir) {
    const dataDir = configuredDataDir === MEMORY_DATA_DIR || isAbsolute(configuredDataDir)
      ? configuredDataDir
      : resolve(process.cwd(), configuredDataDir);

    if (dataDir === MEMORY_DATA_DIR && environment !== 'test') {
      throw new Error(
        'In-memory PGlite is restricted to tests. Configure DB_DATA_DIR for this environment.',
      );
    }

    return {
      dataDir,
      environment,
      mode: dataDir === MEMORY_DATA_DIR ? 'memory' : 'persistent',
    };
  }

  if (environment === 'test') {
    return {
      dataDir: MEMORY_DATA_DIR,
      environment,
      mode: 'memory',
    };
  }

  throw new Error(
    'DB_DATA_DIR is required outside the test environment. '
    + 'Set it in .env or pass initializeDatabase({ dataDir }).',
  );
}

function loadSchema() {
  if (schemaSql) {
    return schemaSql;
  }

  let schema = readFileSync(SCHEMA_PATH, 'utf-8');

  schema = schema.replace(
    /CREATE EXTENSION IF NOT EXISTS.*?;/gi,
    '-- Extension not supported in PGlite\n',
  );
  schema = schema.replace(
    /CREATE INDEX IF NOT EXISTS.*?USING GIN.*?;/gi,
    '-- GIN index not supported in PGlite\n'
    + 'CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions(tags);\n',
  );

  schemaSql = schema;
  return schemaSql;
}

const REQUIRED_SCHEMA_TABLES = [
  'users',
  'domains',
  'questions',
  'quiz_history',
  'answers',
  'gamification',
  'focus_sessions',
  'aws_services',
  'cases',
  'case_progress',
  'validator_requests',
  'validator_certifications',
  'role_audit_log',
  'user_module_state',
];

async function hasCurrentSchema(database) {
  const placeholders = REQUIRED_SCHEMA_TABLES.map((_, index) => `$${index + 1}`).join(', ');
  const result = await database.query(
    `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${placeholders})`,
    REQUIRED_SCHEMA_TABLES,
  );

  return Number(result.rows[0]?.count || 0) === REQUIRED_SCHEMA_TABLES.length;
}

/**
 * Initialize database connection
 * @param {Object} options - Configuration options
 * @param {string} [options.dataDir] - Persistent directory or memory:// in tests
 * @param {string} [options.environment] - Overrides NODE_ENV
 * @returns {Promise<PGlite>} Database instance
 */
export async function initializeDatabase(options = {}) {
  if (db && !db.closed) {
    console.log('[database] Reusing active PGlite instance');
    return db;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const databaseOptions = resolveDatabaseOptions(options);
    let database = null;

    console.log(
      `[database] Initializing PGlite in ${databaseOptions.mode} mode `
      + `(${databaseOptions.environment})`,
    );

    try {
      database = await PGlite.create({ dataDir: databaseOptions.dataDir });
      console.log('[database] PGlite instance ready');

      if (await hasCurrentSchema(database)) {
        console.log('[database] Current schema detected; skipped full schema re-application');
      } else {
        await database.exec(loadSchema());
        console.log('[database] Schema applied successfully');
      }

      db = database;
      return db;
    } catch (error) {
      if (database && !database.closed) {
        await database.close().catch(() => {});
      }
      db = null;

      // RuntimeError: Aborted() — typically means another process has the same
      // dataDir open (PGlite single-writer constraint). Retry once after a short
      // delay to handle race conditions during concurrent startup (e.g. seed +
      // api:start launched nearly simultaneously by npm run dev).
      const isAbortError =
        error.message &&
        (error.message.includes('Aborted') || error.message.includes('RuntimeError'));

      if (isAbortError && databaseOptions.mode === 'persistent') {
        console.warn(
          '[database] PGlite Aborted — another process may have the dataDir open. ' +
          'Retrying in 2 s...',
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          database = await PGlite.create({ dataDir: databaseOptions.dataDir });
          console.log('[database] PGlite instance ready (retry)');
          await database.exec(loadSchema());
          console.log('[database] Schema applied successfully (retry)');
          db = database;
          return db;
        } catch (retryError) {
          if (database && !database.closed) {
            await database.close().catch(() => {});
          }
          db = null;
          console.error('[database] Retry also failed:', retryError.message);
          throw retryError;
        }
      }

      console.error('[database] Initialization failed:', error.message);
      throw error;
    }
  })();

  try {
    return await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Get database instance
 * @returns {PGlite} Database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  if (closePromise) {
    return closePromise;
  }

  closePromise = (async () => {
    if (initializationPromise) {
      await initializationPromise;
    }

    const activeDatabase = db;
    db = null;

    if (activeDatabase && !activeDatabase.closed) {
      await activeDatabase.close();
      console.log('[database] PGlite instance closed');
    }
  })();

  try {
    await closePromise;
  } catch (error) {
    console.error('[database] Close failed:', error.message);
    throw error;
  } finally {
    closePromise = null;
  }
}

/**
 * Normalize an AWS certification ID for PostgreSQL enum values.
 * @param {string} certification - Certification ID
 * @returns {string} Normalized certification ID
 */
export function normalizeCertification(certification) {
  return normalizeCertificationId(certification);
}

/**
 * Execute raw SQL query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
export async function executeQuery(query, params = []) {
  const database = getDatabase();
  try {
    return await queryRows(database, query, params);
  } catch (error) {
    console.error('✗ Query execution failed:', error.message);
    throw error;
  }
}

/**
 * Execute SQL without returning results
 * @param {string} sql - SQL statement
 * @returns {Promise<void>}
 */
export async function executeSql(sql) {
  const database = getDatabase();
  try {
    await database.exec(sql);
  } catch (error) {
    console.error('✗ SQL execution failed:', error.message);
    throw error;
  }
}

// ============================================================================
// QUESTIONS - CRUD Operations
// ============================================================================

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeRequiredString(value, fieldName, { minLength = 1 } = {}) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (normalized.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} character(s)`);
  }

  return normalized;
}

function normalizeMaxLength(value, fieldName, maxLength) {
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} character(s)`);
  }

  return value;
}

function normalizeOptionalString(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeRequiredString(value, fieldName);
}

function normalizeLimit(value, defaultLimit = DEFAULT_QUESTION_LIMIT) {
  const numericValue = Number.parseInt(value ?? defaultLimit, 10);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return defaultLimit;
  }

  return Math.min(numericValue, MAX_QUESTION_LIMIT);
}

function normalizeBoundedLimit(value, defaultLimit, maxLimit) {
  const numericValue = Number.parseInt(value ?? defaultLimit, 10);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return defaultLimit;
  }

  return Math.min(numericValue, maxLimit);
}

function normalizeOffset(value) {
  const numericValue = Number.parseInt(value ?? 0, 10);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return numericValue;
}

function validateCertification(certification, { required = false } = {}) {
  if (certification === undefined || certification === null || certification === '') {
    if (required) {
      throw new Error('certification is required');
    }
    return undefined;
  }

  const normalized = normalizeCertificationId(
    normalizeRequiredString(certification, 'certification'),
  );

  if (!VALID_CERTIFICATIONS.has(normalized)) {
    throw new Error(`Invalid certification: ${certification}`);
  }

  return normalized;
}

function validateDifficulty(difficulty, { required = false } = {}) {
  if (difficulty === undefined || difficulty === null || difficulty === '') {
    if (required) {
      throw new Error('difficulty is required');
    }
    return undefined;
  }

  const normalized = normalizeRequiredString(difficulty, 'difficulty');
  if (!VALID_DIFFICULTIES.has(normalized)) {
    throw new Error('difficulty must be one of: easy, medium, hard');
  }

  return normalized;
}

function validateValidationStatus(status, { required = false } = {}) {
  if (status === undefined || status === null || status === '') {
    if (required) {
      throw new Error('validation_status is required');
    }
    return undefined;
  }

  const normalized = normalizeRequiredString(status, 'validation_status').toUpperCase();
  if (!VALID_VALIDATION_STATUSES.has(normalized)) {
    throw new Error('validation_status must be one of: PENDING, APPROVED, REJECTED');
  }

  return normalized;
}

function normalizeValidationLogs(logs) {
  if (logs === undefined || logs === null) {
    return undefined;
  }

  if (!Array.isArray(logs)) {
    throw new Error('validation_logs must be an array');
  }

  return logs;
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new Error('tags must be an array');
  }

  return tags.map((tag, index) => normalizeRequiredString(tag, `tags[${index}]`));
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('options must be an array with at least 2 items');
  }

  return options.map((option, index) => {
    if (typeof option === 'string') {
      return normalizeRequiredString(option, `options[${index}]`);
    }

    if (isPlainObject(option)) {
      const normalizedOption = { ...option };
      if ('id' in normalizedOption) {
        normalizedOption.id = normalizeRequiredString(
          String(normalizedOption.id),
          `options[${index}].id`,
        );
      }
      normalizedOption.text = normalizeRequiredString(
        normalizedOption.text,
        `options[${index}].text`,
      );
      return normalizedOption;
    }

    throw new Error(`options[${index}] must be a string or an object`);
  });
}

function normalizeCorrectAnswer(correctAnswer, options) {
  const answers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

  if (answers.length === 0 || answers.some((answer) => answer === undefined || answer === null)) {
    throw new Error('correct_answer must contain at least one answer');
  }

  const optionIds = options
    .filter((option) => isPlainObject(option) && option.id)
    .map((option) => option.id);

  answers.forEach((answer, index) => {
    if (typeof answer === 'number') {
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        throw new Error(`correct_answer[${index}] must reference a valid option index`);
      }
      return;
    }

    if (typeof answer === 'string') {
      if (optionIds.length > 0 && optionIds.includes(answer)) {
        return;
      }
      throw new Error(`correct_answer[${index}] must reference a valid option id`);
    }

    throw new Error(`correct_answer[${index}] must be a number or string`);
  });

  return answers;
}

function normalizeQuestionInput(questionData, { partial = false } = {}) {
  if (!isPlainObject(questionData)) {
    throw new Error('questionData must be an object');
  }

  const normalized = {};
  const certification = questionData.certification;
  const domain = questionData.domain;
  const difficulty = questionData.difficulty;
  const questionText = questionData.question_text ?? questionData.question;
  const correctAnswer = questionData.correct_answer ?? questionData.correct;

  if (!partial || certification !== undefined) {
    normalized.certification = validateCertification(certification, { required: !partial });
  }

  if (!partial || domain !== undefined) {
    normalized.domain = normalizeRequiredString(domain, 'domain');
  }

  if (!partial || difficulty !== undefined) {
    normalized.difficulty = validateDifficulty(difficulty, { required: !partial });
  }

  if (!partial || questionText !== undefined) {
    normalized.question_text = normalizeRequiredString(
      questionText,
      'question_text',
      { minLength: 10 },
    );
  }

  if (!partial || questionData.options !== undefined) {
    normalized.options = normalizeOptions(questionData.options);
  }

  if (!partial || correctAnswer !== undefined) {
    if (normalized.options) {
      normalized.correct_answer = normalizeCorrectAnswer(correctAnswer, normalized.options);
    } else {
      normalized.correct_answer = Array.isArray(correctAnswer)
        ? correctAnswer
        : [correctAnswer];
    }
  }

  if (!partial || questionData.explanation !== undefined) {
    normalized.explanation = normalizeRequiredString(questionData.explanation, 'explanation');
  }

  if (questionData.reference_url !== undefined || questionData.reference !== undefined || !partial) {
    normalized.reference_url = normalizeOptionalString(
      questionData.reference_url ?? questionData.reference,
      'reference_url',
    );
  }

  if (questionData.tags !== undefined || !partial) {
    normalized.tags = normalizeTags(questionData.tags);
  }

  if (questionData.validation_status !== undefined) {
    normalized.validation_status = validateValidationStatus(questionData.validation_status);
  }

  if (questionData.rejection_reason !== undefined) {
    normalized.rejection_reason = normalizeOptionalString(
      questionData.rejection_reason,
      'rejection_reason',
    );
  }

  if (questionData.validation_logs !== undefined) {
    normalized.validation_logs = normalizeValidationLogs(questionData.validation_logs);
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined),
  );
}

async function normalizeQuestionUpdate(updates, existingQuestion) {
  const candidate = {
    ...existingQuestion,
    ...updates,
    correct_answer: updates.correct_answer ?? updates.correct ?? existingQuestion.correct_answer,
    question_text: updates.question_text ?? updates.question ?? existingQuestion.question_text,
  };
  const normalizedCandidate = normalizeQuestionInput(candidate);
  const allowedFields = new Set([
    'certification',
    'domain',
    'difficulty',
    'question_text',
    'options',
    'correct_answer',
    'explanation',
    'reference_url',
    'tags',
    'validation_status',
    'rejection_reason',
    'validation_logs',
    'validated_by',
    'validated_at',
  ]);
  const normalizedUpdates = {};

  Object.keys(updates).forEach((key) => {
    const storageKey = key === 'question'
      ? 'question_text'
      : key === 'correct'
        ? 'correct_answer'
        : key;

    if (!allowedFields.has(storageKey)) {
      return;
    }

    if (storageKey in normalizedCandidate) {
      normalizedUpdates[storageKey] = normalizedCandidate[storageKey];
    } else {
      normalizedUpdates[storageKey] = updates[key];
    }
  });

  if (Object.keys(normalizedUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  return normalizedUpdates;
}

function normalizeQuestionFilters(certificationOrFilters, domain, difficulty, options) {
  if (isPlainObject(certificationOrFilters)) {
    return {
      certification: certificationOrFilters.certification,
      domain: certificationOrFilters.domain,
      difficulty: certificationOrFilters.difficulty,
      limit: certificationOrFilters.limit,
      offset: certificationOrFilters.offset,
    };
  }

  return {
    certification: certificationOrFilters,
    domain,
    difficulty,
    limit: options?.limit,
    offset: options?.offset,
  };
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * Get all active questions with optional filters and pagination.
 * Supports both getQuestions({ ...filters }) and
 * getQuestions(certification, domain, difficulty, options).
 * @param {Object|string} certificationOrFilters - Filter object or certification code
 * @param {string} [domain] - Filter by domain slug
 * @param {string} [difficulty] - Filter by difficulty level ('easy', 'medium', 'hard')
 * @param {Object} [options] - Pagination options
 * @param {number} [options.limit] - Max results (default: 10, max: 100)
 * @param {number} [options.offset] - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of questions
 */
export async function getQuestions(certificationOrFilters = {}, domain, difficulty, options = {}) {
  const filters = normalizeQuestionFilters(certificationOrFilters, domain, difficulty, options);
  const normalizedCertification = validateCertification(filters.certification);
  const normalizedDomain = filters.domain
    ? normalizeRequiredString(filters.domain, 'domain')
    : undefined;
  const normalizedDifficulty = validateDifficulty(filters.difficulty);
  const limit = normalizeLimit(filters.limit, DEFAULT_QUESTION_LIMIT);
  const offset = normalizeOffset(filters.offset);

  let query = 'SELECT * FROM questions WHERE is_active = TRUE';
  const params = [];
  let paramIndex = 1;

  if (normalizedCertification) {
    query += ` AND certification = $${paramIndex++}`;
    params.push(normalizedCertification);
  }

  if (normalizedDomain) {
    query += ` AND domain = $${paramIndex++}`;
    params.push(normalizedDomain);
  }

  if (normalizedDifficulty) {
    query += ` AND difficulty = $${paramIndex++}`;
    params.push(normalizedDifficulty);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.error('✗ Error fetching questions:', error.message);
    throw error;
  }
}

/**
 * Get a single question by ID
 * @param {string} questionId - UUID of the question
 * @returns {Promise<Object|null>} Question object or null if not found
 */
export async function getQuestionById(questionId) {
  normalizeRequiredString(questionId, 'questionId');
  const query = 'SELECT * FROM questions WHERE id = $1 AND is_active = TRUE';

  try {
    const result = await executeQuery(query, [questionId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error fetching question by ID:', error.message);
    throw error;
  }
}

/**
 * Search questions by text query.
 * @param {string} searchTerm - Term to search in question text, explanation, or domain
 * @param {number} limit - Max results (default: 20, max: 100)
 * @returns {Promise<Array>} Array of matching questions
 */
export async function searchQuestions(searchTerm, limit = 20) {
  const normalizedSearchTerm = normalizeRequiredString(searchTerm, 'searchTerm');
  const normalizedLimit = normalizeLimit(limit, DEFAULT_SEARCH_LIMIT);
  const pattern = `%${escapeLikePattern(normalizedSearchTerm)}%`;
  const query = `
    SELECT * FROM questions 
    WHERE is_active = TRUE 
    AND (
      question_text ILIKE $1 ESCAPE '\\'
      OR explanation ILIKE $1 ESCAPE '\\'
      OR domain ILIKE $1 ESCAPE '\\'
    )
    ORDER BY created_at DESC
    LIMIT $2
  `;

  try {
    return await executeQuery(query, [pattern, normalizedLimit]);
  } catch (error) {
    console.error('✗ Error searching questions:', error.message);
    throw error;
  }
}

/**
 * Insert a new question
 * @param {Object} questionData - Question data
 * @param {string} questionData.certification - Certification code
 * @param {string} questionData.domain - Domain slug
 * @param {string} questionData.difficulty - Difficulty level
 * @param {string} questionData.question_text - Question text
 * @param {Array} questionData.options - Array of option objects [{id, text}, ...]
 * @param {Array} questionData.correct_answer - Array of correct answer IDs
 * @param {string} questionData.explanation - Explanation text
 * @param {string} questionData.reference_url - Reference URL (optional)
 * @param {Array} questionData.tags - Array of tags (optional)
 * @returns {Promise<Object>} Inserted question with ID
 */
export async function insertQuestion(questionData) {
  const normalizedQuestion = normalizeQuestionInput(questionData);
  const {
    certification,
    domain,
    difficulty,
    question_text,
    options,
    correct_answer,
    explanation,
    reference_url = null,
    tags = [],
  } = normalizedQuestion;

  const query = `
    INSERT INTO questions (
      certification, domain, difficulty, question_text,
      options, correct_answer, explanation, reference_url, tags, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
    RETURNING *
  `;

  try {
    const result = await executeQuery(query, [
      normalizeCertificationId(certification),
      domain,
      difficulty,
      question_text,
      JSON.stringify(options),
      JSON.stringify(correct_answer),
      explanation,
      reference_url,
      tags,
    ]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error inserting question:', error.message);
    throw error;
  }
}

/**
 * Update an existing question
 * @param {string} questionId - UUID of question to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated question or null if not found
 */
export async function updateQuestion(questionId, updates) {
  normalizeRequiredString(questionId, 'questionId');

  if (!isPlainObject(updates)) {
    throw new Error('questionData must be an object');
  }

  const existingQuestion = await getQuestionById(questionId);
  if (!existingQuestion) {
    return null;
  }

  const filteredUpdates = await normalizeQuestionUpdate(updates, existingQuestion);

  // Build dynamic query
  const setClause = Object.keys(filteredUpdates)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const query = `
    UPDATE questions 
    SET ${setClause}
    WHERE id = $${Object.keys(filteredUpdates).length + 1}
    RETURNING *
  `;

  try {
    const params = [
      ...Object.entries(filteredUpdates).map(([key, value]) => {
        if (key === 'options' || key === 'correct_answer' || key === 'validation_logs') {
          return JSON.stringify(value);
        }
        return value;
      }),
      questionId,
    ];
    const result = await executeQuery(query, params);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error updating question:', error.message);
    throw error;
  }
}

/**
 * Get questions by certification and domain.
 * @param {string} certification - Certification code
 * @param {string} domain - Domain slug
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} Array of questions
 */
export async function getQuestionsByDomain(certification, domain, options = {}) {
  const normalizedCertification = validateCertification(certification, { required: true });
  const normalizedDomain = normalizeRequiredString(domain, 'domain');

  return getQuestions(normalizedCertification, normalizedDomain, undefined, options);
}

/**
 * Soft delete (deactivate) a question
 * @param {string} questionId - UUID of question to deactivate
 * @returns {Promise<Object|null>} Deactivated question or null if not found
 */
export async function deleteQuestion(questionId) {
  normalizeRequiredString(questionId, 'questionId');
  const query = 'UPDATE questions SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING *';

  try {
    const result = await executeQuery(query, [questionId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error deleting question:', error.message);
    throw error;
  }
}

// ============================================================================
// USERS - CRUD Operations
// ============================================================================

function normalizeUserId(userId) {
  return normalizeRequiredString(userId, 'userId');
}

/** Mantido para testes legados e seed — aceita string simples como anonymous_name */
function normalizeAnonymousName(anonymousName) {
  return normalizeMaxLength(
    normalizeRequiredString(anonymousName, 'anonymousName'),
    'anonymousName',
    100,
  );
}

function normalizeEmail(email) {
  const normalized = normalizeRequiredString(email, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('email must be a valid email address');
  }
  return normalized.toLowerCase().trim();
}

function normalizeRole(role) {
  const valid = new Set(['STUDENT', 'VALIDATOR', 'ADMIN']);
  const normalized = String(role || 'STUDENT').toUpperCase().trim();
  if (!valid.has(normalized)) {
    throw new Error(`role must be one of: ${[...valid].join(', ')}`);
  }
  return normalized;
}

function normalizeUserUpdate(data) {
  if (!isPlainObject(data)) {
    throw new Error('data must be an object');
  }

  const updates = {};

  // Campos legados — mantidos para compatibilidade com testes existentes
  const anonymousName = data.anonymous_name ?? data.anonymousName;
  if (anonymousName !== undefined) {
    updates.anonymous_name = normalizeAnonymousName(anonymousName);
  }

  // Novos campos de identidade corporativa
  if (data.email !== undefined) {
    updates.email = normalizeEmail(data.email);
  }
  if (data.full_name !== undefined) {
    updates.full_name = String(data.full_name).trim().slice(0, 150) || null;
  }
  if (data.nickname !== undefined) {
    updates.nickname = String(data.nickname).trim().slice(0, 60) || null;
  }
  if (data.role !== undefined) {
    updates.role = normalizeRole(data.role);
  }
  if (data.is_active !== undefined) {
    updates.is_active = Boolean(data.is_active);
  }
  if (data.last_login !== undefined) {
    updates.last_login = data.last_login;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No valid fields to update');
  }

  return updates;
}

/**
 * Create a new user.
 *
 * Suporta dois modos:
 *   1. Legado (testes): createUser(anonymousName: string)
 *   2. Corporativo: createUser({ email, full_name, nickname, role })
 *
 * @param {string|Object} dataOrName
 * @returns {Promise<Object|null>} Created user object
 */
export async function createUser(dataOrName) {
  try {
    // Modo legado — string simples como anonymous_name
    if (typeof dataOrName === 'string') {
      const normalizedName = normalizeAnonymousName(dataOrName);
      const query = 'INSERT INTO users (anonymous_name) VALUES ($1) RETURNING *';
      const result = await executeQuery(query, [normalizedName]);
      return result.length > 0 ? result[0] : null;
    }

    // Modo corporativo — objeto com email obrigatório
    const data = dataOrName || {};
    const email = normalizeEmail(data.email ?? '');
    const nickname = data.nickname ? String(data.nickname).trim().slice(0, 60) : null;
    const full_name = data.full_name ? String(data.full_name).trim().slice(0, 150) : null;
    const role = normalizeRole(data.role ?? 'STUDENT');

    const query = `
      INSERT INTO users (email, full_name, nickname, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await executeQuery(query, [email, full_name, nickname, role]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error creating user:', error.message);
    throw error;
  }
}

/**
 * Upsert por email corporativo — cria STUDENT se não existir, retorna o existente se já houver.
 * Atualiza last_login e, opcionalmente, full_name/nickname na primeira passagem.
 *
 * @param {string} email
 * @param {Object} [profile] - { full_name, nickname }
 * @returns {Promise<{user: Object, created: boolean}>}
 */
export async function upsertUserByEmail(email, profile = {}) {
  const normalizedEmail = normalizeEmail(email);

  try {
    // Tenta localizar usuário existente
    const existing = await executeQuery(
      `SELECT * FROM users
        WHERE LOWER(email) = LOWER($1)
        ORDER BY CASE role
          WHEN 'ADMIN' THEN 1
          WHEN 'VALIDATOR' THEN 2
          ELSE 3
        END, created_at ASC
        LIMIT 1`,
      [normalizedEmail],
    );

    if (existing.length > 0) {
      // Atualiza last_login (e opcionalmente nome/nickname se ainda não preenchidos)
      const updateFields = ['last_login = NOW()'];
      const params = [];

      if (profile.full_name && !existing[0].full_name) {
        params.push(String(profile.full_name).trim().slice(0, 150));
        updateFields.push(`full_name = $${params.length}`);
      }
      if (profile.nickname && !existing[0].nickname) {
        params.push(String(profile.nickname).trim().slice(0, 60));
        updateFields.push(`nickname = $${params.length}`);
      }

      params.push(existing[0].id);
      const updated = await executeQuery(
        `UPDATE users SET ${updateFields.join(', ')}
          WHERE id = $${params.length}
          RETURNING *`,
        params,
      );
      return { user: updated[0] ?? existing[0], created: false };
    }

    // Cria novo usuário como STUDENT
    const nickname = profile.nickname
      ? String(profile.nickname).trim().slice(0, 60)
      : normalizedEmail.split('@')[0];
    const full_name = profile.full_name
      ? String(profile.full_name).trim().slice(0, 150)
      : null;

    const inserted = await executeQuery(
      `INSERT INTO users (email, full_name, nickname, role, last_login)
       VALUES ($1, $2, $3, 'STUDENT', NOW())
       RETURNING *`,
      [normalizedEmail, full_name, nickname],
    );
    return { user: inserted[0], created: true };
  } catch (error) {
    console.error('✗ Error upserting user by email:', error.message);
    throw error;
  }
}

/**
 * Get user by ID
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUserById(userId) {
  const normalizedUserId = normalizeUserId(userId);
  // PGlite can expose UUID columns created by a persistent/migrated schema as
  // text for parameter binding. Comparing their canonical text form keeps
  // token `sub` lookups stable across fresh and existing databases.
  const query = 'SELECT * FROM users WHERE id::text = $1';

  try {
    const result = await executeQuery(query, [normalizedUserId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error fetching user:', error.message);
    throw error;
  }
}

function normalizeModuleScope(module, certificationId = null) {
  const normalizedModule = String(module || '').trim().toLowerCase();
  if (!USER_MODULES.has(normalizedModule)) {
    const error = new Error(`Unsupported user module: ${module}`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedCertification = certificationId
    ? normalizeCertificationId(certificationId)
    : '';
  return { module: normalizedModule, certificationId: normalizedCertification };
}

function normalizeModuleState(state) {
  if (state === undefined || state === null) return {};
  if (typeof state !== 'object' || Array.isArray(state)) {
    const error = new Error('state must be a JSON object');
    error.statusCode = 400;
    throw error;
  }
  const serialized = JSON.stringify(state);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_MODULE_STATE_BYTES) {
    const error = new Error('state exceeds the maximum allowed size');
    error.statusCode = 413;
    throw error;
  }
  return JSON.parse(serialized);
}

export async function getUserModuleState(userId, module, certificationId = null) {
  const normalizedUserId = normalizeUserId(userId);
  const scope = normalizeModuleScope(module, certificationId);
  const rows = await executeQuery(`
    SELECT id, user_id, module, certification_id, state_json, version, updated_at
    FROM user_module_state
    WHERE user_id = $1 AND module = $2
      AND certification_id = $3
    LIMIT 1
  `, [normalizedUserId, scope.module, scope.certificationId]);
  return rows[0] || null;
}

export async function upsertUserModuleState(userId, module, certificationId, state, expectedVersion = null) {
  const normalizedUserId = normalizeUserId(userId);
  const scope = normalizeModuleScope(module, certificationId);
  const normalizedState = normalizeModuleState(state);
  const existing = await getUserModuleState(normalizedUserId, scope.module, scope.certificationId);

  if (expectedVersion !== null && existing && Number(expectedVersion) !== Number(existing.version)) {
    const error = new Error('module state version conflict');
    error.statusCode = 409;
    error.current = existing;
    throw error;
  }

  const nextVersion = existing ? Number(existing.version) + 1 : 1;
  const rows = await executeQuery(`
    INSERT INTO user_module_state (user_id, module, certification_id, state_json, version)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, module, certification_id) DO UPDATE SET
      state_json = EXCLUDED.state_json,
      version = EXCLUDED.version,
      updated_at = NOW()
    RETURNING id, user_id, module, certification_id, state_json, version, updated_at
  `, [normalizedUserId, scope.module, scope.certificationId, JSON.stringify(normalizedState), nextVersion]);
  return rows[0] || null;
}

/**
 * Get user by email (corporativo)
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const query = `SELECT * FROM users
    WHERE LOWER(email) = LOWER($1)
    ORDER BY CASE role
      WHEN 'ADMIN' THEN 1
      WHEN 'VALIDATOR' THEN 2
      ELSE 3
    END, created_at ASC
    LIMIT 1`;

  try {
    const result = await executeQuery(query, [normalizedEmail]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error fetching user by email:', error.message);
    throw error;
  }
}

/**
 * Get user by anonymous name (legado — mantido para compatibilidade)
 * @param {string} anonymousName
 * @returns {Promise<Object|null>}
 */
export async function getUserByName(anonymousName) {
  const normalizedName = normalizeAnonymousName(anonymousName);
  const query = 'SELECT * FROM users WHERE anonymous_name = $1';

  try {
    const result = await executeQuery(query, [normalizedName]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error fetching user by name:', error.message);
    throw error;
  }
}

/**
 * Update a user — suporta todos os campos (legados e novos)
 * @param {string} userId - UUID of the user
 * @param {Object} data - Fields to update
 * @returns {Promise<Object|null>} Updated user or null if not found
 */
export async function updateUser(userId, data) {
  const normalizedUserId = normalizeUserId(userId);
  const updates = normalizeUserUpdate(data);
  const setClause = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');
  const query = `
    UPDATE users
    SET ${setClause}
    WHERE id = $${Object.keys(updates).length + 1}
    RETURNING *
  `;

  try {
    const result = await executeQuery(query, [...Object.values(updates), normalizedUserId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
}

const ACCESS_CERTIFICATIONS = new Set(['CLF-C02', 'SAA-C03', 'DVA-C02', 'AIF-C01']);
const ACCESS_ROLES = new Set(['STUDENT', 'VALIDATOR', 'ADMIN']);

function normalizeAccessCertification(certificationId) {
  const normalized = normalizeCertificationId(certificationId);
  if (!ACCESS_CERTIFICATIONS.has(normalized)) {
    const error = new Error(`Unsupported validator certification: ${certificationId}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function normalizeAccessRole(role) {
  const normalized = String(role || '').toUpperCase().trim();
  if (!ACCESS_ROLES.has(normalized)) throw new Error(`role must be one of: ${[...ACCESS_ROLES].join(', ')}`);
  return normalized;
}

export async function listUsers({ search = '', limit = 50, offset = 0 } = {}) {
  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const normalizedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const term = String(search || '').trim();
  return executeQuery(`
    SELECT u.id, u.email, u.full_name, u.nickname, u.role, u.is_active,
           u.last_login, u.created_at, u.updated_at,
           COALESCE(json_agg(json_build_object(
             'certification_id', vc.certification_id,
             'is_active', vc.is_active,
             'verified_at', vc.verified_at
           ) ORDER BY vc.certification_id) FILTER (WHERE vc.user_id IS NOT NULL), '[]') AS validator_certifications
    FROM users u
    LEFT JOIN validator_certifications vc ON vc.user_id = u.id AND vc.is_active = TRUE
    WHERE ($1 = '' OR LOWER(COALESCE(u.email, '')) LIKE LOWER('%' || $1 || '%')
       OR LOWER(COALESCE(u.full_name, '')) LIKE LOWER('%' || $1 || '%')
       OR LOWER(COALESCE(u.nickname, '')) LIKE LOWER('%' || $1 || '%'))
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT $2 OFFSET $3
  `, [term, normalizedLimit, normalizedOffset]);
}

export async function getValidatorCertifications(userId, activeOnly = true) {
  const normalizedUserId = normalizeUserId(userId);
  return executeQuery(`
    SELECT user_id, certification_id, verified_by, verified_at, source_request_id, is_active
    FROM validator_certifications
    WHERE user_id = $1 ${activeOnly ? 'AND is_active = TRUE' : ''}
    ORDER BY certification_id
  `, [normalizedUserId]);
}

export async function removeValidatorCertification(actorUserId, targetUserId, certificationId) {
  const actor = await getUserById(actorUserId);
  if (!actor || actor.role !== 'ADMIN') throw new Error('ADMIN access required');
  const normalizedCertification = normalizeAccessCertification(certificationId);
  const result = await executeQuery(`
    UPDATE validator_certifications
    SET is_active = FALSE
    WHERE user_id = $1 AND certification_id = $2 AND is_active = TRUE
    RETURNING *
  `, [normalizeUserId(targetUserId), normalizedCertification]);
  if (result[0]) {
    await recordRoleAudit(actorUserId, targetUserId, 'VALIDATOR_CERTIFICATION_REMOVED', null, null, normalizedCertification);
  }
  return result[0] || null;
}

export async function canUserValidateCertification(userId, certificationId) {
  const normalizedCertification = normalizeAccessCertification(certificationId);
  const user = await getUserById(userId);
  if (!user || user.is_active === false) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'VALIDATOR') return false;
  const rows = await executeQuery(
    'SELECT 1 FROM validator_certifications WHERE user_id = $1 AND certification_id = $2 AND is_active = TRUE LIMIT 1',
    [normalizeUserId(userId), normalizedCertification],
  );
  return rows.length > 0;
}

export async function createValidatorRequest(userId, data = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const certificationId = normalizeAccessCertification(data.certification_id ?? data.certificationId);
  const user = await getUserById(normalizedUserId);
  if (!user || user.is_active === false) {
    const error = new Error('Active user is required');
    error.statusCode = 403;
    throw error;
  }
  if (user.role !== 'STUDENT') {
    const error = new Error('Only STUDENT users can request validator access');
    error.statusCode = 403;
    throw error;
  }

  const existing = await executeQuery(
    'SELECT id FROM validator_requests WHERE user_id = $1 AND certification_id = $2 AND status = \'PENDING\' LIMIT 1',
    [normalizedUserId, certificationId],
  );
  if (existing.length > 0) {
    const error = new Error('A pending request already exists for this certification');
    error.statusCode = 409;
    throw error;
  }

  const result = await executeQuery(`
    INSERT INTO validator_requests (user_id, certification_id, credential_id, credential_url, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    normalizedUserId,
    certificationId,
    data.credential_id ? String(data.credential_id).trim().slice(0, 200) : null,
    data.credential_url ? String(data.credential_url).trim() : null,
    data.notes ? String(data.notes).trim() : null,
  ]);
  return result[0] || null;
}

export async function listValidatorRequests({ userId = null, status = null } = {}) {
  const params = [];
  const filters = [];
  if (userId) { params.push(normalizeUserId(userId)); filters.push(`vr.user_id = $${params.length}`); }
  if (status) { params.push(String(status).toUpperCase()); filters.push(`vr.status = $${params.length}`); }
  return executeQuery(`
    SELECT vr.*, u.email, u.full_name, u.nickname, u.role
    FROM validator_requests vr
    JOIN users u ON u.id = vr.user_id
    ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY vr.requested_at DESC
  `, params);
}

export async function reviewValidatorRequest(requestId, reviewerId, status, reviewNotes = null) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    const error = new Error('status must be APPROVED or REJECTED');
    error.statusCode = 400;
    throw error;
  }
  const requestRows = await executeQuery('SELECT * FROM validator_requests WHERE id = $1 LIMIT 1', [normalizeRequiredString(requestId, 'requestId')]);
  const request = requestRows[0];
  if (!request) { const error = new Error('Validator request not found'); error.statusCode = 404; throw error; }
  if (request.status !== 'PENDING') { const error = new Error('Only PENDING requests can be reviewed'); error.statusCode = 409; throw error; }

  const reviewer = await getUserById(reviewerId);
  if (!reviewer || reviewer.role !== 'ADMIN') throw new Error('ADMIN reviewer required');
  const updatedRows = await executeQuery(`
    UPDATE validator_requests
    SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, review_notes = $3
    WHERE id = $4 AND status = 'PENDING'
    RETURNING *
  `, [normalizedStatus, normalizeUserId(reviewerId), reviewNotes ? String(reviewNotes).trim() : null, request.id]);
  const updated = updatedRows[0];

  if (normalizedStatus === 'APPROVED') {
    await executeQuery(`
      INSERT INTO validator_certifications (user_id, certification_id, verified_by, source_request_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (user_id, certification_id)
      DO UPDATE SET verified_by = EXCLUDED.verified_by, verified_at = CURRENT_TIMESTAMP,
                    source_request_id = EXCLUDED.source_request_id, is_active = TRUE
    `, [request.user_id, request.certification_id, normalizeUserId(reviewerId), request.id]);
    const target = await getUserById(request.user_id);
    if (target?.role === 'STUDENT') {
      await updateUser(target.id, { role: 'VALIDATOR' });
      await recordRoleAudit(reviewerId, target.id, 'VALIDATOR_REQUEST_APPROVED', 'STUDENT', 'VALIDATOR', request.certification_id, { requestId: request.id });
    }
    await recordRoleAudit(reviewerId, request.user_id, 'VALIDATOR_CERTIFICATION_ADDED', target?.role || null, target?.role || null, request.certification_id, { requestId: request.id });
  } else {
    await recordRoleAudit(reviewerId, request.user_id, 'VALIDATOR_REQUEST_REJECTED', null, null, request.certification_id, { requestId: request.id });
  }
  return updated;
}

export async function recordRoleAudit(actorUserId, targetUserId, action, oldRole = null, newRole = null, certificationId = null, metadata = {}) {
  const result = await executeQuery(`
    INSERT INTO role_audit_log (actor_user_id, target_user_id, action, old_role, new_role, certification_id, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING *
  `, [normalizeUserId(actorUserId), normalizeUserId(targetUserId), String(action), oldRole, newRole, certificationId, JSON.stringify(metadata)]);
  return result[0] || null;
}

export async function changeUserAccess(actorUserId, targetUserId, { role, is_active } = {}) {
  const actor = await getUserById(actorUserId);
  const target = await getUserById(targetUserId);
  if (!actor || actor.role !== 'ADMIN') throw new Error('ADMIN access required');
  if (!target) { const error = new Error('Target user not found'); error.statusCode = 404; throw error; }
  const nextRole = role === undefined ? target.role : normalizeAccessRole(role);
  const nextActive = is_active === undefined ? target.is_active : Boolean(is_active);
  if (target.role === 'ADMIN' && target.is_active && (nextRole !== 'ADMIN' || !nextActive)) {
    const admins = await executeQuery("SELECT COUNT(*)::int AS count FROM users WHERE role = 'ADMIN' AND is_active = TRUE");
    if (Number(admins[0]?.count || 0) <= 1) {
      const error = new Error('The last active ADMIN cannot be demoted or disabled');
      error.statusCode = 409;
      throw error;
    }
  }
  const updated = await updateUser(target.id, { role: nextRole, is_active: nextActive });
  if (target.role !== nextRole) await recordRoleAudit(actor.id, target.id, 'ROLE_CHANGED', target.role, nextRole);
  if (target.is_active !== nextActive) await recordRoleAudit(actor.id, target.id, nextActive ? 'USER_ENABLED' : 'USER_DISABLED', target.role, target.role);
  return updated;
}

// ============================================================================
// GAMIFICATION - CRUD Operations
// ============================================================================

function normalizeGamificationDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = normalizeRequiredString(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`);
  }

  return normalized;
}

function normalizeGamificationUpdates(updates) {
  if (!isPlainObject(updates)) {
    throw new Error('updates must be an object');
  }

  const normalized = {};
  const integerFields = [
    'total_quizzes',
    'current_streak',
    'longest_streak',
    'labs_completed',
    'xp_points',
  ];
  const arrayFields = ['badges', 'completed_stages', 'unlocked_stages'];

  integerFields.forEach((field) => {
    if (updates[field] !== undefined) {
      normalized[field] = normalizeNonNegativeInteger(updates[field], field);
    }
  });

  if (updates.best_score !== undefined) {
    normalized.best_score = normalizePercentage(updates.best_score, 'best_score');
  }

  arrayFields.forEach((field) => {
    if (updates[field] !== undefined) {
      normalized[field] = normalizeStringArray(updates[field], field);
    }
  });

  const lastDate = normalizeGamificationDate(updates.last_date ?? updates.lastDate, 'last_date');
  if (lastDate !== undefined) {
    normalized.last_date = lastDate;
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error('No valid fields to update');
  }

  return normalized;
}

function assertStreakConsistency(candidate) {
  if (Number(candidate.current_streak) > Number(candidate.longest_streak)) {
    throw new Error('current_streak cannot be greater than longest_streak');
  }
}

/**
 * Get or create gamification record for a user
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object|null>} Gamification record
 */
export async function getGamification(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const user = await getUserById(normalizedUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const query = 'SELECT * FROM gamification WHERE user_id = $1';

  try {
    const result = await executeQuery(query, [normalizedUserId]);
    if (result.length === 0) {
      const insertQuery = `
        INSERT INTO gamification (user_id)
        VALUES ($1)
        RETURNING *
      `;
      const insertResult = await executeQuery(insertQuery, [normalizedUserId]);
      return insertResult.length > 0 ? insertResult[0] : null;
    }
    return result[0];
  } catch (error) {
    console.error('✗ Error fetching gamification:', error.message);
    throw error;
  }
}

/**
 * Update gamification data for a user
 * @param {string} userId - UUID of the user
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated gamification record
 */
export async function updateGamification(userId, updates) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedUpdates = normalizeGamificationUpdates(updates);
  const existingGamification = await getGamification(normalizedUserId);
  const candidate = { ...existingGamification, ...normalizedUpdates };
  assertStreakConsistency(candidate);

  const setClause = Object.keys(normalizedUpdates)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const query = `
    UPDATE gamification 
    SET ${setClause}
    WHERE user_id = $${Object.keys(normalizedUpdates).length + 1}
    RETURNING *
  `;

  try {
    const params = [...Object.values(normalizedUpdates), normalizedUserId];
    const result = await executeQuery(query, params);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error updating gamification:', error.message);
    throw error;
  }
}

// ============================================================================
// QUIZ HISTORY - CRUD Operations
// ============================================================================

function normalizePositiveInteger(value, fieldName) {
  const numericValue = Number.parseInt(value, 10);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return numericValue;
}

function normalizeNonNegativeInteger(value, fieldName, defaultValue = 0) {
  const candidate = value ?? defaultValue;
  const numericValue = Number.parseInt(candidate, 10);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  return numericValue;
}

function normalizePercentage(value, fieldName) {
  const numericValue = Number.parseFloat(value);

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }

  return Number(numericValue.toFixed(2));
}

function normalizePlainObject(value, fieldName, defaultValue = {}) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (!isPlainObject(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value;
}

function normalizeStringArray(value, fieldName, defaultValue = []) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  return value.map((item, index) => normalizeRequiredString(item, `${fieldName}[${index}]`));
}

function normalizeThreshold(value = DEFAULT_WEAK_DOMAIN_THRESHOLD) {
  const numericValue = Number.parseFloat(value ?? DEFAULT_WEAK_DOMAIN_THRESHOLD);

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error('threshold must be between 0 and 100');
  }

  return numericValue;
}

function normalizeAnswerPayload(value, fieldName = 'userAnswer') {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }

  const answers = Array.isArray(value) ? value : [value];
  if (answers.length === 0) {
    throw new Error(`${fieldName} must contain at least one answer`);
  }

  return answers.map((answer, index) => {
    if (typeof answer === 'number') {
      if (!Number.isInteger(answer)) {
        throw new Error(`${fieldName}[${index}] must be a string or integer`);
      }
      return answer;
    }

    if (typeof answer === 'string') {
      return normalizeRequiredString(answer, `${fieldName}[${index}]`);
    }

    throw new Error(`${fieldName}[${index}] must be a string or integer`);
  });
}

function answerComparisonKey(value) {
  return normalizeAnswerPayload(value, 'answer')
    .map((answer) => String(answer))
    .sort();
}

function answersMatch(userAnswer, correctAnswer) {
  const userKeys = answerComparisonKey(userAnswer);
  const correctKeys = answerComparisonKey(correctAnswer);

  return userKeys.length === correctKeys.length
    && userKeys.every((answer, index) => answer === correctKeys[index]);
}

function normalizeQuizHistoryInput(userIdOrData, certification, answersOrMetadata) {
  const source = isPlainObject(userIdOrData)
    ? { ...userIdOrData }
    : {
        ...(isPlainObject(answersOrMetadata) ? answersOrMetadata : {}),
        user_id: userIdOrData,
        certification,
      };

  const answers = Array.isArray(answersOrMetadata)
    ? answersOrMetadata
    : Array.isArray(source.answers)
      ? source.answers
      : undefined;

  const userId = normalizeRequiredString(source.user_id ?? source.userId, 'userId');
  const normalizedCertification = validateCertification(source.certification, { required: true });
  const totalQuestions = normalizePositiveInteger(
    source.total_questions ?? source.totalQuestions ?? answers?.length,
    'total_questions',
  );
  const score = normalizeNonNegativeInteger(source.score, 'score', 0);

  if (score > totalQuestions) {
    throw new Error('score cannot be greater than total_questions');
  }

  const percentage = source.percentage === undefined || source.percentage === null
    ? Number(((score / totalQuestions) * 100).toFixed(2))
    : normalizePercentage(source.percentage, 'percentage');

  return {
    user_id: userId,
    certification: normalizedCertification,
    score,
    total_questions: totalQuestions,
    percentage,
    time_spent_secs: normalizeNonNegativeInteger(
      source.time_spent_secs ?? source.timeSpentSecs,
      'time_spent_secs',
      0,
    ),
    domain_scores: normalizePlainObject(source.domain_scores ?? source.domainScores, 'domain_scores'),
    weak_domains: normalizeStringArray(source.weak_domains ?? source.weakDomains, 'weak_domains'),
  };
}

function normalizeRecordAnswerInput(quizIdOrData, questionId, userAnswer, timeSecs) {
  const source = isPlainObject(quizIdOrData)
    ? quizIdOrData
    : {
        quiz_id: quizIdOrData,
        question_id: questionId,
        user_answer: userAnswer,
        time_secs: timeSecs,
      };

  return {
    quiz_id: normalizeRequiredString(source.quiz_id ?? source.quizId, 'quizId'),
    question_id: normalizeRequiredString(source.question_id ?? source.questionId, 'questionId'),
    user_answer: normalizeAnswerPayload(source.user_answer ?? source.userAnswer, 'userAnswer'),
    time_secs: normalizeNonNegativeInteger(source.time_secs ?? source.timeSecs, 'timeSecs', 0),
  };
}

function buildQuizSummary(totalQuestions, answerRows, threshold = DEFAULT_WEAK_DOMAIN_THRESHOLD) {
  const score = answerRows.filter((answer) => answer.is_correct).length;
  const denominator = Math.max(totalQuestions, 1);
  const percentage = Number(((score / denominator) * 100).toFixed(2));
  const timeSpentSecs = answerRows.reduce(
    (sum, answer) => sum + Number(answer.time_secs || 0),
    0,
  );
  const domainScores = {};

  answerRows.forEach((answer) => {
    if (!answer.domain) {
      return;
    }

    if (!domainScores[answer.domain]) {
      domainScores[answer.domain] = { score: 0, correct: 0, total: 0 };
    }

    domainScores[answer.domain].total += 1;
    if (answer.is_correct) {
      domainScores[answer.domain].score += 1;
      domainScores[answer.domain].correct += 1;
    }
  });

  const weakDomains = Object.entries(domainScores)
    .filter(([, stats]) => stats.total > 0 && ((stats.correct / stats.total) * 100) < threshold)
    .map(([domain]) => domain);

  return {
    score,
    percentage,
    time_spent_secs: timeSpentSecs,
    domain_scores: domainScores,
    weak_domains: weakDomains,
  };
}

/**
 * Create a new quiz history record
 * Supports createQuizHistory({ ...quizData }) and
 * createQuizHistory(userId, certification, answersOrMetadata).
 * @returns {Promise<Object|null>} Created quiz history record
 */
export async function createQuizHistory(userIdOrData, certification, answersOrMetadata) {
  const {
    user_id,
    certification: normalizedCertification,
    score,
    total_questions,
    percentage,
    time_spent_secs,
    domain_scores,
    weak_domains,
  } = normalizeQuizHistoryInput(userIdOrData, certification, answersOrMetadata);

  const query = `
    INSERT INTO quiz_history (
      user_id, certification, score, total_questions, percentage,
      time_spent_secs, domain_scores, weak_domains
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  try {
    const result = await executeQuery(query, [
      user_id,
      normalizedCertification,
      score,
      total_questions,
      percentage,
      time_spent_secs,
      JSON.stringify(domain_scores),
      weak_domains,
    ]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error creating quiz history:', error.message);
    throw error;
  }
}

/**
 * Get quiz history for a user
 * @param {string} userId - UUID of the user
 * @param {number} limit - Max results (default: 10)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of quiz history records
 */
export async function getQuizHistory(userId, limit = DEFAULT_HISTORY_LIMIT, offset = 0) {
  const normalizedUserId = normalizeRequiredString(userId, 'userId');
  const normalizedLimit = normalizeLimit(limit, DEFAULT_HISTORY_LIMIT);
  const normalizedOffset = normalizeOffset(offset);
  const query = `
    SELECT * FROM quiz_history 
    WHERE user_id = $1 
    ORDER BY completed_at DESC 
    LIMIT $2 OFFSET $3
  `;

  try {
    return await executeQuery(query, [normalizedUserId, normalizedLimit, normalizedOffset]);
  } catch (error) {
    console.error('✗ Error fetching quiz history:', error.message);
    throw error;
  }
}

/**
 * Get a specific quiz result
 * @param {string} quizId - UUID of the quiz history record
 * @returns {Promise<Object|null>} Quiz history record or null
 */
export async function getQuizById(quizId) {
  normalizeRequiredString(quizId, 'quizId');
  const query = 'SELECT * FROM quiz_history WHERE id = $1';

  try {
    const result = await executeQuery(query, [quizId]);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('✗ Error fetching quiz:', error.message);
    throw error;
  }
}

/**
 * Record a user's answer to a question
 * Supports recordAnswer({ ...answerData }) and
 * recordAnswer(quizId, questionId, userAnswer, timeSecs).
 * is_correct from callers is intentionally ignored; correctness is computed
 * against questions.correct_answer on the backend.
 * @returns {Promise<Object|null>} Recorded answer
 */
export async function recordAnswer(quizIdOrData, questionId, userAnswer, timeSecs) {
  const {
    quiz_id,
    question_id,
    user_answer,
    time_secs,
  } = normalizeRecordAnswerInput(quizIdOrData, questionId, userAnswer, timeSecs);

  try {
    const quiz = await getQuizById(quiz_id);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const question = await getQuestionById(question_id);
    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = answersMatch(user_answer, question.correct_answer);
    const database = getDatabase();

    return await database.transaction(async (transaction) => {
      const insertedAnswers = await queryRows(transaction, `
        INSERT INTO answers (quiz_id, question_id, user_answer, is_correct, time_secs)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        quiz_id,
        question_id,
        JSON.stringify(user_answer),
        isCorrect,
        time_secs,
      ]);
      const answer = insertedAnswers[0] || null;

      const answerRows = await queryRows(transaction, `
        SELECT a.is_correct, a.time_secs, q.domain
        FROM answers a
        LEFT JOIN questions q ON q.id = a.question_id
        WHERE a.quiz_id = $1
      `, [quiz_id]);
      const summary = buildQuizSummary(quiz.total_questions, answerRows);

      await queryRows(transaction, `
        UPDATE quiz_history
        SET score = $1,
            percentage = $2,
            time_spent_secs = $3,
            domain_scores = $4,
            weak_domains = $5
        WHERE id = $6
        RETURNING *
      `, [
        summary.score,
        summary.percentage,
        summary.time_spent_secs,
        JSON.stringify(summary.domain_scores),
        summary.weak_domains,
        quiz_id,
      ]);

      return {
        ...answer,
        is_correct: isCorrect,
        explanation: question.explanation,
        correct_answer: question.correct_answer,
      };
    });
  } catch (error) {
    console.error('✗ Error recording answer:', error.message);
    throw error;
  }
}

/**
 * Get all answers for a specific quiz
 * @param {string} quizId - UUID of the quiz history record
 * @returns {Promise<Array>} Array of answers
 */
export async function getAnswersByQuiz(quizId) {
  normalizeRequiredString(quizId, 'quizId');
  const query = 'SELECT * FROM answers WHERE quiz_id = $1 ORDER BY answered_at ASC';

  try {
    return await executeQuery(query, [quizId]);
  } catch (error) {
    console.error('✗ Error fetching answers:', error.message);
    throw error;
  }
}

// ============================================================================
// LEADERBOARD - Read Operations
// ============================================================================

/**
 * Get the top users by XP points
 * @param {number} limit - Number of top users to return (default: 100)
 * @returns {Promise<Array>} Array of leaderboard entries
 */
export async function getLeaderboard(limit = 100) {
  const normalizedLimit = normalizeBoundedLimit(
    limit,
    DEFAULT_LEADERBOARD_LIMIT,
    MAX_LEADERBOARD_LIMIT,
  );
  const query = `
    SELECT *
    FROM leaderboard
    ORDER BY xp_points DESC, display_name ASC
    LIMIT $1
  `;

  try {
    return await executeQuery(query, [normalizedLimit]);
  } catch (error) {
    console.error('✗ Error fetching leaderboard:', error.message);
    throw error;
  }
}

// ============================================================================
// USER STATISTICS - Read Operations
// ============================================================================

/**
 * Get comprehensive statistics for a user
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object|null>} User statistics record
 */
export async function getUserStats(userId) {
  const normalizedUserId = normalizeUserId(userId);
  const user = await getUserById(normalizedUserId);
  if (!user) {
    throw new Error('User not found');
  }

  const query = 'SELECT * FROM user_stats WHERE user_id = $1';
  const answerQuery = `
    SELECT
      COUNT(a.id)::int AS total_answers,
      COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct_answers
    FROM quiz_history qh
    LEFT JOIN answers a ON a.quiz_id = qh.id
    WHERE qh.user_id = $1
  `;

  try {
    const [statsResult, answerResult, gamification] = await Promise.all([
      executeQuery(query, [normalizedUserId]),
      executeQuery(answerQuery, [normalizedUserId]),
      getGamification(normalizedUserId),
    ]);
    const stats = statsResult[0] || {
      user_id: user.id,
      display_name: user.nickname ?? user.anonymous_name ?? 'Usuário',
      nickname: user.nickname,
      anonymous_name: user.anonymous_name,
      role: user.role,
      total_quizzes: 0,
      avg_score: 0,
      best_score: 0,
      total_time_secs: 0,
      certifications_practiced: 0,
      total_focus_minutes: 0,
    };
    const answerStats = answerResult[0] || {};
    const totalAnswers = Number(answerStats.total_answers || 0);
    const correctAnswers = Number(answerStats.correct_answers || 0);

    return {
      ...stats,
      total_quizzes: Number(stats.total_quizzes || 0),
      avg_score: Number(stats.avg_score || 0),
      best_score: Number(stats.best_score || 0),
      total_time_secs: Number(stats.total_time_secs || 0),
      certifications_practiced: Number(stats.certifications_practiced || 0),
      total_focus_minutes: Number(stats.total_focus_minutes || 0),
      total_answers: totalAnswers,
      correct_answers: correctAnswers,
      answer_accuracy: totalAnswers > 0
        ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2))
        : 0,
      xp_points: Number(gamification.xp_points || 0),
      current_streak: Number(gamification.current_streak || 0),
      longest_streak: Number(gamification.longest_streak || 0),
      badges: gamification.badges,
      completed_stages: gamification.completed_stages,
      unlocked_stages: gamification.unlocked_stages,
      labs_completed: Number(gamification.labs_completed || 0),
      gamification,
    };
  } catch (error) {
    console.error('✗ Error fetching user stats:', error.message);
    throw error;
  }
}

/**
 * Calculate aggregate quiz statistics for a user.
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} Aggregated user quiz statistics
 */
export async function calculateStats(userId) {
  const normalizedUserId = normalizeRequiredString(userId, 'userId');
  const query = `
    SELECT
      COUNT(*)::int AS total_quizzes,
      COALESCE(AVG(percentage), 0)::float AS avg_score,
      COALESCE(MAX(percentage), 0)::float AS best_score,
      COALESCE(SUM(time_spent_secs), 0)::int AS total_time_secs,
      COUNT(DISTINCT certification)::int AS certifications_practiced,
      COALESCE(SUM(total_questions), 0)::int AS total_questions,
      COALESCE(SUM(score), 0)::int AS correct_answers
    FROM quiz_history
    WHERE user_id = $1
  `;

  try {
    const result = await executeQuery(query, [normalizedUserId]);
    const stats = result[0] || {};
    const totalQuestions = Number(stats.total_questions || 0);
    const correctAnswers = Number(stats.correct_answers || 0);

    return {
      user_id: normalizedUserId,
      total_quizzes: Number(stats.total_quizzes || 0),
      avg_score: Number(stats.avg_score || 0),
      best_score: Number(stats.best_score || 0),
      total_time_secs: Number(stats.total_time_secs || 0),
      certifications_practiced: Number(stats.certifications_practiced || 0),
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      accuracy: totalQuestions > 0
        ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2))
        : 0,
    };
  } catch (error) {
    console.error('✗ Error calculating user stats:', error.message);
    throw error;
  }
}

/**
 * Calculate quiz result statistics
 * @param {string} quizId - UUID of the quiz history record
 * @returns {Promise<Object>} Statistics object with score, percentage, etc.
 */
export async function calculateQuizStats(quizId) {
  try {
    const quiz = await getQuizById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const answers = await getAnswersByQuiz(quizId);
    const correctCount = answers.filter((a) => a.is_correct).length;
    const totalTime = answers.reduce((sum, a) => sum + (a.time_secs || 0), 0);

    return {
      quiz_id: quizId,
      certification: quiz.certification,
      total_questions: quiz.total_questions,
      correct_answers: correctCount,
      score: quiz.score,
      percentage: quiz.percentage,
      time_spent_secs: totalTime || quiz.time_spent_secs,
      completed_at: quiz.completed_at,
    };
  } catch (error) {
    console.error('✗ Error calculating quiz stats:', error.message);
    throw error;
  }
}

/**
 * Get weak domains for a user (domains where accuracy < 70%)
 * @param {string} userId - UUID of the user
 * @param {number} threshold - Accuracy threshold percentage (default: 70)
 * @returns {Promise<Array>} Array of domain names with low scores
 */
export async function getWeakDomains(userId, threshold = DEFAULT_WEAK_DOMAIN_THRESHOLD) {
  const normalizedUserId = normalizeRequiredString(userId, 'userId');
  const normalizedThreshold = normalizeThreshold(threshold);
  const query = `
    SELECT
      q.domain,
      COUNT(*)::int AS total_questions,
      SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct_answers
    FROM answers a
    JOIN quiz_history qh ON qh.id = a.quiz_id
    JOIN questions q ON q.id = a.question_id
    WHERE qh.user_id = $1
    GROUP BY q.domain
    HAVING COUNT(*) > 0
    ORDER BY q.domain ASC
  `;

  try {
    const rows = await executeQuery(query, [normalizedUserId]);

    return rows
      .map((row) => ({
        domain: row.domain,
        accuracy: Number(((row.correct_answers / row.total_questions) * 100).toFixed(2)),
        total_questions: Number(row.total_questions),
        correct_answers: Number(row.correct_answers),
      }))
      .filter((row) => row.accuracy < normalizedThreshold)
      .sort((a, b) => a.accuracy - b.accuracy);
  } catch (error) {
    console.error('✗ Error calculating weak domains:', error.message);
    throw error;
  }
}

// Busca apenas as questões que precisam de revisão
export async function getPendingQuestions(options = {}) {
  const limit = normalizeLimit(options.limit, DEFAULT_QUESTION_LIMIT);
  const offset = normalizeOffset(options.offset);
  const certification = options.certification
    ? normalizeCertificationId(options.certification)
    : null;

  try {
    return await executeQuery(`
      SELECT *
      FROM questions
      WHERE is_active = TRUE
        AND validation_status = 'PENDING'
        AND ($3::text IS NULL OR certification::text = $3)
      ORDER BY created_at ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset, certification]);
  } catch (error) {
    console.error("Erro ao buscar questões pendentes:", error);
    throw error;
  }
}

export async function getValidationHistory({ status = null, validatorId = null } = {}) {
  const normalizedStatus = status ? String(status).toUpperCase() : null;
  if (normalizedStatus && !['APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    const error = new Error('status must be APPROVED or REJECTED');
    error.statusCode = 400;
    throw error;
  }

  const params = [normalizedStatus];
  let validatorFilter = '';
  if (validatorId) {
    params.push(normalizeUserId(validatorId));
    validatorFilter = `AND COALESCE(q.validated_by_id::text, q.validated_by) = $${params.length}`;
  }

  return executeQuery(`
    SELECT q.id, q.certification, q.domain, q.question_text,
           q.validation_status, q.rejection_reason, q.validated_at,
           COALESCE(u.full_name, u.nickname, u.email, q.validated_by) AS validator_name,
           u.email AS validator_email
      FROM questions q
      LEFT JOIN users u
        ON u.id::text = COALESCE(q.validated_by_id::text, q.validated_by)
     WHERE q.is_active = TRUE
       AND q.validation_status IN ('APPROVED', 'REJECTED')
       AND ($1::text IS NULL OR q.validation_status = $1)
       ${validatorFilter}
     ORDER BY q.validated_at DESC NULLS LAST, q.updated_at DESC
     LIMIT 200
  `, params);
}

// Atualiza o status da questão (Aprova ou Rejeita)
function normalizeValidationInput(questionIdOrData, validatorId, status, rejectionReason) {
  const source = isPlainObject(questionIdOrData)
    ? questionIdOrData
    : {
        question_id: questionIdOrData,
        validator_id: validatorId,
        status,
        rejection_reason: rejectionReason,
      };

  const normalizedStatus = validateValidationStatus(source.status, { required: true });
  const normalizedRejectionReason = normalizeOptionalString(
    source.rejection_reason ?? source.rejectionReason ?? source.feedback,
    'rejection_reason',
  );

  if (normalizedStatus === 'REJECTED' && !normalizedRejectionReason) {
    throw new Error('rejection_reason is required when rejecting a question');
  }

  return {
    question_id: normalizeRequiredString(source.question_id ?? source.questionId, 'questionId'),
    validator_id: normalizeRequiredString(
      source.validator_id ?? source.validatorId ?? source.validated_by,
      'validatorId',
    ),
    status: normalizedStatus,
    rejection_reason: normalizedStatus === 'REJECTED' ? normalizedRejectionReason : null,
  };
}

export async function validateQuestion(questionId, validatorId, status, rejectionReason = null) {
  const validation = normalizeValidationInput(questionId, validatorId, status, rejectionReason);

  try {
    const existingQuestion = await getQuestionById(validation.question_id);
    if (!existingQuestion) {
      return null;
    }

    const logEntry = {
      validatorId: validation.validator_id,
      action: validation.status,
      timestamp: new Date().toISOString(),
      reason: validation.rejection_reason,
    };

    const query = `
      UPDATE questions 
      SET validation_status = $1,
          rejection_reason = $2,
          validated_by = $3,
          validated_at = CURRENT_TIMESTAMP,
          validation_logs = validation_logs || $4::jsonb
      WHERE id = $5
        AND is_active = TRUE
      RETURNING *
    `;
    
    const values = [
      validation.status,
      validation.rejection_reason,
      validation.validator_id,
      JSON.stringify([logEntry]),
      validation.question_id,
    ];
    const result = await executeQuery(query, values);
    
    return result[0] || null;
  } catch (error) {
    console.error(`Erro ao validar questão ${questionId}:`, error);
    throw error;
  }
}

export default {
  // Core functions
  initializeDatabase,
  getDatabase,
  closeDatabase,
  executeQuery,
  executeSql,
  // Questions
  getQuestions,
  getQuestionById,
  searchQuestions,
  getQuestionsByDomain,
  insertQuestion,
  updateQuestion,
  deleteQuestion,
  // Users
  createUser,
  getUserById,
  getUserByEmail,
  getUserByName,
  upsertUserByEmail,
  updateUser,
  getUserModuleState,
  upsertUserModuleState,
  // Gamification
  getGamification,
  updateGamification,
  // Quiz History
  createQuizHistory,
  getQuizHistory,
  getQuizById,
  recordAnswer,
  getAnswersByQuiz,
  calculateStats,
  calculateQuizStats,
  // Leaderboard & Stats
  getLeaderboard,
  getUserStats,
  getWeakDomains,
  getPendingQuestions,
  getValidationHistory,
  validateQuestion,
  // Practice Domain
  getCases,
  getCaseById,
  getAwsServices,
  insertCase,
  insertAwsService,
  markCaseCompleted,
};

// ============================================================================
// PRACTICE DOMAIN — Repository Functions
// ============================================================================

/**
 * Get all active cases with optional filters.
 * @param {Object} filters
 * @param {string} [filters.certification] - Filter by certification code (e.g. 'CLF-C02')
 * @param {string} [filters.difficulty]    - Filter by difficulty ('beginner'|'intermediate'|'advanced')
 * @param {number} [filters.limit]         - Max results (default: 20)
 * @param {number} [filters.offset]        - Pagination offset (default: 0)
 * @returns {Promise<Array>} Array of case objects with services array
 */
export async function getCases(filters = {}) {
  const limit = Math.min(Number.parseInt(filters.limit ?? 20, 10) || 20, 100);
  const offset = Math.max(Number.parseInt(filters.offset ?? 0, 10) || 0, 0);

  let query = `
    SELECT
      c.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id',         s.id,
            'slug',       s.slug,
            'name',       s.name,
            'category',   s.category,
            'icon_url',   s.icon_url,
            'doc_url',    s.doc_url,
            'role_note',  cs.role_note
          ) ORDER BY s.name
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS services
    FROM cases c
    LEFT JOIN case_services cs ON cs.case_id = c.id
    LEFT JOIN aws_services s   ON s.id = cs.service_id AND s.is_active = TRUE
    WHERE c.is_active = TRUE`;

  const params = [];
  let paramIndex = 1;

  if (filters.certification) {
    query += ` AND $${paramIndex++} = ANY(c.certifications)`;
    params.push(filters.certification.toUpperCase());
  }

  if (filters.difficulty) {
    query += ` AND c.difficulty = $${paramIndex++}`;
    params.push(filters.difficulty);
  }

  query += `
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.error('✗ Error fetching cases:', error.message);
    throw error;
  }
}

/**
 * Get a single case by ID or slug, including its services and related questions.
 * @param {string} idOrSlug - UUID or slug string
 * @returns {Promise<Object|null>} Case object with services and questions, or null
 */
export async function getCaseById(idOrSlug) {
  normalizeRequiredString(idOrSlug, 'idOrSlug');

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const whereClause = isUUID ? 'c.id = $1' : 'c.slug = $1';

  const caseQuery = `
    SELECT
      c.*,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id',         s.id,
            'slug',       s.slug,
            'name',       s.name,
            'category',   s.category,
            'short_desc', s.short_desc,
            'icon_url',   s.icon_url,
            'doc_url',    s.doc_url,
            'role_note',  cs.role_note
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS services
    FROM cases c
    LEFT JOIN case_services cs ON cs.case_id = c.id
    LEFT JOIN aws_services s   ON s.id = cs.service_id AND s.is_active = TRUE
    WHERE c.is_active = TRUE AND ${whereClause}
    GROUP BY c.id`;

  try {
    const rows = await executeQuery(caseQuery, [idOrSlug]);
    if (rows.length === 0) {
      return null;
    }

    const caseRow = rows[0];

    // Fetch related questions separately to avoid cross-join complexity
    const questionQuery = `
      SELECT q.id, q.certification, q.domain, q.difficulty,
             q.question_text, q.options, q.correct_answer, q.explanation,
             q.reference_url, q.tags, cq.sort_order
      FROM case_questions cq
      JOIN questions q ON q.id = cq.question_id AND q.is_active = TRUE
      WHERE cq.case_id = $1
      ORDER BY cq.sort_order ASC, q.created_at ASC`;

    const questions = await executeQuery(questionQuery, [caseRow.id]);
    caseRow.questions = questions;

    return caseRow;
  } catch (error) {
    console.error('✗ Error fetching case by id/slug:', error.message);
    throw error;
  }
}

/**
 * Get all active AWS services, optionally filtered by category.
 * @param {Object} [filters]
 * @param {string} [filters.category] - Filter by category name
 * @returns {Promise<Array>} Array of aws_service rows
 */
export async function getAwsServices(filters = {}) {
  let query = 'SELECT * FROM aws_services WHERE is_active = TRUE';
  const params = [];

  if (filters.category) {
    query += ' AND category = $1';
    params.push(filters.category);
  }

  query += ' ORDER BY category ASC, name ASC';

  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.error('✗ Error fetching AWS services:', error.message);
    throw error;
  }
}

/**
 * Insert a new case.
 * @param {Object} caseData - Case payload
 * @returns {Promise<Object>} Inserted case row
 */
export async function insertCase(caseData) {
  const {
    slug,
    title,
    scenario,
    objective,
    difficulty = 'intermediate',
    certifications = [],
    architecture_graph = {},
    resources = [],
    tags = [],
    budget_usd = null,
    client_persona = {},
    constraints = [],
  } = caseData;

  normalizeRequiredString(slug, 'slug');
  normalizeRequiredString(title, 'title');
  normalizeRequiredString(scenario, 'scenario');
  normalizeRequiredString(objective, 'objective');

  const query = `
    INSERT INTO cases (slug, title, scenario, objective, difficulty, certifications, architecture_graph, resources, tags, budget_usd, client_persona, constraints)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (slug) DO NOTHING
    RETURNING *`;

  const rows = await executeQuery(query, [
    slug,
    title,
    scenario,
    objective,
    difficulty,
    certifications,
    JSON.stringify(architecture_graph),
    JSON.stringify(resources),
    tags,
    budget_usd,
    JSON.stringify(client_persona),
    constraints,
  ]);

  return rows[0] ?? null;
}

/**
 * Insert a new AWS service into the catalog.
 * @param {Object} serviceData - Service payload
 * @returns {Promise<Object>} Inserted service row
 */
export async function insertAwsService(serviceData) {
  const {
    slug,
    name,
    category,
    short_desc,
    icon_url = null,
    doc_url = null,
  } = serviceData;

  normalizeRequiredString(slug, 'slug');
  normalizeRequiredString(name, 'name');
  normalizeRequiredString(category, 'category');
  normalizeRequiredString(short_desc, 'short_desc');

  const query = `
    INSERT INTO aws_services (slug, name, category, short_desc, icon_url, doc_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (slug) DO NOTHING
    RETURNING *`;

  const rows = await executeQuery(query, [slug, name, category, short_desc, icon_url, doc_url]);
  return rows[0] ?? null;
}

/**
 * Mark a case as completed for a given user.
 * @param {string} userId  - User UUID
 * @param {string} caseId  - Case UUID
 * @returns {Promise<Object>} Updated progress row
 */
export async function markCaseCompleted(userId, caseId) {
  normalizeRequiredString(userId, 'userId');
  normalizeRequiredString(caseId, 'caseId');

  const query = `
    INSERT INTO case_progress (user_id, case_id, completed, completed_at)
    VALUES ($1, $2, TRUE, NOW())
    ON CONFLICT (user_id, case_id)
    DO UPDATE SET completed = TRUE, completed_at = NOW()
    RETURNING *`;

  const rows = await executeQuery(query, [userId, caseId]);
  return rows[0] ?? null;
}
/**
 * Insert a new case dialogue.
 * @param {Object} dialogueData
 * @returns {Promise<Object>} Inserted dialogue row
 */
export async function insertCaseDialogue(dialogueData) {
  const { case_id, question, answer, hints = [], sort_order = 0 } = dialogueData;
  normalizeRequiredString(question, 'question');
  normalizeRequiredString(answer, 'answer');

  const query = `
    INSERT INTO case_dialogues (case_id, question, answer, hints, sort_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;
  const rows = await executeQuery(query, [case_id, question, answer, hints, sort_order]);
  return rows[0] ?? null;
}

/**
 * Insert a new case event.
 * @param {Object} eventData
 * @returns {Promise<Object>} Inserted event row
 */
export async function insertCaseEvent(eventData) {
  const { case_id, title, description, impact_type, trigger_condition = {}, sort_order = 0 } = eventData;
  normalizeRequiredString(title, 'title');
  normalizeRequiredString(description, 'description');

  const query = `
    INSERT INTO case_events (case_id, title, description, impact_type, trigger_condition, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`;
  const rows = await executeQuery(query, [case_id, title, description, impact_type, JSON.stringify(trigger_condition), sort_order]);
  return rows[0] ?? null;
}

/**
 * Insert a new case evaluation criteria.
 * @param {Object} criteriaData
 * @returns {Promise<Object>} Inserted criteria row
 */
export async function insertCaseEvaluationCriteria(criteriaData) {
  const { case_id, service_slug, pillar, score_impact, feedback_msg } = criteriaData;
  normalizeRequiredString(service_slug, 'service_slug');
  normalizeRequiredString(pillar, 'pillar');
  normalizeRequiredString(feedback_msg, 'feedback_msg');

  // We need to resolve service_slug to service_id
  const serviceRows = await executeQuery('SELECT id FROM aws_services WHERE slug = $1', [service_slug]);
  if (serviceRows.length === 0) {
    throw new Error(`AWS Service with slug ${service_slug} not found`);
  }

  const query = `
    INSERT INTO case_evaluation_criteria (case_id, service_id, pillar, score_impact, feedback_msg)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;
  const rows = await executeQuery(query, [case_id, serviceRows[0].id, pillar, score_impact, feedback_msg]);
  return rows[0] ?? null;
}
