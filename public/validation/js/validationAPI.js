const VALIDATION_API_BASE_URL = window.VALIDATION_API_BASE_URL
  || (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001'
    : '');

async function validationFetch(path, options = {}) {
  let authHeaders = {};
  try {
    const session = JSON.parse(localStorage.getItem('cloudacademy_session') || 'null');
    if (session?.accessToken) authHeaders = { Authorization: `Bearer ${session.accessToken}` };
  } catch {
    // Sessão inválida será rejeitada pela API.
  }
  const response = await fetch(`${VALIDATION_API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

window.ValidationAPI = {
  async login(email) {
    return validationFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async fetchPendingQuestions() {
    const response = await validationFetch('/api/questions/pending', {
    });
    return { success: response.success !== false, data: response.data || [] };
  },
  async fetchValidationHistory(status = '') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return validationFetch(`/api/questions/history${query}`);
  },
  async validateQuestion(id, payload) {
    return validationFetch(`/api/questions/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async listValidatorRequests(status = '') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return validationFetch(`/api/access/validator-requests${query}`);
  },
  async reviewValidatorRequest(id, status, review_notes = '') {
    return validationFetch(`/api/access/validator-requests/${encodeURIComponent(id)}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_notes }),
    });
  },
  async listUsers(search = '') {
    return validationFetch(`/api/access/admin/users?search=${encodeURIComponent(search)}`);
  },
  async updateUserAccess(id, payload) {
    return validationFetch(`/api/access/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
