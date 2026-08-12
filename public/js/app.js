import { logger, dispatchBusinessEvent, recordMetric } from "./utils/logger.js";
import { sanitizeHTML } from "./utils/sanitize.js";
import { normalizeCertificationId } from "./utils/certUtils.js";

import { identifyWeakDomains, QuizEngine } from "./quizEngine.js";
import { certificationPaths } from "./data.js";
import { ModalService } from "./services/modalService.js";
import { NotificationService } from "./services/notificationService.js";
import { initUIRenderer } from "./uiRenderer.js";
import { ShowcaseService } from "./services/showcaseService.js";
import { initStudyNow, refreshStudyNow } from "./recommendations/studyNow.js";
import { storageManager } from "./storageManager.js";
import { userManager } from "./userManager.js";
import { AuthService } from "./services/authService.js";
import { quizManager } from "./quizManager.js";
import { renderRadarChart, renderGlobalRadarChart, renderPerformanceLineChart } from "./chartManager.js";
import { t } from "./i18n/useTranslation.js";
import { initializeUI } from "./i18n/initUI.js";
import { renderTrail } from "./gamificacao/trailManager.js";
import { renderGuildDashboard } from "./gamificacao/leaderboard.js";
import { renderJornadaDashboard } from "./modules/jornada.js";
import { renderBadges } from "./gamificacao/badges.js";
import {
  renderUserMenu,
  buildSidebar,
  initThemeShell,
  initLeftSidebarToggleShell,
  isSPAPage,
} from "./shell.js";
import {
  togglePomodoroWidget,
  togglePomodoro,
  resetPomodoro,
} from "./pomodoroManager.js";
import {
  startExamTimer,
  startMissionQuestionTimer,
  clearAllTimers,
} from "./timerManager.js";
import { generatePerformanceReport as generatePdfReport } from "./pdfReport.js";
import { generateSmartInsight as computeSmartInsight } from "./insightEngine.js";
import {
  renderSprintUI as renderSprint,
  startMicroSprint as startSprint,
  closeSprintReader as closeSprint,
  completeSprintDay as completeSprint,
} from "./gamificacao/sprintManager.js";

const APP_CONFIG = {
  PASSING_SCORE: 70,
  STORAGE_KEY: "aws_sim_",
};

const DIAGNOSTIC_DOMAIN_ALIASES = {
  "clf-c02": {
    "cloud-concepts": "conceitos-cloud",
    "security-compliance": "seguranca",
    "cloud-storage": "tecnologia",
    "billing-cost-management": "faturamento",
  },
  "saa-c03": {
    "design-secure-architectures": "seguranca-aplicacoes",
    "design-resilient-architectures": "design-resiliente",
    "design-high-performing-architectures": "design-performance",
    "design-cost-optimized-architectures": "design-custo",
  },
  "dva-c02": {
    development: "desenvolvimento-servicos",
    security: "seguranca-app",
    deployment: "implementacao",
    "troubleshooting-performance": "resolucao-problemas",
  },
};

const engine = new QuizEngine(APP_CONFIG.PASSING_SCORE);

let uiState = {
  currentCertificationInfo: null,
  timerInterval: null,
  timeRemaining: 0,
  isPaused: false,
  tempSelectedAnswer: null,
  language: "pt", // Será sobreposto logo no boot pela session
  flashcardIndex: 0,
  flashcardFlipped: false,
  currentMode: "exam", // 'exam', 'review', 'mission'
  currentMissionStageId: null,
  lives: 3,
  qTimerInterval: null,
  qTimeRemaining: 45,
  isFinishing: false,
  hasFinished: false,
  flags: [],
};

let lastRenderedResult = null;
let lastDiagnosticRecommendation = null;

// ---------------------------------------------------------------------------
// LOGIN UI — exibe o overlay de login e retorna uma Promise que resolve com
// o usuário autenticado. Rejeitada se o usuário fechar sem autenticar.
// ---------------------------------------------------------------------------

/**
 * Exibe o overlay #login-overlay e aguarda o usuário autenticar com sucesso.
 *
 * @returns {Promise<{ id, email, nickname, role }>}
 */
function showLoginUI() {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById("login-overlay");
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("login-email-input");
    const submitBtn = document.getElementById("login-submit-btn");
    const btnText = document.getElementById("login-btn-text");
    const spinner = document.getElementById("login-btn-spinner");
    const errorMsg = document.getElementById("login-error-msg");

    if (!overlay || !form) {
      reject(new Error("Login overlay não encontrado no DOM."));
      return;
    }

    // Torna o overlay visível
    overlay.classList.remove("hidden");
    emailInput?.focus();

    function showError(msg) {
      if (!errorMsg) return;
      errorMsg.textContent = msg;
      errorMsg.classList.remove("hidden");
    }

    function clearError() {
      if (!errorMsg) return;
      errorMsg.textContent = "";
      errorMsg.classList.add("hidden");
    }

    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      if (btnText) btnText.textContent = loading ? "Autenticando..." : "Entrar";
      if (spinner) spinner.classList.toggle("hidden", !loading);
    }

    async function handleSubmit(e) {
      e.preventDefault();
      clearError();

      const email = emailInput?.value?.trim() || "";

      if (!email) {
        showError("Informe seu email corporativo.");
        return;
      }

      if (!userManager.isValidCorporateEmail(email)) {
        showError("Acesso restrito a emails @a3data.com.br ou @a3data.com.");
        return;
      }

      setLoading(true);

      try {
        const user = await AuthService.login(email);

        // Oculta overlay após autenticação bem-sucedida
        overlay.classList.add("hidden");
        form.removeEventListener("submit", handleSubmit);

        resolve(user);
      } catch (error) {
        const rawMsg = error?.message || "";
        let msg;

        // API desativada (deploy estático / GitHub Pages) — cria sessão offline
        // automaticamente sem exibir mensagem de erro ao usuário.
        if (error?.apiDisabled) {
          overlay.classList.add("hidden");
          form.removeEventListener("submit", handleSubmit);
          const offlineUser = await userManager.createOfflineUser(email, {});
          resolve(offlineUser);
          return;
        }

        if (rawMsg.includes("403") || rawMsg.includes("não autorizado")) {
          msg = "Email não autorizado. Use seu email @a3data.com.br.";
        } else if (
          rawMsg.includes("timeout") ||
          rawMsg.includes("signal is aborted") ||
          error?.statusCode === 0
        ) {
          msg =
            "Não foi possível conectar ao servidor. Verifique se a API está rodando (npm run api:start) e tente novamente.";
        } else if (rawMsg.includes("Network") || rawMsg.includes("fetch")) {
          msg = "Sem conexão com o servidor. Tente novamente em instantes.";
        } else {
          msg = rawMsg || "Erro ao autenticar. Tente novamente.";
        }
        showError(msg);
      } finally {
        setLoading(false);
      }
    }

    form.addEventListener("submit", handleSubmit);
  });
}

// INICIALIZAÇÃO

document.addEventListener("DOMContentLoaded", async () => {
  initUIRenderer();

  // FASE SHOWCASE: Interceptador de URL para demonstrações
  const urlParams = new URLSearchParams(window.location.search);
  const showcaseMode = urlParams.get("mode");
  if (showcaseMode === "showcase") {
    const persona = urlParams.get("persona") || "advanced";
    const cert = normalizeCertificationId(urlParams.get("cert")) || "clf-c02";
    // O offline/theme parameter poderiam ser salvos no uiState
    if (urlParams.get("offline") === "true") {
      window.sessionStorage.setItem("force_offline", "true");
    }
    await ShowcaseService.initDemo(persona, cert);

    // Limpa a URL para não poluir
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // FASE 0: Autenticação — bloqueia o boot até ter sessão válida
  // Em páginas secundárias (simulados.html, jornada.html, etc.) o app.js é
  // carregado para disponibilizar as funções window.*, mas o fluxo de login
  // e o Hub são responsabilidade exclusiva do index.html.
  // O authGuard dessas páginas é feito pelo inline module via AuthService +
  // window.location.replace('./index.html') — sem depender do app.js.
  let authenticatedUser = null;
  if (isSPAPage()) {
    try {
      let user = await AuthService.restoreSession();

      if (!user) {
        // Exibe overlay de login e aguarda autenticação
        user = await showLoginUI();
      }

      // Sessão garantida a partir daqui
      authenticatedUser = user;
      await quizManager.initialize(user.id);
      logger.info(`✓ Sessão ativa: ${user.email || user.id} (${user.role})`);
    } catch (error) {
      logger.error("Falha crítica na autenticação:", error);
      // Exibe overlay de login como fallback de segurança
      try {
        const user = await showLoginUI();
        authenticatedUser = user;
        await quizManager.initialize(user.id);
      } catch (_e) {
        logger.error("Impossível inicializar sem autenticação.");
        return; // Aborta o boot — não há como continuar
      }
    }
  } else {
    // Página secundária: apenas restaura sessão para disponibilizar
    // o usuário às funções window.* (quiz, flashcards, etc.).
    // O redirect para index.html, se não autenticado, é feito pelo
    // inline authGuard de cada página.
    authenticatedUser = AuthService.getCurrentUser();
    if (authenticatedUser) {
      uiState.language = authenticatedUser.language || "pt";
      await quizManager.initialize(authenticatedUser.id);
    }
  }

  // FASE 1: Inicialização Central do App Shell
  initThemeShell();
  initLeftSidebarToggleShell();
  renderUserMenu(authenticatedUser);
  buildSidebar(authenticatedUser);

  // Executa as inicializações complementares caso existam no shell global
  if (typeof window.syncLanguageButtonShell === "function") window.syncLanguageButtonShell();
  if (typeof window.initPWAInstallShell === "function") window.initPWAInstallShell();

  // Marca item ativo baseado na URL atual (replicando lógica do initShell)
  const currentPath = window.location.pathname;
  const pathToId = {
    "/simulados.html": "sidebar-btn-quiz",
    "/jornada.html": "sidebar-btn-journey",
    "/flashcards.html": "sidebar-btn-flashcards",
    "/diagnostico.html": "sidebar-btn-diagnostic",
    "/cases.html": "sidebar-btn-cases",
      "/laboratorios.html": "sidebar-btn-labs",
    "/resources.html": "sidebar-btn-resources",
    "/profile.html": "sidebar-btn-profile",
    "/settings.html": "sidebar-btn-settings",
  };
  const activeId = Object.entries(pathToId).find(([path]) => currentPath.endsWith(path))?.[1];
  if (activeId) {
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add("is-active");
  }

  // FASE 2: Configuração de UI e Traduções Locais do Hub
  initializeUI(uiState.language);
  updateSidebarTexts();

  // FASE 3: Injeção de Dados Dinâmicos (ORDEM GARANTIDA)
  await renderSidebarContent();

  // FASE 4: Inicializações Secundárias (Eventos e Gamificação)
  renderGamification();
  wireUIActions();
  initStudyNow({ startFilteredQuiz: startWeakestDomainQuiz });
  refreshStudyNow();

  // FASE 6: Learning Hub é a Home — exibe como tela inicial
  // Exclusivo do SPA (index.html): em páginas secundárias as screens já estão
  // visíveis por padrão no HTML estático e não devem ser ocultadas pelo Hub.
  if (isSPAPage()) {
    showLearningHub();
  }

  // Remove o boot overlay — a aplicação está pronta
  // O boot overlay só existe em index.html; em páginas secundárias não há nada a remover.
  const bootOverlay = document.getElementById("app-boot-overlay");
  if (bootOverlay) {
    bootOverlay.classList.add("fade-out");
    setTimeout(() => bootOverlay.remove(), 320);
  }

  // FASE 5: Setup de Certificação
  const certSelect = document.getElementById("certification-select");

  // SINCRONIZAÇÃO INICIAL DA CERTIFICAÇÃO
  // Alinha o <select> com a certificação persistida (aws_sim_cert) no
  // carregamento. Sem isso, a trilha (renderTrail lê aws_sim_cert) e o
  // startMission (lê certification-select) podem usar certificações diferentes
  // após um reload — ex.: trilha desenha cards "saa-1" enquanto o select está
  // em "clf-c02", e startMission("saa-1") não encontra o módulo na trilha CLF.
  if (certSelect && certificationPaths) {
    const savedCert = authenticatedUser ? authenticatedUser.certification : null;
    const savedCertIsValid =
      savedCert &&
      certificationPaths[savedCert] &&
      Array.from(certSelect.options).some((opt) => opt.value === savedCert);

    if (savedCertIsValid) {
      // Restaura a escolha anterior do usuário no controle visual.
      if (certSelect.value !== savedCert) certSelect.value = savedCert;
    } else if (certificationPaths[certSelect.value]) {
      // Primeira visita (ou valor inválido): persiste a certificação que o
      // select já exibe.
      userManager.updatePreferences({ certification: certSelect.value });
    }
  }

  if (
    certSelect &&
    certificationPaths &&
    certificationPaths[certSelect.value]
  ) {
    uiState.currentCertificationInfo = certificationPaths[certSelect.value];
    updateTopicDropdown();
    loadLastScore();
    updateDifficultyFilters(certSelect.value);
    updateMistakesControls(certSelect.value);
    checkActiveSession(certSelect.value);
  }

  // LISTENER: Mudança de Certificação
  if (certSelect) {
    certSelect.addEventListener("change", async () => {
      if (certificationPaths && certificationPaths[certSelect.value]) {
        uiState.currentCertificationInfo = certificationPaths[certSelect.value];

        const certId = certSelect.value;

        // 1. Salva a certificação no cache para as outras telas saberem
        userManager.updatePreferences({ certification: certId });

        updateTopicDropdown();
        loadLastScore();
        updateDifficultyFilters(certId);
        updateMistakesControls(certId);
        checkActiveSession(certId);

        // 2. Atualiza a Sprint para a nova certificação
        const badge = document.getElementById("sprint-current-cert-badge");
        if (badge) badge.innerText = certId.toUpperCase();

        renderSprintUI();
        renderJornadaDashboard(certId);

        // 3. A SINCRONIZAÇÃO
        updateSidebarProgress(); // Atualiza a caixa "O Meu Progresso" para o nome correto
        if (typeof renderTrail === "function") renderTrail(); // Atualiza a Trilha de Gamificação
        if (typeof renderBadges === "function") renderBadges(); // Atualiza as Insígnias

        // 4. Re-renderiza o gráfico global
        if (typeof renderGlobalRadarChart === "function") {
          await renderGlobalRadarChart();
        }
      }
    });
  }

  // Se for simulados.html e estiver em modo diagnóstico, inicia automaticamente
  if (!isSPAPage() && urlParams.get("mode") === "diagnostic") {
    const cert = normalizeCertificationId(urlParams.get("cert"));
    if (cert) {
      const certSelect = document.getElementById("certification-select");
      if (certSelect) certSelect.value = cert;
    }
    setTimeout(() => {
      startDiagnostic();
    }, 100);
  }

  // Se vier de jornada.html com ?mode=mission&stageId=..., inicia a missão automaticamente
  if (!isSPAPage() && urlParams.get("mode") === "mission") {
    const stageId = urlParams.get("stageId");
    const cert = normalizeCertificationId(urlParams.get("cert"));
    if (stageId) {
      if (cert) {
        const certSelect = document.getElementById("certification-select");
        if (certSelect) certSelect.value = cert;
      }
      setTimeout(() => {
        // Chama diretamente a lógica interna sem o redirecionamento de contexto
        startMissionInternal(stageId);
      }, 150);
    }
  }

  // LÓGICA DO DIAGNÓSTICO (Task 6.2): Auto-start quiz personalizado em simulados.html
  if (!isSPAPage() && window.location.pathname.includes("simulados.html")) {
    const diagnosticCtxStr = sessionStorage.getItem("aws_sim_diagnostic_context");
    if (diagnosticCtxStr) {
      try {
        const diagCtx = JSON.parse(diagnosticCtxStr);
        lastDiagnosticRecommendation = diagCtx; 
        
        const certSelect = document.getElementById("certification-select");
        if (certSelect && diagCtx.certificationId) {
          certSelect.value = diagCtx.certificationId;
        }
        
        setTimeout(() => {
          startPersonalizedDiagnosticQuiz();
        }, 150);
      } catch (e) {
        logger.error(e);
        sessionStorage.removeItem("aws_sim_diagnostic_context");
      }
    }
  }
});

// RENDERIZAÇÃO ORDENADA E SEQUENCIAL DA SIDEBAR
async function renderSidebarContent() {
  try {
    // BLOCO 1: Progresso do Usuário
    updateSidebarProgress();

    // BLOCO 2: Sprint de 14 Dias
    renderSprintUI();

    // BLOCO 3: Histórico de Quizzes
    updateHistoryDisplay();

    // BLOCO 4: Gráfico Radar Global (aguarda Chart.js)
    if (
      typeof Chart !== "undefined" &&
      typeof renderGlobalRadarChart === "function"
    ) {
      await renderGlobalRadarChart();
    }

    // BLOCO 5: Insight Dinâmico (Depende do histórico)
    const history = storageManager.getHistory();
    updateDynamicInsight(Array.isArray(history) ? history : []);
  } catch (error) {
    logger.error("Erro ao renderizar sidebar:", error);
  }
}

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener("click", handler);
  }
}

