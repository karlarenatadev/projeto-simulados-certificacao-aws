import { logger } from "./utils/logger.js";
/**
 * User Manager
 * Gerencia identidade corporativa via POST /api/auth/login.
 * Remove criação de usuário anônimo.
 *
 * @module userManager
 */

import apiService from "../services/api.js";

export const userManager = {
  /**
   * Retorna o usuário salvo no localStorage ou null se não estiver autenticado.
   * Não cria mais usuário anônimo automaticamente.
   *
   * @returns {{ id, email, nickname, role } | null}
   */
  getStoredUser() {
    const userId = localStorage.getItem("aws_sim_user_id");
    if (!userId) return null;

    return {
      id: userId,
      email: localStorage.getItem("aws_sim_user_email") || "",
      nickname: localStorage.getItem("aws_sim_user_nickname") || "",
      role: localStorage.getItem("aws_sim_user_role") || "STUDENT",
    };
  },

  /**
   * Mantido para compatibilidade com quizManager e testes existentes.
   * Retorna o user_id armazenado.
   *
   * @returns {string|null}
   */
  getUserId() {
    return localStorage.getItem("aws_sim_user_id");
  },

  /**
   * Retorna o nickname do usuário para exibição pública.
   * Nunca expõe email ou nome completo.
   *
   * @returns {string}
   */
  getUserName() {
    return (
      localStorage.getItem("aws_sim_user_nickname") ||
      localStorage.getItem("aws_sim_user_name") ||
      "Usuário"
    );
  },

  /**
   * Login corporativo: envia email @a3data para POST /api/auth/login.
   * Se o usuário não existe no banco, é criado automaticamente como STUDENT.
   * Persiste id, email, nickname e role no localStorage.
   *
   * @param {string} email - Email @a3data
   * @param {{ full_name?: string, nickname?: string }} [profile]
   * @returns {Promise<{ id, email, nickname, role, created }>}
   */
  async login(email, profile = {}) {
    try {
      const response = await apiService.loginUser({ email, ...profile });

      if (response.success && response.data && response.data.id) {
        const user = response.data;
        this._persistUser(user);
        logger.info(`✓ Login realizado: ${user.email} (${user.role})`);
        return user;
      }

      throw new Error(response.message || "Falha no login corporativo.");
    } catch (error) {
      logger.error("Erro no login:", error);
      throw error;
    }
  },

  /**
   * Verifica se o usuário está autenticado (tem id no localStorage).
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem("aws_sim_user_id"));
  },

  /**
   * Limpa a sessão do usuário.
   */
  clearUser() {
    localStorage.removeItem("aws_sim_user_id");
    localStorage.removeItem("aws_sim_user_email");
    localStorage.removeItem("aws_sim_user_nickname");
    localStorage.removeItem("aws_sim_user_role");
    // Compatibilidade com chaves legadas
    localStorage.removeItem("aws_sim_user_name");
    localStorage.removeItem("aws_sim_username");
  },

  /**
   * Tenta restaurar a sessão do backend a partir do id salvo no localStorage.
   * Usado ao iniciar o app para verificar se o usuário ainda é válido.
   *
   * @returns {Promise<{ id, email, nickname, role } | null>}
   */
  async getOrCreateUser() {
    const stored = this.getStoredUser();

    if (stored && stored.id) {
      // Tenta verificar se o usuário ainda existe no backend
      try {
        const isUp = await apiService.isAvailable();
        if (isUp) {
          const response = await apiService.getMe(stored.id);
          if (response.success && response.data) {
            this._persistUser(response.data);
            return response.data;
          }
          // Se retornou erro do backend, limpa sessão inválida
          this.clearUser();
          return null;
        }
      } catch (_e) {
        // API indisponível — retorna o dado salvo localmente sem verificar
        logger.warn("API indisponível — usando dados de sessão locais.");
      }
      return stored;
    }

    return null;
  },

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  _persistUser(user) {
    localStorage.setItem("aws_sim_user_id", user.id);
    localStorage.setItem("aws_sim_user_email", user.email || "");
    localStorage.setItem("aws_sim_user_nickname", user.nickname || "");
    localStorage.setItem("aws_sim_user_role", user.role || "STUDENT");
    // Mantém chave legada para compatibilidade com quizManager e leaderboard
    localStorage.setItem(
      "aws_sim_user_name",
      user.nickname || user.email?.split("@")[0] || "",
    );
    localStorage.setItem(
      "aws_sim_username",
      user.nickname || user.email?.split("@")[0] || "",
    );
  },
};

export default userManager;
