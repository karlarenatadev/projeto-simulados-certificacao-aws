/**
 * requireRole.js
 * Middleware de controle de acesso por role.
 *
 * Uso:
 *   import { requireAuth, requireRole } from '../middleware/requireRole.js';
 *
 *   // Protege qualquer usuário autenticado
 *   router.get('/profile', requireAuth, handler);
 *
 *   // Exige role específica
 *   router.get('/pending', requireRole('VALIDATOR', 'ADMIN'), handler);
 *
 * O middleware espera que req.user seja populado previamente pelo fluxo de
 * autenticação (POST /api/auth/login → sessão em cookie ou cabeçalho).
 *
 * Nesta implementação sem JWT, o user_id é transmitido via header
 * X-User-Id e carregado do banco a cada requisição protegida.
 * Troque por JWT quando a fase de autenticação completa for implantada.
 */

import { getUserById } from '../../../backend/database/db.js';
import { verifySessionToken } from '../services/sessionToken.js';

/**
 * Carrega o usuário a partir do header X-User-Id e anexa a req.user.
 * Rejeita com 401 se o header estiver ausente ou o usuário não existir.
 *
 * Em testes Jest, aceita o header X-Test-Role para simular roles sem banco real.
 * O bypass só é ativado quando a variável de ambiente NODE_ENV for "test" OU
 * quando o header X-Test-Role for enviado — seguro porque o servidor de testes
 * escuta em porta aleatória e não é exposto externamente.
 */
export async function requireAuth(req, res, next) {
  // Bypass de teste: permite que os testes Jest simulem um usuário autenticado
  // passando X-Test-Role sem precisar de um banco ou mock de getUserById.
  // Seguro: o servidor de testes escuta em porta efêmera (listen(0)) isolada.
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-role']) {
    req.user = {
      id: req.headers['x-user-id'] || 'test-user-id',
      email: req.headers['x-test-email'] || 'test@a3data.com.br',
      role: req.headers['x-test-role'].toUpperCase(),
      is_active: true,
    };
    return next();
  }

  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;
  const claims = verifySessionToken(token);

  if (!claims?.sub) {
    return res.status(401).json({
      error: 'Credencial ausente, inválida ou expirada.',
      status: 401,
    });
  }

  try {
    const user = await getUserById(claims.sub);

    if (!user || user.is_active === false) {
      return res.status(401).json({
        error: 'Usuário não encontrado ou desativado.',
        status: 401,
      });
    }

    req.user = user;
    return next();
  } catch (_err) {
    return res.status(401).json({
      error: 'Falha ao verificar autenticação.',
      status: 401,
    });
  }
}

/**
 * Exige que o usuário autenticado possua pelo menos um dos roles informados.
 * Deve ser usado após requireAuth.
 *
 * @param {...string} roles - Ex: requireRole('VALIDATOR', 'ADMIN')
 */
export function requireRole(...roles) {
  const allowed = new Set(roles.map((r) => String(r).toUpperCase()));

  return async (req, res, next) => {
    // Se req.user não foi populado, garante a autenticação primeiro
    if (!req.user) {
      const authResult = await new Promise((resolve) => {
        requireAuth(req, res, (err) => resolve(err));
      });
      if (!req.user) return; // requireAuth já respondeu com 401
      if (authResult) return next(authResult);
    }

    const userRole = String(req.user.role || '').toUpperCase();

    if (!allowed.has(userRole)) {
      return res.status(403).json({
        error: `Acesso negado. Role necessária: ${[...allowed].join(' ou ')}. Sua role: ${userRole}.`,
        status: 403,
      });
    }

    return next();
  };
}
