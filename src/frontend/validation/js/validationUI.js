import { getCurrentLanguage } from '../../js/core/languageManager.js';
import { t } from '../../js/i18n/useTranslation.js';
import { AuthService } from '../../js/services/authService.js';
import { initShell } from '../../js/shell.js';

const VALIDATION_ROLES = new Set(['VALIDATOR', 'ADMIN']);
const tr = (key, variables) => t(key, getCurrentLanguage(), variables);

class ValidationUI {
  constructor() {
    this.user = null;
    this.selectedQuestionId = null;
    this.elements = Object.fromEntries([
      'validator-status', 'screen-message', 'questions-list',
      'stat-pending', 'stat-approved', 'stat-rejected', 'modal-reject',
      'rejection-reason', 'btn-confirm-reject', 'btn-cancel-reject',
    ].map((id) => [id, document.getElementById(id)]));
    this.bindEvents();
    this.restoreOfficialSession();
  }

  async restoreOfficialSession() {
    try {
      const user = await AuthService.restoreSession();
      if (!user) {
        this.showMessage(tr('validation_session_required'), 'error');
        return;
      }
      initShell(user);
      this.setUser(user);
    } catch (error) {
      this.showMessage(error.message || tr('common_api_error'), 'error');
    }
  }

  setUser(user) {
    this.user = user;
    const role = String(user.role || '').toUpperCase();
    if (!VALIDATION_ROLES.has(role)) {
      this.showMessage(tr('validation_role_denied', { role: role || 'STUDENT' }), 'error');
      return;
    }
    this.elements['validator-status'].textContent =
      `${tr('validation_authenticated_as')} ${user.name || user.email} (${role})`;
    this.loadQuestions();
    this.loadStats();
  }

  bindEvents() {
    this.elements['questions-list']?.addEventListener('click', (event) => this.handleAction(event));
    this.elements['btn-cancel-reject']?.addEventListener('click', () => this.closeReject());
    this.elements['btn-confirm-reject']?.addEventListener('click', () => this.reject());
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
      this.showMessage(
        error.status === 401 || error.status === 403
          ? tr('common_unauthorized')
          : tr('validation_api_required'),
        'error',
      );
    }
  }

  async loadStats() {
    try {
      const [approved, rejected] = await Promise.all([
        window.ValidationAPI.fetchValidationHistory('APPROVED'),
        window.ValidationAPI.fetchValidationHistory('REJECTED'),
      ]);
      this.elements['stat-approved'].textContent = String((approved.data || []).length);
      this.elements['stat-rejected'].textContent = String((rejected.data || []).length);
    } catch {
      this.elements['stat-approved'].textContent = '0';
      this.elements['stat-rejected'].textContent = '0';
    }
  }

  renderQuestion(question) {
    const options = (question.options || [])
      .map((option) => `<li><strong>${option.id || ''}</strong> ${option.text || option}</li>`)
      .join('');
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
        status,
        rejection_reason: rejectionReason,
      });
      this.closeReject();
      await Promise.all([this.loadQuestions(), this.loadStats()]);
    } catch (error) {
      this.showMessage(
        error.status === 401 || error.status === 403
          ? tr('common_unauthorized')
          : error.message || tr('common_api_error'),
        'error',
      );
    }
  }

  reject() {
    const reason = this.elements['rejection-reason']?.value?.trim();
    if (!reason || reason.length < 10) {
      this.showMessage(tr('validation_rejection_min'), 'error');
      return;
    }
    this.validate('REJECTED', reason);
  }

  closeReject() {
    this.elements['modal-reject']?.classList.add('hidden');
  }

  showMessage(message, type = 'info') {
    const element = this.elements['screen-message'];
    if (!element) return;
    element.textContent = message;
    element.className = `screen-message ${type}`;
  }
}

window.validationApp = new ValidationUI();
