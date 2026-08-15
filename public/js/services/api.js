import { logger } from "../utils/logger.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { SessionManager } from "../core/sessionManager.js";
/**
 * API Service Layer
 * Centralized HTTP client for all backend API calls
 * 
 * This service encapsulates all fetch calls to the REST API,
 * providing a single source of truth for API configuration,
 * error handling, and response parsing.
 * 
 * @module api
 * @author AWS Exam Simulator Team
 */

/**
 * Base configuration for the API service
 */
function getConfiguredApiUrl() {
  if (typeof window !== 'undefined' && window.sessionStorage?.getItem('force_offline') === 'true') {
    return '';
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    if (hostname.endsWith('github.io')) return '';
  }

  return 'http://localhost:3001';
}

const API_CONFIG = {
  // GitHub Pages is static; avoid calling the visitor's own localhost in production.
  BASE_URL: getConfiguredApiUrl(),
  // Timeout aumentado para 8s: PGlite em /mnt/c (WSL) pode levar 5-8s
  // para inicializar. Operações de escrita (login, quiz) também são mais lentas.
  TIMEOUT: 8000,
  RETRY_ATTEMPTS: 1,
};

/**
 * Creates structured error objects for consistent error handling
 * @private
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} details - Additional error details
 * @returns {object} Structured error object
 */
function createError(message, statusCode = 0, details = {}) {
  // Garantir que details nunca seja null — evita TypeError ao acessar details.apiDisabled
  const safeDetails = details !== null && details !== undefined ? details : {};
  return {
    message,
    statusCode,
    details: safeDetails,
    apiDisabled: Boolean(safeDetails.apiDisabled),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Normalizes successful API responses without changing direct payloads.
 * @private
 * @param {*} body - Parsed response body
 * @param {number} status - HTTP status code
 * @returns {object} Stable client response
 */
function normalizeResponse(body, status) {
  const isEnvelope = (
    body !== null
    && typeof body === 'object'
    && !Array.isArray(body)
    && Object.prototype.hasOwnProperty.call(body, 'success')
    && Object.prototype.hasOwnProperty.call(body, 'data')
  );

  if (!isEnvelope) {
    return {
      success: body?.success !== false,
      status,
      data: body,
    };
  }

  const { data, ...metadata } = body;

  return {
    ...metadata,
    success: metadata.success !== false,
    status,
    data,
    meta: metadata,
  };
}

/**
 * Makes a fetch request with error handling and retry logic
 * @private
 * @param {string} endpoint - API endpoint (relative to BASE_URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed response or error
 */
async function fetchWithRetry(endpoint, options = {}) {
  if (!API_CONFIG.BASE_URL) {
    throw createError('API disabled for static deployment', 0, {
      apiDisabled: true,
      endpoint,
    });
  }

  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const { timeout = API_CONFIG.TIMEOUT, ...fetchOptions } = options;
  
  // Default options
  const requestOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...getSessionHeaders(),
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  };

  let lastError = null;

  // Retry loop
  for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // Handle HTTP errors
      if (!response.ok) {
        const errorMessage = data?.message || `HTTP ${response.status}`;
        lastError = createError(errorMessage, response.status, data ?? {});
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          SessionManager.logout();
        }
        
        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }
        
        // Retry on server errors (5xx)
        if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return normalizeResponse(data, response.status);

    } catch (error) {
      // Network error or timeout
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = createError('Request timeout', 0, { originalError: error.message });
      } else if (error.message || error.statusCode) {
        // Our structured error
        lastError = error;
      } else {
        // Network error
        lastError = createError('Network error', 0, { originalError: error.message });
      }

      // Retry on network errors
      if (attempt === API_CONFIG.RETRY_ATTEMPTS) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError || createError('Unknown error');
}

