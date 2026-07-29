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

/**
 * Cria um repositório de dados que combina storage local e API.
 *
 * @param {object} storage - Instância de StorageManager
 * @param {object|null} api - Instância de apiService (opcional)
 * @returns {object} Interface única de acesso a dados
 */
export function createDataRepository(storage, api = null) {
  function isApiEnabled() {
    return api !== null && typeof api.isAvailable === "function";
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

    saveQuizResult(result) {
      const saved = storage.saveQuizResult(result);

      // Ponto de extensão — sincronizar com API quando endpoint existir:
      // if (saved && isApiEnabled()) {
      //   api.syncQuizResult(result).catch((e) =>
      //     console.warn("[DataRepository] Falha ao sincronizar resultado:", e)
      //   );
      // }

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

    saveHistory(history) {
      return storage.saveHistory(history);
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
      return storage.saveReviewDeck(certId, flaggedQuestionsArray);
    },

    getReviewDeck(certId) {
      return storage.getReviewDeck(certId);
    },
    
    addReviewQuestion(certId, question) {
      return storage.addReviewQuestion(certId, question);
    },

    removeReviewQuestion(certId, questionId) {
      return storage.removeReviewQuestion(certId, questionId);
    },

    getReviewStats(certId) {
      return storage.getReviewStats(certId);
    },


    // -------------------------------------------------------------------------
    // Gamificação
    // -------------------------------------------------------------------------

    getGamification() {
      return storage.getGamification();
    },

    updateGamification(percentage) {
      const result = storage.updateGamification(percentage);

      // Ponto de extensão — sincronizar com API quando endpoint existir:
      // GET/PUT /api/users/:id/gamification está listado como rota planejada
      // if (isApiEnabled()) {
      //   api.syncGamification(result).catch((e) =>
      //     console.warn("[DataRepository] Falha ao sincronizar gamificação:", e)
      //   );
      // }

      return result;
    },

    saveGamification(gamification) {
      return storage.saveGamification(gamification);
    },

    recalculateGamificationFromHistory() {
      return storage.recalculateGamificationFromHistory();
    },

    // -------------------------------------------------------------------------
    // Sessões de foco (Pomodoro)
    // -------------------------------------------------------------------------

    saveFocusSession(minutes, type = "work") {
      const saved = storage.saveFocusSession(minutes, type);

      // Ponto de extensão — sincronizar com API quando endpoint existir:
      // POST /api/focus-sessions está listado como rota planejada
      // if (saved && isApiEnabled()) {
      //   api.syncFocusSession({ minutes, type }).catch((e) =>
      //     console.warn("[DataRepository] Falha ao sincronizar sessão:", e)
      //   );
      // }

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
  };
}
