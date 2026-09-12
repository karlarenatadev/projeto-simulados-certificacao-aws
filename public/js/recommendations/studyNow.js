/**
 * Study Now ("O Que Estudar Agora")
 * Componente isolado de recomendacao que exibe na sidebar os 3 dominios com
 * maior taxa de erro do usuario. Agora opera como Adapter para o LearningAnalytics.
 *
 * @module recommendations/studyNow
 */

import { storageManager } from "../storageManager.js";
import { LearningAnalytics } from "../analytics/learningAnalytics.js";
import { RecommendationEngine } from "./recommendationEngine.js";
import { t } from "../i18n/useTranslation.js";
import { AuthService } from "../services/authService.js";
import { logger } from "../utils/logger.js";
import { getDomainDefinition } from "../domainTaxonomy.js";
import { getCurrentLanguage } from "../core/languageManager.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { resolveAppUrl } from "../core/navigation.js";

const CONTENT_ID = "weak-domains-content";
const COMPACT_CONTENT_ID = "study-now-compact";
export const STUDY_NOW_STATES = Object.freeze({
  LOADING: "LOADING",
  READY: "READY",
  EMPTY: "EMPTY",
  ERROR: "ERROR",
});
export const DIAGNOSTIC_RECOMMENDATION_STORAGE_KEY =
  "aws_sim_last_diagnostic_recommendation";

let onStudyWeakest = null;
let learningAnalytics = null;
let recommendationEngine = null;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function readDiagnosticRecommendations(
  storage = globalThis.localStorage,
) {
  if (!storage) return null;

  try {
    const key =
      storage === globalThis.localStorage
        ? storageManager.getUserScopedKey("last_diagnostic_recommendation")
        : DIAGNOSTIC_RECOMMENDATION_STORAGE_KEY;
    const raw = storage.getItem(key);
    if (!raw) return null;

    const recommendation = JSON.parse(raw);
    if (
      recommendation?.source !== "diagnostic" ||
      !recommendation.certificationId ||
      !Array.isArray(recommendation.priorities) ||
      !recommendation.recommendations?.flashcards?.context ||
      !recommendation.recommendations?.questions?.context
    ) {
      return null;
    }

    return recommendation;
  } catch {
    return null;
  }
}

export function getDiagnosticPriorities(recommendation, limit = 3) {
  if (
    !recommendation?.certificationId ||
    !Array.isArray(recommendation.priorities)
  ) {
    return [];
  }

  return [...recommendation.priorities]
    .filter(
      (priority) => priority?.domainId && typeof priority.score === "number",
    )
    .sort(
      (left, right) =>
        (PRIORITY_ORDER[left.priority] ?? PRIORITY_ORDER.low) -
          (PRIORITY_ORDER[right.priority] ?? PRIORITY_ORDER.low) ||
        left.score - right.score,
    )
    .slice(0, limit)
    .map((priority) => {
      const definition = getDomainDefinition(
        recommendation.certificationId,
        priority.domainId,
      );
      return {
        ...priority,
        labelPt: definition?.labelPt || priority.domainId,
        labelEn: definition?.labelEn || priority.domainId,
      };
    });
}

export function buildDiagnosticStudyNowModel(recommendation, language = "pt") {
  if (
    !Array.isArray(recommendation?.weakDomains) ||
    recommendation.weakDomains.length === 0
  ) {
    return null;
  }
  const priorities = getDiagnosticPriorities(recommendation);
  if (!recommendation || priorities.length === 0) return null;

  const labsRecommendation = recommendation.recommendations?.labs;
  const labsContext =
    labsRecommendation?.enabled &&
    labsRecommendation.context?.source === "diagnostic" &&
    labsRecommendation.context.certificationId &&
    Array.isArray(labsRecommendation.context.services) &&
    labsRecommendation.context.services.length > 0
      ? labsRecommendation.context
      : null;
  const casesRecommendation = recommendation.recommendations?.cases;
  const casesContext =
    casesRecommendation?.enabled &&
    casesRecommendation.context?.source === "diagnostic" &&
    casesRecommendation.context.certificationId &&
    Array.isArray(casesRecommendation.context.services) &&
    Array.isArray(casesRecommendation.context.weakDomains)
      ? casesRecommendation.context
      : null;

  return {
    certificationId: recommendation.certificationId,
    priorities: priorities.map((priority) => ({
      ...priority,
      label: language === "en" ? priority.labelEn : priority.labelPt,
    })),
    flashcardsContext: recommendation.recommendations.flashcards.context,
    questionsContext: recommendation.recommendations.questions.context,
    labsContext,
    casesContext,
  };
}

