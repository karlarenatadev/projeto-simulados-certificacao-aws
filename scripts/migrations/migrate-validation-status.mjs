#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
} from '../../backend/database/db.js';

export const DEFAULT_DATA_FILES = [
  { certification: 'CLF-C02', language: 'pt', path: 'data/questions/clf-c02.json' },
  { certification: 'CLF-C02', language: 'en', path: 'data/questions/clf-c02-en.json' },
  { certification: 'SAA-C03', language: 'pt', path: 'data/questions/saa-c03.json' },
  { certification: 'SAA-C03', language: 'en', path: 'data/questions/saa-c03-en.json' },
  { certification: 'DVA-C02', language: 'pt', path: 'data/questions/dva-c02.json' },
  { certification: 'DVA-C02', language: 'en', path: 'data/questions/dva-c02-en.json' },
  { certification: 'AIF-C01', language: 'pt', path: 'data/questions/aif-c01.json' },
  { certification: 'AIF-C01', language: 'en', path: 'data/questions/aif-c01-en.json' },
];

function questionKey(question) {
  return `${question.certification}|${question.language}|${question.source_question_id || question.questionId}`;
}

export function buildCanonicalIndex(rows) {
  const index = new Map();
  for (const row of rows) {
    const key = questionKey(row);
    const entries = index.get(key) || [];
    entries.push({ status: row.validation_status ?? row.validation?.status });
    index.set(key, entries);
  }
  return index;
}

export async function loadCanonicalIndex(dataFiles = DEFAULT_DATA_FILES) {
  const rows = [];
  for (const file of dataFiles) {
    const source = JSON.parse(await readFile(file.path, 'utf8'));
    for (const row of source) {
      rows.push({
        ...row,
        certification: row.certification || file.certification,
        language: file.language,
      });
    }
  }
  return buildCanonicalIndex(rows);
}

function hasOperationalDecision(row) {
  const logs = Array.isArray(row.validation_logs) ? row.validation_logs : [];
  return Boolean(
    row.validated_by
    || row.validated_by_id
    || row.validated_at
    || row.rejection_reason
    || logs.length > 0,
  );
}

export function classifyPendingQuestion(row, canonicalIndex) {
  const entries = canonicalIndex.get(questionKey(row)) || [];

  if (entries.length === 0) return 'ORPHAN';
  if (entries.length !== 1) return 'AMBIGUOUS';
  if (entries[0].status !== 'validated') return 'TRUE_PENDING';
  if (hasOperationalDecision(row)) return 'TRUE_PENDING';
  return 'LEGACY_SEED_CANDIDATE';
}

export function buildMigrationPlan(rows, canonicalIndex) {
  const plan = {
    candidates: [],
    ignored: [],
    counts: {
      LEGACY_SEED_CANDIDATE: 0,
      TRUE_PENDING: 0,
      AMBIGUOUS: 0,
      ORPHAN: 0,
    },
  };

  for (const row of rows) {
    const category = classifyPendingQuestion(row, canonicalIndex);
    plan.counts[category] += 1;
    if (category === 'LEGACY_SEED_CANDIDATE') {
      plan.candidates.push(row);
    } else {
      plan.ignored.push({ ...row, category });
    }
  }

  return plan;
}

export async function migrateValidationStatuses({
  dataFiles = DEFAULT_DATA_FILES,
  canonicalIndex,
  apply = false,
} = {}) {
  const index = canonicalIndex || await loadCanonicalIndex(dataFiles);
  const pending = await executeQuery(`
    SELECT id, certification, language, source_question_id,
           validation_status, rejection_reason, validation_logs,
           validated_by, validated_by_id, validated_at
      FROM questions
     WHERE is_active = TRUE
       AND validation_status = 'PENDING'
  `);
  const plan = buildMigrationPlan(pending, index);

  if (!apply || plan.candidates.length === 0) {
    return { ...plan, applied: 0, dryRun: !apply };
  }

  let applied = 0;
  await executeQuery('BEGIN');
  try {
    for (const row of plan.candidates) {
      const result = await executeQuery(`
        UPDATE questions
           SET validation_status = 'APPROVED',
               validation_logs = COALESCE(validation_logs, '[]'::jsonb) || $2::jsonb
         WHERE id = $1
           AND is_active = TRUE
           AND validation_status = 'PENDING'
         RETURNING id
      `, [
        row.id,
        JSON.stringify([{
          action: 'MIGRATED_TO_APPROVED',
          reason: 'Canonical dataset is explicitly validated; no operational decision was found.',
          timestamp: new Date().toISOString(),
        }]),
      ]);
      applied += result.length || 0;
    }
    await executeQuery('COMMIT');
  } catch (error) {
    await executeQuery('ROLLBACK');
    throw error;
  }

  return { ...plan, applied, dryRun: false };
}

function parseArgs(argv) {
  const args = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--apply') args.apply = true;
    if (argv[index] === '--dry-run') args.apply = false;
    if (argv[index] === '--data-dir') {
      args.dataDir = argv[index + 1];
      index += 1;
    }
    if (argv[index] === '--help' || argv[index] === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Usage:
  npm run migrate:validation-status -- --dry-run
  npm run migrate:validation-status -- --apply
  npm run migrate:validation-status -- --dry-run --data-dir .pglite-data

Dry-run is the default. --apply is required to write changes.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  await initializeDatabase({ dataDir: args.dataDir });
  try {
    const result = await migrateValidationStatuses({ apply: args.apply });
    console.log(JSON.stringify({
      mode: result.dryRun ? 'dry-run' : 'apply',
      candidates: result.candidates.length,
      applied: result.applied,
      ignored: result.ignored.length,
      ...result.counts,
    }, null, 2));
  } finally {
    await closeDatabase();
  }
}

if (process.argv[1]?.endsWith('migrate-validation-status.mjs')) {
  main().catch((error) => {
    console.error(`[migration] Failed: ${error.message}`);
    process.exitCode = 1;
  });
}
