import { SessionManager } from "./sessionManager.js";
import { PermissionService } from "../services/permissions.js";
import { logger } from "../utils/logger.js";

/**
 * AuthGuard Central
 * 
 * Executa as verificações de identidade, sessão e RBAC para as páginas protegidas.
 * Deve ser convocado o mais cedo possível no fluxo de boot de uma página (ex: `DOMContentLoaded`).
 * 
 * @param {Object} [config] 
 * @param {string} [config.requiredRole] - student | validator | admin
 * @param {string} [config.redirectTo="./index.html"] - Onde ir em caso de falha
 * @returns {Object|null} A sessão atual caso autorizado. Interrompe execução em caso de falha.
 */
export function authGuard(config = {}) {
  const { 
    requiredRole = null, 
    redirectTo = "./index.html" 
  } = config;

  const session = SessionManager.restore();

  // 1. Verificação de Autenticação Básica
  if (!session || !session.user) {
    logger.warn("AuthGuard: Sessão não encontrada ou expirada. Redirecionando...");
    window.location.replace(redirectTo);
    return null;
  }

  // 2. Atualiza a atividade (touch)
  SessionManager.touch();

  // 3. Verificação de RBAC (se especificado)
  if (requiredRole) {
    if (!PermissionService.hasAccess(session.user, requiredRole)) {
      logger.warn(`AuthGuard: Acesso negado. Requisitado: ${requiredRole}, Possui: ${session.user.role}`);
      window.location.replace(redirectTo); // Idealmente poderia redirecionar para uma rota "Forbidden/403"
      return null;
    }
  }

  return session;
}
