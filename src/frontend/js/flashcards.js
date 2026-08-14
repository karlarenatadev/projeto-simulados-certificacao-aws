import { logger } from "./utils/logger.js";
import { glossaryTerms, certificationPaths } from "./data.js";
import { getDomainDefinition, normalizeDomain } from "./domainTaxonomy.js";
import { normalizeCertificationId } from "./utils/certUtils.js";
import { t } from "./i18n/useTranslation.js";
import { storageManager } from "./storageManager.js";
import { getCurrentLanguage as getOfficialLanguage } from "./core/languageManager.js";


function getCurrentLanguage() {
  return getOfficialLanguage();
}

// ESTADO CENTRALIZADO DOS FLASHCARDS
let flashcardState = {
  index: 0,
  flipped: false,
  filteredTerms: [],
  currentDomainFilter: "all",
  diagnosticContext: null,
  diagnosticDomainIds: null,
  diagnosticFallback: false,
};

export function parseDiagnosticContext(value) {
  try {
    const context = typeof value === "string" ? JSON.parse(value) : value;
    const certificationId = normalizeCertificationId(
      context?.certificationId,
    );

    if (context?.source !== "diagnostic" || !certificationPaths[certificationId]) {
      return null;
    }

    const weakDomains = Array.isArray(context.weakDomains)
      ? context.weakDomains
          .map((domain) =>
            typeof domain === "string"
              ? domain
              : domain?.domainId || domain?.id,
          )
          .map((domain) => normalizeDomain(certificationId, domain))
          .filter(Boolean)
      : [];

    const uniqueWeakDomains = [...new Set(weakDomains)];
    if (uniqueWeakDomains.length === 0) return null;

    return {
      source: "diagnostic",
      certificationId,
      weakDomains: uniqueWeakDomains,
    };
  } catch {
    return null;
  }
}

export function filterTermsByCertification(terms, certificationId) {
  const certId = normalizeCertificationId(certificationId);
  return terms.filter(
    (card) => card.cert === "all" || normalizeCertificationId(card.cert) === certId,
  );
}

export function filterTermsByDiagnosticContext(terms, context) {
  if (!context || context.source !== "diagnostic") return [];

  return filterTermsByCertification(terms, context.certificationId).filter(
    (card) =>
      card.cert === "all" ||
      context.weakDomains.includes(
        normalizeDomain(context.certificationId, card.domain),
      ),
  );
}

export function getDiagnosticContextLabels(context, language = "pt") {
  if (!context) return [];

  return context.weakDomains
    .map((domainId) => getDomainDefinition(context.certificationId, domainId))
    .filter(Boolean)
    .map((domain) => (language === "en" ? domain.labelEn : domain.labelPt));
}

export function getDiagnosticContextViewModel(
  context,
  count = 0,
  fallback = false,
  language = "pt",
) {
  if (!context) return null;

  return {
    title: t("diagnostic_flashcards_title", language),
    description: t("diagnostic_flashcards_desc", language),
    labels: getDiagnosticContextLabels(context, language),
    count: t("diagnostic_flashcards_selected", language, { count }),
    fallback: fallback
      ? t("diagnostic_flashcards_fallback", language)
      : "",
  };
}

function renderDiagnosticContext(context, count = 0, fallback = false) {
  const banner = document.getElementById("flashcards-diagnostic-banner");
  if (!banner) return;

  const title = banner.querySelector("h3");
  const description = banner.querySelector("div > p");
  const domains = document.getElementById("flashcards-diagnostic-domains");
  const countElement = document.getElementById("flashcards-diagnostic-count");
  const fallbackElement = document.getElementById("flashcards-diagnostic-fallback");
  const language = getCurrentLanguage();

  if (!context) {
    banner.classList.add("hidden");
    return;
  }

  const viewModel = getDiagnosticContextViewModel(
    context,
    count,
    fallback,
    language,
  );
  banner.classList.remove("hidden");
  if (title) {
    title.innerHTML = `<i class="fa-solid fa-bullseye"></i> ${viewModel.title}`;
  }
  if (description) {
    description.textContent = viewModel.description;
  }
  if (domains) {
    domains.innerHTML = viewModel.labels
      .map((label) => `<div>• ${label}</div>`)
      .join("");
  }
  if (countElement) {
    countElement.textContent = viewModel.count;
  }
  if (fallbackElement) {
    fallbackElement.textContent = viewModel.fallback;
    fallbackElement.classList.toggle("hidden", !fallback);
  }
}

