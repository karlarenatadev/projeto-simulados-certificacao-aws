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
      'admin-access-section', 'btn-load-requests', 'btn-load-users', 'access-search', 'access-list',
    ].map((id) => [id, document.getElementById(id)]));
    this.bindEvents();
    this.restoreOfficialSession();
    window.addEventListener('hashchange', () => this.applyAdminHash());
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
    if (role === 'ADMIN') this.elements['admin-access-section']?.classList.remove('hidden');
    if (this.elements['validator-status']) {
      this.elements['validator-status'].textContent = `Validador: ${user.name || user.email} (${role})`;
    }
    this.loadQuestions();
    this.applyAdminHash();
  }

  bindEvents() {
    this.elements['btn-login']?.addEventListener('click', () => this.login());
    this.elements['login-email']?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.login();
    });
    this.elements['questions-list']?.addEventListener('click', (event) => this.handleAction(event));
    this.elements['btn-cancel-reject']?.addEventListener('click', () => this.closeReject());
    this.elements['btn-confirm-reject']?.addEventListener('click', () => this.reject());
    this.elements['btn-load-requests']?.addEventListener('click', () => this.loadRequests());
    this.elements['btn-load-users']?.addEventListener('click', () => this.loadUsers());
    this.elements['access-search']?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && this.user?.role === 'ADMIN') this.loadUsers();
    });
  }

  applyAdminHash() {
    if (String(this.user?.role || '').toUpperCase() !== 'ADMIN') return;
    const tab = window.location.hash.replace('#', '') || 'requests';
    const isUsers = tab === 'users';
    this.elements['admin-access-section']?.classList.remove('hidden');
    document.querySelectorAll('[data-validation-tab]').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.validationTab === (isUsers ? 'users' : 'requests'));
    });
    if (isUsers) this.loadUsers();
    else this.loadRequests();
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

  async loadRequests() {
    try {
      const response = await window.ValidationAPI.listValidatorRequests();
      const requests = response.data || [];
      this.elements['access-list'].innerHTML = requests.length
        ? requests.map((request) => this.renderRequest(request)).join('')
        : `<p class="loading-msg">${tr('admin_users_requests_empty')}</p>`;
      this.elements['access-list'].querySelectorAll('[data-request-action]').forEach((button) => {
        button.addEventListener('click', () => this.reviewRequest(button.dataset.id, button.dataset.requestAction));
      });
    } catch (error) {
      this.showMessage(error.message || tr('admin_users_request_error'), 'error');
    }
  }

  async loadUsers() {
    try {
      const response = await window.ValidationAPI.listUsers(this.elements['access-search']?.value || '');
      const users = response.data || [];
      this.elements['access-list'].innerHTML = users.length
        ? users.map((user) => this.renderUser(user)).join('')
        : `<p class="loading-msg">${tr('admin_users_empty')}</p>`;
      this.elements['access-list'].querySelectorAll('[data-user-action]').forEach((button) => {
        button.addEventListener('click', () => this.updateUser(button.dataset.userId, button.dataset.userAction));
      });
    } catch (error) {
      this.showMessage(error.message || tr('admin_users_update_error'), 'error');
    }
  }

  renderRequest(request) {
    return `<article class="question-card"><h3>${this.escape(request.full_name || request.email)} — ${this.escape(request.certification_id)}</h3>
      <p>${this.escape(request.email || '')}</p>
      <p>Credential ID: ${this.escape(request.credential_id || '—')}</p>
      <p>Credential URL: ${this.escape(request.credential_url || '—')}</p>
      <p>${tr('admin_users_request_date')}: ${this.escape(request.requested_at || '—')}</p>
      <p>${tr('admin_users_status')}: ${this.escape(request.status)}</p>
      ${request.status === 'PENDING' ? `<button class="btn-primary" data-request-action="APPROVED" data-id="${this.escape(request.id)}">${tr('admin_users_approve')}</button>
      <button class="btn-danger" data-request-action="REJECTED" data-id="${this.escape(request.id)}">${tr('admin_users_reject')}</button>` : ''}</article>`;
  }

  renderUser(user) {
    const certifications = (user.validator_certifications || []).map((item) => item.certification_id).join(', ') || '—';
    return `<article class="question-card"><h3>${this.escape(user.full_name || user.email)}</h3>
      <p>${this.escape(user.email || '')} · ${this.escape(user.role)} · ${user.is_active ? tr('admin_users_active') : tr('admin_users_inactive')}</p>
      <p>${tr('admin_users_last_access')}: ${this.escape(user.last_login || '—')}</p>
      <p>${tr('admin_users_certifications')}: ${this.escape(certifications)}</p>
      <select data-role-select="${this.escape(user.id)}" aria-label="${tr('admin_users_role')}">
        ${['STUDENT', 'VALIDATOR', 'ADMIN'].map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}
      </select>
      <button class="btn-secondary" data-user-action="toggle" data-user-id="${this.escape(user.id)}">${user.is_active ? tr('admin_users_deactivate') : tr('admin_users_activate')}</button>
      <button class="btn-secondary" data-user-action="role" data-user-id="${this.escape(user.id)}">${tr('admin_users_save')}</button></article>`;
  }

  async reviewRequest(requestId, status) {
    try {
      const notes = status === 'REJECTED' ? window.prompt(tr('common_rejection_reason')) : '';
      if (status === 'REJECTED' && (!notes || notes.trim().length < 10)) return;
      await window.ValidationAPI.reviewValidatorRequest(requestId, status, notes);
      await this.loadRequests();
    } catch (error) {
      this.showMessage(error.message || 'Não foi possível revisar a solicitação.', 'error');
    }
  }

  async updateUser(userId, action = 'toggle') {
    try {
      const users = (await window.ValidationAPI.listUsers()).data || [];
      const user = users.find((item) => item.id === userId);
      if (!user) return;
      const roleSelect = this.elements['access-list'].querySelector(`[data-role-select="${userId}"]`);
      const payload = action === 'role'
        ? { role: roleSelect?.value || user.role }
        : { is_active: !user.is_active };
      if (action === 'role' && payload.role === 'ADMIN' && user.role !== 'ADMIN'
        && !window.confirm(tr('admin_users_confirm_admin'))) return;
      await window.ValidationAPI.updateUserAccess(userId, payload);
      await this.loadUsers();
    } catch (error) {
      this.showMessage(error.message || tr('admin_users_update_error'), 'error');
    }
  }

  escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
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
