/**
 * questionService — operações sobre questões
 */

import { api } from './api.js';

/**
 * Busca todas as questões disponíveis.
 * @returns {Promise<Question[]>}
 */
export async function fetchQuestions() {
  return api.get('/questions');
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
