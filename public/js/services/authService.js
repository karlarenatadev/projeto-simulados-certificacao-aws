/**
 * authService.js
 * Serviço de autenticação e autorização — identidade corporativa A3Data.
 *
 * Usa POST /api/auth/login para autenticar via email @a3data.
 * Remove o mock de usuário fixo e o fluxo anônimo.
 *
 * @module services/authService
 */

import { logger } from "../utils/logger.js";
import { userManager } from "../userManager.js";

/** @type {{ id, email, nickname, role, full_name } | null} */
let currentUser = null;

export const AuthService = {
  /**
   * Retorna o usuário logado atual ou null.
   * @returns {{ id, email, nickname, role } | null}
   */
  getCurrentUser() {
    if (currentUser) return currentUser;
    // Tenta restaurar da sessão persistida
    const stored = userManager.getStoredUser();
    if (stored) {
      currentUser = stored;
    }
    return currentUser;
  },

  /**
   * Verifica se o usuário está autenticado.
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  /**
   * Verifica se o usuário possui a permissão/role informada.
   * @param {string} roleOrPermission
   * @returns {boolean}
   */
  hasPermission(roleOrPermission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = String(user.role || "").toUpperCase();
    if (role === "ADMIN") return true;
    const check = String(roleOrPermission || "").toUpperCase();
    return role === check;
  },

  /**
   * Verifica se o usuário pode validar questões (VALIDATOR ou ADMIN).
   * @returns {boolean}
   */
  canValidate() {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = String(user.role || "").toUpperCase();
    return role === "VALIDATOR" || role === "ADMIN";
  },

  /**
   * Login corporativo via email @a3data.
   * Chama POST /api/auth/login e persiste a sessão localmente.
   *
   * @param {string} email - Email @a3data
   * @param {Object} [profile] - { full_name?, nickname? }
   * @returns {Promise<{ id, email, nickname, role }>}
   */
  async login(email, profile = {}) {
    const user = await userManager.login(email, profile);
    currentUser = user;
    logger.info(`[AuthService] Login: ${user.email} (${user.role})`);
    return user;
  },

  /**
   * Logout — limpa a sessão local.
   */
  async logout() {
    logger.info("[AuthService] Logout:", currentUser?.email);
    currentUser = null;
    userManager.clearUser();
  },

  /**
   * Restaura sessão a partir do localStorage (chamado no boot do app).
   * @returns {Promise<{ id, email, nickname, role } | null>}
   */
  async restoreSession() {
    const user = await userManager.getOrCreateUser();
    if (user) {
      currentUser = user;
      logger.info(`[AuthService] Sessão restaurada: ${user.email || user.id}`);
    }
    return user;
  },

  /**
   * Injeção de usuário para modo showcase/demo — não chama a API.
   * @param {{ id, email, nickname, role }} showcaseUser
   */
  setMockUser(showcaseUser) {
    currentUser = showcaseUser;
  },
};
