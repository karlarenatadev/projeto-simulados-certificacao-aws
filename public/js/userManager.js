import { logger } from "./utils/logger.js";
import apiService from "./services/api.js";
import { SessionManager } from "./core/sessionManager.js";
import { UserMapper } from "./core/contracts/userMapper.js";

/**
 * User Manager — CloudAcademy A3
 *
 * Foco exclusivo na regra de negócio da identidade:
 * - Login (Backend / Offline fallback)
 * - Atualização de Preferências do Perfil
 *
 * @module userManager
 */

export const userManager = {
  /**
   * Valida se o email pertence ao domínio corporativo aceito.
   * Centraliza a regra de negócio do e-mail.
   * @param {string} email
   * @returns {boolean}
   */
  isValidCorporateEmail(email) {
    if (!email) return false;
    const emailLower = String(email).trim().toLowerCase();
    return emailLower.endsWith("@a3data.com.br") || emailLower.endsWith("@a3data.com");
  },

  /**
   * Login corporativo via email @a3data.
   * Chama POST /api/auth/login. Se o usuário não existe no banco, é criado como STUDENT.
   * Persiste sessão oficial chamando SessionManager.
   *
   * @param {string} email
   * @param {{ full_name?: string, nickname?: string }} [profile]
   */
  async login(email, profile = {}) {
    const normalizedEmail = String(email).trim().toLowerCase();
    
    try {
      const response = await apiService.loginUser({ email: normalizedEmail, ...profile });

      if (response.success && response.data && response.data.id) {
        const user = UserMapper.fromDTO(response.data);
        const session = {
          user,
          authenticationMode: "online",
          provider: "backend",
        };
        SessionManager.persist(session);
        logger.info(`✓ Login via Backend: ${user.email} (${user.role})`);
        return user;
      }

      throw new Error(response.message || "Falha no login corporativo.");
    } catch (error) {
      logger.info("[DEBUG] Exception em login corporativo:", error);

      // Fallback Offline
      if ((error.apiDisabled || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("Load failed")) && this.isValidCorporateEmail(normalizedEmail)) {
        logger.warn(`⚠️ API indisponível ou desativada. Iniciando sessão offline para usuário corporativo: ${normalizedEmail}`);
        return this.createOfflineUser(normalizedEmail, profile);
      }
      
      logger.error("Erro no login:", error);
      throw error;
    }
  },

  /**
   * Cria um usuário local estrito como "student" para Fallback Offline.
   * 
   * @param {string} email 
   * @param {Object} profile 
   * @returns {Object} User
   */
  createOfflineUser(email, profile) {
    const rawData = {
      id: `local_${Date.now()}`,
      email,
      name: profile.full_name || profile.nickname || email.split("@")[0],
      role: "student",
      language: "pt",
      certification: "clf-c02",
      provider: "local"
    };

    const user = UserMapper.fromDTO(rawData);
    user.provider = "local"; // força flag

    const session = {
      user,
      authenticationMode: "offline",
      provider: "local"
    };

    SessionManager.persist(session);
    return user;
  },

  /**
   * Atualiza preferências gerais do usuário, como idioma, certificação ou tema.
   * Propaga a alteração para a Session.
   * 
   * @param {Object} preferences - Ex: { language: "en", certification: "saa-c03" }
   */
  getUserId() {
    return SessionManager.restore()?.user?.id || null;
  },

  /**
   * Atualiza preferências globais do usuário
   */
  updatePreferences(preferences) {
    SessionManager.update(preferences);
  }
};

export default userManager;