function setFinishButtonLoading(isLoading) {
  const btnFinish = document.getElementById("btn-finish");
  if (!btnFinish) return;

  btnFinish.disabled = isLoading;
  btnFinish.innerHTML = isLoading
    ? `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t("loading", uiState.language)}`
    : `${t("view_result", uiState.language)} <i class="fa-solid fa-flag-checkered ml-2" aria-hidden="true"></i>`;
}

function getActiveCertificationId() {
  const certSelect = document.getElementById("certification-select");
  const certValue =
    engine.state?.certId ||
    (certSelect && certSelect.value) ||
    (AuthService.getCurrentUser()?.certification) ||
    "clf-c02";

  return normalizeCertificationId(certValue);
}

function getMistakeSource() {
  const sourceByMode = {
    exam: "simulation",
    diagnostic: "diagnostic",
    review: "review",
    mission: "mission",
    boss: "mission",
    "mistakes-review": "mistakes-review",
  };

  return sourceByMode[uiState.currentMode] || "quiz";
}

function updateMistakesControls(certId = getActiveCertificationId()) {
  const btnPractice = document.getElementById("btn-practice-mistakes");
  const btnClear = document.getElementById("btn-clear-mistakes");
  const notice = document.getElementById("mistakes-feature-notice");
  const mistakes = storageManager.getMistakes(certId);
  const hasMistakes = mistakes.length > 0;

  if (btnPractice) btnPractice.classList.toggle("hidden", !hasMistakes);
  if (btnClear) btnClear.classList.toggle("hidden", !hasMistakes);
  if (notice && !hasMistakes) notice.classList.add("hidden");

  // Sincroniza badge na sidebar esquerda
  syncSidebarMistakesBadge(certId);
}

function syncMistakeRecord(question, result) {
  const certId = getActiveCertificationId();
  if (!certId || !question || !result) return;

  if (!result.isCorrect) {
    // Em revisão de erros, errar novamente não cria novo registro, a questão já está pendente, só permanece.
    if (uiState.currentMode !== "mistakes-review") {
      storageManager.recordMistake(question, uiState.tempSelectedAnswer, {
        certId,
        source: getMistakeSource(),
        attemptId: engine.state?.attemptId,
        quizId: quizManager.currentQuizId,
      });
    }
  } else if (
    uiState.currentMode === "review" ||
    uiState.currentMode === "mistakes-review"
  ) {
    storageManager.removeMistake(question, certId);
  }

  updateMistakesControls(certId);
}

function resetFinishState() {
  uiState.isFinishing = false;
  uiState.hasFinished = false;
  uiState.flags = [];
  setFinishButtonLoading(false);
}

/**
 * Suprime temporariamente o efeito hover nos option-cards e botões de ação
 * do quiz após navegação por teclado (Enter). Remove a supressão assim que
 * o mouse se mover, garantindo que o hover volta a funcionar normalmente.
 */
function suppressHover() {
  const targets = [
    document.getElementById("options-container"),
    document.getElementById("btn-submit"),
    document.getElementById("btn-next"),
    document.getElementById("btn-finish"),
  ];
  targets.forEach((el) => el?.classList.add("no-hover"));

  const cleanup = () => {
    targets.forEach((el) => el?.classList.remove("no-hover"));
    document.removeEventListener("mousemove", cleanup);
  };
  document.addEventListener("mousemove", cleanup, { once: true });
}

function wireUIActions() {
  bindClick("home-trigger", goHome);
  bindClick("btn-language", toggleLanguage);
  bindClick("theme-toggle", toggleDarkMode);
  bindClick("btn-start-quiz", startQuiz);
  bindClick("btn-start-journey", startJornada);
  bindClick("btn-start-flashcards", startFlashcards);
  bindClick("btn-practice-mistakes", startMistakesQuiz);
  bindClick("btn-clear-mistakes", clearMistakes);
  bindClick("btn-flag", toggleFlag);
  bindClick("btn-cancel", cancelQuiz);
  bindClick("btn-submit", submitAnswer);
  bindClick("btn-next", nextQuestion);
  bindClick("btn-finish", finishQuiz);
  bindClick("btn-generate-report", generatePerformanceReport);
  bindClick("btn-retake-quiz", retakeQuiz);
  bindClick("btn-results-home", goHome);
  bindClick("btn-prev-flashcard", prevFlashcard);
  bindClick("btn-next-flashcard", nextFlashcard);
  bindClick("btn-flashcards-home", goHome);
  bindClick("btn-clear-history", clearHistory);
  bindClick("btn-start-diagnostic", startDiagnostic);
  bindClick(
    "btn-start-personalized-diagnostic-quiz",
    startPersonalizedDiagnosticQuiz,
  );
  bindClick("sprint-start-btn", startMicroSprint);

  // ── SIDEBAR ESQUERDA ──────────────────────────────────────────────────────
  // Os itens da sidebar com 'action' já têm listeners registrados pelo shell.js
  // via _createSidebarItem(). As funções estão expostas em window.* abaixo para
  // que o shell.js possa chamá-las corretamente via window[item.action].
  // NÃO duplicar os bindClick aqui para evitar chamadas duplas.
  // Nota: o toggle da sidebar (cloud-sidebar-toggle) é gerenciado por
  // initLeftSidebarToggleShell() em shell.js, que usa a chave "sidebar_closed".
  // ─────────────────────────────────────────────────────────────────────────

  const flashcardContainer = document.getElementById("flashcard-container");
  if (flashcardContainer) {
    flashcardContainer.addEventListener("click", flipFlashcard);
    flashcardContainer.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipFlashcard();
      }
    });
  }

  // Atalho de teclado: Enter para "Confirmar Resposta" ou "Próxima"
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    // Ignora se o foco estiver em um input, textarea ou botão (evita conflitos)
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;

    const btnSubmit = document.getElementById("btn-submit");

    const submitVisible =
      btnSubmit &&
      !btnSubmit.classList.contains("hidden") &&
      !btnSubmit.disabled;

    if (submitVisible) {
      event.preventDefault();
      submitAnswer();
      document.activeElement?.blur();
      suppressHover();
    }
  });
}

// MOTOR DO QUIZ E TIMER

function checkActiveSession(certId) {
  const btn = document.getElementById("btn-start-quiz");
  if (!btn) return;
  const activeSession = storageManager.loadActiveSession(certId);
  if (activeSession) {
    btn.innerHTML = `${t("resume_simulation", uiState.language) || "Retomar Simulado"} <i class="fa-solid fa-play ml-2"></i>`;
    btn.classList.add("bg-orange-500");
    btn.classList.remove("bg-aws-orange");
  } else {
    btn.innerHTML = `${t("start_simulation", uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>`;
    btn.classList.add("bg-aws-orange");
    btn.classList.remove("bg-orange-500");
  }
}

async function startWeakestDomainQuiz(domainId, certId) {
  if (!domainId) return;

  const certSelect = document.getElementById("certification-select");
  const topicSelect = document.getElementById("topic-filter");

  if (certSelect && certId && certificationPaths[certId]) {
    if (certSelect.value !== certId) {
      certSelect.value = certId;
      userManager.updatePreferences({ certification: certId });
      uiState.currentCertificationInfo = certificationPaths[certId];
      updateTopicDropdown();
      loadLastScore();
      updateDifficultyFilters(certId);
    }
  }

  if (topicSelect) {
    const hasOption = Array.from(topicSelect.options).some(
      (opt) => opt.value === domainId,
    );
    if (hasOption) topicSelect.value = domainId;
  }

  await startQuiz();
}

async function startQuiz() {
  resetFinishState();

  const certSelect = document.getElementById("certification-select");
  const quantityInput =
    document.querySelector('input[name="question-quantity"]:checked')?.value || 10;
  const difficultyInput =
    document.querySelector('input[name="difficulty-level"]:checked')?.value || "all";
  const modeInput =
    document.querySelector('input[name="quiz-mode"]:checked')?.value || "exam";
  const topicSelect = document.getElementById("topic-filter")?.value || "";
  
  if (!certSelect) return;

  const btn = document.getElementById("btn-start-quiz");
  let hideLoading = null;

  try {
    const certId = certSelect.value;
    const currentCertInfo = certificationPaths[certId];
    uiState.currentCertificationInfo = currentCertInfo;

    // 1. VERIFICAR SESSÃO ATIVA (E PERGUNTAR) ANTES DE TRAVAR A TELA COM O LOADING
    const activeSession = storageManager.loadActiveSession(certId);
    let isResuming = false;
    let resumeAgreed = false;

    if (activeSession) {
      // Correção rápida para o texto não ficar aparecendo "resume_session_prompt"
      let promptMsg = t("resume_session_prompt", uiState.language);
      if (!promptMsg || promptMsg === "resume_session_prompt") {
         promptMsg = "Você possui um simulado em andamento. Deseja retomá-lo de onde parou?";
      }

      resumeAgreed = await ModalService.confirm({
        title: "Sessão Ativa Encontrada",
        message: promptMsg,
        confirmText: "Retomar",
        cancelText: "Descartar",
      });
    }

    // 2. AGORA SIM, O USUÁRIO JÁ RESPONDEU! PODEMOS ATIVAR O LOADING E TRAVAR O BOTÃO
    if (btn) btn.disabled = true;
    hideLoading = ModalService.showLoading(
      t("loading", uiState.language) || "Carregando simulado...",
    );

    if (activeSession && resumeAgreed) {
      isResuming = true;
      quizManager.currentQuizId = activeSession.quizId; // RESTORE QUIZ ID
      engine.state.certId = activeSession.certId;
      engine.state.mode = activeSession.mode || "exam";
      engine.state.questions = activeSession.questions;
      engine.state.answers = activeSession.answers;
      engine.state.currentIndex = activeSession.currentIndex;
      engine.state.score = activeSession.score;
      engine.state.domainScores = activeSession.domainScores || {};

      uiState.currentMode = activeSession.mode || "exam";
      uiState.timeRemaining = activeSession.timeRemaining;
      uiState.flags = activeSession.flags || [];
      logger.info(`Resuming session for ${certId}`);
    } else {
      if (activeSession) {
        storageManager.clearActiveSession(certId);
      }
      uiState.currentMode = modeInput;
    }

    let preloadedQuestions = null;

    if (!isResuming) {
      // START QUIZ ON BACKEND OR LOCALLY
      try {
        const quizResponse = await quizManager.startQuiz(
          certId,
          parseInt(quantityInput),
          uiState.language
        );
        preloadedQuestions = quizResponse.questions;
        
        if (!quizResponse.fromAPI) {
          logger.info("⚠ Quiz started in local mode (API unavailable or offline)");
        }
      } catch (error) {
        logger.warn("Could not start quiz:", error);
      }

      dispatchBusinessEvent("QuizStarted", {
        certId,
        mode: modeInput,
        quantity: quantityInput,
      });
      const filters = {
        quantity: parseInt(quantityInput),
        difficulty: difficultyInput,
        topic: topicSelect,
        mode: modeInput,
      };

      const result = await engine.loadQuestions(
        certId,
        currentCertInfo.domains,
        filters,
        uiState.language,
        preloadedQuestions
      );

      if (!result.success) {
        alert(
          t("error_loading_questions", uiState.language, {
            message: result.message,
          }),
        );
        return;
      }

      let tempoPorQuestao = 90;
      if (certId === "saa-c03" || certId === "dva-c02") {
        tempoPorQuestao = 120;
      } else if (certId === "clf-c02") {
        tempoPorQuestao = 83;
      } else if (certId === "aif-c01") {
        tempoPorQuestao = 110;
      }

      uiState.timeRemaining = result.totalQuestions * tempoPorQuestao;
      uiState.flags = []; // Reseta flags de revisão
    }

    const oldReport = document.getElementById("detailed-report");
    if (oldReport) oldReport.remove();

    // --- INÍCIO DAS MODIFICAÇÕES DE LAYOUT ---
    showScreen("quiz");

    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");
    const missionHud = document.getElementById("mission-hud");
    const timerContainer = document.getElementById("timer-container");

    if (sidebar) sidebar.classList.add("hidden"); // Esconde a lateral
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3"); // Remove a largura parcial
      mainSection.classList.add("w-full"); // Faz ocupar a tela cheia
    }

    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";
    // --- FIM DAS MODIFICAÇÕES DE LAYOUT ---

    // Controle Estrito de HUDs (Timer Global vs HUD de Missão)
    if (uiState.currentMode === "mission" || uiState.currentMode === "boss") {
      // Se for uma missão recuperada
      if (timerContainer) timerContainer.classList.add("hidden");
      if (missionHud) {
        missionHud.classList.remove("hidden");
        updateHeartsUI(); 
      }
      startQuestionTimer(); 
    } else if (uiState.currentMode === "exam") {
      // Se for um Simulado Normal (Exame)
      if (missionHud) missionHud.classList.add("hidden"); // Força o HUD da missão a sumir
      if (timerContainer) timerContainer.classList.remove("hidden");
      startTimer();
    } else {
      // Modo revisão (Sem tempo e sem vidas)
      if (missionHud) missionHud.classList.add("hidden");
      if (timerContainer) timerContainer.classList.add("hidden");
    }

    loadQuestionUI();
    saveCurrentSession();
  } catch (err) {
    if (hideLoading) hideLoading();
    NotificationService.error(
      t("error_starting_quiz", uiState.language, { message: err.message }),
    );
    logger.error("Erro ao iniciar quiz:", err);
  } finally {
    if (hideLoading) hideLoading();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${t("start_simulation", uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>`;
    }
  }
}

// MOTOR DO DIAGNÓSTICO (NIVELAMENTO)
async function startDiagnostic() {
  resetFinishState();

  const certSelect = document.getElementById("certification-select");
  if (!certSelect) return;
  
  if (isSPAPage()) {
    window.location.href = `simulados.html?mode=diagnostic&cert=${certSelect.value}`;
    return;
  }

  const btn = document.getElementById("btn-start-diagnostic");
  let hideLoading = null;

  if (btn) btn.disabled = true;
  hideLoading = ModalService.showLoading(
    t("loading", uiState.language) || "Carregando diagnóstico...",
  );

  try {
    const certId = certSelect.value;
    const currentCertInfo = certificationPaths[certId];
    uiState.currentCertificationInfo = currentCertInfo;
    uiState.currentMode = "diagnostic";

    const result = await engine.loadDiagnostic(
      certId,
      currentCertInfo.domains,
      uiState.language,
    );

    if (!result.success) {
      alert("Erro ao carregar o teste de nivelamento: " + result.message);
      return;
    }

    // --- PREPARAÇÃO DO LAYOUT (Semelhante ao startQuiz, mas sem timer) ---
    showScreen("quiz");

    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");

    if (sidebar) sidebar.classList.add("hidden");
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3");
      mainSection.classList.add("w-full");
    }

    // Esconde timers e corações (Diagnóstico não tem punição de tempo/vida)
    const timerContainer = document.getElementById("timer-container");
    if (timerContainer) timerContainer.classList.add("hidden");

    const missionHud = document.getElementById("mission-hud");
    if (missionHud) missionHud.classList.add("hidden");

    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";

    loadQuestionUI();
    saveCurrentSession();
  } catch (err) {
    if (hideLoading) hideLoading();
    NotificationService.error(
      t("error_starting_quiz", uiState.language, { message: err.message }),
    );
    logger.error("Erro ao iniciar diagnóstico:", err);
  } finally {
    if (hideLoading) hideLoading();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-stethoscope mr-2"></i>${t("start_diagnostic", uiState.language)}`;
    }
  }
}

