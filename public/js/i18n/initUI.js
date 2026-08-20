import { t } from "./useTranslation.js";
import { translations } from "./translations.js";

export function initializeUI(language) {
  const lang = language || "pt";

  // Header
  updateElement("header h1", t("app_title", lang));
  updateElement("header p", t("app_subtitle", lang));
  updateElementHTML(
    "#install-app",
    `<i class="fa-solid fa-download"></i> ${t("download_app", lang)}`,
  );
  updateAttribute("#btn-language", "aria-label", t("toggle_language", lang));
  updateAttribute("#btn-language", "title", t("toggle_language", lang));
  updateAttribute("#theme-toggle", "aria-label", t("toggle_dark_mode", lang));

  // Start Screen
  if (!document.getElementById("btn-start-diagnostic")) {
    updateElement("#screen-start h2", t("ai_question_engine", lang));
    updateElement("#screen-start > p", t("ai_description", lang));
  }

  // Certification selection
  updateElement("#screen-start h3:nth-of-type(1)", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-certificate aws-text-orange" aria-hidden="true"></i> ${t("select_certification", lang)}`;
  });

  // Filters and Settings
  updateElement("#screen-start h3:nth-of-type(2)", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-sliders aws-text-orange" aria-hidden="true"></i> ${t("filters_and_settings", lang)}`;
  });

  // Simulation Mode labels
  updateElement('label[for="quiz-mode"] .block', null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-clock mr-1 text-aws-orange"></i> ${t("simulation_mode", lang)}`;
  });
  updateElement('input[value="exam"] + div .font-bold', t("exam_mode", lang));
  updateElement('input[value="exam"] + div .text-xs', t("with_time", lang));
  updateElement(
    'input[value="review"] + div .font-bold',
    t("review_mode", lang),
  );
  updateElement(
    'input[value="review"] + div .text-xs',
    t("without_time", lang),
  );

  // Question Quantity label
  const qtyLabel = document
    .querySelector('input[name="question-quantity"]')
    ?.closest("div")?.previousElementSibling;
  if (qtyLabel) {
    qtyLabel.innerHTML = `<i class="fa-solid fa-list-ol mr-1 text-aws-orange"></i> ${t("question_quantity", lang)}`;
  }

  // Difficulty Level
  const diffLabel = document
    .querySelector('input[name="difficulty-level"]')
    ?.closest("div")?.previousElementSibling;
  if (diffLabel) {
    diffLabel.innerHTML = `<i class="fa-solid fa-signal mr-1 text-aws-orange"></i> ${t("difficulty_level", lang)}`;
  }
  updateElement(
    'input[value="all"][name="difficulty-level"] + div span',
    t("all_levels", lang),
  );
  updateElement('input[value="easy"] + div span', t("beginner", lang));
  updateElement('input[value="medium"] + div span', t("intermediate", lang));
  updateElement('input[value="hard"] + div span', t("expert", lang));

  // Topic Filter
  updateElement('label[for="topic-filter"]', null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-filter mr-1 text-aws-orange"></i> ${t("topic_filter", lang)}`;
  });
  // Note: Topic options are dynamically populated by updateTopicDropdown() based on selected certification

  // Features
  const features = document.querySelectorAll(
    "#screen-start .grid.grid-cols-2 > div",
  );
  if (features.length >= 4) {
    features[0].innerHTML = `<i class="fa-solid fa-check text-green-500"></i> ${t("updated_bank", lang)}`;
    features[1].innerHTML = `<i class="fa-solid fa-chart-line text-blue-500"></i> ${t("ai_analysis", lang)}`;
    features[2].innerHTML = `<i class="fa-solid fa-rotate text-purple-500"></i> ${t("dynamic_questions", lang)}`;
    features[3].innerHTML = `<i class="fa-solid fa-lightbulb aws-text-orange"></i> ${t("real_feedback", lang)}`;
  }

  // Buttons
  updateElementHTML(
    "#btn-start-quiz",
    `${t("start_simulation", lang)} <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`,
  );
  updateAttribute("#btn-start-quiz", "aria-label", t("start_simulation", lang));

  const flashcardsBtn = document.querySelector(
    'button[onclick="startFlashcards()"]',
  );
  if (flashcardsBtn) {
    flashcardsBtn.innerHTML = `<i class="fa-solid fa-layer-group mr-2" aria-hidden="true"></i> ${t("flashcards_mode", lang)}`;
    flashcardsBtn.setAttribute("aria-label", t("flashcards_mode", lang));
  }

  updateElementHTML(
    "#btn-practice-mistakes",
    `<i class="fa-solid fa-triangle-exclamation"></i> ${t("practice_mistakes", lang)}`,
  );
  updateElement("#btn-clear-mistakes", t("clear_mistakes_history", lang));

  // Quiz Screen
  updateElement("#question-category", t("category", lang));
  updateAttribute("#btn-flag", "aria-label", t("flag_for_review", lang));
  updateAttribute("#btn-flag", "title", t("flag_for_review", lang));
  updateElement("#question-text", t("loading_question", lang));

  updateElementHTML(
    "#btn-cancel",
    `<i class="fa-solid fa-xmark mr-2" aria-hidden="true"></i> ${t("cancel", lang)}`,
  );
  updateAttribute("#btn-cancel", "aria-label", t("cancel", lang));
  updateElement("#btn-submit", t("confirm_answer", lang));
  updateElementHTML(
    "#btn-next",
    `${t("next", lang)} <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`,
  );
  updateElementHTML(
    "#btn-finish",
    `${t("view_result", lang)} <i class="fa-solid fa-flag-checkered ml-2" aria-hidden="true"></i>`,
  );

  // Explanation box
  updateElement("#explanation-box h4", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-circle-info" aria-hidden="true"></i> ${t("explanation", lang)}`;
  });

  // Results Screen
  updateElement("#screen-results h2", t("simulation_complete", lang));
  updateElement(
    "#screen-results > p",
    t("detailed_performance_analysis", lang),
  );
  updateElement(
    "#screen-results .text-lg.font-semibold",
    t("official_aws_score", lang),
  );

  const correctLabel = document.querySelector("#final-correct")?.parentElement;
  if (correctLabel) {
    correctLabel.innerHTML = `<i class="fa-solid fa-check-circle" aria-hidden="true"></i> ${t("correct_answers", lang)} <span id="final-correct">0</span>`;
  }

  const errorsLabel = document.querySelector("#final-incorrect")?.parentElement;
  if (errorsLabel) {
    errorsLabel.innerHTML = `<i class="fa-solid fa-times-circle" aria-hidden="true"></i> ${t("errors", lang)} <span id="final-incorrect">0</span>`;
  }

  // Domain Analysis
  const domainAnalysisTitle = document.querySelector(
    "#screen-results .text-lg.font-bold",
  );
  if (domainAnalysisTitle) {
    domainAnalysisTitle.innerHTML = `<i class="fa-solid fa-chart-radar text-aws-orange"></i> ${t("domain_analysis", lang)}`;
  }

  // AI Recommendation
  updateElement("#ai-recommendation h4", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-robot" aria-hidden="true"></i> ${t("ai_recommendation", lang)}`;
  });

  // Result buttons
  const pdfBtn = document.querySelector(
    'button[onclick="generatePerformanceReport()"]',
  );
  if (pdfBtn) {
    pdfBtn.innerHTML = `<i class="fa-solid fa-file-pdf mr-2" aria-hidden="true"></i> ${t("pdf_report", lang)}`;
    pdfBtn.setAttribute("aria-label", t("pdf_report", lang));
  }

  const retakeBtn = document.querySelector('button[onclick="retakeQuiz()"]');
  if (retakeBtn) {
    retakeBtn.innerHTML = `<i class="fa-solid fa-rotate-right mr-2" aria-hidden="true"></i> ${t("retake", lang)}`;
    retakeBtn.setAttribute("aria-label", t("retake", lang));
  }

  const homeBtn = document.querySelector(
    '#screen-results button[onclick="goHome()"]',
  );
  if (homeBtn) {
    homeBtn.innerHTML = `<i class="fa-solid fa-house mr-2" aria-hidden="true"></i> ${t("home", lang)}`;
    homeBtn.setAttribute("aria-label", t("home", lang));
  }

  // Flashcards Screen
  updateElement("#screen-flashcards h2", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-layer-group aws-text-orange mr-2"></i> ${t("flashcards_mode_title", lang)}`;
  });
  updateElement("#screen-flashcards > p", t("flashcards_description", lang));
  updateElement(
    "#screen-flashcards .text-sm.font-semibold",
    `${t("filter_by_certification", lang)}`,
  );

  updateElement(".flashcard-front .text-sm.italic", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t("click_to_see_definition", lang)}`;
  });
  updateElement(
    ".flashcard-back .text-sm.uppercase",
    t("official_definition", lang),
  );
  updateElement(".flashcard-back .text-sm.italic", null, (el) => {
    el.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t("click_to_see_term", lang)}`;
  });

  updateElementHTML(
    "#btn-prev-flashcard",
    `<i class="fa-solid fa-arrow-left mr-2"></i> ${t("previous", lang)}`,
  );
  updateAttribute("#btn-prev-flashcard", "aria-label", t("previous", lang));
  updateElementHTML(
    "#btn-next-flashcard",
    `${t("next_card", lang)} <i class="fa-solid fa-arrow-right ml-2"></i>`,
  );
  updateAttribute("#btn-next-flashcard", "aria-label", t("next_card", lang));

  const flashHomeBtn = document.querySelector(
    '#screen-flashcards button[onclick="goHome()"]',
  );
  if (flashHomeBtn) {
    flashHomeBtn.innerHTML = `<i class="fa-solid fa-house mr-2"></i> ${t("back_to_home", lang)}`;
  }

  // Sidebar
  const progressTitle = document.querySelector("aside h3");
  if (progressTitle) {
    progressTitle.innerHTML = `<i class="fa-solid fa-medal text-yellow-500 mr-2" aria-hidden="true"></i> ${t("my_progress", lang)}`;
  }

  const badgesText = document.querySelector("#badges-container p");
  if (badgesText) {
    badgesText.textContent = t("complete_quizzes_for_badges", lang);
  }

  const insightTitle = document.querySelectorAll("aside h3")[1];
  if (insightTitle) {
    insightTitle.innerHTML = `<i class="fa-solid fa-bolt text-yellow-500 mr-2" aria-hidden="true"></i> ${t("study_insight", lang)}`;
  }

  updateElement("#dynamic-insight", t("start_quiz_for_ai_mapping", lang));

  // Atualiza apenas o texto dentro do span, protegendo o ícone do relógio!
  const historyTitle = document.getElementById("history-card-title");
  if (historyTitle) {
    historyTitle.textContent = t("historyTitle", lang); // Pega 'Últimas Sessões'
  }

  const clearHistoryBtn = document.getElementById("btn-clear-history");
  if (clearHistoryBtn) {
    clearHistoryBtn.setAttribute("title", t("clear_history", lang));
    clearHistoryBtn.setAttribute("aria-label", t("clear_history", lang));
  }

  updateElement("#history-list", t("no_quizzes_yet", lang));

  // Global Performance Dashboard
  const statsTitle = document.querySelector("#global-performance-dashboard h3");
  if (statsTitle) {
    statsTitle.innerHTML = `<i class="fa-solid fa-chart-pie text-aws-orange"></i> ${t("certification_statistics", lang)}`;
  }

  const emptyChartText = document.querySelector("#global-chart-empty p");
  if (emptyChartText) {
    emptyChartText.textContent = t("first_quiz_for_stats", lang);
  }

  // Update stat labels using more specific selectors
  const statLabels = document.querySelectorAll(
    "#global-stats-summary > div > div:last-child",
  );
  if (statLabels.length >= 3) {
    statLabels[0].textContent = t("quizzes", lang);
    statLabels[1].textContent = t("average", lang);
    statLabels[2].textContent = t("questions", lang);
  }

  // Footer
  const footerText = document.querySelector("footer");
  if (footerText) {
    const link = footerText.querySelector("a");
    const linkHTML = link ? link.outerHTML : "";
    footerText.innerHTML = `${t("developed_by", lang)} ${linkHTML} | ${t("aws_study_project", lang)}`;
  }

  // Universal data-i18n translation
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const translated = t(key, lang);
    if (translated && translated !== key) {
      // Allow HTML in translation only if it's safe or explicitly handled
      if (
        el.matches("input, textarea") &&
        el.dataset.i18nAttr === "placeholder"
      ) {
        el.placeholder = translated;
      } else if (el.dataset.i18nAttr) {
        el.setAttribute(el.dataset.i18nAttr, translated);
      } else {
        el.innerHTML = translated;
      }
    }
  });

  // Standalone Validation pages share the shell but do not load app.js.
  updateElement("#validator-status", t("admin_validation_auth_waiting", lang));
  updateElement(".validator-section h2", t("admin_validation_identity", lang));
  updateElement(
    "#login-section .mock-notice",
    t("admin_validation_restrict", lang),
  );
  updateElement(
    "#questions-list .loading-msg",
    t("admin_validation_loading", lang),
  );
  updateElement(
    ".dashboard-section .stat-card.pending h3",
    t("admin_validation_pending_count", lang),
  );
  updateElement(
    ".dashboard-section .stat-card.approved h3",
    t("admin_validation_approved_count", lang),
  );
  updateElement(
    ".dashboard-section .stat-card.rejected h3",
    t("admin_validation_rejected_count", lang),
  );
  updateAttribute(
    "#login-email",
    "placeholder",
    lang === "en" ? "your.name@a3data.com.br" : "seu.nome@a3data.com.br",
  );
  updateAttribute(
    "#rejection-reason",
    "placeholder",
    lang === "en" ? "At least 10 characters" : "Mínimo de 10 caracteres",
  );
  updateElement("#btn-login", t("common_login", lang));
  updateElement("#btn-confirm-reject", t("admin_validation_reject", lang));
  updateElement("#btn-cancel-reject", t("cancel", lang));

  // Shared standalone-page labels. Selectors are page-scoped by their IDs/classes.
  [
    [".settings-page-title", "settings_title"],
    ["#profile-stats-title", "profile_statistics"],
    ["#profile-certs-title", "profile_certifications"],
    ["#profile-badges-title", "profile_badges"],
  ].forEach(([selector, key]) =>
    updateElement(selector, null, (el) => {
      const icon = el.querySelector("i");
      el.textContent = "";
      if (icon) el.appendChild(icon);
      el.append(` ${t(key, lang)}`);
    }),
  );
  const profileLabels = document.querySelectorAll(".profile-stat-label");
  [
    "profile_quizzes",
    "profile_best_score",
    "profile_streak",
    "profile_xp",
  ].forEach((key, index) => {
    if (profileLabels[index]) profileLabels[index].textContent = t(key, lang);
  });
  updateElement("#resources-main h2", null, (el) => {
    const icon = el.querySelector("i");
    el.textContent = "";
    if (icon) el.appendChild(icon);
    el.append(` ${t("resources_title", lang)}`);
  });
  updateElement("#resources-main > div > p", t("resources_subtitle", lang));
  const resourceTitles = document.querySelectorAll(
    "#resources-main .a3-card-header h3",
  );
  [
    "resources_aws",
    "resources_certifications",
    "resources_architecture",
    "resources_channels",
    "resources_community",
    "resources_blogs",
    "resources_references",
  ].forEach((key, index) => {
    if (resourceTitles[index]) {
      const icon = resourceTitles[index].querySelector("i");
      resourceTitles[index].textContent = "";
      if (icon) resourceTitles[index].appendChild(icon);
      resourceTitles[index].append(` ${t(key, lang)}`);
    }
  });
  const settingsGroups = document.querySelectorAll(
    "#settings-page .settings-group-title",
  );
  [
    "settings_account",
    "settings_appearance",
    "settings_study",
    "settings_platform",
  ].forEach((key, index) => {
    if (settingsGroups[index]) settingsGroups[index].textContent = t(key, lang);
  });
  const displayNameLabel = document
    .querySelector("#setting-display-name")
    ?.closest(".settings-item")
    ?.querySelector(".settings-item-label");
  const displayNameHint = document
    .querySelector("#setting-display-name")
    ?.closest(".settings-item")
    ?.querySelector(".settings-item-hint");
  if (displayNameLabel)
    displayNameLabel.textContent = t("settings_display_name", lang);
  if (displayNameHint)
    displayNameHint.textContent = t("settings_display_name_hint", lang);
  const languageLabel = document
    .querySelector("#setting-lang")
    ?.closest(".settings-item")
    ?.querySelector(".settings-item-label");
  const languageHint = document
    .querySelector("#setting-lang")
    ?.closest(".settings-item")
    ?.querySelector(".settings-item-hint");
  if (languageLabel) languageLabel.textContent = t("settings_language", lang);
  if (languageHint)
    languageHint.textContent = t("settings_language_hint", lang);
  updateAttribute(
    "#setting-display-name",
    "placeholder",
    t("settings_display_name", lang),
  );
  updateAttribute("#setting-lang", "aria-label", t("settings_language", lang));
  updateAttribute("#settings-btn-save", "aria-label", t("settings_save", lang));
  if (document.getElementById("btn-start-diagnostic")) {
    updateElement("#screen-start h2", null, (el) => {
      const icon = el.querySelector("i");
      el.textContent = "";
      if (icon) el.appendChild(icon);
      el.append(` ${t("diagnostic_title", lang)}`);
    });
    updateElement("#btn-start-diagnostic", null, (el) => {
      const icon = el.querySelector("i");
      el.textContent = "";
      if (icon) el.appendChild(icon);
      el.append(` ${t("diagnostic_start", lang)}`);
    });
  }

  translateStaticSurface(lang);
}

