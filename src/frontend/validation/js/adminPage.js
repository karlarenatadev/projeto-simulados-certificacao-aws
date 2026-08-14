import { AuthService } from '../../js/services/authService.js';
import { initShell } from '../../js/shell.js';
import { getCurrentLanguage } from '../../js/core/languageManager.js';
import { t } from '../../js/i18n/useTranslation.js';

export async function initAdminPage({ roles, message }) {
  const user = await AuthService.restoreSession();
  if (user) initShell(user);

  const content = document.querySelector('.admin-page-content');
  const screenMessage = document.getElementById('screen-message');
  const allowed = user && roles.includes(String(user.role).toUpperCase());

  if (!allowed) {
    if (content) content.hidden = true;
    if (screenMessage) {
      screenMessage.className = 'admin-feedback error';
      screenMessage.textContent = message || t('common_unauthorized', getCurrentLanguage());
    }
    return null;
  }

  return user;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

export function showFeedback(message, type = 'success') {
  const element = document.getElementById('screen-message');
  if (!element) return;
  element.className = `admin-feedback ${type}`;
  element.textContent = message;
}