function clearDiagnosticRecommendation() {
  if (!flashcardState.diagnosticContext) return;

  sessionStorage.removeItem("aws_sim_diagnostic_context");
  flashcardState.diagnosticContext = null;
  flashcardState.diagnosticDomainIds = null;
  flashcardState.diagnosticFallback = false;
  renderDiagnosticContext(null);
}

function handleManualFlashcardFilter() {
  clearDiagnosticRecommendation();
  filterFlashcards();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
export function startFlashcards(showScreenFn) {
  if (!glossaryTerms || glossaryTerms.length === 0) {
    alert(
      t("no_terms_available", getCurrentLanguage()) ||
        "Nenhum termo disponível.",
    );
    return;
  }

  if (typeof showScreenFn === "function") {
    showScreenFn("flashcards");
  }

  const categorySelect = document.getElementById("flashcard-category");
  const certSelect = document.getElementById("certification-select");
  const diagnosticCtx = parseDiagnosticContext(
    sessionStorage.getItem("aws_sim_diagnostic_context"),
  );

  if (diagnosticCtx && certSelect) {
    certSelect.value = diagnosticCtx.certificationId;
  }

  const selectedCert = certSelect ? certSelect.value : "clf-c02";

  // --- Popula as opções do Dropdown dinamicamente ---
  if (categorySelect) {
    const certInfo = certificationPaths[selectedCert];
    
    // Salva opção anterior (para não perder o deck de revisão se selecionado)
    const currentVal = categorySelect.value;
    
    // Limpa mantendo o padrão "all" e o "review-deck"
    categorySelect.innerHTML = `
      <option value="all">Todos os Domínios (Misturado)</option>
      <option value="review-deck" class="fc-opt-review">💡 Meu Deck de Revisão</option>
    `;
    
    if (certInfo && certInfo.domains) {
      certInfo.domains.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.name;
        categorySelect.appendChild(opt);
      });
    }
    
    // Restaura a seleção se ainda existir, ou cai pra all
    const exists = Array.from(categorySelect.options).some(o => o.value === currentVal);
    categorySelect.value = exists ? currentVal : "all";

    if (!categorySelect.dataset.listenerAdded) {
      categorySelect.addEventListener("change", handleManualFlashcardFilter);
      categorySelect.dataset.listenerAdded = "true";
    }
  }

  // --- Lógica do Diagnóstico ---
  const banner = document.getElementById("flashcards-diagnostic-banner");
  
  if (diagnosticCtx) {
    try {
      flashcardState.diagnosticContext = diagnosticCtx;
      flashcardState.diagnosticDomainIds = diagnosticCtx.weakDomains;
      flashcardState.diagnosticFallback = false;
      
      if (banner) banner.classList.remove("hidden");
      if (categorySelect) {
        categorySelect.disabled = false;
        categorySelect.value = "all"; // Force visual selection
      }
      
      const backBtn = document.getElementById("btn-flashcards-back-diagnostic");
      if(backBtn) {
        backBtn.onclick = () => {
          sessionStorage.removeItem("aws_sim_diagnostic_context");
          window.location.href = "./index.html"; 
        };
      }
    } catch(e) {
      logger.error(e);
      sessionStorage.removeItem("aws_sim_diagnostic_context");
      flashcardState.diagnosticContext = null;
      flashcardState.diagnosticDomainIds = null;
      if (banner) banner.classList.add("hidden");
      if (categorySelect) categorySelect.disabled = false;
    }
  } else {
    flashcardState.diagnosticContext = null;
    flashcardState.diagnosticDomainIds = null;
    flashcardState.diagnosticFallback = false;
    if (banner) banner.classList.add("hidden");
    if (categorySelect) categorySelect.disabled = false;
  }

  setupFlashcardListeners();
  if (certSelect && !certSelect.dataset.diagnosticListenerAdded) {
    certSelect.addEventListener("change", handleManualFlashcardFilter);
    certSelect.dataset.diagnosticListenerAdded = "true";
  }
  renderDiagnosticContext(flashcardState.diagnosticContext);
  filterFlashcards();
}

