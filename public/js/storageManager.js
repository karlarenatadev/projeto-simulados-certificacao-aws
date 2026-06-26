/**
 * StorageManager - Gerencia toda a persistência de dados do simulador
 * Encapsula lógica de localStorage para facilitar manutenção e testes
 *
 * @module storageManager
 * @author AWS Exam Simulator Team
 */

/**
 * Classe responsável por gerenciar todas as operações de persistência
 * usando localStorage como backend de armazenamento.
 */
export class StorageManager {
  /**
   * Cria uma nova instância do StorageManager
   * @param {string} storageKeyPrefix - Prefixo para todas as chaves do localStorage (default: 'aws_sim_')
   */
  constructor(storageKeyPrefix = "aws_sim_") {
    this.prefix = storageKeyPrefix;
  }

  /**
   * Gera chave completa com prefixo
   * @private
   * @param {string} suffix - Sufixo da chave
   * @returns {string} Chave completa com prefixo
   */
  _getKey(suffix) {
    return `${this.prefix}${suffix}`;
  }

  _getResultIdentity(result) {
    if (!result || typeof result !== "object") return "";
    if (result.attemptId) return `attempt:${result.attemptId}`;
    if (result.quizId) return `quiz:${result.quizId}`;

    const answers = Array.isArray(result.answers)
      ? result.answers.map((answer) => ({
          id: answer.id || answer.question_id || answer.question,
          userSelection: answer.userSelection,
          isCorrect: answer.isCorrect,
        }))
      : [];

    return JSON.stringify({
      certId: result.certId,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      answers,
    });
  }

  _getUniqueCompletedSessions(certId) {
    const history = this.getHistory();
    const seen = new Set();

    return history.filter((session) => {
      if (!session || !session.certId || session.percentage === undefined) {
        return false;
      }
      if (certId && session.certId !== certId) return false;

      const identity = this._getResultIdentity(session);
      if (identity && seen.has(identity)) return false;
      if (identity) seen.add(identity);

      return true;
    });
  }

  getCompletedQuizCount(certId) {
    return this._getUniqueCompletedSessions(certId).length;
  }

  getProgressFromHistory(certId, totalModules = 5) {
    const completedCount = this.getCompletedQuizCount(certId);
    return {
      completedCount,
      percentage: Math.min(
        Math.round((completedCount / totalModules) * 100),
        100,
      ),
    };
  }

  _calculateStreakFromHistory(sessions) {
    const passedDates = [
      ...new Set(
        sessions
          .filter((session) => Number(session.percentage) >= 70 && session.date)
          .map((session) => new Date(session.date).toISOString().split("T")[0]),
      ),
    ].sort((a, b) => new Date(b) - new Date(a));

    if (passedDates.length === 0) return 0;

    let streak = 1;
    let previous = new Date(`${passedDates[0]}T00:00:00.000Z`);

    for (let i = 1; i < passedDates.length; i++) {
      const current = new Date(`${passedDates[i]}T00:00:00.000Z`);
      const diffDays = Math.round((previous - current) / 86400000);
      if (diffDays !== 1) break;
      streak++;
      previous = current;
    }

    return streak;
  }

  _deriveGamificationFromSessions(sessions) {
    const validSessions = Array.isArray(sessions) ? sessions : [];
    const bestScore = validSessions.reduce(
      (best, session) => Math.max(best, Number(session.percentage) || 0),
      0,
    );
    const historyStreak = this._calculateStreakFromHistory(validSessions);
    const badges = [];

    if (bestScore === 100) badges.push("perfect");
    if (validSessions.length >= 10) badges.push("dedicated");
    if (historyStreak >= 5) badges.push("streak");

    return {
      totalQuizzes: validSessions.length,
      bestScore,
      currentStreak: historyStreak,
      lastDate:
        validSessions
          .map((session) => session.date)
          .filter(Boolean)
          .sort()
          .at(-1) || "",
      badges,
    };
  }

