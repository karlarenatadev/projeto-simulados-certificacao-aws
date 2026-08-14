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

const CONTENT_ID = "weak-domains-content";
export const DIAGNOSTIC_RECOMMENDATION_STORAGE_KEY =
  "aws_sim_last_diagnostic_recommendation";

let onStudyWeakest = null;
let learningAnalytics = null;
let recommendationEngine = null;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function readDiagnosticRecommendations(storage = globalThis.localStorage) {
  if (!storage) return null;

  try {
    const raw = storage.getItem(DIAGNOSTIC_RECOMMENDATION_STORAGE_KEY);
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
  if (!recommendation?.certificationId || !Array.isArray(recommendation.priorities)) {
    return [];
  }

  return [...recommendation.priorities]
    .filter((priority) => priority?.domainId && typeof priority.score === "number")
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
  if (!Array.isArray(recommendation?.weakDomains) || recommendation.weakDomains.length === 0) {
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

  return {
    certificationId: recommendation.certificationId,
    priorities: priorities.map((priority) => ({
      ...priority,
      label: language === "en" ? priority.labelEn : priority.labelPt,
    })),
    flashcardsContext: recommendation.recommendations.flashcards.context,
    questionsContext: recommendation.recommendations.questions.context,
    labsContext,
  };
}

/**
 * Inicializa o componente, registrando o callback que inicia um quiz filtrado.
 *
 * @param {object} options
 * @param {(domainId: string, certId: string|null) => void} options.startFilteredQuiz
 */
export function initStudyNow({ startFilteredQuiz } = {}) {
  onStudyWeakest = typeof startFilteredQuiz === "function" ? startFilteredQuiz : null;
  learningAnalytics = new LearningAnalytics(storageManager);
  recommendationEngine = new RecommendationEngine();
}

function getContainer() {
  return document.getElementById(CONTENT_ID);
}

function renderEmpty(messageKey, success = false) {
  const container = getContainer();
  if (!container) return;
  const lang = localStorage.getItem("language") || "pt";
  const message = t(messageKey, lang);
  const cls = success ? "study-now-success" : "study-now-empty";
  const icon = success ? '<i class="fa-solid fa-circle-check"></i> ' : "";
  container.innerHTML = `<p class="${cls}">${icon}${message}</p>`;
}

function renderActions(actions) {
  const container = getContainer();
  if (!container) return;
  
  const lang = localStorage.getItem("language") || "pt";

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
      const desc = t(action.description, lang, action.descriptionVariables || {});
      
      const isExternal = action.isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
      const studyLink = `<a href="${action.route}" ${isExternal} class="study-now-link">${title} <i class="fa-solid fa-arrow-right"></i></a>`;

      return `<div class="study-now-item">
        <span class="study-now-rank">${i + 1}.</span>
        <span class="study-now-label" title="${action.domain}">${action.domain}</span>
        <span class="study-now-badge study-now-badge--high">${desc}</span>
        ${studyLink}
      </div>`;
    })
    .join("");

  const firstPractice = actions.find(a => a.type === "practice");
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

  const lang = localStorage.getItem("language") || "pt";
  const model = buildDiagnosticStudyNowModel(recommendation, lang);
  if (!model) {
    container.innerHTML = "";
    return;
  }

  const priorityLabel = (priority) =>
    t(`studyNow.priority_${priority}`, lang);
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
        ${model.labsContext ? `<button type="button" class="study-now-btn" data-diagnostic-action="labs">
          <i class="fa-solid fa-flask"></i> ${t("studyNow.diagnostic_labs", lang)}
        </button>` : ""}
      </div>
    </div>`;

  container.querySelector('[data-diagnostic-action="flashcards"]')?.addEventListener("click", () => {
    sessionStorage.setItem(
      "aws_sim_diagnostic_context",
      JSON.stringify(model.flashcardsContext),
    );
    window.location.href = "./flashcards.html";
  });
  container.querySelector('[data-diagnostic-action="questions"]')?.addEventListener("click", () => {
    sessionStorage.setItem(
      "aws_sim_diagnostic_context",
      JSON.stringify(model.questionsContext),
    );
    window.location.href = "./simulados.html";
  });
  container.querySelector('[data-diagnostic-action="labs"]')?.addEventListener("click", () => {
    window.location.href = "./laboratorios.html";
  });
}

/**
 * Busca os dominios fracos offline via Analytics Engine e re-renderiza o card.
 */
export async function refreshStudyNow() {
  const container = getContainer();
  if (!container) return;

  const lang = localStorage.getItem("language") || "pt";
  container.innerHTML = `<p class="study-now-loading">${t("studyNow.loading", lang)}</p>`;

  try {
    const certId = AuthService.getCurrentUser()?.certification || "clf-c02";
    
    // Fallback instantiation if called before initApp (sanity check)
    if (!learningAnalytics) learningAnalytics = new LearningAnalytics(storageManager);
    if (!recommendationEngine) recommendationEngine = new RecommendationEngine();

    const profile = learningAnalytics.getLearningProfile(certId);
    const plan = recommendationEngine.generateStudyPlan(profile);

    renderActions(plan.nextActions);
    renderDiagnosticRecommendations(readDiagnosticRecommendations());
  } catch (error) {
    logger.error("[StudyNow] Erro ao gerar recomendacoes:", error);
    renderEmpty("studyNow.empty_state_no_history");
  }
}
