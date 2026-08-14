import { initAdminPage, escapeHtml, showFeedback } from './adminPage.js';

function formatDate(value) { return value ? new Date(value).toLocaleString('pt-BR') : 'Data não disponível'; }

async function loadHistory() {
  const status = document.getElementById('history-status')?.value || '';
  const response = await window.ValidationAPI.fetchValidationHistory(status);
  const records = response.data || [];
  const target = document.getElementById('history-list');
  if (!records.length) { target.innerHTML = '<p class="admin-empty">Nenhuma validação processada encontrada.</p>'; return; }
  target.innerHTML = `<div class="admin-list">${records.map((record) => `<article class="admin-list-card">
    <h3>${escapeHtml(record.certification || 'Certificação não informada')}</h3>
    <p>${escapeHtml(record.question_text || 'Questão sem texto')}</p>
    <p><span class="admin-status ${record.validation_status === 'APPROVED' ? 'admin-status-approved' : 'admin-status-rejected'}">${record.validation_status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'}</span></p>
    <p>Validador: ${escapeHtml(record.validator_name || record.validator_email || 'Não informado')}</p>
    <p>Data: ${formatDate(record.validated_at)}</p>
    ${record.rejection_reason ? `<p>Motivo: ${escapeHtml(record.rejection_reason)}</p>` : ''}
  </article>`).join('')}</div>`;
}

export async function initHistoryPage() {
  if (!await initAdminPage({ roles: ['VALIDATOR', 'ADMIN'], message: 'Apenas Validadores e Administradores podem acessar o histórico.' })) return;
  document.getElementById('history-status')?.addEventListener('change', () => loadHistory().catch((error) => showFeedback(error.message, 'error')));
  try { await loadHistory(); } catch (error) { showFeedback(error.message || 'Não foi possível carregar o histórico.', 'error'); }
}
