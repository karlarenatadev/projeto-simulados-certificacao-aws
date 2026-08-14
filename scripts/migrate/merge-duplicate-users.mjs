#!/usr/bin/env node

import { closeDatabase, executeQuery, executeSql, initializeDatabase } from '../../backend/database/db.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_REFERENCE_COLUMNS = [
  ['quiz_history', 'user_id'],
  ['gamification', 'user_id'],
  ['focus_sessions', 'user_id'],
  ['case_progress', 'user_id'],
  ['questions', 'validated_by_id'],
  ['validator_requests', 'user_id'],
  ['validator_requests', 'reviewed_by'],
  ['validator_certifications', 'user_id'],
  ['validator_certifications', 'verified_by'],
  ['role_audit_log', 'actor_user_id'],
  ['role_audit_log', 'target_user_id'],
];

const ROLE_PRIORITY = { ADMIN: 1, VALIDATOR: 2, STUDENT: 3 };

function isApplyMode() {
  return process.argv.includes('--apply');
}

async function getDuplicateGroups() {
  const rows = await executeQuery(
    `SELECT id::text AS id, email, anonymous_name, nickname, role, is_active,
            created_at, updated_at, last_login,
            lower(trim(email)) AS normalized_email
       FROM users
      WHERE email IS NOT NULL
      ORDER BY lower(trim(email)), created_at ASC, id::text ASC`,
  );
  const groups = new Map();
  for (const row of rows) {
    const key = row.normalized_email;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .filter(([, users]) => users.length > 1)
    .map(([email, users]) => ({ email, users }));
}

async function countReferences(userId) {
  let total = 0;
  for (const [table, column] of USER_REFERENCE_COLUMNS) {
    const rows = await executeQuery(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${column}::text = $1`,
      [userId],
    );
    total += Number(rows[0]?.count || 0);
  }
  return total;
}

async function chooseCanonical(users) {
  const withReferences = await Promise.all(users.map(async (user) => ({
    ...user,
    referenceCount: await countReferences(user.id),
  })));

  return withReferences.sort((left, right) => (
    Number(left.is_active === true) - Number(right.is_active === true)
    || (ROLE_PRIORITY[right.role] || 99) - (ROLE_PRIORITY[left.role] || 99)
    || left.referenceCount - right.referenceCount
    || String(left.created_at).localeCompare(String(right.created_at))
    || left.id.localeCompare(right.id)
  )).at(-1);
}

async function migrateReferences(duplicateId, canonicalId) {
  for (const [table, column] of USER_REFERENCE_COLUMNS) {
    await executeQuery(
      `UPDATE ${table} SET ${column} = $1 WHERE ${column}::text = $2`,
      [canonicalId, duplicateId],
    );
  }
}

export async function mergeDuplicateUsers({ apply = isApplyMode() } = {}) {
  const groups = await getDuplicateGroups();
  const plan = [];

  for (const group of groups) {
    const canonical = await chooseCanonical(group.users);
    const duplicates = group.users.filter((user) => user.id !== canonical.id);
    plan.push({
      email: group.email,
      canonicalId: canonical.id,
      duplicateIds: duplicates.map((user) => user.id),
    });
  }

  if (!apply || plan.length === 0) return { applied: false, plan };

  await executeSql('BEGIN');
  try {
    for (const item of plan) {
      for (const duplicateId of item.duplicateIds) {
        await migrateReferences(duplicateId, item.canonicalId);
        await executeQuery('DELETE FROM users WHERE id::text = $1', [duplicateId]);
      }
      await executeQuery(
        'UPDATE users SET email = lower(trim(email)), updated_at = NOW() WHERE id::text = $1',
        [item.canonicalId],
      );
    }

    await executeSql('DROP INDEX IF EXISTS idx_users_email');
    await executeSql('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key');
    await executeSql(
      'CREATE UNIQUE INDEX idx_users_email ON users (lower(trim(email))) WHERE email IS NOT NULL',
    );
    await executeSql('COMMIT');
    return { applied: true, plan };
  } catch (error) {
    await executeSql('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await initializeDatabase();
    const result = await mergeDuplicateUsers();
    console.log(JSON.stringify(result, null, 2));
    if (!result.applied && result.plan.length > 0) {
      console.log('[merge-duplicate-users] Dry-run only. Reexecute with --apply to migrate.');
    }
  } finally {
    await closeDatabase();
  }
}
