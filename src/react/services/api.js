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
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper interno: executa fetch e normaliza erros.
 */
async function request(path, options = {}) {
  const url = `${BASE}${path}`;

  // Pegamos o token (user_id) salvo
  const userId = localStorage.getItem('aws_sim_user_id');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Injetamos a autenticação se existir
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      // resposta sem body JSON
    }
    throw new ApiError(
      data?.error ?? data?.message ?? `Erro HTTP ${response.status}`,
      response.status,
      data,
    );
  }

  // 204 No Content — sem body
  if (response.status === 204) return null;

  return response.json();
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };
