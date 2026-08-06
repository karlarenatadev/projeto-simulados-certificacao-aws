/**
 * auth.js — Rota de autenticação corporativa
 *
 * POST /api/auth/login
 *   Body: { email: "nome@a3data.com.br", full_name?, nickname? }
 *   - Valida domínio @a3data
 *   - Se usuário não existe: cria como STUDENT
 *   - Se existe: retorna o usuário existente e atualiza last_login
 *   - Retorna: { id, email, nickname, full_name, role, created }
 *
 * GET /api/auth/me  (requer X-User-Id)
 *   Retorna o perfil do usuário autenticado.
 */

import { Router } from 'express';
import { upsertUserByEmail, getGamification } from '../../database/db.js';
import { requireAuth } from '../middleware/requireRole.js';

const router = Router();

// Domínios corporativos aceitos
const ALLOWED_DOMAINS = new Set(['a3data.com.br', 'a3data.com']);

function isAllowedEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 && ALLOWED_DOMAINS.has(parts[1]);
}

// ============================================================================
// POST /api/auth/login — Primeiro acesso / login corporativo
// ============================================================================

router.post('/login', async (req, res, next) => {
  try {
    const { email, full_name, nickname } = req.body || {};

    if (!email) {
      return res.status(400).json({
        error: 'email é obrigatório.',
        status: 400,
      });
    }

    if (!isAllowedEmail(email)) {
      return res.status(403).json({
        error: `Acesso restrito a emails corporativos A3Data (@a3data.com.br ou @a3data.com). Email recebido: ${email}`,
        status: 403,
      });
    }

    const { user, created } = await upsertUserByEmail(email.trim().toLowerCase(), {
      full_name: full_name || null,
      nickname: nickname || null,
    });

    // Inicializa gamification se ainda não existir (ignora erro de "não encontrado")
    try {
      await getGamification(user.id);
    } catch (_err) {
      // getGamification já faz INSERT quando não existe — ignora erros não críticos
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Usuário criado com sucesso.' : 'Login realizado com sucesso.',
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        role: user.role,
        is_active: user.is_active,
        last_login: user.last_login,
        created_at: user.created_at,
      },
      created,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/auth/me — Perfil do usuário autenticado
// ============================================================================

router.get('/me', requireAuth, async (req, res) => {
  const user = req.user;

  return res.status(200).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      nickname: user.nickname,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
    },
  });
});

export default router;
