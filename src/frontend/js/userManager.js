/**
 * User Manager
 * Handles anonymous user creation and persistence
 *
 * @module userManager
 */

import apiService from "../services/api.js";

/**
 * User Manager Object
 * Provides methods for user account management
 */
export const userManager = {
  /**
   * Get or create current user
   * Returns existing user if available, creates new anonymous user if not
   *
   * @returns {Promise<object>} { id, anonymous_name }
   */
  async getOrCreateUser() {
    try {
      // Check if user exists in local storage
      const existingUserId = this.getUserId();

      if (existingUserId) {
        if (existingUserId.startsWith("local_")) {
          const upgraded = await this.tryUpgradeToBackendUser(existingUserId);
          if (upgraded) return upgraded;
        }
        console.log(`✓ Using existing user: ${existingUserId}`);
        return {
          id: existingUserId,
          anonymous_name:
            localStorage.getItem("aws_sim_user_name") || "Anonymous",
        };
      }

      // Try to create user via API
      try {
        const response = await apiService.createUser({});

        if (response.success && response.data && response.data.id) {
          const userId = response.data.id;
          const userName = response.data.anonymous_name || "Anonymous";

          // Store in local storage
          localStorage.setItem("aws_sim_user_id", userId);
          localStorage.setItem("aws_sim_user_name", userName);

          console.log(`✓ Created new user via API: ${userId} (${userName})`);

          return {
            id: userId,
            anonymous_name: userName,
          };
        }
      } catch (apiError) {
        console.warn(
          "Failed to create user via API, using local fallback:",
          apiError,
        );
      }

      // Fallback: Generate local user ID if API fails
      const fallbackUserId = this._generateLocalUserId();
      localStorage.setItem("aws_sim_user_id", fallbackUserId);
      localStorage.setItem("aws_sim_user_name", "AnonymousLocal");

      console.log(`✓ Using local fallback user: ${fallbackUserId}`);

      return {
        id: fallbackUserId,
        anonymous_name: "AnonymousLocal",
      };
    } catch (error) {
      console.error("Fatal error in user creation:", error);
      throw error;
    }
  },

  /**
   * Tenta migrar usuário local para o backend quando a conexão é restaurada.
   * Chamado automaticamente por getOrCreateUser() quando o ID armazenado começa com "local_".
   *
   * @param {string} localUserId - ID local atual (prefixo "local_")
   * @returns {Promise<object|null>} Usuário do backend ou null se API indisponível
   */
  async tryUpgradeToBackendUser(localUserId) {
    try {
      const isUp = await apiService.isAvailable();
      if (!isUp) return null;

      const name = localStorage.getItem("aws_sim_user_name") || "Anonymous";
      const response = await apiService.createUser({ anonymous_name: name });

      if (response.success && response.data && response.data.id) {
        const newId = response.data.id;
        const newName = response.data.anonymous_name || name;
        localStorage.setItem("aws_sim_user_id", newId);
        localStorage.setItem("aws_sim_user_name", newName);
        console.log(
          `✓ Local user ${localUserId} upgraded to backend user: ${newId}`,
        );
        return { id: newId, anonymous_name: newName };
      }
    } catch (error) {
      console.warn("Could not upgrade local user to backend:", error);
    }
    return null;
  },

  /**
   * Get current user ID from storage
   *
   * @returns {string|null} User ID or null if not found
   */
  getUserId() {
    return localStorage.getItem("aws_sim_user_id");
  },

  /**
   * Get current user name from storage
   *
   * @returns {string} User name or 'Anonymous'
   */
  getUserName() {
    return localStorage.getItem("aws_sim_user_name") || "Anonymous";
  },

  /**
   * Clear user session
   */
  clearUser() {
    localStorage.removeItem("aws_sim_user_id");
    localStorage.removeItem("aws_sim_user_name");
  },

  /**
   * Generate a unique local user ID (fallback if API unavailable)
   * @private
   * @returns {string} Unique user ID
   */
  _generateLocalUserId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `local_${timestamp}_${random}`;
  },
};

export default userManager;