async function startPersonalizedDiagnosticQuiz() {
  resetFinishState();

  if (
    !lastDiagnosticRecommendation ||
    !lastDiagnosticRecommendation.certificationId ||
    !Array.isArray(lastDiagnosticRecommendation.weakDomains) ||
    lastDiagnosticRecommendation.weakDomains.length === 0
  ) {
    alert(t("diagnostic_not_enough_data", uiState.language));
    return;
  }

  const certId = lastDiagnosticRecommendation.certificationId;
  const currentCertInfo = certificationPaths[certId];

  if (!currentCertInfo || !Array.isArray(currentCertInfo.domains)) {
    alert(t("diagnostic_not_enough_data", uiState.language));
    return;
  }

  const btn = document.getElementById("btn-start-personalized-diagnostic-quiz");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t("loading", uiState.language)}`;
  }

  try {
    const certSelect = document.getElementById("certification-select");
    if (certSelect && certSelect.value !== certId) {
      certSelect.value = certId;
      userManager.updatePreferences({ certification: certId });
      uiState.currentCertificationInfo = currentCertInfo;
      updateTopicDropdown();
      loadLastScore();
      updateDifficultyFilters(certId);
    }

    uiState.currentCertificationInfo = currentCertInfo;
    uiState.currentMode = "review";

    const weakDomainIds = getQuizDomainIdsForDiagnosticDomains(
      lastDiagnosticRecommendation.weakDomains.map((domain) => domain.id),
      certId,
    );

    const result = await engine.loadPersonalizedQuestions(
      certId,
      currentCertInfo.domains,
      weakDomainIds,
      10,
      uiState.language,
    );

    if (!result.success || result.totalQuestions === 0) {
      alert(
        t("personalized_quiz_unavailable", uiState.language, {
          message: result.message || "",
        }),
      );
      return;
    }

    showScreen("quiz");

    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");

    if (sidebar) sidebar.classList.add("hidden");
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3");
      mainSection.classList.add("w-full");
    }

    const timerContainer = document.getElementById("timer-container");
    if (timerContainer) timerContainer.classList.add("hidden");

    const missionHud = document.getElementById("mission-hud");
    if (missionHud) missionHud.classList.add("hidden");

    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";

    loadQuestionUI();
  } catch (err) {
    logger.error("Erro ao iniciar simulado personalizado:", err);
    alert(
      t("personalized_quiz_unavailable", uiState.language, {
        message: err.message,
      }),
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${t("practice_weak_domains", uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>`;
    }
  }
}

function startTimer() {
  startExamTimer(uiState, () => {
    alert(t("time_up", uiState.language));
    finishQuiz();
  });
}

// UI DE QUESTÕES E MÚLTIPLAS ESCOLHAS

// Retorna o tooltip global de validação
function getValidationTooltip() {
  const TOOLTIP_ID = "validation-tooltip-global";
  let tooltip = document.getElementById(TOOLTIP_ID);
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.className = "validation-tooltip arrow-down";
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

// Inicializa o tooltip do badge de validação
function initValidationBadgeTooltip(badge, text) {
  const GAP = 8;
  const MARGIN = 12;

  badge._tooltipAbortController?.abort();
  const { signal } = (badge._tooltipAbortController = new AbortController());

  const tooltip = getValidationTooltip();

  function showTooltip() {
    tooltip.textContent = text;
    tooltip.classList.remove("arrow-up", "arrow-down", "is-visible");
    tooltip.style.visibility = "hidden";
    tooltip.style.display = "block";

    const {
      top: bTop,
      bottom: bBottom,
      left: bLeft,
      width: bWidth,
    } = badge.getBoundingClientRect();
    const ttWidth = tooltip.offsetWidth;
    const ttHeight = tooltip.offsetHeight;
    const centerX = bLeft + bWidth / 2;

    const placeAbove =
      bTop >= ttHeight + GAP || bTop >= window.innerHeight - bBottom;
    const top = placeAbove ? bTop - ttHeight - GAP : bBottom + GAP;
    tooltip.classList.add(placeAbove ? "arrow-down" : "arrow-up");

    const left = Math.max(
      MARGIN,
      Math.min(centerX - ttWidth / 2, window.innerWidth - ttWidth - MARGIN),
    );
    const arrowPct = Math.max(
      10,
      Math.min(90, ((centerX - left) / ttWidth) * 100),
    );

    Object.assign(tooltip.style, {
      top: `${top}px`,
      left: `${left}px`,
      visibility: "",
      display: "",
    });
    tooltip.style.setProperty("--arrow-left", `${arrowPct}%`);

    requestAnimationFrame(() => tooltip.classList.add("is-visible"));
  }

  function hideTooltip() {
    tooltip.classList.remove("is-visible");
  }

  // Mouse / teclado (desktop)
  badge.addEventListener("mouseenter", showTooltip, { signal });
  badge.addEventListener("mouseleave", hideTooltip, { signal });
  badge.addEventListener("focus", showTooltip, { signal });
  badge.addEventListener("blur", hideTooltip, { signal });

  // Touch (mobile): toca no badge alterna; toca fora fecha
  badge.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      tooltip.classList.contains("is-visible") ? hideTooltip() : showTooltip();
    },
    { passive: false, signal },
  );

  document.addEventListener(
    "touchstart",
    (e) => {
      if (!badge.contains(e.target) && !tooltip.contains(e.target))
        hideTooltip();
    },
    { passive: true, signal },
  );
}

function loadQuestionUI() {
  const q = engine.getCurrentQuestion();
  const progress = engine.getProgress();
  const isMulti = Array.isArray(q.correct);

  // ==========================================
  // TRAVA DE SEGURANÇA DO HUD DE MISSÃO
  // ==========================================
  const missionHud = document.getElementById("mission-hud");
  if (missionHud) {
    // Só exibe a meta de 80% e a barra vermelha se for estritamente uma Missão da Jornada.
    // Simulado normal (exam), Diagnóstico e Boss Fight ficarão com a tela limpa.
    if (uiState.currentMode === "mission") {
      missionHud.style.setProperty("display", "flex", "important");
    } else {
      missionHud.style.setProperty("display", "none", "important");
    }
  }
  // ==========================================

  const categoryElement = document.getElementById("question-category");
  if (categoryElement) {
    categoryElement.textContent = getDomainName(q.domain);

    const oldBadge = document.getElementById("question-validation-badge");
    if (oldBadge) oldBadge.remove();

    if (q.validated_by) {
      const badge = document.createElement("span");
      badge.id = "question-validation-badge";
      badge.className = "validation-badge";

      const isValidatedText =
        uiState.language === "en" ? "Validated" : "Validada";
      const tooltipText =
        uiState.language === "en"
          ? `Validated by specialist: ${q.validated_by}`
          : `Validada por especialista: ${q.validated_by}`;

      badge.innerHTML = `<i class="fa-solid fa-circle-check mr-1" style="color: var(--a3-success);" aria-hidden="true"></i> ${isValidatedText}`;
      badge.setAttribute("aria-label", tooltipText);
      badge.setAttribute("role", "tooltip");

      initValidationBadgeTooltip(badge, tooltipText);

      categoryElement.parentNode.insertBefore(
        badge,
        categoryElement.nextSibling,
      );
    }
  }

  const questionText = isMulti
    ? `${q.question} <br><span class="text-sm text-aws-orange italic mt-2 block">(${t("choose_options", uiState.language, { count: q.correct.length })})</span>`
    : q.question;
  document.getElementById("question-text").innerHTML =
    sanitizeHTML(questionText);

  document.getElementById("current-q-num").textContent = progress.current;
  document.getElementById("total-q-num").textContent = progress.total;

  const progressBar = document.getElementById("progress-bar");
  if (progressBar) progressBar.style.width = `${progress.percentage}%`;

  uiState.tempSelectedAnswer = isMulti ? [] : null;

  renderOptionsUI(q);

  const btnSubmit = document.getElementById("btn-submit");
  const explanationBox = document.getElementById("explanation-box");
  const btnNext = document.getElementById("btn-next");
  const btnFinish = document.getElementById("btn-finish");

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.classList.remove("hidden");
  }
  if (explanationBox) explanationBox.classList.add("hidden");
  if (btnNext) btnNext.classList.add("hidden");
  if (btnFinish) {
    btnFinish.classList.add("hidden");
    setFinishButtonLoading(false);
  }

  const flagBtn = document.getElementById("btn-flag");
  if (flagBtn) {
    if (uiState.flags.includes(progress.current - 1)) {
      flagBtn.classList.add("text-orange-500");
    } else {
      flagBtn.classList.remove("text-orange-500");
    }
  }

  updateScoreDisplayUI();
}

function renderOptionsUI(question) {
  const container = document.getElementById("options-container");
  container.innerHTML = "";
  const isMulti = Array.isArray(question.correct);

  question.options.forEach((opt, idx) => {
    const card = document.createElement("div");
    card.id = `option-${idx}`;
    card.className = "a3-option";

    card.innerHTML = `
            <div class="a3-option-letter">
                ${String.fromCharCode(65 + idx)}
            </div>
            <div class="a3-option-text">
                ${opt}
            </div>
        `;

    card.onclick = () => {
      const isAnswered =
        !document.getElementById("btn-next").classList.contains("hidden") ||
        !document.getElementById("btn-finish").classList.contains("hidden");
      if (isAnswered) return;

      if (!isMulti) {
        document.querySelectorAll(".a3-option").forEach((c) => {
          c.classList.remove("a3-option-selected");
        });

        card.classList.add("a3-option-selected");

        uiState.tempSelectedAnswer = idx;
        document.getElementById("btn-submit").disabled = false;
      } else {
        const isSelected = card.classList.contains("a3-option-selected");

        if (isSelected) {
          card.classList.remove("a3-option-selected");
          uiState.tempSelectedAnswer = uiState.tempSelectedAnswer.filter(
            (i) => i !== idx,
          );
        } else {
          if (uiState.tempSelectedAnswer.length < question.correct.length) {
            card.classList.add("a3-option-selected");
            uiState.tempSelectedAnswer.push(idx);
          }
        }
        document.getElementById("btn-submit").disabled =
          uiState.tempSelectedAnswer.length !== question.correct.length;
      }
    };

    container.appendChild(card);
  });
}

function submitAnswer() {
  const question = engine.getCurrentQuestion();
  const isMulti = Array.isArray(question.correct);
  const result = engine.submitAnswer(uiState.tempSelectedAnswer);

  dispatchBusinessEvent("AnswerSubmitted", {
    questionId: question.id,
    isCorrect: result.isCorrect,
    domain: question.domain,
  });

  syncMistakeRecord(question, result);

  // Record answer to backend asynchronously (don't block UI)
  if (quizManager.currentQuizId && question.id) {
    quizManager
      .recordAnswer({
        question_id: question.id,
        user_answer: uiState.tempSelectedAnswer,
        is_correct: result.isCorrect,
        time_secs: 0, // Could be enhanced with actual timer
      })
      .catch((error) => {
        logger.warn("Failed to record answer:", error);
        // UI continues anyway
      });
  }

  if (uiState.currentMode === "mission") {
    clearInterval(uiState.qTimerInterval); // Para o relógio enquanto lê a explicação

    if (!result.isCorrect) {
      uiState.lives--;
      updateHeartsUI();

      if (uiState.lives <= 0) {
        setTimeout(
          () => handleMissionFailure("Você perdeu todos os corações!"),
          500,
        );
        return; // Interrompe para não deixar avançar
      }
    }
  }

  const btnSubmit = document.getElementById("btn-submit");
  if (btnSubmit) btnSubmit.classList.add("hidden");

  document
    .querySelectorAll(".a3-option")
    .forEach((card) => card.classList.add("opacity-70"));

  if (!isMulti) {
    const userSelectedIdx = uiState.tempSelectedAnswer;
    const correctIdx = question.correct;
    const isCorrect = userSelectedIdx === correctIdx;

    if (isCorrect) {
      applyStyleToOptionCard(userSelectedIdx, "correct");
    } else {
      applyStyleToOptionCard(userSelectedIdx, "incorrect");
      applyStyleToOptionCard(correctIdx, "correct");
    }
  } else {
    const userSelections = uiState.tempSelectedAnswer;
    const correctAnswers = question.correct;

    question.options.forEach((_, optionIdx) => {
      const isSelectedByUser = userSelections.includes(optionIdx);
      const isTrulyCorrect = correctAnswers.includes(optionIdx);

      if (isSelectedByUser) {
        applyStyleToOptionCard(
          optionIdx,
          isTrulyCorrect ? "correct" : "incorrect",
        );
      } else if (isTrulyCorrect) {
        applyStyleToOptionCard(optionIdx, "correct");
      }
    });
  }

  const expBox = document.getElementById("explanation-box");
  if (!expBox) return;

  const docLink = result.referenceUrl
    ? `<a href="${result.referenceUrl}" target="_blank" class="mt-3 inline-block text-orange-600 font-bold hover:underline">
            <i class="fa-solid fa-book-open mr-1"></i> ${t("see_official_docs", uiState.language)}
         </a>`
    : "";

  const titleEl = expBox.querySelector("h4");
  const textEl = document.getElementById("explanation-text");

  if (titleEl) {
    titleEl.innerHTML = result.isCorrect
      ? `<i class="fa-solid fa-check"></i> ${t("correct", uiState.language)}`
      : `<i class="fa-solid fa-xmark"></i> ${t("incorrect", uiState.language)}`;
    titleEl.className = result.isCorrect
      ? "font-bold text-green-600 mb-3"
      : "font-bold text-red-600 mb-3";
  }

  let feedbackHTML = "";
  if (!result.isCorrect) {
    let userText = isMulti
      ? uiState.tempSelectedAnswer
          .map((i) => question.options[i])
          .join("<br>• ")
      : question.options[uiState.tempSelectedAnswer];
    feedbackHTML += `<div class="a3-feedback a3-feedback-error mb-2"><strong>${t("your_answer", uiState.language)}</strong><br>• ${userText}</div>`;
  }
  let correctText = isMulti
    ? question.correct.map((i) => question.options[i]).join("<br>• ")
    : question.options[result.correctIndex];
  feedbackHTML += `<div class="a3-feedback a3-feedback-success mb-3"><strong>${t("correct_answer", uiState.language)}</strong><br>• ${correctText}</div>`;
  feedbackHTML += `<div class="a3-feedback mt-2"><strong>${t("why", uiState.language)}</strong><br>${result.explanation}</div>`;

  if (textEl) textEl.innerHTML = `${feedbackHTML} ${docLink}`;
  expBox.classList.remove("hidden");

  const btnNext = document.getElementById("btn-next");
  const btnFinish = document.getElementById("btn-finish");

  if (!result.isFinished) {
    if (btnNext) btnNext.classList.remove("hidden");
  } else {
    if (btnFinish) btnFinish.classList.remove("hidden");
  }

  updateScoreDisplayUI();
  saveCurrentSession();
}

