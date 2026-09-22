/**
 * DataRepository - Abstração única de acesso a dados
 *
 * Coordena persistência local (StorageManager) e sincronização com a API
 * conforme a estratégia D2: dual-write com leitura API-first.
 *
 * Hoje delega 100% para o storage local. Os pontos marcados com
 * "Ponto de extensão" são onde a sincronização com a API será adicionada
 * quando os endpoints de backend estiverem disponíveis.
 *
 * @module dataRepository
 */

import { logger } from "./utils/logger.js";
import { reconcileModuleState } from "./progressSync.js";
import { SessionManager } from "./core/sessionManager.js";

/**
 * Cria um repositório de dados que combina storage local e API.
 *
 * @param {object} storage - Instância de StorageManager
 * @param {object|null} api - Instância de apiService (opcional)
 * @returns {object} Interface única de acesso a dados
 */
export function createDataRepository(storage, _api = null) {
  let syncInProgress = false;
  const syncLocks = new Map();
  /**
   * Helper que tenta sincronizar com a API.
   * Se falhar (modo offline, timeout, etc), engole o erro silenciosamente
   * permitindo o fallback para storage local.
   */
  async function _safeApiCall(apiFn) {
    if (!_api) return null;
    try {
      return await apiFn();
    } catch (e) {
      logger.warn(
        "[DataRepository] API call failed, falling back to local:",
        e.message,
      );
      return null;
    }
  }

  const ACCOUNT_CERTIFICATIONS = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"];

  async function readRemoteModuleState(module, certId) {
    if (!_api?.getModuleState) return { syncPending: true };
    try {
      const response = await _api.getModuleState(module, certId);
      if (response?.success !== true || response.status >= 400)
        return { syncPending: true };
      // This API reports an absent state as 200/success + data:null. An HTTP
      // 404 (possibly a missing route), failed GET or malformed body is not proof.
      if (response.data === null) return { state: null, version: 0 };
      const { state_json: state, version } = response.data || {};
      if (
        !state ||
        typeof state !== "object" ||
        Array.isArray(state) ||
        !Number.isSafeInteger(version) ||
        version < 1
      )
        return { syncPending: true };
      return { state, version };
    } catch (error) {
      logger.warn(
        "[DataRepository] Remote read failed; sync remains pending:",
        error?.message,
      );
      return {
        syncPending: true,
        ...([401, 403].includes(error?.statusCode || error?.status)
          ? { authRequired: true }
          : {}),
      };
    }
  }

  async function syncModuleState(module, certId = null, options = {}) {
    if (
      !_api?.saveModuleState ||
      (module !== "preferences" && module !== "gamification" && !certId)
    )
      return null;
    const session = SessionManager.restore();
    const contextValid = () => {
      const current = SessionManager.restore();
      return (
        current?.accessToken &&
        current.authenticationMode === "online" &&
        current.user?.id === (options.expectedUserId || session?.user?.id)
      );
    };
    if (
      !_api?.saveModuleState ||
      !session?.accessToken ||
      session.authenticationMode !== "online" ||
      !contextValid()
    ) {
      return { syncPending: true, authRequired: true };
    }
    const key = `${module}:${certId || "global"}`;
    const previous = syncLocks.get(key) || Promise.resolve();
    const operation = previous
      .then(async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (!contextValid()) return { syncPending: true, authRequired: true };
          if (
            !storage.getAccountModuleState(module, certId) &&
            !options.hydrateOnly
          )
            return null;
          const remote = await readRemoteModuleState(module, certId);
          if (!contextValid()) return { syncPending: true, authRequired: true };
          if (remote.syncPending) return remote;
          const remoteState = remote.state;
          // Study may continue while GET is pending. Merge the current local
          // state, with no await between this read and the local write.
          const state = storage.getAccountModuleState(module, certId);
          if (!state && !remoteState) return null;
          if (remoteState && typeof remoteState === "object") {
            const merged = reconcileModuleState(module, state, remoteState);
            storage.setAccountModuleState(module, certId, merged.state);
            // Hydration merges existing remote state locally. A create conflict
            // still follows the retry/merge/conditional-write path below.
            if (options.hydrateOnly && attempt === 0) return merged;
            if (JSON.stringify(merged.state) === JSON.stringify(remoteState)) {
              return options.confirmRemote
                ? {
                    ...merged,
                    remoteConfirmed: true,
                    version: remote.version,
                  }
                : merged;
            }
            try {
              const saved = await _api.saveModuleState(
                module,
                certId,
                merged.state,
                remote.version,
              );
              if (!options.confirmRemote) return saved;
              if (!contextValid())
                return { syncPending: true, authRequired: true };
              return saved?.success && Number(saved.data?.version) > 0
                ? { remoteConfirmed: true, version: Number(saved.data.version) }
                : { syncPending: true };
            } catch (error) {
              if (error?.statusCode === 409 && attempt < 2) continue;
              logger.warn(
                "[DataRepository] Sync conflict remains pending after retries:",
                error?.message,
              );
              return { ...merged, syncPending: true };
            }
          }
          if (remote.version === 0) {
            try {
              const saved = await _api.saveModuleState(
                module,
                certId,
                state,
                0,
              );
              if (!contextValid())
                return { syncPending: true, authRequired: true };
              if (!options.confirmRemote) return saved;
              return saved?.success && Number(saved.data?.version) > 0
                ? { remoteConfirmed: true, version: Number(saved.data.version) }
                : { syncPending: true };
            } catch (error) {
              if (error?.statusCode === 409 && attempt < 2) continue;
              return { syncPending: true };
            }
          }
        }
        return null;
      })
      .finally(() => {
        if (syncLocks.get(key) === operation) syncLocks.delete(key);
      });
    syncLocks.set(key, operation);
    return operation;
  }

  return {
    // -------------------------------------------------------------------------
    // Progresso e histórico
    // -------------------------------------------------------------------------

    getCompletedQuizCount(certId) {
      return storage.getCompletedQuizCount(certId);
    },

    getProgressFromHistory(certId, totalModules = 5) {
      return storage.getProgressFromHistory(certId, totalModules);
    },

    async saveQuizResult(result) {
      const saved = storage.saveQuizResult(result);

      // Sincroniza com API silenciosamente (fallback p/ local já garantido na linha acima)
      if (_api?.syncQuizResult) {
        await _safeApiCall(() => _api.syncQuizResult(result));
      }

      return saved;
    },

    loadLastScore(certId) {
      return storage.loadLastScore(certId);
    },

    loadLastResult(certId) {
      return storage.loadLastResult(certId);
    },

    getHistory() {
      return storage.getHistory();
    },

    getDiagnosticHistory(certId) {
      return storage.getDiagnosticHistory(certId);
    },

    saveHistory(history) {
      const saved = storage.saveHistory(history);
      const diagnosticCertifications = [
        ...new Set(
          (history || [])
            .filter((item) => item?.mode === "diagnostic" && item.certId)
            .map((item) => item.certId),
        ),
      ];
      diagnosticCertifications.forEach(
        (certId) => void syncModuleState("diagnostic", certId),
      );
      return saved;
    },

    clearHistory() {
      return storage.clearHistory();
    },

    removeHistoryItem(index) {
      return storage.removeHistoryItem(index);
    },

    // -------------------------------------------------------------------------
    // Erros e revisão
    // -------------------------------------------------------------------------

    recordMistake(question, userAnswer, context = {}) {
      const saved = storage.recordMistake(question, userAnswer, context);
      void syncModuleState(
        "mistakes",
        context.certId || context.certification || question?.certId,
      );
      return saved;
    },

    getMistakes(certificationId) {
      return storage.getMistakes(certificationId);
    },

    getAllMistakes(certificationId) {
      return storage.getAllMistakes(certificationId);
    },

    hasMistakes(certificationId) {
      return storage.hasMistakes(certificationId);
    },

    removeMistake(questionOrId, certificationId) {
      const saved = storage.removeMistake(questionOrId, certificationId);
      void syncModuleState("mistakes", certificationId);
      return saved;
    },

    clearMistakes(certificationId) {
      const saved = storage.clearMistakes(certificationId);
      void syncModuleState("mistakes", certificationId);
      return saved;
    },

    // -------------------------------------------------------------------------
    // Review Deck (questões marcadas para revisão / flashcards)
    // -------------------------------------------------------------------------

    saveReviewDeck(certId, flaggedQuestionsArray) {
      const saved = storage.saveReviewDeck(certId, flaggedQuestionsArray);
      void syncModuleState("flashcards", certId);
      return saved;
    },

    getReviewDeck(certId) {
      return storage.getReviewDeck(certId);
    },

    addReviewQuestion(certId, question) {
      const saved = storage.addReviewQuestion(certId, question);
      void syncModuleState("flashcards", certId);
      return saved;
    },

    removeReviewQuestion(certId, questionId) {
      const saved = storage.removeReviewQuestion(certId, questionId);
      void syncModuleState("flashcards", certId);
      return saved;
    },

    updateReviewStatus(certId, questionId, status) {
      const saved = storage.updateReviewStatus(certId, questionId, status);
      void syncModuleState("flashcards", certId);
      return saved;
    },

    getReviewStats(certId) {
      return storage.getReviewStats(certId);
    },

    // -------------------------------------------------------------------------
    // Gamificação
    // -------------------------------------------------------------------------

    getGamification(certId = null) {
      return storage.getGamification(certId);
    },

    async updateGamification(percentage) {
      const result = storage.updateGamification(percentage);

      // Sincroniza com API silenciosamente
      if (_api?.syncGamification) {
        await _safeApiCall(() => _api.syncGamification(result));
      }
      await syncModuleState("gamification");

      return result;
    },

    saveGamification(gamification, certId = null) {
      const saved = storage.saveGamification(gamification, certId);
      void syncModuleState("journey", certId);
      void syncModuleState("gamification");
      return saved;
    },

    awardXpEvent(input) {
      const result = storage.awardXpEvent(input);
      if (result.added) void syncModuleState("gamification");
      return result;
    },

    getTotalXp() {
      return storage.getTotalXp();
    },

    recalculateGamificationFromHistory() {
      return storage.recalculateGamificationFromHistory();
    },

    // -------------------------------------------------------------------------
    // Gamificação (Sprints, Badges, etc)
    // -------------------------------------------------------------------------
    // Casos práticos (sessão ativa)
    // -------------------------------------------------------------------------

    saveActiveCase(caseState) {
      return storage.saveActiveCase(caseState);
    },

    loadActiveCase(caseId) {
      return storage.loadActiveCase(caseId);
    },

    clearActiveCase(caseId) {
      return storage.clearActiveCase(caseId);
    },

    // -------------------------------------------------------------------------
    // Sessões de simulado (retomada)
    // -------------------------------------------------------------------------

    saveActiveSession(sessionState) {
      return storage.saveActiveSession(sessionState);
    },

    loadActiveSession(certId) {
      return storage.loadActiveSession(certId);
    },

    clearActiveSession(certId) {
      return storage.clearActiveSession(certId);
    },

    // -------------------------------------------------------------------------

    getSprintState(certId) {
      return storage.getSprintState(certId);
    },

    saveSprintState(certId, state) {
      const saved = storage.saveSprintState(certId, state);
      void syncModuleState("sprint", certId);
      return saved;
    },

    // -------------------------------------------------------------------------
    // Sessões de foco (Pomodoro)
    // -------------------------------------------------------------------------

    async saveFocusSession(minutes, type = "work") {
      const saved = storage.saveFocusSession(minutes, type);

      // Sincroniza silenciosamente
      if (_api?.syncFocusSession) {
        await _safeApiCall(() => _api.syncFocusSession({ minutes, type }));
      }

      return saved;
    },

    getFocusHistory() {
      return storage.getFocusHistory();
    },

    getTotalFocusMinutes() {
      return storage.getTotalFocusMinutes();
    },

    clearFocusHistory() {
      return storage.clearFocusHistory();
    },

    getCurrentUserId() {
      return storage.getCurrentUserId();
    },

    getStorageContext() {
      return storage.getStorageContext();
    },

    getUserScopedKey(key) {
      return storage.getUserScopedKey(key);
    },

    getUserData(key, storageBackend) {
      return storage.getUserData(key, storageBackend);
    },

    setUserData(key, value, storageBackend) {
      return storage.setUserData(key, value, storageBackend);
    },

    // Local-only module access in the current session's namespace. Capturing a
    // source snapshot must happen before switching the session to the target.
    // These methods intentionally do not hydrate, authenticate or schedule sync.
    getLocalModuleState(module, certId = null) {
      return storage.getAccountModuleState(module, certId);
    },

    setLocalModuleState(module, certId, state) {
      return storage.setAccountModuleState(module, certId, state);
    },

    saveLocalLinkSnapshot(snapshot) {
      return storage.saveLocalLinkSnapshot(snapshot);
    },

    getLocalLinkSnapshot(localIdentityId) {
      return storage.getLocalLinkSnapshot(localIdentityId);
    },

    syncAccountModuleState(module, certId = null, options = {}) {
      return syncModuleState(module, certId, options);
    },

    async hydrateAccountState() {
      if (syncInProgress) return null;
      if (!_api?.getMyProfile || !_api?.getModuleState) return null;
      const session = SessionManager.restore();
      if (!session?.accessToken || session.authenticationMode !== "online") {
        return { syncPending: true, authRequired: true };
      }
      syncInProgress = true;
      const contextValid = () => {
        const current = SessionManager.restore();
        return (
          current?.user?.id === session.user.id &&
          current.authenticationMode === "online" &&
          !!current.accessToken
        );
      };
      try {
        const profile = await _safeApiCall(() => _api.getMyProfile());
        if (!contextValid()) return { syncPending: true, authRequired: true };
        await Promise.all(
          [
            "journey",
            "sprint",
            "flashcards",
            "mistakes",
            "labs",
            "diagnostic",
          ].flatMap((module) =>
            ACCOUNT_CERTIFICATIONS.map(async (certId) => {
              if (!contextValid()) return;
              await syncModuleState(module, certId, {
                expectedUserId: session.user.id,
                hydrateOnly: true,
              });
            }),
          ),
        );
        if (!contextValid()) return { syncPending: true, authRequired: true };
        await syncModuleState("gamification", null, {
          expectedUserId: session.user.id,
        });
        return profile;
      } finally {
        syncInProgress = false;
      }
    },

    removeUserData(key, storageBackend) {
      return storage.removeUserData(key, storageBackend);
    },

    // -------------------------------------------------------------------------
    // Utilitários
    // -------------------------------------------------------------------------

    clearAll() {
      return storage.clearAll();
    },

    exportData() {
      return storage.exportData();
    },

    importData(data) {
      return storage.importData(data);
    },

    // -------------------------------------------------------------------------
    // Validação de Domínio (Bloco B)
    // -------------------------------------------------------------------------

    /**
     * Valida um lote de questões contra o Modelo de Domínio `Question`
     * @param {Array} questions - Lote de questões a ser validado
     * @returns {Array} Lote contendo apenas as questões válidas (consistentes)
     */
    validateQuestions(questions, { requireCorrect = true } = {}) {
      if (!Array.isArray(questions)) return [];

      return questions.filter((q) => {
        // Validação das propriedades obrigatórias segundo o modelo
        const hasId =
          (q.id !== undefined && q.id !== null) ||
          (q.questionId !== undefined && q.questionId !== null);
        const hasText =
          typeof q.question === "string" && q.question.trim().length > 0;
        const hasOptions = Array.isArray(q.options) && q.options.length > 1;

        // Verifica correctAnswers (suporta índice numérico ou array de números)
        const hasCorrectAnswers =
          (typeof q.correct === "number" &&
            q.correct >= 0 &&
            q.correct < q.options.length) ||
          (Array.isArray(q.correct) &&
            q.correct.length > 0 &&
            q.correct.every(
              (idx) =>
                typeof idx === "number" && idx >= 0 && idx < q.options.length,
            ));

        const hasSelectionCount =
          Number.isInteger(q.selection_count) &&
          q.selection_count >= 1 &&
          q.selection_count <= q.options.length;
        if (
          !hasId ||
          !hasText ||
          !hasOptions ||
          (requireCorrect ? !hasCorrectAnswers : !hasSelectionCount)
        ) {
          logger.warn(
            "[DataRepository] Questão inválida ou corrompida descartada:",
            q,
          );
          return false;
        }
        return true;
      });
    },
  };
}
