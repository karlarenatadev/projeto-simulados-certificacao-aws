/** @jest-environment node */
import { describe, expect, test, jest, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { createHmac } from 'node:crypto';
import { validateApiConfig } from '../backend/api/config.js';
import { installShutdown } from '../backend/api/lifecycle.js';
import { safeError } from '../backend/api/services/operationalLogging.js';
import { verifySessionToken } from '../backend/api/services/sessionToken.js';
import {
  requireAuth,
  requireRole,
} from '../backend/api/middleware/requireRole.js';

const valid = {
  NODE_ENV: 'production',
  DB_DATA_DIR: '/persistent/data',
  GOOGLE_CLIENT_ID: '123-test.apps.googleusercontent.com',
  AUTH_SESSION_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz-TEST-ONLY',
};

describe('production configuration', () => {
  test.each(['DB_DATA_DIR', 'AUTH_SESSION_SECRET', 'GOOGLE_CLIENT_ID'])(
    'requires %s',
    (name) => {
      expect(() => validateApiConfig({ ...valid, [name]: '' })).toThrow(name);
    },
  );
  test.each(['short', 'a'.repeat(64), 'replace_with_a_long_random_secret'])(
    'rejects weak/example secret %s',
    (secret) => {
      expect(() =>
        validateApiConfig({ ...valid, AUTH_SESSION_SECRET: secret }),
      ).toThrow('AUTH_SESSION_SECRET');
    },
  );
  test('accepts configured production and keeps development/test defaults', () => {
    expect(validateApiConfig(valid)).toEqual({ port: 3001, trustProxy: false });
    expect(validateApiConfig({ NODE_ENV: 'test', PORT: '0' }).port).toBe(0);
    expect(validateApiConfig({ NODE_ENV: 'development' }).port).toBe(3001);
    expect(() =>
      validateApiConfig({ ...valid, DB_DATA_DIR: 'memory://' }),
    ).toThrow('DB_DATA_DIR');
  });
  test.each([
    'true',
    '1',
    '0.0.0.0/0',
    '::/0',
    'proxy.example',
    '127.0.0.1/33',
  ])('rejects unsafe/invalid proxy %s', (proxy) => {
    expect(() => validateApiConfig({ ...valid, TRUST_PROXY: proxy })).toThrow(
      'TRUST_PROXY',
    );
  });
  test('accepts explicit proxy IPs and subnets and rejects invalid ports', () => {
    expect(
      validateApiConfig({ ...valid, TRUST_PROXY: '127.0.0.1, 10.0.1.0/24' })
        .trustProxy,
    ).toEqual(['127.0.0.1', '10.0.1.0/24']);
    expect(() => validateApiConfig({ ...valid, PORT: '3001oops' })).toThrow(
      'PORT',
    );
  });
});

describe('credential failures and sanitized logs', () => {
  const environment = process.env.NODE_ENV;
  const secret = process.env.AUTH_SESSION_SECRET;
  afterEach(() => {
    process.env.NODE_ENV = environment;
    if (secret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = secret;
  });
  test('missing secret cannot throw while verifying malformed input', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_SESSION_SECRET;
    expect(verifySessionToken('payload.signature')).toBeNull();
  });
  test.each([requireAuth, requireRole('ADMIN')])(
    'middleware returns 401 without rejected/pending promise when secret is absent',
    async (middleware) => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUTH_SESSION_SECRET;
      const response = { status: jest.fn(), json: jest.fn() };
      response.status.mockReturnValue(response);
      response.json.mockReturnValue(response);
      const next = jest.fn();
      await expect(
        middleware(
          { headers: { authorization: 'Bearer payload.signature' } },
          response,
          next,
        ),
      ).resolves.toBe(response);
      expect(response.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    },
  );
  test.each([
    null,
    {},
    { sub: {}, exp: 9999999999 },
    { sub: 'a', exp: '9999999999' },
  ])('rejects signed invalid payload %j', (value) => {
    process.env.AUTH_SESSION_SECRET = valid.AUTH_SESSION_SECRET;
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', valid.AUTH_SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    expect(verifySessionToken(`${payload}.${signature}`)).toBeNull();
  });
  test('logs SQL category/code without SQL values, messages or tokens in production', () => {
    process.env.NODE_ENV = 'production';
    const error = Object.assign(
      new Error('Bearer secret personal@example.com'),
      { code: '23505', query: 'sensitive', params: ['private'] },
    );
    expect(safeError(error)).toEqual({
      category: 'internal_error',
      databaseCode: '23505',
    });
  });
});

describe('controlled shutdown', () => {
  afterEach(() => jest.useRealTimers());
  test.each(['SIGTERM', 'SIGINT', 'SIGHUP'])(
    '%s drains before closing database, once',
    async (signal) => {
      const events = new EventEmitter();
      const order = [];
      let finish;
      const server = {
        close: (done) => {
          order.push('http-stop');
          finish = done;
        },
        closeIdleConnections: jest.fn(),
        closeAllConnections: jest.fn(),
      };
      const closeDatabase = jest.fn(async () => {
        order.push('db-close');
      });
      const exit = jest.fn();
      const shutdown = installShutdown(server, {
        signals: events,
        onDraining: () => order.push('draining'),
        closeDatabase,
        exit,
      });
      events.emit(signal);
      events.emit('SIGTERM');
      expect(closeDatabase).not.toHaveBeenCalled();
      finish();
      await shutdown();
      expect(order).toEqual(['draining', 'http-stop', 'db-close']);
      expect(exit).toHaveBeenCalledWith(0);
      expect(events.listenerCount('SIGTERM')).toBe(0);
    },
  );
  test('forces stalled HTTP connections closed and bounds a hung database close', async () => {
    jest.useFakeTimers();
    let finish;
    const server = {
      close: (done) => {
        finish = done;
      },
      closeIdleConnections: jest.fn(),
      closeAllConnections: jest.fn(() => finish()),
    };
    let finishDb;
    const closeDatabase = () =>
      new Promise((resolve) => {
        finishDb = resolve;
      });
    const exit = jest.fn();
    const shutdown = installShutdown(server, {
      signals: new EventEmitter(),
      onDraining: () => {},
      closeDatabase,
      exit,
    });
    const pending = shutdown();
    await jest.advanceTimersByTimeAsync(10000);
    expect(server.closeAllConnections).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(5000);
    expect(exit).toHaveBeenCalledWith(1);
    finishDb();
    await pending;
  });
});
