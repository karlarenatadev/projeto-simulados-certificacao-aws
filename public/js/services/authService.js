/**
 * authService.js — CloudAcademy A3
 *
 * Camada de autenticação e autorização.
 * Delega persistência para userManager (que usa cloudacademy_user no localStorage).
 *
 * @module services/authService
 */

import { logger } from "../utils/logger.js";
import { userManager } from "../userManager.js";
import { SessionManager } from "../core/sessionManager.js";
import { PermissionService } from "./permissions.js";

/**
 * authService.js — CloudAcademy A3
 *
 * Camada de autenticação e autorização abstrata para o Frontend.
 * Delega persistência para o SessionManager e fluxo de identity para userManager.
 *
 * @module services/authService
 */

export const AuthService = {
  // ---------------------------------------------------------------------------
  // Leitura de estado
  // ---------------------------------------------------------------------------

  /**
   * Retorna a sessão atual da plataforma.
   * @returns {Object|null}
   */
  getSession() {
    return SessionManager.restore();
  },

  /**
   * Retorna o usuário autenticado atual ou null.
   * @returns {Object|null}
   */
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  },

  /** @returns {boolean} */
  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  /**
   * Verifica se o usuário possui a role informada ou superior.
   * @param {string} roleOrPermission
   * @returns {boolean}
   */
  hasPermission(roleOrPermission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    return PermissionService.hasAccess(user, roleOrPermission);
  },

  /**
   * Verifica se o usuário pode validar questões (VALIDATOR ou ADMIN).
   * @returns {boolean}
   */
  canValidate() {
    const user = this.getCurrentUser();
    if (!user) return false;
    return PermissionService.canValidate(user);
  },

  // ---------------------------------------------------------------------------
  // Ciclo de vida da sessão
  // ---------------------------------------------------------------------------

  /**
   * Tenta restaurar a sessão no boot.
   * Retorna apenas o User para retrocompatibilidade com scripts antigos (temporário).
   *
   * @returns {Promise<Object|null>}
   */
  async restoreSession() {
    const session = this.getSession();
    if (session) {
      logger.info(`[AuthService] Sessão restaurada: ${session.user.email} (${session.user.role})`);
      return session.user;
    }
    return null;
  },

  /**
   * Realiza login delegando ao UserManager (que cuidará da persistência via SessionManager).
   * @param {string} email
   * @param {Object} [profile]
   */
  async login(email, profile = {}) {
    const user = await userManager.login(email, profile);
    logger.info(`[AuthService] Login efetuado: ${user.email} (${user.role})`);
    return user;
  },

  /**
   * Encerra a sessão atual.
   */
  async logout() {
    const user = this.getCurrentUser();
    if (user) {
      logger.info(`[AuthService] Logout: ${user.email}`);
    }
    SessionManager.logout();
  }
};
