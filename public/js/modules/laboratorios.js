/**
 * laboratorios.js - AWS Labs module
 * Handles fetching, filtering, and rendering of the AWS Labs catalog.
 */

import { logger } from "../utils/logger.js";
import { AuthService } from "../services/authService.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { normalizeLabIdentity, normalizeServiceId } from "../utils/serviceIdentity.js";
import { storageManager } from "../storageManager.js";

let allLabs = [];
let diagnosticContextActive = false;
let diagnosticRecommendedLabIds = null;

export function readLabsRecommendation(storage = globalThis.localStorage) {
  try {
    const key = storage === globalThis.localStorage
      ? storageManager.getUserScopedKey("last_diagnostic_recommendation")
      : "aws_sim_last_diagnostic_recommendation";
    const raw = storage?.getItem(key);
    const recommendation = raw ? JSON.parse(raw) : null;
    const context = recommendation?.recommendations?.labs?.context;
    if (
      recommendation?.source !== "diagnostic" ||
      !context?.certificationId ||
      !Array.isArray(context.services)
    ) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}

export function selectRecommendedLabs(labs, context) {
  if (!Array.isArray(labs) || !context?.certificationId) {
    return { labs: [], fallback: false };
  }

  const certificationId = normalizeCertificationId(context.certificationId);
  const services = new Set((context.services || []).map(normalizeServiceId).filter(Boolean));
  const strongServices = new Set(
    (context.strongServices || []).map(normalizeServiceId).filter(Boolean),
  );
  const sameCertification = labs.filter(
    (lab) => normalizeLabIdentity(lab).certificationId === certificationId && lab.active,
  );
  const matched = sameCertification
    .filter((lab) => services.has(normalizeLabIdentity(lab).serviceId))
    .sort((left, right) => {
      const leftStrong = strongServices.has(normalizeLabIdentity(left).serviceId) ? 0 : 1;
      const rightStrong = strongServices.has(normalizeLabIdentity(right).serviceId) ? 0 : 1;
      return leftStrong - rightStrong;
    });

  return matched.length > 0
    ? { labs: matched, fallback: false }
    : { labs: sameCertification, fallback: true };
}

export async function initLaboratorios() {
  await fetchLabs();
  setupFilters();
  populateServiceFilter();
  preselectCertification();
  applyDiagnosticRecommendation();
  renderLabs();
}

async function fetchLabs() {
  try {
    // Tenta buscar usando um caminho absoluto para evitar erros dependendo da rota atual
    const url = window.location.pathname.includes('/public/') 
      ? "/public/data/labs/labs.json"
      : "/data/labs/labs.json";
      
    const res = await fetch(url).catch(() => fetch("./data/labs/labs.json"));
    if (res && res.ok) {
      allLabs = await res.json();
    } else {
      logger.warn("Failed to fetch labs from /data/labs/labs.json");
      allLabs = [];
    }
  } catch (error) {
    logger.error("Error fetching labs:", error);
    allLabs = [];
  }
}

function setupFilters() {
  ["filter-certification", "filter-service", "filter-difficulty"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      diagnosticContextActive = false;
      diagnosticRecommendedLabIds = null;
      document.getElementById("labs-diagnostic-context")?.replaceChildren();
      renderLabs();
    });
  });
}

function applyDiagnosticRecommendation() {
  const context = readLabsRecommendation();
  const result = selectRecommendedLabs(allLabs, context);
  if (!context) return;

  diagnosticContextActive = true;
  const certSelect = document.getElementById("filter-certification");
  if (certSelect) {
    const option = Array.from(certSelect.options).find(
      (optionItem) => normalizeCertificationId(optionItem.value) === context.certificationId,
    );
    if (option) certSelect.value = option.value;
  }
  diagnosticRecommendedLabIds = result.fallback
    ? null
    : new Set(result.labs.map((lab) => lab.id));
  renderDiagnosticContext(context, result);
}

