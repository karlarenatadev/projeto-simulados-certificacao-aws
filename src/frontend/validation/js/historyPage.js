import { initAdminPage, escapeHtml, showFeedback } from './adminPage.js';
import { getCurrentLanguage } from '../../js/core/languageManager.js';
import { t } from '../../js/i18n/useTranslation.js';

const tr = (key, variables) => t(key, getCurrentLanguage(), variables);

function formatDate(value) {
  return value ? new Date(value).toLocaleString(getCurrentLanguage() === 'en' ? 'en-US' : 'pt-BR') : tr('common_not_available');
}

async function loadHistory() {
  const status = document.getElementById('history-status')?.value || '';
  const response = await window.ValidationAPI.fetchValidationHistory(status);
  const records = response.data || [];
  const target = document.getElementById('history-list');
  if (!records.length) { target.innerHTML = `<p class="admin-empty">${tr('admin_history_empty')}</p>`; return; }
  target.innerHTML = `<div class="admin-list">${records.map((record) => `<article class="admin-list-card">
    <h3>${escapeHtml(record.certification || tr('common_not_available'))}</h3>
    <p>${escapeHtml(record.question_text || tr('common_not_available'))}</p>
    <p><span class="admin-status ${record.validation_status === 'APPROVED' ? 'admin-status-approved' : 'admin-status-rejected'}">${record.validation_status === 'APPROVED' ? tr('admin_history_approved') : tr('admin_history_rejected')}</span></p>
    <p>${tr('admin_history_validator')}: ${escapeHtml(record.validator_name || record.validator_email || tr('common_not_available'))}</p>
    <p>${tr('admin_history_date')}: ${formatDate(record.validated_at)}</p>
    ${record.rejection_reason ? `<p>${escapeHtml(record.rejection_reason)}</p>` : ''}
  </article>`).join('')}</div>`;
}

export async function initHistoryPage() {
  if (!await initAdminPage({ roles: ['VALIDATOR', 'ADMIN'], message: tr('common_unauthorized') })) return;
  document.getElementById('history-status')?.addEventListener('change', () => loadHistory().catch((error) => showFeedback(error.message, 'error')));
  try { await loadHistory(); } catch (error) { showFeedback(error.message || tr('admin_history_empty'), 'error'); }
}
