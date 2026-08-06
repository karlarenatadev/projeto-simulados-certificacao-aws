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
import { userManager } from "../userManager.js";
import { t } from "../i18n/useTranslation.js";
import { AuthService } from "../services/authService.js";

const CONTENT_ID = "weak-domains-content";

let onStudyWeakest = null;
let learningAnalytics = null;
let recommendationEngine = null;

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
  } catch (error) {
    console.error("[StudyNow] Erro ao gerar recomendacoes:", error);
    renderEmpty("studyNow.empty_state_no_history");
  }
}
