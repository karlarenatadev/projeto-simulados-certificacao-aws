/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import {
  closeDatabase,
  initializeDatabase,
  updateUser,
  upsertUserByEmail,
} from '../backend/database/db.js';
import app from '../backend/api/server.js';
import { createSessionToken, verifySessionToken } from '../backend/api/services/sessionToken.js';

const suffix = Date.now();
const adminEmail = `auth-admin-${suffix}@a3data.com.br`;
const validatorEmail = `auth-validator-${suffix}@a3data.com.br`;
const studentEmail = `auth-student-${suffix}@a3data.com.br`;
const legacyEmail = `auth-legacy-${suffix}@a3data.com.br`;

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

describe('auth token identity resolution', () => {
  let server;
  let baseUrl;
  let admin;
  let validator;
  let student;

  beforeAll(async () => {
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
    ({ user: admin } = await upsertUserByEmail(adminEmail));
    ({ user: validator } = await upsertUserByEmail(validatorEmail));
    ({ user: student } = await upsertUserByEmail(studentEmail));
    await updateUser(admin.id, { role: 'ADMIN' });
    await updateUser(validator.id, { role: 'VALIDATOR' });
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  });

  test('active user resolves from token sub and login id matches token sub', async () => {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail }),
    });
    const token = login.body.data.access_token;
    const claims = verifySessionToken(token);

    expect(login.response.status).toBe(200);
    expect(claims.sub).toBe(login.body.data.id);

    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.response.status).toBe(200);
    expect(me.body.data.id).toBe(admin.id);
    expect(me.body.data.role).toBe('ADMIN');
  });

  test('unknown or stale token sub is rejected even when the email exists', async () => {
    const { user } = await upsertUserByEmail(legacyEmail);
    const staleToken = createSessionToken(`${user.id}-replaced`);
    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${staleToken}` },
    });

    expect(me.response.status).toBe(401);
    expect(me.body.error).toBe('Usuário não encontrado ou desativado.');
  });

  test('inactive user is rejected without being reactivated', async () => {
    await updateUser(student.id, { is_active: false });
    const token = createSessionToken(student.id);
    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(me.response.status).toBe(401);
    expect(me.body.error).toBe('Usuário não encontrado ou desativado.');

    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail }),
    });
    expect(login.response.status).toBe(403);
  });

  test('authenticated roles reach pending according to RBAC', async () => {
    const adminLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail }),
    });
    const validatorLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: validatorEmail }),
    });
    const studentLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: legacyEmail }),
    });

    const adminPending = await request(baseUrl, '/api/questions/pending', {
      headers: { Authorization: `Bearer ${adminLogin.body.data.access_token}` },
    });
    const validatorPending = await request(baseUrl, '/api/questions/pending', {
      headers: { Authorization: `Bearer ${validatorLogin.body.data.access_token}` },
    });
    const studentPending = await request(baseUrl, '/api/questions/pending', {
      headers: { Authorization: `Bearer ${studentLogin.body.data.access_token}` },
    });

    expect(adminPending.response.status).toBe(200);
    expect(validatorPending.response.status).toBe(200);
    expect(studentPending.response.status).toBe(403);
  });
});
