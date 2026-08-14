import { storageManager } from "../storageManager.js";
import { AuthService } from "../services/authService.js";
import { logger } from "../utils/logger.js";
import { normalizeCertificationId } from "../utils/certUtils.js";

// 1. DICIONÁRIO DE TRILHAS (4 Certificações com suporte Bilingue)
export const TRAILS_BY_CERT = {
  "clf-c02": [
    {
      id: "clf-1",
      title: { pt: "Conceitos Cloud", en: "Cloud Concepts" },
      icon: "fa-cloud",
    },
    {
      id: "clf-2",
      title: { pt: "Segurança & Compliance", en: "Security & Compliance" },
      icon: "fa-shield-halved",
    },
    {
      id: "clf-3",
      title: { pt: "Tecnologia Cloud", en: "Cloud Technology" },
      icon: "fa-server",
    },
    {
      id: "clf-4",
      title: { pt: "Faturamento e Preços", en: "Billing and Pricing" },
      icon: "fa-file-invoice-dollar",
    },
    {
      id: "clf-final",
      title: { pt: "Simulado Final CLF", en: "Final Exam CLF" },
      icon: "fa-flag-checkered",
    },
  ],
  "saa-c03": [
    {
      id: "saa-1",
      title: { pt: "Arquitetura Segura", en: "Secure Architecture" },
      icon: "fa-lock",
    },
    {
      id: "saa-2",
      title: { pt: "Arquitetura Resiliente", en: "Resilient Architecture" },
      icon: "fa-network-wired",
    },
    {
      id: "saa-3",
      title: { pt: "Alta Performance", en: "High-Performing" },
      icon: "fa-bolt",
    },
    {
      id: "saa-4",
      title: { pt: "Otimização de Custos", en: "Cost-Optimized" },
      icon: "fa-piggy-bank",
    },
    {
      id: "saa-final",
      title: { pt: "Simulado Final SAA", en: "Final Exam SAA" },
      icon: "fa-flag-checkered",
    },
  ],
  "aif-c01": [
    {
      id: "aif-1",
      title: { pt: "Fundamentos de IA/ML", en: "AI/ML Fundamentals" },
      icon: "fa-brain",
    },
    {
      id: "aif-2",
      title: { pt: "Casos de Uso da AWS", en: "AWS Use Cases" },
      icon: "fa-lightbulb",
    },
    {
      id: "aif-3",
      title: { pt: "Segurança em IA", en: "Security in AI" },
      icon: "fa-user-shield",
    },
    {
      id: "aif-4",
      title: { pt: "Uso Responsável", en: "Responsible AI" },
      icon: "fa-scale-balanced",
    },
    {
      id: "aif-final",
      title: { pt: "Simulado Final AIF", en: "Final Exam AIF" },
      icon: "fa-flag-checkered",
    },
  ],
  "dva-c02": [
    {
      id: "dva-1",
      title: { pt: "Desenvolvimento AWS", en: "AWS Development" },
      icon: "fa-code",
    },
    {
      id: "dva-2",
      title: { pt: "Segurança no Código", en: "Security in Code" },
      icon: "fa-file-code",
    }, // CORRIGIDO AQUI
    {
      id: "dva-3",
      title: { pt: "Implantação (CI/CD)", en: "Deployment (CI/CD)" },
      icon: "fa-rocket",
    },
    {
      id: "dva-4",
      title: { pt: "Troubleshooting", en: "Troubleshooting" },
      icon: "fa-bug",
    },
    {
      id: "dva-final",
      title: { pt: "Simulado Final DVA", en: "Final Exam DVA" },
      icon: "fa-flag-checkered",
    },
  ],
};

