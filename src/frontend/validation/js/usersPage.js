import { initAdminPage, escapeHtml, showFeedback } from './adminPage.js';
import { getCurrentLanguage } from '../../js/core/languageManager.js';
import { t } from '../../js/i18n/useTranslation.js';

const roles = ['STUDENT', 'VALIDATOR', 'ADMIN'];
const tr = (key, variables) => t(key, getCurrentLanguage(), variables);

function formatDate(value) {
  return value ? new Date(value).toLocaleString(getCurrentLanguage() === 'en' ? 'en-US' : 'pt-BR') : tr('common_never');
}

function userRows(users) {
  if (!users.length) return `<tr><td colspan="6" class="admin-empty">${tr('admin_users_empty')}</td></tr>`;
  return users.map((user) => `
    <tr data-user-id="${escapeHtml(user.id)}">
      <td><span class="admin-role-badge">${escapeHtml(user.role)}</span><br><strong>${escapeHtml(user.full_name || user.nickname || tr('common_not_available'))}</strong><br><small>${escapeHtml(user.email)}</small></td>
      <td><select data-role aria-label="${escapeHtml(tr('admin_users_role'))}">${roles.map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}</select></td>
      <td><span class="admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}">${user.is_active ? tr('admin_users_active') : tr('admin_users_inactive')}</span></td>
      <td>${formatDate(user.last_login)}</td>
      <td>${escapeHtml((user.validator_certifications || []).map((item) => item.certification_id || item).join(', ') || '—')}</td>
      <td><div class="admin-actions"><button class="btn-secondary" data-save>${tr('admin_users_save')}</button><button class="btn-secondary" data-toggle>${user.is_active ? tr('admin_users_deactivate') : tr('admin_users_activate')}</button></div></td>
    </tr>`).join('');
}

async function loadUsers() {
  const search = document.getElementById('access-search')?.value || '';
  const response = await window.ValidationAPI.listUsers(search);
  const users = response.data || [];
  document.getElementById('users-list').innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>${tr('admin_users_name')}</th><th>${tr('admin_users_role')}</th><th>${tr('admin_users_status')}</th><th>${tr('admin_users_last_access')}</th><th>${tr('admin_users_certifications')}</th><th>${tr('admin_users_actions')}</th></tr></thead><tbody>${userRows(users)}</tbody></table></div>`;
}

function requestCards(requests) {
  if (!requests.length) return `<p class="admin-empty">${tr('admin_users_requests_empty')}</p>`;
  return requests.map((request) => {
    const status = String(request.status || 'PENDING').toUpperCase();
    return `<article class="admin-list-card" data-request-id="${escapeHtml(request.id)}">
      <h3>${escapeHtml(request.full_name || request.email || tr('common_not_available'))}</h3>
      <p>${escapeHtml(request.email || '')} · ${escapeHtml(request.certification_id || request.certification || '')}</p>
      <p>Credential ID: ${escapeHtml(request.credential_id || '—')}</p>
      <p>${escapeHtml(request.credential_url || '—')}</p>
      <p>${escapeHtml(request.notes || request.justification || '—')}</p>
      <p><span class="admin-status admin-status-${status.toLowerCase()}">${escapeHtml(status)}</span> · ${formatDate(request.requested_at || request.created_at)}</p>
      ${status === 'PENDING' ? `<div class="admin-actions"><button class="btn-primary" data-request-action="APPROVED">${tr('admin_users_approve')}</button><button class="btn-danger" data-request-action="REJECTED">${tr('admin_users_reject')}</button></div>` : ''}
    </article>`;
  }).join('');
}

async function loadRequests() {
  const response = await window.ValidationAPI.listValidatorRequests();
  document.getElementById('requests-list').innerHTML = `<div class="admin-list">${requestCards(response.data || [])}</div>`;
}

function friendlyError(error) {
  if (error?.status === 409 || /last active ADMIN/i.test(error?.message || '')) return tr('admin_users_last_admin_error');
  return error?.message || tr('admin_users_update_error');
}

function bindActions() {
  document.getElementById('btn-load-users')?.addEventListener('click', () => loadUsers().catch((error) => showFeedback(error.message, 'error')));
  document.getElementById('btn-search-users')?.addEventListener('click', () => loadUsers().catch((error) => showFeedback(error.message, 'error')));
  document.getElementById('btn-load-requests')?.addEventListener('click', () => loadRequests().catch((error) => showFeedback(error.message, 'error')));
  document.getElementById('users-list')?.addEventListener('click', async (event) => {
    const row = event.target.closest('[data-user-id]');
    if (!row) return;
    const id = row.dataset.userId;
    const payload = event.target.closest('[data-toggle]')
      ? { is_active: !row.querySelector('.admin-status')?.classList.contains('admin-status-active') }
      : event.target.closest('[data-save]') ? { role: row.querySelector('[data-role]').value } : null;
    if (!payload) return;
    const actionButton = event.target.closest('button');
    if (actionButton) actionButton.disabled = true;
    try { await window.ValidationAPI.updateUserAccess(id, payload); showFeedback(tr('admin_users_updated')); await loadUsers(); }
    catch (error) { showFeedback(friendlyError(error), 'error'); if (actionButton) actionButton.disabled = false; }
  });
  document.getElementById('requests-list')?.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-request-action]');
    if (!action) return;
    const card = action.closest('.admin-list-card');
    const id = card?.dataset.requestId;
    if (!id) return;
    const status = action.dataset.requestAction;
    const notes = status === 'REJECTED' ? window.prompt(tr('admin_users_reject'), '') : '';
    if (status === 'REJECTED' && (!notes || notes.trim().length < 10)) return;
    action.disabled = true;
    try { await window.ValidationAPI.reviewValidatorRequest(id, status, notes || ''); showFeedback(tr('admin_users_request_updated')); await loadRequests(); }
    catch (error) { showFeedback(error.message || tr('admin_users_request_error'), 'error'); action.disabled = false; }
  });
}

export async function initUsersPage() {
  if (!await initAdminPage({ roles: ['ADMIN'], message: tr('common_unauthorized') })) return;
  bindActions();
  try { await Promise.all([loadUsers(), loadRequests()]); }
  catch (error) { showFeedback(error.message || tr('admin_users_update_error'), 'error'); }
}
