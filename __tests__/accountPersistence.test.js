/**
 * @jest-environment node
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import app from '../backend/api/server.js';
import { closeDatabase, createUser, initializeDatabase } from '../backend/database/db.js';

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
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return { response, body: await response.json() };
}

describe('account persistence API', () => {
  let server;
  let baseUrl;
  let userA;
  let userB;

  beforeAll(async () => {
    process.env.DB_DATA_DIR = 'memory://';
    await initializeDatabase({ environment: 'test', dataDir: 'memory://' });
    userA = await createUser(`AccountA-${Date.now()}`);
    userB = await createUser(`AccountB-${Date.now()}`);
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await closeDatabase();
  });

  function authHeaders(userId = userA.id, role = 'STUDENT') {
    return { 'X-Test-Role': role, 'X-User-Id': userId };
  }

  test('profile is account-scoped and role fields cannot be edited', async () => {
    const updated = await request(baseUrl, '/api/me/profile', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ full_name: 'Account A', nickname: 'A', role: 'ADMIN' }),
    });
    expect(updated.response.status).toBe(400);

    const saved = await request(baseUrl, '/api/me/profile', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ full_name: 'Account A', nickname: 'A', preferences: { language: 'en', certification: 'saa-c03' } }),
    });
    expect(saved.response.status).toBe(200);
    expect(saved.body.data.full_name).toBe('Account A');
    expect(saved.body.data.role).toBe('STUDENT');
    expect(saved.body.data.preferences).toMatchObject({ language: 'en', certification: 'SAA-C03' });

    const other = await request(baseUrl, '/api/me/profile', { headers: authHeaders(userB.id) });
    expect(other.body.data.full_name).not.toBe('Account A');
    expect(other.body.data.id).toBe(userB.id);
  });

  test('module state is authenticated, account-scoped and versioned', async () => {
    const saved = await request(baseUrl, '/api/me/state/sprint', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ certification: 'CLF-C02', state: { completedStages: ['1'], currentDay: 2 } }),
    });
    expect(saved.response.status).toBe(200);
    expect(saved.body.data.version).toBe(1);

    const restored = await request(baseUrl, '/api/me/state/sprint?certification=clf-c02', {
      headers: authHeaders(),
    });
    expect(restored.body.data.state_json).toEqual({ completedStages: ['1'], currentDay: 2 });

    const other = await request(baseUrl, '/api/me/state/sprint?certification=CLF-C02', {
      headers: authHeaders(userB.id),
    });
    expect(other.body.data).toBeNull();

    const conflict = await request(baseUrl, '/api/me/state/sprint', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ certification: 'CLF-C02', version: 0, state: { completedStages: ['2'] } }),
    });
    expect(conflict.response.status).toBe(409);
  });

  test('module state rejects unauthenticated and arbitrary modules', async () => {
    const unauthenticated = await request(baseUrl, '/api/me/state/sprint?certification=CLF-C02');
    expect(unauthenticated.response.status).toBe(401);

    const arbitrary = await request(baseUrl, '/api/me/state/admin', {
      headers: authHeaders(),
    });
    expect(arbitrary.response.status).toBe(400);
  });
});
