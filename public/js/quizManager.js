/**
 * Quiz Manager
 * Handles communication between frontend quiz engine and backend API
 * Manages quiz lifecycle: start, answer recording, and result fetching
 *
 * @module quizManager
 */

import apiService from "../services/api.js";

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
        console.log("✓ API is available");
      } else {
        console.warn("⚠ API is unavailable, will use local fallback");
      }
    } catch (error) {
      console.warn("⚠ Could not check API availability:", error);
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
  async startQuiz(certId, numQuestions = 10) {
    try {
      if (this.isAPIAvailable && this.currentUserId) {
        try {
          const response = await apiService.startQuiz({
            user_id: this.currentUserId,
            certification: certId,
            num_questions: numQuestions,
          });

          if (response.success && response.data) {
            this.currentQuizId = response.data.quiz_id;
            console.log(`✓ Quiz started on backend: ${this.currentQuizId}`);

            return {
              quizId: response.data.quiz_id,
              questions: response.data.questions || [],
              totalQuestions: response.data.total_questions || numQuestions,
              fromAPI: true,
            };
          }
        } catch (apiError) {
          console.warn(
            "Failed to start quiz on API, using local mode:",
            apiError,
          );
        }
      }

      // Local fallback mode (quiz will be stored locally only)
      const localQuizId = this._generateLocalQuizId();
      this.currentQuizId = localQuizId;
      console.log(`✓ Quiz started in local mode: ${localQuizId}`);

      return {
        quizId: localQuizId,
        questions: [],
        totalQuestions: numQuestions,
        fromAPI: false,
      };
    } catch (error) {
      console.error("Fatal error starting quiz:", error);
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
      // Always save to local storage for redundancy
      const localRecord = {
        quiz_id: this.currentQuizId,
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
      if (
        this.isAPIAvailable &&
        this.currentQuizId &&
        !this.currentQuizId.startsWith("local_")
      ) {
        try {
          await apiService.recordAnswer({
            quiz_id: this.currentQuizId,
            question_id: options.question_id,
            user_answer: options.user_answer,
            is_correct: options.is_correct,
            time_secs: options.time_secs,
          });
          this._markAnswerSynced(this.currentQuizId, options.question_id);
          console.log(
            `✓ Answer recorded on backend for Q${options.question_id}`,
          );
        } catch (apiError) {
          console.warn(
            `⚠ Failed to record answer on API: ${apiError.message}`,
          );
          // Local backup preserves the answer; synced flag enables future retry
        }
      }

      return true;
    } catch (error) {
      console.error("Error recording answer:", error);
      return false;
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
            console.log(`✓ Retrieved quiz results from API`);
            return response.data;
          }
        } catch (apiError) {
          console.warn("Failed to get results from API:", apiError);
        }
      }

      // Fallback to local results
      const localResults = this._getLocalResults();
      if (localResults) {
        console.log(`✓ Using locally calculated results`);
        return localResults;
      }

      return null;
    } catch (error) {
      console.error("Error getting quiz results:", error);
      return null;
    }
  },

  /**
   * Save answer to local storage
   * @private
   */
  _saveAnswerLocally(record) {
    try {
      const key = `aws_sim_quiz_answers_${this.currentQuizId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(record);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error("Error saving answer locally:", error);
    }
  },

  /**
   * Marca uma resposta como sincronizada no backend.
   * Busca do final do array (resposta mais recente com o question_id).
   * @private
   */
  _markAnswerSynced(quizId, questionId) {
    try {
      const key = `aws_sim_quiz_answers_${quizId}`;
      const answers = JSON.parse(localStorage.getItem(key) || "[]");
      for (let i = answers.length - 1; i >= 0; i--) {
        if (answers[i].question_id === questionId && !answers[i].synced) {
          answers[i].synced = true;
          answers[i].syncedAt = new Date().toISOString();
          break;
        }
      }
      localStorage.setItem(key, JSON.stringify(answers));
    } catch (e) {
      // não-crítico — falha no status de sync não afeta o fluxo do quiz
    }
  },

  /**
   * Get locally stored results
   * @private
   */
  _getLocalResults() {
    try {
      const key = `aws_sim_quiz_answers_${this.currentQuizId}`;
      const answers = JSON.parse(localStorage.getItem(key) || "[]");

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
      console.error("Error getting local results:", error);
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