function renderDiagnosticContext(context, result) {
  const container = document.getElementById("labs-diagnostic-context");
  if (!container) return;
  const lang = window.currentLang || "pt";
  const title = window.t ? window.t("labs_diagnostic_title", lang) : "Recomendado com base no seu Raio-X";
  const serviceLabels = [...new Set(result.labs.map((lab) => lab.service))].join(", ");
  const message = result.fallback
    ? (window.t ? window.t("labs_diagnostic_fallback", lang) : "Exibindo Labs disponíveis desta certificação.")
    : (window.t ? window.t("labs_diagnostic_service", lang, { service: serviceLabels }) : `Foco em: ${serviceLabels}`);
  container.innerHTML = `<div class="a3-card p-4 mb-4"><strong>${title}</strong><p class="text-sm text-muted mt-1">${message}</p></div>`;
}

function populateServiceFilter() {
  const serviceSelect = document.getElementById("filter-service");
  if (!serviceSelect) return;

  // Extract unique services
  const services = [...new Set(allLabs.map(lab => lab.service))].sort();
  
  services.forEach(service => {
    if (!service) return;
    const option = document.createElement("option");
    option.value = service;
    option.textContent = service;
    serviceSelect.appendChild(option);
  });
}

function preselectCertification() {
  const currentCert = AuthService.getCurrentUser()?.certification;
  const certSelect = document.getElementById("filter-certification");
  if (currentCert && certSelect) {
    // If the select has an option for the current cert, select it
    const optionExists = Array.from(certSelect.options).some(opt => opt.value === currentCert);
    if (optionExists) {
      certSelect.value = currentCert;
    }
  }
}

