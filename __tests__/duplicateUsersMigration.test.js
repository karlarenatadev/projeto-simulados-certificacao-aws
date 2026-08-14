/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import {
  closeDatabase,
  executeQuery,
  executeSql,
  getUserByEmail,
  initializeDatabase,
} from '../backend/database/db.js';
import { mergeDuplicateUsers } from '../scripts/migrate/merge-duplicate-users.mjs';

describe('duplicate user identity migration', () => {
  const duplicateEmail = `duplicate-admin-${Date.now()}@a3data.com.br`;

  beforeAll(async () => {
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
    await executeSql('DROP INDEX IF EXISTS idx_users_email');
    await executeSql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key');
    await executeQuery(
      `INSERT INTO users (id, email, nickname, role)
       VALUES ('00000000-0000-0000-0000-000000000001', $1, 'migration-admin', 'ADMIN'),
              ('00000000-0000-0000-0000-000000000002', $2, 'migration-student', 'STUDENT')`,
      [duplicateEmail.toUpperCase(), ` ${duplicateEmail} `],
    );
  });

  afterAll(async () => {
    await closeDatabase();
  });

  test('keeps the canonical privileged identity and restores normalized uniqueness', async () => {
    const result = await mergeDuplicateUsers({ apply: true });

    expect(result.applied).toBe(true);
    expect(result.plan[0].canonicalId).toBe('00000000-0000-0000-0000-000000000001');
    expect(await getUserByEmail(` ${duplicateEmail.toUpperCase()} `)).toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      role: 'ADMIN',
    });

    const users = await executeQuery(
      'SELECT id::text AS id FROM users WHERE lower(trim(email)) = lower(trim($1))',
      [duplicateEmail],
    );
    expect(users).toHaveLength(1);

    const indexes = await executeQuery(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email'",
    );
    expect(indexes[0].indexdef).toContain('lower(TRIM(BOTH FROM email))');
  });
});
