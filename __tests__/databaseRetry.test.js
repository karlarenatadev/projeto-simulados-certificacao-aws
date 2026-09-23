/** @jest-environment node */
import { expect, test, jest } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import app from '../backend/api/server.js';
import {
  initializeDatabase,
  closeDatabase,
  createUser,
  checkDatabaseReady,
} from '../backend/database/db.js';
import { migrateLocalLinks } from '../backend/database/localLinks.js';
import { createSessionToken } from '../backend/api/services/sessionToken.js';

test('first PGlite open fails, retry applies local links/mistakes migrations and remains idempotent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cloudacademy-retry-'));
  const open = jest
    .spyOn(PGlite, 'create')
    .mockRejectedValueOnce(new Error('RuntimeError: Aborted'));
  let server;
  try {
    const database = await initializeDatabase({
      environment: 'test',
      dataDir: directory,
    });
    // PGlite also calls create internally for its initdb helper. Count volume opens only.
    expect(
      open.mock.calls.filter(([options]) => options?.dataDir === directory),
    ).toHaveLength(2);
    expect(await checkDatabaseReady()).toBe(true);
    const user = await createUser('RetryProbe');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}`;
    const headers = {
      Authorization: `Bearer ${createSessionToken(user.id)}`,
      'Content-Type': 'application/json',
    };
    const claim = await fetch(`${url}/api/me/local-links/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ localIdentityId: 'local_retry_probe' }),
    });
    expect(claim.status).toBe(200);
    const body = {
      certification: 'AIF-C01',
      state: { records: [{ questionId: 'A', certId: 'aif-c01' }] },
      version: 0,
    };
    const saved = await fetch(`${url}/api/me/state/mistakes`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    expect(saved.status).toBe(200);
    await migrateLocalLinks(database);
    await migrateLocalLinks(database);
    const link = await fetch(`${url}/api/me/local-links/local_retry_probe`, {
      headers,
    });
    expect(link.status).toBe(200);
    expect(
      (
        await database.query(
          'SELECT state_json AS state FROM user_module_state WHERE user_id=$1',
          [user.id],
        )
      ).rows[0].state,
    ).toEqual(body.state);
  } finally {
    open.mockRestore();
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
}, 60000);