/**
 * Inicializa o componente, registrando o callback que inicia um quiz filtrado.
 *
 * @param {object} options
 * @param {(domainId: string, certId: string|null) => void} options.startFilteredQuiz
 */
export function initStudyNow({ startFilteredQuiz } = {}) {
  onStudyWeakest =
    typeof startFilteredQuiz === "function" ? startFilteredQuiz : null;
  learningAnalytics = new LearningAnalytics(storageManager);
  recommendationEngine = new RecommendationEngine();
}

function getContainer() {
  return document.getElementById(CONTENT_ID);
}

function getCompactContainer() {
  return document.getElementById(COMPACT_CONTENT_ID);
}

function appendCompactMessage(container, message, className) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = message;
  container.replaceChildren(paragraph);
}

export function renderStudyNowState(state, recommendation = {}, language) {
  const container = getCompactContainer();
  if (!container) return;

  const lang = language || getCurrentLanguage();
  container.dataset.state = state.toLowerCase();

  if (state === STUDY_NOW_STATES.LOADING) {
    appendCompactMessage(
      container,
      t("studyNow.loading", lang),
      "study-now-compact-empty",
    );
    return;
  }

  if (state === STUDY_NOW_STATES.ERROR) {
    appendCompactMessage(
      container,
      t("studyNow.error", lang),
      "study-now-compact-empty",
    );
    return;
  }

  if (state === STUDY_NOW_STATES.EMPTY || !recommendation?.title) {
    appendCompactMessage(
      container,
      t("studyNow.empty", lang),
      "study-now-compact-empty",
    );
    return;
  }

  const title = t(
    recommendation.title,
    lang,
    recommendation.titleVariables || {},
  );
  const description = t(
    recommendation.description,
    lang,
    recommendation.descriptionVariables || {},
  );
  const content = document.createElement("div");
  content.className = "study-now-compact-content";
  content.dataset.recommendation = recommendation.kind || "general";

  const icon = document.createElement("i");
  icon.className = `${recommendation.icon || "fa-solid fa-lightbulb"} study-now-compact-icon`;
  icon.setAttribute("aria-hidden", "true");

  const copy = document.createElement("div");
  copy.className = "study-now-compact-copy";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const span = document.createElement("span");
  span.textContent = description;
  copy.append(strong, span);
  content.append(icon, copy);

  if (recommendation.route) {
    const link = document.createElement("a");
    link.className = "a3-btn a3-btn-outline study-now-compact-cta";
    link.href = resolveAppUrl(recommendation.route);
    link.textContent = t(recommendation.cta || "studyNow.compact_cta", lang);
    link.setAttribute("aria-label", `${title}. ${link.textContent}`);
    content.append(link);
  }

  container.replaceChildren(content);
}

export function renderStudyNowCompact(actions) {
  const action = (actions || []).find((item) => item?.type !== "empty_state");
  if (!action) {
    renderStudyNowState(STUDY_NOW_STATES.EMPTY);
    return;
  }
  renderStudyNowState(STUDY_NOW_STATES.READY, action);
}

export function selectStudyNowRecommendation({
  profile,
  sprintState,
  mistakes,
  reviewStats,
  studyPlan,
} = {}) {
  if (!profile?.overview) return null;

  const certId = normalizeCertificationId(profile.certification) || "clf-c02";
  if (profile.overview.examsTaken === 0) {
    return {
      kind: "first-quiz",
      title: "studyNow.first_quiz_title",
      description: "studyNow.first_quiz_description",
      route: `simulados.html?cert=${certId}`,
      icon: "fa-solid fa-play",
    };
  }

  const completedSprintDays = Array.isArray(sprintState?.completedStages)
    ? [...new Set(sprintState.completedStages)].length
    : 0;
  if (completedSprintDays > 0 && completedSprintDays < 14) {
    return {
      kind: "sprint",
      title: "studyNow.sprint_title",
      titleVariables: { day: Math.min(completedSprintDays + 1, 14) },
      description: "studyNow.sprint_description",
      route: "study-sprint.html",
      icon: "fa-solid fa-bolt",
    };
  }

  if (Array.isArray(mistakes) && mistakes.length > 0) {
    return {
      kind: "mistakes",
      title: "studyNow.mistakes_title",
      description: "studyNow.mistakes_description",
      descriptionVariables: { count: mistakes.length },
      icon: "fa-solid fa-rotate-left",
    };
  }

  if (Number(reviewStats?.pending) > 0) {
    return {
      kind: "review-deck",
      title: "studyNow.deck_title",
      description: "studyNow.deck_description",
      descriptionVariables: { count: reviewStats.pending },
      route: "flashcards.html",
      icon: "fa-solid fa-layer-group",
    };
  }

  const criticalDomain = profile.domains?.find(
    (domain) => domain.status === "critical",
  );
  if (criticalDomain) {
    const practiceAction = studyPlan?.nextActions?.find(
      (action) => action.type === "practice",
    );
    return {
      kind: "critical-domain",
      title: "studyNow.critical_domain_title",
      titleVariables: { domain: criticalDomain.name },
      description: "studyNow.critical_domain_description",
      descriptionVariables: { score: criticalDomain.score },
      route: practiceAction?.route,
      icon: "fa-solid fa-bullseye",
    };
  }

  if (
    profile.overview.trend === "negative" ||
    profile.overview.recentDirection === "down"
  ) {
    return {
      kind: "declining",
      title: "studyNow.declining_title",
      description: "studyNow.declining_description",
      icon: "fa-solid fa-chart-line",
    };
  }

  return {
    kind: "new-quiz",
    title: "studyNow.new_quiz_title",
    description: "studyNow.new_quiz_description",
    route: `simulados.html?cert=${certId}`,
    icon: "fa-solid fa-play",
  };
}

