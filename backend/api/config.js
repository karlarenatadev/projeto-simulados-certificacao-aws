import { isIP } from 'node:net';
import { URL } from 'node:url';

// Only explicitly trusted proxy addresses/subnets; never trust arbitrary headers.
export function validateApiConfig(env = process.env) {
  const operationalPostgres = env.DB_ENGINE === 'postgres';
  const production = env.NODE_ENV === 'production';
  const hardened = production || env.NODE_ENV === 'staging';
  const fail = (name, requirement) => {
    throw new Error(`Invalid API configuration: ${name} ${requirement}`);
  };
  if (hardened) {
    const domains = String(env.AUTH_ALLOWED_DOMAINS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const emails = String(env.AUTH_ALLOWED_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const validDomain = (domain) =>
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
    if (!domains.length || domains.some((domain) => !validDomain(domain))) {
      fail(
        'AUTH_ALLOWED_DOMAINS',
        'must explicitly contain valid email domains',
      );
    }
    if (
      !emails.length ||
      emails.some((email) => {
        const parts = email.split('@');
        return (
          parts.length !== 2 ||
          !/^[^\s@]+$/.test(parts[0]) ||
          !validDomain(parts[1]) ||
          !domains.includes(parts[1])
        );
      })
    ) {
      fail(
        'AUTH_ALLOWED_EMAILS',
        'must explicitly list authorized employee emails within AUTH_ALLOWED_DOMAINS',
      );
    }
    if (!Object.hasOwn(env, 'TRUST_PROXY')) {
      fail(
        'TRUST_PROXY',
        'must be explicitly configured (empty disables proxy trust)',
      );
    }
    if (!Object.hasOwn(env, 'CORS_ALLOWED_ORIGINS')) {
      fail('CORS_ALLOWED_ORIGINS', 'must be explicitly configured');
    }
    const origins = String(env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !origins.length ||
      origins.some((origin) => {
        try {
          const parsed = new URL(origin);
          return (
            parsed.origin !== origin ||
            parsed.username ||
            parsed.password ||
            parsed.pathname !== '/' ||
            parsed.search ||
            parsed.hash ||
            parsed.protocol !== 'https:'
          );
        } catch {
          return true;
        }
      })
    ) {
      fail('CORS_ALLOWED_ORIGINS', 'must contain exact HTTPS origins');
    }
  }
  if (hardened && !operationalPostgres) {
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
  if (operationalPostgres) {
    if (!['staging', 'production'].includes(env.NODE_ENV)) {
      fail('NODE_ENV', 'must be staging or production for DB_ENGINE=postgres');
    }
    const secret = env.AUTH_SESSION_SECRET || '';
    if (
      Buffer.byteLength(secret) < 32 ||
      new Set(secret).size < 8 ||
      /replace_with|changeme|your_secret/i.test(secret)
    ) {
      fail(
        'AUTH_SESSION_SECRET',
        'must contain at least 32 bytes of randomly generated secret material',
      );
    }
    if (
      !/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(
        (env.GOOGLE_CLIENT_ID || '').trim(),
      )
    ) {
      fail('GOOGLE_CLIENT_ID', 'must be a configured Google OAuth client ID');
    }
    const domains = (env.AUTH_ALLOWED_DOMAINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !domains.length ||
      domains.some(
        (domain) =>
          !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(
            domain,
          ),
      )
    ) {
      fail('AUTH_ALLOWED_DOMAINS', 'must contain one or more valid domains');
    }
    if (!Object.hasOwn(env, 'TRUST_PROXY'))
      fail(
        'TRUST_PROXY',
        'must be explicitly configured (empty disables proxy trust)',
      );
  }
  if (!operationalPostgres && env.CORS_ALLOWED_ORIGINS !== undefined) {
    const origins = env.CORS_ALLOWED_ORIGINS.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !origins.length ||
      origins.some((origin) => {
        try {
          const parsed = new URL(origin);
          return (
            parsed.origin !== origin ||
            !['http:', 'https:'].includes(parsed.protocol) ||
            (hardened && parsed.protocol !== 'https:')
          );
        } catch {
          return true;
        }
      })
    )
      fail(
        'CORS_ALLOWED_ORIGINS',
        'must contain exact origins (HTTPS in staging/production)',
      );
  }
  const port = env.PORT === undefined ? 3001 : Number(env.PORT);
  if (!Number.isInteger(port) || port < (hardened ? 1 : 0) || port > 65535) {
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
  return {
    port,
    trustProxy: trustProxy.length ? trustProxy : false,
    ...(hardened
      ? {
          host: '127.0.0.1',
          corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        }
      : { host: '0.0.0.0' }),
  };
}
