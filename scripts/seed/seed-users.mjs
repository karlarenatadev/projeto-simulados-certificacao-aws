#!/usr/bin/env node
/**
 * seed-users.mjs — Seed de usuários iniciais da plataforma CloudAcademy A3
 *
 * Cria os usuários privilegiados definidos por BOOTSTRAP_*_EMAILS.
 *
 * Idempotente: ignora usuários que já existem (upsert por email).
 *
 * Uso:
 *   node scripts/seed/seed-users.mjs
 *   node scripts/seed/seed-users.mjs --data-dir .pglite-data
 */

import {
  initializeDatabase,
  closeDatabase,
  upsertUserByEmail,
  updateUser,
  getUserByEmail,
} from '../../backend/database/db.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBootstrapEmails(value = '') {
  return [...new Set(
    String(value)
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => EMAIL_PATTERN.test(email)),
  )];
}

function userConfig(email, role) {
  const localPart = email.split('@')[0];
  const label = role === 'ADMIN' ? 'Admin Bootstrap' : 'Validator Bootstrap';
  return {
    email,
    full_name: label,
    nickname: localPart.slice(0, 60),
    role,
  };
}

export function getBootstrapUsers({
  adminEmails = process.env.BOOTSTRAP_ADMIN_EMAILS,
  validatorEmails = process.env.BOOTSTRAP_VALIDATOR_EMAILS,
} = {}) {
  const admins = parseBootstrapEmails(adminEmails).map((email) => userConfig(email, 'ADMIN'));
  const adminSet = new Set(admins.map(({ email }) => email));
  const validators = parseBootstrapEmails(validatorEmails)
    .filter((email) => !adminSet.has(email))
    .map((email) => userConfig(email, 'VALIDATOR'));
  return [...admins, ...validators];
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--data-dir') {
      args.dataDir = argv[i + 1];
      i++;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Uso:
  npm run db:seed-users
  node scripts/seed/seed-users.mjs --data-dir .pglite-data

Cria usuários iniciais (ADMIN + VALIDATOR) no banco PGlite.
Idempotente — seguro para executar múltiplas vezes.
`);
}

export async function seedUser(userConfig) {
  const { email, full_name, nickname, role } = userConfig;

  // upsertUserByEmail cria como STUDENT por padrão — ajusta o role na sequência
  const { user, created } = await upsertUserByEmail(email, { full_name, nickname });

  // Garante o role correto (upsert não altera role de usuários existentes)
  if (user.role !== role) {
    await updateUser(user.id, { role });
    console.log(
      `[seed-users] ${created ? 'Criado' : 'Atualizado'}: ${email} → ${role}`,
    );
  } else {
    console.log(
      `[seed-users] ${created ? 'Criado' : 'Já existia'}: ${email} (${role})`,
    );
  }

  const currentUser = await getUserByEmail(email);
  return { user: currentUser, created };
}

export async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.dataDir) {
    process.env.DB_DATA_DIR = args.dataDir;
  }

  console.log('[seed-users] Iniciando seed de usuários iniciais');
  console.log(`[seed-users] DB_DATA_DIR=${process.env.DB_DATA_DIR || '(do .env)'}`);

  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  const initialUsers = getBootstrapUsers();
  if (initialUsers.length === 0) {
    console.warn(
      '[seed-users] Nenhum bootstrap definido. Configure BOOTSTRAP_ADMIN_EMAILS '
      + 'e/ou BOOTSTRAP_VALIDATOR_EMAILS para semear acessos privilegiados.',
    );
  }

  let created = 0;
  let existing = 0;

  try {
    for (const userConfig of initialUsers) {
      const result = await seedUser(userConfig);
      if (result.created) created++;
      else existing++;
    }

    console.log(
      `[seed-users] Concluído: ${created} criado(s), ${existing} já existia(m).`,
    );

    // Exibe o estado final dos usuários semeados
    console.log('\n[seed-users] Estado atual:');
    for (const { email } of initialUsers) {
      const user = await getUserByEmail(email);
      if (user) {
        console.log(
          `  ✅ ${user.email} — role: ${user.role} — id: ${user.id}`,
        );
      }
    }
  } finally {
    await closeDatabase();
  }
}

const isDirectExecution = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch(async (error) => {
    console.error(`[seed-users] Falha: ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
}