function applyStyleToOptionCard(optionIdx, styleType) {
  const card = document.getElementById(`option-${optionIdx}`);
  if (!card) return;

  card.classList.remove("a3-option-selected", "opacity-70");

  if (styleType === "correct") {
    card.classList.add("a3-option-correct", "opacity-100");
  } else if (styleType === "incorrect") {
    card.classList.add("a3-option-wrong", "opacity-100");
  }
}

function saveCurrentSession() {
  if (!engine.state.certId) return;
  storageManager.saveActiveSession({
    quizId: quizManager.currentQuizId,
    certId: engine.state.certId,
    mode: engine.state.mode,
    questions: engine.state.questions,
    answers: engine.state.answers,
    currentIndex: engine.state.currentIndex,
    score: engine.state.score,
    domainScores: engine.state.domainScores,
    timeRemaining: uiState.timeRemaining,
    flags: uiState.flags,
  });
}

function nextQuestion() {
  if (engine.nextQuestion()) {
    loadQuestionUI();
    saveCurrentSession();
  }

  if (uiState.currentMode === "mission") {
    startQuestionTimer();
  }
}

function finishQuiz() {
  // Trava para evitar execução múltipla por cliques rápidos
  if (uiState.isFinishing || uiState.hasFinished) return;
  uiState.isFinishing = true;
  uiState.hasFinished = true;

  setFinishButtonLoading(true);

  if (uiState.timerInterval) clearInterval(uiState.timerInterval);
  if (uiState.qTimerInterval) clearInterval(uiState.qTimerInterval);

  storageManager.clearActiveSession(engine.state.certId);

  saveQuizResult();
  updateHistoryDisplay();
  loadLastScore();
  updateSidebarProgress();

  if (typeof renderGlobalRadarChart === "function") {
    renderGlobalRadarChart();
  }

  if (typeof renderBadges === "function") renderBadges();

  const results = engine.getFinalResults();
  const btnNextMission = document.getElementById("btn-next-mission");
  if (btnNextMission) btnNextMission.classList.add("hidden");

  // --- LÓGICA DE GAMIFICAÇÃO ---
  if (uiState.currentMode === "mission" || uiState.currentMode === "boss") {
    if (results && results.percentage >= engine.passingScore) {
      const stageId = uiState.currentMissionStageId;

      if (stageId) {
        if (typeof window.unlockNextModule === "function") {
          window.unlockNextModule(stageId);
        }
      }

      if (typeof renderTrail === "function") renderTrail();

      if (btnNextMission) {
        btnNextMission.classList.remove("hidden");
        btnNextMission.onclick = () => {
          startJornada();
        };
      }
    }

    // Restaura estados para o simulador normal
    engine.passingScore = 70;
    uiState.currentMode = "exam";
    uiState.currentMissionStageId = null;
  }

  showResultsScreen();
  refreshStudyNow();
  uiState.isFinishing = false;
}

function toggleFlag() {
  const flagBtn = document.getElementById("btn-flag");
  if (!flagBtn) return;

  const currentIdx = engine.state.currentIndex;
  const question = engine.state.questions[currentIdx];
  const certId = getActiveCertificationId();

  if (uiState.flags.includes(currentIdx)) {
    uiState.flags = uiState.flags.filter((i) => i !== currentIdx);
    flagBtn.classList.remove("text-orange-500");
    storageManager.removeReviewQuestion(certId, question);
  } else {
    uiState.flags.push(currentIdx);
    flagBtn.classList.add("text-orange-500");
    storageManager.addReviewQuestion(certId, question);
  }
}

//  TELAS E RELATÓRIOS

function showScreen(screenName) {
  const screens = ["hub", "start", "quiz", "results", "flashcards", "jornada"];
  screens.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("fade-in"); // reset para próxima transição
    }
  });
  const target = document.getElementById(`screen-${screenName}`);
  if (target) {
    target.classList.remove("hidden");
    // Force reflow para garantir que a animação reinicia
    void target.offsetWidth;
    target.classList.add("flex", "flex-col", "fade-in");
  }

  // Restaura sidebar direita e layout ao sair do hub (exceto quiz que gerencia o próprio layout)
  if (screenName !== "hub" && screenName !== "quiz") {
    const sideInfo = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");
    if (sideInfo) sideInfo.classList.remove("hidden");
    if (mainSection) {
      mainSection.classList.add("lg:w-2/3");
      mainSection.classList.remove("w-full");
    }
  }

  updateSidebarActiveItem(screenName);
}

// ── LEARNING HUB ───────────────────────────────────────────────────────────

function showLearningHub() {
  // Esconde a sidebar direita — o hub ocupa toda a área principal
  const sidebar = document.getElementById("side-info");
  const mainSection = document.getElementById("main-section");
  const scoreContainer = document.getElementById("score-container");
  const missionHud = document.getElementById("mission-hud");

  if (sidebar) sidebar.classList.add("hidden");
  if (mainSection) {
    mainSection.classList.remove("lg:w-2/3");
    mainSection.classList.add("w-full");
  }
  if (scoreContainer) scoreContainer.style.display = "none";
  if (missionHud) missionHud?.classList.add("hidden");

  showScreen("hub");
  renderLearningHubData();
}

function renderLearningHubData() {
  const history = storageManager.getHistory();
  const safeHistory = Array.isArray(history) ? history : [];
  const gamification = storageManager.getGamification();
  const certId = getActiveCertificationId() || "clf-c02";
  const mistakes = storageManager.getMistakes(certId);

  // ── Empty state para primeiro acesso ──
  const metricsCard = document.querySelector(".lh-metrics-card");
  const emptyStateId = "lh-empty-state";
  const existingEmpty = document.getElementById(emptyStateId);

  if (safeHistory.length === 0) {
    // Injeta empty state acima do metrics card se ainda não existe
    if (metricsCard && !existingEmpty) {
      const emptyEl = document.createElement("div");
      emptyEl.id = emptyStateId;
      emptyEl.className = "lh-empty-state";
      emptyEl.innerHTML = `
        <div class="lh-empty-icon" aria-hidden="true">
          <i class="fa-solid fa-rocket"></i>
        </div>
        <p class="lh-empty-title">Bem-vindo à Cloud Academy A3!</p>
        <p class="lh-empty-desc">
          Você ainda não realizou nenhum simulado. Comece agora e acompanhe
          sua evolução para as certificações AWS.
        </p>
        <button class="a3-btn a3-btn-primary lh-empty-cta" onclick="showLearningHubQuickStart()">
          <i class="fa-solid fa-play"></i>
          Iniciar primeiro simulado
        </button>
      `;
      metricsCard.parentNode.insertBefore(emptyEl, metricsCard);
    }
    // Esconde o metrics card quando não há dados
    if (metricsCard) metricsCard.classList.add("hidden");
  } else {
    // Remove o empty state se já foi realizado algum simulado
    if (existingEmpty) existingEmpty.remove();
    if (metricsCard) metricsCard.classList.remove("hidden");
  }

  // ── Melhor nota ──
  const bestEl = document.getElementById("hub-best-score");
  const bestHintEl = document.getElementById("hub-best-score-hint");
  if (bestEl) {
    if (safeHistory.length > 0) {
      const best = Math.max(...safeHistory.map((h) => h.percentage || 0));
      const awsScale = Math.floor((best / 100) * 900) + 100;
      bestEl.textContent = String(awsScale);
      if (bestHintEl) bestHintEl.textContent = `${best.toFixed(0)}% de acerto`;
    } else {
      bestEl.textContent = "—";
      if (bestHintEl) bestHintEl.textContent = "sem histórico";
    }
  }

  // ── Média geral ──
  const avgEl = document.getElementById("hub-avg-score");
  const avgHintEl = document.getElementById("hub-avg-score-hint");
  if (avgEl) {
    if (safeHistory.length > 0) {
      const avg =
        safeHistory.reduce((s, h) => s + (h.percentage || 0), 0) /
        safeHistory.length;
      const awsAvg = Math.floor((avg / 100) * 900) + 100;
      avgEl.textContent = String(awsAvg);
      if (avgHintEl) avgHintEl.textContent = `${avg.toFixed(0)}% média`;
    } else {
      avgEl.textContent = "—";
      if (avgHintEl) avgHintEl.textContent = "sem histórico";
    }
  }

  // ── Sequência ──
  const streakEl = document.getElementById("hub-streak");
  if (streakEl) {
    streakEl.textContent = String(gamification?.currentStreak || 0);
  }

  // ── Accuracy e Questões Globais ──
  const accEl = document.getElementById("jornada-accuracy");
  const qCountEl = document.getElementById("jornada-questions");
  if (safeHistory.length > 0) {
    const totalQ = safeHistory.reduce((acc, h) => acc + (h.total || 0), 0);
    const totalS = safeHistory.reduce((acc, h) => acc + (h.score || 0), 0);
    const acc = totalQ > 0 ? Math.round((totalS / totalQ) * 100) : 0;
    if (accEl) accEl.textContent = `${acc}%`;
    if (qCountEl) qCountEl.textContent = String(totalQ);
  } else {
    if (accEl) accEl.textContent = "0%";
    if (qCountEl) qCountEl.textContent = "0";
  }

  // ── Progresso Global (Sprint) ──
  const progEl = document.getElementById("jornada-progress");
  if (progEl) {
    const lastCert = safeHistory.length > 0 ? safeHistory[safeHistory.length - 1].certId : "clf-c02";
    const sprintState = storageManager.getSprintState(lastCert);
    const sprintProgress = sprintState ? Math.round((sprintState.completedStages.length / 14) * 100) : 0;
    progEl.textContent = `${sprintProgress}%`;
  }
  
  if (typeof renderPerformanceLineChart === "function") {
    renderPerformanceLineChart(safeHistory);
  }

  // ── Erros pendentes e Ponto Fraco ──
  const mistakesEl = document.getElementById("hub-mistakes-count");
  if (mistakesEl) mistakesEl.textContent = String(mistakes.length);
  
  const weakDomainEl = document.getElementById("jornada-weak-domain");
  if (weakDomainEl) {
    if (mistakes.length === 0) {
      weakDomainEl.textContent = "-";
    } else {
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
      // Truncate worst domain if it's too long
      const truncated = worstDomain.length > 25 ? worstDomain.substring(0, 25) + "..." : worstDomain;
      weakDomainEl.textContent = truncated;
      weakDomainEl.title = worstDomain;
    }
  }

  // ── Botão revisar erros ── desabilita se não houver erros
  const quickMistakes = document.getElementById("hub-quick-mistakes");
  if (quickMistakes) {
    quickMistakes.disabled = mistakes.length === 0;
    quickMistakes.style.opacity = mistakes.length === 0 ? "0.45" : "1";
    quickMistakes.onclick = mistakes.length > 0 ? startMistakesQuiz : null;
  }

  // ── Último simulado ──
  const lastQuizEl = document.getElementById("hub-last-quiz");
  if (lastQuizEl) {
    if (safeHistory.length > 0) {
      const last = safeHistory[safeHistory.length - 1];
      const awsScore = Math.floor(((last.percentage || 0) / 100) * 900) + 100;
      const passed = awsScore >= 700;
      const dateStr = last.date
        ? new Date(last.date).toLocaleDateString("pt-BR")
        : "—";
      const certNames = {
        "clf-c02": "Cloud Practitioner",
        "saa-c03": "Solutions Architect",
        "aif-c01": "AI Practitioner",
        "dva-c02": "Developer Associate",
      };
      const certLabel = certNames[last.certId] || last.certId || "—";
      lastQuizEl.innerHTML = `
        <div class="lh-last-quiz-entry">
          <div>
            <p class="lh-last-quiz-label">Último simulado · ${certLabel}</p>
            <p class="lh-last-quiz-date">${dateStr}</p>
          </div>
          <div style="text-align:right">
            <p class="lh-last-quiz-score ${passed ? "pass" : "fail"}">${awsScore}</p>
            <p class="lh-last-quiz-hint" style="font-size:0.68rem;color:var(--text-muted);margin:0">${passed ? "✓ Aprovado" : "✗ Reprovado"}</p>
          </div>
        </div>`;
    } else {
      lastQuizEl.innerHTML = `<p class="lh-last-quiz-empty">Nenhum simulado realizado ainda. Que tal começar agora?</p>`;
    }
  }

  // ── Insight IA ──
  const insightEl = document.getElementById("hub-insight-text");
  if (insightEl) {
    if (safeHistory.length > 0) {
      const insight = generateSmartInsight(safeHistory);
      insightEl.textContent =
        insight.message || "Continue praticando para obter insights personalizados.";
    } else {
      insightEl.textContent =
        "Realize seu primeiro simulado para receber análises personalizadas de IA sobre seus pontos fortes e áreas de melhoria.";
    }
  }
}

/** Navega para a tela de configuração do simulado (screen-start) */
function showLearningHubQuickStart() {
  showScreen("start");
}

/**
 * Navega para a tela de configuração do simulado sem iniciar o quiz.
 * Usado pela sidebar (sidebar-btn-quiz) para que o usuário configure
 * certificação, dificuldade e quantidade antes de iniciar.
 */
function showQuizConfig() {
  showScreen("start");
}

// ── FIM LEARNING HUB ────────────────────────────────────────────────────────

// showResultsScreen com polling para garantir que o canvas está visível
function showResultsScreen() {
  const results = engine.getFinalResults();

  if (!results) {
    logger.error("Erro ao obter resultados finais do quiz");
    alert("Erro ao exibir resultados. Tente novamente.");
    return;
  }

  // Garante currentCertificationInfo antes de renderizar
  if (
    !uiState.currentCertificationInfo &&
    results.certId &&
    certificationPaths
  ) {
    uiState.currentCertificationInfo = certificationPaths[results.certId];
  }

  displayReportFromResult(results);

  // Polling: aguarda canvas ficar visível antes de desenhar o gráfico
  const tryRenderChart = (attempts = 0) => {
    const canvas = document.getElementById("radarChart");
    const screen = document.getElementById("screen-results");
    const isVisible = screen && !screen.classList.contains("hidden");

    if (canvas && isVisible && typeof renderRadarChart === "function") {
      renderRadarChart(results, uiState.currentCertificationInfo);
    } else if (attempts < 10) {
      setTimeout(() => tryRenderChart(attempts + 1), 100);
    } else {
      logger.warn("Canvas radarChart não ficou disponível a tempo.");
    }
  };

  setTimeout(() => tryRenderChart(), 80);
}

