import { identifyWeakDomains, QuizEngine } from "./quizEngine.js";
import { certificationPaths } from "./data.js";
import { initStudyNow, refreshStudyNow } from "./recommendations/studyNow.js";
import { storageManager } from "./storageManager.js";
import { userManager } from "./userManager.js";
import { quizManager } from "./quizManager.js";
import { renderRadarChart, renderGlobalRadarChart } from "./chartManager.js";
import { t } from "./i18n/useTranslation.js";
import { initializeUI } from "./i18n/initUI.js";
import { renderTrail } from "./gamificacao/trailManager.js";
import { renderGuildDashboard } from "./gamificacao/leaderboard.js";
import { renderBadges } from "./gamificacao/badges.js";
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
  language: localStorage.getItem("aws_sim_lang") || "pt",
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
// INICIALIZAÇÃO

document.addEventListener("DOMContentLoaded", async () => {
  // FASE 0: User Initialization (Before everything else)
  try {
    const user = await userManager.getOrCreateUser();
    await quizManager.initialize(user.id);
    console.log(`✓ Initialized with user: ${user.id}`);
  } catch (error) {
    console.error("Failed to initialize user:", error);
    // Continue anyway - app can still work in offline mode
  }

  // FASE 1: Configurações Base (Sincronizadas)
  initTheme();
  initializeUI(uiState.language);

  // FASE 2: Traduções (Só títulos estáticos, sem destruir conteúdo)
  updateSidebarTexts();

  // FASE 3: Injeção de Dados Dinâmicos (ORDEM GARANTIDA)
  await renderSidebarContent();

  // FASE 4: Inicializações Secundárias
  renderGamification();
  updateLanguageButtonUI();
  initPWAInstall();
  wireUIActions();
  initStudyNow({ startFilteredQuiz: startWeakestDomainQuiz });
  refreshStudyNow();

  // FASE 5: Setup de Certificação
  const certSelect = document.getElementById("certification-select");

  // SINCRONIZAÇÃO INICIAL DA CERTIFICAÇÃO
  // Alinha o <select> com a certificação persistida (aws_sim_cert) no
  // carregamento. Sem isso, a trilha (renderTrail lê aws_sim_cert) e o
  // startMission (lê certification-select) podem usar certificações diferentes
  // após um reload — ex.: trilha desenha cards "saa-1" enquanto o select está
  // em "clf-c02", e startMission("saa-1") não encontra o módulo na trilha CLF.
  if (certSelect && certificationPaths) {
    const savedCert = localStorage.getItem("aws_sim_cert");
    const savedCertIsValid =
      savedCert &&
      certificationPaths[savedCert] &&
      Array.from(certSelect.options).some((opt) => opt.value === savedCert);

    if (savedCertIsValid) {
      // Restaura a escolha anterior do usuário no controle visual.
      if (certSelect.value !== savedCert) certSelect.value = savedCert;
    } else if (certificationPaths[certSelect.value]) {
      // Primeira visita (ou valor inválido): persiste a certificação que o
      // select já exibe, mantendo select e aws_sim_cert consistentes.
      localStorage.setItem("aws_sim_cert", certSelect.value);
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
  }

  // LISTENER: Mudança de Certificação
  if (certSelect) {
    certSelect.addEventListener("change", async () => {
      if (certificationPaths && certificationPaths[certSelect.value]) {
        uiState.currentCertificationInfo = certificationPaths[certSelect.value];

        const certId = certSelect.value;

        // 1. Salva a certificação no cache para as outras telas saberem
        localStorage.setItem("aws_sim_cert", certId);

        updateTopicDropdown();
        loadLastScore();
        updateDifficultyFilters(certId);
        updateMistakesControls(certId);

        // 2. Atualiza a Sprint para a nova certificação
        const badge = document.getElementById("sprint-current-cert-badge");
        if (badge) badge.innerText = certId.toUpperCase();

        renderSprintUI();

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
    console.error("Erro ao renderizar sidebar:", error);
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
  return (
    engine.state?.certId ||
    document.getElementById("certification-select")?.value ||
    localStorage.getItem("aws_sim_cert") ||
    ""
  );
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
  const countEl = document.getElementById("mistakes-count");
  const btnPractice = document.getElementById("btn-practice-mistakes");
  const btnClear = document.getElementById("btn-clear-mistakes");
  const notice = document.getElementById("mistakes-feature-notice");
  const mistakes = storageManager.getMistakes(certId);
  const hasMistakes = mistakes.length > 0;

  if (countEl) countEl.textContent = String(mistakes.length);
  if (btnPractice) btnPractice.classList.toggle("hidden", !hasMistakes);
  if (btnClear) btnClear.classList.toggle("hidden", !hasMistakes);
  if (notice && !hasMistakes) notice.classList.add("hidden");
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

async function startWeakestDomainQuiz(domainId, certId) {
  if (!domainId) return;

  const certSelect = document.getElementById("certification-select");
  const topicSelect = document.getElementById("topic-filter");

  if (certSelect && certId && certificationPaths[certId]) {
    if (certSelect.value !== certId) {
      certSelect.value = certId;
      localStorage.setItem("aws_sim_cert", certId);
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
    document.querySelector('input[name="question-quantity"]:checked')?.value ||
    10;
  const difficultyInput =
    document.querySelector('input[name="difficulty-level"]:checked')?.value ||
    "all";
  const modeInput =
    document.querySelector('input[name="quiz-mode"]:checked')?.value || "exam";
  const topicSelect = document.getElementById("topic-filter")?.value || "";
  const btn = document.getElementById("btn-start-quiz");

  if (!certSelect) return;

  try {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t("loading", uiState.language)}`;

    const certId = certSelect.value;
    const currentCertInfo = certificationPaths[certId];
    uiState.currentCertificationInfo = currentCertInfo;
    uiState.currentMode = modeInput;

    // START QUIZ ON BACKEND
    const userId = userManager.getUserId();
    if (userId) {
      try {
        const quizResponse = await quizManager.startQuiz(
          certId,
          parseInt(quantityInput),
        );
        if (!quizResponse.fromAPI) {
          console.log("⚠ Quiz started in local mode (API unavailable)");
        }
      } catch (error) {
        console.warn("Could not start quiz on backend:", error);
        // Continue anyway - frontend will work in local mode
      }
    }

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

    const oldReport = document.getElementById("detailed-report");
    if (oldReport) oldReport.remove();

    // --- INÍCIO DAS MODIFICAÇÕES DE LAYOUT ---
    showScreen("quiz");

    const sidebar = document.getElementById("side-info");
    const mainSection = document.getElementById("main-section");

    if (sidebar) sidebar.classList.add("hidden"); // Esconde a lateral
    if (mainSection) {
      mainSection.classList.remove("lg:w-2/3"); // Remove a largura parcial
      mainSection.classList.add("w-full"); // Faz ocupar a tela cheia
    }

    const scoreContainer = document.getElementById("score-container");
    if (scoreContainer) scoreContainer.style.display = "flex";
    // --- FIM DAS MODIFICAÇÕES DE LAYOUT ---

    const timerContainer = document.getElementById("timer-container");
    if (filters.mode === "exam") {
      if (timerContainer) timerContainer.classList.remove("hidden");
      startTimer();
    } else {
      if (timerContainer) timerContainer.classList.add("hidden");
    }

    loadQuestionUI();
  } catch (err) {
    alert(t("error_starting_quiz", uiState.language, { message: err.message }));
    console.error("Erro ao iniciar quiz:", err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${t("start_simulation", uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>`;
  }
}

// MOTOR DO DIAGNÓSTICO (NIVELAMENTO)
async function startDiagnostic() {
  resetFinishState();

  const certSelect = document.getElementById("certification-select");
  if (!certSelect) return;

  const btn = document.getElementById("btn-start-diagnostic");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t("loading", uiState.language)}`;
  }

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
  } catch (err) {
    console.error("Erro ao iniciar diagnóstico:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Fazer Diagnóstico <i class="fa-solid fa-stethoscope ml-2"></i>`;
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
      localStorage.setItem("aws_sim_cert", certId);
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
    console.error("Erro ao iniciar simulado personalizado:", err);
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
  document.getElementById("question-text").innerHTML = questionText;

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
        console.warn("Failed to record answer:", error);
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

function nextQuestion() {
  if (engine.nextQuestion()) {
    loadQuestionUI();
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
      uiState.flags = uiState.flags.filter(i => i !== currentIdx);
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
  const screens = ["start", "quiz", "results", "flashcards", "jornada"];
  screens.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(`screen-${screenName}`);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("flex", "flex-col", "fade-in");
  }
}

// showResultsScreen com polling para garantir que o canvas está visível
function showResultsScreen() {
  const results = engine.getFinalResults();

  if (!results) {
    console.error("Erro ao obter resultados finais do quiz");
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
      console.warn("Canvas radarChart não ficou disponível a tempo.");
    }
  };

  setTimeout(() => tryRenderChart(), 80);
}

function displayReportFromResult(results) {
  if (!results || typeof results.percentage !== "number") {
    console.error("Dados de resultado inválidos em displayReportFromResult");
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
    console.error("Dados de resultado inválidos em renderDetailedReportUI");
    return;
  }

  const resultsScreen = document.getElementById("screen-results");
  if (!resultsScreen) {
    console.error("Tela de resultados não encontrada");
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
      
      uiState.flags.forEach(qIdx => {
          const q = engine.state.questions[qIdx];
          if (!q) return;
          
          const isMulti = Array.isArray(q.correct);
          let correctText = isMulti 
              ? q.correct.map(i => q.options[i]).join("<br>• ") 
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
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 print-border-black">
            <div class="mb-3 a3-stat-card text-left print-no-bg">
                <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">${t("your_answer_label", uiState.language)}</span>
                <span class="${colorClass} font-semibold block leading-snug">${icon} ${isMulti ? "<br>• " : ""}${userText}</span>
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
        <div class="mt-10 text-center flex justify-center gap-4 fade-in">
            <button onclick="goHome()" class="a3-button-secondary py-3 px-8 text-lg w-auto">
                Voltar ao Início
            </button>
            ${
              weakDomains.length > 0
                ? `<button id="btn-start-personalized-diagnostic-quiz" class="a3-button-primary py-3 px-8 text-lg w-auto">
                    ${t("practice_weak_domains", uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>
                </button>`
                : ""
            }
        </div>
    `;

  resultsScreen.innerHTML = html;
  bindClick(
    "btn-start-personalized-diagnostic-quiz",
    startPersonalizedDiagnosticQuiz,
  );
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
  if (uiState.currentMode === "diagnostic") return;

  const results = engine.getFinalResults();
  const saved = storageManager.saveQuizResult({
    ...results,
    quizId: results.quizId || quizManager?.currentQuizId,
  });

  // Confirm backend sync if quiz was started via API
  if (quizManager && quizManager.currentQuizId) {
    console.log(
      `✓ Quiz ${quizManager.currentQuizId} completed and synced to backend`,
    );
  }

  if (saved) {
    updateGamification(results.percentage);
  } else {
    console.warn("Resultado duplicado ignorado no histÃ³rico.");
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
    banner.classList.add(
      "cursor-pointer",
      "a3-hover-lift",
    );
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
}

function removeHistoryItem(event, index) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const confirmMessage =
    uiState.language === "en"
      ? "Remove this session from history?"
      : "Remover esta sessão do histórico?";

  if (!confirm(confirmMessage)) return;

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

function clearHistory() {
  if (confirm(t("clear_history_confirm", uiState.language))) {
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
    const response = await fetch(`data/${certId}${fileSuffix}.json`);
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
    console.error("Erro ao atualizar filtros de dificuldade:", error);
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
  const theme = localStorage.getItem("aws_sim_theme") || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("aws_sim_theme", isDark ? "dark" : "light");

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
  localStorage.setItem("aws_sim_lang", uiState.language);

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

  console.log(
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

function updateLanguageButtonUI() {
  const langBtn = document.getElementById("btn-language");
  if (langBtn) {
    langBtn.innerHTML =
      uiState.language === "pt"
        ? '<span class="text-[10px] md:text-xs font-bold">🇧🇷 <span class="hidden sm:inline">PT-BR</span></span>'
        : '<span class="text-[10px] md:text-xs font-bold">🇺🇸 <span class="hidden sm:inline">EN-US</span></span>';
  }
}

function goHome() {
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
  renderTrail();
  await renderGuildDashboard();
  renderBadges();
}

function retakeQuiz() {
  goHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelQuiz() {
  if (confirm(t("exit_quiz_confirm", uiState.language))) goHome();
}

async function startMistakesQuiz() {
  resetFinishState();

  const certId = getActiveCertificationId();
  const currentCertInfo = certificationPaths[certId];

  if (!certId || !currentCertInfo) {
    console.warn("startMistakesQuiz: certificação não identificada.");
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
      const quizResponse = await quizManager.startQuiz(certId, mistakes.length);
      if (!quizResponse.fromAPI) {
        console.log("⚠ Mistakes quiz rodando em modo local (API indisponível)");
      }
    } catch (err) {
      console.warn("Não foi possível registrar sessão no backend:", err);
      // Continua — o quiz de revisão de erros funciona 100% local
    }

    const result = engine.loadFromMistakes(
      mistakes,
      certId,
      currentCertInfo.domains,
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
    console.error("Erro ao iniciar revisão de erros:", err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Praticar Questões Erradas (<span id="mistakes-count">0</span>)`;
      // Atualiza o span recém-recriado com a contagem real
      updateMistakesControls(certId);
    }
  }
}

function clearMistakes() {
  if (confirm(t("clear_mistakes_confirm", uiState.language))) {
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

// PWA INSTALL BUTTON
let deferredPrompt = null;

function initPWAInstall() {
  const installButton = document.getElementById("install-app");
  if (!installButton) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => {
    installButton.classList.add("hidden");
    deferredPrompt = null;
  });
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
    uiState.language || localStorage.getItem("aws_sim_lang") || "pt";

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
    console.error(
      `[startMission] Certificação ${currentCertId} não encontrada`,
    );
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
      console.error(
        `[startMission] Módulo ${stageId} não encontrado na trilha`,
      );
      alert("Erro ao identificar o módulo. Tente novamente.");
      return;
    }
  } catch (err) {
    console.error("[startMission] Erro ao importar trailManager:", err);
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

    console.error("[startMission] Erro ao iniciar missão:", err);
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
    console.error("Erro na missão:", err);
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
