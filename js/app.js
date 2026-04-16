import { QuizEngine } from './quizEngine.js';
import { certificationPaths, glossaryTerms } from './data.js';
import { storageManager } from './storageManager.js';
import { renderRadarChart, renderGlobalRadarChart, calculateGlobalDomainStats } from './chartManager.js';
import { t } from './i18n/useTranslation.js';
import { initializeUI } from './i18n/initUI.js';
import { renderTrail, unlockNextModule } from './gamificacao/trailManager.js';
import { renderGuildDashboard } from './gamificacao/leaderboard.js';
import { renderBadges } from './gamificacao/badges.js';

const APP_CONFIG = {
    PASSING_SCORE: 70,
    STORAGE_KEY: 'aws_sim_'
};

const engine = new QuizEngine(APP_CONFIG.PASSING_SCORE);

let uiState = {
    currentCertificationInfo: null,
    timerInterval: null,
    timeRemaining: 0,
    isPaused: false,
    tempSelectedAnswer: null,
    language: localStorage.getItem('aws_sim_lang') || 'pt',
    flashcardIndex: 0,
    flashcardFlipped: false,
    currentMode: 'exam', // 'exam', 'review', 'mission'
    lives: 3,
    qTimerInterval: null,
    qTimeRemaining: 45
};

// INICIALIZAÇÃO

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeUI(uiState.language);
    updateHistoryDisplay();
    renderGamification();
    updateLanguageButtonUI();
    initPWAInstall();
    wireUIActions();
    updateSidebarProgress();

    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }

    const certSelect = document.getElementById('certification-select');

    if (certSelect && certificationPaths && certificationPaths[certSelect.value]) {
        uiState.currentCertificationInfo = certificationPaths[certSelect.value];
        updateTopicDropdown();
        loadLastScore();
    }

    if (certSelect) {
        certSelect.addEventListener('change', () => {
            if (certificationPaths && certificationPaths[certSelect.value]) {
                uiState.currentCertificationInfo = certificationPaths[certSelect.value];
                updateTopicDropdown();
                loadLastScore();
                updateDifficultyFilters(certSelect.value);

                if (typeof renderGlobalRadarChart === 'function') {
                    renderGlobalRadarChart();
                }
            }
        });
    }

    if (certSelect) {
        updateDifficultyFilters(certSelect.value);
    }
});

function bindClick(id, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('click', handler);
    }
}

function wireUIActions() {
    bindClick('home-trigger', goHome);
    bindClick('btn-language', toggleLanguage);
    bindClick('theme-toggle', toggleDarkMode);
    bindClick('btn-start-quiz', startQuiz);
    bindClick('btn-start-flashcards', startFlashcards);
    bindClick('btn-practice-mistakes', startMistakesQuiz);
    bindClick('btn-clear-mistakes', clearMistakes);
    bindClick('btn-flag', toggleFlag);
    bindClick('btn-cancel', cancelQuiz);
    bindClick('btn-submit', submitAnswer);
    bindClick('btn-next', nextQuestion);
    bindClick('btn-finish', finishQuiz);
    bindClick('btn-generate-report', generatePerformanceReport);
    bindClick('btn-retake-quiz', retakeQuiz);
    bindClick('btn-results-home', goHome);
    bindClick('btn-prev-flashcard', prevFlashcard);
    bindClick('btn-next-flashcard', nextFlashcard);
    bindClick('btn-flashcards-home', goHome);
    bindClick('btn-clear-history', clearHistory);

    const flashcardContainer = document.getElementById('flashcard-container');
    if (flashcardContainer) {
        flashcardContainer.addEventListener('click', flipFlashcard);
        flashcardContainer.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                flipFlashcard();
            }
        });
    }
}

// MOTOR DO QUIZ E TIMER

async function startQuiz() {
    const certSelect = document.getElementById('certification-select');
    const quantityInput = document.querySelector('input[name="question-quantity"]:checked')?.value || 10;
    const difficultyInput = document.querySelector('input[name="difficulty-level"]:checked')?.value || 'all';
    const modeInput = document.querySelector('input[name="quiz-mode"]:checked')?.value || 'exam';
    const topicSelect = document.getElementById('topic-filter')?.value || '';
    const btn = document.getElementById('btn-start-quiz');

    if (!certSelect) return;

    try {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${t('loading', uiState.language)}`;

        const certId = certSelect.value;
        const currentCertInfo = certificationPaths[certId];
        uiState.currentCertificationInfo = currentCertInfo;

        const filters = {
            quantity: parseInt(quantityInput),
            difficulty: difficultyInput,
            topic: topicSelect,
            mode: modeInput
        };

        const result = await engine.loadQuestions(certId, currentCertInfo.domains, filters, uiState.language);

        if (!result.success) {
            alert(t('error_loading_questions', uiState.language, { message: result.message }));
            return;
        }

        let tempoPorQuestao = 90;
        if (certId === 'saa-c03' || certId === 'dva-c02') {
            tempoPorQuestao = 120;
        } else if (certId === 'clf-c02') {
            tempoPorQuestao = 83;
        } else if (certId === 'aif-c01') {
            tempoPorQuestao = 110;
        }

        uiState.timeRemaining = result.totalQuestions * tempoPorQuestao;

        const oldReport = document.getElementById('detailed-report');
        if (oldReport) oldReport.remove();

        // --- INÍCIO DAS MODIFICAÇÕES DE LAYOUT ---
        showScreen('quiz');

        const sidebar = document.getElementById('side-info');
        const mainSection = document.getElementById('main-section');
        
        if (sidebar) sidebar.classList.add('hidden'); // Esconde a lateral
        if (mainSection) {
            mainSection.classList.remove('lg:w-2/3'); // Remove a largura parcial
            mainSection.classList.add('w-full');      // Faz ocupar a tela cheia
        }

        const scoreContainer = document.getElementById('score-container');
        if (scoreContainer) scoreContainer.style.display = 'flex';
        // --- FIM DAS MODIFICAÇÕES DE LAYOUT ---

        const timerContainer = document.getElementById('timer-container');
        if (filters.mode === 'exam') {
            if (timerContainer) timerContainer.classList.remove('hidden');
            startTimer();
        } else {
            if (timerContainer) timerContainer.classList.add('hidden');
        }

        loadQuestionUI();

    } catch (err) {
        alert(t('error_starting_quiz', uiState.language, { message: err.message }));
        console.error('Erro ao iniciar quiz:', err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `${t('start_simulation', uiState.language)} <i class="fa-solid fa-arrow-right ml-2"></i>`;
    }
}

function startTimer() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);

    updateTimerDisplay();

    uiState.timerInterval = setInterval(() => {
        if (uiState.isPaused) return;

        uiState.timeRemaining--;
        updateTimerDisplay();

        if (uiState.timeRemaining <= 0) {
            clearInterval(uiState.timerInterval);
            alert(t('time_up', uiState.language));
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const hours = Math.floor(uiState.timeRemaining / 3600);
    const min = Math.floor((uiState.timeRemaining % 3600) / 60);
    const sec = uiState.timeRemaining % 60;

    const el = document.getElementById('timer-text');
    if (el) {
        if (hours > 0) {
            el.textContent = `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        } else {
            el.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
    }
}