function displayReportFromResult(results) {
  if (!results || typeof results.percentage !== "number") {
    logger.error("Dados de resultado inválidos em displayReportFromResult");
    alert("Erro ao exibir relatório. Dados corrompidos.");
    return;
  }

  if (uiState.currentMode === "diagnostic") {
    renderDiagnosticReport(results);
    return;
  }

  lastRenderedResult = results;

  if (certificationPaths && results.certId) {
    uiState.currentCertificationInfo = certificationPaths[results.certId];
  }

  const awsScore = Math.floor((results.percentage / 100) * 900) + 100;

  const scorePercentEl = document.getElementById("final-score-percent");
  const finalCorrectEl = document.getElementById("final-correct");
  const finalIncorrectEl = document.getElementById("final-incorrect");

  if (scorePercentEl) scorePercentEl.textContent = awsScore;
  if (finalCorrectEl) finalCorrectEl.textContent = results.score || 0;
  if (finalIncorrectEl)
    finalIncorrectEl.textContent = (results.total || 0) - (results.score || 0);

  const scoreDisplay = document.getElementById("final-score-percent");
  if (!scoreDisplay) return;

  const parentDiv = scoreDisplay.parentElement;
  if (!parentDiv) return;

  const oldBadge = parentDiv.querySelector(".approval-badge");
  if (oldBadge) oldBadge.remove();

  const badge = document.createElement("div");
  badge.className =
    "approval-badge mt-3 px-4 py-2 rounded-lg font-bold text-sm";

  if (awsScore >= 700) {
    badge.className = "a3-skill-badge a3-skill-badge-success mt-3";
    badge.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${t("approved", uiState.language)}`;
  } else {
    badge.className = "a3-skill-badge a3-skill-badge-danger mt-3";
    badge.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> ${t("needs_review", uiState.language)}`;
  }

  parentDiv.appendChild(badge);

  const recText = document.getElementById("recommendation-text");

  if (recText) {
    const weakDomains = results.weakDomains || [];

    if (results.percentage < 40) {
      recText.innerHTML = `<strong>${t("attention_low_performance", uiState.language)}</strong> ${t("recommendation_review_basics", uiState.language)}`;
    } else if (weakDomains.length === 0) {
      recText.innerHTML = `<strong>${t("excellent_consistency", uiState.language)}</strong> ${t("ready_for_exam", uiState.language)}`;
    } else if (weakDomains.length === 1) {
      const domainName =
        getDomainName(weakDomains[0]) || t("general_topics", uiState.language);
      recText.innerHTML = `<strong>${t("almost_there_single", uiState.language)}</strong> ${t("improvement_opportunity", uiState.language)} <em>${domainName}</em>. ${t("review_official_docs", uiState.language)}`;
    } else {
      const domainNames = weakDomains.map((id) => getDomainName(id)).join(", ");
      recText.innerHTML = `<strong>${t("attention_critical_areas", uiState.language)}</strong> <em>${domainNames}</em>. ${t("review_these_topics", uiState.language)}`;
    }
  }

  renderDetailedReportUI(results);
  showScreen("results");
}

function renderDetailedReportUI(results) {
  if (!results || !results.answers || !Array.isArray(results.answers)) {
    logger.error("Dados de resultado inválidos em renderDetailedReportUI");
    return;
  }

  const resultsScreen = document.getElementById("screen-results");
  if (!resultsScreen) {
    logger.error("Tela de resultados não encontrada");
    return;
  }

  const buttonsContainer = resultsScreen.querySelector(".flex.gap-3.flex-wrap");
  if (buttonsContainer) buttonsContainer.classList.add("no-print");

  let reportDiv = document.getElementById("detailed-report");
  if (!reportDiv) {
    reportDiv = document.createElement("div");
    reportDiv.id = "detailed-report";
    reportDiv.className =
      "a3-result-card mt-8 mb-8 mx-auto w-full max-w-3xl print-report-container";
    resultsScreen.insertBefore(reportDiv, buttonsContainer);
  }

  const recText =
    document.getElementById("recommendation-text")?.innerHTML || "";

  let html = `
        <div class="hidden print:block mb-8 border-b-2 border-black pb-6">
            <h2 class="text-3xl font-bold mb-4 print-text-black">${t("official_report_title", uiState.language)}</h2>
            <p class="text-xl mb-4 print-text-black"><strong>${t("final_score", uiState.language)}</strong> ${results.percentage.toFixed(0)}% (${results.score} ${t("correct_answers", uiState.language).toLowerCase()} ${t("of", uiState.language)} ${results.total})</p>
            <div class="border border-black p-4 mt-4">
                <strong class="text-lg block mb-2 print-text-black">${t("study_suggestion", uiState.language)}</strong>
                <span class="text-base print-text-black">${recText}</span>
            </div>
        </div>
    `;

  html += `
        <div class="domain-performance-section mb-8">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                <i class="fa-solid fa-chart-bar text-aws-orange mr-2"></i> ${t("domain_performance", uiState.language)}
            </h3>
            <div class="space-y-3">
    `;

  if (
    uiState.currentCertificationInfo &&
    Array.isArray(uiState.currentCertificationInfo.domains)
  ) {
    if (results.domainScores && typeof results.domainScores === "object") {
      uiState.currentCertificationInfo.domains.forEach((domain) => {
        const scoreData = results.domainScores[domain.id];

        if (scoreData && scoreData.total > 0) {
          const pct = (scoreData.correct / scoreData.total) * 100;
          const meets = pct >= 70;

          const statusText = meets
            ? t("meets_competencies", uiState.language)
            : t("needs_improvement", uiState.language);
          const statusColor = meets
            ? "a3-skill-badge-success"
            : "a3-skill-badge-danger";
          const icon = meets ? "fa-check-circle" : "fa-exclamation-triangle";

          html += `
                        <div class="a3-domain-summary">
                            <div class="flex-1 min-w-0">
                                <span class="font-bold text-main block text-md whitespace-normal">${domain.name}</span>
                                <span class="text-sm font-medium text-muted mt-1 block">
                                    ${t("domain_score", uiState.language)} ${pct.toFixed(0)}% <span class="opacity-75">(${scoreData.correct} ${t("of", uiState.language)} ${scoreData.total} ${t("correct_out_of", uiState.language)})</span>
                                </span>
                            </div>
                            <div class="a3-skill-badge ${statusColor}">
                                <i class="fa-solid ${icon}"></i> ${statusText}
                            </div>
                        </div>
                    `;
        }
      });
    }
  }

  html += `</div></div>`;

  // --- NOVA SEÇÃO: QUESTÕES MARCADAS PARA REVISÃO ---
  if (uiState.flags && uiState.flags.length > 0) {
    html += `
          <div class="flagged-questions-section mb-8">
              <h3 class="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                  <i class="fa-solid fa-flag mr-2"></i> ${t("flag_for_review", uiState.language) || "Marcadas para Revisão"}
              </h3>
              <div class="space-y-4">
      `;

    uiState.flags.forEach((qIdx) => {
      const q = engine.state.questions[qIdx];
      if (!q) return;

      const isMulti = Array.isArray(q.correct);
      let correctText = isMulti
        ? q.correct.map((i) => q.options[i]).join("<br>• ")
        : q.options[q.correct];

      html += `
              <div class="a3-feedback a3-feedback-warning mb-4">
                  <p class="font-semibold text-main mb-3">${q.question}</p>
                  <div class="mb-3">
                      <strong class="text-main">${t("correct_answer", uiState.language) || "Resposta Correta"}:</strong>
                      <span class="text-success block mt-1">
                          • ${correctText}
                      </span>
                  </div>
                  <div class="pt-3 border-t border-orange-200 dark:border-slate-600 text-sm text-muted">
                      <strong>${t("why", uiState.language) || "Explicação"}:</strong><br>
                      ${q.explanation}
                  </div>
              </div>
          `;
    });

    html += `</div></div>`;
  }
  // --- FIM DA NOVA SEÇÃO ---

  html += `
        <div class="report-header pb-4 mb-6 border-b border-gray-300 dark:border-slate-700 print:hidden mt-10">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white">
                <i class="fa-solid fa-list-check text-aws-orange mr-2"></i> ${t("question_details", uiState.language)}
            </h3>
        </div>
    `;

  results.answers.forEach((ans, index) => {
    const isMulti = Array.isArray(ans.correct);

    let userText;
    let correctText;

    if (isMulti) {
      userText = ans.userSelection.map((i) => ans.options[i]).join("<br>• ");
      correctText = ans.correct.map((i) => ans.options[i]).join("<br>• ");
    } else {
      userText = ans.options[ans.userSelection];
      correctText = ans.options[ans.correct];
    }

    const colorClass = ans.isCorrect
      ? "print-text-green text-green-600 dark:text-green-400"
      : "print-text-red text-red-600 dark:text-red-400";
    const icon = ans.isCorrect ? "✅" : "❌";

    html += `
        <div class="question-review mb-8 pb-6 border-b border-gray-200 dark:border-slate-700 page-break-safe">
            <div class="mb-3">
                <span class="font-bold text-gray-800 dark:text-white text-lg block mb-2 print-text-black">${index + 1}. ${ans.question}</span>
            </div>
            <div class="answer-block mb-3 a3-stat-card text-left print-no-bg">
                <div class="mb-2">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">${t("your_answer_label", uiState.language)}</span>
                    <span class="${colorClass} font-semibold block leading-snug">${icon} ${isMulti ? "<br>• " : ""}${userText}</span>
                </div>
                ${
                  !ans.isCorrect
                    ? `
                <div class="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">${t("correct_answer_label", uiState.language)}</span>
                    <span class="print-text-green text-green-600 dark:text-green-400 font-semibold block leading-snug">✅ ${isMulti ? "<br>• " : ""}${correctText}</span>
                </div>`
                    : ""
                }
            </div>
            <div class="explanation-print mt-4 a3-feedback print-no-bg">
                <strong class="text-main block mb-2 print-text-black">${t("explanation_label", uiState.language)}</strong>
                <span class="block leading-relaxed print-text-black text-muted">${ans.explanation}</span>
            </div>
        </div>
        `;
  });

  reportDiv.innerHTML = html;
}

