import { getCurrentLanguage } from '../../js/core/languageManager.js';
import { t } from '../../js/i18n/useTranslation.js';

const VALIDATION_SESSION_KEY = 'cloudacademy_session';
const VALIDATION_ROLES = new Set(['VALIDATOR', 'ADMIN']);
const tr = (key, variables) => t(key, getCurrentLanguage(), variables);

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
      this.showMessage(tr('validation_session_required'), 'error');
      this.elements['login-section']?.classList.remove('hidden');
      return;
    }
    this.setUser(session.user);
  }

  setUser(user) {
    this.user = user;
    const role = String(user.role || '').toUpperCase();
    if (!VALIDATION_ROLES.has(role)) {
      this.showMessage(tr('validation_role_denied', { role: role || 'STUDENT' }), 'error');
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
    if (!email) return this.showLoginError(tr('auth_email_required'));
    try {
      const response = await window.ValidationAPI.login(email);
      if (!response.success || !response.data?.id) throw new Error(response.error || tr('common_login_error'));
      const user = response.data;
      const session = {
        user,
        accessToken: response.data.access_token || null,
        tokenExpiresIn: response.data.expires_in || null,
        authenticationMode: 'online',
        provider: 'backend',
        version: 1,
      };
      localStorage.setItem(VALIDATION_SESSION_KEY, JSON.stringify(session));
      this.setUser(user);
    } catch (error) {
      this.showLoginError(error.message || tr('common_api_error'));
    }
  }

  async loadQuestions() {
    try {
      const response = await window.ValidationAPI.fetchPendingQuestions();
      const questions = response.data || [];
      this.elements['stat-pending'].textContent = String(questions.length);
      this.elements['questions-list'].innerHTML = questions.length
        ? questions.map((question) => this.renderQuestion(question)).join('')
        : `<p class="loading-msg">${tr('admin_validation_empty')}</p>`;
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
      <button class="btn-primary" data-action="approve" data-id="${question.id}">${tr('admin_validation_approve')}</button>
      <button class="btn-danger" data-action="reject" data-id="${question.id}">${tr('admin_validation_reject')}</button>
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
        status, rejection_reason: rejectionReason,
      });
      status === 'APPROVED' ? window.ValidationStorage.incrementApproved() : window.ValidationStorage.incrementRejected();
      this.closeReject();
      await this.loadQuestions();
    } catch (error) {
      this.showMessage(error.status === 401 || error.status === 403 ? tr('common_unauthorized') : error.message, 'error');
    }
  }

  reject() {
    const reason = this.elements['rejection-reason']?.value?.trim();
    if (!reason || reason.length < 10) return this.showMessage(tr('validation_rejection_min'), 'error');
    this.validate('REJECTED', reason);
  }

  closeReject() { this.elements['modal-reject']?.classList.add('hidden'); }
  showLoginError(message) { if (this.elements['login-error']) { this.elements['login-error'].textContent = message; this.elements['login-error'].classList.remove('hidden'); } }
  showMessage(message, type = 'info') { if (this.elements['screen-message']) { this.elements['screen-message'].textContent = this.localizeMessage(message); this.elements['screen-message'].className = `screen-message ${type}`; } }
  localizeMessage(message) {
    const text = String(message || '');
    if (text.includes('conexão com a API') || text.includes('sessão autenticada')) return tr('common_unauthorized');
    if (text.includes('role válida') || text.includes('Acesso negado')) return tr('common_unauthorized');
    if (text.includes('motivo da rejeição')) return tr('common_rejection_reason');
    if (text.includes('Não foi possível')) return tr('common_error');
    return text;
  }
}

window.validationApp = new ValidationUI();
