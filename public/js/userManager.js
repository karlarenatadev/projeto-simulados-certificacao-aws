import { logger } from "./utils/logger.js";
import apiService from "./services/api.js";
import { SessionManager } from "./core/sessionManager.js";
import { UserMapper } from "./core/contracts/userMapper.js";
import { storageManager } from "./storageManager.js";
import { normalizeCertificationId } from "./utils/certUtils.js";

export const userManager = {
  isValidCorporateEmail(email) {
    if (!email) return false;
    const emailLower = String(email).trim().toLowerCase();
    return emailLower.endsWith("@a3data.com.br") || emailLower.endsWith("@a3data.com");
  },

  async login(email, profile = {}) {
    const normalizedEmail = String(email).trim().toLowerCase();

    try {
      const response = await apiService.loginUser({ email: normalizedEmail, ...profile });

      if (response.success && response.data && response.data.id) {
        const user = UserMapper.fromDTO(response.data);
        SessionManager.persist({
          user,
          accessToken: response.data.access_token || null,
          tokenExpiresIn: response.data.expires_in || null,
          authenticationMode: "online",
          provider: "backend",
        });
        const accountProfile = await storageManager.hydrateAccountState();
        if (accountProfile?.data?.preferences) {
          SessionManager.update({
            language: accountProfile.data.preferences.language,
            certification: accountProfile.data.preferences.certification?.toLowerCase(),
          });
        }
        logger.info(`✓ Login via Backend: ${user.email} (${user.role})`);
        return user;
      }

      throw new Error(response.message || "Falha no login corporativo.");
    } catch (error) {
      logger.info("[DEBUG] Exception em login corporativo:", error);
      const isNetworkFailure = error.apiDisabled
        || error.message?.includes("Failed to fetch")
        || error.message?.includes("NetworkError")
        || error.message?.includes("Load failed");

      if (isNetworkFailure && this.isValidCorporateEmail(normalizedEmail)) {
        logger.warn(`⚠️ API indisponível. Iniciando sessão offline: ${normalizedEmail}`);
        return this.createOfflineUser(normalizedEmail, profile);
      }

      logger.error("Erro no login:", error);
      throw error;
    }
  },

  createOfflineUser(email, profile = {}) {
    const user = UserMapper.fromDTO({
      id: `local_${Date.now()}`,
      email,
      name: profile.full_name || profile.nickname || email.split("@")[0],
      role: "student",
      language: "pt",
      certification: "clf-c02",
      provider: "local",
    });
    user.provider = "local";
    SessionManager.persist({ user, authenticationMode: "offline", provider: "local" });
    return user;
  },

  getUserId() {
    return SessionManager.restore()?.user?.id || null;
  },

  updatePreferences(preferences) {
    const normalizedPreferences = { ...preferences };
    if (normalizedPreferences.certification !== undefined) {
      normalizedPreferences.certification = normalizeCertificationId(
        normalizedPreferences.certification,
      );
    }

    SessionManager.update(normalizedPreferences);
    const session = SessionManager.restore();
    if (session?.accessToken && session.authenticationMode === "online") {
      const pending = {
        ...(SessionManager.getPendingPreferenceSync() || {}),
        ...normalizedPreferences,
        updatedAt: Date.now(),
      };
      SessionManager.updateSession({ pendingPreferenceSync: pending });

      return apiService
        .updateMyProfile({ preferences: normalizedPreferences })
        .then((response) => {
          SessionManager.clearPendingPreferenceSync(normalizedPreferences);
          return response;
        })
        .catch(() => {
          // Mantém o valor pendente para a próxima hidratação tentar novamente.
          return null;
        });
    }

    return Promise.resolve(null);
  },
};

export default userManager;
