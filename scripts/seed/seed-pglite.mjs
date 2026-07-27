#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  insertQuestion,
  normalizeCertification,
} from '../../backend/database/db.js';

const DATA_FILES = [
  { certification: 'CLF-C02', language: 'pt', path: 'data/clf-c02.json' },
  { certification: 'CLF-C02', language: 'en', path: 'data/clf-c02-en.json' },
  { certification: 'SAA-C03', language: 'pt', path: 'data/saa-c03.json' },
  { certification: 'SAA-C03', language: 'en', path: 'data/saa-c03-en.json' },
  { certification: 'DVA-C02', language: 'pt', path: 'data/dva-c02.json' },
  { certification: 'DVA-C02', language: 'en', path: 'data/dva-c02-en.json' },
  { certification: 'AIF-C01', language: 'pt', path: 'data/aif-c01.json' },
  { certification: 'AIF-C01', language: 'en', path: 'data/aif-c01-en.json' },
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
    certification: normalizeCertification(rawQuestion.certification || fileInfo.certification),
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
    ],
  };
}

async function questionExists(question) {
  const rows = await executeQuery(
    `SELECT id FROM questions
     WHERE certification = $1
       AND domain = $2
       AND question_text = $3
     LIMIT 1`,
    [question.certification, question.domain, question.question_text],
  );

  return rows.length > 0;
}

async function seedFile(fileInfo) {
  const rows = await readJsonArray(fileInfo.path);
  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const question = normalizeSeedQuestion(rows[index], fileInfo, index);

    try {
      if (await questionExists(question)) {
        skipped += 1;
        continue;
      }

      await insertQuestion(question);
      imported += 1;
    } catch (error) {
      throw new Error(`${fileInfo.relativePath}[${index}]: ${error.message}`);
    }
  }

  console.log(
    `[seed] ${fileInfo.certification} ${fileInfo.language}: `
    + `${imported} imported, ${skipped} skipped, ${rows.length} read`,
  );

  return { imported, skipped, read: rows.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.dataDir) {
    process.env.DB_DATA_DIR = args.dataDir;
  }

  console.log('[seed] Starting PGlite seed from JSON files');
  console.log(`[seed] DB_DATA_DIR=${process.env.DB_DATA_DIR || '(from .env or unset)'}`);

  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  const totals = { imported: 0, skipped: 0, read: 0 };

  try {
    for (const fileInfo of DATA_FILES) {
      const result = await seedFile({
        ...fileInfo,
        relativePath: fileInfo.path,
        path: join(process.cwd(), fileInfo.path),
      });

      totals.imported += result.imported;
      totals.skipped += result.skipped;
      totals.read += result.read;
    }

    console.log(
      `[seed] Done: ${totals.imported} imported, `
      + `${totals.skipped} skipped, ${totals.read} read`,
    );
  } finally {
    await closeDatabase();
  }
}

main().catch(async (error) => {
  console.error(`[seed] Failed: ${error.message}`);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
