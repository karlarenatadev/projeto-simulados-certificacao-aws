import { isIP } from 'node:net';

// Only explicitly trusted proxy addresses/subnets; never trust arbitrary headers.
export function validateApiConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const fail = (name, requirement) => {
    throw new Error(`Invalid API configuration: ${name} ${requirement}`);
  };
  if (production) {
    const directory = (env.DB_DATA_DIR || '').trim();
    if (!directory || directory.includes('://')) {
      fail(
        'DB_DATA_DIR',
        'must name a writable persistent filesystem directory',
      );
    }
    const secret = env.AUTH_SESSION_SECRET || '';
    if (
      Buffer.byteLength(secret) < 32 ||
      new Set(secret).size < 8 ||
      /replace_with|changeme|your_secret/i.test(secret)
    ) {
      fail(
        'AUTH_SESSION_SECRET',
        'must contain at least 32 bytes of randomly generated secret material (no placeholders)',
      );
    }
    if (
      !/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(
        (env.GOOGLE_CLIENT_ID || '').trim(),
      )
    ) {
      fail('GOOGLE_CLIENT_ID', 'must be a configured Google OAuth client ID');
    }
  }
  const port = env.PORT === undefined ? 3001 : Number(env.PORT);
  if (!Number.isInteger(port) || port < (production ? 1 : 0) || port > 65535) {
    fail('PORT', 'must be a valid TCP port');
  }
  const trustProxy = (env.TRUST_PROXY || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const entry of trustProxy) {
    const [address, prefix, extra] = entry.split('/');
    const family = isIP(address);
    if (
      !family ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128)))
    ) {
      fail(
        'TRUST_PROXY',
        'must contain only proxy IP addresses or CIDR subnets',
      );
    }
    if (prefix !== undefined && Number(prefix) === 0) {
      fail('TRUST_PROXY', 'must not trust every address');
    }
  }
  return { port, trustProxy: trustProxy.length ? trustProxy : false };
}
