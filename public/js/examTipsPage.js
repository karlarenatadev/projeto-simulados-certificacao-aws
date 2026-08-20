import { certificationPaths } from "./data.js";
import { getDomainDefinition } from "./domainTaxonomy.js";
import { getCurrentLanguage } from "./core/languageManager.js";
import {
  filterExamTips,
  getExamTipsViewState,
} from "./recommendations/examTips.js";

const state = {
  tips: [],
  filters: { certificationId: "", domain: "", type: "", query: "" },
};
const $ = (id) => document.getElementById(id);
const text = (value, language = getCurrentLanguage()) =>
  value && typeof value === "object"
    ? value[language] || value.pt || value.en
    : value || "";
const params = new URLSearchParams(window.location.search);

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}

function renderOptions() {
  $("exam-tips-certification").innerHTML =
    `<option value="">${text({ pt: "Todas", en: "All" })}</option>${Object.values(
      certificationPaths,
    )
      .map((cert) => `<option value="${cert.code}">${cert.code}</option>`)
      .join("")}`;
  $("exam-tips-certification").value = state.filters.certificationId;
  renderDomains();
}

function renderDomains() {
  const cert = state.filters.certificationId;
  const domainSelect = $("exam-tips-domain");
  domainSelect.disabled = !cert;
  const domains = cert
    ? certificationPaths[cert.toLowerCase()]?.domains || []
    : [];
  domainSelect.innerHTML =
    (!cert
      ? `<option value="">${text({ pt: "Escolha uma certificação", en: "Choose a certification" })}</option>`
      : "") +
    `<option value="">${text({ pt: "Todos", en: "All" })}</option>${domains.map((domain) => `<option value="${domain.id}">${escapeHtml(getDomainDefinition(cert, domain.id)?.[getCurrentLanguage() === "en" ? "labelEn" : "labelPt"] || domain.name)}</option>`).join("")}`;
  domainSelect.value = cert ? state.filters.domain : "";
}

function renderTypeFilters() {
  const labels = {
    "": { pt: "Todas", en: "All" },
    keyword: { pt: "Palavras-chave", en: "Keywords" },
    comparison: { pt: "Não confunda", en: "Compare" },
    trap: { pt: "Pegadinhas", en: "Traps" },
    "mental-shortcut": { pt: "Atalhos mentais", en: "Mental shortcuts" },
  };
  $("exam-tips-types").innerHTML = Object.entries(labels)
    .map(
      ([value, label]) =>
        `<button type="button" class="exam-tips-type-button ${state.filters.type === value ? "is-active" : ""}" data-type="${value}" aria-pressed="${state.filters.type === value}">${escapeHtml(text(label))}</button>`,
    )
    .join("");
  $("exam-tips-types")
    .querySelectorAll("button")
    .forEach((button) =>
      button.addEventListener("click", () => {
        state.filters.type = button.dataset.type;
        renderTypeFilters();
        render();
      }),
    );
}

function renderCard(tip) {
  const language = getCurrentLanguage();
  const domain = getDomainDefinition(tip.certificationId, tip.domain);
  const typeLabel = {
    keyword: text({ pt: "Palavra-chave", en: "Keyword" }),
    comparison: text({ pt: "Não confunda", en: "Compare" }),
    trap: text({ pt: "Pegadinha", en: "Trap" }),
    "mental-shortcut": text({ pt: "Atalho mental", en: "Mental shortcut" }),
  }[tip.type];
  const comparison = tip.comparison?.[language];
  return `<article class="exam-tip-card exam-tip-card--${tip.type}"><div class="exam-tip-card-header"><span class="exam-tip-type">${escapeHtml(typeLabel)}</span><span class="exam-tip-domain">${escapeHtml(domain?.[language === "en" ? "labelEn" : "labelPt"] || tip.domain)}</span></div><h2>${escapeHtml(text(tip.title))}</h2>${tip.thinkFirst ? `<div class="exam-tip-think"><span>${escapeHtml(text({ pt: "Pense primeiro em", en: "Think first of" }))}</span><strong>${escapeHtml(text(tip.thinkFirst))}</strong></div>` : ""}${comparison ? `<div class="exam-tip-comparison">${comparison.map((item) => `<div><h3>${escapeHtml(item.name)}</h3><ul>${item.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div>`).join("")}</div>` : ""}<p class="exam-tip-description">${escapeHtml(text(tip.description))}</p>${tip.dontConfuseWith?.length ? `<p class="exam-tip-dont"><strong>${escapeHtml(text({ pt: "Não confundir com:", en: "Do not confuse with:" }))}</strong> ${escapeHtml(tip.dontConfuseWith.join(", "))}</p>` : ""}<div class="exam-tip-tags">${tip.keywords
    .slice(0, 5)
    .map((tag) => `<span>#${escapeHtml(tag)}</span>`)
    .join("")}</div></article>`;
}

function render() {
  const results = filterExamTips(state.tips, state.filters);
  const view = getExamTipsViewState(results);
  $("exam-tips-count").textContent =
    `${view.count} ${text({ pt: "dicas", en: "tips" })}`;
  $("exam-tips-grid").innerHTML = results.map(renderCard).join("");
  $("exam-tips-grid").classList.toggle("hidden", !view.showGrid);
  const feedback = $("exam-tips-feedback");
  feedback.classList.toggle("hidden", !view.showEmpty);
  feedback.innerHTML = `<strong>${escapeHtml(text({ pt: "Nenhuma dica encontrada para esses filtros.", en: "No tips found for these filters." }))}</strong><button type="button" id="exam-tips-feedback-clear" class="a3-btn a3-btn-secondary">${escapeHtml(text({ pt: "Limpar filtros", en: "Clear filters" }))}</button>`;
  $("exam-tips-feedback-clear")?.addEventListener("click", clearFilters);
}

function clearFilters() {
  state.filters = { certificationId: "", domain: "", type: "", query: "" };
  $("exam-tips-search").value = "";
  renderOptions();
  renderTypeFilters();
  render();
}

async function init() {
  state.filters.certificationId = (
    params.get("cert") ||
    localStorage.getItem("activeCertification") ||
    ""
  ).toUpperCase();
  if (
    !Object.prototype.hasOwnProperty.call(
      certificationPaths,
      state.filters.certificationId.toLowerCase(),
    )
  ) {
    state.filters.certificationId = "";
  }
  state.filters.domain = params.get("domain") || "";
  state.filters.query = params.get("q") || "";
  $("exam-tips-search").value = state.filters.query;
  try {
    const response = await fetch("./data/exam-tips.json");
    if (!response.ok) throw new Error("dataset");
    state.tips = await response.json();
    renderOptions();
    renderTypeFilters();
    render();
  } catch {
    $("exam-tips-grid").classList.add("hidden");
    $("exam-tips-feedback").classList.remove("hidden");
    $("exam-tips-feedback").textContent = text({
      pt: "Não foi possível carregar as dicas agora.",
      en: "The tips could not be loaded right now.",
    });
  }
  $("exam-tips-search").addEventListener("input", (event) => {
    state.filters.query = event.target.value;
    render();
  });
  $("exam-tips-certification").addEventListener("change", (event) => {
    state.filters.certificationId = event.target.value;
    state.filters.domain = "";
    renderOptions();
    render();
  });
  $("exam-tips-domain").addEventListener("change", (event) => {
    state.filters.domain = event.target.value;
    render();
  });
  $("exam-tips-clear").addEventListener("click", clearFilters);
}

document.addEventListener("DOMContentLoaded", init);
