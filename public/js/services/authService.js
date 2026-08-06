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

/** @type {{ id, email, nickname, role, full_name } | null} */
let currentUser = null;

export const AuthService = {
  // ---------------------------------------------------------------------------
  // Leitura de estado
  // ---------------------------------------------------------------------------

  /**
   * Retorna o usuário autenticado ou null.
   * Tenta restaurar da sessão local se a memória estiver vazia.
   * @returns {{ id, email, nickname, role, full_name } | null}
   */
  getCurrentUser() {
    if (currentUser) return currentUser;
    const stored = userManager.getStoredUser();
    if (stored) currentUser = stored;
    return currentUser;
  },

  /** @returns {boolean} */
  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  /**
   * Verifica se o usuário possui o role informado.
   * ADMIN sempre tem acesso a tudo.
   *
   * @param {'STUDENT'|'VALIDATOR'|'ADMIN'} roleOrPermission
   * @returns {boolean}
   */
  hasPermission(roleOrPermission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    const role = String(user.role || "").toUpperCase();
    if (role === "ADMIN") return true;
    return role === String(roleOrPermission || "").toUpperCase();
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

  // ---------------------------------------------------------------------------
  // Ciclo de vida da sessão
  // ---------------------------------------------------------------------------

  /**
   * Restaura a sessão a partir da chave cloudacademy_user no localStorage.
   * Valida com o backend quando disponível.
   * Chamado no boot do app (DOMContentLoaded), antes de exibir qualquer UI.
   *
   * @returns {Promise<{ id, email, nickname, role } | null>}
   */
  async restoreSession() {
    const user = await userManager.getOrCreateUser();
    if (user) {
      currentUser = user;
      logger.info(
        `[AuthService] Sessão restaurada: ${user.email || user.id} (${user.role})`,
      );
    } else {
      currentUser = null;
    }
    return user;
  },

  /**
   * Login corporativo via email @a3data.
   * Persiste sessão em cloudacademy_user.
   *
   * @param {string} email
   * @param {{ full_name?: string, nickname?: string }} [profile]
   * @returns {Promise<{ id, email, nickname, role }>}
   */
  async login(email, profile = {}) {
    const user = await userManager.login(email, profile);
    currentUser = user;
    logger.info(`[AuthService] Login: ${user.email} (${user.role})`);
    return user;
  },

  /**
   * Logout — limpa currentUser e cloudacademy_user no localStorage.
   */
  async logout() {
    logger.info("[AuthService] Logout:", currentUser?.email);
    currentUser = null;
    userManager.clearUser();
  },

  /**
   * Injeção de usuário para modo showcase/demo.
   * @param {{ id, email, nickname, role }} showcaseUser
   */
  setMockUser(showcaseUser) {
    currentUser = showcaseUser;
  },
};
