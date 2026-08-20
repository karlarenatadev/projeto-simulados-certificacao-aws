/** @jest-environment node */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import {
  closeDatabase,
  executeQuery,
  getAwsServices,
  getDatabase,
  getCases,
  getQuestions,
  initializeDatabase,
  migrateQuestionIdentity,
  insertQuestion,
} from '../backend/database/db.js';
import { seedQuestions } from '../scripts/seed/seed-pglite.mjs';
import { seedCatalog } from '../scripts/seed/seed-cases.mjs';
import { reconcileLegacyQuestions } from '../scripts/migrate/reconcile-legacy-questions.mjs';

jest.setTimeout(120000);

async function withDatabase(dataDir, callback) {
  await initializeDatabase({ dataDir });
  try {
    return await callback();
  } finally {
    await closeDatabase();
  }
}

describe('catalog seed projections', () => {
  let dataDir;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudacademy-seed-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  test('questions seed is idempotent and preserves operational fields', async () => {
    await seedQuestions({ dataDir });

    const first = await withDatabase(dataDir, async () => {
      const rows = await executeQuery('SELECT id, validation_status FROM questions ORDER BY id LIMIT 1');
      expect(rows[0].validation_status).toBe('APPROVED');
      await executeQuery("UPDATE questions SET validation_status = 'APPROVED', validated_by = 'fixture-validator' WHERE id = $1", [rows[0].id]);
      const count = await executeQuery('SELECT COUNT(*)::int AS count FROM questions');
      return { id: rows[0].id, count: count[0].count };
    });

    await seedQuestions({ dataDir });

    const second = await withDatabase(dataDir, async () => {
      const count = await executeQuery('SELECT COUNT(*)::int AS count FROM questions');
      const row = await executeQuery('SELECT validation_status, validated_by FROM questions WHERE id = $1', [first.id]);
      const tagged = await executeQuery("SELECT COUNT(*)::int AS count FROM questions WHERE tags && ARRAY['source-question-id:clf-c02-06d5ac4d']::text[]");
      const languages = await executeQuery('SELECT language, COUNT(*)::int AS count FROM questions GROUP BY language ORDER BY language');
      const certifications = await executeQuery('SELECT certification, COUNT(*)::int AS count FROM questions GROUP BY certification ORDER BY certification');
      return { count: count[0].count, row: row[0], tagged: tagged[0].count, languages, certifications, apiQuestions: (await getQuestions({ limit: 100 })).length };
    });

    expect(first.count).toBe(2498);
    expect(second.count).toBe(first.count);
    expect(second.row).toEqual({ validation_status: 'APPROVED', validated_by: 'fixture-validator' });
    expect(second.tagged).toBeGreaterThan(0);
    expect(second.languages).toEqual([
      { language: 'en', count: 1249 },
      { language: 'pt', count: 1249 },
    ]);
    expect(second.certifications).toEqual([
      { certification: 'CLF-C02', count: 788 },
      { certification: 'SAA-C03', count: 570 },
      { certification: 'DVA-C02', count: 568 },
      { certification: 'AIF-C01', count: 572 },
    ]);
    expect(second.apiQuestions).toBe(100);
  });

  test('preserves PT and EN rows when the sourceQuestionId is shared', async () => {
    await seedQuestions({ dataDir });

    const result = await withDatabase(dataDir, async () => {
      const rows = await executeQuery(
        `SELECT language, source_question_id
         FROM questions
         WHERE source_question_id = 'clf-c02-06d5ac4d'
         ORDER BY language`,
      );
      return rows;
    });

    expect(result).toEqual([
      { language: 'en', source_question_id: 'clf-c02-06d5ac4d' },
      { language: 'pt', source_question_id: 'clf-c02-06d5ac4d' },
    ]);
  });

  test('rejects duplicate source identity in the same language', async () => {
    const firstFile = path.join(dataDir, 'questions-a.json');
    const secondFile = path.join(dataDir, 'questions-b.json');
    const question = {
      questionId: 'same-id',
      certId: 'CLF-C02',
      question: 'A question with enough text for the fixture.',
      options: ['A', 'B'],
      correct: 0,
      explanation: 'Explanation',
      domain: 'cloud-concepts',
    };
    fs.writeFileSync(firstFile, JSON.stringify([question]));
    fs.writeFileSync(secondFile, JSON.stringify([{ ...question, question: `${question.question} changed` }]));

    await expect(seedQuestions({
      dataDir,
      dataFiles: [
        { certification: 'CLF-C02', language: 'pt', path: firstFile },
        { certification: 'CLF-C02', language: 'pt', path: secondFile },
      ],
    })).rejects.toThrow('duplicate');
  });

  test('rejects a source question without an editorial ID', async () => {
    const invalidFile = path.join(dataDir, 'missing-id.json');
    fs.writeFileSync(invalidFile, JSON.stringify([{
      certId: 'CLF-C02',
      question: 'A question with enough text for the fixture.',
      options: ['A', 'B'],
      correct: 0,
      explanation: 'Explanation',
      domain: 'cloud-concepts',
    }]));

    await expect(seedQuestions({
      dataDir,
      dataFiles: [{ certification: 'CLF-C02', language: 'pt', path: invalidFile }],
    })).rejects.toThrow('questionId is required');
  });

  test('rejects an unsupported seed language', async () => {
    const invalidFile = path.join(dataDir, 'invalid-language.json');
    fs.writeFileSync(invalidFile, JSON.stringify([{
      questionId: 'language-id',
      certId: 'CLF-C02',
      question: 'A question with enough text for the fixture.',
      options: ['A', 'B'],
      correct: 0,
      explanation: 'Explanation',
      domain: 'cloud-concepts',
    }]));

    await expect(seedQuestions({
      dataDir,
      dataFiles: [{ certification: 'CLF-C02', language: 'es', path: invalidFile }],
    })).rejects.toThrow('language must be pt or en');
  });

  test('backfills legacy language and source ID tags without changing the row identity', async () => {
    await withDatabase(dataDir, async () => {
      const inserted = await insertQuestion({
        certification: 'CLF-C02',
        domain: 'cloud-concepts',
        difficulty: 'easy',
        question_text: 'A legacy question with enough text for migration.',
        options: ['A', 'B'],
        correct_answer: [0],
        explanation: 'Legacy explanation',
        tags: ['language:en', 'source-question-id:legacy-1'],
      });
      await executeQuery('UPDATE questions SET language = NULL, source_question_id = NULL WHERE id = $1', [inserted.id]);
      await migrateQuestionIdentity(getDatabase());
      const rows = await executeQuery('SELECT id, language, source_question_id FROM questions WHERE id = $1', [inserted.id]);
      expect(rows[0]).toEqual({ id: inserted.id, language: 'en', source_question_id: 'legacy-1' });
    });
  });

  test('soft-deactivates only known stale questions and is idempotent', async () => {
    await withDatabase(dataDir, async () => {
      await insertQuestion({
        certification: 'CLF-C02',
        domain: 'cloud-concepts',
        difficulty: 'easy',
        question_text: 'Which AWS service provides object storage for this test?',
        options: ['A', 'B'],
        correct_answer: [0],
        explanation: 'Stale fixture',
      });
      await insertQuestion({
        certification: 'SAA-C03',
        domain: 'security',
        difficulty: 'easy',
        question_text: 'Which service manages identities for this test?',
        options: ['A', 'B'],
        correct_answer: [0],
        explanation: 'Stale fixture',
      });
    });

    const first = await reconcileLegacyQuestions({ dataDir });
    const second = await reconcileLegacyQuestions({ dataDir });
    const statuses = await withDatabase(dataDir, async () => executeQuery(
      'SELECT is_active, COUNT(*)::int AS count FROM questions GROUP BY is_active ORDER BY is_active',
    ));

    expect(first.deactivated).toBe(2);
    expect(second.deactivated).toBe(0);
    expect(statuses).toEqual([{ is_active: false, count: 2 }]);
  });

  test('invalid question fixture aborts before opening a transaction', async () => {
    const invalidFile = path.join(dataDir, 'invalid-questions.json');
    fs.writeFileSync(invalidFile, JSON.stringify([{ questionId: 'invalid-1', certId: 'CLF-C02', question: 'invalid', options: ['A'] }]));

    await expect(seedQuestions({
      dataDir,
      dataFiles: [{ certification: 'CLF-C02', language: 'pt', path: invalidFile }],
    })).rejects.toThrow('options must contain at least two items');

    const result = await withDatabase(dataDir, async () => {
      const count = await executeQuery('SELECT COUNT(*)::int AS count FROM questions');
      return count[0].count;
    });

    expect(result).toBe(0);
  });

  test('cases and canonical services seed into their projection tables without touching progress', async () => {
    await seedCatalog({ dataDir });

    const first = await withDatabase(dataDir, async () => {
      const cases = await executeQuery('SELECT id FROM cases ORDER BY slug LIMIT 1');
      const user = await executeQuery("INSERT INTO users (anonymous_name) VALUES ('seed-fixture') RETURNING id");
      await executeQuery('INSERT INTO case_progress (user_id, case_id, completed) VALUES ($1, $2, TRUE)', [user[0].id, cases[0].id]);
      const counts = await executeQuery('SELECT (SELECT COUNT(*) FROM cases)::int AS cases, (SELECT COUNT(*) FROM aws_services)::int AS services, (SELECT COUNT(*) FROM case_progress)::int AS progress');
      return counts[0];
    });

    await seedCatalog({ dataDir });

    const second = await withDatabase(dataDir, async () => {
      const counts = await executeQuery('SELECT (SELECT COUNT(*) FROM cases)::int AS cases, (SELECT COUNT(*) FROM aws_services)::int AS services, (SELECT COUNT(*) FROM case_progress)::int AS progress');
      const labs = await executeQuery("SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_name = 'labs'");
      return {
        ...counts[0],
        labs: labs[0].count,
        route53Links: (await executeQuery(
          `SELECT COUNT(*)::int AS count
           FROM case_services cs
           JOIN cases c ON c.id = cs.case_id
           JOIN aws_services s ON s.id = cs.service_id
           WHERE c.slug = 'marketplace-global' AND s.slug = 'amazon-route-53'`,
        ))[0].count,
        apiCases: (await getCases({ limit: 100 })).length,
        apiServices: (await getAwsServices()).length,
      };
    });

    expect(first).toEqual({ cases: 25, services: 241, progress: 1 });
    expect(second).toEqual({ cases: 25, services: 241, progress: 1, labs: 0, route53Links: 1, apiCases: 25, apiServices: 241 });
  });
});