// UI DE QUESTÕES E MÚLTIPLAS ESCOLHAS

function loadQuestionUI() {
    const q = engine.getCurrentQuestion();
    const progress = engine.getProgress();
    const isMulti = Array.isArray(q.correct);

    document.getElementById('question-category').textContent = getDomainName(q.domain);

    const questionText = isMulti ? `${q.question} <br><span class="text-sm text-aws-orange italic mt-2 block">(${t('choose_options', uiState.language, { count: q.correct.length })})</span>` : q.question;
    document.getElementById('question-text').innerHTML = questionText;

    document.getElementById('current-q-num').textContent = progress.current;
    document.getElementById('total-q-num').textContent = progress.total;

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${progress.percentage}%`;

    uiState.tempSelectedAnswer = isMulti ? [] : null;

    renderOptionsUI(q);

    const btnSubmit = document.getElementById('btn-submit');
    const explanationBox = document.getElementById('explanation-box');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.classList.remove('hidden'); }
    if (explanationBox) explanationBox.classList.add('hidden');
    if (btnNext) btnNext.classList.add('hidden');
    if (btnFinish) btnFinish.classList.add('hidden');

    const flagBtn = document.getElementById('btn-flag');
    if (flagBtn) flagBtn.classList.remove('text-orange-500');

    updateScoreDisplayUI();
}

function renderOptionsUI(question) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    const isMulti = Array.isArray(question.correct);

    question.options.forEach((opt, idx) => {
        const card = document.createElement('div');
        card.id = `option-${idx}`;
        card.className = 'option-card group p-4 rounded-xl flex items-center gap-4 cursor-pointer border-2 border-gray-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800';

        card.innerHTML = `
            <div class="option-letter w-10 h-10 flex-shrink-0 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center font-bold text-gray-500 group-hover:text-orange-600 transition-colors">
                ${String.fromCharCode(65 + idx)}
            </div>
            <div class="option-text flex-grow text-gray-700 dark:text-gray-200 font-medium">
                ${opt}
            </div>
        `;

        card.onclick = () => {
            const isAnswered = !document.getElementById('btn-next').classList.contains('hidden') ||
                !document.getElementById('btn-finish').classList.contains('hidden');
            if (isAnswered) return;

            if (!isMulti) {
                document.querySelectorAll('.option-card').forEach(c => {
                    c.classList.remove('selected', 'border-orange-500', 'bg-orange-50');
                    c.querySelector('.option-letter').classList.remove('bg-orange-500', 'text-white');
                });

                card.classList.add('selected', 'border-orange-500', 'bg-orange-50');
                card.querySelector('.option-letter').classList.add('bg-orange-500', 'text-white');

                uiState.tempSelectedAnswer = idx;
                document.getElementById('btn-submit').disabled = false;
            } else {
                const isSelected = card.classList.contains('selected');

                if (isSelected) {
                    card.classList.remove('selected', 'border-orange-500', 'bg-orange-50');
                    card.querySelector('.option-letter').classList.remove('bg-orange-500', 'text-white');
                    uiState.tempSelectedAnswer = uiState.tempSelectedAnswer.filter(i => i !== idx);
                } else {
                    if (uiState.tempSelectedAnswer.length < question.correct.length) {
                        card.classList.add('selected', 'border-orange-500', 'bg-orange-50');
                        card.querySelector('.option-letter').classList.add('bg-orange-500', 'text-white');
                        uiState.tempSelectedAnswer.push(idx);
                    }
                }
                document.getElementById('btn-submit').disabled = uiState.tempSelectedAnswer.length !== question.correct.length;
            }
        };

        container.appendChild(card);
    });
}

function submitAnswer() {
    const question = engine.getCurrentQuestion();
    const isMulti = Array.isArray(question.correct);
    const result = engine.submitAnswer(uiState.tempSelectedAnswer);
    
    if (uiState.currentMode === 'mission') {
        clearInterval(uiState.qTimerInterval); // Para o relógio enquanto lê a explicação
        
        if (!result.isCorrect) {
            uiState.lives--;
            updateHeartsUI();
            
            if (uiState.lives <= 0) {
                setTimeout(() => handleMissionFailure("Você perdeu todos os corações!"), 500);
                return; // Interrompe para não deixar avançar
            }
        }
    }

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.classList.add('hidden');

    document.querySelectorAll('.option-card').forEach(card => card.classList.add('opacity-70'));

    if (!isMulti) {
        const userSelectedIdx = uiState.tempSelectedAnswer;
        const correctIdx = question.correct;
        const isCorrect = userSelectedIdx === correctIdx;

        if (isCorrect) {
            applyStyleToOptionCard(userSelectedIdx, 'correct');
        } else {
            applyStyleToOptionCard(userSelectedIdx, 'incorrect');
            applyStyleToOptionCard(correctIdx, 'correct');
        }
    } else {
        const userSelections = uiState.tempSelectedAnswer;
        const correctAnswers = question.correct;

        question.options.forEach((_, optionIdx) => {
            const isSelectedByUser = userSelections.includes(optionIdx);
            const isTrulyCorrect = correctAnswers.includes(optionIdx);

            if (isSelectedByUser) {
                applyStyleToOptionCard(optionIdx, isTrulyCorrect ? 'correct' : 'incorrect');
            } else if (isTrulyCorrect) {
                applyStyleToOptionCard(optionIdx, 'correct');
            }
        });
    }

    const expBox = document.getElementById('explanation-box');
    if (!expBox) return;

    const docLink = result.referenceUrl ?
        `<a href="${result.referenceUrl}" target="_blank" class="mt-3 inline-block text-orange-600 font-bold hover:underline">
            <i class="fa-solid fa-book-open mr-1"></i> ${t('see_official_docs', uiState.language)}
         </a>` : '';

    const titleEl = expBox.querySelector('h4');
    const textEl = document.getElementById('explanation-text');

    if (titleEl) {
        titleEl.innerHTML = result.isCorrect ?
            `<i class="fa-solid fa-check"></i> ${t('correct', uiState.language)}` : `<i class="fa-solid fa-xmark"></i> ${t('incorrect', uiState.language)}`;
        titleEl.className = result.isCorrect ? "font-bold text-green-600 mb-3" : "font-bold text-red-600 mb-3";
    }

    let feedbackHTML = "";
    if (!result.isCorrect) {
        let userText = isMulti ? uiState.tempSelectedAnswer.map(i => question.options[i]).join("<br>• ") : question.options[uiState.tempSelectedAnswer];
        feedbackHTML += `<div class="mb-2"><strong class="text-gray-800 dark:text-gray-200">${t('your_answer', uiState.language)}</strong> <span class="text-red-600 dark:text-red-400"><br>• ${userText}</span></div>`;
    }
    let correctText = isMulti ? question.correct.map(i => question.options[i]).join("<br>• ") : question.options[result.correctIndex];
    feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">${t('correct_answer', uiState.language)}</strong> <span class="text-green-600 dark:text-green-400"><br>• ${correctText}</span></div>`;
    feedbackHTML += `<div class="pt-3 mt-2 border-t border-blue-200 dark:border-slate-600"><strong class="text-gray-800 dark:text-gray-200">${t('why', uiState.language)}</strong><br>${result.explanation}</div>`;

    if (textEl) textEl.innerHTML = `${feedbackHTML} ${docLink}`;
    expBox.classList.remove('hidden');

    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    if (!result.isFinished) {
        if (btnNext) btnNext.classList.remove('hidden');
    } else {
        if (btnFinish) btnFinish.classList.remove('hidden');
    }

    updateScoreDisplayUI();
}

