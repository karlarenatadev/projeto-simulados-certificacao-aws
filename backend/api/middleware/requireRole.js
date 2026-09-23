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
 * Verifica a sessão HMAC em Authorization: Bearer e carrega o usuário do banco.
 * X-User-Id isolado não autentica usuários.
 */

import { getUserById } from '../../../backend/database/db.js';
import { verifySessionToken } from '../services/sessionToken.js';

/**
 * Anexa req.user após validar a sessão; credenciais inválidas recebem 401.
 * O bypass X-Test-Role exige NODE_ENV=test e nunca é aceito em produção.
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

  try {
    const authorization =
      typeof req.headers.authorization === 'string'
        ? req.headers.authorization
        : '';
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

  return (req, res, next) => {
    const authorize = (error) => {
      if (error) return next(error);
      const userRole = String(req.user.role || '').toUpperCase();

      if (!allowed.has(userRole)) {
        return res.status(403).json({
          error: `Acesso negado. Role necessária: ${[...allowed].join(' ou ')}. Sua role: ${userRole}.`,
          status: 403,
        });
      }

      return next();
    };
    return req.user ? authorize() : requireAuth(req, res, authorize);
  };
}
