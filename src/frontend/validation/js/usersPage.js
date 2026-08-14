import { initAdminPage, escapeHtml, showFeedback } from './adminPage.js';

const roles = ['STUDENT', 'VALIDATOR', 'ADMIN'];

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Nunca';
}

function userRows(users) {
  if (!users.length) return '<tr><td colspan="6" class="admin-empty">Nenhum usuário encontrado.</td></tr>';
  return users.map((user) => `
    <tr data-user-id="${escapeHtml(user.id)}">
      <td><strong>${escapeHtml(user.full_name || user.nickname || 'Sem nome')}</strong><br><small>${escapeHtml(user.email)}</small></td>
      <td><select data-role>${roles.map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}</select></td>
      <td><span class="admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}">${user.is_active ? 'Ativo' : 'Inativo'}</span></td>
      <td>${formatDate(user.last_login)}</td>
      <td>${escapeHtml((user.validator_certifications || []).map((item) => item.certification_id || item).join(', ') || '—')}</td>
      <td><div class="admin-actions"><button class="btn-secondary" data-save>Salvar</button><button class="btn-secondary" data-toggle>${user.is_active ? 'Desativar' : 'Ativar'}</button></div></td>
    </tr>`).join('');
}

async function loadUsers() {
  const search = document.getElementById('access-search')?.value || '';
  const response = await window.ValidationAPI.listUsers(search);
  const users = response.data || [];
  document.getElementById('users-list').innerHTML = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Usuário</th><th>Role</th><th>Status</th><th>Último acesso</th><th>Certificações</th><th>Ações</th></tr></thead><tbody>${userRows(users)}</tbody></table></div>`;
}

function requestCards(requests) {
  if (!requests.length) return '<p class="admin-empty">Nenhuma solicitação encontrada.</p>';
  return requests.map((request) => `<article class="admin-list-card" data-request-id="${escapeHtml(request.id)}">
    <h3>${escapeHtml(request.full_name || request.email || 'Usuário')}</h3>
    <p>${escapeHtml(request.email || '')} · ${escapeHtml(request.certification_id || request.certification || '')}</p>
    <p>Credential ID: ${escapeHtml(request.credential_id || '—')}</p>
    <p>${escapeHtml(request.credential_url || '—')}</p>
    <p>${escapeHtml(request.notes || request.justification || '—')}</p>
    <p><span class="admin-status">${escapeHtml(request.status || 'PENDING')}</span> · ${formatDate(request.requested_at || request.created_at)}</p>
    ${request.status === 'PENDING' ? '<div class="admin-actions"><button class="btn-primary" data-request-action="APPROVED">Aprovar</button><button class="btn-danger" data-request-action="REJECTED">Rejeitar</button></div>' : ''}
  </article>`).join('');
}

async function loadRequests() {
  const response = await window.ValidationAPI.listValidatorRequests();
  document.getElementById('requests-list').innerHTML = `<div class="admin-list">${requestCards(response.data || [])}</div>`;
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
      ? { is_active: !(row.querySelector('.admin-status')?.classList.contains('admin-status-active')) }
      : event.target.closest('[data-save]') ? { role: row.querySelector('[data-role]').value } : null;
    if (!payload) return;
    try { await window.ValidationAPI.updateUserAccess(id, payload); showFeedback('Usuário atualizado.'); await loadUsers(); }
    catch (error) { showFeedback(error.message || 'Não foi possível atualizar o usuário.', 'error'); }
  });
  document.getElementById('requests-list')?.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-request-action]');
    if (!action) return;
    const card = action.closest('.admin-list-card');
    const id = card?.dataset.requestId || action.closest('[data-request-id]')?.dataset.requestId;
    if (!id) return;
    const status = action.dataset.requestAction;
    const notes = status === 'REJECTED' ? window.prompt('Motivo da rejeição (mínimo de 10 caracteres):', '') : '';
    if (status === 'REJECTED' && (!notes || notes.trim().length < 10)) return;
    try { await window.ValidationAPI.reviewValidatorRequest(id, status, notes || ''); showFeedback('Solicitação atualizada.'); await loadRequests(); }
    catch (error) { showFeedback(error.message || 'Não foi possível atualizar a solicitação.', 'error'); }
  });
}

export async function initUsersPage() {
  if (!await initAdminPage({ roles: ['ADMIN'], message: 'Apenas administradores podem acessar esta área.' })) return;
  bindActions();
  try { await Promise.all([loadUsers(), loadRequests()]); } catch (error) { showFeedback(error.message || 'Não foi possível carregar a gestão de usuários.', 'error'); }
}