function renderDiagnosticReport(results) {
  const resultsScreen = document.getElementById("screen-results");
  resultsScreen.innerHTML = "";

  const weakDomains = identifyWeakDomains(
    results.domainScores,
    uiState.currentCertificationInfo?.domains || [],
  ).map((domain) => ({
    ...domain,
    name: getDiagnosticDomainName(domain.id, results.certId),
  }));

  lastDiagnosticRecommendation =
    weakDomains.length > 0
      ? {
          certificationId: results.certId,
          weakDomains,
          generatedAt: new Date().toISOString(),
          source: "diagnostic",
        }
      : null;

  const weakDomainsHtml =
    weakDomains.length > 0
      ? `
        <div class="a3-feedback a3-feedback-warning max-w-4xl mx-auto mb-8 fade-in text-left">
            <h3 class="font-black mb-3 flex items-center gap-2">
                <i class="fa-solid fa-bullseye"></i> ${t("weak_domains_title", uiState.language)}
            </h3>
            <div class="flex flex-wrap gap-2">
                ${weakDomains
                  .map(
                    (domain) => `
                    <span class="a3-skill-badge a3-skill-badge-danger">
                        ${domain.name} - ${domain.percentage.toFixed(0)}%
                    </span>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `
      : `
        <div class="a3-stat-card max-w-4xl mx-auto mb-8 fade-in text-center">
            <p class="text-sm text-muted">${t("diagnostic_not_enough_data", uiState.language)}</p>
        </div>
    `;

  let html = `
        <div class="text-center mb-8 fade-in">
            <h2 class="text-3xl font-black text-main mb-2">Seu Raio-X da Nuvem</h2>
            <p class="text-muted">Analisamos seus conceitos base. Aqui está o seu foco de estudos recomendado.</p>
        </div>
        
        <div class="a3-result-card max-w-md mx-auto mb-8 fade-in flex justify-center">
            <canvas id="radarChart" style="max-height: 250px;"></canvas>
        </div>

        ${weakDomainsHtml}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
    `;

  uiState.currentCertificationInfo.domains.forEach((domain) => {
    const scoreData = results.domainScores[domain.id];
    if (scoreData && scoreData.total > 0) {
      const pct = (scoreData.correct / scoreData.total) * 100;
      const isWeak = pct < 60;

      const cardColor = isWeak
        ? "a3-stat-card a3-stat-card-warning"
        : "a3-stat-card a3-stat-card-success";
      const iconColor = isWeak ? "text-orange-500" : "text-green-500";
      const icon = isWeak ? "fa-book-open" : "fa-check-circle";
      const msg = isWeak
        ? "Recomendamos praticar questões focadas neste domínio."
        : "Conceito consolidado! Ótimo trabalho.";

      html += `
                <div class="${cardColor} flex flex-col justify-between transition-all hover:shadow-md h-full">
                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-bold text-main text-lg">${domain.name}</h3>
                            <i class="fa-solid ${icon} ${iconColor} text-2xl"></i>
                        </div>
                        <p class="text-sm text-muted mb-4">${msg}</p>
                    </div>
                    <div class="a3-progress">
                        <div class="a3-progress-bar ${isWeak ? "warning" : "success"}" style="width: ${pct}%"></div>
                    </div>
                    <div class="text-right text-xs font-bold ${iconColor}">${pct.toFixed(0)}% de Acerto</div>
                </div>
            `;
    }
  });

  // CTA para transformar o diagnóstico em prática focada.
  html += `
        </div>
        <div class="mt-10 text-center flex flex-col md:flex-row justify-center gap-4 fade-in">
            ${
              weakDomains.length > 0
                ? `<button id="btn-diagnostic-to-flashcards" class="a3-button-secondary py-3 px-6 text-base w-auto">
                    <i class="fa-solid fa-layer-group mr-2"></i> Estudar com Flashcards
                </button>
                <button id="btn-diagnostic-to-questions" class="a3-button-primary py-3 px-6 text-base w-auto">
                    <i class="fa-solid fa-play mr-2"></i> Praticar Questões
                </button>`
                : ""
            }
            <button onclick="window.location.href='./jornada.html'" class="a3-button-secondary py-3 px-6 text-base w-auto">
                <i class="fa-solid fa-map mr-2"></i> Ver minha Jornada
            </button>
        </div>
    `;

  resultsScreen.innerHTML = html;
  
  if (weakDomains.length > 0) {
    bindClick("btn-diagnostic-to-flashcards", () => {
      if (lastDiagnosticRecommendation) {
        sessionStorage.setItem("aws_sim_diagnostic_context", JSON.stringify(lastDiagnosticRecommendation));
      }
      window.location.href = "./flashcards.html";
    });
    bindClick("btn-diagnostic-to-questions", () => {
      if (lastDiagnosticRecommendation) {
        sessionStorage.setItem("aws_sim_diagnostic_context", JSON.stringify(lastDiagnosticRecommendation));
      }
      window.location.href = "./simulados.html";
    });
  }

  showScreen("results");

  // Força a renderização do gráfico
  setTimeout(() => {
    if (typeof renderRadarChart === "function") {
      renderRadarChart(results, uiState.currentCertificationInfo);
    }
  }, 150);
}

// PERSISTÊNCIA E HISTÓRICO
function saveQuizResult() {
  const results = engine.getFinalResults();
  const saved = storageManager.saveQuizResult({
    ...results,
    quizId: results.quizId || quizManager?.currentQuizId,
    mode: uiState.currentMode,
  });

  // Confirm backend sync if quiz was started via API
  if (quizManager && quizManager.currentQuizId) {
    logger.info(
      `✓ Quiz ${quizManager.currentQuizId} completed and synced to backend`,
    );
  }

  if (!saved) {
    logger.warn("Resultado duplicado ignorado no histÃ³rico.");
  }

  if (saved && uiState.currentMode !== "diagnostic") {
    updateGamification(results.percentage);
  }

  return saved;
}

function loadLastScore() {
  const banner = document.getElementById("last-score-banner");
  const certSelect = document.getElementById("certification-select");

  if (!banner || !certSelect) return;

  const certId = certSelect.value;
  if (!certId) return;

  const last = storageManager.loadLastScore(certId);

  if (last && typeof last.percentage === "number") {
    banner.classList.remove("hidden");
    banner.classList.add("cursor-pointer", "a3-hover-lift");
    const awsScore = Math.floor((last.percentage / 100) * 900) + 100;

    banner.innerHTML = `
            <div class="flex justify-between items-center w-full h-full" onclick="showLastReport('${certId}')">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-history"></i>
                    <span>${t("last_test", uiState.language)} <strong>${awsScore} ${t("points", uiState.language)}</strong></span>
                </div>
                <div class="text-xs font-bold underline flex items-center gap-1 opacity-80 hover:opacity-100">
                    <i class="fa-solid fa-file-pdf"></i> ${t("see_report", uiState.language)}
                </div>
            </div>
        `;
  } else {
    banner.classList.add("hidden");
  }
}

function showLastReport(certId) {
  const lastResult = storageManager.loadLastResult(certId);

  if (!lastResult || !lastResult.answers) {
    alert(t("no_report_details", uiState.language));
    return;
  }

  if (!lastResult.domainScores || typeof lastResult.domainScores !== "object") {
    alert(t("corrupted_report", uiState.language));
    return;
  }

  if (!lastResult.weakDomains) {
    lastResult.weakDomains = [];
    for (const [domainId, scoreData] of Object.entries(
      lastResult.domainScores,
    )) {
      if (scoreData && scoreData.total > 0) {
        const domainPct = (scoreData.correct / scoreData.total) * 100;
        if (domainPct < 70) lastResult.weakDomains.push(domainId);
      }
    }
  }
  displayReportFromResult(lastResult);
}

function showHistoricalReport(index) {
  const history = storageManager.getHistory();

  if (!Array.isArray(history)) {
    storageManager.clearHistory();
    alert(t("corrupted_history", uiState.language));
    return;
  }

  const result = history[index];

  if (!result || !result.answers) {
    alert(t("report_unavailable", uiState.language));
    return;
  }

  if (!result.domainScores || typeof result.domainScores !== "object") {
    alert(t("corrupted_report", uiState.language));
    return;
  }

  if (!result.weakDomains) {
    result.weakDomains = [];
    for (const [domainId, scoreData] of Object.entries(result.domainScores)) {
      if (scoreData && scoreData.total > 0) {
        const domainPct = (scoreData.correct / scoreData.total) * 100;
        if (domainPct < 70) result.weakDomains.push(domainId);
      }
    }
  }
  displayReportFromResult(result);
}

function updateHistoryDisplay() {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

  let rawHistory = storageManager.getHistory();

  if (!Array.isArray(rawHistory)) {
    rawHistory = [];
    storageManager.clearHistory();
  }

  const history = rawHistory.filter(
    (item) => item && item.certId && item.percentage !== undefined,
  );

  if (history.length === 0) {
    historyList.innerHTML = t("no_quizzes_yet", uiState.language);
    updateDynamicInsight([]);
    return;
  }

  const lang = uiState.language || "pt";
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const viewReportLabel = lang === "en" ? "View Report" : "Ver Relatório";
  const removeLabel = lang === "en" ? "Remove session" : "Remover sessão";

  let html = '<ul class="space-y-3 w-full">';

  history.forEach((item, _index) => {
    const date = new Date(item.date).toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const isPass = item.percentage >= APP_CONFIG.PASSING_SCORE;
    const color = isPass ? "text-green-500" : "text-red-500";
    const icon = isPass ? "fa-check-circle" : "fa-times-circle";
    const certName = item.certId ? item.certId.toUpperCase() : "AWS";
    const awsScore = Math.floor((item.percentage / 100) * 900) + 100;

    const originalIndex = rawHistory.indexOf(item);

    html += `
        <li onclick="showHistoricalReport(${originalIndex})" class="a3-stat-card flex justify-between items-center gap-3 p-3 cursor-pointer a3-hover-lift group text-left">
            <div>
                <div class="font-bold text-main group-hover:text-primary transition-colors">${certName}</div>
                <div class="text-xs text-muted">${date}</div>
            </div>
            <div class="flex items-start gap-2">
                <div class="flex flex-col items-end">
                    <div class="${color} font-bold text-lg flex items-center gap-1">
                        ${awsScore} <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="history-view-report text-[10px] text-primary opacity-80 group-hover:opacity-100 group-hover:underline mt-1 transition-all">
                        <i class="fa-solid fa-eye"></i> ${viewReportLabel}
                    </div>
                </div>
                <button type="button" onclick="removeHistoryItem(event, ${originalIndex})" class="history-remove-btn shrink-0 w-8 h-8 rounded-md text-muted transition-colors" title="${removeLabel}" aria-label="${removeLabel}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </li>
        `;
  });

  html += "</ul>";
  historyList.innerHTML = html;
  updateDynamicInsight(history);

  if (typeof renderPerformanceLineChart === 'function') {
    renderPerformanceLineChart(history);
  }
}

async function removeHistoryItem(event, index) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const confirmMessage =
    uiState.language === "en"
      ? "Remove this session from history?"
      : "Remover esta sessão do histórico?";

  if (!(await ModalService.confirm({ message: confirmMessage }))) return;

  const removed = storageManager.removeHistoryItem(index);
  if (!removed) return;

  updateHistoryDisplay();
  loadLastScore();
  updateSidebarProgress();

  if (typeof renderGlobalRadarChart === "function") {
    renderGlobalRadarChart();
  }

  if (typeof renderBadges === "function") renderBadges();
  refreshStudyNow();
}

async function clearHistory() {
  const history = storageManager.getHistory();
  if (history.length === 0) return;

  if (
    await ModalService.confirm({
      message: t("clear_history_confirm", uiState.language),
    })
  ) {
    storageManager.clearHistory();
    updateHistoryDisplay();

    if (typeof renderGlobalRadarChart === "function") {
      renderGlobalRadarChart();
    }

    updateDynamicInsight([]);
  }
}

function updateDynamicInsight(history) {
  const insightEl = document.getElementById("dynamic-insight");
  if (!insightEl) return;

  if (!Array.isArray(history)) history = [];

  const lang = uiState.language || "pt";

  if (history.length === 0) {
    insightEl.dataset.empty = "true";
    const journeyStart =
      lang === "en" ? "Start your journey!" : "Comece sua jornada!";
    const journeyMsg =
      lang === "en"
        ? "Complete your first quiz to receive personalized insights based on your performance."
        : "Faça seu primeiro simulado para receber insights personalizados baseados no seu desempenho.";
    insightEl.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                <div>
                    <div class="font-bold text-gray-800 dark:text-white mb-1">${journeyStart}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">${journeyMsg}</div>
                </div>
            </div>
        `;
    return;
  }

  insightEl.dataset.empty = "false";
  const insight = generateSmartInsight(history);

  insightEl.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="${insight.icon} ${insight.iconColor} text-xl mt-1"></i>
            <div>
                <div class="font-bold ${insight.titleColor} mb-1">${insight.title}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${insight.message}</div>
                ${insight.action ? `<div class="mt-2 text-xs font-semibold ${insight.actionColor}">${insight.action}</div>` : ""}
            </div>
        </div>
    `;
}

function generateSmartInsight(history) {
  return computeSmartInsight(history, uiState.language || "pt", t);
}

function renderGamification() {
  if (!storageManager || typeof storageManager.getGamification !== "function")
    return;
  const data = storageManager.getGamification();
  const streakEl = document.getElementById("streak-counter");
  if (streakEl && data && typeof data.currentStreak === "number") {
    streakEl.textContent = data.currentStreak;
  }
}

function updateGamification(pct) {
  if (!storageManager || typeof pct !== "number") return;
  storageManager.updateGamification(pct);
  renderGamification();
}

// ── SIDEBAR ESQUERDA: UTILITÁRIOS ────────────────────────────────────────────

/**
 * Marca o item ativo na sidebar conforme a tela exibida.
 * @param {string} screenName - 'start' | 'quiz' | 'results' | 'flashcards' | 'jornada'
 */
function updateSidebarActiveItem(screenName) {
  const map = {
    hub: "sidebar-btn-hub",
    start: "sidebar-btn-quiz",
    quiz: "sidebar-btn-quiz",
    results: "sidebar-btn-quiz",
    flashcards: "sidebar-btn-flashcards",
    jornada: "sidebar-btn-journey",
  };

  document.querySelectorAll(".left-sidebar-item").forEach((el) => {
    el.classList.remove("is-active");
  });

  const activeId = map[screenName];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add("is-active");
  }
}

/** Sincroniza o badge de erros na sidebar com o contador principal */
function syncSidebarMistakesBadge(certId) {
  const mistakes = storageManager.getMistakes(
    certId || getActiveCertificationId(),
  );
  const count = mistakes.length;
  const sidebarBtn = document.getElementById("sidebar-btn-mistakes");
  const badge = document.getElementById("sidebar-mistakes-count");
  if (sidebarBtn) sidebarBtn.classList.toggle("hidden", count === 0);
  if (badge) badge.textContent = String(count);
}

// ─────────────────────────────────────────────────────────────────────────────

// UTILITÁRIOS GERAIS
function updateScoreDisplayUI() {
  const el = document.getElementById("score-display");
  const state = engine.state;
  if (el && state) el.textContent = `${state.score} / ${state.answers.length}`;
}

function updateTopicDropdown() {
  const topicSelect = document.getElementById("topic-filter");
  const flashcardCategorySelect = document.getElementById("flashcard-category"); // NOVO: Captura o select dos flashcards

  if (!uiState.currentCertificationInfo) return;

  // 1. Atualiza o dropdown do Quiz principal
  if (topicSelect) {
    topicSelect.innerHTML = `<option value="">${t("all_topics", uiState.language)}</option>`;
    uiState.currentCertificationInfo.domains.forEach((domain) => {
      const option = document.createElement("option");
      option.value = domain.id;
      option.textContent = domain.name;
      topicSelect.appendChild(option);
    });
  }

  // 2. Atualiza o dropdown dos Flashcards automaticamente
  if (flashcardCategorySelect) {
    flashcardCategorySelect.innerHTML = `<option value="all">${t("all_topics", uiState.language) || "Todos os Domínios"}</option>`;
    uiState.currentCertificationInfo.domains.forEach((domain) => {
      const option = document.createElement("option");
      option.value = domain.id; // Aqui está a chave: o ID exato para bater com o Raio-X!
      option.textContent = domain.name;
      flashcardCategorySelect.appendChild(option);
    });
  }
}

async function updateDifficultyFilters(certId) {
  if (!certId || typeof certId !== "string") return;

  try {
    const fileSuffix = uiState.language === "en" ? "-en" : "";
    const response = await fetch(`data/questions/${certId}${fileSuffix}.json`);
    if (!response.ok) return;

    const questions = await response.json();
    if (!Array.isArray(questions)) return;

    const difficultyCounts = {
      all: questions.length,
      easy: questions.filter((q) => q.difficulty === "easy").length,
      medium: questions.filter((q) => q.difficulty === "medium").length,
      hard: questions.filter((q) => q.difficulty === "hard").length,
    };

    const difficultyInputs = document.querySelectorAll(
      'input[name="difficulty-level"]',
    );
    difficultyInputs.forEach((input) => {
      const value = input.value;
      const label = input.closest("label");
      const count = difficultyCounts[value];

      if (count === 0 && value !== "all") {
        label.style.opacity = "0.4";
        label.style.cursor = "not-allowed";
        input.disabled = true;
      } else {
        label.style.opacity = "1";
        label.style.cursor = "pointer";
        input.disabled = false;
      }
    });

    const selectedInput = document.querySelector(
      'input[name="difficulty-level"]:checked',
    );
    if (selectedInput && selectedInput.disabled) {
      const allOption = document.querySelector(
        'input[name="difficulty-level"][value="all"]',
      );
      if (allOption) allOption.checked = true;
    }
  } catch (error) {
    logger.error("Erro ao atualizar filtros de dificuldade:", error);
  }
}

function getDomainName(id) {
  return (
    uiState.currentCertificationInfo?.domains.find((d) => d.id === id)?.name ||
    id
  );
}

function getQuizDomainIdsForDiagnosticDomains(domainIds, certId) {
  const aliases = DIAGNOSTIC_DOMAIN_ALIASES[certId] || {};
  const resolvedIds = [];

  domainIds.forEach((domainId) => {
    if (!domainId) return;
    resolvedIds.push(domainId);
    if (aliases[domainId]) resolvedIds.push(aliases[domainId]);
  });

  return [...new Set(resolvedIds)];
}

function getDiagnosticDomainName(domainId, certId) {
  const quizDomainId =
    DIAGNOSTIC_DOMAIN_ALIASES[certId]?.[domainId] || domainId;
  const domain = certificationPaths[certId]?.domains?.find(
    (item) => item.id === quizDomainId,
  );

  return domain?.name || domainId;
}

function initTheme() {
  // Inicialização global de tema movida para shell.js (initThemeShell)
}

function toggleDarkMode() {
  // A classe dark e localStorage são gerenciados no shell.js (toggleDarkModeShell)
  // Aqui apenas re-renderizamos os gráficos se necessário.

  if (window.radarChartInstance && typeof renderRadarChart === "function") {
    const results = engine.getFinalResults();
    if (results) renderRadarChart(results, uiState.currentCertificationInfo);
  }

  if (
    window.globalRadarChartInstance &&
    typeof renderGlobalRadarChart === "function"
  ) {
    renderGlobalRadarChart();
  }
}

function toggleLanguage() {
  // ══════════════════════════════════════════════════════════════
  // 1. Troca o idioma global
  // ══════════════════════════════════════════════════════════════
  uiState.language = uiState.language === "pt" ? "en" : "pt";
  userManager.updatePreferences({ language: uiState.language });

  // ══════════════════════════════════════════════════════════════
  // 2. Atualiza o botão de idioma
  // ══════════════════════════════════════════════════════════════
  updateLanguageButtonUI();

  // ══════════════════════════════════════════════════════════════
  // 3. Re-traduz SOMENTE os textos estáticos (sem destruir dados)
  // ══════════════════════════════════════════════════════════════
  initializeUI(uiState.language);
  updateSidebarTexts();

  // ══════════════════════════════════════════════════════════════
  // 4. Atualiza componentes dependentes de idioma
  // ══════════════════════════════════════════════════════════════
  const certSelect = document.getElementById("certification-select");
  if (certSelect) {
    updateDifficultyFilters(certSelect.value);
    updateTopicDropdown();
  }

  // ══════════════════════════════════════════════════════════════
  // 5. Re-renderiza dados dinâmicos (mantém estrutura)
  // ══════════════════════════════════════════════════════════════
  renderSprintUI(); // Atualiza labels dos dias
  updateHistoryDisplay(); // Atualiza "Ver Relatório" etc

  const history = storageManager.getHistory();
  updateDynamicInsight(Array.isArray(history) ? history : []);

  // ══════════════════════════════════════════════════════════════
  // 6. Tela de Flashcards (Se estiver ativa)
  // ══════════════════════════════════════════════════════════════
  const flashcardsScreen = document.getElementById("screen-flashcards");
  if (flashcardsScreen && !flashcardsScreen.classList.contains("hidden")) {
    if (typeof reloadCurrentFlashcard === "function") {
      reloadCurrentFlashcard();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 7. Atualiza badge de validação se o quiz estiver ativo
  // ══════════════════════════════════════════════════════════════
  updateValidationBadgeLanguage();

  logger.info(
    `[i18n] Interface atualizada para: ${uiState.language.toUpperCase()}`,
  );
}

/**
 * Atualiza o texto e o tooltip do badge de validação para o idioma atual.
 */
function updateValidationBadgeLanguage() {
  const quizScreen = document.getElementById("screen-quiz");
  if (!quizScreen || quizScreen.classList.contains("hidden")) return;

  const badge = document.getElementById("question-validation-badge");
  if (!badge) return;

  if (!engine || typeof engine.getCurrentQuestion !== "function") return;
  const q = engine.getCurrentQuestion();
  if (!q || !q.validated_by) return;

  const isValidatedText = uiState.language === "en" ? "Validated" : "Validada";
  const tooltipText =
    uiState.language === "en"
      ? `Validated by specialist: ${q.validated_by}`
      : `Validada por especialista: ${q.validated_by}`;

  // Atualiza o texto visível do badge (mantém o ícone)
  badge.innerHTML = `<i class="fa-solid fa-circle-check mr-1" style="color: var(--a3-success);" aria-hidden="true"></i> ${isValidatedText}`;
  badge.setAttribute("aria-label", tooltipText);
  initValidationBadgeTooltip(badge, tooltipText);
}



function goHome() {
  // Limpa o contexto de diagnóstico ao voltar para a home
  sessionStorage.removeItem("aws_sim_diagnostic_context");
  
  // ========================================================================
  // LIMPEZA COMPLETA DE TIMERS
  // ========================================================================
  if (uiState.timerInterval) clearInterval(uiState.timerInterval);
  if (uiState.qTimerInterval) clearInterval(uiState.qTimerInterval);
  resetFinishState();

  // ========================================================================
  // RESTAURAÇÃO DO ESTADO ORIGINAL (CRÍTICO PARA EVITAR REGRESSÕES)
  // ========================================================================

  // Restaura o modo padrão
  uiState.currentMode = "exam";
  uiState.currentMissionStageId = null;
  uiState.lives = 3;
  uiState.qTimeRemaining = 45;

  // CRÍTICO: Restaura o passingScore padrão
  if (typeof engine !== "undefined") {
    engine.passingScore = 70; // Valor padrão do simulador
  }

  // ========================================================================
  // RESTAURAÇÃO DA INTERFACE
  // ========================================================================

  const sidebar = document.getElementById("side-info");
  const mainSection = document.getElementById("main-section");
  const scoreContainer = document.getElementById("score-container");
  const missionHud = document.getElementById("mission-hud");

  // Mostra a sidebar novamente
  if (sidebar) sidebar.classList.remove("hidden");

  // Restaura o layout de 2/3 da tela
  if (mainSection) {
    mainSection.classList.add("lg:w-2/3");
    mainSection.classList.remove("w-full");
  }

  // Esconde o contador de pontos
  if (scoreContainer) scoreContainer.style.display = "none";

  // Esconde o HUD de missão
  if (missionHud) missionHud.classList.add("hidden");

  // ========================================================================
  // NAVEGAÇÃO E ATUALIZAÇÃO DE DADOS
  // ========================================================================

  showScreen("start");
  loadLastScore();
  updateMistakesControls();

  if (typeof renderGlobalRadarChart === "function") renderGlobalRadarChart();

  let history = storageManager.getHistory();
  if (!Array.isArray(history)) {
    history = [];
    storageManager.clearHistory();
  }

  updateDynamicInsight(history);
  updateSidebarTexts();
  renderSprintUI();
}

async function startJornada() {
  if (uiState.timerInterval) clearInterval(uiState.timerInterval);
  showScreen("jornada");
  
  const certId = getActiveCertificationId();
  renderJornadaDashboard(certId);
  
  renderTrail();
  await renderGuildDashboard();
  renderBadges();
}

function retakeQuiz() {
  goHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function cancelQuiz() {
  if (
    await ModalService.confirm({
      message: t("exit_quiz_confirm", uiState.language),
    })
  ) {
    goHome();
  }
}

async function startMistakesQuiz() {
  resetFinishState();

  const certId = getActiveCertificationId();
  const currentCertInfo = certificationPaths[certId];

  if (!certId || !currentCertInfo) {
    logger.warn("startMistakesQuiz: certificação não identificada.");
    return;
  }

  const mistakes = storageManager.getMistakes(certId);

  // Estado vazio: nenhum erro pendente
  if (mistakes.length === 0) {
    const notice = document.getElementById("mistakes-feature-notice");
    if (notice) {
      notice.textContent = t("no_mistakes_to_review", uiState.language);
      notice.classList.remove("hidden");
    }
    updateMistakesControls(certId);
    return;
  }

  const btn = document.getElementById("btn-practice-mistakes");

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t("loading", uiState.language)}`;
    }

    uiState.currentCertificationInfo = currentCertInfo;
    uiState.currentMode = "mistakes-review";

    // Inicia sessão local (sem backend — erros são locais por definição)
    try {
      const quizResponse = await quizManager.startQuiz(certId, mistakes.length, uiState.language, "mistakes-review");
      if (!quizResponse.fromAPI) {
        logger.info("⚠ Mistakes quiz rodando em modo local (API indisponível)");
      }
    } catch (err) {
      logger.warn("Não foi possível registrar sessão no backend:", err);
      // Continua — o quiz de revisão de erros funciona 100% local
    }

    // Carrega o banco completo de questões para selecionar por domínio
    let allQuestions = [];
    try {
      const fileSuffix = uiState.language === "en" ? "-en" : "";
      let response = await fetch(`data/questions/${certId}${fileSuffix}.json`);
      if (!response.ok && uiState.language === "en") {
        response = await fetch(`data/questions/${certId}.json`);
      }
      if (response.ok) {
        allQuestions = await response.json();
      }
    } catch (err) {
      console.warn(
        "Não foi possível carregar banco de questões, usando questões exatas:",
        err,
      );
    }

    const result = engine.loadMistakesByDomain(
      mistakes,
      certId,
      currentCertInfo.domains,
      allQuestions,
      3, // questões por domínio errado
    );

    if (!result.success) {
      const notice = document.getElementById("mistakes-feature-notice");
      if (notice) {
        notice.textContent = t("no_mistakes_to_review", uiState.language);
        notice.classList.remove("hidden");
      }
      return;
    }

    // Sem timer em revisão de erros
    uiState.timeRemaining = 0;

    const oldReport = document.getElementById("detailed-report");
    if (oldReport) oldReport.remove();

    showScreen("quiz");

    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");

    if (sidebar) sidebar.classList.add("hidden");
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3");
      mainSection.classList.add("w-full");
    }

    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";

    const timerContainer = document.getElementById("timer-container");
    if (timerContainer) timerContainer.classList.add("hidden");

    loadQuestionUI();
  } catch (err) {
    alert(t("error_starting_quiz", uiState.language, { message: err.message }));
    logger.error("Erro ao iniciar revisão de erros:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Praticar Erros`;
      // Atualiza o span recém-recriado com a contagem real
      updateMistakesControls(certId);
    }
  }
}

