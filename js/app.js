/**
 * APP.JS - Orquestrador de Interface (UI Controller)
 * Integração completa com Módulos ES6 e QuizEngine
 */

import { QuizEngine } from './quizEngine.js';
import { certificationPaths, glossaryTerms } from './data.js';
import { storageManager } from './storageManager.js';

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
    tempSelectedAnswer: null, // Será null (escolha única) ou [] (múltipla)
    language: localStorage.getItem('aws_sim_lang') || 'pt',
    flashcardIndex: 0,
    flashcardFlipped: false
};

// ============================================================================
// 1. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateHistoryDisplay();
    renderGamification();
    updateLanguageButtonUI();
    initPWAInstall();
    renderGlobalRadarChart(); // Renderiza gráfico global na inicialização

    const certSelect = document.getElementById('certification-select');
    
    // Inicializa com a certificação selecionada por padrão
    if (certSelect && certificationPaths[certSelect.value]) {
        uiState.currentCertificationInfo = certificationPaths[certSelect.value];
        updateTopicDropdown();
        loadLastScore();
    }

    // Atualiza quando o usuário troca de certificação no dropdown
    certSelect?.addEventListener('change', () => {
        if (certificationPaths[certSelect.value]) {
            uiState.currentCertificationInfo = certificationPaths[certSelect.value];
            updateTopicDropdown(); 
            loadLastScore();
            updateDifficultyFilters(certSelect.value);
        }
    });
    
    // Inicializa filtros de dificuldade
    if (certSelect) {
        updateDifficultyFilters(certSelect.value);
    }
});

// ============================================================================
// 2. MOTOR DO QUIZ E TIMER
// ============================================================================
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
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A carregar...';

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
            alert(`❌ Erro ao carregar o banco de questões: ${result.message}\n\nVerifique se o ficheiro de dados existe e tente novamente.`);
            return;
        }

        // Configura o timer baseado no exame real da AWS (em segundos)
        let tempoPorQuestao = 90; // Padrão
        if (certId === 'saa-c03' || certId === 'dva-c02') {
            tempoPorQuestao = 120; // 130 mins para 65 questões (2 minutos/questão)
        } else if (certId === 'clf-c02') {
            tempoPorQuestao = 83;  // 90 mins para 65 questões (~83 seg/questão)
        } else if (certId === 'aif-c01') {
            tempoPorQuestao = 110; // ~120 mins para 65 questões
        }

        uiState.timeRemaining = result.totalQuestions * tempoPorQuestao; 
        
        // Limpa relatórios antigos
        const oldReport = document.getElementById('detailed-report');
        if (oldReport) oldReport.remove();

        showScreen('quiz');
        const timerContainer = document.getElementById('timer-container');
        if (filters.mode === 'exam') {
            if (timerContainer) timerContainer.classList.remove('hidden');
            startTimer();
        } else {
            if (timerContainer) timerContainer.classList.add('hidden');
        }
        
        loadQuestionUI();

    } catch (err) {
        alert(`❌ Erro ao carregar o banco de questões\n\nNão foi possível iniciar o simulado. Verifique se os ficheiros de dados estão disponíveis.\n\nDetalhes técnicos: ${err.message}`);
        console.error('Erro ao iniciar quiz:', err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Iniciar Simulação <i class="fa-solid fa-arrow-right ml-2"></i>';
    }
}

