import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
} from '../../backend/database/db.js';

const KNOWN_STALE_QUESTION_TEXTS = [
  'Which AWS service provides object storage for this test?',
  'Which service manages identities for this test?',
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--data-dir') {
      args.dataDir = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

export async function reconcileLegacyQuestions({ dataDir } = {}) {
  if (dataDir) process.env.DB_DATA_DIR = dataDir;
  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  try {
    await executeQuery('BEGIN');
    const placeholders = KNOWN_STALE_QUESTION_TEXTS.map((_, index) => `$${index + 1}`).join(', ');
    const result = await executeQuery(`
      UPDATE questions AS q
      SET is_active = FALSE
      WHERE q.is_active = TRUE
        AND q.source_question_id IS NULL
        AND q.language IS NULL
        AND q.question_text IN (${placeholders})
        AND NOT EXISTS (
          SELECT 1 FROM answers AS a WHERE a.question_id = q.id
        )
      RETURNING q.id, q.question_text
    `, KNOWN_STALE_QUESTION_TEXTS);
    await executeQuery('COMMIT');
    return { deactivated: result.length, rows: result };
  } catch (error) {
    await executeQuery('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await reconcileLegacyQuestions({ dataDir: args.dataDir });
  console.log(`[reconcile-legacy-questions] soft-deactivated=${result.deactivated}`);
}

if (process.argv[1]?.endsWith('reconcile-legacy-questions.mjs')) {
  main().catch(async (error) => {
    console.error(`[reconcile-legacy-questions] Failed: ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
}
