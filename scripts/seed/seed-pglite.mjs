#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  insertQuestion,
  normalizeCertification,
} from '../../backend/database/db.js';
import { normalizeLanguage } from '../../backend/database/normalizers.js';

const DATA_FILES = [
  { certification: 'CLF-C02', language: 'pt', path: 'data/questions/clf-c02.json' },
  { certification: 'CLF-C02', language: 'en', path: 'data/questions/clf-c02-en.json' },
  { certification: 'SAA-C03', language: 'pt', path: 'data/questions/saa-c03.json' },
  { certification: 'SAA-C03', language: 'en', path: 'data/questions/saa-c03-en.json' },
  { certification: 'DVA-C02', language: 'pt', path: 'data/questions/dva-c02.json' },
  { certification: 'DVA-C02', language: 'en', path: 'data/questions/dva-c02-en.json' },
  { certification: 'AIF-C01', language: 'pt', path: 'data/questions/aif-c01.json' },
  { certification: 'AIF-C01', language: 'en', path: 'data/questions/aif-c01-en.json' },
];

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--data-dir') {
      args.dataDir = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  npm run db:seed
  npm run db:seed -- --data-dir .pglite/aws-simulator

The seed uses DB_DATA_DIR from .env/environment unless --data-dir is provided.
It imports the main PT/EN JSON files from data/ into PGlite.
`);
}

async function readJsonArray(filePath) {
  let raw;

  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('root value must be an array');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    return option.trim();
  }

  if (option && typeof option === 'object' && typeof option.text === 'string') {
    return {
      ...option,
      id: String(option.id ?? index),
      text: option.text.trim(),
    };
  }

  throw new Error(`options[${index}] must be a string or object with text`);
}

function normalizeSeedValidationStatus(rawQuestion) {
  const rawStatus = rawQuestion.validation_status ?? rawQuestion.validation?.status;
  const normalizedStatus = String(rawStatus || '').trim().toUpperCase();

  if (normalizedStatus === 'APPROVED' || normalizedStatus === 'VALIDATED') {
    return 'APPROVED';
  }

  if (normalizedStatus === 'PENDING' || normalizedStatus === 'REJECTED') {
    return normalizedStatus;
  }

  return 'PENDING';
}

function normalizeSeedQuestion(rawQuestion, fileInfo, index) {
  const prefix = `${fileInfo.relativePath}[${index}]`;
  const options = rawQuestion.options;
  const correct = rawQuestion.correct ?? rawQuestion.correct_answer ?? rawQuestion.correctAnswer;
  const tags = Array.isArray(rawQuestion.tags) ? rawQuestion.tags : [];

  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`${prefix}: options must contain at least two items`);
  }

  if (correct === undefined || correct === null) {
    throw new Error(`${prefix}: correct answer is required`);
  }

  return {
    source_question_id: String(rawQuestion.questionId || '').trim(),
    certification: normalizeCertification(rawQuestion.certification || fileInfo.certification),
    language: normalizeLanguage(fileInfo.language, { required: true }),
    domain: rawQuestion.domain,
    difficulty: rawQuestion.difficulty || 'medium',
    question_text: rawQuestion.question_text || rawQuestion.question,
    options: options.map(normalizeOption),
    correct_answer: Array.isArray(correct) ? correct : [correct],
    explanation: rawQuestion.explanation,
    reference_url: rawQuestion.reference_url || rawQuestion.reference || null,
    tags: [
      ...tags.map((tag) => String(tag).trim()).filter(Boolean),
      `language:${fileInfo.language}`,
      `source:${fileInfo.relativePath}`,
      `source-question-id:${String(rawQuestion.questionId || '').trim()}`,
    ],
    validation_status: normalizeSeedValidationStatus(rawQuestion),
  };
}

async function findExistingQuestions(question) {
  const rows = await executeQuery(
    `SELECT id, tags FROM questions
     WHERE certification = $1
       AND language = $2
       AND source_question_id = $3
     ORDER BY created_at ASC`,
    [question.certification, question.language, question.source_question_id],
  );

  return rows;
}

function mergeTags(existingTags, newTags) {
  return [...new Set([...(Array.isArray(existingTags) ? existingTags : []), ...newTags])];
}

async function syncQuestion(question) {
  const existingRows = await findExistingQuestions(question);

  if (existingRows.length > 0) {
    for (const existing of existingRows) {
      const tags = mergeTags(existing.tags, question.tags);
      await executeQuery(
        'UPDATE questions SET tags = $1, language = $2, source_question_id = $3 WHERE id = $4',
        [tags, question.language, question.source_question_id, existing.id],
      );
    }
    return { imported: 0, skipped: 1 };
  }

  await insertQuestion(question);
  return { imported: 1, skipped: 0 };
}

function assertValidQuestion(question, fileInfo, index) {
  const prefix = `${fileInfo.relativePath}[${index}]`;
  if (!question.source_question_id) throw new Error(`${prefix}: questionId is required`);
  if (!question.certification) throw new Error(`${prefix}: unsupported certification`);
  if (!question.question_text || !question.explanation) throw new Error(`${prefix}: question and explanation are required`);
}

export async function readPlan(dataFiles = DATA_FILES) {
  const plan = [];
  const sourceIds = new Map();

  for (const fileInfo of dataFiles) {
    const rows = await readJsonArray(fileInfo.path);
    for (let index = 0; index < rows.length; index += 1) {
      const question = normalizeSeedQuestion(rows[index], fileInfo, index);
      assertValidQuestion(question, { ...fileInfo, relativePath: fileInfo.path }, index);
      const identity = `${question.certification}|${question.language}|${question.source_question_id}`;
      const contentIdentity = `${question.domain}|${question.question_text}`;
      const previous = sourceIds.get(identity);
      if (previous) {
        const reason = previous === contentIdentity ? 'duplicate editorial identity' : 'duplicate source ID with different content';
        throw new Error(`${fileInfo.path}[${index}]: ${reason} (${question.source_question_id})`);
      }
      sourceIds.set(identity, contentIdentity);
      plan.push({ question, fileInfo });
    }
  }

  return plan;
}

async function seedPlan(plan) {
  let imported = 0;
  let skipped = 0;

  for (const { question } of plan) {
    const result = await syncQuestion(question);
    imported += result.imported;
    skipped += result.skipped;
  }

  return { imported, skipped, read: plan.length };
}

export async function seedQuestions({ dataDir, dataFiles = DATA_FILES } = {}) {
  if (dataDir) process.env.DB_DATA_DIR = dataDir;
  console.log('[seed] Starting PGlite seed from JSON files');
  console.log(`[seed] DB_DATA_DIR=${process.env.DB_DATA_DIR || '(from .env or unset)'}`);

  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  try {
    const plan = await readPlan(dataFiles);
    await executeQuery('BEGIN');
    const totals = await seedPlan(plan);
    await executeQuery('COMMIT');

    console.log(
      `[seed] Done: ${totals.imported} imported, `
      + `${totals.skipped} skipped, ${totals.read} read`,
    );
  } catch (error) {
    await executeQuery('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return printHelp();
  await seedQuestions({ dataDir: args.dataDir });
}

if (process.argv[1]?.endsWith('seed-pglite.mjs')) {
  main().catch(async (error) => {
    console.error(`[seed] Failed: ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
}