/**
 * Translates static labels that belong to the shared dictionary even when a
 * legacy page has not yet been annotated with data-i18n. Dynamic educational
 * content is intentionally excluded by matching complete text nodes only.
 */
function translateStaticSurface(lang) {
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  const selectorKeys = [
    [".lh-metrics-title", "home_guide_title"],
    [".lh-metrics-sub", "home_guide_subtitle"],
    ["#hub-guide h3:nth-of-type(1)", "home_studies"],
    ["#hub-guide h3:nth-of-type(2)", "home_practice"],
    ["#hub-guide h3:nth-of-type(3)", "home_resources"],
    ["#global-performance-dashboard h3", "certification_statistics"],
    ["#hub-activity h2", "home_activity"],
    ["#quick-access h2", "home_quick_access"],
    ["#screen-flashcards .fc-diagnostic-title", "diagnostic_flashcards_title"],
    ["#study-insight-container #insight-card-title", "study_insight"],
    ["#flashcards-diagnostic-banner h3", "diagnostic_flashcards_title"],
    ["#flashcards-diagnostic-banner > p", "diagnostic_flashcards_subtitle"],
    ["#question-category", "category"],
    ["#btn-cancel", "cancel"],
    ["#btn-submit", "confirm_answer"],
    ["#btn-next", "next"],
    ["#btn-prev", "previous"],
    ["#btn-finish", "view_result"],
    ["#sprint-progress-label", "progress"],
    ["#guild-total-questions", "questions"],
    ["#guild-weekly-avg", "average"],
    ["#guild-leaderboard li", "ui_loading_board"],
    ["#cases-page-body h1", "cases_title"],
    ["#filter-certification option[value='']", "ui_all_feminine"],
    ["#filter-difficulty option[value='']", "ui_all"],
    ["#study-now-content .text-gray-400.italic", "common_loading_session"],
  ];
  selectorKeys.forEach(([selector, key]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = t(key, lang);
  });

  const portuguese = translations.pt || {};
  const keyByText = new Map();
  Object.entries(portuguese).forEach(([key, value]) => {
    if (
      typeof value === "string" &&
      value.trim() &&
      !keyByText.has(value.trim())
    ) {
      keyByText.set(value.trim(), key);
    }
  });

  const textNodeType = document.defaultView?.NodeFilter?.SHOW_TEXT || 4;
  const walker = document.createTreeWalker(document.body, textNodeType);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName))
      return;
    const value = node.nodeValue?.trim();
    const key = keyByText.get(value);
    if (!key) return;
    const translated = t(key, lang);
    if (translated && translated !== value)
      node.nodeValue = node.nodeValue.replace(value, translated);
  });

  ["title", "aria-label", "aria-description", "placeholder", "alt"].forEach(
    (attribute) => {
      document.querySelectorAll(`[${attribute}]`).forEach((element) => {
        const value = element.getAttribute(attribute)?.trim();
        const key = keyByText.get(value);
        if (!key) return;
        const translated = t(key, lang);
        if (translated) element.setAttribute(attribute, translated);
      });
    },
  );
}

// Helper functions
function updateElement(selector, text, callback) {
  const el = document.querySelector(selector);
  if (el) {
    if (callback) {
      callback(el);
    } else if (text !== null) {
      el.textContent = text;
    }
  }
}

function updateElementHTML(selector, html) {
  const el = document.querySelector(selector);
  if (el) {
    el.innerHTML = html;
  }
}

function updateAttribute(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute(attr, value);
  }
}
