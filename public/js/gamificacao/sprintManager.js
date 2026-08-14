/**
 * sprintManager.js - Gerencia o Sprint de Estudos de 14 dias
 */
import { storageManager } from "../storageManager.js";
import { NotificationService } from "../services/notificationService.js";
import { normalizeCertificationId } from "../utils/certUtils.js";

export const SPRINT_MAPS = {
  "clf-c02": {
    1: { pt: "Conceitos Cloud - Parte 1", en: "Cloud Concepts - Part 1" },
    2: { pt: "Conceitos Cloud - Parte 2", en: "Cloud Concepts - Part 2" },
    3: { pt: "Conceitos Cloud - Revisão", en: "Cloud Concepts - Review" },
    4: { pt: "Segurança - Parte 1", en: "Security - Part 1" },
    5: { pt: "Segurança - Parte 2", en: "Security - Part 2" },
    6: { pt: "Segurança - Revisão", en: "Security - Review" },
    7: { pt: "Tecnologia - Serviços Core", en: "Technology - Core Services" },
    8: { pt: "Tecnologia - Redes e BD", en: "Technology - Networks & DB" },
    9: { pt: "Tecnologia - Arquitetura", en: "Technology - Architecture" },
    10: { pt: "Faturamento - Parte 1", en: "Billing - Part 1" },
    11: { pt: "Faturamento - Parte 2", en: "Billing - Part 2" },
    12: { pt: "Simulado Misto - Fácil", en: "Mixed Quiz - Easy" },
    13: { pt: "Simulado Misto - Difícil", en: "Mixed Quiz - Hard" },
    14: { pt: "O Desafio Final (Boss)", en: "The Final Challenge (Boss)" },
  },
  "saa-c03": {
    1: { pt: "Design Resiliente - I", en: "Resilient Design - I" },
    2: { pt: "Design Resiliente - II", en: "Resilient Design - II" },
    3: { pt: "Alta Performance - I", en: "High Performance - I" },
    4: { pt: "Alta Performance - II", en: "High Performance - II" },
    5: { pt: "Segurança de Aplicações", en: "Application Security" },
    6: { pt: "IAM e Controle de Acesso", en: "IAM & Access Control" },
    7: { pt: "Otimização de Custos - I", en: "Cost Optimization - I" },
    8: { pt: "Otimização de Custos - II", en: "Cost Optimization - II" },
    9: { pt: "Migração e Dados", en: "Migration & Data" },
    10: { pt: "Serviços Serverless", en: "Serverless Services" },
    11: { pt: "Revisão Geral - Arquitetura", en: "Architecture Review" },
    12: { pt: "Simulado Misto - Fácil", en: "Mixed Quiz - Easy" },
    13: { pt: "Simulado Misto - Difícil", en: "Mixed Quiz - Hard" },
    14: { pt: "O Desafio Final (Boss)", en: "The Final Challenge (Boss)" },
  },
  "aif-c01": {
    1: { pt: "Fundamentos de IA/ML", en: "AI/ML Fundamentals" },
    2: { pt: "IA Generativa Básica", en: "GenAI Basics" },
    3: { pt: "Modelos de Fundação", en: "Foundation Models" },
    4: { pt: "Ajuste de Modelos (Tuning)", en: "Model Tuning" },
    5: { pt: "Engenharia de Prompts", en: "Prompt Engineering" },
    6: { pt: "IA Responsável e Ética", en: "Responsible AI & Ethics" },
    7: { pt: "Segurança em IA", en: "AI Security" },
    8: { pt: "Governança e Conformidade", en: "Governance & Compliance" },
    9: { pt: "Amazon Bedrock - I", en: "Amazon Bedrock - I" },
    10: { pt: "Amazon SageMaker", en: "Amazon SageMaker" },
    11: { pt: "Revisão Geral - IA AWS", en: "AWS AI Review" },
    12: { pt: "Simulado Misto - Fácil", en: "Mixed Quiz - Easy" },
    13: { pt: "Simulado Misto - Difícil", en: "Mixed Quiz - Hard" },
    14: { pt: "O Desafio Final (Boss)", en: "The Final Challenge (Boss)" },
  },
  "dva-c02": {
    1: { pt: "Desenvolvimento com AWS", en: "Developing with AWS" },
    2: { pt: "Segurança e Autenticação", en: "Security & Auth" },
    3: { pt: "Armazenamento e BDs", en: "Storage & Databases" },
    4: { pt: "DynamoDB Avançado", en: "Advanced DynamoDB" },
    5: { pt: "Integração (SQS/SNS)", en: "Integration (SQS/SNS)" },
    6: { pt: "Serviços Serverless (Lambda)", en: "Serverless (Lambda)" },
    7: { pt: "API Gateway e Containers", en: "API Gateway & Containers" },
    8: { pt: "CI/CD no AWS (CodeSuite)", en: "AWS CI/CD (CodeSuite)" },
    9: { pt: "Monitoramento e Logs", en: "Monitoring & Logging" },
    10: { pt: "Otimização e Troubleshooting", en: "Troubleshooting" },
    11: { pt: "Revisão - Dev Associate", en: "Dev Associate Review" },
    12: { pt: "Simulado Misto - Fácil", en: "Mixed Quiz - Easy" },
    13: { pt: "Simulado Misto - Difícil", en: "Mixed Quiz - Hard" },
    14: { pt: "O Desafio Final (Boss)", en: "The Final Challenge (Boss)" },
  },
};

