/** @jest-environment node */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { initializeDatabase, closeDatabase, executeQuery, insertQuestion, updateUser, upsertUserByEmail } from '../backend/database/db.js';
import app from '../backend/api/server.js';

const suffix = Date.now();
const studentEmail = `student-${suffix}@a3data.com.br`;
const adminEmail = `admin-${suffix}@a3data.com.br`;

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

describe('identity and access management', () => {
  let server;
  let baseUrl;
  let student;
  let admin;
  let studentToken;
  let adminToken;

  beforeAll(async () => {
    delete process.env.DB_DATA_DIR;
    await initializeDatabase({ environment: 'test' });
    ({ user: student } = await upsertUserByEmail(studentEmail, { full_name: 'Student A' }));
    ({ user: admin } = await upsertUserByEmail(adminEmail, { full_name: 'Admin A' }));
    await updateUser(admin.id, { role: 'ADMIN' });
    ({ server, baseUrl } = await listen(app));
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
  });

  test('login emits a verifiable expiring credential and ignores requested role', async () => {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail, role: 'ADMIN' }),
    });
    expect(login.response.status).toBe(200);
    expect(login.body.data.role).toBe('STUDENT');
    expect(login.body.data.access_token).toEqual(expect.any(String));
    expect(login.body.data.expires_in).toBeGreaterThan(0);
    studentToken = login.body.data.access_token;

    const me = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(me.response.status).toBe(200);
    expect(me.body.data.id).toBe(student.id);
  });

  test('X-User-Id alone is not authentication', async () => {
    const result = await request(baseUrl, '/api/access/validator-requests', {
      headers: { 'X-User-Id': admin.id },
    });
    expect(result.response.status).toBe(401);
  });

  test('student creates request, admin approves, and authorization is certification-scoped', async () => {
    const created = await request(baseUrl, '/api/access/validator-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        certification_id: 'CLF-C02',
        credential_id: 'cred-1',
        credential_url: 'https://example.test/credential/1',
        notes: 'Credential submitted for review',
      }),
    });
    expect(created.response.status).toBe(201);
    expect(created.body.data.credential_url).toBe('https://example.test/credential/1');
    expect(created.body.data.notes).toBe('Credential submitted for review');

    const adminLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail }),
    });
    adminToken = adminLogin.body.data.access_token;

    const requests = await request(baseUrl, '/api/access/validator-requests', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(requests.response.status).toBe(200);
    const requestId = requests.body.data.find((item) => item.user_id === student.id).id;

    const reviewed = await request(baseUrl, `/api/access/validator-requests/${requestId}/review`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    expect(reviewed.response.status).toBe(200);
    const auditRows = await executeQuery(
      'SELECT action, actor_user_id, target_user_id FROM role_audit_log WHERE target_user_id = $1',
      [student.id],
    );
    expect(auditRows.map((row) => row.action)).toEqual(expect.arrayContaining([
      'VALIDATOR_REQUEST_APPROVED',
      'VALIDATOR_CERTIFICATION_ADDED',
    ]));

    const refreshedLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail }),
    });
    studentToken = refreshedLogin.body.data.access_token;
    expect(refreshedLogin.body.data.role).toBe('VALIDATOR');

    const clfQuestion = await insertQuestion({
      certification: 'CLF-C02',
      domain: 'cloud-concepts',
      difficulty: 'easy',
      question_text: 'Which AWS service provides object storage for this test?',
      options: [{ id: 'A', text: 'Amazon S3' }, { id: 'B', text: 'Amazon EC2' }],
      correct_answer: ['A'],
      explanation: 'Amazon S3 provides object storage.',
    });
    const saaQuestion = await insertQuestion({
      certification: 'SAA-C03',
      domain: 'security',
      difficulty: 'easy',
      question_text: 'Which service manages identities for this test?',
      options: [{ id: 'A', text: 'IAM' }, { id: 'B', text: 'S3' }],
      correct_answer: ['A'],
      explanation: 'IAM manages identities.',
    });

    const pending = await request(baseUrl, '/api/questions/pending?limit=100', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(pending.response.status).toBe(200);
    expect(pending.body.data.some((item) => item.id === clfQuestion.id)).toBe(true);
    expect(pending.body.data.some((item) => item.id === saaQuestion.id)).toBe(false);

    const forbidden = await request(baseUrl, `/api/questions/${saaQuestion.id}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    expect(forbidden.response.status).toBe(403);
  });

  test('duplicate pending request, third-party access, and inactive user are denied', async () => {
    const duplicate = await request(baseUrl, '/api/access/validator-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ certification_id: 'SAA-C03' }),
    });
    expect(duplicate.response.status).toBe(403);

    const ownRequests = await request(baseUrl, '/api/access/validator-requests', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(ownRequests.response.status).toBe(200);
    const thirdParty = await request(baseUrl, `/api/access/validator-certifications/${admin.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(thirdParty.response.status).toBe(403);

    const validatorAdminList = await request(baseUrl, '/api/access/admin/users', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(validatorAdminList.response.status).toBe(403);

    const demoted = await request(baseUrl, `/api/access/admin/users/${student.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'STUDENT' }),
    });
    expect(demoted.response.status).toBe(200);
    const lastAdmin = await request(baseUrl, `/api/access/admin/users/${admin.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: false }),
    });
    expect(lastAdmin.response.status).toBe(409);

    await updateUser(student.id, { is_active: false });
    const inactiveLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail }),
    });
    expect(inactiveLogin.response.status).toBe(403);
  });
});
