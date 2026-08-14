import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSecret() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NODE_ENV === 'test') return 'cloudacademy-test-session-secret';
  throw new Error('AUTH_SESSION_SECRET must be configured for authenticated API sessions');
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionToken(userId, now = Math.floor(Date.now() / 1000)) {
  const payload = encode({
    sub: userId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: randomUUID(),
  });
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token, now = Math.floor(Date.now() / 1000)) {
  if (!token || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.sub || !Number.isInteger(parsed.exp) || parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export { SESSION_TTL_SECONDS };