async function clearMistakes() {
  if (
    await ModalService.confirm({
      message: t("clear_mistakes_confirm", uiState.language),
    })
  ) {
    storageManager.clearMistakes(getActiveCertificationId());
    updateMistakesControls();
    alert(t("mistakes_cleared", uiState.language));
  }
}

function generatePerformanceReport() {
  const results = lastRenderedResult || engine.getFinalResults();
  if (
    !uiState.currentCertificationInfo &&
    results?.certId &&
    certificationPaths
  ) {
    uiState.currentCertificationInfo = certificationPaths[results.certId];
  }
  generatePdfReport(results, uiState.currentCertificationInfo);
}

// MODO FLASHCARDS

import {
  startFlashcards as startFlashcardsModule,
  flipFlashcard as flipFlashcardModule,
  nextFlashcard as nextFlashcardModule,
  prevFlashcard as prevFlashcardModule,
  filterFlashcardsByCert,
  reloadCurrentFlashcard,
} from "./flashcards.js";

function startFlashcards() {
  startFlashcardsModule(showScreen);
}
function flipFlashcard() {
  flipFlashcardModule();
}
function nextFlashcard() {
  nextFlashcardModule();
}
function prevFlashcard() {
  prevFlashcardModule();
}



// TEXTOS ESTÁTICOS DOS CARDS DA SIDEBAR (i18n)
function updateSidebarTexts() {
  const lang = uiState.language || "pt";

  const texts = {
    pt: {
      myProgress: "O Meu Progresso",
      progressTotal: "Progresso Total",
      streakLabel: "Ofensiva:",
      insightTitle: "Insight de Estudo",
      historyTitle: "Últimas Sessões",
      certStatsTitle: "Estatísticas da Certificação",
      certStatsEmpty:
        "Faça seu primeiro simulado para ver suas estatísticas aqui!",
      statsQuizzes: "Simulados",
      statsAvg: "Média",
      statsQuestions: "Questões",
      journeyStart: "Comece sua jornada!",
      journeyMsg:
        "Faça seu primeiro simulado para receber insights personalizados.",
      sprintTitle: "Sprint de Estudos (14 Dias)",
      sprintSubtitle: "Sua meta diária de 15 minutos para dominar a nuvem.",
    },
    en: {
      myProgress: "My Progress",
      progressTotal: "Total Progress",
      streakLabel: "Streak:",
      insightTitle: "Study Insight",
      historyTitle: "Recent Sessions",
      certStatsTitle: "Certification Statistics",
      certStatsEmpty: "Complete your first quiz to see your statistics here!",
      statsQuizzes: "Quizzes",
      statsAvg: "Average",
      statsQuestions: "Questions",
      journeyStart: "Start your journey!",
      journeyMsg: "Complete your first quiz to receive personalized insights.",
      sprintTitle: "Study Sprint (14 Days)",
      sprintSubtitle: "Your daily 15-minute goal to master the cloud.",
    },
  };

  const T = texts[lang];

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // 1. Card Progresso
  set("sidebar-my-progress-title", T.myProgress);
  set("sidebar-progress-total-label", T.progressTotal);
  set("sidebar-streak-label", T.streakLabel);

  // 2. Card Insight (Só atualiza o título do card, não o conteúdo dinâmico)
  set("insight-card-title", T.insightTitle);

  // 3. Card Histórico
  set("history-card-title", T.historyTitle);

  // 4. Card Estatísticas Globais
  set("cert-stats-title", T.certStatsTitle);
  set("cert-stats-empty-msg", T.certStatsEmpty);
  set("stats-label-quizzes", T.statsQuizzes);
  set("stats-label-avg", T.statsAvg);
  set("stats-label-questions", T.statsQuestions);

  // 5. Card Sprint (Títulos e labels fixos)
  set("sprint-module-title", T.sprintTitle);
  set("sprint-module-subtitle", T.sprintSubtitle);

  const insightEl = document.getElementById("dynamic-insight");
  if (insightEl && insightEl.dataset.empty === "true") {
    insightEl.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                <div>
                    <div class="font-bold text-gray-800 dark:text-white mb-1">${T.journeyStart}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">${T.journeyMsg}</div>
                </div>
            </div>
        `;
  }
}

function updateSidebarProgress() {
  const gamification = storageManager.getGamification();
  const certSelect = document.getElementById("certification-select");
  const currentLang =
    uiState.language || (AuthService.getCurrentUser()?.language) || "pt";

  // Tratamento absoluto contra undefined
  let currentCertId =
    certSelect && certSelect.value
      ? String(certSelect.value).toLowerCase().trim()
      : "clf-c02";

  const certNames = {
    pt: {
      "clf-c02": "Cloud Practitioner",
      "saa-c03": "Solutions Architect",
      "aif-c01": "AI Practitioner",
      "dva-c02": "Developer Associate",
    },
    en: {
      "clf-c02": "Cloud Practitioner",
      "saa-c03": "Solutions Architect",
      "aif-c01": "AI Practitioner",
      "dva-c02": "Developer Associate",
    },
  };

  const labelEl = document.getElementById("sidebar-cert-label");
  if (labelEl) {
    labelEl.textContent =
      (certNames[currentLang] || certNames["pt"])[currentCertId] ||
      "Cloud Practitioner";
  }

  // Badge da certificação/trilha ativa (ex.: "CLF-C02")
  const badgeEl = document.getElementById("sidebar-cert-badge");
  if (badgeEl) {
    badgeEl.textContent = currentCertId.toUpperCase();
  }

  const certPrefix = currentCertId.split("-")[0];
  const completedStagesCount = (gamification.completedStages || []).filter(
    (id) => id.startsWith(certPrefix),
  ).length;
  const historyProgress = storageManager.getProgressFromHistory(
    currentCertId,
    5,
  );
  const completedCount = Math.max(
    completedStagesCount,
    historyProgress.completedCount,
  );

  const totalModules = 5;
  const percentage = Math.min(
    Math.round((completedCount / totalModules) * 100),
    100,
  );

  // Status da trilha calculado a partir do progresso real disponível (local).
  // Fallback seguro: sem etapas concluídas -> "Não iniciada".
  const statusEl = document.getElementById("sidebar-cert-status");
  if (statusEl) {
    let statusText;
    if (completedCount <= 0) {
      statusText = currentLang === "en" ? "Not started" : "Não iniciada";
    } else if (completedCount < totalModules) {
      statusText = currentLang === "en" ? "In progress" : "Em andamento";
    } else {
      statusText = currentLang === "en" ? "Completed" : "Concluída";
    }
    statusEl.textContent = statusText;
  }

  const bar = document.getElementById("sidebar-pct-bar");
  const text = document.getElementById("sidebar-pct-text");

  if (bar) bar.style.width = `${percentage}%`;
  if (text) text.textContent = `${percentage}%`;

  const streakValue = document.getElementById("sidebar-streak-value");
  if (streakValue) {
    const days = gamification.currentStreak || 0;
    streakValue.textContent =
      currentLang === "en"
        ? `${days} ${days === 1 ? "day" : "days"}`
        : `${days} ${days === 1 ? "dia" : "dias"}`;
  }
}

// EXPOSIÇÃO GLOBAL

window.startQuiz = startQuiz;
window.showQuizConfig = showQuizConfig;
window.submitAnswer = submitAnswer;
window.nextQuestion = nextQuestion;
window.finishQuiz = finishQuiz;
window.cancelQuiz = cancelQuiz;
window.goHome = goHome;
window.retakeQuiz = retakeQuiz;
window.toggleDarkMode = toggleDarkMode;
window.toggleLanguage = toggleLanguage;
window.clearHistory = clearHistory;
window.removeHistoryItem = removeHistoryItem;
window.showLastReport = showLastReport;
window.showHistoricalReport = showHistoricalReport;
window.generatePerformanceReport = generatePerformanceReport;
window.toggleFlag = toggleFlag;
window.startFlashcards = startFlashcards;
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;
window.prevFlashcard = prevFlashcard;
window.filterFlashcardsByCert = filterFlashcardsByCert;
window.startMistakesQuiz = startMistakesQuiz;
window.clearMistakes = clearMistakes;
window.showScreen = showScreen;
window.updateSidebarProgress = updateSidebarProgress;
window.updateSidebarTexts = updateSidebarTexts;
window.togglePomodoroWidget = togglePomodoroWidget;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;
// Funções da sidebar: necessárias para que shell.js possa chamar window[action]
// sem redirecionar para index.html quando já estamos no SPA.
window.showLearningHub = showLearningHub;
window.startJornada = startJornada;
window.startDiagnostic = startDiagnostic;

// ============================================================================
// SISTEMA DE MISSÕES DA JORNADA (GAMIFICAÇÃO) - VERSÃO ISOLADA
// ============================================================================

/**
 * Inicia uma missão específica da trilha de gamificação.
 * ISOLAMENTO TOTAL: Esta função não interfere com o simulador padrão.
 *
 * @param {string} stageId - ID do módulo da trilha (ex: 'clf-1', 'saa-2', 'aif-final')
 *
 * CORREÇÕES APLICADAS:
 * 1. ✅ Não manipula botões de outras telas
 * 2. ✅ Salva e restaura engine.passingScore
 * 3. ✅ Reseta estado completamente ao sair
 * 4. ✅ Validações de segurança em todas as etapas
 *
 * @example
 * window.startMission('clf-1'); // Inicia o módulo "Conceitos Cloud" do CLF-C02
 */
window.startMission = async function (stageId) {
  // ========================================================================
  // FASE 0: VERIFICAÇÃO DE CONTEXTO DE PÁGINA
  // ========================================================================
  // startMission requer os elementos DOM do screen-quiz (question-text,
  // options-container, etc.) que só existem em simulados.html.
  // Se estivermos em jornada.html ou outra página sem esses elementos,
  // redirecionamos para simulados.html com os parâmetros necessários.
  if (!document.getElementById("question-text")) {
    const certSelect = document.getElementById("certification-select");
    const certId = certSelect ? certSelect.value : (storageManager.getActiveCertification?.() || "clf-c02");
    const params = new URLSearchParams({ mode: "mission", stageId, cert: certId });
    window.location.href = `simulados.html?${params.toString()}`;
    return;
  }
  
  // Se já temos o contexto (simulados.html), chamamos a função interna
  return startMissionInternal(stageId);
};

async function startMissionInternal(stageId) {

  resetFinishState();

  // ========================================================================
  // FASE 1: VALIDAÇÕES DE SEGURANÇA
  // ========================================================================

  // 1.1 Valida se o módulo está desbloqueado
  const gamification = storageManager.getGamification();
  if (
    !gamification.unlockedStages ||
    !gamification.unlockedStages.includes(stageId)
  ) {
    alert(
      t("mission_locked", uiState.language) ||
        "Este módulo ainda está bloqueado. Complete os anteriores primeiro!",
    );
    return;
  }

  // 1.2 Identifica a certificação e o módulo atual
  const certSelect = document.getElementById("certification-select");
  const currentCertId = certSelect ? certSelect.value : "clf-c02";
  const currentCertInfo = certificationPaths[currentCertId];

  if (!currentCertInfo) {
    logger.error(`[startMission] Certificação ${currentCertId} não encontrada`);
    alert("Erro ao carregar a certificação. Tente novamente.");
    return;
  }

  // 1.3 Importa a trilha para identificar o módulo
  let TRAILS_BY_CERT, activeTrail, currentStage;
  try {
    const trailModule = await import("./gamificacao/trailManager.js");
    TRAILS_BY_CERT = trailModule.TRAILS_BY_CERT;
    activeTrail = TRAILS_BY_CERT[currentCertId] || TRAILS_BY_CERT["clf-c02"];
    currentStage = activeTrail.find((s) => s.id === stageId);

    if (!currentStage) {
      logger.error(`[startMission] Módulo ${stageId} não encontrado na trilha`);
      alert("Erro ao identificar o módulo. Tente novamente.");
      return;
    }
  } catch (err) {
    logger.error("[startMission] Erro ao importar trailManager:", err);
    alert("Erro ao carregar o sistema de trilhas. Tente novamente.");
    return;
  }

  // ========================================================================
  // FASE 2: BACKUP DO ESTADO ORIGINAL (ISOLAMENTO)
  // ========================================================================

  const originalPassingScore = engine.passingScore; // Salva o valor original
  const originalMode = uiState.currentMode;

  // ========================================================================
  // FASE 3: CONFIGURAÇÃO DO MODO MISSÃO
  // ========================================================================

  const isBossFight = currentStage.id.includes("final");

  // 3.1 Configura o estado global para modo missão
  uiState.currentMode = isBossFight ? "boss" : "mission";
  uiState.currentMissionStageId = stageId;
  uiState.lives = 3;
  uiState.qTimeRemaining = 45;

  // 3.2 Define critérios especiais para missões
  const missionPassingScore = isBossFight ? 80 : 70;
  const questionCount = isBossFight ? 20 : 10;

  engine.passingScore = missionPassingScore;

  // 3.3 Mapeia o módulo para um domínio específico (se não for boss)
  let topicFilter = "";
  if (!isBossFight) {
    const stageNumber = stageId.split("-")[1];
    const domainIndex = parseInt(stageNumber) - 1;

    if (currentCertInfo.domains && currentCertInfo.domains[domainIndex]) {
      topicFilter = currentCertInfo.domains[domainIndex].id;
    }
  }

  // ========================================================================
  // FASE 4: CARREGAMENTO DE QUESTÕES
  // ========================================================================

  const filters = {
    quantity: questionCount,
    difficulty: "all",
    topic: topicFilter,
    mode: "exam",
  };

  try {
    // 4.1 Carrega as questões
    const result = await engine.loadQuestions(
      currentCertId,
      currentCertInfo.domains,
      filters,
      uiState.language,
    );

    if (!result.success) {
      // RESTAURA O ESTADO ORIGINAL EM CASO DE ERRO
      engine.passingScore = originalPassingScore;
      uiState.currentMode = originalMode;
      uiState.currentMissionStageId = null;

      alert(
        t("error_loading_questions", uiState.language, {
          message: result.message,
        }),
      );
      return;
    }

    // 4.2 Configura o tempo total da missão
    const tempoPorQuestao = isBossFight ? 120 : 90;
    uiState.timeRemaining = result.totalQuestions * tempoPorQuestao;

    // ========================================================================
    // FASE 5: PREPARAÇÃO DA INTERFACE
    // ========================================================================

    // 5.1 Muda para a tela de quiz
    showScreen("quiz");

    // 5.2 Esconde a sidebar e expande a área principal
    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");

    if (sidebar) sidebar.classList.add("hidden");
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3");
      mainSection.classList.add("w-full");
    }

    // 5.3 Ativa o HUD de missão (Vidas + Barra de Tempo)
    const missionHud = document.getElementById("mission-hud");
    if (missionHud) {
      missionHud.classList.remove("hidden");
      updateHeartsUI();
    }

    // 5.4 Mostra o timer global
    const timerContainer = document.getElementById("timer-container");
    if (timerContainer) timerContainer.classList.remove("hidden");

    // 5.5 Mostra o contador de pontos
    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";

    // ========================================================================
    // FASE 6: INICIALIZAÇÃO DOS TIMERS E PRIMEIRA QUESTÃO
    // ========================================================================

    startTimer();

    if (!isBossFight) {
      startQuestionTimer(); // Timer de 45s por questão (só para missões normais)
    }

    loadQuestionUI();
  } catch (err) {
    // RESTAURA O ESTADO ORIGINAL EM CASO DE ERRO
    engine.passingScore = originalPassingScore;
    uiState.currentMode = originalMode;
    uiState.currentMissionStageId = null;

    logger.error("[startMission] Erro ao iniciar missão:", err);
    alert(t("error_starting_quiz", uiState.language, { message: err.message }));
  }
};

/**
 * Atualiza a interface dos corações (vidas restantes) no HUD de missão.
 * Chamada sempre que o jogador erra uma questão no modo missão.
 */
function updateHeartsUI() {
  const heartsContainer = document.getElementById("mission-hearts");
  if (!heartsContainer) return;

  heartsContainer.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement("i");
    heart.className =
      i < uiState.lives
        ? "fa-solid fa-heart text-red-500 text-lg"
        : "fa-regular fa-heart text-gray-300 dark:text-gray-600 text-lg";
    heartsContainer.appendChild(heart);
  }
}

// SISTEMA DE RECOMENDAÇÃO INTELIGENTE
window.startSmartFlashcards = function (weakDomainsStr) {
  // 1. Salva os domínios fracos temporariamente para consulta na outra tela
  const weakDomainsArray = weakDomainsStr.split(",").filter((d) => d !== "");
  sessionStorage.setItem(
    "current_study_plan",
    JSON.stringify(weakDomainsArray),
  );

  // 2. Abre a tela de flashcards
  startFlashcards();

  // 3. Aguarda a montagem da UI para injetar o feedback visual
  setTimeout(() => {
    renderStudyPlanBanner();

    // Aplica o filtro automático no primeiro domínio da lista
    if (weakDomainsArray.length > 0) {
      const categorySelect = document.getElementById("flashcard-category");
      if (categorySelect) {
        categorySelect.value = weakDomainsArray[0];
        categorySelect.dispatchEvent(new Event("change"));
      }
    }
  }, 300);
};

function renderStudyPlanBanner() {
  const studyPlanRaw = sessionStorage.getItem("current_study_plan");
  if (!studyPlanRaw) return;

  const weakDomainsIds = JSON.parse(studyPlanRaw);
  if (weakDomainsIds.length === 0) return;

  // Converte IDs em nomes legíveis usando seu certificationPaths
  const domainNames = weakDomainsIds.map((id) => {
    return (
      uiState.currentCertificationInfo?.domains.find((d) => d.id === id)
        ?.name || id
    );
  });

  const flashcardScreen = document.getElementById("screen-flashcards");

  // Evita duplicados se o usuário clicar várias vezes
  const existingBanner = document.getElementById("study-recommendation-banner");
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement("div");
  banner.id = "study-recommendation-banner";
  banner.className =
    "a3-feedback a3-feedback-warning animate-fade-in mb-6 relative";

  banner.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="a3-icon-badge">
                <i class="fa-solid fa-graduation-cap text-xl text-primary"></i>
            </div>
            <div>
                <h4 class="font-black text-main uppercase text-xs tracking-widest mb-1">Seu Plano de Estudo Personalizado</h4>
                <p class="text-sm text-muted mb-3">
                    Com base no seu diagnóstico, focamos nestes pontos de atenção:
                </p>
                <div class="flex flex-wrap gap-2">
                    ${domainNames
                      .map(
                        (name) => `
                        <span class="a3-skill-badge a3-skill-badge-danger text-xs">
                            ${name}
                        </span>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        </div>
        <button onclick="this.parentElement.remove(); sessionStorage.removeItem('current_study_plan');" class="absolute top-2 right-2 text-orange-300 hover:text-orange-500">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

  // Insere o banner no topo da área de conteúdo
  flashcardScreen.prepend(banner);
}

// LÓGICA DE GAMIFICAÇÃO: MODO MISSÃO (TRILHA)

window.startTrailMission = async function (stageId, stageTitle) {
  resetFinishState();

  const certSelect = document.getElementById("certification-select");
  if (!certSelect) return;

  const isBossFight = stageId.includes("-final");

  // Se for o Boss, usamos o modo 'exam' tradicional para ter o cronômetro longo.
  // Se for fase normal, usamos 'mission' com corações.
  uiState.currentMode = isBossFight ? "boss" : "mission";
  uiState.currentMissionStageId = stageId;
  uiState.lives = 3;

  // O Boss exige 70% (oficial). Missões normais exigem 80%.
  engine.passingScore = isBossFight ? 70 : 80;

  try {
    const certId = certSelect.value;
    const currentCertInfo = certificationPaths[certId];

    let actualDomainId = "";
    if (!isBossFight) {
      const parts = stageId.split("-");
      const stageIndex = parseInt(parts[parts.length - 1]) - 1;
      if (
        currentCertInfo &&
        currentCertInfo.domains &&
        currentCertInfo.domains[stageIndex]
      ) {
        actualDomainId = currentCertInfo.domains[stageIndex].id;
      }
    }

    // O Boss carrega 65 questões de todos os domínios
    const filters = {
      quantity: isBossFight ? 65 : 5,
      difficulty: "all",
      topic: actualDomainId,
      mode: "exam",
    };

    const result = await engine.loadQuestions(
      certId,
      currentCertInfo.domains,
      filters,
      uiState.language,
    );

    if (!result.success || result.totalQuestions === 0) {
      alert(
        `Ops! Ainda não temos questões cadastradas para o módulo "${stageTitle}".`,
      );
      goHome();
      return;
    }

    // Configuração de Tempo (90 min pro Boss, 90 seg pras missões normais)
    if (isBossFight) {
      uiState.timeRemaining = 90 * 60; // 90 Minutos
    } else {
      uiState.qTimeRemaining = 90; // 90 Segundos por questão
    }

    // Modificações de Layout para tela cheia
    showScreen("quiz");
    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");
    if (sidebar) sidebar.classList.add("hidden");
    if (mainSection) mainSection.classList.replace("lg:w-2/3", "w-full");

    // Alterna os HUDs dependendo do modo
    const missionHud = document.getElementById("mission-hud");
    const timerContainer = document.getElementById("timer-container");

    if (isBossFight) {
      if (missionHud) missionHud.classList.add("hidden");
      if (timerContainer) timerContainer.classList.remove("hidden");
      startTimer(); // Inicia o relógio global de 90 min
    } else {
      if (missionHud) missionHud.classList.remove("hidden");
      if (timerContainer) timerContainer.classList.add("hidden");
      updateHeartsUI();
      startQuestionTimer(); // Inicia o relógio rápido de 90 seg
    }

    loadQuestionUI();
  } catch (err) {
    logger.error("Erro na missão:", err);
    alert("Erro ao carregar a missão. Tente novamente.");
    goHome();
  }
};

function startQuestionTimer() {
  startMissionQuestionTimer(uiState, () =>
    handleMissionFailure("O tempo esgotou!"),
  );
}

/**
 * Trata a falha de uma missão (vidas zeradas ou tempo esgotado).
 * Restaura o estado completo do simulador e retorna à tela inicial.
 * @param {string} reason - Motivo da falha
 */
function handleMissionFailure(reason) {
  clearAllTimers(uiState);

  const lang = uiState.language || "pt";
  const msg =
    lang === "en"
      ? `💥 Mission Failed!\n${reason}\n\nReturn to the trail and try again.`
      : `💥 Missão Falhou!\n${reason}\n\nRetorne à trilha e tente novamente.`;

  alert(msg);

  // Restaura o estado completo
  engine.passingScore = 70;
  uiState.currentMode = "exam";
  uiState.currentMissionStageId = null;
  uiState.lives = 3;

  goHome();
}

// MÓDULO: SPRINT 14 DIAS (delegado para gamificacao/sprintManager.js)

function renderSprintUI() {
  const lang = uiState.language || "pt";
  const certSelect = document.getElementById("certification-select");
  const currentCertId = certSelect ? certSelect.value : "clf-c02";
  renderSprint(lang, currentCertId);
}

function startMicroSprint() {
  const certSelect = document.getElementById("certification-select");
  const currentCertId = certSelect ? certSelect.value : "clf-c02";
  const lang = uiState.language || "pt";
  const getPillFn =
    typeof window.getPill === "function" ? window.getPill : () => null;
  startSprint(lang, currentCertId, getPillFn);
}

window.closeSprintReader = function () {
  closeSprint();
};

window.completeSprintDay = function (completedDay) {
  const certSelect = document.getElementById("certification-select");
  const currentCertId = certSelect ? certSelect.value : "clf-c02";
  const lang = uiState.language || "pt";
  completeSprint(completedDay, currentCertId, lang, () => renderSprintUI());
};