function applyStyleToOptionCard(optionIdx, styleType) {
    const card = document.getElementById(`option-${optionIdx}`);
    if (!card) return;

    const letterEl = card.querySelector('.option-letter');
    const textEl = card.querySelector('.option-text');

    card.classList.remove('selected', 'border-orange-500', 'bg-orange-50', 'opacity-70', 'border-gray-100', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
    letterEl.classList.remove('bg-orange-500', 'text-white', 'bg-gray-100', 'dark:bg-slate-700');
    textEl.classList.remove('text-gray-700', 'dark:text-gray-200');

    if (styleType === 'correct') {
        card.classList.add('border-green-600', 'bg-green-50', 'dark:bg-green-900/30', 'opacity-100');
        letterEl.classList.add('bg-green-600', 'text-white');
        textEl.classList.add('text-green-800', 'dark:text-green-300', 'font-semibold');
    } else if (styleType === 'incorrect') {
        card.classList.add('border-red-600', 'bg-red-50', 'dark:bg-red-900/30', 'opacity-100');
        letterEl.classList.add('bg-red-600', 'text-white');
        textEl.classList.add('text-red-800', 'dark:text-red-300', 'font-semibold');
    }
}

function nextQuestion() {
    if (engine.nextQuestion()) {
        loadQuestionUI();
    }

    if (uiState.currentMode === 'mission') {
            startQuestionTimer();
        }
}

function finishQuiz() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    saveQuizResult();
    updateHistoryDisplay();
    loadLastScore();

    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }

    showResultsScreen();
}

function toggleFlag() {
    const flagBtn = document.getElementById('btn-flag');
    if (flagBtn) flagBtn.classList.toggle('text-orange-500');
}

//  TELAS E RELATÓRIOS

