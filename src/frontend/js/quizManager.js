import { logger } from "./utils/logger.js";
/**
 * Quiz Manager
 * Handles communication between frontend quiz engine and backend API
 * Manages quiz lifecycle: start, answer recording, and result fetching
 *
 * @module quizManager
 */

import apiService from "./services/api.js";
import { normalizeCertificationId } from "./utils/certUtils.js";
import { storageManager } from "./storageManager.js";

/**
 * Quiz Manager Object
 * Provides methods for quiz lifecycle management
 */
export const quizManager = {
  currentQuizId: null,
  currentUserId: null,
  isAPIAvailable: true,

  /**
   * Initialize quiz manager with user ID
   *
   * @param {string} userId - Current user ID
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(userId) {
    this.currentUserId = userId;

    // Check API availability
    try {
      this.isAPIAvailable = await apiService.isAvailable();
      if (this.isAPIAvailable) {
        logger.info("✓ API is available");
      } else {
        logger.warn("⚠ API is unavailable, will use local fallback");
      }
    } catch (error) {
      logger.warn("⚠ Could not check API availability:", error);
      this.isAPIAvailable = false;
    }

    return true;
  },

  /**
   * Start a new quiz session
   *
   * @param {string} certId - Certification ID
   * @param {number} numQuestions - Number of questions
   * @returns {Promise<object>} { quizId, questions, totalQuestions }
   */
  async startQuiz(
    certId,
    numQuestions = 10,
    locale = "pt",
    mode = "exam",
    filters = {},
  ) {
    certId = normalizeCertificationId(certId);
    try {
      if (
        mode !== "mistakes-review" &&
        this.isAPIAvailable &&
        this.currentUserId
      ) {
        try {
          const response = await apiService.startQuiz({
            user_id: this.currentUserId,
            certification: certId,
            num_questions: numQuestions,
            locale: locale,
            difficulty: filters.difficulty,
            domain: filters.topic || filters.domain,
          });

          if (response.success && response.data) {
            this.currentQuizId = response.data.quiz_id;
            logger.info(`✓ Quiz started on backend: ${this.currentQuizId}`);

            return {
              quizId: response.data.quiz_id,
              questions: response.data.questions || [],
              totalQuestions: response.data.total_questions || numQuestions,
              fromAPI: true,
            };
          }
        } catch (apiError) {
          logger.warn(
            "Failed to start quiz on API, using local mode:",
            apiError,
          );
        }
      }

      // Local fallback mode (quiz will be stored locally only)
      const localQuizId = this._generateLocalQuizId();
      this.currentQuizId = localQuizId;
      logger.info(`✓ Quiz started in local mode: ${localQuizId}`);

      return {
        quizId: localQuizId,
        questions: [],
        totalQuestions: numQuestions,
        fromAPI: false,
      };
    } catch (error) {
      logger.error("Fatal error starting quiz:", error);
      throw error;
    }
  },

  /**
   * Record an answer for the current quiz
   *
   * @param {object} options - Answer data
   * @param {string} options.question_id - Question ID
   * @param {number|array} options.user_answer - Selected answer(s)
   * @param {boolean} [options.is_correct] - Whether answer was correct
   * @param {number} [options.time_secs] - Time spent on question
   *
   * @returns {Promise<boolean>} True if recorded successfully
   */
  async recordAnswer(options = {}) {
    try {
      const quizId = this.currentQuizId;
      // Always save to local storage for redundancy
      const localRecord = {
        quiz_id: quizId,
        question_id: options.question_id,
        user_answer: options.user_answer,
        is_correct: options.is_correct || false,
        time_secs: options.time_secs || 0,
        timestamp: new Date().toISOString(),
        synced: false,
        syncedAt: null,
      };

      // Try to save locally first (always works)
      this._saveAnswerLocally(localRecord);

      // Try to send to API if available
      if (this.isAPIAvailable && quizId && !quizId.startsWith("local_")) {
        try {
          await apiService.recordAnswer({
            quiz_id: quizId,
            question_id: options.question_id,
            user_answer: options.user_answer,
            time_secs: options.time_secs,
          });
          this._markAnswerSynced(quizId, options.question_id);
          logger.info(
            `✓ Answer recorded on backend for Q${options.question_id}`,
          );
        } catch (apiError) {
          logger.warn(`⚠ Failed to record answer on API: ${apiError.message}`);
          // Local backup preserves the answer; synced flag enables future retry
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error("Error recording answer:", error);
      return false;
    }
  },

  /** Online correction is acknowledged by the server before local UI state advances. */
  async submitAuthoritativeAnswer(options = {}) {
    const quizId = this.currentQuizId;
    if (!quizId || quizId.startsWith("local_") || !this.isAPIAvailable) {
      throw new Error("No active online quiz is available for correction");
    }
    const response = await apiService.recordAnswer({
      quiz_id: quizId,
      question_id: options.question_id,
      user_answer: options.user_answer,
      time_secs: options.time_secs || 0,
    });
    if (!response.success || typeof response.data?.is_correct !== "boolean") {
      throw new Error("The server did not return a valid answer result");
    }
    this._saveAnswerLocally({
      quiz_id: quizId,
      question_id: options.question_id,
      user_answer: options.user_answer,
      is_correct: response.data.is_correct,
      time_secs: options.time_secs || 0,
      timestamp: new Date().toISOString(),
      synced: true,
      syncedAt: new Date().toISOString(),
    });
    return response.data;
  },

  async getRemoteQuiz(quizId) {
    if (!this.isAPIAvailable || !quizId || quizId.startsWith("local_"))
      return null;
    const response = await apiService.getQuiz(quizId);
    return response.success ? response.data : null;
  },

  /** Retry answers whose acknowledgement may have been lost on refresh. */
  async syncPendingAnswers(quizId = this.currentQuizId) {
    if (!this.isAPIAvailable || !quizId || quizId.startsWith("local_")) {
      return false;
    }

    const prefix = storageManager.getUserScopedKey(`ans_${quizId}_`);
    const pending = [];
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(prefix)) continue;
        const record = JSON.parse(localStorage.getItem(key));
        if (record && !record.synced && record.question_id)
          pending.push(record);
      }
    } catch (error) {
      logger.warn("Could not inspect pending quiz answers:", error);
      return false;
    }

    const results = await Promise.all(
      pending.map(async (record) => {
        try {
          await apiService.recordAnswer({
            quiz_id: quizId,
            question_id: record.question_id,
            user_answer: record.user_answer,
            time_secs: record.time_secs,
          });
          this._markAnswerSynced(quizId, record.question_id);
          return true;
        } catch (error) {
          logger.warn("Pending quiz answer remains local:", error);
          return false;
        }
      }),
    );

    return results.every(Boolean);
  },

  /** Complete a remote attempt without preventing local-only completion. */
  async finishQuiz() {
    const quizId = this.currentQuizId;
    if (!this.isAPIAvailable || !quizId || quizId.startsWith("local_")) {
      return null;
    }

    if (!(await this.syncPendingAnswers(quizId))) {
      logger.warn(
        "Remote quiz remains started because answers are not synchronized",
      );
      return null;
    }

    try {
      const response = await apiService.finishQuiz(quizId);
      return response.success ? response.data : null;
    } catch (error) {
      logger.warn(
        "Remote quiz remains started; local result is preserved:",
        error,
      );
      return null;
    }
  },

  /** Abandon a remote attempt after the user explicitly discards it. */
  async abandonQuiz(quizId) {
    if (!this.isAPIAvailable || !quizId || quizId.startsWith("local_")) {
      return null;
    }
    try {
      const response = await apiService.abandonQuiz(quizId);
      return response.success ? response.data : null;
    } catch (error) {
      logger.warn("Could not abandon remote quiz; it remains started:", error);
      return null;
    }
  },

  /**
   * Get quiz results
   *
   * @returns {Promise<object>} Quiz results or null if not found
   */
  async getQuizResults() {
    try {
      if (
        this.isAPIAvailable &&
        this.currentQuizId &&
        !this.currentQuizId.startsWith("local_")
      ) {
        try {
          const response = await apiService.getQuizResults(this.currentQuizId);

          if (response.success && response.data) {
            logger.info(`✓ Retrieved quiz results from API`);
            return response.data;
          }
        } catch (apiError) {
          logger.warn("Failed to get results from API:", apiError);
        }
      }

      // Fallback to local results
      const localResults = this._getLocalResults();
      if (localResults) {
        logger.info(`✓ Using locally calculated results`);
        return localResults;
      }

      return null;
    } catch (error) {
      logger.error("Error getting quiz results:", error);
      return null;
    }
  },

  /**
   * Save answer to local storage atomically
   * @private
   */
  _saveAnswerLocally(record) {
    try {
      const key = storageManager.getUserScopedKey(
        `ans_${record.quiz_id || this.currentQuizId}_${record.question_id}`,
      );
      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      logger.error("Error saving answer locally:", error);
    }
  },

  /**
   * Marca uma resposta como sincronizada no backend (Atomic)
   * @private
   */
  _markAnswerSynced(quizId, questionId) {
    try {
      const key = storageManager.getUserScopedKey(
        `ans_${quizId}_${questionId}`,
      );
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.synced = true;
        parsed.syncedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {
      // não-crítico
    }
  },

  /**
   * Get locally stored results
   * @private
   */
  _getLocalResults() {
    try {
      const prefix = storageManager.getUserScopedKey(
        `ans_${this.currentQuizId}_`,
      );
      const answers = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            answers.push(JSON.parse(localStorage.getItem(key)));
          } catch {
            // Ignore malformed local answer records.
          }
        }
      }

      if (answers.length === 0) return null;

      const correct = answers.filter((a) => a.is_correct).length;
      const total = answers.length;

      return {
        quiz_id: this.currentQuizId,
        total_questions: total,
        score: correct,
        correct_answers: correct,
        incorrect_answers: total - correct,
        percentage: (correct / total) * 100,
        time_spent_secs: answers.reduce(
          (sum, a) => sum + (a.time_secs || 0),
          0,
        ),
      };
    } catch (error) {
      logger.error("Error getting local results:", error);
      return null;
    }
  },

  /**
   * Generate a local quiz ID (when API is unavailable)
   * @private
   */
  _generateLocalQuizId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `local_quiz_${timestamp}_${random}`;
  },

  /**
   * Clear current quiz session
   */
  clearCurrentQuiz() {
    this.currentQuizId = null;
  },
};

export default quizManager;