function renderLabs() {
  const grid = document.getElementById("labs-grid");
  const countLabel = document.getElementById("labs-count-label");
  if (!grid) return;

  const certFilter = document.getElementById("filter-certification")?.value || "";
  const serviceFilter = document.getElementById("filter-service")?.value || "";
  const difficultyFilter = document.getElementById("filter-difficulty")?.value || "";

  // Apply filters
  const filtered = allLabs.filter(lab => {
    if (!lab.active) return false;
    if (diagnosticContextActive && diagnosticRecommendedLabIds && !diagnosticRecommendedLabIds.has(lab.id)) return false;
    if (certFilter && lab.certification !== certFilter) return false;
    if (serviceFilter && lab.service !== serviceFilter) return false;
    if (difficultyFilter && lab.difficulty !== difficultyFilter) return false;
    return true;
  });

  // Update count
  if (countLabel) {
    countLabel.textContent = `${filtered.length} laboratório(s) encontrado(s)`;
  }

  // Remove loading skeletons or cards from the previous render.
  grid.innerHTML = "";

  // Check empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-1 md:col-span-2 lg:col-span-3 py-16 text-center bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
        <div class="w-16 h-16 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <i class="fa-solid fa-flask"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2" data-i18n="labs_not_found">Nenhum laboratório encontrado</h3>
        <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto" data-i18n="labs_empty_desc">Tente ajustar os filtros ou selecionar outra certificação. Os laboratórios disponíveis aqui são referências externas oficiais da AWS.</p>
      </div>
    `;
    // Re-trigger translation for the empty state
    if (window.t) {
      document.querySelectorAll('#labs-grid [data-i18n]').forEach(el => {
         const key = el.getAttribute('data-i18n');
         const translated = window.t(key, window.currentLang || 'pt');
         if (translated && translated !== key) el.textContent = translated;
      });
    }
    return;
  }

  // Obter labs completados do storage (se existir)
  const completedLabs = getCompletedLabs();

  // Render cards
  filtered.forEach(lab => {
    const isCompleted = completedLabs.includes(lab.id);
    
    // Icon based on difficulty
    let difficultyIcon = "🟢";
    let difficultyText = window.t ? window.t(lab.difficulty, window.currentLang) : lab.difficulty;
    if (lab.difficulty === "intermediate") difficultyIcon = "🟡";
    if (lab.difficulty === "advanced") difficultyIcon = "🔴";

    // Build Card
    const card = document.createElement("div");
    card.className = "case-card bg-white dark:bg-slate-800 rounded-xl shadow p-6 flex flex-col h-full border border-gray-100 dark:border-slate-700 transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden";
    
    // Adiciona faixa se concluído
    if (isCompleted) {
      const banner = document.createElement("div");
      banner.className = "absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 font-bold rounded-bl-lg";
      banner.setAttribute("data-i18n", "marked_completed");
      banner.textContent = window.t ? window.t("marked_completed", window.currentLang) || "Marcado como concluído" : "Marcado como concluído";
      card.appendChild(banner);
    }

    card.innerHTML += `
      <div class="flex items-center gap-3 mb-4 mt-2">
        <div class="w-10 h-10 rounded bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
          <i class="fa-solid fa-flask"></i>
        </div>
        <div>
          <span class="text-xs font-semibold text-blue-600 uppercase tracking-wider">${lab.service}</span>
          <h3 class="font-bold text-gray-800 dark:text-white leading-tight mt-1">${lab.title}</h3>
        </div>
      </div>
      
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-grow">${lab.description}</p>
      
      <div class="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
        <div class="flex items-center gap-1.5" title="Nível">
          <span>${difficultyIcon}</span>
          <span class="capitalize">${difficultyText}</span>
        </div>
        <div class="w-1 h-1 bg-gray-300 rounded-full"></div>
        <div class="flex items-center gap-1.5" title="Duração estimada">
          <i class="fa-regular fa-clock"></i>
          <span>${lab.duration} min</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-auto">
        <div class="text-xs text-center text-gray-400 mb-1">Provider: ${lab.provider}</div>
        <a 
          href="${lab.externalUrl}"
          target="_blank" 
          rel="noopener noreferrer" 
          class="w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900"
        >
          <span data-i18n="open_lab">Abrir laboratório</span> <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-xs"></i>
        </a>
        <button 
          class="btn-mark-completed w-full text-center py-2 px-4 text-sm font-medium ${isCompleted ? 'text-green-600 hover:text-green-700 bg-green-50' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors"
          data-id="${lab.id}"
        >
          ${isCompleted ? '<i class="fa-solid fa-check"></i> ' + (window.t ? window.t("marked_completed", window.currentLang) : "Marcado como concluído") : (window.t ? window.t("mark_completed", window.currentLang) : "Marcar como concluído")}
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach event listeners for the "mark as completed" buttons
  document.querySelectorAll(".btn-mark-completed").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      toggleCompleted(id);
    });
  });

  // Re-trigger translation for dynamic content if t is available
  if (window.t) {
    document.querySelectorAll('#labs-grid [data-i18n]').forEach(el => {
       const key = el.getAttribute('data-i18n');
       const translated = window.t(key, window.currentLang || 'pt');
       if (translated && translated !== key) el.textContent = translated;
    });
  }
}

function toggleCompleted(labId) {
  const completedLabs = getCompletedLabs();
  const index = completedLabs.indexOf(labId);
  if (index === -1) {
    completedLabs.push(labId);
  } else {
    completedLabs.splice(index, 1);
  }

  saveCompletedLabs(completedLabs);
  renderLabs();
}

function getCompletedLabsStorageKey() {
  const certification = normalizeCertificationId(
    document.getElementById("filter-certification")?.value
      || AuthService.getCurrentUser()?.certification
      || "clf-c02",
  );
  return storageManager.getUserScopedKey(`completed_labs_${certification}`);
}

function getCompletedLabs() {
  try {
    const scopedKey = getCompletedLabsStorageKey();
    const scopedValue = localStorage.getItem(scopedKey);
    const legacyValue = localStorage.getItem(storageManager.getUserScopedKey("completed_labs"));
    const savedLabs = JSON.parse(scopedValue ?? legacyValue ?? "[]");
    return Array.isArray(savedLabs) ? savedLabs : [];
  } catch {
    return [];
  }
}

function saveCompletedLabs(completedLabs) {
  localStorage.setItem(getCompletedLabsStorageKey(), JSON.stringify(completedLabs));
  void storageManager.syncAccountModuleState?.("labs", AuthService.getCurrentUser()?.certification || null);
}
