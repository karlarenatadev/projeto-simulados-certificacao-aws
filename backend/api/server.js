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
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, closeDatabase } from '../database/db.js';
import questionsRoutes from './routes/questions.js';
import quizzesRoutes from './routes/quizzes.js';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import casesRoutes, { servicesRouter } from './routes/cases.js';
import accessRoutes from './routes/access.js';

const app = express();
const API_PORT = Number.parseInt(process.env.PORT, 10) || 3001;
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
    if (ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  credentials: true,
};

app.use(cors(corsOptions));

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

app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/questions', questionsRoutes);
app.use('/api/quiz', quizzesRoutes);
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/auth', authRoutes);
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

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    console.error(`API error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  const message = process.env.NODE_ENV === 'production' && statusCode >= 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    status: statusCode,
  });
});

async function gracefulShutdown() {
  console.log('\nShutting down API server...');
  try {
    await closeDatabase();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
}

export async function startServer() {
  try {
    console.log('Starting Express API server...');
    await initializeDatabase();
    console.log('Database initialized');

    const server = app.listen(API_PORT, API_HOST, () => {
      console.log(`API server running on http://${API_HOST}:${API_PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://${API_HOST}:${API_PORT}/api/health`);
    });

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    // SIGHUP: terminal fechado (WSL, SSH disconnection, etc.)
    process.on('SIGHUP', gracefulShutdown);

    // Erros não capturados — tenta fechar o banco antes de sair
    // para evitar corrupção do diretório .pglite-data
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error.message);
      await closeDatabase().catch(() => {});
      process.exit(1);
    });
    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await closeDatabase().catch(() => {});
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

const isDirectExecution = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default app;