export function readSprintRecommendation(certId, storage = globalThis.localStorage) {
  try {
    const key = storage === globalThis.localStorage
      ? storageManager.getUserScopedKey("last_diagnostic_recommendation")
      : "aws_sim_last_diagnostic_recommendation";
    const raw = storage?.getItem(key);
    const recommendation = raw ? JSON.parse(raw) : null;
    if (
      recommendation?.source !== "diagnostic" ||
      normalizeCertificationId(recommendation.certificationId) !==
        normalizeCertificationId(certId)
    ) {
      return null;
    }
    return recommendation;
  } catch {
    return null;
  }
}

export function getSprintProgress(certId) {
  const state = storageManager.getSprintState(normalizeCertificationId(certId));
  const completedStages = [
    ...new Set(
      (state.completedStages || [])
        .map((day) => Number.parseInt(day, 10))
        .filter((day) => day >= 1 && day <= 14),
    ),
  ];
  return {
    completedStages,
    currentDay: Math.min(completedStages.length + 1, 14),
    percentage: Math.min(Math.round((completedStages.length / 14) * 100), 100),
    completed: completedStages.length >= 14,
  };
}

function getFallbackPill(day, lang, certId) {
  const labels = SPRINT_MAPS[certId]?.[day];
  if (!labels) return null;
  const title = labels[lang] || labels.pt;
  return {
    title,
    topic: title,
    readTime: "5 min",
    content:
      lang === "en"
        ? `<p>Review the study focus for day ${day}: <strong>${title}</strong>. Use the recommended practice actions after this reading to reinforce the topic.</p>`
        : `<p>Revise o foco de estudo do dia ${day}: <strong>${title}</strong>. Use as ações recomendadas após esta leitura para reforçar o tema.</p>`,
    keyTakeaway:
      lang === "en"
        ? `Keep ${title} as the focus of this Sprint day.`
        : `Mantenha ${title} como foco deste dia do Sprint.`,
  };
}

/**
 * Renderiza a UI do Sprint de 14 dias.
 * @param {string} lang - 'pt' ou 'en'
 * @param {string} certId - ID da certificação atual
 */
