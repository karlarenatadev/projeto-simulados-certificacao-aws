/**
 * api — cliente HTTP centralizado
 *
 * Camada entre componentes React e o backend Express.
 * Nenhum componente deve chamar fetch() diretamente.
 *
 * Base URL: /api (proxied pelo Vite para http://localhost:3001)
 */

const BASE = '/api';

class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {*}      data
   */
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper interno: executa fetch e normaliza erros.
 * @param {string}  path    - caminho relativo (ex: '/questions')
 * @param {RequestInit} options - opções do fetch
 * @returns {Promise<*>}
 */
async function request(path, options = {}) {
  const url = `${BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      // resposta sem body JSON
    }
    throw new ApiError(
      data?.message ?? `Erro HTTP ${response.status}`,
      response.status,
      data,
    );
  }

  // 204 No Content — sem body
  if (response.status === 204) return null;

  return response.json();
}

// ── Métodos públicos ─────────────────────────────────────────────────────────

export const api = {
  /**
   * GET /api{path}
   * @param {string} path
   * @returns {Promise<*>}
   */
  get: (path) => request(path, { method: 'GET' }),

  /**
   * POST /api{path}
   * @param {string} path
   * @param {*}      body - objeto serializável
   * @returns {Promise<*>}
   */
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),

  /**
   * PUT /api{path}
   * @param {string} path
   * @param {*}      body
   * @returns {Promise<*>}
   */
  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),

  /**
   * DELETE /api{path}
   * @param {string} path
   * @returns {Promise<*>}
   */
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };
