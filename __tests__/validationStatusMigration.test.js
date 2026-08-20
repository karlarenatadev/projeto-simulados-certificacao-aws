/** @jest-environment node */

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  insertQuestion,
} from '../backend/database/db.js';
import {
  buildCanonicalIndex,
  buildMigrationPlan,
  migrateValidationStatuses,
} from '../scripts/migrations/migrate-validation-status.mjs';

const question = (overrides = {}) => ({
  certification: 'CLF-C02',
  language: 'pt',
  source_question_id: 'migration-fixture',
  domain: 'seguranca',
  difficulty: 'easy',
  question_text: 'Which question is used by the migration fixture?',
  options: ['A', 'B'],
  correct_answer: [0],
  explanation: 'Migration fixture explanation.',
  ...overrides,
});

describe('validation status migration', () => {
  beforeEach(() => initializeDatabase({ environment: 'test', dataDir: 'memory://' }));
  afterEach(() => closeDatabase());

  test('classifies canonical, human-reviewed, orphan, and ambiguous pending rows', () => {
    const canonicalIndex = buildCanonicalIndex([
      { certification: 'CLF-C02', language: 'pt', questionId: 'candidate', validation: { status: 'validated' } },
      { certification: 'CLF-C02', language: 'pt', questionId: 'true-pending', validation: { status: 'pending' } },
      { certification: 'CLF-C02', language: 'pt', questionId: 'candidate-human', validation: { status: 'validated' } },
      { certification: 'CLF-C02', language: 'pt', questionId: 'ambiguous', validation: { status: 'validated' } },
      { certification: 'CLF-C02', language: 'pt', questionId: 'ambiguous', validation: { status: 'validated' } },
    ]);
    const plan = buildMigrationPlan([
      question({ source_question_id: 'candidate' }),
      question({ source_question_id: 'true-pending' }),
      question({ source_question_id: 'ambiguous' }),
      question({ source_question_id: 'orphan' }),
      question({ source_question_id: 'candidate-human', validated_by: 'validator-1' }),
    ], canonicalIndex);

    expect(plan.counts).toEqual({
      LEGACY_SEED_CANDIDATE: 1,
      TRUE_PENDING: 2,
      AMBIGUOUS: 1,
      ORPHAN: 1,
    });
  });

  test('applies only candidates, preserves rejected/approved, and is idempotent', async () => {
    const candidate = await insertQuestion(question({
      source_question_id: 'candidate',
      validation_status: 'PENDING',
    }));
    const rejected = await insertQuestion(question({
      source_question_id: 'rejected',
      validation_status: 'REJECTED',
    }));
    const approved = await insertQuestion(question({
      source_question_id: 'approved',
      validation_status: 'APPROVED',
    }));
    const canonicalIndex = buildCanonicalIndex([
      { certification: 'CLF-C02', language: 'pt', questionId: 'candidate', validation: { status: 'validated' } },
      { certification: 'CLF-C02', language: 'pt', questionId: 'rejected', validation: { status: 'validated' } },
    ]);

    const dryRun = await migrateValidationStatuses({ canonicalIndex });
    expect(dryRun.applied).toBe(0);
    expect((await executeQuery('SELECT validation_status FROM questions WHERE id = $1', [candidate.id]))[0].validation_status).toBe('PENDING');

    const applied = await migrateValidationStatuses({ canonicalIndex, apply: true });
    expect(applied.applied).toBe(1);
    const statuses = await executeQuery('SELECT id, validation_status FROM questions ORDER BY id');
    expect(statuses.find((row) => row.id === candidate.id).validation_status).toBe('APPROVED');
    expect(statuses.find((row) => row.id === rejected.id).validation_status).toBe('REJECTED');
    expect(statuses.find((row) => row.id === approved.id).validation_status).toBe('APPROVED');

    const second = await migrateValidationStatuses({ canonicalIndex, apply: true });
    expect(second.applied).toBe(0);
  });
});