function startTimer() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    
    updateTimerDisplay(); // Atualiza logo no início

    uiState.timerInterval = setInterval(() => {
        if (uiState.isPaused) return;
        
        uiState.timeRemaining--;
        updateTimerDisplay();

        if (uiState.timeRemaining <= 0) {
            clearInterval(uiState.timerInterval);
            alert("⏰ O tempo esgotou! O seu simulado será finalizado automaticamente e as questões em branco serão dadas como erradas.");
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

// ============================================================================
// 3. UI DE QUESTÕES E MÚLTIPLAS ESCOLHAS
// ============================================================================
function loadQuestionUI() {
    const q = engine.getCurrentQuestion();
    const progress = engine.getProgress();
    const isMulti = Array.isArray(q.correct);
    
    document.getElementById('question-category').textContent = getDomainName(q.domain);
    
    // Adiciona o aviso "(Escolha X)" caso seja múltipla
    const questionText = isMulti ? `${q.question} <br><span class="text-sm text-aws-orange italic mt-2 block">(Escolha ${q.correct.length} opções)</span>` : q.question;
    document.getElementById('question-text').innerHTML = questionText;
    
    document.getElementById('current-q-num').textContent = progress.current;
    document.getElementById('total-q-num').textContent = progress.total;
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${progress.percentage}%`;

    // Define o estado inicial da resposta dependendo do tipo da pergunta
    uiState.tempSelectedAnswer = isMulti ? [] : null;

    renderOptionsUI(q);
    
    // Reset de botões e caixas
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('explanation-box').classList.add('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('btn-finish').classList.add('hidden');
    document.getElementById('btn-submit').classList.remove('hidden');
    
    // Reset da Flag
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
                // LÓGICA DE ESCOLHA ÚNICA
                document.querySelectorAll('.option-card').forEach(c => {
                    c.classList.remove('selected', 'border-orange-500', 'bg-orange-50');
                    c.querySelector('.option-letter').classList.remove('bg-orange-500', 'text-white');
                });

                card.classList.add('selected', 'border-orange-500', 'bg-orange-50');
                card.querySelector('.option-letter').classList.add('bg-orange-500', 'text-white');

                uiState.tempSelectedAnswer = idx;
                document.getElementById('btn-submit').disabled = false;
            } else {
                // LÓGICA DE ESCOLHA MÚLTIPLA
                const isSelected = card.classList.contains('selected');
                
                if (isSelected) {
                    card.classList.remove('selected', 'border-orange-500', 'bg-orange-50');
                    card.querySelector('.option-letter').classList.remove('bg-orange-500', 'text-white');
                    uiState.tempSelectedAnswer = uiState.tempSelectedAnswer.filter(i => i !== idx);
                } else {
                    // Limita seleções
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

    document.getElementById('btn-submit').classList.add('hidden');
    // Opaca as opções para foco na resposta
    document.querySelectorAll('.option-card').forEach(card => card.classList.add('opacity-70'));

    // --- NOVA LÓGICA DE FEEDBACK VISUAL (VERDE/VERMELHO) ---
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
                if (isTrulyCorrect) {
                    applyStyleToOptionCard(optionIdx, 'correct');
                } else {
                    applyStyleToOptionCard(optionIdx, 'incorrect');
                }
            } else if (isTrulyCorrect) {
                applyStyleToOptionCard(optionIdx, 'correct');
            }
        });
    }

    // Explicações e Referências
    const expBox = document.getElementById('explanation-box');
    const docLink = result.referenceUrl ? 
        `<a href="${result.referenceUrl}" target="_blank" class="mt-3 inline-block text-orange-600 font-bold hover:underline">
            <i class="fa-solid fa-book-open mr-1"></i> Ver Documentação Oficial
         </a>` : '';

    expBox.querySelector('h4').innerHTML = result.isCorrect ? 
        '<i class="fa-solid fa-check"></i> Correto!' : '<i class="fa-solid fa-xmark"></i> Incorreto';
    expBox.querySelector('h4').className = result.isCorrect ? "font-bold text-green-600 mb-3" : "font-bold text-red-600 mb-3";
    
    let feedbackHTML = "";
    if (!result.isCorrect) {
        let userText = isMulti ? uiState.tempSelectedAnswer.map(i => question.options[i]).join("<br>• ") : question.options[uiState.tempSelectedAnswer];
        feedbackHTML += `<div class="mb-2"><strong class="text-gray-800 dark:text-gray-200">Sua resposta:</strong> <span class="text-red-600 dark:text-red-400"><br>• ${userText}</span></div>`;
    }
    let correctText = isMulti ? question.correct.map(i => question.options[i]).join("<br>• ") : question.options[result.correctIndex];
    feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">Resposta correta:</strong> <span class="text-green-600 dark:text-green-400"><br>• ${correctText}</span></div>`;
    feedbackHTML += `<div class="pt-3 mt-2 border-t border-blue-200 dark:border-slate-600"><strong class="text-gray-800 dark:text-gray-200">Por que?</strong><br>${result.explanation}</div>`;

    document.getElementById('explanation-text').innerHTML = `${feedbackHTML} ${docLink}`;
    expBox.classList.remove('hidden');

    if (!result.isFinished) {
        document.getElementById('btn-next').classList.remove('hidden');
    } else {
        document.getElementById('btn-finish').classList.remove('hidden');
    }

    updateScoreDisplayUI();
}

// Função Auxiliar de Estilos de Acerto/Erro
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
}

function finishQuiz() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    saveQuizResult();
    updateHistoryDisplay();
    loadLastScore();
    renderGlobalRadarChart(); // Atualiza gráfico global após completar quiz
    showResultsScreen();
}

function toggleFlag() {
    const flagBtn = document.getElementById('btn-flag');
    if(flagBtn) flagBtn.classList.toggle('text-orange-500');
}

// ============================================================================
// 4. TELAS E RELATÓRIOS
// ============================================================================
function showScreen(screenName) {
    const screens = ['start', 'quiz', 'results', 'flashcards'];
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

function showResultsScreen() {
    const results = engine.getFinalResults();
    displayReportFromResult(results);
    renderRadarChart(results);
}

function displayReportFromResult(results) {
    if (certificationPaths) {
        uiState.currentCertificationInfo = certificationPaths[results.certId];
    }

    // Converte a pontuação para a escala oficial AWS (100-1000)
    const awsScore = Math.floor((results.percentage / 100) * 900) + 100;
    
    document.getElementById('final-score-percent').textContent = awsScore; // Escala 100-1000
    document.getElementById('final-correct').textContent = results.score;
    document.getElementById('final-incorrect').textContent = results.total - results.score;

    // Adiciona selo de aprovação/revisão
    const scoreDisplay = document.getElementById('final-score-percent');
    const parentDiv = scoreDisplay.parentElement;
    
    // Remove selo anterior se existir
    const oldBadge = parentDiv.querySelector('.approval-badge');
    if (oldBadge) oldBadge.remove();
    
    // Adiciona novo selo
    const badge = document.createElement('div');
    badge.className = 'approval-badge mt-3 px-4 py-2 rounded-lg font-bold text-sm';
    
    if (awsScore >= 700) {
        badge.classList.add('bg-green-100', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-400', 'border-2', 'border-green-500');
        badge.innerHTML = '<i class="fa-solid fa-check-circle mr-2"></i>APROVADO';
    } else {
        badge.classList.add('bg-orange-100', 'dark:bg-orange-900/30', 'text-orange-700', 'dark:text-orange-400', 'border-2', 'border-orange-500');
        badge.innerHTML = '<i class="fa-solid fa-exclamation-triangle mr-2"></i>PRECISA DE REVISÃO';
    }
    
    parentDiv.appendChild(badge);

    const recText = document.getElementById('recommendation-text');

    if (recText) {
        const weakDomains = results.weakDomains || [];

        if (results.percentage < 40) {
            recText.innerHTML = `<strong>Atenção! O seu desempenho global foi muito baixo.</strong> Recomendamos que pare de fazer simulados agora e volte a rever os conceitos base do curso oficial antes de tentar novamente.`;
        } else if (weakDomains.length === 0) {
            recText.innerHTML = `<strong>Excelente! Você demonstrou consistência.</strong> Continue assim e estará preparado para o exame real.`;
        } else if (weakDomains.length === 1) {
            const domainName = getDomainName(weakDomains[0]) || "Tópicos Gerais";
            recText.innerHTML = `<strong>Quase lá!</strong> A sua maior oportunidade de melhoria está no domínio: <em>${domainName}</em>. Revise a documentação oficial sobre este tema.`;
        } else {
            const domainNames = weakDomains.map(id => getDomainName(id)).join(', ');
            recText.innerHTML = `<strong>Atenção! Precisa reforçar os estudos nestas áreas críticas:</strong> <em>${domainNames}</em>. Revise a documentação oficial sobre estes temas.`;
        }
    }

    renderDetailedReportUI(results);
    showScreen('results');
}

function renderDetailedReportUI(results) {
    const resultsScreen = document.getElementById('screen-results');
    const buttonsContainer = resultsScreen.querySelector('.flex.gap-3.flex-wrap'); 
    if(buttonsContainer) buttonsContainer.classList.add('no-print');

    let reportDiv = document.getElementById('detailed-report');
    if (!reportDiv) {
        reportDiv = document.createElement('div');
        reportDiv.id = 'detailed-report';
        reportDiv.className = 'mt-8 mb-8 w-full max-w-3xl mx-auto text-left bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 print-report-container';
        resultsScreen.insertBefore(reportDiv, buttonsContainer);
    }

    const recText = document.getElementById('recommendation-text')?.innerHTML || '';

    // 1. HEADER
    let html = `
        <div class="hidden print:block mb-8 border-b-2 border-black pb-6">
            <h2 class="text-3xl font-bold mb-4 print-text-black">Relatório Oficial - Simulado AWS</h2>
            <p class="text-xl mb-4 print-text-black"><strong>Pontuação Final:</strong> ${results.percentage.toFixed(0)}% (${results.score} acertos de ${results.total})</p>
            <div class="border border-black p-4 mt-4">
                <strong class="text-lg block mb-2 print-text-black">Sugestão de Estudo (IA):</strong>
                <span class="text-base print-text-black">${recText}</span>
            </div>
        </div>
    `;

    // 2. UX/UI: DESEMPENHO POR DOMÍNIO (Padrão AWS)
    html += `
        <div class="domain-performance-section mb-8">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                <i class="fa-solid fa-chart-bar text-aws-orange mr-2"></i> Desempenho por Domínio
            </h3>
            <div class="space-y-3">
    `;

    uiState.currentCertificationInfo.domains.forEach(domain => {
        const scoreData = results.domainScores[domain.id];
        if (scoreData && scoreData.total > 0) {
            const pct = (scoreData.correct / scoreData.total) * 100;
            const meets = pct >= 70; 

            const statusText = meets ? "Atende às Competências" : "Precisa de Melhoria";
            const statusColor = meets 
                ? "text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-green-800" 
                : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800";
            const icon = meets ? "fa-check-circle" : "fa-exclamation-triangle";

            html += `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg border border-gray-200 dark:border-slate-600 transition-all hover:shadow-sm gap-4">
                    <div class="flex-1 min-w-0">
                        <span class="font-bold text-gray-800 dark:text-gray-200 block text-md truncate whitespace-normal">${domain.name}</span>
                        <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 block">
                            Score do Domínio: ${pct.toFixed(0)}% <span class="opacity-75">(${scoreData.correct} de ${scoreData.total} corretas)</span>
                        </span>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold border ${statusColor} shrink-0 whitespace-nowrap">
                        <i class="fa-solid ${icon}"></i> ${statusText}
                    </div>
                </div>
            `;
        }
    });

    html += `
            </div>
        </div>
    `;

    // 3. REVISÃO QUESTÃO A QUESTÃO
    html += `
        <div class="report-header pb-4 mb-6 border-b border-gray-300 dark:border-slate-700 print:hidden mt-10">
            <h3 class="text-xl font-bold aws-text-dark dark:text-white">
                <i class="fa-solid fa-list-check text-aws-orange mr-2"></i> Detalhamento das Questões
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
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">Sua Resposta:</span>
                    <span class="${colorClass} font-semibold block leading-snug">${icon} ${isMulti ? '<br>• ' : ''}${userText}</span>
                </div>
                ${!ans.isCorrect ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 print-border-black">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">Resposta Correta:</span>
                    <span class="print-text-green text-green-600 dark:text-green-400 font-semibold block leading-snug">✅ ${isMulti ? '<br>• ' : ''}${correctText}</span>
                </div>` : ''}
            </div>
            <div class="explanation-print mt-4 p-4 rounded-lg bg-blue-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 border-l-4 border-l-blue-500 text-sm text-gray-800 dark:text-gray-200 print-no-bg">
                <strong class="text-blue-800 dark:text-blue-300 block mb-2 print-text-black">Explicação:</strong> 
                <span class="block leading-relaxed print-text-black">${ans.explanation}</span>
            </div>
        </div>
        `;
    });

    reportDiv.innerHTML = html;
}

// ============================================================================
// 5. PERSISTÊNCIA E HISTÓRICO
// ============================================================================
function saveQuizResult() {
    const results = engine.getFinalResults();
    storageManager.saveQuizResult(results);
    updateGamification(results.percentage);
}

function loadLastScore() {
    const banner = document.getElementById('last-score-banner');
    const certId = document.getElementById('certification-select')?.value;
    if (!banner || !certId) return;

    const last = storageManager.loadLastScore(certId);
    
    if (last && last.percentage !== undefined) {
        banner.classList.remove('hidden');
        banner.classList.add('cursor-pointer', 'hover:bg-blue-100', 'dark:hover:bg-blue-800', 'transition-all');
        const awsScore = Math.floor((last.percentage / 100) * 900) + 100;

        banner.innerHTML = `
            <div class="flex justify-between items-center w-full h-full" onclick="showLastReport('${certId}')">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-history"></i> 
                    <span>Último Teste: <strong>${awsScore} Pontos</strong></span>
                </div>
                <div class="text-xs font-bold underline flex items-center gap-1 opacity-80 hover:opacity-100">
                    <i class="fa-solid fa-file-pdf"></i> Ver Relatório
                </div>
            </div>
        `;
    } else {
        banner.classList.add('hidden');
    }
}

function showLastReport(certId) {
    const lastResult = storageManager.loadLastResult(certId);
    if(!lastResult || !lastResult.answers) {
        alert("Os detalhes deste relatório não foram salvos. Faça um novo simulado!");
        return;
    }
    
    if (!lastResult.weakDomains) {
        lastResult.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(lastResult.domainScores)) {
            if (scoreData.total > 0) {
                const domainPct = (scoreData.correct / scoreData.total) * 100;
                if (domainPct < 70) {
                    lastResult.weakDomains.push(domainId);
                }
            }
        }
    }
    displayReportFromResult(lastResult);
}

function showHistoricalReport(index) {
    const history = storageManager.getHistory();
    const result = history[index];
    
    if(!result || !result.answers) {
        alert("Os detalhes deste relatório não estão mais disponíveis.");
        return;
    }
    
    if (!result.weakDomains) {
        result.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(result.domainScores)) {
            if (scoreData.total > 0) {
                const domainPct = (scoreData.correct / scoreData.total) * 100;
                if (domainPct < 70) {
                    result.weakDomains.push(domainId);
                }
            }
        }
    }
    displayReportFromResult(result);
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const history = storageManager.getHistory();

    if (history.length === 0) {
        historyList.innerHTML = 'Nenhum simulado realizado ainda.';
        return;
    }

    const reversedHistory = [...history].reverse();
    let html = '<ul class="space-y-3 w-full">';

    reversedHistory.forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isPass = item.percentage >= APP_CONFIG.PASSING_SCORE;
        const color = isPass ? 'text-green-500' : 'text-red-500';
        const icon = isPass ? 'fa-check-circle' : 'fa-times-circle';
        const certName = item.certId.toUpperCase();
        const awsScore = Math.floor((item.percentage / 100) * 900) + 100;
        
        const originalIndex = history.length - 1 - index;

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
    if(confirm("Tem certeza que deseja apagar todo o histórico de simulados?")) {
        storageManager.clearHistory();
        updateHistoryDisplay();
        renderGlobalRadarChart(); // Atualiza gráfico global após limpar histórico
        
        const insightEl = document.getElementById('dynamic-insight');
        if (insightEl) insightEl.innerHTML = "Comece o simulado para que a IA mapeie seu perfil de conhecimento.";
    }
}

function updateDynamicInsight(history) {
    const insightEl = document.getElementById('dynamic-insight');
    if (!insightEl || !history || history.length === 0) return;

    const last = history[history.length - 1];
    if (last.percentage >= 85) {
        insightEl.innerHTML = `<span class="text-green-600 dark:text-green-400 font-bold text-base"><i class="fa-solid fa-fire"></i> Você está voando!</span><br><br>Seu desempenho no último simulado da <strong>${last.certId.toUpperCase()}</strong> foi excelente. Mantenha o ritmo de estudos, você está quase pronto!`;
    } else if (last.percentage >= APP_CONFIG.PASSING_SCORE) {
        insightEl.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-bold text-base"><i class="fa-solid fa-thumbs-up"></i> Bom trabalho!</span><br><br>Você passou no último simulado, mas ainda há espaço para revisar. Reforce seus pontos fracos olhando o relatório detalhado.`;
    } else {
        insightEl.innerHTML = `<span class="text-orange-600 dark:text-orange-400 font-bold text-base"><i class="fa-solid fa-book"></i> Foco nos estudos!</span><br><br>Você precisa de mais uns pontos para passar na <strong>${last.certId.toUpperCase()}</strong>. Revise o relatório em PDF detalhado do seu último teste e tente novamente.`;
    }
}

function renderGamification() {
    const data = storageManager.getGamification();
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.textContent = data.streak;
}

function updateGamification(pct) {
    let data = storageManager.getGamification();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDate !== today) {
        data.streak++;
        data.lastDate = today;
    }

    if (pct === 100 && !data.badges.some(b => b.id === 'perfect')) {
        data.badges.push({ id: 'perfect', name: 'Gabarito', icon: 'fa-star' });
    }

    storageManager.updateGamification(data);
    renderGamification();
}

