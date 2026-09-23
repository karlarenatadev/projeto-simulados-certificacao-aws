/** @jest-environment node */
import { afterAll, describe, expect, test } from '@jest/globals';
import { fork, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = await mkdtemp(join(tmpdir(), 'cloudacademy-production-'));
const children = new Set();
const env = {
  ...process.env,
  NODE_ENV: 'production',
  DB_DATA_DIR: join(root, 'data'),
  AUTH_SESSION_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz-PRODUCTION-TEST',
  GOOGLE_CLIENT_ID: '123-test.apps.googleusercontent.com',
  DEBUG: 'false',
  DB_DEBUG: 'false',
  TRUST_PROXY: '',
  ALLOW_DEV_EMAIL_LOGIN: 'true',
};
async function unusedPort() {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return String(port);
}
function track(child) {
  children.add(child);
  child.done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      children.delete(child);
      resolve({ code, signal });
    });
  });
  child.logs = '';
  child.stdout.on('data', (data) => {
    child.logs += data;
  });
  child.stderr.on('data', (data) => {
    child.logs += data;
  });
  return child;
}
async function start() {
  const port = await unusedPort();
  const child = track(
    fork('__tests__/fixtures/api-production-child.mjs', [], {
      env: { ...env, PORT: port },
      silent: true,
      execArgv: [],
    }),
  );
  await Promise.race([
    once(child, 'message'),
    child.done.then(() => {
      throw new Error(`Startup failed: ${child.logs}`);
    }),
  ]);
  child.url = `http://127.0.0.1:${port}`;
  return child;
}
async function message(child, value) {
  const result = once(child, 'message');
  child.send(value);
  return (await result)[0];
}
async function stop(child, signal) {
  if (process.platform === 'win32') child.send(signal);
  else child.kill(signal);
  expect(await child.done).toEqual({ code: 0, signal: null });
}
function signed(value) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', env.AUTH_SESSION_SECRET).update(payload).digest('base64url')}`;
}
afterAll(async () => {
  for (const child of children) child.kill();
  await Promise.all([...children].map((child) => child.done));
  // Only the directory created by this test is removed; no application data.
  await rm(root, { recursive: true, force: true });
});

describe('production process with isolated persistent volume', () => {
  test.each(['AUTH_SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'DB_DATA_DIR'])(
    'missing %s exits before listening',
    async (name) => {
      const port = await unusedPort();
      const child = track(
        spawn(process.execPath, ['backend/api/server.js'], {
          env: { ...env, PORT: port, [name]: '' },
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
      expect((await child.done).code).not.toBe(0);
      expect(child.logs).toContain(`Invalid API configuration: ${name}`);
      expect(child.logs).not.toContain(env.AUTH_SESSION_SECRET);
      expect(child.logs).not.toContain('Initializing PGlite');
      await expect(
        fetch(`http://127.0.0.1:${port}/api/health`),
      ).rejects.toThrow();
    },
    30000,
  );

  test('auth failures, health/readiness, signals, restart and recovery preserve real data', async () => {
    const child = await start();
    expect((await fetch(`${child.url}/api/health`)).status).toBe(200);
    expect((await fetch(`${child.url}/api/ready`)).status).toBe(200);
    const account = await message(child, 'seed');
    const headers = {
      Authorization: `Bearer ${account.token}`,
      'Content-Type': 'application/json',
    };
    expect((await fetch(`${child.url}/api/auth/me`, { headers })).status).toBe(
      200,
    );
    for (const token of [
      '',
      'not-a-token',
      'payload.signature',
      `${account.token.slice(0, -1)}${account.token.endsWith('a') ? 'b' : 'a'}`,
      `${account.token}.extra`,
      signed(null),
      signed({ sub: {}, exp: 9999999999 }),
      signed({ sub: account.userId, exp: 1 }),
    ]) {
      const response = await fetch(`${child.url}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(response.status).toBe(401);
      expect((await fetch(`${child.url}/api/ready`)).status).toBe(200);
    }
    expect(
      (
        await fetch(`${child.url}/api/auth/login`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: 'test@a3data.com.br' }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${child.url}/api/auth/google`, {
          method: 'POST',
          headers,
          body: '{}',
        })
      ).status,
    ).toBe(400);
    const cors = await fetch(`${child.url}/api/health`, {
      headers: { Origin: 'https://karlarenatadev.github.io' },
    });
    expect(cors.headers.get('access-control-allow-origin')).toBe(
      'https://karlarenatadev.github.io',
    );
    const state = {
      records: [{ questionId: 'persistent-A', certId: 'aif-c01', count: 1 }],
    };
    expect(
      (
        await fetch(`${child.url}/api/me/state/mistakes`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ certification: 'AIF-C01', state, version: 0 }),
        })
      ).status,
    ).toBe(200);
    const linked = await fetch(`${child.url}/api/me/local-links/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ localIdentityId: 'local_production_probe' }),
    });
    expect(linked.status).toBe(200);
    await stop(child, 'SIGTERM');
    expect(child.logs).not.toContain(account.token);
    expect(child.logs).not.toContain(env.AUTH_SESSION_SECRET);

    // Run the existing backup utility with exclusive ownership after shutdown.
    const dumpPath = join(root, 'backup.tar.gz');
    const backup = track(
      spawn(process.execPath, ['scripts/diagnostics/pglite-recovery.mjs'], {
        env: {
          ...env,
          RECOVERY_DATA_DIR: env.DB_DATA_DIR,
          RECOVERY_DUMP_PATH: dumpPath,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    expect((await backup.done).code).toBe(0);
    const restored = await PGlite.create({
      dataDir: join(root, 'restored'),
      loadDataDir: new Blob([await readFile(dumpPath)]),
    });
    try {
      expect(
        (
          await restored.query(
            'SELECT state_json AS state FROM user_module_state WHERE user_id=$1',
            [account.userId],
          )
        ).rows[0].state,
      ).toEqual(state);
      expect(
        (
          await restored.query(
            'SELECT count(*)::int AS count FROM local_identity_links',
          )
        ).rows[0].count,
      ).toBe(1);
    } finally {
      await restored.close();
    }

    const restarted = await start();
    const saved = await fetch(
      `${restarted.url}/api/me/state/mistakes?certification=AIF-C01`,
      { headers },
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).data.state_json).toEqual(state);
    expect((await fetch(`${restarted.url}/api/ready`)).status).toBe(200);
    await message(restarted, 'close-db');
    expect((await fetch(`${restarted.url}/api/health`)).status).toBe(200);
    const notReady = await fetch(`${restarted.url}/api/ready`);
    expect(notReady.status).toBe(503);
    expect(await notReady.json()).toEqual({ ready: false });
    await stop(restarted, 'SIGINT');
  }, 120000);
});
