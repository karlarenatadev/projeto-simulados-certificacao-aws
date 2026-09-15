import { storageManager } from "./storageManager.js";
import { projectMistakes } from "./mistakesProjection.js";
import { getCurrentLanguage } from "./core/languageManager.js";
import { t } from "./i18n/useTranslation.js";

const state = { certification: "all", domain: "all", status: "pending" };
const qs = (id) => document.getElementById(id);
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function render() {
  const lang = getCurrentLanguage();
  const records = storageManager.getAllMistakes();
  const projection = projectMistakes(records, { ...state, language: lang });
  qs("mistakes-summary").innerHTML = [
    [t("mistakes_pending", lang), projection.pending],
    [t("mistakes_resolved", lang), projection.resolved],
    [t("mistakes_recurrent", lang), projection.recurrent],
    [t("mistakes_critical_domain", lang), projection.domains[0]?.label || "—"],
  ]
    .map(
      ([label, value]) =>
        `<div class="a3-card p-4"><div class="text-xs text-muted">${escapeHtml(label)}</div><strong class="text-xl text-main">${escapeHtml(value)}</strong></div>`,
    )
    .join("");

  const domains = projectMistakes(records, {
    certification: state.certification,
    status: "all",
    language: lang,
  }).domains;
  const domainSelect = qs("mistakes-domain");
  domainSelect.innerHTML =
    `<option value="all">${escapeHtml(t("mistakes_all", lang))}</option>` +
    domains
      .map(
        (domain) =>
          `<option value="${escapeHtml(domain.id)}">${escapeHtml(domain.label)}</option>`,
      )
      .join("");
  domainSelect.value = state.domain;

  const hasRecords = projection.records.length > 0;
  qs("mistakes-empty").classList.toggle("hidden", hasRecords);
  qs("mistakes-empty").textContent =
    state.status === "pending" && projection.pending === 0
      ? t("mistakes_empty_pending", lang)
      : t("mistakes_empty_filter", lang);
  qs("mistakes-list").innerHTML = projection.records
    .map(
      (record) =>
        `<article class="a3-card p-4"><div class="flex justify-between gap-3"><div><p class="font-semibold text-main line-clamp-3">${escapeHtml(record.question)}</p><p class="text-xs text-muted mt-2">${escapeHtml(record.certification.toUpperCase())} · ${escapeHtml(record.domainId || t("mistakes_domain", lang))} · ${escapeHtml(t("mistakes_count", lang, { count: record.wrongCount }))}</p></div><span class="text-xs">${record.resolved ? t("mistakes_status_resolved", lang) : t("mistakes_status_pending", lang)}</span></div><details class="mt-3"><summary class="cursor-pointer">${t("mistakes_view_details", lang)}</summary><div class="mt-2 text-sm text-muted"><p><strong>${t("mistakes_your_answer", lang)}:</strong> ${escapeHtml(String(record.selectedAnswerText || record.selectedAnswer || "—"))}</p><p><strong>${t("mistakes_correct_answer", lang)}:</strong> ${escapeHtml(String(record.correctAnswerText || record.correctAnswer || "—"))}</p><p>${escapeHtml(record.explanation || "")}</p></div></details></article>`,
    )
    .join("");

  const params = new URLSearchParams();
  if (state.certification !== "all") params.set("cert", state.certification);
  if (state.domain !== "all") params.set("domain", state.domain);
  qs("mistakes-practice").href =
    `./simulados.html?mode=mistakes${params.toString() ? `&${params}` : ""}`;
}

function init() {
  ["mistakes-cert", "mistakes-status", "mistakes-domain"].forEach((id) =>
    qs(id).addEventListener("change", (event) => {
      state[id.replace("mistakes-", "")] = event.target.value;
      if (id === "mistakes-cert") state.domain = "all";
      render();
    }),
  );
  qs("mistakes-clear-filters").addEventListener("click", () => {
    Object.assign(state, {
      certification: "all",
      domain: "all",
      status: "pending",
    });
    qs("mistakes-cert").value = "all";
    qs("mistakes-status").value = "pending";
    render();
  });
  render();
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
