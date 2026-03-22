/**
 * APP.JS - Orquestrador de Interface (UI Controller)
 * Integração completa com Módulos ES6 e QuizEngine
 */

import { QuizEngine } from './js/quizEngine.js';
import { certificationPaths } from './data.js';
import { storageManager } from './js/storageManager.js';

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
    language: localStorage.getItem('aws_sim_lang') || 'pt'
};

// ============================================================================
// 1. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeRadarChart(); // Mantido por segurança, caso o HTML ainda tenha o canvas
    updateHistoryDisplay();
    renderGamification();
    updateLanguageButtonUI();

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
            reinitializeRadarChart();
            updateTopicDropdown(); 
            loadLastScore();
        }
    });
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
            alert(result.message);
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
        
        // Verifica o modo e inicia o timer
        const timerContainer = document.getElementById('timer-container');
        if (filters.mode === 'exam') {
            if (timerContainer) timerContainer.classList.remove('hidden');
            startTimer();
        } else {
            if (timerContainer) timerContainer.classList.add('hidden');
        }
        
        reinitializeRadarChart();
        loadQuestionUI();

    } catch (err) {
        alert("Erro ao iniciar o simulado: " + err.message);
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
    updateRadarChartUI();
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
    const screens = ['start', 'quiz', 'results'];
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
// 6. CHART E UTILITÁRIOS GERAIS
// ============================================================================

function initializeRadarChart() {
    const ctx = document.getElementById('radarChart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    window.radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Domínio 1', 'Domínio 2', 'Domínio 3', 'Domínio 4'],
            datasets: [{
                label: 'Conhecimento (%)',
                data: [0, 0, 0, 0],
                fill: true,
                backgroundColor: 'rgba(255, 153, 0, 0.2)',
                borderColor: '#ff9900',
                borderWidth: 2,
                pointBackgroundColor: '#ff9900'
            }]
        },
        options: {
            maintainAspectRatio: false, 
            layout: { padding: 15 },
            scales: {
                r: { 
                    beginAtZero: true, 
                    max: 100, 
                    ticks: { display: false, stepSize: 25 },
                    grid: { color: 'rgba(200, 200, 200, 0.2)' },
                    pointLabels: { font: { size: 11, family: "'Open Sans', sans-serif" }, padding: 5 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function formatChartLabel(name) {
    const words = name.split(' ');
    if (words.length > 2) {
        const mid = Math.ceil(words.length / 2);
        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    return name;
}

function reinitializeRadarChart() {
    if (!uiState.currentCertificationInfo || !window.radarChartInstance) return;
    const labels = uiState.currentCertificationInfo.domains.map(d => formatChartLabel(d.name));
    window.radarChartInstance.data.labels = labels;
    
    const certId = uiState.currentCertificationInfo.id;
    const lastResult = storageManager.loadLastResult(certId);

    if (lastResult && lastResult.domainScores) {
        const data = uiState.currentCertificationInfo.domains.map(d => {
            const s = lastResult.domainScores[d.id];
            return (s && s.total > 0) ? (s.correct / s.total) * 100 : 0;
        });
        window.radarChartInstance.data.datasets[0].data = data;
    } else {
        window.radarChartInstance.data.datasets[0].data = labels.map(() => 0);
    }
    window.radarChartInstance.update();
}

function updateRadarChartUI() {
    if (!window.radarChartInstance || !uiState.currentCertificationInfo) return;
    const data = uiState.currentCertificationInfo.domains.map(d => {
        const s = engine.state.domainScores[d.id];
        return (s && s.total > 0) ? (s.correct / s.total) * 100 : 0;
    });
    window.radarChartInstance.data.datasets[0].data = data;
    window.radarChartInstance.update();
}

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
}

function toggleLanguage() {
    uiState.language = uiState.language === 'pt' ? 'en' : 'pt';
    localStorage.setItem('aws_sim_lang', uiState.language);
    updateLanguageButtonUI();
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