function getSessionHeaders() {
  try {
    const token = SessionManager.restore()?.accessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * API Service Object
 * Provides methods for all backend endpoints
 */
export const apiService = {
  /**
   * Check API health
   * GET /api/health
   * @returns {Promise<object>} Health status
   */
  async checkHealth() {
    try {
      const response = await fetchWithRetry('/api/health');
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Health check failed:', error);
      throw error;
    }
  },

  // ========================================================================
  // QUESTIONS ENDPOINTS
  // ========================================================================

  /**
   * Load questions with optional filters
   * GET /api/questions
   * 
   * @param {object} options - Query parameters
   * @param {string} [options.certification] - Filter by certification ID
   * @param {string} [options.domain] - Filter by domain
   * @param {string} [options.difficulty] - Filter by difficulty (easy/medium/hard)
   * @param {number} [options.limit] - Max number of questions (default: 10)
   * @param {number} [options.offset] - Pagination offset (default: 0)
   * @param {string} [options.search] - Search term
   * 
   * @returns {Promise<object>} { success, data: [], count, pagination }
   */
  async loadQuestions(options = {}) {
    if (options.certification) {
      options.certification = normalizeCertificationId(options.certification);
    }
    try {
      const params = new URLSearchParams();
      
      if (options.certification) params.append('certification', options.certification);
      if (options.domain) params.append('domain', options.domain);
      if (options.difficulty) params.append('difficulty', options.difficulty);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.search) params.append('search', options.search);
      if (options.locale) params.append('locale', options.locale);
      if (options.language) params.append('language', options.language);

      const response = await fetchWithRetry(`/api/questions?${params}`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to load questions:', error);
      throw error;
    }
  },

  /**
   * Get single question by ID
   * GET /api/questions/:id
   * 
   * @param {string} questionId - Question ID
   * @returns {Promise<object>} { success, data }
   */
  async getQuestion(questionId) {
    try {
      const response = await fetchWithRetry(`/api/questions/${questionId}`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get question:', error);
      throw error;
    }
  },

  // ========================================================================
  // USER ENDPOINTS
  // ========================================================================

  /**
   * Login corporativo — POST /api/auth/login
   * Cria usuário como STUDENT se não existir, retorna existente se já houver.
   *
   * @param {object} options
   * @param {string} options.email - Email @a3data
   * @param {string} [options.full_name]
   * @param {string} [options.nickname]
   * @returns {Promise<object>} { success, data: { id, email, nickname, role, ... }, created }
   */
  async loginUser(options = {}) {
    try {
      const response = await fetchWithRetry('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: options.email,
          full_name: options.full_name || undefined,
          nickname: options.nickname || undefined,
        }),
      });
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Retorna o perfil do usuário autenticado — GET /api/auth/me
   * Envia o user_id via header X-User-Id.
   *
   * @param {string} userId - UUID do usuário
   * @returns {Promise<object>} { success, data: { id, email, nickname, role, ... } }
   */
  async getMe(_userId) {
    try {
      const response = await fetchWithRetry('/api/auth/me', {
      });
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('getMe failed:', error);
      throw error;
    }
  },

  async getMyProfile() {
    return fetchWithRetry('/api/me/profile');
  },

  async updateMyProfile(payload = {}) {
    return fetchWithRetry('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getModuleState(module, certification = null) {
    const query = certification ? `?certification=${encodeURIComponent(certification)}` : '';
    return fetchWithRetry(`/api/me/state/${encodeURIComponent(module)}${query}`);
  },

  async saveModuleState(module, certification, state, version = null) {
    return fetchWithRetry(`/api/me/state/${encodeURIComponent(module)}`, {
      method: 'PUT',
      body: JSON.stringify({ certification, state, ...(version === null ? {} : { version }) }),
    });
  },

  async createValidatorRequest(payload) {
    return fetchWithRetry('/api/access/validator-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getValidatorRequests() {
    return fetchWithRetry('/api/access/validator-requests');
  },

  /**
   * Create anonymous user (mantido para compatibilidade com testes legados)
   * POST /api/users
   *
   * @param {object} options
   * @param {string} [options.anonymous_name]
   * @returns {Promise<object>} { success, data: { id, anonymous_name, created_at } }
   */
  async createUser(options = {}) {
    try {
      const payload = {
        anonymous_name: options.anonymous_name || undefined,
      };

      const response = await fetchWithRetry('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to create user:', error);
      throw error;
    }
  },

  /**
   * Get user statistics
   * GET /api/users/:id/stats
   * 
   * @param {string} userId - User ID
   * @returns {Promise<object>} { success, data: { total_quizzes, avg_score, ... } }
   */
  async getUserStats(userId) {
    try {
      const response = await fetchWithRetry(`/api/users/${userId}/stats`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get user stats:', error);
      throw error;
    }
  },

  /**
   * Get user's weak domains
   * GET /api/users/:id/weak-domains
   * 
   * @param {string} userId - User ID
   * @param {number} threshold - Accuracy threshold in % (default: 70)
   * 
   * @returns {Promise<object>} { success, data: { weak_domains: [] } }
   */
  async getWeakDomains(userId, threshold = 70) {
    try {
      const response = await fetchWithRetry(`/api/users/${userId}/weak-domains?threshold=${threshold}`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get weak domains:', error);
      throw error;
    }
  },

  // ========================================================================
  // QUIZ ENDPOINTS
  // ========================================================================

  /**
   * Start new quiz session
   * POST /api/quiz/start
   * 
   * @param {object} options - Quiz configuration
   * @param {string} options.certification - Certification ID (e.g., 'clf-c02')
   * @param {number} [options.num_questions] - Number of questions (default: 10)
   * 
   * @returns {Promise<object>} { success, data: { quiz_id, questions: [], total_questions } }
   */
  async startQuiz(options = {}) {
    if (options.certification) {
      options.certification = normalizeCertificationId(options.certification);
    }
    try {
      if (!options.certification) {
        throw createError('certification is required', 400);
      }

      const payload = {
        certification: options.certification,
        num_questions: options.num_questions || 10,
        language: options.language || options.locale || 'pt',
      };

      const response = await fetchWithRetry('/api/quiz/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to start quiz:', error);
      throw error;
    }
  },

  /**
   * Record answer for quiz question
   * POST /api/quiz/:id/answer
   * 
   * @param {object} options - Answer data
   * @param {string} options.quiz_id - Quiz ID
   * @param {string} options.question_id - Question ID
   * @param {array|string} options.user_answer - User's answer (index or array of indices)
   * @param {number} [options.time_secs] - Time spent on question in seconds
   * 
   * @returns {Promise<object>} { success, data: { answer_id } }
   */
  async recordAnswer(options = {}) {
    try {
      if (!options.quiz_id || !options.question_id || options.user_answer === undefined) {
        throw createError('quiz_id, question_id, and user_answer are required', 400);
      }

      const payload = {
        question_id: options.question_id,
        user_answer: options.user_answer,
        time_secs: options.time_secs || 0,
      };

      const response = await fetchWithRetry(`/api/quiz/${options.quiz_id}/answer`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to record answer:', error);
      throw error;
    }
  },

  /**
   * Get quiz results
   * GET /api/quiz/:id/results
   * 
   * @param {string} quizId - Quiz ID
   * @returns {Promise<object>} { success, data: { total_questions, score, percentage, ... } }
   */
  async getQuizResults(quizId) {
    try {
      const response = await fetchWithRetry(`/api/quiz/${quizId}/results`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get quiz results:', error);
      throw error;
    }
  },

  /**
   * Get quiz details
   * GET /api/quiz/:id
   * 
   * @param {string} quizId - Quiz ID
   * @returns {Promise<object>} { success, data }
   */
  async getQuiz(quizId) {
    try {
      const response = await fetchWithRetry(`/api/quiz/${quizId}`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get quiz:', error);
      throw error;
    }
  },

  // ========================================================================
  // CASES & SERVICES ENDPOINTS
  // ========================================================================

  async getCases(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.certification) params.append('certification', filters.certification);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const qs = params.toString() ? `?${params.toString()}` : '';
      return await fetchWithRetry(`/api/cases${qs}`);
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get cases:', error);
      throw error;
    }
  },

  async getCaseById(idOrSlug) {
    try {
      return await fetchWithRetry(`/api/cases/${encodeURIComponent(idOrSlug)}`);
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get case:', error);
      throw error;
    }
  },

  async markCaseComplete(caseId, _userId) {
    try {
      return await fetchWithRetry(`/api/cases/${encodeURIComponent(caseId)}/complete`, {
        method: 'POST',
      });
    } catch (error) {
      logger.error('Failed to mark case complete:', error);
      throw error;
    }
  },

  async getAwsServices(category) {
    try {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return await fetchWithRetry(`/api/services${qs}`);
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get services:', error);
      throw error;
    }
  },

  // ========================================================================
  // LEADERBOARD ENDPOINTS
  // ========================================================================

  /**
   * Get leaderboard
   * GET /api/leaderboard
   * 
   * @param {number} [limit] - Number of entries (default: 100)
   * @returns {Promise<object>} { success, data: [], count }
   */
  async getLeaderboard(limit = 100) {
    try {
      const response = await fetchWithRetry(`/api/leaderboard?limit=${limit}`);
      return response;
    } catch (error) {
      if (!error || !error.apiDisabled) logger.error('Failed to get leaderboard:', error);
      throw error;
    }
  },

  /**
   * Check if API is available
   * Useful for determining fallback behavior
   * 
   * @returns {Promise<boolean>} True if API is reachable
   */
  async isAvailable() {
    if (!API_CONFIG.BASE_URL) return false;

    try {
      const response = await fetchWithRetry('/api/health', {
        // Timeout mais generoso para o health check: PGlite em WSL pode
        // levar alguns segundos para responder logo após inicializar.
        timeout: 5000,
      });
      return response.success;
    } catch {
      return false;
    }
  },
};

// Export singleton
export default apiService;