export function renderSprintUI(lang, certId) {
  const grid = document.getElementById("sprint-days-grid");
  if (!grid) return;

  const currentSprintMap = SPRINT_MAPS[certId] || SPRINT_MAPS["clf-c02"];

  const progress = getSprintProgress(certId);
  const currentSprintDay = progress.currentDay;
  const recommendation = readSprintRecommendation(certId);

  const labels = {
    pt: {
      day: "Dia",
      pillLabel: "Pílula de Conhecimento",
      title: "Sprint de Estudos (14 Dias)",
      subtitle: "Sua dose diária de AWS em 5 minutos.",
      progress: "Progresso",
      startBtn: "Ler Pílula do Dia",
    },
    en: {
      day: "Day",
      pillLabel: "Knowledge Pill",
      title: "Study Sprint (14 Days)",
      subtitle: "Your daily AWS dose in 5 minutes.",
      progress: "Progress",
      startBtn: "Read Daily Pill",
    },
  };

  const progressText = document.getElementById("sprint-progress-text");
  if (progressText) {
    progressText.textContent = `${progress.percentage}%`;
  }

  const sprintTitleEl = document.getElementById("sprint-module-title");
  const sprintSubtitleEl = document.getElementById("sprint-module-subtitle");
  const sprintProgressLabel = document.getElementById("sprint-progress-label");
  const sprintStartBtn = document.getElementById("sprint-start-btn");

  if (sprintTitleEl) sprintTitleEl.textContent = labels[lang].title;
  if (sprintSubtitleEl) {
    const hasFocus = recommendation?.weakDomains?.length || recommendation?.weakServices?.length;
    sprintSubtitleEl.textContent = hasFocus
      ? `${labels[lang].subtitle} ${lang === "en" ? "Personalized from your latest X-Ray." : "Personalizado pelo seu último Raio-X."}`
      : labels[lang].subtitle;
  }
  if (sprintProgressLabel)
    sprintProgressLabel.textContent = labels[lang].progress;
  if (sprintStartBtn) sprintStartBtn.textContent = labels[lang].startBtn;
  if (sprintStartBtn && progress.completed) {
    sprintStartBtn.textContent = lang === "en" ? "Sprint completed" : "Sprint concluído";
    sprintStartBtn.disabled = true;
  }

  const dayLabel = document.getElementById("sprint-current-day-label");
  const metaLabel = dayLabel?.nextElementSibling;

  if (dayLabel && currentSprintMap[currentSprintDay]) {
    const dayTitle =
      currentSprintMap[currentSprintDay][lang] ||
      currentSprintMap[currentSprintDay].pt;
    dayLabel.textContent = `${labels[lang].day} ${currentSprintDay}: ${dayTitle}`;
    if (metaLabel)
      metaLabel.innerHTML = `<i class="fa-solid fa-book-open-reader mr-1 text-aws-orange"></i> ${labels[lang].pillLabel}`;
  }

  grid.innerHTML = "";
  for (let i = 1; i <= 14; i++) {
    const dayDiv = document.createElement("div");
    if (i < currentSprintDay) {
      dayDiv.className =
        "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold border bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400";
      dayDiv.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (i === currentSprintDay) {
      dayDiv.className =
        "sprint-day-current w-full aspect-square rounded-lg flex items-center justify-center text-sm border-2 bg-aws-orange border-orange-600 text-white z-10";
      dayDiv.textContent = i;
    } else {
      dayDiv.className =
        "w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold border bg-gray-50 border-gray-100 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500";
      dayDiv.innerHTML = '<i class="fa-solid fa-lock text-[10px]"></i>';
    }
    dayDiv.title = currentSprintMap[i]
      ? currentSprintMap[i][lang] || currentSprintMap[i].pt
      : `${labels[lang].day} ${i}`;
    grid.appendChild(dayDiv);
  }

  const actionContainer = document.getElementById("sprint-recommendation-actions");
  if (actionContainer) {
    actionContainer.innerHTML = "";
    const actions = recommendation?.recommendations;
    if (recommendation?.source === "diagnostic" && actions) {
      const links = [
        ["flashcards", "./flashcards.html", "fa-layer-group", lang === "en" ? "Review Flashcards" : "Revisar Flashcards"],
        ["questions", "./simulados.html", "fa-play", lang === "en" ? "Practice Questions" : "Praticar Questões"],
        ["labs", "./laboratorios.html", "fa-flask", lang === "en" ? "View recommended Labs" : "Ver Laboratórios recomendados"],
        ["cases", "./cases.html", "fa-diagram-project", lang === "en" ? "View recommended Cases" : "Ver Cases recomendados"],
      ].filter(([key]) => actions[key]?.enabled);
      actionContainer.innerHTML = links
        .map(([key, route, icon, label]) => `<a class="a3-btn a3-btn-secondary" data-sprint-recommendation="${key}" href="${route}"><i class="fa-solid ${icon}"></i> ${label}</a>`)
        .join("");
      actionContainer.querySelectorAll("[data-sprint-recommendation]").forEach((link) => {
        link.addEventListener("click", () => {
          const key = link.dataset.sprintRecommendation;
          const context = actions[key]?.context;
          if (context && (key === "flashcards" || key === "questions")) {
            sessionStorage.setItem(
              storageManager.getUserScopedKey("diagnostic_context"),
              JSON.stringify(context),
            );
          }
        });
      });
    }
  }
}

/**
 * Inicia a leitura da pílula do dia.
 * @param {string} lang - 'pt' ou 'en'
 * @param {string} certId - ID da certificação
 * @param {Function} getPillFn - Função que retorna os dados da pílula
 */
export function startMicroSprint(lang, certId, getPillFn) {
  const sprintState = storageManager.getSprintState(certId);
  const progress = getSprintProgress(certId);
  let currentSprintDay = progress.currentDay;

  if (progress.completed) {
    NotificationService.success(
      lang === "en"
        ? "Congratulations! You have completed all 14 Sprint days."
        : "Parabéns! Você já dominou os 14 dias de Sprint.",
    );
    return;
  }

  const lastCompletedDate = sprintState.lastCompletedDate;
  if (lastCompletedDate === new Date().toDateString()) {
    NotificationService.info(
      lang === "en"
        ? "You have already completed today's pill. Rest and come back tomorrow!"
        : "Você já concluiu a pílula de hoje! Descanse a mente e volte amanhã para a próxima dose.",
    );
    return;
  }

  if (currentSprintDay > 14) {
    NotificationService.success(
      lang === "en"
        ? "Congratulations! You have completed all 14 Sprint days."
        : "Parabéns! Você já dominou os 14 dias de Sprint.",
    );
    return;
  }

  const pillData =
    getPillFn(currentSprintDay, lang, certId) ||
    getFallbackPill(currentSprintDay, lang, normalizeCertificationId(certId));
  if (!pillData) {
    NotificationService.info(
      lang === "en"
        ? "Today's knowledge pill is being prepared by AI. Come back tomorrow!"
        : "A pílula de conhecimento de hoje está sendo preparada pela IA. Volte amanhã!",
    );
    return;
  }

  const ui =
    lang === "en"
      ? {
          readTime: "Read time",
          summary: "Daily Summary",
          complete: "Mark Pill as Completed",
          day: "Day",
        }
      : {
          readTime: "Tempo de leitura",
          summary: "Resumo do Dia",
          complete: "Marcar Pílula como Concluída",
          day: "Dia",
        };

  const readerOverlay = document.createElement("div");
  readerOverlay.id = "sprint-reader-overlay";
  readerOverlay.className =
    "fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex justify-center items-center overflow-y-auto p-4 md:p-8 animate-fade-in";
  readerOverlay.innerHTML = `
        <div class="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative my-auto">
            <div class="h-2 w-full bg-gray-100 dark:bg-slate-700">
                <div class="h-full bg-aws-orange transition-all duration-1000" style="width: ${(currentSprintDay / 14) * 100}%"></div>
            </div>
            <div class="p-8 md:p-12">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <span class="text-aws-orange text-sm font-bold uppercase tracking-widest">${ui.day} ${currentSprintDay} • ${pillData.topic}</span>
                        <h2 class="text-3xl font-black text-gray-900 dark:text-white mt-2 leading-tight">${pillData.title}</h2>
                        <span class="text-gray-500 dark:text-slate-400 text-sm mt-2 block"><i class="fa-regular fa-clock mr-1"></i> ${ui.readTime}: ${pillData.readTime}</span>
                    </div>
                    <button onclick="closeSprintReader()" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
                <div class="prose dark:prose-invert max-w-none">${pillData.content}</div>
                <div class="mt-12 bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-100 dark:border-slate-600 text-center">
                    <p class="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-bold">${ui.summary}</p>
                    <p class="text-lg font-medium text-gray-800 dark:text-gray-200 italic">"${pillData.keyTakeaway}"</p>
                    <button onclick="completeSprintDay(${currentSprintDay})" class="mt-6 w-full md:w-auto bg-aws-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg transform hover:-translate-y-1">
                        <i class="fa-solid fa-check-double mr-2"></i> ${ui.complete}
                    </button>
                </div>
            </div>
        </div>`;

  document.body.appendChild(readerOverlay);
  document.body.style.overflow = "hidden";
}

export function closeSprintReader() {
  const overlay = document.getElementById("sprint-reader-overlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
}

export function completeSprintDay(completedDay, certId, lang, onComplete) {
  const sprintState = storageManager.getSprintState(certId);
  const day = Number.parseInt(completedDay, 10);
  if (!Number.isInteger(day) || day < 1 || day > 14) return;
  const completedStages = new Set(
    (sprintState.completedStages || [])
      .map((stage) => Number.parseInt(stage, 10))
      .filter((stage) => stage >= 1 && stage <= 14),
  );
  if (!completedStages.has(day)) {
    completedStages.add(day);
  }
  sprintState.completedStages = [...completedStages].sort((left, right) => left - right).map(String).slice(0, 14);
  sprintState.lastCompletedDate = new Date().toDateString();
  sprintState.streakDays += 1;
  storageManager.saveSprintState(certId, sprintState);

  closeSprintReader();
  if (onComplete) onComplete();
  NotificationService.success(
    lang === "en"
      ? `🚀 Day ${completedDay} pill absorbed! The next knowledge awaits you tomorrow.`
      : `🚀 Pílula do Dia ${completedDay} absorvida com sucesso! O próximo conhecimento te espera amanhã.`,
  );
}