export function getTrailState(certId) {
  const normalizedCertId = normalizeCertificationId(certId) || "clf-c02";
  const activeTrail = TRAILS_BY_CERT[normalizedCertId] || TRAILS_BY_CERT["clf-c02"];
  const stored = storageManager.getGamification(normalizedCertId) || {};
  const validIds = new Set(activeTrail.map((stage) => stage.id));
  const completedStages = [...new Set(
    (Array.isArray(stored.completedStages) ? stored.completedStages : [])
      .filter((stageId) => validIds.has(stageId)),
  )];
  const unlockedStages = [...new Set(
    (Array.isArray(stored.unlockedStages) ? stored.unlockedStages : [])
      .filter((stageId) => validIds.has(stageId)),
  )];

  return {
    certificationId: normalizedCertId,
    completedStages,
    unlockedStages,
    totalStages: activeTrail.length,
    percentage: activeTrail.length
      ? Math.min(Math.round((completedStages.length / activeTrail.length) * 100), 100)
      : 0,
  };
}

export function readJourneyRecommendation(certId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem("aws_sim_last_diagnostic_recommendation");
    const recommendation = raw ? JSON.parse(raw) : null;
    if (
      recommendation?.source !== "diagnostic" ||
      normalizeCertificationId(recommendation.certificationId) !==
        (normalizeCertificationId(certId) || "clf-c02")
    ) {
      return null;
    }
    return recommendation;
  } catch {
    return null;
  }
}

export function renderJourneyRecommendation(certId, lang = "pt") {
  const container = document.getElementById("jornada-recommendation");
  if (!container) return;

  const normalizedCertId = normalizeCertificationId(certId) || "clf-c02";
  const recommendation = readJourneyRecommendation(normalizedCertId);
  const progress = storageManager.getSprintState(normalizedCertId);
  const completedDays = [...new Set(
    (Array.isArray(progress.completedStages) ? progress.completedStages : [])
      .map((day) => Number.parseInt(day, 10))
      .filter((day) => day >= 1 && day <= 14),
  )].length;
  const currentDay = Math.min(completedDays + 1, 14);
  const hasActiveSprint = completedDays > 0 && completedDays < 14;
  const actions = recommendation?.recommendations || {};
  const availableActions = [
    ["flashcards", "./flashcards.html", lang === "en" ? "Review flashcards" : "Revisar Flashcards"],
    ["questions", "./simulados.html", lang === "en" ? "Practice questions" : "Praticar Questões"],
    ["labs", "./laboratorios.html", lang === "en" ? "View recommended Labs" : "Ver Labs recomendados"],
    ["cases", "./cases.html", lang === "en" ? "View recommended Cases" : "Ver Cases recomendados"],
  ].filter(([key]) => actions[key]);

  const cards = [];
  if (recommendation && availableActions.length) {
    const title = lang === "en" ? "Based on your latest X-Ray" : "Baseado no seu último Raio-X";
    const description = lang === "en"
      ? "Continue your journey with the recommended actions."
      : "Continue sua jornada com as ações recomendadas.";
    cards.push(`<section class="a3-card p-4 mb-4" data-testid="journey-recommendation">
      <h3 class="font-bold">${title}</h3>
      <p class="text-sm text-muted mt-1">${description}</p>
      <div class="flex flex-wrap gap-2 mt-3">${availableActions.map(([key, href, label]) =>
        `<a class="a3-btn a3-btn-secondary" data-recommendation-action="${key}" href="${href}">${label}</a>`).join("")}</div>
    </section>`);
  }

  if (hasActiveSprint) {
    const title = lang === "en" ? `Continue Sprint — Day ${currentDay}/14` : `Continuar Sprint — Dia ${currentDay}/14`;
    cards.push(`<section class="a3-card p-4 mb-4" data-testid="journey-sprint-status">
      <strong>${title}</strong>
      <a class="a3-btn a3-btn-secondary ml-2" href="./study-sprint.html">${lang === "en" ? "Open Sprint" : "Abrir Sprint"}</a>
    </section>`);
  }

  container.innerHTML = cards.join("");
}

