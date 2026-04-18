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
    currentMissionStageId: null,
    lives: 3,
    qTimerInterval: null,
    qTimeRemaining: 45
};

let lastRenderedResult = null;
// INICIALIZAÇÃO

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeUI(uiState.language);

    // Garante que as atualizações dos cards rodam DEPOIS do initializeUI terminar
    setTimeout(() => {
        updateSidebarTexts();
        updateHistoryDisplay();
        updateSidebarProgress();
        renderSprintUI();
    }, 100);

    renderGamification();
    updateLanguageButtonUI();
    initPWAInstall();
    wireUIActions();

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
    if (uiState.qTimerInterval) clearInterval(uiState.qTimerInterval);
    saveQuizResult();
    updateHistoryDisplay();
    loadLastScore();

    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }

    const results = engine.getFinalResults();

    const btnNextMission = document.getElementById('btn-next-mission');
    if (btnNextMission) btnNextMission.classList.add('hidden');

    // ─── LÓGICA DE GAMIFICAÇÃO: CONCLUSÃO DE MISSÃO ───
    if (uiState.currentMode === 'mission') {
        if (results && results.percentage >= engine.passingScore) {
            // 🎉 APROVADO NA MISSÃO!
            const stageId = uiState.currentMissionStageId;
            const certId = document.getElementById('certification-select')?.value || 'clf-c02';
            
            if (stageId) {
                // 1. Puxa os dados do jogador
                let gamification = JSON.parse(localStorage.getItem('aws_sim_gamification')) || { completedStages: [], unlockedStages: [] };
                
                // 2. Marca o atual como concluído
                if (!gamification.completedStages.includes(stageId)) {
                    gamification.completedStages.push(stageId);
                }
                
                // 3. Força o desbloqueio do PRÓXIMO módulo somando +1 no ID
                const parts = stageId.split('-'); 
                const lastPart = parts[parts.length - 1]; // Pega o número (ex: "1")
                
                if (!isNaN(lastPart)) {
                    const nextNum = parseInt(lastPart) + 1;
                    parts[parts.length - 1] = nextNum;
                    const nextStageId = parts.join('-'); // Monta o "2"
                    
                    if (!gamification.unlockedStages.includes(nextStageId)) {
                        gamification.unlockedStages.push(nextStageId);
                    }
                }
                
                // Salva no navegador
                localStorage.setItem('aws_sim_gamification', JSON.stringify(gamification));
                
                // Chama o fallback do trailManager se existir
                if (typeof unlockNextModule === 'function') {
                    unlockNextModule(certId, stageId); 
                }
            }

            // Atualiza os componentes visuais
            updateSidebarProgress();
            if (typeof renderTrail === 'function') renderTrail();
            if (typeof renderBadges === 'function') renderBadges();
            
            // 4. Mostra o botão "Continuar Jornada" brilhando na tela
            if (btnNextMission) {
                btnNextMission.classList.remove('hidden');
                btnNextMission.onclick = () => {
                    startJornada();
                };
            }

            setTimeout(() => {
                alert(`🎉 Missão Concluída! Você alcançou ${results.percentage}%.\nNovo módulo e insígnias desbloqueados na sua Jornada!`);
            }, 500);

        } else {
            // 💥 REPROVADO NA MISSÃO
            setTimeout(() => {
                alert(`💥 Missão Falhou!\nVocê fez ${results ? results.percentage : 0}%, mas a meta para avançar é de ${engine.passingScore}%.\nRevise e tente novamente!`);
            }, 500);
        }

        // Restaura o simulador para evitar bugs em quizzes normais futuros
        engine.passingScore = 70;
        uiState.currentMode = 'exam';
        uiState.currentMissionStageId = null;
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

    lastRenderedResult = results;

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

    const lang = uiState.language || 'pt';
    const locale = lang === 'en' ? 'en-US' : 'pt-BR';
    const viewReportLabel = lang === 'en' ? 'View Report' : 'Ver Relatório';

    let html = '<ul class="space-y-3 w-full">';

    history.forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
                <div class="history-view-report text-[10px] text-blue-500 dark:text-blue-400 opacity-80 group-hover:opacity-100 group-hover:underline mt-1 transition-all">
                    <i class="fa-solid fa-eye"></i> ${viewReportLabel}
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

    const lang = uiState.language || 'pt';

    if (history.length === 0) {
        insightEl.dataset.empty = 'true';
        const journeyStart = lang === 'en' ? 'Start your journey!' : 'Comece sua jornada!';
        const journeyMsg   = lang === 'en'
            ? 'Complete your first quiz to receive personalized insights based on your performance.'
            : 'Faça seu primeiro simulado para receber insights personalizados baseados no seu desempenho.';
        insightEl.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                <div>
                    <div class="font-bold text-gray-800 dark:text-white mb-1">${journeyStart}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">${journeyMsg}</div>
                </div>
            </div>
        `;
        return;
    }

    insightEl.dataset.empty = 'false';
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
    const lang = uiState.language || 'pt';

    if (!Array.isArray(history) || history.length === 0) {
        return {
            icon: 'fa-solid fa-rocket', iconColor: 'text-blue-500',
            title: lang === 'en' ? 'Start your journey! 🚀' : 'Comece sua jornada! 🚀',
            titleColor: 'text-blue-600 dark:text-blue-400',
            message: lang === 'en' ? 'Complete your first quiz to receive personalized insights.' : 'Faça seu primeiro simulado para receber insights personalizados.',
            action: lang === 'en' ? '💡 Tip: Start with Review mode to get familiar' : '💡 Dica: Comece pelo modo Revisão para se familiarizar',
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
    // Troca o estado global e persiste
    uiState.language = uiState.language === 'pt' ? 'en' : 'pt';
    localStorage.setItem('aws_sim_lang', uiState.language);
    
    // Atualiza componentes visuais imediatos
    updateLanguageButtonUI();
    
    // O "Maestro" do i18n (Traduções estáticas)
    // Chamamos primeiro para que ele traduza o que for padrão
    initializeUI(uiState.language); 

    // Tratamento de telas específicas (Flashcards)
    const flashcardsScreen = document.getElementById('screen-flashcards');
    if (flashcardsScreen && !flashcardsScreen.classList.contains('hidden')) {
        reloadCurrentFlashcard();
    }

    const certSelect = document.getElementById('certification-select');
    if (certSelect) {
        updateDifficultyFilters(certSelect.value);
        updateTopicDropdown();
    }

    //Sincronização Dinâmica
    // Usamos o setTimeout para garantir que o DOM já foi processado pelo initializeUI
    setTimeout(() => {
        updateSidebarTexts(); 

        renderSprintUI();
        updateHistoryDisplay();
        updateSidebarProgress();
        
        if (typeof updateDynamicInsight === 'function') {
            updateDynamicInsight();
        }
        
        console.log(`[i18n] Interface atualizada para: ${uiState.language.toUpperCase()}`);
    }, 100);
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
    if (uiState.qTimerInterval) clearInterval(uiState.qTimerInterval);
    
    uiState.currentMode = 'exam';
    uiState.currentMissionStageId = null;
    if (typeof engine !== 'undefined') engine.passingScore = 70;

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
    updateSidebarTexts();
    renderSprintUI();
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

function generatePerformanceReport() {
 
    // ── PEGA OS DADOS: lastRenderedResult (o que está na tela) ou fallback para o engine ──
    const results = lastRenderedResult || engine.getFinalResults();
 
    if (!results || !results.answers || results.answers.length === 0) {
        alert('Nenhum resultado encontrado. Conclua um simulado ou abra um relatório do histórico primeiro.');
        return;
    }
 
    // Garante que temos as informações da certificação
    if (!uiState.currentCertificationInfo && results.certId && certificationPaths) {
        uiState.currentCertificationInfo = certificationPaths[results.certId];
    }
 
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        alert('Biblioteca jsPDF não carregada. Verifique se a tag <script> do jsPDF está no index.html.');
        return;
    }
 
    const btn = document.getElementById('btn-generate-report');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> GERANDO PDF...`;
        btn.disabled = true;
    }
 
    const { jsPDF: JsPDF } = window.jspdf || {};
    const Doc = JsPDF || jsPDF;
    const doc = new Doc({ unit: 'mm', format: 'a4', orientation: 'portrait' });
 
    // ── CONFIGURAÇÕES ──
    const pageW    = 210;
    const pageH    = 297;
    const marginL  = 15;
    const marginR  = 15;
    const contentW = pageW - marginL - marginR;
    let marginT = 15;
    let y = 15;
 
    const certLabel = uiState.currentCertificationInfo?.name
        || document.getElementById('sidebar-cert-label')?.innerText
        || results.certId?.toUpperCase()
        || 'AWS';
    const awsScore  = Math.floor(((results.percentage || 0) / 100) * 900) + 100;
    const dataHoje  = new Date().toLocaleDateString('pt-BR');
 
    function wrap(text, maxW, size) {
        doc.setFontSize(size);
        return doc.splitTextToSize(String(text ?? ''), maxW);
    }
 
    function newPageIfNeeded(needed = 10) {
        if (y + needed > pageH - 15) { doc.addPage(); y = 15; }
    }
 
    function fillRect(x, ry, w, h, r, g, b) {
        doc.setFillColor(r, g, b);
        doc.rect(x, ry, w, h, 'F');
    }
 
    function rgb(r, g, b) { doc.setTextColor(r, g, b); }
    function black()       { doc.setTextColor(17, 17, 17); }
 
    // ── 1. CABEÇALHO ──
    fillRect(0, 0, pageW, 30, 26, 26, 46);
    rgb(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATORIO OFICIAL DE SIMULACAO AWS', marginL, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
        `Certificacao: ${certLabel}   |   Pontuacao: ${awsScore} / 1000   |   Data: ${dataHoje}`,
        marginL, 22
    );
    y = 38;
 
    // ── 2. DOMÍNIOS ──
    black();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Desempenho por Dominio', marginL, y);
    y += 2;
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);
    y += 6;
 
    const hasDomainsData = results.domainScores
        && typeof results.domainScores === 'object'
        && Object.keys(results.domainScores).length > 0;
 
    const hasDomainDefs = uiState.currentCertificationInfo?.domains?.length > 0;
 
    if (hasDomainsData && hasDomainDefs) {
        uiState.currentCertificationInfo.domains.forEach(domain => {
            const sd = results.domainScores[domain.id];
            if (!sd || sd.total === 0) return;
 
            newPageIfNeeded(22);
 
            const pct  = (sd.correct / sd.total) * 100;
            const isOk = pct >= 70;
            const bgR  = isOk ? 240 : 254; const bgG = isOk ? 253 : 242; const bgB = isOk ? 244 : 242;
            const lcR  = isOk ?  22 : 220; const lcG = isOk ? 163 :  38; const lcB = isOk ?  74 :  38;
 
            fillRect(marginL, y, contentW, 20, bgR, bgG, bgB);
            doc.setFillColor(lcR, lcG, lcB);
            doc.rect(marginL, y, 2.5, 20, 'F');
 
            black();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            const dname = wrap(domain.name, contentW - 35, 10);
            doc.text(dname[0], marginL + 5, y + 7);
 
            rgb(lcR, lcG, lcB);
            doc.setFontSize(12);
            doc.text(`${pct.toFixed(0)}%`, pageW - marginR - 2, y + 8, { align: 'right' });
 
            // barra de progresso
            const bx = marginL + 5; const by = y + 12; const bw = contentW - 30;
            doc.setFillColor(220, 220, 220);
            doc.rect(bx, by, bw, 3, 'F');
            doc.setFillColor(lcR, lcG, lcB);
            doc.rect(bx, by, bw * Math.min(pct / 100, 1), 3, 'F');
 
            rgb(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(
                `${sd.correct} de ${sd.total} corretas   ${isOk ? '| APROVADO' : '| ATENCAO'}`,
                marginL + 5, y + 18
            );
            y += 24;
        });
    } else {
        // Fallback: mostra scores diretamente de domainScores sem precisar de currentCertificationInfo
        if (hasDomainsData) {
            Object.entries(results.domainScores).forEach(([domainId, sd]) => {
                if (!sd || sd.total === 0) return;
                newPageIfNeeded(22);
 
                const pct  = (sd.correct / sd.total) * 100;
                const isOk = pct >= 70;
                const lcR  = isOk ?  22 : 220; const lcG = isOk ? 163 :  38; const lcB = isOk ?  74 :  38;
 
                fillRect(marginL, y, contentW, 14, isOk ? 240 : 254, isOk ? 253 : 242, isOk ? 244 : 242);
                doc.setFillColor(lcR, lcG, lcB);
                doc.rect(marginL, y, 2.5, 14, 'F');
 
                black();
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(String(domainId), marginL + 5, y + 6);
 
                rgb(lcR, lcG, lcB);
                doc.setFontSize(10);
                doc.text(`${pct.toFixed(0)}%  (${sd.correct}/${sd.total})  ${isOk ? 'APROVADO' : 'ATENCAO'}`,
                    pageW - marginR - 2, y + 6, { align: 'right' });
                y += 17;
            });
        } else {
            rgb(150, 150, 150);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text('Dados de dominio nao disponiveis para este relatorio.', marginL, y);
            y += 8;
        }
    }
 
    y += 6;
 
    // ── 3. QUESTÕES ──
    newPageIfNeeded(20);
    black();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Detalhamento das Questoes', marginL, y);
    y += 2;
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);
    y += 7;
 
    if (!results.answers || results.answers.length === 0) {
        rgb(150, 150, 150);
        doc.setFontSize(9);
        doc.text('Nenhuma questao disponivel.', marginL, y);
        y += 10;
    } else {
        results.answers.forEach((ans, index) => {
            const isMulti   = Array.isArray(ans.correct);
            const isCorrect = ans.isCorrect;
 
            let userText = 'Nao respondida';
            if (ans.userSelection !== null && ans.userSelection !== undefined) {
                userText = isMulti && Array.isArray(ans.userSelection)
                    ? ans.userSelection.map(i => ans.options?.[i] ?? '?').join(' / ')
                    : (ans.options?.[ans.userSelection] ?? 'Opcao invalida');
            }
 
            let correctText = 'Gabarito indisponivel';
            if (ans.correct !== null && ans.correct !== undefined) {
                correctText = isMulti && Array.isArray(ans.correct)
                    ? ans.correct.map(i => ans.options?.[i] ?? '?').join(' / ')
                    : (ans.options?.[ans.correct] ?? 'Opcao invalida');
            }
 
            const explanText = ans.explanation || 'Sem explicacao adicional.';
 
            // pré-calcula linhas para saber a altura do bloco inteiro
            const LH = 4.5;
            doc.setFontSize(10);
            const qLines  = wrap(`${index + 1}. ${ans.question || 'Questao'}`, contentW - 4, 10);
            doc.setFontSize(9);
            const uLines  = wrap(userText, contentW - 14, 9);
            const cLines  = isCorrect ? [] : wrap(correctText, contentW - 14, 9);
            const eLines  = wrap(explanText, contentW - 14, 9);
 
            const blockH  =
                qLines.length  * LH + 8 +
                uLines.length  * LH + 14 +
                (isCorrect ? 0 : cLines.length * LH + 14) +
                eLines.length  * LH + 14;
 
            newPageIfNeeded(blockH);
 
            // Enunciado
            fillRect(marginL, y, contentW, qLines.length * LH + 6, 248, 249, 250);
            black();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(qLines, marginL + 3, y + 5);
            y += qLines.length * LH + 9;
 
            // Resposta do usuário
            const uR = isCorrect ?  22 : 220; const uG = isCorrect ? 163 :  38; const uB = isCorrect ?  74 :  38;
            fillRect(marginL, y, contentW, uLines.length * LH + 11, isCorrect ? 240 : 254, isCorrect ? 253 : 242, isCorrect ? 244 : 242);
            doc.setFillColor(uR, uG, uB);
            doc.rect(marginL, y, 2.5, uLines.length * LH + 11, 'F');
 
            rgb(100, 100, 100);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(`SUA RESPOSTA [${isCorrect ? 'CORRETA' : 'INCORRETA'}]`, marginL + 5, y + 5);
 
            rgb(uR, uG, uB);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(uLines, marginL + 5, y + 9);
            y += uLines.length * LH + 14;
 
            // Resposta correta (só se errou)
            if (!isCorrect) {
                fillRect(marginL, y, contentW, cLines.length * LH + 11, 240, 253, 244);
                doc.setFillColor(22, 163, 74);
                doc.rect(marginL, y, 2.5, cLines.length * LH + 11, 'F');
 
                rgb(22, 101, 52);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.text('RESPOSTA OFICIAL', marginL + 5, y + 5);
 
                rgb(21, 128, 61);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(cLines, marginL + 5, y + 9);
                y += cLines.length * LH + 14;
            }
 
            // Explicação
            newPageIfNeeded(eLines.length * LH + 14);
            fillRect(marginL, y, contentW, eLines.length * LH + 11, 239, 246, 255);
            doc.setFillColor(59, 130, 246);
            doc.rect(marginL, y, 2.5, eLines.length * LH + 11, 'F');
 
            rgb(30, 64, 175);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text('EXPLICACAO', marginL + 5, y + 5);
 
            rgb(30, 58, 138);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(eLines, marginL + 5, y + 9);
            y += eLines.length * LH + 15;
 
            // separador
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.2);
            doc.line(marginL, y - 4, pageW - marginR, y - 4);
        });
    }
 
    // ── 4. RODAPÉ EM TODAS AS PÁGINAS ──
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        rgb(170, 170, 170);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(
            `Simulador AWS  |  ${dataHoje}  |  Pagina ${p} de ${total}`,
            pageW / 2, pageH - 7, { align: 'center' }
        );
    }
 
    // ── 5. SALVA ──
    const safeName = certLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    doc.save(`Relatorio_AWS_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
 
    if (btn) { btn.innerHTML = oldHtml; btn.disabled = false; }
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

// TEXTOS ESTÁTICOS DOS CARDS DA SIDEBAR (i18n)
function updateSidebarTexts() {
    const lang = uiState.language || 'pt';

    const texts = {
        pt: {
            myProgress:        'O Meu Progresso',
            progressTotal:     'Progresso Total',
            streakLabel:       'Ofensiva:',
            insightTitle:      'Insight de Estudo',
            historyTitle:      'Histórico',
            certStatsTitle:    'Estatísticas da Certificação',
            certStatsEmpty:    'Faça seu primeiro simulado para ver suas estatísticas aqui!',
            statsQuizzes:      'Simulados',
            statsAvg:          'Média',
            statsQuestions:    'Questões',
            journeyStart:      'Comece sua jornada!',
            journeyMsg:        'Faça seu primeiro simulado para receber insights personalizados.'
        },
        en: {
            myProgress:        'My Progress',
            progressTotal:     'Total Progress',
            streakLabel:       'Streak:',
            insightTitle:      'Study Insight',
            historyTitle:      'History',
            certStatsTitle:    'Certification Statistics',
            certStatsEmpty:    'Complete your first quiz to see your statistics here!',
            statsQuizzes:      'Quizzes',
            statsAvg:          'Average',
            statsQuestions:    'Questions',
            journeyStart:      'Start your journey!',
            journeyMsg:        'Complete your first quiz to receive personalized insights.'
        }
    };

    const T = texts[lang];

    const set = (id, val) => { 
        const el = document.getElementById(id); 
        if (el) el.textContent = val; 
    };

    // 1. Card Progresso
    set('sidebar-my-progress-title',    T.myProgress);
    set('sidebar-progress-total-label', T.progressTotal);
    set('sidebar-streak-label',         T.streakLabel);

    // 2. Card Insight
    set('insight-card-title',           T.insightTitle); 

    // 3. Card Histórico
    set('history-card-title',           T.historyTitle);

    // 4. Card Estatísticas Globais
    set('cert-stats-title',             T.certStatsTitle);
    set('cert-stats-empty-msg',         T.certStatsEmpty);
    set('stats-label-quizzes',          T.statsQuizzes);
    set('stats-label-avg',              T.statsAvg);
    set('stats-label-questions',        T.statsQuestions);

    // Nota: O módulo Sprint é traduzido automaticamente pela renderSprintUI()!
    // Nota: O botão "Ver Relatório" é traduzido automaticamente pela updateHistoryDisplay()!

    // Atualiza o insight padrão preservando o ícone
    const insightEl = document.getElementById('dynamic-insight');
    if (insightEl && insightEl.dataset.empty === 'true') {
        insightEl.innerHTML = `
            <div class="flex items-start gap-3">
                <i class="fa-solid fa-lightbulb text-yellow-500 text-xl mt-1"></i>
                <div>
                    <div class="font-bold text-gray-800 dark:text-white mb-1">${T.journeyStart}</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400">${T.journeyMsg}</div>
                </div>
            </div>
        `;
    }
}

window.updateSidebarTexts = updateSidebarTexts;
function updateSidebarProgress() {
    const gamification = JSON.parse(localStorage.getItem('aws_sim_gamification')) || { completedStages: [], unlockedStages: [] };
    const certSelect = document.getElementById('certification-select');
    const currentLang = uiState.language || localStorage.getItem('aws_sim_lang') || 'pt';
    
    // Tratamento absoluto contra undefined
    let currentCertId = certSelect && certSelect.value ? String(certSelect.value).toLowerCase().trim() : 'clf-c02';

    const certNames = {
        pt: {
            'clf-c02': 'Cloud Practitioner',
            'saa-c03': 'Solutions Architect',
            'aif-c01': 'AI Practitioner',
            'dva-c02': 'Developer Associate'
        },
        en: {
            'clf-c02': 'Cloud Practitioner',
            'saa-c03': 'Solutions Architect',
            'aif-c01': 'AI Practitioner',
            'dva-c02': 'Developer Associate'
        }
    };
    
    const labelEl = document.getElementById('sidebar-cert-label');
    if (labelEl) {
        labelEl.textContent = (certNames[currentLang] || certNames['pt'])[currentCertId] || 'Cloud Practitioner';
    }

    const statusEl = document.getElementById('sidebar-cert-status');
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
    uiState.currentMissionStageId = stageId; 
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
    uiState.currentMode = 'exam';
    uiState.currentMissionStageId = null;
    goHome();
}

// MÓDULO: SPRINT 14 DIAS
// O mapa do tesouro: O que cai em cada dia do Sprint da certificação atual
const sprintMap = {
    1:  { domainIndex: 0,     pt: "Conceitos Cloud - Parte 1",   en: "Cloud Concepts - Part 1" },
    2:  { domainIndex: 0,     pt: "Conceitos Cloud - Parte 2",   en: "Cloud Concepts - Part 2" },
    3:  { domainIndex: 0,     pt: "Conceitos Cloud - Revisão",   en: "Cloud Concepts - Review" },
    4:  { domainIndex: 1,     pt: "Segurança - Parte 1",         en: "Security - Part 1" },
    5:  { domainIndex: 1,     pt: "Segurança - Parte 2",         en: "Security - Part 2" },
    6:  { domainIndex: 1,     pt: "Segurança - Revisão",         en: "Security - Review" },
    7:  { domainIndex: 2,     pt: "Tecnologia - Serviços Core",  en: "Technology - Core Services" },
    8:  { domainIndex: 2,     pt: "Tecnologia - Redes e BD",     en: "Technology - Networks & DB" },
    9:  { domainIndex: 2,     pt: "Tecnologia - Arquitetura",    en: "Technology - Architecture" },
    10: { domainIndex: 3,     pt: "Faturamento - Parte 1",       en: "Billing - Part 1" },
    11: { domainIndex: 3,     pt: "Faturamento - Parte 2",       en: "Billing - Part 2" },
    12: { domainIndex: 'all', pt: "Simulado Misto - Fácil",      en: "Mixed Quiz - Easy" },
    13: { domainIndex: 'all', pt: "Simulado Misto - Difícil",    en: "Mixed Quiz - Hard" },
    14: { domainIndex: 'final', pt: "O Desafio Final (Boss)",    en: "The Final Challenge (Boss)" }
};


function renderSprintUI() {
    const grid = document.getElementById('sprint-days-grid');
    if (!grid) return;

    const lang = uiState.language || 'pt';
    
    const labels = {
        pt: { 
            day: "Dia", 
            meta: "10 Questões • Meta: 80%",
            title: "Sprint de Estudos (14 Dias)",
            subtitle: "Sua meta diária de 15 minutos para dominar a nuvem.",
            progress: "Progresso",
            startBtn: "Iniciar Sprint (15m)"
        },
        en: { 
            day: "Day", 
            meta: "10 Questions • Goal: 80%",
            title: "Study Sprint (14 Days)",
            subtitle: "Your daily 15-minute goal to master the cloud.",
            progress: "Progress",
            startBtn: "Start Sprint (15m)"
        }
    };

    // Atualiza título e subtítulo do card de Sprint
    const sprintTitleEl = document.getElementById('sprint-module-title');
    const sprintSubtitleEl = document.getElementById('sprint-module-subtitle');
    const sprintProgressLabel = document.getElementById('sprint-progress-label');
    const sprintStartBtn = document.getElementById('sprint-start-btn');
    if (sprintTitleEl) sprintTitleEl.textContent = labels[lang].title;
    if (sprintSubtitleEl) sprintSubtitleEl.textContent = labels[lang].subtitle;
    if (sprintProgressLabel) sprintProgressLabel.textContent = labels[lang].progress;
    if (sprintStartBtn) sprintStartBtn.textContent = labels[lang].startBtn;

    let currentSprintDay = parseInt(localStorage.getItem('aws_sprint_day')) || 1;
    if (currentSprintDay > 14) currentSprintDay = 14;

    // Atualiza a % de progresso
    const progressText = document.getElementById('sprint-progress-text');
    if (progressText) {
        const pct = Math.round(((currentSprintDay - 1) / 14) * 100);
        progressText.textContent = `${pct}%`;
    }

    // Atualiza o texto do botão do dia (Bilíngue)
    const dayLabel = document.getElementById('sprint-current-day-label');
    const metaLabel = dayLabel?.nextElementSibling;
    
    if (dayLabel && sprintMap[currentSprintDay]) {
        const dayTitle = sprintMap[currentSprintDay][lang] || sprintMap[currentSprintDay].pt;
        dayLabel.textContent = `${labels[lang].day} ${currentSprintDay}: ${dayTitle}`;
        if (metaLabel) metaLabel.textContent = labels[lang].meta;
    }

    grid.innerHTML = '';

    for (let i = 1; i <= 14; i++) {
        const dayDiv = document.createElement('div');
        
        if (i < currentSprintDay) {
            dayDiv.className = 'w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold border bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400';
            dayDiv.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (i === currentSprintDay) {
            dayDiv.className = 'sprint-day-current w-full aspect-square rounded-lg flex items-center justify-center text-sm border-2 bg-aws-orange border-orange-600 text-white z-10';
            dayDiv.textContent = i;
        } else {
            dayDiv.className = 'w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold border bg-gray-50 border-gray-100 text-gray-400 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-500';
            dayDiv.innerHTML = '<i class="fa-solid fa-lock text-[10px]"></i>';
        }

        const tooltipTitle = sprintMap[i] ? (sprintMap[i][lang] || sprintMap[i].pt) : `${labels[lang].day} ${i}`;
        dayDiv.title = tooltipTitle;
        
        grid.appendChild(dayDiv);
    }
}

window.startMicroSprint = function() {
    let currentSprintDay = parseInt(localStorage.getItem('aws_sprint_day')) || 1;
    const lang = uiState.language || 'pt';
    
    if (currentSprintDay > 14) {
        const msg = lang === 'en'
            ? "Congratulations! You have completed all 14 Sprint days."
            : "Parabéns! Você já dominou os 14 dias de Sprint.";
        alert(msg);
        return;
    }

    const pillData = (typeof getPill === 'function')
        ? getPill(currentSprintDay, lang)
        : (sprintPills ? sprintPills[currentSprintDay] : null);
    
    if (!pillData) {
        const msg = lang === 'en'
            ? "Today's knowledge pill is being prepared by AI. Come back tomorrow!"
            : "A pílula de conhecimento de hoje está sendo preparada pela IA. Volte amanhã!";
        alert(msg);
        return;
    }

    const ui = {
        pt: {
            readTime: "Tempo de leitura",
            summary: "Resumo do Dia",
            complete: "Marcar Pílula como Concluída",
            day: "Dia"
        },
        en: {
            readTime: "Read time",
            summary: "Daily Summary",
            complete: "Mark Pill as Completed",
            day: "Day"
        }
    }[lang];

    const readerOverlay = document.createElement('div');
    readerOverlay.id = 'sprint-reader-overlay';
    readerOverlay.className = 'fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex justify-center items-center overflow-y-auto p-4 md:p-8 animate-fade-in';
    
    readerOverlay.innerHTML = `
        <div class="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative my-auto">
            
            <div class="h-2 w-full bg-gray-100 dark:bg-slate-700">
                <div class="h-full bg-aws-orange transition-all duration-1000" style="width: ${((currentSprintDay)/14)*100}%"></div>
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

                <div class="prose dark:prose-invert max-w-none">
                    ${pillData.content}
                </div>

                <div class="mt-12 bg-gray-50 dark:bg-slate-700/50 p-6 rounded-xl border border-gray-100 dark:border-slate-600 text-center">
                    <p class="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 font-bold">${ui.summary}</p>
                    <p class="text-lg font-medium text-gray-800 dark:text-gray-200 italic">"${pillData.keyTakeaway}"</p>
                    
                    <button onclick="completeSprintDay(${currentSprintDay})" class="mt-6 w-full md:w-auto bg-aws-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg transform hover:-translate-y-1">
                        <i class="fa-solid fa-check-double mr-2"></i> ${ui.complete}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(readerOverlay);
    document.body.style.overflow = 'hidden';
};

// Função para fechar sem salvar (se o usuário desistir)
window.closeSprintReader = function() {
    const overlay = document.getElementById('sprint-reader-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = ''; // Devolve o scroll
};

window.completeSprintDay = function(completedDay) {
    localStorage.setItem('aws_sprint_day', completedDay + 1);
    
    closeSprintReader();
    
    if (typeof renderSprintUI === 'function') {
        renderSprintUI();
    }

    const lang = uiState.language || 'pt';
    const msg = lang === 'en'
        ? `🚀 Day ${completedDay} pill absorbed! The next knowledge awaits you tomorrow.`
        : `🚀 Pílula do Dia ${completedDay} absorvida com sucesso! O próximo conhecimento te espera amanhã.`;
    alert(msg);
};