  _mergeGamificationWithHistory(gamification) {
    const sessions = this._getUniqueCompletedSessions();
    if (sessions.length === 0) return gamification;

    const derived = this._deriveGamificationFromSessions(sessions);
    const badges = new Set(
      Array.isArray(gamification.badges) ? gamification.badges : [],
    );

    derived.badges.forEach((badgeId) => badges.add(badgeId));

    return {
      ...gamification,
      totalQuizzes: Math.max(
        gamification.totalQuizzes || 0,
        derived.totalQuizzes,
      ),
      bestScore: Math.max(gamification.bestScore || 0, derived.bestScore),
      currentStreak: Math.max(
        gamification.currentStreak || 0,
        derived.currentStreak,
      ),
      lastDate: gamification.lastDate || derived.lastDate,
      badges: [...badges],
    };
  }

  _refreshLastResultForCert(certId, history) {
    if (!certId) return;

    const lastKey = this._getKey(`last_${certId}`);
    const latestForCert = Array.isArray(history)
      ? history.find((session) => session && session.certId === certId)
      : null;

    if (latestForCert) {
      localStorage.setItem(lastKey, JSON.stringify(latestForCert));
    } else {
      localStorage.removeItem(lastKey);
    }
  }

  _normalizeCertId(certId) {
    return certId ? String(certId).toLowerCase().trim() : "";
  }

  _hashString(value) {
    const text = String(value || "");
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }

