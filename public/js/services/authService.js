/**
 * authService.js
 * Serviço fundamental de Autenticação e Autorização (Fundação para o React).
 * Abstrai a identidade do usuário atual e o controle de permissões.
 *
 * Atualmente implementa uma simulação (Mock) de usuário, até que o JWT backend
 * seja integrado na próxima fase.
 *
 * @module services/authService
 */

import { logger } from "../utils/logger.js";

/**
 * Usuário mockado (padrão)
 * @type {import('../types.js').User}
 */
let currentUser = {
  id: "usr_mock_123",
  name: "Guest Student",
  email: "guest@example.com",
  role: "student",
  permissions: ["start_quiz", "view_dashboard"],
  createdAt: Date.now(),
  isShowcase: false,
};

export const AuthService = {
  /**
   * Retorna o usuário logado atual.
   * @returns {import('../types.js').User | null}
   */
  getCurrentUser() {
    return currentUser;
  },

  /**
   * Valida se o usuário logado possui a permissão especificada.
   * @param {import('../types.js').Permission} permissionName
   * @returns {boolean}
   */
  hasPermission(permissionName) {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return currentUser.permissions.includes(permissionName);
  },

  /**
   * Login (Simulado para fins de estrutura)
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('../types.js').User>}
   */
  async login(email, _password) {
    logger.info("[AuthService] Simulate Login for", email);
    // TODO: Implemenar payload JWT e fetch para /api/auth/login
    currentUser = {
      id: "usr_real_456",
      name: email.split("@")[0],
      email: email,
      role: "student",
      permissions: ["start_quiz", "view_dashboard"],
      createdAt: Date.now(),
      isShowcase: false,
    };
    return currentUser;
  },

  /**
   * Logout (Limpa a sessão atual)
   */
  async logout() {
    logger.info("[AuthService] Logging out");
    currentUser = null;
    // TODO: Limpar JWT cookies / localStorage
  },

  /**
   * Força a injeção de uma identidade de Showcase Mode (usado pelo ShowcaseService)
   * @param {import('../types.js').User} showcaseUser
   */
  setMockUser(showcaseUser) {
    currentUser = showcaseUser;
  },
};