function renderEmpty(messageKey, success = false) {
  const container = getContainer();
  if (!container) return;
  const lang = getCurrentLanguage();
  const message = t(messageKey, lang);
  const cls = success ? "study-now-success" : "study-now-empty";
  const icon = success ? '<i class="fa-solid fa-circle-check"></i> ' : "";
  container.innerHTML = `<p class="${cls}">${icon}${message}</p>`;
}

function renderActions(actions) {
  const container = getContainer();
  if (!container) return;

  const lang = getCurrentLanguage();

  if (!actions || actions.length === 0) {
    renderEmpty("studyNow.empty_state_doing_great", true);
    return;
  }

  // Se a primeira ação for um empty state, renderiza como vazio
  if (actions[0].type === "empty_state") {
    renderEmpty(actions[0].title, actions[0].icon === "fa-solid fa-trophy");
    return;
  }

  const items = actions
    .map((action, i) => {
      const title = t(action.title, lang, action.titleVariables || {});
      const desc = t(
        action.description,
        lang,
        action.descriptionVariables || {},
      );

      const isExternal = action.isExternal
        ? 'target="_blank" rel="noopener noreferrer"'
        : "";
      const studyLink = `<a href="${action.route}" ${isExternal} class="study-now-link">${title} <i class="fa-solid fa-arrow-right"></i></a>`;

      return `<div class="study-now-item">
        <span class="study-now-rank">${i + 1}.</span>
        <span class="study-now-label" title="${action.domain}">${action.domain}</span>
        <span class="study-now-badge study-now-badge--high">${desc}</span>
        ${studyLink}
      </div>`;
    })
    .join("");

  const firstPractice = actions.find((a) => a.type === "practice");
  const button = firstPractice
    ? `<button type="button" class="study-now-btn" data-route="${firstPractice.route}">
        <i class="${firstPractice.icon}"></i> ${t(firstPractice.title, lang, firstPractice.titleVariables || {})}
      </button>`
    : "";

  container.innerHTML = `<div class="study-now-list">${items}</div>${button}`;

  const btn = container.querySelector(".study-now-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      // Se não houver override de navegação (SPA antigo), usa a rota física
      if (onStudyWeakest) {
        // Fallback legacy caso precise (mas agora as rotas já vêm prontas do backend analytics)
        window.location.href = route;
      } else {
        window.location.href = route;
      }
    });
  }
}

