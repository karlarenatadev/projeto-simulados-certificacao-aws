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
      console.warn(
        "[DataRepository] API call failed, falling back to local:",
        e.message,
      );
      return null;
    }
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
      await _safeApiCall(() => _api.syncQuizResult(result));

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

    async updateGamification(percentage) {
      const result = storage.updateGamification(percentage);

      // Sincroniza com API silenciosamente
      await _safeApiCall(() => _api.syncGamification(result));

      return result;
    },

    saveGamification(gamification) {
      return storage.saveGamification(gamification);
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
      return storage.saveSprintState(certId, state);
    },

    // -------------------------------------------------------------------------
    // Sessões de foco (Pomodoro)
    // -------------------------------------------------------------------------

    async saveFocusSession(minutes, type = "work") {
      const saved = storage.saveFocusSession(minutes, type);

      // Sincroniza silenciosamente
      await _safeApiCall(() => _api.syncFocusSession({ minutes, type }));

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
        const hasId = q.id !== undefined && q.id !== null;
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
          console.warn(
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
