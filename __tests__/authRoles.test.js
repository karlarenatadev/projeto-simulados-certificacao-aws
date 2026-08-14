/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import app from '../backend/api/server.js';
import {
  closeDatabase,
  executeQuery,
  getUserByEmail,
  initializeDatabase,
  upsertUserByEmail,
} from '../backend/database/db.js';
import { seedUser } from '../scripts/seed/seed-users.mjs';

const adminConfig = {
  email: 'admin@a3data.com.br',
  full_name: 'Admin CloudAcademy',
  nickname: 'Admin',
  role: 'ADMIN',
};
const validatorConfig = {
  email: 'validator@a3data.com.br',
  full_name: 'Validador CloudAcademy',
  nickname: 'Validator',
  role: 'VALIDATOR',
};

function listen(serverApp) {
  return new Promise((resolve) => {
    const server = serverApp.listen(0, '127.0.0.1', () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return { response, body: await response.json() };
}

describe('bootstrap roles and login authority', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    await initializeDatabase({ dataDir: 'memory://', environment: 'test' });
    await executeQuery('DELETE FROM users');
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  });

  test('creates missing ADMIN and VALIDATOR accounts with official roles', async () => {
    const admin = await seedUser(adminConfig);
    const validator = await seedUser(validatorConfig);

    expect(admin.user.role).toBe('ADMIN');
    expect(validator.user.role).toBe('VALIDATOR');
  });

  test('promotes existing STUDENT without creating a duplicate and preserves activity', async () => {
    await executeQuery('DELETE FROM users');
    const { user: student } = await upsertUserByEmail(adminConfig.email);
    const seeded = await seedUser(adminConfig);
    const rows = await executeQuery('SELECT id, role, is_active FROM users WHERE LOWER(email) = LOWER($1)', [
      adminConfig.email,
    ]);

    expect(seeded.user.role).toBe('ADMIN');
    expect(seeded.user.id).toBe(student.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].is_active).toBe(true);
  });

  test('is idempotent when ADMIN already exists', async () => {
    const first = await seedUser(adminConfig);
    const second = await seedUser(adminConfig);
    const rows = await executeQuery('SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)', [
      adminConfig.email,
    ]);

    expect(first.user.id).toBe(second.user.id);
    expect(second.user.role).toBe('ADMIN');
    expect(rows).toHaveLength(1);
  });

  test('new common login remains STUDENT', async () => {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'new-user@a3data.com.br' }),
    });

    expect(login.response.status).toBe(201);
    expect(login.body.data.role).toBe('STUDENT');
  });

  test('existing ADMIN and VALIDATOR logins return database roles', async () => {
    await seedUser(validatorConfig);
    const adminLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminConfig.email, role: 'STUDENT' }),
    });
    const validatorLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: validatorConfig.email }),
    });

    expect(adminLogin.body.data.role).toBe('ADMIN');
    expect(validatorLogin.body.data.role).toBe('VALIDATOR');
  });

  test('lookup selects the privileged legacy record deterministically', async () => {
    await executeQuery('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key');
    await executeQuery('DROP INDEX IF EXISTS idx_users_email');
    await executeQuery(
      `INSERT INTO users (email, nickname, role) VALUES ($1, $2, 'STUDENT')`,
      [adminConfig.email, 'legacy-admin-duplicate'],
    );

    const rows = await executeQuery('SELECT role FROM users WHERE LOWER(email) = LOWER($1)', [
      adminConfig.email,
    ]);
    const selected = await getUserByEmail(adminConfig.email);

    expect(rows).toHaveLength(2);
    expect(selected.role).toBe('ADMIN');
  });
});
