/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import app from '../backend/api/server.js';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
  upsertUserByEmail,
} from '../backend/database/db.js';
import { createSessionToken } from '../backend/api/services/sessionToken.js';

const caseId = '00000000-0000-4000-8000-000000000001';
const serviceId = '00000000-0000-4000-8000-000000000002';

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

describe('case evaluation authorization and input contract', () => {
  let server;
  let baseUrl;
  const users = {};

  beforeAll(async () => {
    await initializeDatabase({ environment: 'test' });
    await executeQuery('DELETE FROM cases');
    await executeQuery('DELETE FROM aws_services');
    const emails = {
      STUDENT: 'evaluate-student@a3data.com.br',
      VALIDATOR: 'evaluate-validator@a3data.com.br',
      ADMIN: 'evaluate-admin@a3data.com.br',
    };
    for (const [role, email] of Object.entries(emails)) {
      const result = await upsertUserByEmail(email);
      users[role] = { ...result.user, role };
      await executeQuery('UPDATE users SET role = $1 WHERE id = $2', [role, result.user.id]);
    }
    await executeQuery(
      `INSERT INTO aws_services (id, slug, name, category, short_desc)
       VALUES ($1, 'evaluate-service', 'Evaluate Service', 'Test', 'Test service')`,
      [serviceId],
    );
    await executeQuery(
      `INSERT INTO cases (id, slug, title, scenario, objective, difficulty)
       VALUES ($1, 'evaluate-case', 'Evaluate Case', 'Scenario', 'Objective', 'beginner')`,
      [caseId],
    );
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  });

  const auth = (role) => ({ Authorization: `Bearer ${createSessionToken(users[role].id)}` });
  const evaluate = (headers, payload = { selected_service_ids: [] }) =>
    request(baseUrl, `/api/cases/${caseId}/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

  test.each([
    ['anonymous', {}],
    ['invalid bearer', { Authorization: 'Bearer invalid' }],
    ['X-User-Id only', { 'X-User-Id': '00000000-0000-4000-8000-000000000099' }],
  ])('%s is rejected', async (_label, headers) => {
    const result = await evaluate(headers);
    expect(result.response.status).toBe(401);
  });

  test.each(['STUDENT', 'VALIDATOR', 'ADMIN'])('%s can evaluate', async (role) => {
    const result = await evaluate(auth(role));
    expect(result.response.status).toBe(200);
    expect(result.body.data.score).toBe(0);
  });

  test('public case reads remain available', async () => {
    const list = await request(baseUrl, '/api/cases');
    const detail = await request(baseUrl, `/api/cases/${caseId}`);
    expect(list.response.status).toBe(200);
    expect(detail.response.status).toBe(200);
  });

  test.each([
    [{}, 'invalid_selected_service_ids'],
    [{ selected_service_ids: null }, 'invalid_selected_service_ids'],
    [{ selected_service_ids: ['banana'] }, 'invalid_selected_service_ids'],
  ])('rejects invalid service payload %#', async (payload, error) => {
    const result = await evaluate(auth('STUDENT'), payload);
    expect(result.response.status).toBe(400);
    expect(result.body.error).toBe(error);
  });

  test('accepts a valid service UUID and deduplicates it', async () => {
    const result = await evaluate(auth('STUDENT'), {
      selected_service_ids: [serviceId, serviceId],
    });
    expect(result.response.status).toBe(200);
  });

  test('rejects unknown case and malformed case identifiers', async () => {
    const unknown = await request(baseUrl, '/api/cases/00000000-0000-4000-8000-000000000099/evaluate', {
      method: 'POST',
      headers: auth('STUDENT'),
      body: JSON.stringify({ selected_service_ids: [] }),
    });
    const malformed = await request(baseUrl, '/api/cases/not-a-uuid/evaluate', {
      method: 'POST',
      headers: auth('STUDENT'),
      body: JSON.stringify({ selected_service_ids: [] }),
    });
    expect(unknown.response.status).toBe(404);
    expect(unknown.body.error).toBe('case_not_found');
    expect(malformed.response.status).toBe(400);
    expect(malformed.body.error).toBe('invalid_case_id');
  });
});