export function renderDiagnosticRecommendations(recommendation) {
  const container = document.getElementById("study-now-recommendations");
  if (!container) return;

  const lang = getCurrentLanguage();
  const model = buildDiagnosticStudyNowModel(recommendation, lang);
  if (!model) {
    container.innerHTML = "";
    return;
  }

  const priorityLabel = (priority) => t(`studyNow.priority_${priority}`, lang);
  const priorityItems = model.priorities
    .map(
      (priority) => `
        <div class="study-now-item">
          <span class="study-now-rank">${priority.label}</span>
          <span class="study-now-badge study-now-badge--${priority.priority}">
            ${priority.score.toFixed(0)}% — ${priorityLabel(priority.priority)}
          </span>
        </div>`,
    )
    .join("");

  container.innerHTML = `
    <div class="a3-card p-4 border-l-4 border-orange-500" data-source="diagnostic">
      <div class="a3-card-header mb-3">
        <h3 class="text-main m-0">${t("studyNow.diagnostic_title", lang)}</h3>
        <p class="text-muted text-sm mt-1">${t("studyNow.diagnostic_subtitle", lang)}</p>
      </div>
      <div class="study-now-list">${priorityItems}</div>
      <div class="flex flex-wrap gap-3 mt-4">
        <button type="button" class="study-now-btn" data-diagnostic-action="flashcards">
          <i class="fa-solid fa-layer-group"></i> ${t("studyNow.diagnostic_flashcards", lang)}
        </button>
        <button type="button" class="study-now-btn" data-diagnostic-action="questions">
          <i class="fa-solid fa-play"></i> ${t("studyNow.diagnostic_questions", lang)}
        </button>
        ${
          model.labsContext
            ? `<button type="button" class="study-now-btn" data-diagnostic-action="labs">
          <i class="fa-solid fa-flask"></i> ${t("studyNow.diagnostic_labs", lang)}
        </button>`
            : ""
        }
        ${
          model.casesContext
            ? `<button type="button" class="study-now-btn" data-diagnostic-action="cases">
          <i class="fa-solid fa-diagram-project"></i> ${t("studyNow.diagnostic_cases", lang)}
        </button>`
            : ""
        }
      </div>
    </div>`;

  container
    .querySelector('[data-diagnostic-action="flashcards"]')
    ?.addEventListener("click", () => {
      sessionStorage.setItem(
        storageManager.getUserScopedKey("diagnostic_context"),
        JSON.stringify(model.flashcardsContext),
      );
      window.location.href = "./flashcards.html";
    });
  container
    .querySelector('[data-diagnostic-action="questions"]')
    ?.addEventListener("click", () => {
      sessionStorage.setItem(
        storageManager.getUserScopedKey("diagnostic_context"),
        JSON.stringify(model.questionsContext),
      );
      window.location.href = "./simulados.html";
    });
  container
    .querySelector('[data-diagnostic-action="labs"]')
    ?.addEventListener("click", () => {
      window.location.href = "./laboratorios.html";
    });
  container
    .querySelector('[data-diagnostic-action="cases"]')
    ?.addEventListener("click", () => {
      window.location.href = "./cases.html";
    });
}

/**
 * Busca os dominios fracos offline via Analytics Engine e re-renderiza o card.
 */
export async function refreshStudyNow({
  projection,
  certificationId,
  storage = storageManager,
  analytics,
  engine,
  language,
} = {}) {
  const container = getContainer();
  const compactContainer = getCompactContainer();
  if (!container && !compactContainer) {
    return { state: STUDY_NOW_STATES.EMPTY, recommendation: null };
  }

  const lang = language || getCurrentLanguage();
  renderStudyNowState(STUDY_NOW_STATES.LOADING, {}, lang);
  if (container) {
    container.innerHTML = `<p class="study-now-loading">${t("studyNow.loading", lang)}</p>`;
  }

  try {
    const certId =
      normalizeCertificationId(
        certificationId ||
          projection?.certificationId ||
          AuthService.getCurrentUser()?.certification,
      ) || "clf-c02";

    // Fallback instantiation if called before initApp (sanity check)
    const analyticsService =
      analytics ||
      learningAnalytics ||
      (learningAnalytics = new LearningAnalytics(storage));
    const planEngine =
      engine ||
      recommendationEngine ||
      (recommendationEngine = new RecommendationEngine());

    const profile =
      projection?.profile || analyticsService.getLearningProfile(certId);
    const plan = planEngine.generateStudyPlan(profile);
    const mistakes = storage.getMistakes?.(certId) ?? [];
    const recommendation = selectStudyNowRecommendation({
      profile,
      sprintState: storage.getSprintState?.(certId) ?? {},
      mistakes: Array.isArray(mistakes) ? mistakes : [],
      reviewStats: storage.getReviewStats?.(certId) ?? {},
      studyPlan: plan,
    });

    renderActions(plan.nextActions);
    if (recommendation) {
      renderStudyNowState(STUDY_NOW_STATES.READY, recommendation, lang);
    } else {
      renderStudyNowState(STUDY_NOW_STATES.EMPTY, {}, lang);
    }
    renderDiagnosticRecommendations(readDiagnosticRecommendations());
    return {
      state: recommendation ? STUDY_NOW_STATES.READY : STUDY_NOW_STATES.EMPTY,
      recommendation,
    };
  } catch (error) {
    logger.error("[StudyNow] Erro ao gerar recomendacoes:", error);
    renderEmpty("studyNow.empty_state_no_history");
    renderStudyNowState(STUDY_NOW_STATES.ERROR, {}, lang);
    return { state: STUDY_NOW_STATES.ERROR, recommendation: null };
  } finally {
    if (compactContainer?.dataset.state === "loading") {
      renderStudyNowState(STUDY_NOW_STATES.EMPTY, {}, lang);
    }
  }
}
