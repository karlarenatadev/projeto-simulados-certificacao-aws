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

/**
 * Cria um repositório de dados que combina storage local e API.
 *
 * @param {object} storage - Instância de StorageManager
 * @param {object|null} api - Instância de apiService (opcional)
 * @returns {object} Interface única de acesso a dados
 */
export function createDataRepository(storage, _api = null) {
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

  const ACCOUNT_CERTIFICATIONS = ['clf-c02', 'saa-c03', 'dva-c02', 'aif-c01'];

  async function syncModuleState(module, certId = null) {
    if (!_api?.saveModuleState || (module !== 'preferences' && !certId)) return null;
    const state = storage.getAccountModuleState(module, certId);
    if (!state) return null;
    return _safeApiCall(() => _api.saveModuleState(module, certId, state));
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
      const diagnosticCertifications = [...new Set((history || [])
        .filter((item) => item?.mode === 'diagnostic' && item.certId)
        .map((item) => item.certId))];
      diagnosticCertifications.forEach((certId) => void syncModuleState('diagnostic', certId));
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
      return storage.recordMistake(question, userAnswer, context);
    },

    getMistakes(certificationId) {
      return storage.getMistakes(certificationId);
    },

    hasMistakes(certificationId) {
      return storage.hasMistakes(certificationId);
    },

    removeMistake(questionOrId, certificationId) {
      return storage.removeMistake(questionOrId, certificationId);
    },

    clearMistakes(certificationId) {
      return storage.clearMistakes(certificationId);
    },

    // -------------------------------------------------------------------------
    // Review Deck (questões marcadas para revisão / flashcards)
    // -------------------------------------------------------------------------

    saveReviewDeck(certId, flaggedQuestionsArray) {
      const saved = storage.saveReviewDeck(certId, flaggedQuestionsArray);
      void syncModuleState('flashcards', certId);
      return saved;
    },

    getReviewDeck(certId) {
      return storage.getReviewDeck(certId);
    },

    addReviewQuestion(certId, question) {
      const saved = storage.addReviewQuestion(certId, question);
      void syncModuleState('flashcards', certId);
      return saved;
    },

    removeReviewQuestion(certId, questionId) {
      const saved = storage.removeReviewQuestion(certId, questionId);
      void syncModuleState('flashcards', certId);
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

      return result;
    },

    saveGamification(gamification, certId = null) {
      const saved = storage.saveGamification(gamification, certId);
      void syncModuleState('journey', certId);
      return saved;
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
      void syncModuleState('sprint', certId);
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

    syncAccountModuleState(module, certId = null) {
      return syncModuleState(module, certId);
    },

    async hydrateAccountState() {
      if (!_api?.getMyProfile || !_api?.getModuleState) return null;
      const profile = await _safeApiCall(() => _api.getMyProfile());
      await Promise.all(['journey', 'sprint', 'flashcards', 'labs', 'diagnostic'].flatMap((module) =>
        ACCOUNT_CERTIFICATIONS.map(async (certId) => {
          const local = storage.getAccountModuleState(module, certId);
          const remote = await _safeApiCall(() => _api.getModuleState(module, certId));
          const remoteState = remote?.data?.state_json;
          if (remoteState && typeof remoteState === 'object') {
            storage.setAccountModuleState(module, certId, remoteState);
          } else if (local && _api.saveModuleState) {
            await _safeApiCall(() => _api.saveModuleState(module, certId, local));
          }
        }),
      ));
      return profile;
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
    validateQuestions(questions) {
      if (!Array.isArray(questions)) return [];

      return questions.filter((q) => {
        // Validação das propriedades obrigatórias segundo o modelo
        const hasId = (q.id !== undefined && q.id !== null) || (q.questionId !== undefined && q.questionId !== null);
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

        if (!hasId || !hasText || !hasOptions || !hasCorrectAnswers) {
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