// ==========================================
// MOTOR DE FILTRAGEM (Certificação + Domínio)
// ==========================================
export function filterFlashcards() {
  const certSelect = document.getElementById("certification-select");
  const categorySelect = document.getElementById("flashcard-category");

  const selectedCert = certSelect ? certSelect.value : "clf-c02";
  const selectedDomain = categorySelect ? categorySelect.value : "all";

  // --- Atualiza a Badge visual no topo da tela ---
  const certBadge = document.getElementById("flashcards-cert-badge");
  if (certBadge) {
    certBadge.textContent = selectedCert.toUpperCase();
  }

  flashcardState.currentDomainFilter = selectedDomain;

  if (
    flashcardState.diagnosticContext &&
    flashcardState.diagnosticDomainIds?.length > 0
  ) {
    flashcardState.filteredTerms = filterTermsByDiagnosticContext(
      glossaryTerms,
      flashcardState.diagnosticContext,
    );
    if (flashcardState.filteredTerms.length === 0) {
      flashcardState.diagnosticFallback = true;
      flashcardState.filteredTerms = filterTermsByCertification(
        glossaryTerms,
        flashcardState.diagnosticContext.certificationId,
      );
    }
  } else if (selectedDomain === "review-deck") {
    const savedDeck = storageManager.getReviewDeck(selectedCert);
    flashcardState.filteredTerms = savedDeck.map((q) => {
      const isMulti = Array.isArray(q.correct);
      const correctText = isMulti
        ? q.correct.map((i) => q.options[i]).join("<br>• ")
        : q.options[q.correct];

      return {
        cert: selectedCert,
        domain: "review-deck",
        term: {
          pt: `<span class="text-base font-normal leading-relaxed block">${q.question}</span>`,
          en: `<span class="text-base font-normal leading-relaxed block">${q.question}</span>`
        },
        definition: {
          pt: `<strong>Resposta:</strong><br>• ${correctText}<br><br><strong>Explicação:</strong><br>${q.explanation}`,
          en: `<strong>Answer:</strong><br>• ${correctText}<br><br><strong>Explanation:</strong><br>${q.explanation}`
        }
      };
    });
  } else {
    flashcardState.filteredTerms = filterTermsByCertification(
      glossaryTerms,
      selectedCert,
    ).filter(
      (card) =>
        selectedDomain === "all" ||
        normalizeDomain(selectedCert, card.domain) === selectedDomain,
    );
  }

  flashcardState.filteredTerms.sort(() => Math.random() - 0.5);

  flashcardState.index = 0;
  flashcardState.flipped = false;

  if (flashcardState.filteredTerms.length === 0) {
    const errorMsg =
      getCurrentLanguage() === "en"
        ? "No cards found for this category."
        : "Nenhum cartão encontrado para esta categoria.";
    alert(errorMsg);

    flashcardState.filteredTerms = filterTermsByCertification(
      glossaryTerms,
      selectedCert,
    );
    flashcardState.currentDomainFilter = "all";
    if (categorySelect) categorySelect.value = "all";
    if (flashcardState.filteredTerms.length === 0) return;
  }

  if (flashcardState.diagnosticContext) {
    renderDiagnosticContext(
      flashcardState.diagnosticContext,
      flashcardState.filteredTerms.length,
      flashcardState.diagnosticFallback,
    );
  }

  renderCurrentFlashcard();
}

// ==========================================
// RENDERIZAÇÃO DO CARD NA TELA
// ==========================================
export function renderCurrentFlashcard() {
  const terms = flashcardState.filteredTerms;
  if (terms.length === 0) return;

  const card = terms[flashcardState.index];
  const currentLang = getCurrentLanguage();

  const termEl = document.getElementById("flashcard-term");
  const defEl = document.getElementById("flashcard-definition");
  const badgeEl = document.getElementById("flashcard-domain-badge");

  if (termEl) termEl.innerHTML = card.term[currentLang];
  if (defEl) defEl.innerHTML = card.definition[currentLang];

  if (badgeEl) {
    const certId =
      card.cert === "all"
        ? document.getElementById("certification-select")?.value || "clf-c02"
        : card.cert;
    const certInfo = certificationPaths[certId];
    const domainObj = certInfo?.domains.find((d) => d.id === card.domain);

    badgeEl.textContent = domainObj
      ? domainObj.name
      : currentLang === "en"
        ? "General Term"
        : "Termo Geral";
  }

  const container = document.getElementById("flashcard-container");
  if (container) {
    if (flashcardState.flipped) {
      container.classList.add("flipped");
    } else {
      container.classList.remove("flipped");
    }
  }

  updateCounterAndButtons();
}