// ============================================================================
// 6. UTILITÁRIOS GERAIS
// ============================================================================

function updateScoreDisplayUI() {
    const el = document.getElementById('score-display');
    const state = engine.state;
    if (el && state) el.textContent = `${state.score} / ${state.answers.length}`;
}

function updateTopicDropdown() {
    const topicSelect = document.getElementById('topic-filter');
    if (!topicSelect || !uiState.currentCertificationInfo) return;

    topicSelect.innerHTML = '<option value="">Todos os Tópicos</option>';
    uiState.currentCertificationInfo.domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain.id;
        option.textContent = domain.name;
        topicSelect.appendChild(option);
    });
}

async function updateDifficultyFilters(certId) {
    try {
        // Carrega o arquivo JSON para verificar dificuldades disponíveis
        const fileSuffix = uiState.language === 'en' ? '-en' : '';
        const response = await fetch(`data/${certId}${fileSuffix}.json`);
        if (!response.ok) return;
        
        const questions = await response.json();
        
        // Conta questões por dificuldade
        const difficultyCounts = {
            all: questions.length,
            easy: questions.filter(q => q.difficulty === 'easy').length,
            medium: questions.filter(q => q.difficulty === 'medium').length,
            hard: questions.filter(q => q.difficulty === 'hard').length
        };
        
        // Atualiza os botões de dificuldade
        const difficultyInputs = document.querySelectorAll('input[name="difficulty-level"]');
        difficultyInputs.forEach(input => {
            const value = input.value;
            const label = input.closest('label');
            const count = difficultyCounts[value];
            
            if (count === 0 && value !== 'all') {
                // Desabilita opções sem questões
                label.style.opacity = '0.4';
                label.style.cursor = 'not-allowed';
                input.disabled = true;
                
                // Adiciona tooltip
                label.title = 'Nenhuma questão disponível neste nível';
            } else {
                // Habilita opções com questões
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                input.disabled = false;
                
                // Atualiza tooltip com contagem
                if (value === 'all') {
                    label.title = `${count} questões disponíveis`;
                } else {
                    label.title = `${count} questões neste nível`;
                }
            }
        });
        
        // Se a opção selecionada não tem questões, volta para "Todas"
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
    
    // Atualiza os gráficos se estiverem visíveis
    if (window.radarChartInstance) {
        const results = engine.getFinalResults();
        if (results) {
            renderRadarChart(results);
        }
    }
    
    if (window.globalRadarChartInstance) {
        renderGlobalRadarChart();
    }
}

function toggleLanguage() {
    uiState.language = uiState.language === 'pt' ? 'en' : 'pt';
    localStorage.setItem('aws_sim_lang', uiState.language);
    updateLanguageButtonUI();
    
    // Atualiza filtros de dificuldade para o novo idioma
    const certSelect = document.getElementById('certification-select');
    if (certSelect) {
        updateDifficultyFilters(certSelect.value);
    }
    
    alert(uiState.language === 'en' 
        ? 'Idioma alterado para Inglês! Certifique-se de ter os arquivos -en.json na pasta data.' 
        : 'Idioma alterado para Português!');
}

function updateLanguageButtonUI() {
    const langBtn = document.getElementById('btn-language');
    if (langBtn) {
        langBtn.innerHTML = uiState.language === 'pt' 
            ? '<span class="text-xs font-bold">🇧🇷 PT-BR</span>' 
            : '<span class="text-xs font-bold">🇺🇸 EN-US</span>';
    }
}

function goHome() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    showScreen('start');
    loadLastScore();
    renderGlobalRadarChart(); // Atualiza gráfico global ao voltar para home
}