    return hash.toString(36);
  }

  _getQuestionIdentity(question) {
    if (!question || typeof question !== "object") return "";
    if (question.id) return String(question.id);
    if (question.question_id) return String(question.question_id);

    return `fallback:${this._hashString(
      `${question.domain || ""}|${question.question || ""}`,
    )}`;
  }

  _resolveAnswerText(question, answer) {
    const options = Array.isArray(question?.options) ? question.options : [];

    if (Array.isArray(answer)) {
      return answer.map((index) => options[index] ?? index);
    }

    return options[answer] ?? answer;
  }

  _getMistakesStore() {
    try {
      const key = this._getKey("mistakes");
      const data = localStorage.getItem(key);
      if (!data) return {};

      const parsed = JSON.parse(data);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      console.error("Erro ao carregar erros registrados:", error);
      return {};
    }
  }

  _saveMistakesStore(store) {
    try {
      localStorage.setItem(this._getKey("mistakes"), JSON.stringify(store));
      return true;
    } catch (error) {
      console.error("Erro ao salvar erros registrados:", error);
      return false;
    }
  }

  /**
   * Salva resultado do quiz (último resultado + histórico)
   * @param {Object} result - Objeto com certId, score, total, percentage, passed, domainScores, weakDomains, answers
   * @param {string} result.certId - ID da certificação (ex: 'aif-c01')
   * @param {number} result.score - Pontuação obtida
   * @param {number} result.total - Total de questões
   * @param {number} result.percentage - Percentual de acerto
   * @param {boolean} result.passed - Se passou no exame
   * @param {Object} result.domainScores - Pontuação por domínio
   * @param {string[]} result.weakDomains - Array de domínios fracos
   * @param {Array} result.answers - Array com todas as respostas
   * @returns {boolean} True se salvou com sucesso, False caso contrário
   *
   * @example
   * storageManager.saveQuizResult({
   *   certId: 'clf-c02',
   *   score: 45,
   *   total: 65,
   *   percentage: 69.23,
   *   passed: false,
   *   domainScores: { 'conceitos-cloud': { total: 15, correct: 10 } },
   *   weakDomains: ['conceitos-cloud'],
   *   answers: [...]
   * });
   */
  saveQuizResult(result) {
    try {
      // Adiciona timestamp se não existir
      const resultWithDate = {
        ...result,
        date: result.date || new Date().toISOString(),
      };

      // Salva como último resultado da certificação
      const resultIdentity = this._getResultIdentity(resultWithDate);
      const lastKey = this._getKey(`last_${result.certId}`);

      // Adiciona ao histórico
      const history = this.getHistory();
      const duplicate = history.find(
        (item) => this._getResultIdentity(item) === resultIdentity,
      );

      if (duplicate) {
        localStorage.setItem(lastKey, JSON.stringify(duplicate));
        return false;
      }

      localStorage.setItem(lastKey, JSON.stringify(resultWithDate));
      history.unshift(resultWithDate);

      // Limita histórico a 50 entradas
      if (history.length > 50) {
        history.length = 50;
      }

      this.saveHistory(history);

      return true;
    } catch (error) {
      console.error("Erro ao salvar resultado do quiz:", error);
      return false;
    }
  }

  /**
   * Carrega último score de uma certificação
   * @param {string} certId - ID da certificação (ex: 'aif-c01')
   * @returns {Object|null} Objeto com score, percentage e passed, ou null se não existir
   *
   * @example
   * const lastScore = storageManager.loadLastScore('clf-c02');
   * // Retorna: { score: 45, percentage: 69.23, passed: false }
   */
  loadLastScore(certId) {
    try {
      const lastKey = this._getKey(`last_${certId}`);
      const data = localStorage.getItem(lastKey);

      if (!data) return null;

      const result = JSON.parse(data);
      return {
        score: result.score,
        percentage: result.percentage,
        passed: result.passed,
      };
    } catch (error) {
      console.error("Erro ao carregar último score:", error);
      return null;
    }
  }

  /**
   * Carrega último resultado completo de uma certificação
   * @param {string} certId - ID da certificação
   * @returns {Object|null} Resultado completo ou null
   *
   * @example
   * const lastResult = storageManager.loadLastResult('clf-c02');
   * // Retorna objeto completo com todos os campos
   */
  loadLastResult(certId) {
    try {
      const lastKey = this._getKey(`last_${certId}`);
      const data = localStorage.getItem(lastKey);

      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error("Erro ao carregar último resultado:", error);
      return null;
    }
  }

  /**
   * Carrega histórico completo de todos os quizzes
   * @returns {Array} Array de resultados históricos (ordenado do mais recente para o mais antigo)
   *
   * @example
   * const history = storageManager.getHistory();
   * // Retorna: [{certId: 'clf-c02', score: 45, ...}, ...]
   */
  getHistory() {
    try {
      const historyKey = this._getKey("history");
      const data = localStorage.getItem(historyKey);

      if (!data) return [];

      const parsed = JSON.parse(data);

      // VALIDAÇÃO CRÍTICA: Garante que sempre retorna um Array válido
      if (!Array.isArray(parsed)) {
        console.warn(
          "Histórico corrompido detectado (não é array). Limpando cache...",
        );
        this.clearHistory();
        return [];
      }

      return parsed;
    } catch (error) {
      console.error(
        "Erro ao carregar histórico (JSON inválido). Limpando cache...",
        error,
      );
      // Se o JSON está corrompido, limpa silenciosamente
      this.clearHistory();
      return [];
    }
  }

  /**
   * Salva histórico completo
   * @param {Array} history - Array de resultados
   * @returns {boolean} True se salvou com sucesso, False caso contrário
   */
  saveHistory(history) {
    try {
      const historyKey = this._getKey("history");
      localStorage.setItem(historyKey, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
      return false;
    }
  }

  /**
   * Limpa todo o histórico
   * @returns {boolean} True se limpou com sucesso, False caso contrário
   */
  clearHistory() {
    try {
      const historyKey = this._getKey("history");
      localStorage.removeItem(historyKey);
      return true;
    } catch (error) {
      console.error("Erro ao limpar histórico:", error);
      return false;
    }
  }

  /**
   * Remove uma entrada específica do histórico pelo índice renderizado.
   * Mantém compatibilidade com sessões antigas sem attemptId.
   *
   * @param {number} index - Índice da sessão no array aws_sim_history
   * @returns {Object|null} Sessão removida ou null se o índice for inválido
   */
  removeHistoryItem(index) {
    try {
      if (!Number.isInteger(index) || index < 0) return null;

      const history = this.getHistory();
      if (index >= history.length) return null;

      const [removed] = history.splice(index, 1);
      if (!this.saveHistory(history)) return null;

      this._refreshLastResultForCert(removed?.certId, history);
      this.recalculateGamificationFromHistory();

      return removed || null;
    } catch (error) {
      console.error("Erro ao remover item do histórico:", error);
      return null;
    }
  }

  /**
   * Registra uma questao respondida incorretamente para revisao futura.
   * A mesma questao por certificacao e atualizada, nao duplicada.
   *
   * @param {Object} question - Questao normalizada usada no quiz
   * @param {number|number[]} userAnswer - Alternativa(s) escolhida(s)
   * @param {Object} context - Metadados do fluxo atual
   * @returns {Object|null} Registro salvo ou null se nao houver dados minimos
   */
  recordMistake(question, userAnswer, context = {}) {
    try {
      const certId = this._normalizeCertId(
        context.certId || context.certification || question?.certId,
      );
      const questionId = this._getQuestionIdentity(question);

      if (!certId || !questionId) return null;

      const store = this._getMistakesStore();
      const certMistakes = store[certId] || {};
      const existing = certMistakes[questionId] || {};
      const now = new Date().toISOString();
      const correctAnswer = question.correct ?? question.correct_answer;

      const record = {
        ...existing,
        questionId,
        certification: certId,
        certId,
        domain: question.domain || question.domainId || "",
        difficulty: question.difficulty || "",
        question: question.question || question.question_text || "",
        options: Array.isArray(question.options) ? question.options : [],
        selectedAnswer: userAnswer,
        selectedAnswerText: this._resolveAnswerText(question, userAnswer),
        correctAnswer,
        correctAnswerText: this._resolveAnswerText(question, correctAnswer),
        wrongCount: (existing.wrongCount || 0) + 1,
        firstWrongAt: existing.firstWrongAt || now,
        lastWrongAt: now,
        source: context.source || context.mode || "quiz",
        attemptId: context.attemptId || existing.attemptId || null,
        quizId: context.quizId || existing.quizId || null,
        resolved: false,
        resolvedAt: null,
      };

      certMistakes[questionId] = record;
      store[certId] = certMistakes;

      return this._saveMistakesStore(store) ? record : null;
    } catch (error) {
      console.error("Erro ao registrar questao errada:", error);
      return null;
    }
  }

  getMistakes(certificationId) {
    const store = this._getMistakesStore();
    const certId = this._normalizeCertId(certificationId);

    const mistakes = certId
      ? Object.values(store[certId] || {})
      : Object.values(store).flatMap((items) => Object.values(items || {}));

    return mistakes
      .filter((mistake) => mistake && mistake.resolved !== true)
      .sort(
        (a, b) => new Date(b.lastWrongAt || 0) - new Date(a.lastWrongAt || 0),
      );
  }

  hasMistakes(certificationId) {
    return this.getMistakes(certificationId).length > 0;
  }

  removeMistake(questionOrId, certificationId) {
    try {
      const certId = this._normalizeCertId(certificationId);
      if (!certId) return false;

      const questionId =
        typeof questionOrId === "object"
          ? this._getQuestionIdentity(questionOrId)
          : String(questionOrId || "");

      if (!questionId) return false;

      const store = this._getMistakesStore();
      if (!store[certId] || !store[certId][questionId]) return false;

      delete store[certId][questionId];
      if (Object.keys(store[certId]).length === 0) {
        delete store[certId];
      }

      return this._saveMistakesStore(store);
    } catch (error) {
      console.error("Erro ao remover erro registrado:", error);
      return false;
    }
  }

  clearMistakes(certificationId) {
    try {
      const certId = this._normalizeCertId(certificationId);

      if (!certId) {
        localStorage.removeItem(this._getKey("mistakes"));
        return true;
      }

      const store = this._getMistakesStore();
      delete store[certId];

      return this._saveMistakesStore(store);
    } catch (error) {
      console.error("Erro ao limpar erros registrados:", error);
      return false;
    }
  }

  /**
   * Carrega dados de gamificação (badges, streaks, etc.)
   * @returns {Object} Objeto com totalQuizzes, bestScore, currentStreak, badges
   *
   * @example
   * const gamification = storageManager.getGamification();
   * // Retorna: { totalQuizzes: 10, bestScore: 85, currentStreak: 3, badges: ['perfect'] }
   */
  getGamification() {
    const fallback = {
      totalQuizzes: 0,
      bestScore: 0,
      currentStreak: 0,
      lastDate: "",
      badges: [],
      completedStages: [],
      unlockedStages: [],
    };

    try {
      const gamificationKey = this._getKey("gamification");
      const data = localStorage.getItem(gamificationKey);

      if (!data) {
        return this._mergeGamificationWithHistory(fallback);
      }

      const parsed = JSON.parse(data);
      return this._mergeGamificationWithHistory({
        totalQuizzes: parsed.totalQuizzes || 0,
        bestScore: parsed.bestScore || 0,
        currentStreak: parsed.currentStreak || 0,
        lastDate: parsed.lastDate || "",
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        completedStages: Array.isArray(parsed.completedStages)
          ? parsed.completedStages
          : [],
        unlockedStages: Array.isArray(parsed.unlockedStages)
          ? parsed.unlockedStages
          : [],
        labsCompleted: parsed.labsCompleted || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar gamificação:", error);
      return this._mergeGamificationWithHistory(fallback);
    }
  }

  /**
   * Atualiza dados de gamificação com base no resultado do quiz
   * @param {number} percentage - Percentual de acerto do quiz
   * @returns {Object|null} Objeto de gamificação atualizado ou null em caso de erro
   *
   * @example
   * const gamification = storageManager.updateGamification(85);
   * // Retorna objeto atualizado com novos badges e estatísticas
   */
  updateGamification(percentage) {
    try {
      const gamification = this.getGamification();
      const today = new Date().toISOString().split("T")[0];

      const historyQuizCount = this.getCompletedQuizCount();
      if (
        historyQuizCount === 0 ||
        gamification.totalQuizzes < historyQuizCount
      ) {
        gamification.totalQuizzes += 1;
      }

      if (percentage > gamification.bestScore) {
        gamification.bestScore = percentage;
      }

      // Atualiza streak
      if (percentage >= 70) {
        if (gamification.lastDate !== today) {
          gamification.currentStreak += 1;
          gamification.lastDate = today;
        }
      } else {
        gamification.currentStreak = 0;
      }

      // Adiciona badges baseado em conquistas
      if (percentage === 100 && !gamification.badges.includes("perfect")) {
        gamification.badges.push("perfect");
      }

      if (
        gamification.totalQuizzes >= 10 &&
        !gamification.badges.includes("dedicated")
      ) {
        gamification.badges.push("dedicated");
      }

      if (
        gamification.currentStreak >= 5 &&
        !gamification.badges.includes("streak")
      ) {
        gamification.badges.push("streak");
      }

      const gamificationKey = this._getKey("gamification");
      localStorage.setItem(gamificationKey, JSON.stringify(gamification));

      return gamification;
    } catch (error) {
      console.error("Erro ao atualizar gamificação:", error);
      return null;
    }
  }

  /**
   * Persiste o objeto de gamificação completo no localStorage.
   * Usado por módulos externos (trailManager, interactiveEngine) que precisam
   * escrever o estado de gamificação directamente, sem passar pelo updateGamification.
   *
   * @param {Object} gamification - Objecto de gamificação a persistir
   * @param {number}   gamification.totalQuizzes    - Total de simulados realizados
   * @param {number}   gamification.bestScore       - Melhor pontuação registada (%)
   * @param {number}   gamification.currentStreak   - Ofensiva actual (dias consecutivos)
   * @param {string}   gamification.lastDate        - Data do último simulado (YYYY-MM-DD)
   * @param {string[]} gamification.badges          - IDs das insígnias desbloqueadas
   * @param {string[]} [gamification.completedStages] - IDs dos módulos da trilha concluídos
   * @param {string[]} [gamification.unlockedStages]  - IDs dos módulos da trilha desbloqueados
   * @param {number}   [gamification.labsCompleted]   - Total de labs interactivos concluídos
   * @returns {boolean} True se persistiu com sucesso, False em caso de erro
   *
   * @example
   * const gam = storageManager.getGamification();
   * gam.completedStages.push('clf-1');
   * storageManager.saveGamification(gam);
   */
  saveGamification(gamification) {
    try {
      const key = this._getKey("gamification");
      localStorage.setItem(key, JSON.stringify(gamification));
      return true;
    } catch (error) {
      console.error("Erro ao salvar gamificação:", error);
      return false;
    }
  }

  /**
   * Recalcula os campos de gamificação derivados do histórico restante.
   * Preserva badges e estados que não são derivados de sessões concluídas.
   *
   * @returns {Object|null} Gamificação recalculada ou null em caso de erro
   */
  recalculateGamificationFromHistory() {
    try {
      const current = this.getGamification();
      const sessions = this._getUniqueCompletedSessions();
      const derived = this._deriveGamificationFromSessions(sessions);
      const historyBadgeIds = new Set(["perfect", "dedicated", "streak"]);
      const preservedBadges = Array.isArray(current.badges)
        ? current.badges.filter((badgeId) => !historyBadgeIds.has(badgeId))
        : [];

      const gamification = {
        ...current,
        totalQuizzes: derived.totalQuizzes,
        bestScore: derived.bestScore,
        currentStreak: derived.currentStreak,
        lastDate: derived.lastDate,
        badges: [...new Set([...preservedBadges, ...derived.badges])],
      };

      this.saveGamification(gamification);
      return gamification;
    } catch (error) {
      console.error("Erro ao recalcular gamificação pelo histórico:", error);
      return null;
    }
  }

  /**
   * Salva uma sessão de foco concluída no log de séries temporais
   * @param {number} minutes - Quantidade de minutos focados
   * @param {string} type - Tipo da sessão ('work', 'shortBreak', 'longBreak')
   */
  saveFocusSession(minutes, type = "work") {
    try {
      const key = this._getKey("focus_log"); // Gera a chave 'aws_sim_focus_log'
      const history = this.getFocusHistory();

      const newEntry = {
        date: new Date().toISOString().split("T")[0], // Formato 'YYYY-MM-DD'
        timestamp: new Date().toISOString(),
        minutes: minutes,
        type: type,
      };

      history.push(newEntry);
      localStorage.setItem(key, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error("Erro ao salvar sessão de foco:", error);
      return false;
    }
  }

  /**
   * Recupera todo o histórico de logs de foco
   * @returns {Array} Lista de sessões de foco
   */
  getFocusHistory() {
    try {
      const key = this._getKey("focus_log");
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Erro ao carregar histórico de foco:", error);
      return [];
    }
  }

  /**
   * Calcula o total de minutos focados (Útil para o seu perfil analítico)
   * @returns {number} Total de minutos
   */
  getTotalFocusMinutes() {
    const history = this.getFocusHistory();
    return history
      .filter((session) => session.type === "work")
      .reduce((total, session) => total + session.minutes, 0);
  }

  /**
   * Limpa apenas o histórico de foco
   */
  clearFocusHistory() {
    try {
      localStorage.removeItem(this._getKey("focus_log"));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpa todos os dados do simulador
   * @returns {boolean} True se limpou com sucesso, False caso contrário
   *
   * @example
   * storageManager.clearAll();
   * // Remove todos os dados com prefixo 'aws_sim_'
   */
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error("Erro ao limpar todos os dados:", error);
      return false;
    }
  }

  /**
   * Exporta todos os dados para backup
   * @returns {Object} Objeto com todos os dados
   *
   * @example
   * const backup = storageManager.exportData();
   * const json = JSON.stringify(backup);
   * // Salvar json em arquivo para backup
   */
  exportData() {
    try {
      const data = {};
      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          data[key] = localStorage.getItem(key);
        }
      });

      return data;
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      return {};
    }
  }

  /**
   * Importa dados de backup
   * @param {Object} data - Objeto com dados para importar
   * @returns {boolean} True se importou com sucesso, False caso contrário
   *
   * @example
   * const backup = { 'aws_sim_history': '[...]', ... };
   * storageManager.importData(backup);
   */
  importData(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith(this.prefix)) {
          localStorage.setItem(key, value);
        }
      });
      return true;
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      return false;
    }
  }
}

// Exporta instância singleton para uso no app
export const storageManager = new StorageManager("aws_sim_");
