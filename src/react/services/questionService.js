/**
 * questionService — operações sobre questões e simulados
 *
 * Abstrai a comunicação com o backend /api/questions e mantém
 * compatibilidade com o comportamento do vanilla JS existente.
 *
 * Nenhum componente deve importar este módulo diretamente —
 * use hooks (ex: useQuestions) que encapsulam estado de loading/error.
 */

import { api } from './api.js';
import { storageGet, storageSet } from './storageService.js';

const CACHE_KEY = 'questions_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCacheValid(cached) {
  if (!cached?.timestamp) return false;
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

// ── Questões ─────────────────────────────────────────────────────────────────

/**
 * Busca todas as questões disponíveis.
 * Usa cache em memória/localStorage para evitar roundtrips desnecessários.
 *
 * @param {{ forceRefresh?: boolean }} options
 * @returns {Promise<Question[]>}
 */
export async function fetchQuestions({ forceRefresh = false } = {}) {
  const cached = storageGet(CACHE_KEY);

  if (!forceRefresh && isCacheValid(cached)) {
    return cached.data;
  }

  const data = await api.get('/questions');

  storageSet(CACHE_KEY, { data, timestamp: Date.now() });

  return data;
}

/**
 * Busca questões filtradas por certificação e/ou domínio.
 *
 * @param {{ certification?: string, domain?: string, limit?: number }} filters
 * @returns {Promise<Question[]>}
 */
export async function fetchFilteredQuestions({
  certification,
  domain,
  limit,
} = {}) {
  const params = new URLSearchParams();
  if (certification) params.set('certification', certification);
  if (domain) params.set('domain', domain);
  if (limit) params.set('limit', String(limit));

  const query = params.toString() ? `?${params}` : '';
  return api.get(`/questions${query}`);
}

/**
 * Busca uma questão por ID.
 *
 * @param {string|number} id
 * @returns {Promise<Question>}
 */
export async function fetchQuestionById(id) {
  return api.get(`/questions/${id}`);
}

// ── Progresso ─────────────────────────────────────────────────────────────────

const PROGRESS_KEY = 'progress';

/**
 * Retorna o progresso salvo do usuário (leitura local).
 * @returns {{ answered: number[], correct: number[], incorrect: number[] }}
 */
export function getLocalProgress() {
  return storageGet(PROGRESS_KEY, {
    answered: [],
    correct: [],
    incorrect: [],
  });
}

/**
 * Salva o progresso localmente após resposta.
 *
 * @param {string|number} questionId
 * @param {boolean}       isCorrect
 */
export function saveQuestionResult(questionId, isCorrect) {
  const progress = getLocalProgress();

  if (!progress.answered.includes(questionId)) {
    progress.answered.push(questionId);
  }

  if (isCorrect) {
    if (!progress.correct.includes(questionId)) progress.correct.push(questionId);
  } else {
    if (!progress.incorrect.includes(questionId)) progress.incorrect.push(questionId);
  }

  storageSet(PROGRESS_KEY, progress);
  return progress;
}

/**
 * Limpa o progresso local do usuário.
 */
export function clearLocalProgress() {
  storageSet(PROGRESS_KEY, { answered: [], correct: [], incorrect: [] });
}

/**
 * @typedef {Object} Question
 * @property {string|number} id
 * @property {string}        text
 * @property {string[]}      options
 * @property {number}        answer      - índice da resposta correta
 * @property {string}        domain
 * @property {string}        certification
 * @property {string}        [explanation]
 */
