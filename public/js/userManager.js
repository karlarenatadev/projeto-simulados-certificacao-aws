import { logger } from "./utils/logger.js";
/**
 * User Manager — CloudAcademy A3
 *
 * Gerencia identidade corporativa via POST /api/auth/login.
 *
 * Persistência unificada em uma única chave:
 *   localStorage["cloudacademy_user"] = JSON { id, email, nickname, role, full_name }
 *
 * Migração automática: lê chaves legadas (aws_sim_user_*) na primeira execução
 * e as converte para o formato novo, removendo as antigas.
 *
 * @module userManager
 */

import apiService from "./services/api.js";

/** @type {string} Chave única de sessão no localStorage */
const SESSION_KEY = "cloudacademy_user";

/** Chaves legadas a remover após migração */
const LEGACY_KEYS = [
  "aws_sim_user_id",
  "aws_sim_user_email",
  "aws_sim_user_nickname",
  "aws_sim_user_role",
  "aws_sim_user_name",
  "aws_sim_username",
];

export const userManager = {
  // ---------------------------------------------------------------------------
  // Leitura / escrita da sessão
  // ---------------------------------------------------------------------------

  /**
   * Retorna o usuário salvo na sessão ou null.
   * Faz migração automática das chaves legadas na primeira chamada.
   *
   * @returns {{ id, email, nickname, role, full_name } | null}
   */
  getStoredUser() {
    // Tenta ler o novo formato
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // JSON corrompido — limpa e tenta migração
      localStorage.removeItem(SESSION_KEY);
    }

    // Migração automática: converte chaves legadas → cloudacademy_user
    const legacyId = localStorage.getItem("aws_sim_user_id");
    if (legacyId) {
      const migrated = {
        id: legacyId,
        email: localStorage.getItem("aws_sim_user_email") || "",
        nickname:
          localStorage.getItem("aws_sim_user_nickname") ||
          localStorage.getItem("aws_sim_username") ||
          localStorage.getItem("aws_sim_user_name") ||
          "",
        role: localStorage.getItem("aws_sim_user_role") || "STUDENT",
        full_name: "",
      };
      this._persist(migrated);
      return migrated;
    }

    return null;
  },

  /**
   * Retorna o user_id da sessão ativa.
   * @returns {string|null}
   */
  getUserId() {
    return this.getStoredUser()?.id ?? null;
  },

  /**
   * Retorna o nickname público do usuário.
   * @returns {string}
   */
  getUserName() {
    return this.getStoredUser()?.nickname || "Usuário";
  },

  /**
   * Verifica se existe uma sessão válida.
   * @returns {boolean}
   */
  isAuthenticated() {
    return Boolean(this.getUserId());
  },

  // ---------------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------------

  /**
   * Login corporativo via email @a3data.
   * Chama POST /api/auth/login. Se o usuário não existe no banco, é criado como STUDENT.
   * Persiste sessão em cloudacademy_user.
   *
   * @param {string} email
   * @param {{ full_name?: string, nickname?: string }} [profile]
   * @returns {Promise<{ id, email, nickname, role, full_name }>}
   */
  async login(email, profile = {}) {
    try {
      const response = await apiService.loginUser({ email, ...profile });

      if (response.success && response.data && response.data.id) {
        this._persist(response.data);
        logger.info(`✓ Login: ${response.data.email} (${response.data.role})`);
        return response.data;
      }

      throw new Error(response.message || "Falha no login corporativo.");
    } catch (error) {
      logger.error("Erro no login:", error);
      throw error;
    }
  },

  /**
   * Tenta restaurar sessão existente, validando com o backend quando disponível.
   * Retorna o usuário se a sessão for válida, null caso contrário.
   *
   * Não cria usuário anônimo — retorna null e cabe ao caller exibir o login.
   *
   * @returns {Promise<{ id, email, nickname, role } | null>}
   */
  async getOrCreateUser() {
    const stored = this.getStoredUser();

    if (!stored) return null;

    // Valida com o backend quando disponível
    try {
      const isUp = await apiService.isAvailable();
      if (isUp) {
        const response = await apiService.getMe(stored.id);
        if (response.success && response.data) {
          this._persist(response.data);
          return response.data;
        }
        // Sessão inválida no backend — limpa localmente
        this.clearUser();
        return null;
      }
    } catch (_e) {
      logger.warn("API indisponível — usando sessão local.");
    }

    // API indisponível — aceita a sessão local
    return stored;
  },

  /**
   * Limpa a sessão do usuário — remove cloudacademy_user e todas as chaves legadas.
   */
  clearUser() {
    localStorage.removeItem(SESSION_KEY);
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  },

  // ---------------------------------------------------------------------------
  // Privado
  // ---------------------------------------------------------------------------

  /** Persiste o usuário em cloudacademy_user e remove chaves legadas. */
  _persist(user) {
    const session = {
      id: user.id,
      email: user.email || "",
      nickname: user.nickname || user.email?.split("@")[0] || "",
      role: user.role || "STUDENT",
      full_name: user.full_name || "",
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Remove chaves legadas após migração bem-sucedida
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  },
};

export default userManager;
