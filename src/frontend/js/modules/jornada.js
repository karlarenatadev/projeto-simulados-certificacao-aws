/**
 * modules/jornada.js — Jornada module entry point
 *
 * Documenta as funções do app.js usadas pela página jornada.html.
 * O app.js é carregado diretamente pelo HTML e popula window.*.
 *
 * Funções usadas pela Jornada via window.* ou onclick:
 *
 * Trilha e missões:
 *   - window.startJornada()              — inicializa a tela da jornada/trilha
 *   - window.startMission(stageId)       — inicia missão de um estágio
 *   - window.startTrailMission(stageId, stageTitle) — inicia missão pela trilha
 *   - window.completeSprintDay(day)      — marca dia do sprint como concluído
 *   - window.closeSprintReader()         — fecha o leitor do sprint
 *
 * Navegação:
 *   - window.showScreen(name)            — navega entre screens do SPA
 *   - window.goHome()                    — volta ao hub
 *
 * @module jornada
 */

import { storageManager } from "../storageManager.js";

/**
 * Renderiza o Dashboard da Jornada (Progresso, Acertos, etc)
 * @param {string} certId - O ID da certificação atual
 */
export function renderJornadaDashboard(certId) {
  const titleEl = document.getElementById("jornada-cert-title");
  const progressEl = document.getElementById("jornada-progress");
  const accuracyEl = document.getElementById("jornada-accuracy");
  const questionsEl = document.getElementById("jornada-questions");
  const weakDomainEl = document.getElementById("jornada-weak-domain");

  if (!titleEl) return;

  // Atualizar título da certificação
  const certName = certId ? certId.toUpperCase() : "AWS";
  titleEl.textContent = `Jornada ${certName}`;

  // Obter histórico
  const history = storageManager.getHistory();
  const certHistory = history.filter(h => h.certId === certId);

  if (certHistory.length === 0) {
    if (progressEl) progressEl.textContent = "0%";
    if (accuracyEl) accuracyEl.textContent = "0%";
    if (questionsEl) questionsEl.textContent = "0";
    if (weakDomainEl) weakDomainEl.textContent = "-";
    return;
  }

  // Quantidade de questões
  const totalQuestions = certHistory.reduce((acc, curr) => acc + (curr.total || 0), 0);
  if (questionsEl) questionsEl.textContent = totalQuestions.toString();

  // Taxa de acerto global
  let totalScore = 0;
  certHistory.forEach(h => {
    totalScore += h.score || 0;
  });
  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;

  // Percentual de progresso (baseado no Sprint ou simulados feitos)
  const sprintState = storageManager.getSprintState(certId);
  const sprintProgress = Math.round((sprintState.completedStages.length / 14) * 100);
  if (progressEl) progressEl.textContent = `${sprintProgress}%`;

  // Domínio mais fraco (agregando erros por domínio usando os mistakes)
  const mistakes = storageManager.getMistakes(certId);
  if (mistakes.length === 0) {
    if (weakDomainEl) {
      weakDomainEl.textContent = "Nenhum";
      weakDomainEl.classList.remove("text-red-500");
      weakDomainEl.classList.add("text-green-500");
    }
  } else {
    // Conta erros por domínio (mistake = { domain: "..." })
    const domainErrors = {};
    mistakes.forEach(m => {
      const dom = m.domain || "Desconhecido";
      domainErrors[dom] = (domainErrors[dom] || 0) + 1;
    });
    
    let worstDomain = "-";
    let maxErrors = -1;
    for (const [dom, count] of Object.entries(domainErrors)) {
      if (count > maxErrors) {
        maxErrors = count;
        worstDomain = dom;
      }
    }
    
    if (weakDomainEl) {
      weakDomainEl.textContent = worstDomain;
      weakDomainEl.title = worstDomain;
    }
  }
}
