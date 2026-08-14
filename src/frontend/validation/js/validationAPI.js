const VALIDATION_API_BASE_URL = window.VALIDATION_API_BASE_URL
  || (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3001'
    : '');

async function validationFetch(path, options = {}) {
  const response = await fetch(`${VALIDATION_API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
  async fetchPendingQuestions(userId) {
    const response = await validationFetch('/api/questions/pending', {
      headers: { 'X-User-Id': userId },
    });
    return { success: response.success !== false, data: response.data || [] };
  },
  async validateQuestion(id, payload, userId) {
    return validationFetch(`/api/questions/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      headers: { 'X-User-Id': userId },
      body: JSON.stringify(payload),
    });
  },
};