function retakeQuiz() {
    goHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelQuiz() {
    if (confirm('Sair do simulado?')) goHome();
}

function generatePerformanceReport() {
    window.print();
}

// ============================================================================
// 8. MODO FLASHCARDS
// ============================================================================
function startFlashcards() {
    uiState.flashcardIndex = 0;
    uiState.flashcardFlipped = false;
    showScreen('flashcards');
    loadFlashcard();
}

function loadFlashcard() {
    if (!glossaryTerms || glossaryTerms.length === 0) {
        alert('Nenhum termo disponível no glossário.');
        return;
    }
    
    const card = glossaryTerms[uiState.flashcardIndex];
    const termEl = document.getElementById('flashcard-term');
    const definitionEl = document.getElementById('flashcard-definition');
    const counterEl = document.getElementById('flashcard-counter');
    const cardContainer = document.getElementById('flashcard-container');
    
    if (termEl) termEl.textContent = card.term;
    if (definitionEl) definitionEl.textContent = card.definition;
    if (counterEl) counterEl.textContent = `${uiState.flashcardIndex + 1} / ${glossaryTerms.length}`;
    
    // Reset do flip
    if (cardContainer) {
        cardContainer.classList.remove('flipped');
        uiState.flashcardFlipped = false;
    }
    
    // Atualiza botões de navegação
    updateFlashcardButtons();
}

function flipFlashcard() {
    const cardContainer = document.getElementById('flashcard-container');
    if (cardContainer) {
        cardContainer.classList.toggle('flipped');
        uiState.flashcardFlipped = !uiState.flashcardFlipped;
    }
}

function nextFlashcard() {
    if (uiState.flashcardIndex < glossaryTerms.length - 1) {
        uiState.flashcardIndex++;
        loadFlashcard();
    }
}

function prevFlashcard() {
    if (uiState.flashcardIndex > 0) {
        uiState.flashcardIndex--;
        loadFlashcard();
    }
}

function updateFlashcardButtons() {
    const prevBtn = document.getElementById('btn-prev-flashcard');
    const nextBtn = document.getElementById('btn-next-flashcard');
    
    if (prevBtn) {
        prevBtn.disabled = uiState.flashcardIndex === 0;
        prevBtn.classList.toggle('opacity-50', uiState.flashcardIndex === 0);
        prevBtn.classList.toggle('cursor-not-allowed', uiState.flashcardIndex === 0);
    }
    
    if (nextBtn) {
        nextBtn.disabled = uiState.flashcardIndex === glossaryTerms.length - 1;
        nextBtn.classList.toggle('opacity-50', uiState.flashcardIndex === glossaryTerms.length - 1);
        nextBtn.classList.toggle('cursor-not-allowed', uiState.flashcardIndex === glossaryTerms.length - 1);
    }
}

// ============================================================================
// 9. GRÁFICO DE RADAR (CHART.JS)
// ============================================================================
async function renderRadarChart(results) {
    console.log('🎯 renderRadarChart chamado', results);
    
    const canvas = document.getElementById('radarChart');
    console.log('📊 Canvas encontrado:', canvas);
    
    if (!canvas) {
        console.error('❌ Canvas radarChart não encontrado no DOM');
        return;
    }

    // Aguarda Chart.js estar disponível
    if (typeof Chart === 'undefined') {
        console.log('⏳ Aguardando Chart.js carregar...');
        if (window.chartJsLoaded) {
            await window.chartJsLoaded;
        } else {
            console.error('❌ Chart.js não está disponível');
            return;
        }
    }

    console.log('✅ Chart.js disponível, criando gráfico...');

    // Destrói gráfico anterior se existir
    if (window.radarChartInstance) {
        window.radarChartInstance.destroy();
        console.log('🗑️ Gráfico anterior destruído');
    }

    const ctx = canvas.getContext('2d');
    const labels = [];
    const data = [];

    // Coleta dados dos domínios
    if (!uiState.currentCertificationInfo || !uiState.currentCertificationInfo.domains) {
        console.error('❌ Informações de certificação não disponíveis');
        return;
    }

    uiState.currentCertificationInfo.domains.forEach(domain => {
        const scoreData = results.domainScores[domain.id];
        if (scoreData && scoreData.total > 0) {
            labels.push(domain.name);
            const percentage = (scoreData.correct / scoreData.total) * 100;
            data.push(percentage.toFixed(1));
        }
    });

    console.log('📈 Dados do gráfico:', { labels, data });

    if (labels.length === 0) {
        console.warn('⚠️ Nenhum dado disponível para o gráfico');
        return;
    }

    // Detecta modo escuro
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';

    try {
        // Configuração do gráfico
        window.radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Desempenho (%)',
                    data: data,
                    backgroundColor: 'rgba(255, 153, 0, 0.2)',
                    borderColor: '#ff9900',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff9900',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#ff9900',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: textColor,
                            backdropColor: 'transparent',
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor
                        },
                        angleLines: {
                            color: gridColor
                        },
                        pointLabels: {
                            color: textColor,
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            font: {
                                size: 13,
                                weight: 'bold'
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ff9900',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.r + '%';
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico criado com sucesso!', window.radarChartInstance);
    } catch (error) {
        console.error('❌ Erro ao criar gráfico:', error);
    }
}

// ============================================================================
// 10. DASHBOARD DE DESEMPENHO GLOBAL
// ============================================================================

/**
 * Calcula estatísticas globais de desempenho agregando todo o histórico
 * @returns {Object} Objeto com domainStats (porcentagens por domínio) e summary (estatísticas gerais)
 */
function calculateGlobalDomainStats() {
    console.log('📊 Calculando estatísticas globais...');
    
    const history = storageManager.getHistory();
    
    if (!history || history.length === 0) {
        console.log('⚠️ Nenhum histórico encontrado');
        return null;
    }

    // Estrutura para acumular dados por domínio
    const domainAccumulator = {};
    let totalQuizzes = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;

    // Itera sobre todo o histórico
    history.forEach(quiz => {
        if (!quiz.domainScores) return;
        
        totalQuizzes++;
        totalQuestionsAnswered += quiz.total || 0;
        totalCorrect += quiz.score || 0;

        // Acumula dados por domínio
        Object.entries(quiz.domainScores).forEach(([domainId, scoreData]) => {
            if (!domainAccumulator[domainId]) {
                domainAccumulator[domainId] = {
                    total: 0,
                    correct: 0,
                    name: null
                };
            }
            
            domainAccumulator[domainId].total += scoreData.total || 0;
            domainAccumulator[domainId].correct += scoreData.correct || 0;
        });
    });

    // Calcula porcentagens por domínio
    const domainStats = {};
    const labels = [];
    const percentages = [];

    Object.entries(domainAccumulator).forEach(([domainId, data]) => {
        if (data.total > 0) {
            const percentage = (data.correct / data.total) * 100;
            
            // Tenta encontrar o nome do domínio em qualquer certificação
            let domainName = domainId;
            for (const certPath of Object.values(certificationPaths)) {
                const domain = certPath.domains.find(d => d.id === domainId);
                if (domain) {
                    domainName = domain.name;
                    break;
                }
            }
            
            domainStats[domainId] = {
                name: domainName,
                percentage: percentage.toFixed(1),
                total: data.total,
                correct: data.correct
            };
            
            labels.push(domainName);
            percentages.push(percentage.toFixed(1));
        }
    });

    const avgScore = totalQuestionsAnswered > 0 
        ? ((totalCorrect / totalQuestionsAnswered) * 100).toFixed(1)
        : 0;

    const summary = {
        totalQuizzes,
        totalQuestionsAnswered,
        totalCorrect,
        avgScore
    };

    console.log('✅ Estatísticas calculadas:', { domainStats, summary, labels, percentages });

    return {
        domainStats,
        summary,
        labels,
        percentages
    };
}

/**
 * Renderiza o gráfico de radar global na tela inicial
 */
async function renderGlobalRadarChart() {
    console.log('🌍 Renderizando gráfico global...');
    
    const canvas = document.getElementById('globalRadarChart');
    const emptyState = document.getElementById('global-chart-empty');
    const chartContainer = document.getElementById('global-chart-container');
    const statsContainer = document.getElementById('global-stats-summary');
    
    if (!canvas) {
        console.error('❌ Canvas globalRadarChart não encontrado');
        return;
    }

    // Calcula estatísticas
    const stats = calculateGlobalDomainStats();

    // Se não há dados, mostra estado vazio
    if (!stats || stats.labels.length === 0) {
        console.log('📭 Sem dados - mostrando estado vazio');
        if (emptyState) emptyState.classList.remove('hidden');
        if (chartContainer) chartContainer.classList.add('hidden');
        if (statsContainer) statsContainer.classList.add('hidden');
        return;
    }

    // Esconde estado vazio e mostra gráfico
    if (emptyState) emptyState.classList.add('hidden');
    if (chartContainer) chartContainer.classList.remove('hidden');
    if (statsContainer) statsContainer.classList.remove('hidden');

    // Atualiza estatísticas resumidas
    const totalQuizzesEl = document.getElementById('total-quizzes');
    const avgScoreEl = document.getElementById('avg-score');
    const totalQuestionsEl = document.getElementById('total-questions');
    
    if (totalQuizzesEl) totalQuizzesEl.textContent = stats.summary.totalQuizzes;
    if (avgScoreEl) avgScoreEl.textContent = stats.summary.avgScore + '%';
    if (totalQuestionsEl) totalQuestionsEl.textContent = stats.summary.totalQuestionsAnswered;

    // Aguarda Chart.js estar disponível
    if (typeof Chart === 'undefined') {
        console.log('⏳ Aguardando Chart.js carregar...');
        if (window.chartJsLoaded) {
            await window.chartJsLoaded;
        } else {
            console.error('❌ Chart.js não está disponível');
            return;
        }
    }

    // Destrói gráfico anterior se existir
    if (window.globalRadarChartInstance) {
        window.globalRadarChartInstance.destroy();
        console.log('🗑️ Gráfico global anterior destruído');
    }

    const ctx = canvas.getContext('2d');

    // Detecta modo escuro
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';
    const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(0, 0, 0, 0.1)';

    try {
        // Configuração do gráfico global
        window.globalRadarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: stats.labels,
                datasets: [{
                    label: 'Desempenho Médio (%)',
                    data: stats.percentages,
                    backgroundColor: 'rgba(255, 153, 0, 0.2)',
                    borderColor: '#ff9900',
                    borderWidth: 2,
                    pointBackgroundColor: '#ff9900',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#ff9900',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: textColor,
                            backdropColor: 'transparent',
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: gridColor
                        },
                        angleLines: {
                            color: gridColor
                        },
                        pointLabels: {
                            color: textColor,
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: textColor,
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ff9900',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const domainId = Object.keys(stats.domainStats)[context.dataIndex];
                                const domainData = stats.domainStats[domainId];
                                return [
                                    context.dataset.label + ': ' + context.parsed.r + '%',
                                    `${domainData.correct} de ${domainData.total} questões`
                                ];
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico global criado com sucesso!', window.globalRadarChartInstance);
    } catch (error) {
        console.error('❌ Erro ao criar gráfico global:', error);
    }
}

// ============================================================================
// 11. PWA INSTALL BUTTON
// ============================================================================
let deferredPrompt = null;

function initPWAInstall() {
    const installButton = document.getElementById('install-app');
    if (!installButton) return;

    // Captura o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostra o botão de instalação
        installButton.classList.remove('hidden');
    });

    // Adiciona listener ao botão
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        // Mostra o prompt de instalação
        deferredPrompt.prompt();

        // Aguarda a escolha do usuário
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);

        // Limpa o prompt e esconde o botão
        deferredPrompt = null;
        installButton.classList.add('hidden');
    });

    // Esconde o botão se o app já estiver instalado
    window.addEventListener('appinstalled', () => {
        console.log('PWA instalado com sucesso!');
        installButton.classList.add('hidden');
        deferredPrompt = null;
    });
}

// ============================================================================
// 7. EXPOSIÇÃO GLOBAL (Ponte para o index.html)
// ============================================================================
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