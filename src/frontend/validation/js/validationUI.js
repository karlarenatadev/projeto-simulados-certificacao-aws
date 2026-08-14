const VALIDATION_SESSION_KEY = 'cloudacademy_session';
const VALIDATION_ROLES = new Set(['VALIDATOR', 'ADMIN']);

class ValidationUI {
  constructor() {
    this.user = null;
    this.selectedQuestionId = null;
    this.elements = Object.fromEntries([
      'validator-status', 'login-section', 'login-email', 'btn-login', 'login-error',
      'screen-message', 'questions-list', 'stat-pending', 'stat-approved', 'stat-rejected',
      'modal-reject', 'rejection-reason', 'btn-confirm-reject', 'btn-cancel-reject',
    ].map((id) => [id, document.getElementById(id)]));
    this.bindEvents();
    this.restoreOfficialSession();
  }

  readOfficialSession() {
    try {
      const session = JSON.parse(localStorage.getItem(VALIDATION_SESSION_KEY) || 'null');
      return session?.user?.id ? session : null;
    } catch {
      return null;
    }
  }

  restoreOfficialSession() {
    const session = this.readOfficialSession();
    if (!session) {
      this.showMessage('Painel de validação requer uma sessão autenticada e conexão com a API.', 'error');
      this.elements['login-section']?.classList.remove('hidden');
      return;
    }
    this.setUser(session.user);
  }

  setUser(user) {
    this.user = user;
    const role = String(user.role || '').toUpperCase();
    if (!VALIDATION_ROLES.has(role)) {
      this.showMessage(`Acesso negado. Sua role (${role || 'STUDENT'}) não permite validação.`, 'error');
      this.elements['login-section']?.classList.add('hidden');
      return;
    }
    this.elements['login-section']?.classList.add('hidden');
    if (this.elements['validator-status']) {
      this.elements['validator-status'].textContent = `Validador: ${user.name || user.email} (${role})`;
    }
    this.loadQuestions();
  }

  bindEvents() {
    this.elements['btn-login']?.addEventListener('click', () => this.login());
    this.elements['login-email']?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.login();
    });
    this.elements['questions-list']?.addEventListener('click', (event) => this.handleAction(event));
    this.elements['btn-cancel-reject']?.addEventListener('click', () => this.closeReject());
    this.elements['btn-confirm-reject']?.addEventListener('click', () => this.reject());
  }

  async login() {
    const email = this.elements['login-email']?.value?.trim();
    if (!email) return this.showLoginError('Informe seu email corporativo @a3data.');
    try {
      const response = await window.ValidationAPI.login(email);
      if (!response.success || !response.data?.id) throw new Error(response.error || 'Falha no login.');
      const user = response.data;
      const session = { user, authenticationMode: 'online', provider: 'backend', version: 1 };
      localStorage.setItem(VALIDATION_SESSION_KEY, JSON.stringify(session));
      this.setUser(user);
    } catch (error) {
      this.showLoginError(error.message || 'Não foi possível conectar à API.');
    }
  }

  async loadQuestions() {
    try {
      const response = await window.ValidationAPI.fetchPendingQuestions(this.user.id);
      const questions = response.data || [];
      this.elements['stat-pending'].textContent = String(questions.length);
      this.elements['questions-list'].innerHTML = questions.length
        ? questions.map((question) => this.renderQuestion(question)).join('')
        : '<p class="loading-msg">Nenhuma questão pendente.</p>';
    } catch (error) {
      this.showMessage(error.status === 401 || error.status === 403
        ? 'Acesso negado pela API. A role válida é determinada pelo banco.'
        : 'Painel de validação requer conexão com a API.', 'error');
    }
  }

  renderQuestion(question) {
    const options = (question.options || []).map((option) => `<li><strong>${option.id || ''}</strong> ${option.text || option}</li>`).join('');
    return `<article class="question-card" data-question-id="${question.id}">
      <h3>${question.certification || ''} — ${question.domain || ''}</h3>
      <p>${question.question_text || ''}</p><ol>${options}</ol>
      <button class="btn-primary" data-action="approve" data-id="${question.id}">Aprovar</button>
      <button class="btn-danger" data-action="reject" data-id="${question.id}">Rejeitar</button>
    </article>`;
  }

  handleAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    this.selectedQuestionId = button.dataset.id;
    if (button.dataset.action === 'approve') this.validate('APPROVED');
    else this.elements['modal-reject']?.classList.remove('hidden');
  }

  async validate(status, rejectionReason = null) {
    try {
      await window.ValidationAPI.validateQuestion(this.selectedQuestionId, {
        status, rejection_reason: rejectionReason, validated_by: this.user.id,
      }, this.user.id);
      status === 'APPROVED' ? window.ValidationStorage.incrementApproved() : window.ValidationStorage.incrementRejected();
      this.closeReject();
      await this.loadQuestions();
    } catch (error) {
      this.showMessage(error.status === 401 || error.status === 403 ? 'A API recusou esta ação para a role atual.' : error.message, 'error');
    }
  }

  reject() {
    const reason = this.elements['rejection-reason']?.value?.trim();
    if (!reason || reason.length < 10) return this.showMessage('O motivo da rejeição deve ter ao menos 10 caracteres.', 'error');
    this.validate('REJECTED', reason);
  }

  closeReject() { this.elements['modal-reject']?.classList.add('hidden'); }
  showLoginError(message) { if (this.elements['login-error']) { this.elements['login-error'].textContent = message; this.elements['login-error'].classList.remove('hidden'); } }
  showMessage(message, type = 'info') { if (this.elements['screen-message']) { this.elements['screen-message'].textContent = message; this.elements['screen-message'].className = `screen-message ${type}`; } }
}

window.validationApp = new ValidationUI();
