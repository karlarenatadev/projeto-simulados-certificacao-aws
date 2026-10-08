#!/usr/bin/env node

/**
 * Express REST API server for the AWS certification simulator.
 * Runs on http://127.0.0.1:3001 by default and uses PGlite through
 * backend/database/db.js.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { clearTimeout, setTimeout } from 'node:timers';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import * as database from '../database/db.js';
import questionsRoutes from './routes/questions.js';
import quizzesRoutes from './routes/quizzes.js';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import casesRoutes, { servicesRouter } from './routes/cases.js';
import accessRoutes from './routes/access.js';
import meRoutes from './routes/me.js';

import { validateApiConfig } from './config.js';
import { installShutdown } from './lifecycle.js';
import { safeError, writeRequestLog } from './services/operationalLogging.js';
import { PostgresAdapterError } from '../database/postgres/errors.js';

const app = express();
let initialized = false;
let activeServer = null;
// Escuta em 0.0.0.0 para aceitar conexões de localhost, 127.0.0.1 e
// do host Windows ao acessar via WSL2 (ex: http://localhost:3001 no browser).
const API_HOST = '0.0.0.0';

app.use(helmet());

// Origens permitidas: localhost em dev/test e o domínio do GitHub Pages em produção.
// Em NODE_ENV=test, aceita qualquer origem para não bloquear a suíte Jest.
const ALLOWED_ORIGINS = new Set([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://karlarenatadev.github.io',
]);

const corsOptions = {
  origin(origin, callback) {
    // Permite requisições sem Origin (ex: curl, Postman, server-to-server)
    // e qualquer origem em ambiente de teste para não bloquear Jest.
    if (!origin || process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    const configured = process.env.DB_ENGINE === 'postgres'
      ? new Set((process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean))
      : ALLOWED_ORIGINS;
    if (configured.has(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  if (process.env.DB_ENGINE !== 'postgres') {
    console.log(`[${new Date().toISOString()}] ${req.method}`);
    return next();
  }
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const route = req.route?.path;
    const safeRoute = typeof route === 'string' ? `${req.baseUrl}${route}`.slice(0, 200) : '<unmatched>';
    const status = res.statusCode;
    writeRequestLog({
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      request_id: requestId,
      method: req.method,
      route: safeRoute,
      status,
      duration_ms: Number(process.hrtime.bigint() - startedAt) / 1e6,
      ...(res.locals.errorClass ? { error_class: res.locals.errorClass } : {}),
      ...(res.locals.errorCode ? { error_code: res.locals.errorCode } : {}),
    });
  });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      status: 429,
    });
  },
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ready', async (_req, res) => {
  let timer;
  try {
    validateApiConfig();
    const ready =
      initialized &&
      (await Promise.race([
        database.checkDatabaseReady(),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), 1000);
        }),
      ]));
    return res.status(ready ? 200 : 503).json({ ready: Boolean(ready) });
  } catch {
    return res.status(503).json({ ready: false });
  } finally {
    clearTimeout(timer);
  }
});

app.use('/api/questions', questionsRoutes);
app.use('/api/quiz', quizzesRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/services', servicesRouter);

app.get('/api/leaderboard', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const { getLeaderboard } = await import('../database/db.js');
    const leaderboard = await getLeaderboard(Number.parseInt(limit, 10));
    res.status(200).json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    status: 404,
  });
});

app.use((err, req, res, _next) => {
  const unavailable = err instanceof PostgresAdapterError &&
    (['connection', 'authentication', 'timeout'].includes(err.kind) || err.code === 'PG_POOL_CLOSED');
  const statusCode = unavailable ? 503 : err.statusCode || err.status || 500;
  if (statusCode >= 500 && process.env.DB_ENGINE === 'postgres') {
    const errorName = typeof err?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(err.name) ? err.name : 'Error';
    const code = typeof err?.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code) ? err.code : undefined;
    res.locals.errorClass = errorName;
    if (code) res.locals.errorCode = code;
  } else if (statusCode >= 500) {
    console.error('API request failed', safeError(err));
  }

  const message =
    statusCode === 503 ? 'Service unavailable' :
    ['staging', 'production'].includes(process.env.NODE_ENV) && statusCode >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    status: statusCode,
  });
});

export async function startServer() {
  if (activeServer) throw new Error('API server already started');
  // Validate before opening the database or a listening HTTP socket.
  const config = validateApiConfig();
  app.set('trust proxy', config.trustProxy);
  try {
    await database.initializeDatabase();
    const server = await new Promise((resolve, reject) => {
      const host = process.env.DB_ENGINE === 'postgres-test' ? '127.0.0.1' : API_HOST;
      const candidate = app.listen(config.port, host, () => {
        candidate.removeListener('error', reject);
        resolve(candidate);
      });
      candidate.once('error', reject);
    });
    activeServer = server;
    initialized = true;
    installShutdown(server, {
      closeDatabase: database.closeDatabase,
      onDraining: () => {
        initialized = false;
      },
    });
    console.log(`API server running on port ${server.address().port}`);
    return server;
  } catch (error) {
    initialized = false;
    await database.closeDatabase().catch(() => {});
    throw error;
  }
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error(
      'API startup failed:',
      error.message?.startsWith('Invalid API configuration:') ||
        error.message?.startsWith('Invalid operational PostgreSQL configuration:')
        ? error.message
        : safeError(error),
    );
    process.exit(1);
  });
}

export default app;
