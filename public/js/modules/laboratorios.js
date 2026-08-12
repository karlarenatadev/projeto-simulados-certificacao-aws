/**
 * laboratorios.js - AWS Labs module
 * Handles fetching, filtering, and rendering of the AWS Labs catalog.
 */

import { storageManager } from "../storageManager.js";
import apiService from "../services/api.js";

let allLabs = [];

export async function initLaboratorios() {
  await fetchLabs();
  setupFilters();
  populateServiceFilter();
  preselectCertification();
  renderLabs();
}

async function fetchLabs() {
  try {
    // Tenta buscar localmente no public/data
    const res = await fetch("./data/labs/labs.json");
    if (res.ok) {
      allLabs = await res.json();
    } else {
      console.warn("Failed to fetch labs from ./data/labs/labs.json");
      allLabs = [];
    }
  } catch (error) {
    console.error("Error fetching labs:", error);
    allLabs = [];
  }
}

function setupFilters() {
  document.getElementById("filter-certification")?.addEventListener("change", renderLabs);
  document.getElementById("filter-service")?.addEventListener("change", renderLabs);
  document.getElementById("filter-difficulty")?.addEventListener("change", renderLabs);
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
  const currentCert = storageManager.getCurrentCert();
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
    if (certFilter && lab.certification !== certFilter) return false;
    if (serviceFilter && lab.service !== serviceFilter) return false;
    if (difficultyFilter && lab.difficulty !== difficultyFilter) return false;
    return true;
  });

  // Update count
  if (countLabel) {
    countLabel.textContent = `\${filtered.length} laboratório(s) encontrado(s)`;
  }

  // Clear grid
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <div class="text-4xl mb-4 text-gray-300"><i class="fa-solid fa-flask"></i></div>
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300" data-i18n="no_labs_title">Nenhum laboratório encontrado.</h3>
        <p class="text-gray-500 mt-2" data-i18n="no_labs_desc">Altere os filtros para encontrar outras opções.</p>
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
  const profile = storageManager.getProfile();
  const completedLabs = profile.completedLabs || [];

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
          <span class="text-xs font-semibold text-blue-600 uppercase tracking-wider">\${lab.service}</span>
          <h3 class="font-bold text-gray-800 dark:text-white leading-tight mt-1">\${lab.title}</h3>
        </div>
      </div>
      
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 flex-grow">\${lab.description}</p>
      
      <div class="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg">
        <div class="flex items-center gap-1.5" title="Nível">
          <span>\${difficultyIcon}</span>
          <span class="capitalize">\${difficultyText}</span>
        </div>
        <div class="w-1 h-1 bg-gray-300 rounded-full"></div>
        <div class="flex items-center gap-1.5" title="Duração estimada">
          <i class="fa-regular fa-clock"></i>
          <span>\${lab.duration} min</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-auto">
        <div class="text-xs text-center text-gray-400 mb-1">Provider: \${lab.provider}</div>
        <a 
          href="\${lab.externalUrl}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="w-full text-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900"
        >
          <span data-i18n="open_lab">Abrir laboratório</span> <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-xs"></i>
        </a>
        <button 
          class="btn-mark-completed w-full text-center py-2 px-4 text-sm font-medium \${isCompleted ? 'text-green-600 hover:text-green-700 bg-green-50' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors"
          data-id="\${lab.id}"
        >
          \${isCompleted ? '<i class="fa-solid fa-check"></i> ' + (window.t ? window.t("marked_completed", window.currentLang) : "Marcado como concluído") : (window.t ? window.t("mark_completed", window.currentLang) : "Marcar como concluído")}
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
  const profile = storageManager.getProfile();
  if (!profile.completedLabs) {
    profile.completedLabs = [];
  }
  
  const index = profile.completedLabs.indexOf(labId);
  if (index === -1) {
    profile.completedLabs.push(labId);
  } else {
    profile.completedLabs.splice(index, 1);
  }
  
  storageManager.saveProfile(profile);
  renderLabs();
}