// ==========================================
// NAVEGAÇÃO E INTERAÇÃO
// ==========================================
export function flipFlashcard() {
  const cardContainer = document.getElementById("flashcard-container");
  if (cardContainer) {
    cardContainer.classList.toggle("flipped");
    flashcardState.flipped = !flashcardState.flipped;
  }
}

export function nextFlashcard() {
  if (flashcardState.index < flashcardState.filteredTerms.length - 1) {
    flashcardState.index++;
    flashcardState.flipped = false;
    renderCurrentFlashcard();
  }
}

export function prevFlashcard() {
  if (flashcardState.index > 0) {
    flashcardState.index--;
    flashcardState.flipped = false;
    renderCurrentFlashcard();
  }
}

function updateCounterAndButtons() {
  const total = flashcardState.filteredTerms.length;

  const counterEl = document.getElementById("flashcard-counter");
  if (counterEl) {
    counterEl.textContent = `${flashcardState.index + 1} / ${total}`;
  }

  const prevBtn = document.getElementById("btn-prev-flashcard");
  const nextBtn = document.getElementById("btn-next-flashcard");

  if (prevBtn) {
    const isFirst = flashcardState.index === 0;
    prevBtn.disabled = isFirst;
    prevBtn.classList.toggle("opacity-50", isFirst);
    prevBtn.classList.toggle("cursor-not-allowed", isFirst);
  }

  if (nextBtn) {
    const isLast = flashcardState.index === total - 1;
    nextBtn.disabled = isLast;
    nextBtn.classList.toggle("opacity-50", isLast);
    nextBtn.classList.toggle("cursor-not-allowed", isLast);
  }
}

export function reloadCurrentFlashcard() {
  renderCurrentFlashcard();
}

export function filterFlashcardsByCert() {
  // Função fantasma. O app.js tenta importar isso na linha 352 e usar na 678.
  // Manter isso aqui impede que todo o simulador quebre.
  logger.info(
    "Filtro legado acionado. Agora a filtragem é automatizada pelo dropdown.",
  );
}

// ==========================================
// CONEXÃO DOS BOTÕES (EVENT LISTENERS)
// ==========================================
function setupFlashcardListeners() {
  const nextBtn = document.getElementById("btn-next-flashcard");
  const prevBtn = document.getElementById("btn-prev-flashcard");
  const homeBtn = document.getElementById("btn-flashcards-home");

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.addEventListener("click", nextFlashcard);
    nextBtn.dataset.bound = "true";
  }

  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.addEventListener("click", prevFlashcard);
    prevBtn.dataset.bound = "true";
  }

  if (homeBtn && !homeBtn.dataset.bound) {
    homeBtn.addEventListener("click", () => {
      if (typeof window.goHome === "function") {
        window.goHome();
      } else {
        document.getElementById("screen-flashcards").classList.add("hidden");
        const startScreen = document.getElementById("screen-start");
        if (startScreen) startScreen.classList.remove("hidden");
      }
    });
    homeBtn.dataset.bound = "true";
  }
}

// ==========================================
// EXPORTAÇÃO PARA ANKI
// ==========================================
export function exportToAnki() {
  const terms = flashcardState.filteredTerms;
  if (terms.length === 0) {
    alert("Não há flashcards filtrados para exportar.");
    return;
  }

  const currentLang = getOfficialLanguage();

  // Cabeçalho e conteúdo do CSV (Termo;Definição;Tags)
  // Ponto e vírgula como delimitador para evitar conflitos com vírgulas nas definições
  let csvContent = "Termo;Definicao;Tags\n";

  terms.forEach((card) => {
    const term = card.term[currentLang].replace(/;/g, ","); // Limpeza de ponto e vírgula
    const definition = card.definition[currentLang].replace(/;/g, ",");
    const tags = `AWS,${card.cert},${card.domain.replace(/\s+/g, "_")}`;

    csvContent += `"${term}";"${definition}";"${tags}"\n`;
  });

  // Gera o arquivo para download
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Anki_AWS_Deck_${flashcardState.currentDomainFilter}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Expõe globalmente para o botão do HTML
window.exportToAnki = exportToAnki;
