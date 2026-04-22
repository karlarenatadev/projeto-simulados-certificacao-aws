import { t } from './useTranslation.js';

export function initializeUI(language) {
    const lang = language || 'pt';
    
    // Header
    updateElement('header h1', t('app_title', lang));
    updateElement('header p', t('app_subtitle', lang));
    updateElementHTML('#install-app', `<i class="fa-solid fa-download"></i> ${t('download_app', lang)}`);
    updateAttribute('#btn-language', 'aria-label', t('toggle_language', lang));
    updateAttribute('#btn-language', 'title', t('toggle_language', lang));
    updateAttribute('#theme-toggle', 'aria-label', t('toggle_dark_mode', lang));
    
    // Start Screen
    updateElement('#screen-start h2', t('ai_question_engine', lang));
    updateElement('#screen-start > p', t('ai_description', lang));
    
    // Certification selection
    updateElement('#screen-start h3:nth-of-type(1)', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-certificate aws-text-orange" aria-hidden="true"></i> ${t('select_certification', lang)}`;
    });
    
    // Filters and Settings
    updateElement('#screen-start h3:nth-of-type(2)', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-sliders aws-text-orange" aria-hidden="true"></i> ${t('filters_and_settings', lang)}`;
    });
    
    // Simulation Mode labels
    updateElement('label[for="quiz-mode"] .block', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-clock mr-1 text-aws-orange"></i> ${t('simulation_mode', lang)}`;
    });
    updateElement('input[value="exam"] + div .font-bold', t('exam_mode', lang));
    updateElement('input[value="exam"] + div .text-xs', t('with_time', lang));
    updateElement('input[value="review"] + div .font-bold', t('review_mode', lang));
    updateElement('input[value="review"] + div .text-xs', t('without_time', lang));
    
    // Question Quantity label
    const qtyLabel = document.querySelector('input[name="question-quantity"]')?.closest('div')?.previousElementSibling;
    if (qtyLabel) {
        qtyLabel.innerHTML = `<i class="fa-solid fa-list-ol mr-1 text-aws-orange"></i> ${t('question_quantity', lang)}`;
    }
    
    // Difficulty Level
    const diffLabel = document.querySelector('input[name="difficulty-level"]')?.closest('div')?.previousElementSibling;
    if (diffLabel) {
        diffLabel.innerHTML = `<i class="fa-solid fa-signal mr-1 text-aws-orange"></i> ${t('difficulty_level', lang)}`;
    }
    updateElement('input[value="all"][name="difficulty-level"] + div span', t('all_levels', lang));
    updateElement('input[value="easy"] + div span', t('beginner', lang));
    updateElement('input[value="medium"] + div span', t('intermediate', lang));
    updateElement('input[value="hard"] + div span', t('expert', lang));
    
    // Topic Filter
    updateElement('label[for="topic-filter"]', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-filter mr-1 text-aws-orange"></i> ${t('topic_filter', lang)}`;
    });
    // Note: Topic options are dynamically populated by updateTopicDropdown() based on selected certification
    
    // Features
    const features = document.querySelectorAll('#screen-start .grid.grid-cols-2 > div');
    if (features.length >= 4) {
        features[0].innerHTML = `<i class="fa-solid fa-check text-green-500"></i> ${t('updated_bank', lang)}`;
        features[1].innerHTML = `<i class="fa-solid fa-chart-line text-blue-500"></i> ${t('ai_analysis', lang)}`;
        features[2].innerHTML = `<i class="fa-solid fa-rotate text-purple-500"></i> ${t('dynamic_questions', lang)}`;
        features[3].innerHTML = `<i class="fa-solid fa-lightbulb aws-text-orange"></i> ${t('real_feedback', lang)}`;
    }
    
    // Buttons
    updateElementHTML('#btn-start-quiz', `${t('start_simulation', lang)} <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`);
    updateAttribute('#btn-start-quiz', 'aria-label', t('start_simulation', lang));
    
    const flashcardsBtn = document.querySelector('button[onclick="startFlashcards()"]');
    if (flashcardsBtn) {
        flashcardsBtn.innerHTML = `<i class="fa-solid fa-layer-group mr-2" aria-hidden="true"></i> ${t('flashcards_mode', lang)}`;
        flashcardsBtn.setAttribute('aria-label', t('flashcards_mode', lang));
    }
    
    updateElementHTML('#btn-practice-mistakes', `<i class="fa-solid fa-triangle-exclamation"></i> ${t('practice_mistakes', lang)} (<span id="mistakes-count">0</span>)`);
    updateElement('#btn-clear-mistakes', t('clear_mistakes_history', lang));
    
    // Quiz Screen
    updateElement('#question-category', t('category', lang));
    updateAttribute('#btn-flag', 'aria-label', t('flag_for_review', lang));
    updateAttribute('#btn-flag', 'title', t('flag_for_review', lang));
    updateElement('#question-text', t('loading_question', lang));
    
    updateElementHTML('#btn-cancel', `<i class="fa-solid fa-xmark mr-2" aria-hidden="true"></i> ${t('cancel', lang)}`);
    updateAttribute('#btn-cancel', 'aria-label', t('cancel', lang));
    updateElement('#btn-submit', t('confirm_answer', lang));
    updateElementHTML('#btn-next', `${t('next', lang)} <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`);
    updateElementHTML('#btn-finish', `${t('view_result', lang)} <i class="fa-solid fa-flag-checkered ml-2" aria-hidden="true"></i>`);
    
    // Explanation box
    updateElement('#explanation-box h4', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-circle-info" aria-hidden="true"></i> ${t('explanation', lang)}`;
    });
    
    // Results Screen
    updateElement('#screen-results h2', t('simulation_complete', lang));
    updateElement('#screen-results > p', t('detailed_performance_analysis', lang));
    updateElement('#screen-results .text-lg.font-semibold', t('official_aws_score', lang));
    
    const correctLabel = document.querySelector('#final-correct')?.parentElement;
    if (correctLabel) {
        correctLabel.innerHTML = `<i class="fa-solid fa-check-circle" aria-hidden="true"></i> ${t('correct_answers', lang)} <span id="final-correct">0</span>`;
    }
    
    const errorsLabel = document.querySelector('#final-incorrect')?.parentElement;
    if (errorsLabel) {
        errorsLabel.innerHTML = `<i class="fa-solid fa-times-circle" aria-hidden="true"></i> ${t('errors', lang)} <span id="final-incorrect">0</span>`;
    }
    
    // Domain Analysis
    const domainAnalysisTitle = document.querySelector('#screen-results .text-lg.font-bold');
    if (domainAnalysisTitle) {
        domainAnalysisTitle.innerHTML = `<i class="fa-solid fa-chart-radar text-aws-orange"></i> ${t('domain_analysis', lang)}`;
    }
    
    // AI Recommendation
    updateElement('#ai-recommendation h4', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-robot" aria-hidden="true"></i> ${t('ai_recommendation', lang)}`;
    });
    
    // Result buttons
    const pdfBtn = document.querySelector('button[onclick="generatePerformanceReport()"]');
    if (pdfBtn) {
        pdfBtn.innerHTML = `<i class="fa-solid fa-file-pdf mr-2" aria-hidden="true"></i> ${t('pdf_report', lang)}`;
        pdfBtn.setAttribute('aria-label', t('pdf_report', lang));
    }
    
    const retakeBtn = document.querySelector('button[onclick="retakeQuiz()"]');
    if (retakeBtn) {
        retakeBtn.innerHTML = `<i class="fa-solid fa-rotate-right mr-2" aria-hidden="true"></i> ${t('retake', lang)}`;
        retakeBtn.setAttribute('aria-label', t('retake', lang));
    }
    
    const homeBtn = document.querySelector('#screen-results button[onclick="goHome()"]');
    if (homeBtn) {
        homeBtn.innerHTML = `<i class="fa-solid fa-house mr-2" aria-hidden="true"></i> ${t('home', lang)}`;
        homeBtn.setAttribute('aria-label', t('home', lang));
    }
    
    // Flashcards Screen
    updateElement('#screen-flashcards h2', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-layer-group aws-text-orange mr-2"></i> ${t('flashcards_mode_title', lang)}`;
    });
    updateElement('#screen-flashcards > p', t('flashcards_description', lang));
    updateElement('#screen-flashcards .text-sm.font-semibold', `${t('filter_by_certification', lang)}`);
    
    updateElement('.flashcard-front .text-sm.italic', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_definition', lang)}`;
    });
    updateElement('.flashcard-back .text-sm.uppercase', t('official_definition', lang));
    updateElement('.flashcard-back .text-sm.italic', null, (el) => {
        el.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_term', lang)}`;
    });
    
    updateElementHTML('#btn-prev-flashcard', `<i class="fa-solid fa-arrow-left mr-2"></i> ${t('previous', lang)}`);
    updateAttribute('#btn-prev-flashcard', 'aria-label', t('previous', lang));
    updateElementHTML('#btn-next-flashcard', `${t('next_card', lang)} <i class="fa-solid fa-arrow-right ml-2"></i>`);
    updateAttribute('#btn-next-flashcard', 'aria-label', t('next_card', lang));
    
    const flashHomeBtn = document.querySelector('#screen-flashcards button[onclick="goHome()"]');
    if (flashHomeBtn) {
        flashHomeBtn.innerHTML = `<i class="fa-solid fa-house mr-2"></i> ${t('back_to_home', lang)}`;
    }
    
    // Sidebar
    const progressTitle = document.querySelector('aside h3');
    if (progressTitle) {
        progressTitle.innerHTML = `<i class="fa-solid fa-medal text-yellow-500 mr-2" aria-hidden="true"></i> ${t('my_progress', lang)}`;
    }
    
    const badgesText = document.querySelector('#badges-container p');
    if (badgesText) {
        badgesText.textContent = t('complete_quizzes_for_badges', lang);
    }
    
    const insightTitle = document.querySelectorAll('aside h3')[1];
    if (insightTitle) {
        insightTitle.innerHTML = `<i class="fa-solid fa-bolt text-yellow-500 mr-2" aria-hidden="true"></i> ${t('study_insight', lang)}`;
    }
    
    updateElement('#dynamic-insight', t('start_quiz_for_ai_mapping', lang));
    
    // Atualiza apenas o texto dentro do span, protegendo o ícone do relógio!
    const historyTitle = document.getElementById('history-card-title');
    if (historyTitle) {
        historyTitle.textContent = t('historyTitle', lang); // Pega 'Últimas Sessões'
    }
    
    const clearHistoryBtn = document.getElementById('btn-clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.setAttribute('title', t('clear_history', lang));
        clearHistoryBtn.setAttribute('aria-label', t('clear_history', lang));
    }
    
    updateElement('#history-list', t('no_quizzes_yet', lang));
    
    // Global Performance Dashboard
    const statsTitle = document.querySelector('#global-performance-dashboard h3');
    if (statsTitle) {
        statsTitle.innerHTML = `<i class="fa-solid fa-chart-pie text-aws-orange"></i> ${t('certification_statistics', lang)}`;
    }
    
    const emptyChartText = document.querySelector('#global-chart-empty p');
    if (emptyChartText) {
        emptyChartText.textContent = t('first_quiz_for_stats', lang);
    }
    
    // Update stat labels using more specific selectors
    const statLabels = document.querySelectorAll('#global-stats-summary > div > div:last-child');
    if (statLabels.length >= 3) {
        statLabels[0].textContent = t('quizzes', lang);
        statLabels[1].textContent = t('average', lang);
        statLabels[2].textContent = t('questions', lang);
    }
    
    // Footer
    const footerText = document.querySelector('footer');
    if (footerText) {
        const link = footerText.querySelector('a');
        const linkHTML = link ? link.outerHTML : '';
        footerText.innerHTML = `${t('developed_by', lang)} ${linkHTML} | ${t('aws_study_project', lang)}`;
    }
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