export function renderTrail() {
  // 1. Busca o container de forma à prova de falhas (tenta vários IDs/Classes comuns)
  const container =
    document.getElementById("gamificacao-trail") ||
    document.getElementById("trail-container") ||
    document.querySelector(".trail-container");

  if (!container) {
    logger.error("AWS Sim: Container da trilha não encontrado no DOM.");
    return; // Se não achar onde desenhar, ele para aqui (causa do ecrã branco)
  }

  // 2. Identifica a certificação e idioma atuais
  const currentLang = AuthService.getCurrentUser()?.language || "pt";
  const currentCertId = normalizeCertificationId(
    AuthService.getCurrentUser()?.certification,
  ) || "clf-c02";
  const activeTrail =
    TRAILS_BY_CERT[currentCertId] || TRAILS_BY_CERT["clf-c02"];

  // 3. Carrega os dados de gamificação de forma segura
  let gamification = storageManager.getGamification(currentCertId) || {};
  if (!gamification.completedStages) gamification.completedStages = [];
  if (!gamification.unlockedStages) gamification.unlockedStages = [];

  // 4. Força o desbloqueio do primeiro módulo da trilha atual
  if (activeTrail && activeTrail.length > 0) {
    const firstStageId = activeTrail[0].id;
    if (!gamification.unlockedStages.includes(firstStageId)) {
      gamification.unlockedStages.push(firstStageId);

      storageManager.saveGamification(gamification, currentCertId);
    }
  }

  let html = "";

  // 5. Monta o HTML
  activeTrail.forEach((stage, index) => {
    const isCompleted = gamification.completedStages.includes(stage.id);
    const isUnlocked = gamification.unlockedStages.includes(stage.id);

    const stageTitle = stage.title[currentLang] || stage.title["pt"];
    const stateClass = isCompleted
      ? "completed"
      : isUnlocked
        ? "active unlock-animation"
        : "locked";

    const bossClass = index === activeTrail.length - 1 ? "boss-node" : "";
    const iconHtml = isUnlocked
      ? `<i class="fa-solid ${stage.icon}"></i>`
      : '<i class="fa-solid fa-lock text-sm"></i>';
    const clickAction = isUnlocked
      ? `onclick="window.startMission('${stage.id}')"`
      : "";

    html += `
            <div class="trail-node-wrapper">
                <div class="trail-node ${stateClass} ${bossClass}" title="${stageTitle}" ${clickAction}>
                    ${iconHtml}
                </div>
                <div class="trail-node-title">${stageTitle}</div>
            </div>
        `;
  });

  container.innerHTML = html;
  renderJourneyRecommendation(currentCertId, currentLang);
}

export function unlockNextModule(currentLevelId) {
  const rawCertId = document.getElementById("certification-select")?.value ||
    AuthService.getCurrentUser()?.certification || "clf-c02";
  const currentCertId = normalizeCertificationId(rawCertId) || "clf-c02";
  let gamification = storageManager.getGamification(currentCertId);
  const activeTrail =
    TRAILS_BY_CERT[currentCertId] || TRAILS_BY_CERT["clf-c02"];

  if (!gamification.completedStages) gamification.completedStages = [];
  if (!gamification.unlockedStages)
    gamification.unlockedStages = [activeTrail[0].id];

  if (!gamification.completedStages.includes(currentLevelId)) {
    gamification.completedStages.push(currentLevelId);
  }

  const currentIndex = activeTrail.findIndex((s) => s.id === currentLevelId);
  if (currentIndex >= 0 && currentIndex < activeTrail.length - 1) {
    const nextLevelId = activeTrail[currentIndex + 1].id;
    if (!gamification.unlockedStages.includes(nextLevelId)) {
      gamification.unlockedStages.push(nextLevelId);
    }
  }

  storageManager.saveGamification(gamification, currentCertId);

  renderTrail();
}

window.unlockNextModule = unlockNextModule;
