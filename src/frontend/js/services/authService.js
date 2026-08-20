/**
 * authService.js — CloudAcademy A3
 *
 * Camada de autenticação e autorização.
 * Delega persistência para o SessionManager, cuja chave oficial é
 * cloudacademy_session.
 *
 * @module services/authService
 */

import { logger } from "../utils/logger.js";
import { userManager } from "../userManager.js";
import { SessionManager } from "../core/sessionManager.js";
import { PermissionService } from "./permissions.js";
import { storageManager } from "../storageManager.js";
import apiService from "./api.js";
import { UserMapper } from "../core/contracts/userMapper.js";
import { normalizeCertificationId } from "../utils/certUtils.js";

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
    return PermissionService.canAccessValidation(user);
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
      const pendingPreferenceSync = SessionManager.getPendingPreferenceSync();
      if (session.accessToken && session.authenticationMode === "online") {
        try {
          const response = await apiService.getMe(session.user.id);
          if (response?.data?.id) {
            const user = UserMapper.fromDTO({
              ...response.data,
              language: session.user.language,
              certification: session.user.certification,
            });
            SessionManager.persist({ ...session, user });
            const profile = await storageManager.hydrateAccountState();
            if (profile?.data?.preferences) {
              const remotePreferences = profile.data.preferences;
              const preferencesToKeep = {
                language:
                  pendingPreferenceSync?.language || remotePreferences.language,
                certification:
                  pendingPreferenceSync?.certification ||
                  normalizeCertificationId(remotePreferences.certification),
              };

              if (pendingPreferenceSync) {
                const pendingPreferences = Object.fromEntries(
                  ["language", "certification", "theme"]
                    .filter((key) => pendingPreferenceSync[key] !== undefined)
                    .map((key) => [key, pendingPreferenceSync[key]]),
                );
                try {
                  await apiService.updateMyProfile({
                    preferences: pendingPreferences,
                  });
                  SessionManager.clearPendingPreferenceSync(pendingPreferences);
                } catch {
                  // A sessão local recente continua válida até a próxima tentativa.
                }
              }

              SessionManager.update({
                language: preferencesToKeep.language,
                certification: preferencesToKeep.certification,
              });
            }
            return SessionManager.restore()?.user || user;
          }
        } catch (error) {
          if (error.statusCode === 401 || error.status === 401) {
            SessionManager.logout();
            return null;
          }
          if (!error.apiDisabled && !error.message?.includes("Network"))
            throw error;
        }
      }
      logger.info(
        `[AuthService] Sessão restaurada: ${session.user.email} (${session.user.role})`,
      );
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
    if (user && globalThis.sessionStorage) {
      ["diagnostic_context", "current_study_plan"].forEach((key) => {
        globalThis.sessionStorage.removeItem(
          storageManager.getUserScopedKey(key),
        );
      });
    }
    SessionManager.logout();
  },
};