function showScreen(screenName) {
    const screens = ['start', 'quiz', 'results', 'flashcards', 'jornada'];
    screens.forEach(s => {
        const el = document.getElementById(`screen-${s}`);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`screen-${screenName}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('flex', 'flex-col', 'fade-in');
    }
}

// showResultsScreen com polling para garantir que o canvas está visível
function showResultsScreen() {
    const results = engine.getFinalResults();

    if (!results) {
        console.error('Erro ao obter resultados finais do quiz');
        alert('Erro ao exibir resultados. Tente novamente.');
        return;
    }

    // Garante currentCertificationInfo antes de renderizar
    if (!uiState.currentCertificationInfo && results.certId && certificationPaths) {
        uiState.currentCertificationInfo = certificationPaths[results.certId];
    }

    displayReportFromResult(results);

    // Polling: aguarda canvas ficar visível antes de desenhar o gráfico
    const tryRenderChart = (attempts = 0) => {
        const canvas = document.getElementById('radarChart');
        const screen = document.getElementById('screen-results');
        const isVisible = screen && !screen.classList.contains('hidden');

        if (canvas && isVisible && typeof renderRadarChart === 'function') {
            renderRadarChart(results, uiState.currentCertificationInfo);
        } else if (attempts < 10) {
            setTimeout(() => tryRenderChart(attempts + 1), 100);
        } else {
            console.warn('Canvas radarChart não ficou disponível a tempo.');
        }
    };

    setTimeout(() => tryRenderChart(), 80);
}

function displayReportFromResult(results) {
    if (!results || typeof results.percentage !== 'number') {
        console.error('Dados de resultado inválidos em displayReportFromResult');
        alert('Erro ao exibir relatório. Dados corrompidos.');
        return;
    }

    if (certificationPaths && results.certId) {
        uiState.currentCertificationInfo = certificationPaths[results.certId];
    }

    const awsScore = Math.floor((results.percentage / 100) * 900) + 100;

    const scorePercentEl = document.getElementById('final-score-percent');
    const finalCorrectEl = document.getElementById('final-correct');
    const finalIncorrectEl = document.getElementById('final-incorrect');

    if (scorePercentEl) scorePercentEl.textContent = awsScore;
    if (finalCorrectEl) finalCorrectEl.textContent = results.score || 0;
    if (finalIncorrectEl) finalIncorrectEl.textContent = (results.total || 0) - (results.score || 0);

    const scoreDisplay = document.getElementById('final-score-percent');
    if (!scoreDisplay) return;

    const parentDiv = scoreDisplay.parentElement;
    if (!parentDiv) return;

    const oldBadge = parentDiv.querySelector('.approval-badge');
    if (oldBadge) oldBadge.remove();

    const badge = document.createElement('div');
    badge.className = 'approval-badge mt-3 px-4 py-2 rounded-lg font-bold text-sm';

    if (awsScore >= 700) {
        badge.classList.add('bg-green-100', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-400', 'border-2', 'border-green-500');
        badge.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>${t('approved', uiState.language)}`;
    } else {
        badge.classList.add('bg-orange-100', 'dark:bg-orange-900/30', 'text-orange-700', 'dark:text-orange-400', 'border-2', 'border-orange-500');
        badge.innerHTML = `<i class="fa-solid fa-exclamation-triangle mr-2"></i>${t('needs_review', uiState.language)}`;
    }

    parentDiv.appendChild(badge);

    const recText = document.getElementById('recommendation-text');

    if (recText) {
        const weakDomains = results.weakDomains || [];

        if (results.percentage < 40) {
            recText.innerHTML = `<strong>${t('attention_low_performance', uiState.language)}</strong> ${t('recommendation_review_basics', uiState.language)}`;
        } else if (weakDomains.length === 0) {
            recText.innerHTML = `<strong>${t('excellent_consistency', uiState.language)}</strong> ${t('ready_for_exam', uiState.language)}`;
        } else if (weakDomains.length === 1) {
            const domainName = getDomainName(weakDomains[0]) || t('general_topics', uiState.language);
            recText.innerHTML = `<strong>${t('almost_there_single', uiState.language)}</strong> ${t('improvement_opportunity', uiState.language)} <em>${domainName}</em>. ${t('review_official_docs', uiState.language)}`;
        } else {
            const domainNames = weakDomains.map(id => getDomainName(id)).join(', ');
            recText.innerHTML = `<strong>${t('attention_critical_areas', uiState.language)}</strong> <em>${domainNames}</em>. ${t('review_these_topics', uiState.language)}`;
        }
    }

    renderDetailedReportUI(results);
    showScreen('results');
}

function renderDetailedReportUI(results) {
    if (!results || !results.answers || !Array.isArray(results.answers)) {
        console.error('Dados de resultado inválidos em renderDetailedReportUI');
        return;
    }

    const resultsScreen = document.getElementById('screen-results');
    if (!resultsScreen) {
        console.error('Tela de resultados não encontrada');
        return;
    }

    const buttonsContainer = resultsScreen.querySelector('.flex.gap-3.flex-wrap');
    if (buttonsContainer) buttonsContainer.classList.add('no-print');

    let reportDiv = document.getElementById('detailed-report');
    if (!reportDiv) {
        reportDiv = document.createElement('div');
        reportDiv.id = 'detailed-report';
        reportDiv.className = 'mt-8 mb-8 w-full max-w-3xl mx-auto text-left bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 print-report-container';
        resultsScreen.insertBefore(reportDiv, buttonsContainer);
    }

    const recText = document.getElementById('recommendation-text')?.innerHTML || '';

    let html = `
        <div class="hidden print:block mb-8 border-b-2 border-black pb-6">
            <h2 class="text-3xl font-bold mb-4 print-text-black">${t('official_report_title', uiState.language)}</h2>
            <p class="text-xl mb-4 print-text-black"><strong>${t('final_score', uiState.language)}</strong> ${results.percentage.toFixed(0)}% (${results.score} ${t('correct_answers', uiState.language).toLowerCase()} ${t('of', uiState.language)} ${results.total})</p>
            <div class="border border-black p-4 mt-4">
                <strong class="text-lg block mb-2 print-text-black">${t('study_suggestion', uiState.language)}</strong>
                <span class="text-base print-text-black">${recText}</span>
            </div>
        </div>
    `;

    html += `
        <div class="domain-performance-section mb-8">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                <i class="fa-solid fa-chart-bar text-aws-orange mr-2"></i> ${t('domain_performance', uiState.language)}
            </h3>
            <div class="space-y-3">
    `;

    if (uiState.currentCertificationInfo && Array.isArray(uiState.currentCertificationInfo.domains)) {
        if (results.domainScores && typeof results.domainScores === 'object') {
            uiState.currentCertificationInfo.domains.forEach(domain => {
                const scoreData = results.domainScores[domain.id];

                if (scoreData && scoreData.total > 0) {
                    const pct = (scoreData.correct / scoreData.total) * 100;
                    const meets = pct >= 70;

                    const statusText = meets ? t('meets_competencies', uiState.language) : t('needs_improvement', uiState.language);
                    const statusColor = meets
                        ? "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800"
                        : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800";
                    const icon = meets ? "fa-check-circle" : "fa-exclamation-triangle";

                    html += `
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-600 transition-all hover:shadow-sm gap-4">
                            <div class="flex-1 min-w-0">
                                <span class="font-bold text-gray-800 dark:text-gray-200 block text-md whitespace-normal">${domain.name}</span>
                                <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 block">
                                    ${t('domain_score', uiState.language)} ${pct.toFixed(0)}% <span class="opacity-75">(${scoreData.correct} ${t('of', uiState.language)} ${scoreData.total} ${t('correct_out_of', uiState.language)})</span>
                                </span>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold border ${statusColor} shrink-0 whitespace-nowrap">
                                <i class="fa-solid ${icon}"></i> ${statusText}
                            </div>
                        </div>
                    `;
                }
            });
        }
    }

    html += `</div></div>`;

    html += `
        <div class="report-header pb-4 mb-6 border-b border-gray-300 dark:border-slate-700 print:hidden mt-10">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white">
                <i class="fa-solid fa-list-check text-aws-orange mr-2"></i> ${t('question_details', uiState.language)}
            </h3>
        </div>
    `;

    results.answers.forEach((ans, index) => {
        const isMulti = Array.isArray(ans.correct);

        let userText = "";
        let correctText = "";

        if (isMulti) {
            userText = ans.userSelection.map(i => ans.options[i]).join("<br>• ");
            correctText = ans.correct.map(i => ans.options[i]).join("<br>• ");
        } else {
            userText = ans.options[ans.userSelection];
            correctText = ans.options[ans.correct];
        }

        const colorClass = ans.isCorrect ? "print-text-green text-green-600 dark:text-green-400" : "print-text-red text-red-600 dark:text-red-400";
        const icon = ans.isCorrect ? "✅" : "❌";

        html += `
        <div class="question-review mb-8 pb-6 border-b border-gray-200 dark:border-slate-700 page-break-safe">
            <div class="mb-3">
                <span class="font-bold text-gray-800 dark:text-white text-lg block mb-2 print-text-black">${index + 1}. ${ans.question}</span>
            </div>
            <div class="answer-block mb-3 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-600 print-no-bg">
                <div class="mb-2">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">${t('your_answer_label', uiState.language)}</span>
                    <span class="${colorClass} font-semibold block leading-snug">${icon} ${isMulti ? '<br>• ' : ''}${userText}</span>
                </div>
                ${!ans.isCorrect ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 print-border-black">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">${t('correct_answer_label', uiState.language)}</span>
                    <span class="print-text-green text-green-600 dark:text-green-400 font-semibold block leading-snug">✅ ${isMulti ? '<br>• ' : ''}${correctText}</span>
                </div>` : ''}
            </div>
            <div class="explanation-print mt-4 p-4 rounded-lg bg-blue-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 border-l-4 border-l-blue-500 text-sm text-gray-800 dark:text-gray-200 print-no-bg">
                <strong class="text-blue-800 dark:text-blue-300 block mb-2 print-text-black">${t('explanation_label', uiState.language)}</strong>
                <span class="block leading-relaxed print-text-black">${ans.explanation}</span>
            </div>
        </div>
        `;
    });

    reportDiv.innerHTML = html;
}

// PERSISTÊNCIA E HISTÓRICO
function saveQuizResult() {
    const results = engine.getFinalResults();
    storageManager.saveQuizResult(results);
    updateGamification(results.percentage);
}

function loadLastScore() {
    const banner = document.getElementById('last-score-banner');
    const certSelect = document.getElementById('certification-select');

    if (!banner || !certSelect) return;

    const certId = certSelect.value;
    if (!certId) return;

    const last = storageManager.loadLastScore(certId);

    if (last && typeof last.percentage === 'number') {
        banner.classList.remove('hidden');
        banner.classList.add('cursor-pointer', 'hover:bg-blue-100', 'dark:hover:bg-blue-800', 'transition-all');
        const awsScore = Math.floor((last.percentage / 100) * 900) + 100;

        banner.innerHTML = `
            <div class="flex justify-between items-center w-full h-full" onclick="showLastReport('${certId}')">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-history"></i>
                    <span>${t('last_test', uiState.language)} <strong>${awsScore} ${t('points', uiState.language)}</strong></span>
                </div>
                <div class="text-xs font-bold underline flex items-center gap-1 opacity-80 hover:opacity-100">
                    <i class="fa-solid fa-file-pdf"></i> ${t('see_report', uiState.language)}
                </div>
            </div>
        `;
    } else {
        banner.classList.add('hidden');
    }
}

function showLastReport(certId) {
    const lastResult = storageManager.loadLastResult(certId);

    if (!lastResult || !lastResult.answers) {
        alert(t('no_report_details', uiState.language));
        return;
    }

    if (!lastResult.domainScores || typeof lastResult.domainScores !== 'object') {
        alert(t('corrupted_report', uiState.language));
        return;
    }

    if (!lastResult.weakDomains) {
        lastResult.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(lastResult.domainScores)) {
            if (scoreData && scoreData.total > 0) {
                const domainPct = (scoreData.correct / scoreData.total) * 100;
                if (domainPct < 70) lastResult.weakDomains.push(domainId);
            }
        }
    }
    displayReportFromResult(lastResult);
}

function showHistoricalReport(index) {
    let history = storageManager.getHistory();

    if (!Array.isArray(history)) {
        history = [];
        storageManager.clearHistory();
        alert(t('corrupted_history', uiState.language));
        return;
    }

    const result = history[index];

    if (!result || !result.answers) {
        alert(t('report_unavailable', uiState.language));
        return;
    }

    if (!result.domainScores || typeof result.domainScores !== 'object') {
        alert(t('corrupted_report', uiState.language));
        return;
    }

    if (!result.weakDomains) {
        result.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(result.domainScores)) {
            if (scoreData && scoreData.total > 0) {
                const domainPct = (scoreData.correct / scoreData.total) * 100;
                if (domainPct < 70) result.weakDomains.push(domainId);
            }
        }
    }
    displayReportFromResult(result);
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    let rawHistory = storageManager.getHistory();

    if (!Array.isArray(rawHistory)) {
        rawHistory = [];
        storageManager.clearHistory();
    }

    const history = rawHistory.filter(item => item && item.certId && item.percentage !== undefined);

    if (history.length === 0) {
        historyList.innerHTML = t('no_quizzes_yet', uiState.language);
        updateDynamicInsight([]);
        return;
    }

    let html = '<ul class="space-y-3 w-full">';

    history.forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isPass = item.percentage >= APP_CONFIG.PASSING_SCORE;
        const color = isPass ? 'text-green-500' : 'text-red-500';
        const icon = isPass ? 'fa-check-circle' : 'fa-times-circle';
        const certName = item.certId ? item.certId.toUpperCase() : 'AWS';
        const awsScore = Math.floor((item.percentage / 100) * 900) + 100;

        const originalIndex = rawHistory.indexOf(item);

        html += `
        <li onclick="showHistoricalReport(${originalIndex})" class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-all group">
            <div>
                <div class="font-bold text-gray-700 dark:text-gray-200 group-hover:text-aws-orange transition-colors">${certName}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${date}</div>
            </div>
            <div class="flex flex-col items-end">
                <div class="${color} font-bold text-lg flex items-center gap-1">
                    ${awsScore} <i class="fa-solid ${icon}"></i>
                </div>
                <div class="text-[10px] text-blue-500 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:underline mt-1 transition-all">
                    <i class="fa-solid fa-eye"></i> Ver Relatório
                </div>
            </div>
        </li>
        `;
    });

    html += '</ul>';
    historyList.innerHTML = html;
    updateDynamicInsight(history);
}

function clearHistory() {
    if (confirm(t('clear_history_confirm', uiState.language))) {
        storageManager.clearHistory();
        updateHistoryDisplay();

        if (typeof renderGlobalRadarChart === 'function') {
            renderGlobalRadarChart();
        }

        updateDynamicInsight([]);
    }
}

function updateDynamicInsight(history) {
    const insightEl = document.getElementById('dynamic-insight');
    if (!insightEl) return;

    if (!Array.isArray(history)) history = [];

    if (history.length === 0) {
        insightEl.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                <div>
                    <div class="font-bold text-gray-800 dark:text-white mb-1">Comece sua jornada!</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">Faça seu primeiro simulado para receber insights personalizados baseados no seu desempenho.</div>
                </div>
            </div>
        `;
        return;
    }

    const insight = generateSmartInsight(history);

    insightEl.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="${insight.icon} ${insight.iconColor} text-xl mt-1"></i>
            <div>
                <div class="font-bold ${insight.titleColor} mb-1">${insight.title}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${insight.message}</div>
                ${insight.action ? `<div class="mt-2 text-xs font-semibold ${insight.actionColor}">${insight.action}</div>` : ''}
            </div>
        </div>
    `;
}

function generateSmartInsight(history) {
    if (!Array.isArray(history) || history.length === 0) {
        return {
            icon: 'fa-solid fa-rocket', iconColor: 'text-blue-500',
            title: 'Comece sua jornada! 🚀', titleColor: 'text-blue-600 dark:text-blue-400',
            message: 'Faça seu primeiro simulado para receber insights personalizados.',
            action: '💡 Dica: Comece pelo modo Revisão para se familiarizar',
            actionColor: 'text-blue-600 dark:text-blue-400'
        };
    }

    const last = history[0];
    const recentTests = history.slice(0, 3);

    let trend = 'stable';
    if (recentTests.length >= 2) {
        const scores = recentTests.map(t => t.percentage).reverse();
        const avgFirst = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
        const avgLast = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
        if (avgLast > avgFirst + 5) trend = 'improving';
        else if (avgLast < avgFirst - 5) trend = 'declining';
    }

    const avgScore = last.percentage;
    const isNearPassing = avgScore >= 65 && avgScore < 70;

    const today = new Date();
    const testsToday = history.filter(t => new Date(t.date).toDateString() === today.toDateString()).length;

    let passingStreak = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].percentage >= 70) passingStreak++;
        else break;
    }

    if (testsToday >= 4) {
        return { 
            icon: 'fa-solid fa-battery-quarter', 
            iconColor: 'text-red-500', 
            title: t('burnout_warning', uiState.language), 
            titleColor: 'text-red-600 dark:text-red-400', 
            message: t('tests_today', uiState.language, { count: testsToday }), 
            action: t('breaks_improve_retention', uiState.language), 
            actionColor: 'text-blue-600 dark:text-blue-400' 
        };
    }
    if (passingStreak >= 3 && avgScore >= 80) {
        return { 
            icon: 'fa-solid fa-trophy', 
            iconColor: 'text-yellow-500', 
            title: t('dominating', uiState.language), 
            titleColor: 'text-green-600 dark:text-green-400', 
            message: t('consecutive_passes', uiState.language, { count: passingStreak, avg: avgScore.toFixed(0) }), 
            action: t('schedule_exam', uiState.language), 
            actionColor: 'text-green-600 dark:text-green-400' 
        };
    }
    if (trend === 'improving' && avgScore >= 60) {
        return { 
            icon: 'fa-solid fa-chart-line', 
            iconColor: 'text-green-500', 
            title: t('consistent_evolution', uiState.language), 
            titleColor: 'text-green-600 dark:text-green-400', 
            message: t('score_improving', uiState.language, { avg: avgScore.toFixed(0) }), 
            action: t('keep_practicing', uiState.language), 
            actionColor: 'text-blue-600 dark:text-blue-400' 
        };
    }
    if (trend === 'declining') {
        return { 
            icon: 'fa-solid fa-chart-line-down', 
            iconColor: 'text-orange-500', 
            title: t('performance_decline', uiState.language), 
            titleColor: 'text-orange-600 dark:text-orange-400', 
            message: t('scores_declining', uiState.language), 
            action: t('suggestion_break', uiState.language), 
            actionColor: 'text-orange-600 dark:text-orange-400' 
        };
    }
    if (isNearPassing) {
        return { 
            icon: 'fa-solid fa-bullseye', 
            iconColor: 'text-blue-500', 
            title: t('almost_there', uiState.language), 
            titleColor: 'text-blue-600 dark:text-blue-400', 
            message: t('points_to_pass', uiState.language, { points: (70 - avgScore).toFixed(0) }), 
            action: t('few_more_quizzes', uiState.language), 
            actionColor: 'text-blue-600 dark:text-blue-400' 
        };
    }
    if (avgScore < 70) {
        return { 
            icon: 'fa-solid fa-book-open', 
            iconColor: 'text-orange-500', 
            title: t('study_focus_needed', uiState.language), 
            titleColor: 'text-orange-600 dark:text-orange-400', 
            message: t('current_score', uiState.language, { score: avgScore.toFixed(0) }), 
            action: t('study_aws_docs', uiState.language), 
            actionColor: 'text-orange-600 dark:text-orange-400' 
        };
    }
    const plural = history.length > 1 ? t('quiz_plural', uiState.language) : t('quiz_singular', uiState.language);
    return { 
        icon: 'fa-solid fa-rocket', 
        iconColor: 'text-blue-500', 
        title: t('keep_practicing_general', uiState.language), 
        titleColor: 'text-blue-600 dark:text-blue-400', 
        message: t('quizzes_completed', uiState.language, { count: history.length, plural: plural }), 
        action: t('practice_makes_perfect', uiState.language), 
        actionColor: 'text-blue-600 dark:text-blue-400' 
    };
}

function renderGamification() {
    if (!storageManager || typeof storageManager.getGamification !== 'function') return;
    const data = storageManager.getGamification();
    const streakEl = document.getElementById('streak-counter');
    if (streakEl && data && typeof data.currentStreak === 'number') {
        streakEl.textContent = data.currentStreak;
    }
}

function updateGamification(pct) {
    if (!storageManager || typeof pct !== 'number') return;
    storageManager.updateGamification(pct);
    renderGamification();
}

// UTILITÁRIOS GERAIS
function updateScoreDisplayUI() {
    const el = document.getElementById('score-display');
    const state = engine.state;
    if (el && state) el.textContent = `${state.score} / ${state.answers.length}`;
}

function updateTopicDropdown() {
    const topicSelect = document.getElementById('topic-filter');
    if (!topicSelect || !uiState.currentCertificationInfo) return;

    topicSelect.innerHTML = `<option value="">${t('all_topics', uiState.language)}</option>`;
    uiState.currentCertificationInfo.domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain.id;
        option.textContent = domain.name;
        topicSelect.appendChild(option);
    });
}

async function updateDifficultyFilters(certId) {
    if (!certId || typeof certId !== 'string') return;

    try {
        const fileSuffix = uiState.language === 'en' ? '-en' : '';
        const response = await fetch(`data/${certId}${fileSuffix}.json`);
        if (!response.ok) return;

        const questions = await response.json();
        if (!Array.isArray(questions)) return;

        const difficultyCounts = {
            all: questions.length,
            easy: questions.filter(q => q.difficulty === 'easy').length,
            medium: questions.filter(q => q.difficulty === 'medium').length,
            hard: questions.filter(q => q.difficulty === 'hard').length
        };

        const difficultyInputs = document.querySelectorAll('input[name="difficulty-level"]');
        difficultyInputs.forEach(input => {
            const value = input.value;
            const label = input.closest('label');
            const count = difficultyCounts[value];

            if (count === 0 && value !== 'all') {
                label.style.opacity = '0.4';
                label.style.cursor = 'not-allowed';
                input.disabled = true;
            } else {
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                input.disabled = false;
            }
        });

        const selectedInput = document.querySelector('input[name="difficulty-level"]:checked');
        if (selectedInput && selectedInput.disabled) {
            const allOption = document.querySelector('input[name="difficulty-level"][value="all"]');
            if (allOption) allOption.checked = true;
        }
    } catch (error) {
        console.error('Erro ao atualizar filtros de dificuldade:', error);
    }
}

function getDomainName(id) {
    return uiState.currentCertificationInfo?.domains.find(d => d.id === id)?.name || id;
}

function initTheme() {
    const theme = localStorage.getItem('aws_sim_theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('aws_sim_theme', isDark ? 'dark' : 'light');

    if (window.radarChartInstance && typeof renderRadarChart === 'function') {
        const results = engine.getFinalResults();
        if (results) renderRadarChart(results, uiState.currentCertificationInfo);
    }

    if (window.globalRadarChartInstance && typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }
}

function toggleLanguage() {
    uiState.language = uiState.language === 'pt' ? 'en' : 'pt';
    localStorage.setItem('aws_sim_lang', uiState.language);
    updateLanguageButtonUI();
    initializeUI(uiState.language); // Re-initialize UI with new language
    
    // Recarrega flashcard atual se estiver na tela de flashcards
    const flashcardsScreen = document.getElementById('screen-flashcards');
    if (flashcardsScreen && !flashcardsScreen.classList.contains('hidden')) {
        reloadCurrentFlashcard();
    }

    const certSelect = document.getElementById('certification-select');
    if (certSelect) {
        updateDifficultyFilters(certSelect.value);
        updateTopicDropdown(); // Update topic dropdown with new language
    }
}

function updateLanguageButtonUI() {
    const langBtn = document.getElementById('btn-language');
    if (langBtn) {
        langBtn.innerHTML = uiState.language === 'pt'
            ? '<span class="text-[10px] md:text-xs font-bold">🇧🇷 <span class="hidden sm:inline">PT-BR</span></span>'
            : '<span class="text-[10px] md:text-xs font-bold">🇺🇸 <span class="hidden sm:inline">EN-US</span></span>';
    }
}

function goHome() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    
    const sidebar = document.getElementById('side-info');
    const mainSection = document.getElementById('main-section');
    const scoreContainer = document.getElementById('score-container');

    if (sidebar) sidebar.classList.remove('hidden');
    if (mainSection) {
        mainSection.classList.add('lg:w-2/3');
        mainSection.classList.remove('w-full');
    }
    if (scoreContainer) scoreContainer.style.display = 'none';

    showScreen('start');
    loadLastScore();

    if (typeof renderGlobalRadarChart === 'function') renderGlobalRadarChart();

    let history = storageManager.getHistory();
    if (!Array.isArray(history)) { history = []; storageManager.clearHistory(); }
    updateDynamicInsight(history);
}

function startJornada() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    showScreen('jornada');
    renderTrail();
    renderGuildDashboard();
    renderBadges();
}

function retakeQuiz() {
    goHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelQuiz() {
    if (confirm(t('exit_quiz_confirm', uiState.language))) goHome();
}

function startMistakesQuiz() {
    alert(t('mistakes_feature_coming', uiState.language));
}

function clearMistakes() {
    if (confirm(t('clear_mistakes_confirm', uiState.language))) {
        alert(t('mistakes_cleared', uiState.language));
        const btnPractice = document.getElementById('btn-practice-mistakes');
        const btnClear = document.getElementById('btn-clear-mistakes');
        if (btnPractice) btnPractice.classList.add('hidden');
        if (btnClear) btnClear.classList.add('hidden');
    }
}

// GERAÇÃO DE PDF
function generatePerformanceReport() {
    const reportElement = document.getElementById('detailed-report');
    const screenResults = document.getElementById('screen-results');
    
    if (!reportElement || !screenResults) {
        alert(t('report_not_found', uiState.language));
        return;
    }

    const btn = document.querySelector('button[onclick="generatePerformanceReport()"]');
    const oldHtml = btn ? btn.innerHTML : `<i class="fa-solid fa-file-pdf mr-2"></i> ${t('pdf_report', uiState.language)}`;
    
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Formatando Prova...`;
        btn.disabled = true;
    }

    // CSS DE "MODO DOCUMENTO"
    if (!document.getElementById('pdf-print-styles')) {
        const style = document.createElement('style');
        style.id = 'pdf-print-styles';
        style.innerHTML = `
            /* Força formato de documento clássico */
            body.is-generating-pdf,
            body.is-generating-pdf #screen-results,
            body.is-generating-pdf #detailed-report {
                background-color: #ffffff !important;
                color: #000000 !important;
                font-family: 'Times New Roman', Times, serif !important; /* Fonte acadêmica */
            }

            /* Transforma os "Cards" do site em blocos de texto divididos por linha */
            body.is-generating-pdf #detailed-report > div {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                border-bottom: 1px solid #cccccc !important; 
                border-radius: 0 !important;
                padding: 15px 0 !important;
                margin-bottom: 15px !important;
                page-break-inside: avoid !important; /* Mágica: Impede a questão de quebrar na metade da página */
            }

            /* Estilo da Pergunta */
            body.is-generating-pdf #detailed-report h3 {
                font-family: Arial, Helvetica, sans-serif !important;
                font-size: 12pt !important;
                font-weight: bold !important;
                color: #000000 !important;
                margin-bottom: 10px !important;
            }

            /* Remove os fundos cinzas das alternativas */
            body.is-generating-pdf .bg-gray-50, 
            body.is-generating-pdf .dark\\:bg-slate-700,
            body.is-generating-pdf .dark\\:bg-slate-800 {
                background: transparent !important;
                border: none !important;
                padding: 4px 0 !important;
            }

            /* Cores precisas para o feedback (Acerto/Erro) */
            body.is-generating-pdf .text-green-600, 
            body.is-generating-pdf .text-green-400, 
            body.is-generating-pdf .fa-check {
                color: #166534 !important; /* Verde oficial impresso */
                font-weight: bold !important;
            }

            body.is-generating-pdf .text-red-600, 
            body.is-generating-pdf .text-red-400, 
            body.is-generating-pdf .fa-xmark {
                color: #991b1b !important; /* Vermelho oficial impresso */
                font-weight: bold !important;
            }

            /* Limpeza de UI: Tira botões, scrollbars e ícones inúteis no papel */
            body.is-generating-pdf .no-print,
            body.is-generating-pdf button,
            body.is-generating-pdf #screen-results {
                height: auto !important;
                overflow: visible !important;
            }
            body.is-generating-pdf button {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // INJEÇÃO DO CABEÇALHO DA PROVA
    const headerId = 'pdf-exam-header';
    let headerDiv = document.getElementById(headerId);
    
    if (!headerDiv) {
        headerDiv = document.createElement('div');
        headerDiv.id = headerId;
        
        // Tenta capturar a nota atual da tela (ajuste os IDs se necessário)
        const scoreElement = document.getElementById('score-display'); 
        const scoreText = scoreElement ? scoreElement.innerText : 'Concluído';
        const dataAtual = new Date().toLocaleDateString('pt-BR');

        headerDiv.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; font-family: Arial, sans-serif;">
                <h1 style="font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase;">Relatório de Simulado AWS</h1>
                <p style="font-size: 10pt; margin: 5px 0 0 0; color: #333;">
                    <strong>Data:</strong> ${dataAtual} &nbsp;|&nbsp; <strong>Desempenho:</strong> ${scoreText}
                </p>
            </div>
        `;
        // Coloca o cabeçalho no topo da div de relatório
        reportElement.insertBefore(headerDiv, reportElement.firstChild);
    }

    // APLICA A CLASSE GATILHO
    document.body.classList.add('is-generating-pdf');

    // CONFIGURAÇÃO DA FOLHA A4
    const opt = {
        margin:       [15, 15, 15, 15], // Margens padrão de Word
        filename:     `Prova_AWS_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true,
            scrollY: 0,
            backgroundColor: '#ffffff'
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // GERA O PDF E LIMPA A BAGUNÇA
    setTimeout(() => {
        html2pdf().set(opt).from(reportElement).save()
            .then(() => {
                document.body.classList.remove('is-generating-pdf');
                if (headerDiv) headerDiv.remove(); // Arranca o cabeçalho do site
                if (btn) {
                    btn.innerHTML = oldHtml;
                    btn.disabled = false;
                }
            })
            .catch((error) => {
                console.error('Erro ao gerar PDF:', error);
                alert(t('pdf_error', uiState.language));
                document.body.classList.remove('is-generating-pdf');
                if (headerDiv) headerDiv.remove(); // Limpa mesmo se der erro
                if (btn) {
                    btn.innerHTML = oldHtml;
                    btn.disabled = false;
                }
            });
    }, 200); 
}

// MODO FLASHCARDS

import {
    startFlashcards as startFlashcardsModule,
    flipFlashcard as flipFlashcardModule,
    nextFlashcard as nextFlashcardModule,
    prevFlashcard as prevFlashcardModule,
    filterFlashcardsByCert,
    reloadCurrentFlashcard
} from './flashcards.js';

function startFlashcards() { startFlashcardsModule(showScreen); }
function flipFlashcard() { flipFlashcardModule(); }
function nextFlashcard() { nextFlashcardModule(); }
function prevFlashcard() { prevFlashcardModule(); }

// PWA INSTALL BUTTON
let deferredPrompt = null;

function initPWAInstall() {
    const installButton = document.getElementById('install-app');
    if (!installButton) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.classList.remove('hidden');
    });

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installButton.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
        installButton.classList.add('hidden');
        deferredPrompt = null;
    });
}

// ATUALIZAÇÃO DA BARRA LATERAL (STATUS)
function updateSidebarProgress() {
    const gamification = JSON.parse(localStorage.getItem('aws_sim_gamification')) || { completedStages: [], unlockedStages: [] };
    const certSelect = document.getElementById('certification-select');
    
    // Tratamento absoluto contra undefined
    let currentCertId = certSelect && certSelect.value ? String(certSelect.value).toLowerCase().trim() : 'clf-c02';

    const certNames = {
        'clf-c02': 'Cloud Practitioner',
        'saa-c03': 'Solutions Architect',
        'aif-c01': 'AI Practitioner',
        'dva-c02': 'Developer Associate'
    };
    
    const labelEl = document.getElementById('sidebar-cert-label');
    if (labelEl) {
        // Se a busca falhar, escreve Cloud Practitioner, mantendo o visual limpo
        labelEl.textContent = certNames[currentCertId] || 'Cloud Practitioner';
    }

    const statusEl = document.getElementById('sidebar-cert-status');
    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';
    if (statusEl) {
        statusEl.textContent = currentLang === 'en' ? 'In Progress' : 'Em andamento';
    }

    const certPrefix = currentCertId.split('-')[0];
    const completedCount = (gamification.completedStages || []).filter(id => id.startsWith(certPrefix)).length;
    
    const totalModules = 5;
    const percentage = Math.min(Math.round((completedCount / totalModules) * 100), 100);

    const bar = document.getElementById('sidebar-pct-bar');
    const text = document.getElementById('sidebar-pct-text');
    
    if (bar) bar.style.width = `${percentage}%`;
    if (text) text.textContent = `${percentage}%`;

    const streakValue = document.getElementById('sidebar-streak-value');
    if (streakValue) {
        const days = gamification.currentStreak || 1;
        streakValue.textContent = currentLang === 'en' ? `${days} ${days === 1 ? 'day' : 'days'}` : `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
}

// EXPOSIÇÃO GLOBAL

window.startQuiz = startQuiz;
window.submitAnswer = submitAnswer;
window.nextQuestion = nextQuestion;
window.finishQuiz = finishQuiz;
window.cancelQuiz = cancelQuiz;
window.goHome = goHome;
window.retakeQuiz = retakeQuiz;
window.toggleDarkMode = toggleDarkMode;
window.toggleLanguage = toggleLanguage;
window.clearHistory = clearHistory;
window.showLastReport = showLastReport;
window.showHistoricalReport = showHistoricalReport;
window.generatePerformanceReport = generatePerformanceReport;
window.toggleFlag = toggleFlag;
window.startFlashcards = startFlashcards;
window.flipFlashcard = flipFlashcard;
window.nextFlashcard = nextFlashcard;
window.prevFlashcard = prevFlashcard;
window.filterFlashcardsByCert = filterFlashcardsByCert;
window.startMistakesQuiz = startMistakesQuiz;
window.clearMistakes = clearMistakes;
window.showScreen = showScreen;
window.startJornada = startJornada;
window.updateSidebarProgress = updateSidebarProgress;


// LÓGICA DE GAMIFICAÇÃO: MODO MISSÃO (TRILHA)

window.startTrailMission = async function(stageId, stageTitle) {
    const certSelect = document.getElementById('certification-select');
    if (!certSelect) return;

    uiState.currentMode = 'mission';
    uiState.lives = 3;
    
    uiState.qTimeRemaining = 90; 
    engine.passingScore = 80;    

    try {
        const certId = certSelect.value;
        const currentCertInfo = certificationPaths[certId];
        
        let actualDomainId = '';
        if (stageId.includes('-final')) {
            actualDomainId = ''; 
        } else {
            const parts = stageId.split('-');
            const stageIndex = parseInt(parts[parts.length - 1]) - 1;
            
            if (currentCertInfo && currentCertInfo.domains && currentCertInfo.domains[stageIndex]) {
                actualDomainId = currentCertInfo.domains[stageIndex].id;
            }
        }

        const filters = { quantity: 5, difficulty: 'all', topic: actualDomainId, mode: 'exam' };
        const result = await engine.loadQuestions(certId, currentCertInfo.domains, filters, uiState.language);

        if (!result.success || result.totalQuestions === 0) {
            alert(`Ops! Ainda não temos questões cadastradas para o módulo "${stageTitle}" (Domínio: ${actualDomainId}). \n\nContinue estudando os outros módulos!`);
            goHome(); 
            return; 
        }

        showScreen('quiz');
        
        const sidebar = document.getElementById('side-info');
        const mainSection = document.getElementById('main-section');
        if (sidebar) sidebar.classList.add('hidden');
        if (mainSection) mainSection.classList.replace('lg:w-2/3', 'w-full');
        
        const missionHud = document.getElementById('mission-hud');
        const timerContainer = document.getElementById('timer-container');
        if (missionHud) missionHud.classList.remove('hidden');
        if (timerContainer) timerContainer.classList.add('hidden');
        
        updateHeartsUI();
        loadQuestionUI(); 
        startQuestionTimer();

    } catch (err) {
        console.error("Erro na missão:", err);
        alert("Erro ao carregar a missão. Tente novamente.");
        goHome();
    }
};

function startQuestionTimer() {
    if (uiState.currentMode !== 'mission') return;
    
    clearInterval(uiState.qTimerInterval);
    
    const MISSION_TIME = 90; 
    uiState.qTimeRemaining = MISSION_TIME;
    
    const timeBar = document.getElementById('mission-time-bar');
    const timeText = document.getElementById('mission-time-text');
    
    // Reseta a cor da barra para o padrão (laranja) ao iniciar nova questão
    if (timeBar) {
        timeBar.classList.add('from-orange-400');
        timeBar.classList.remove('from-red-600');
    }
    
    uiState.qTimerInterval = setInterval(() => {
        uiState.qTimeRemaining--;
        
        const pct = (uiState.qTimeRemaining / MISSION_TIME) * 100;
        
        if (timeBar) {
            timeBar.style.width = `${pct}%`;
            // A barra fica vermelha de alerta só quando faltar 20% do tempo (18 segundos)
            if (pct < 20) {
                timeBar.classList.remove('from-orange-400');
                timeBar.classList.add('from-red-600');
            }
        }
        
        if (timeText) {
            if (uiState.qTimeRemaining >= 60) {
                const m = Math.floor(uiState.qTimeRemaining / 60);
                const s = uiState.qTimeRemaining % 60;
                timeText.textContent = `${m}m ${s.toString().padStart(2, '0')}s`;
            } else {
                timeText.textContent = `${uiState.qTimeRemaining}s`;
            }
        }

        if (uiState.qTimeRemaining <= 0) {
            clearInterval(uiState.qTimerInterval);
            handleMissionFailure("O tempo esgotou!"); 
        }
    }, 1000);
}

function updateHeartsUI() {
    const heartsContainer = document.getElementById('mission-hearts');
    if (!heartsContainer) return;
    
    heartsContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        if (i < uiState.lives) {
            heartsContainer.innerHTML += `<i class="fa-solid fa-heart text-red-500 text-lg shadow-sm transform hover:scale-110 transition-transform"></i>`;
        } else {
            heartsContainer.innerHTML += `<i class="fa-solid fa-heart-crack text-gray-300 dark:text-gray-600 text-lg"></i>`;
        }
    }
}

function handleMissionFailure(reason) {
    clearInterval(uiState.qTimerInterval);
    alert(`💥 Missão Falhou!\n${reason}\n\nRetorne à trilha e tente novamente.`);
    engine.passingScore = 70; // Restaura a nota padrão
    goHome();
}