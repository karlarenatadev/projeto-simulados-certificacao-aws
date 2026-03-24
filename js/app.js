/**
 * APP.JS - Orquestrador de Interface (UI Controller)
 * Integração completa com Módulos ES6 e QuizEngine
 */

import { QuizEngine } from './quizEngine.js';
import { certificationPaths, glossaryTerms } from './data.js';
import { storageManager } from './storageManager.js';
import { renderRadarChart, renderGlobalRadarChart, calculateGlobalDomainStats } from './chartManager.js';

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
    
    // VALIDAÇÃO: Verifica se a função existe antes de chamar
    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }

    const certSelect = document.getElementById('certification-select');
    
    // Inicializa com a certificação selecionada por padrão
    if (certSelect && certificationPaths && certificationPaths[certSelect.value]) {
        uiState.currentCertificationInfo = certificationPaths[certSelect.value];
        updateTopicDropdown();
        loadLastScore();
    }

    // Atualiza quando o usuário troca de certificação no dropdown
    if (certSelect) {
        certSelect.addEventListener('change', () => {
            if (certificationPaths && certificationPaths[certSelect.value]) {
                uiState.currentCertificationInfo = certificationPaths[certSelect.value];
                updateTopicDropdown(); 
                loadLastScore();
                updateDifficultyFilters(certSelect.value);
                
                // VALIDAÇÃO: Verifica se a função existe antes de chamar
                if (typeof renderGlobalRadarChart === 'function') {
                    renderGlobalRadarChart();
                }
            }
        });
    }
    
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
    
    // Reset de botões e caixas (com validação de null)
    const btnSubmit = document.getElementById('btn-submit');
    const explanationBox = document.getElementById('explanation-box');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.remove('hidden');
    }
    if (explanationBox) explanationBox.classList.add('hidden');
    if (btnNext) btnNext.classList.add('hidden');
    if (btnFinish) btnFinish.classList.add('hidden');
    
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

    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.classList.add('hidden');
    
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
    if (!expBox) return; // Proteção contra elemento não encontrado
    
    const docLink = result.referenceUrl ? 
        `<a href="${result.referenceUrl}" target="_blank" class="mt-3 inline-block text-orange-600 font-bold hover:underline">
            <i class="fa-solid fa-book-open mr-1"></i> Ver Documentação Oficial
         </a>` : '';

    const titleEl = expBox.querySelector('h4');
    const textEl = document.getElementById('explanation-text');
    
    if (titleEl) {
        titleEl.innerHTML = result.isCorrect ? 
            '<i class="fa-solid fa-check"></i> Correto!' : '<i class="fa-solid fa-xmark"></i> Incorreto';
        titleEl.className = result.isCorrect ? "font-bold text-green-600 mb-3" : "font-bold text-red-600 mb-3";
    }
    
    let feedbackHTML = "";
    if (!result.isCorrect) {
        let userText = isMulti ? uiState.tempSelectedAnswer.map(i => question.options[i]).join("<br>• ") : question.options[uiState.tempSelectedAnswer];
        feedbackHTML += `<div class="mb-2"><strong class="text-gray-800 dark:text-gray-200">Sua resposta:</strong> <span class="text-red-600 dark:text-red-400"><br>• ${userText}</span></div>`;
    }
    let correctText = isMulti ? question.correct.map(i => question.options[i]).join("<br>• ") : question.options[result.correctIndex];
    feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">Resposta correta:</strong> <span class="text-green-600 dark:text-green-400"><br>• ${correctText}</span></div>`;
    feedbackHTML += `<div class="pt-3 mt-2 border-t border-blue-200 dark:border-slate-600"><strong class="text-gray-800 dark:text-gray-200">Por que?</strong><br>${result.explanation}</div>`;

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
    
    // VALIDAÇÃO: Verifica se a função existe antes de chamar
    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }
    
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
    
    // VALIDAÇÃO: Verifica se results existe antes de processar
    if (!results) {
        console.error('Erro ao obter resultados finais do quiz');
        alert('Erro ao exibir resultados. Tente novamente.');
        return;
    }
    
    displayReportFromResult(results);
    
    // Pequeno atraso para garantir que a tela ficou visível antes de desenhar o gráfico
    setTimeout(() => {
        // VALIDAÇÃO: Verifica se a função existe antes de chamar
        if (typeof renderRadarChart === 'function') {
            renderRadarChart(results, uiState.currentCertificationInfo);
        }
    }, 50);
}

function displayReportFromResult(results) {
    // VALIDAÇÃO: Verifica se results existe e tem dados mínimos
    if (!results || typeof results.percentage !== 'number') {
        console.error('Dados de resultado inválidos em displayReportFromResult');
        alert('Erro ao exibir relatório. Dados corrompidos.');
        return;
    }
    
    if (certificationPaths && results.certId) {
        uiState.currentCertificationInfo = certificationPaths[results.certId];
    }

    // Converte a pontuação para a escala oficial AWS (100-1000)
    const awsScore = Math.floor((results.percentage / 100) * 900) + 100;
    
    // VALIDAÇÃO DOM: Verifica se elementos existem antes de manipular
    const scorePercentEl = document.getElementById('final-score-percent');
    const finalCorrectEl = document.getElementById('final-correct');
    const finalIncorrectEl = document.getElementById('final-incorrect');
    
    if (scorePercentEl) scorePercentEl.textContent = awsScore;
    if (finalCorrectEl) finalCorrectEl.textContent = results.score || 0;
    if (finalIncorrectEl) finalIncorrectEl.textContent = (results.total || 0) - (results.score || 0);

    // Adiciona selo de aprovação/revisão
    const scoreDisplay = document.getElementById('final-score-percent');
    if (!scoreDisplay) return; // Proteção contra elemento não encontrado
    
    const parentDiv = scoreDisplay.parentElement;
    if (!parentDiv) return; // Proteção contra parent não encontrado
    
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
    // VALIDAÇÃO: Verifica se results existe e tem dados mínimos
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

    // VALIDAÇÃO: Verifica se currentCertificationInfo e domains existem
    if (uiState.currentCertificationInfo && Array.isArray(uiState.currentCertificationInfo.domains)) {
        // VALIDAÇÃO: Verifica se domainScores existe antes de iterar
        if (results.domainScores && typeof results.domainScores === 'object') {
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
                                <span class="font-bold text-gray-800 dark:text-gray-200 block text-md whitespace-normal">${domain.name}</span>
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
        }
    }

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
    const certSelect = document.getElementById('certification-select');
    
    // VALIDAÇÃO DOM: Verifica se elementos existem
    if (!banner || !certSelect) return;
    
    const certId = certSelect.value;
    if (!certId) return;

    const last = storageManager.loadLastScore(certId);
    
    // VALIDAÇÃO: Verifica se last existe e tem dados válidos
    if (last && typeof last.percentage === 'number') {
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
    
    // VALIDAÇÃO: Verifica se o resultado existe e tem dados válidos
    if (!lastResult || !lastResult.answers) {
        alert("Os detalhes deste relatório não foram salvos. Faça um novo simulado!");
        return;
    }
    
    // VALIDAÇÃO: Garante que domainScores existe antes de iterar
    if (!lastResult.domainScores || typeof lastResult.domainScores !== 'object') {
        alert("Dados do relatório estão corrompidos. Faça um novo simulado!");
        return;
    }
    
    if (!lastResult.weakDomains) {
        lastResult.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(lastResult.domainScores)) {
            if (scoreData && scoreData.total > 0) {
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
    let history = storageManager.getHistory();
    
    // VALIDAÇÃO CRÍTICA: Garante que history é um Array
    if (!Array.isArray(history)) {
        console.warn('Histórico corrompido em showHistoricalReport. Forçando limpeza...');
        history = [];
        storageManager.clearHistory();
        alert("Histórico corrompido foi limpo. Faça um novo simulado!");
        return;
    }
    
    const result = history[index];
    
    // VALIDAÇÃO: Verifica se o resultado existe e tem dados válidos
    if (!result || !result.answers) {
        alert("Os detalhes deste relatório não estão mais disponíveis.");
        return;
    }
    
    // VALIDAÇÃO: Garante que domainScores existe antes de iterar
    if (!result.domainScores || typeof result.domainScores !== 'object') {
        alert("Dados do relatório estão corrompidos.");
        return;
    }
    
    if (!result.weakDomains) {
        result.weakDomains = [];
        for (const [domainId, scoreData] of Object.entries(result.domainScores)) {
            if (scoreData && scoreData.total > 0) {
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

    // CORREÇÃO CRÍTICA: Valida se rawHistory é um Array antes de usar .filter()
    let rawHistory = storageManager.getHistory();
    
    // Salva-vidas: Se não for array, força array vazio e limpa cache corrompido
    if (!Array.isArray(rawHistory)) {
        console.warn('Histórico corrompido detectado em updateHistoryDisplay. Forçando limpeza...');
        rawHistory = [];
        storageManager.clearHistory();
    }
    
    const history = rawHistory.filter(item => item && item.certId && item.percentage !== undefined);

    if (history.length === 0) {
        historyList.innerHTML = 'Nenhum simulado realizado ainda.';
        updateDynamicInsight([]);
        return;
    }

    // REMOVA O REVERSE! Use o history diretamente para ter os recentes primeiro
    let html = '<ul class="space-y-3 w-full">';

    history.forEach((item, index) => {
        const date = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const isPass = item.percentage >= APP_CONFIG.PASSING_SCORE;
        const color = isPass ? 'text-green-500' : 'text-red-500';
        const icon = isPass ? 'fa-check-circle' : 'fa-times-circle';
        const certName = item.certId ? item.certId.toUpperCase() : 'AWS';
        const awsScore = Math.floor((item.percentage / 100) * 900) + 100;
        
        // Mantém a referência correta do índice original para clicar e abrir
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
    if (confirm("Tem certeza que deseja apagar todo o histórico de simulados?")) {
        storageManager.clearHistory();
        updateHistoryDisplay();
        
        // VALIDAÇÃO: Verifica se a função existe antes de chamar
        if (typeof renderGlobalRadarChart === 'function') {
            renderGlobalRadarChart();
        }
        
        // Atualiza insights para estado inicial
        updateDynamicInsight([]);
    }
}

function updateDynamicInsight(history) {
    const insightEl = document.getElementById('dynamic-insight');
    if (!insightEl) return;
    
    // VALIDAÇÃO: Garante que history é um Array
    if (!Array.isArray(history)) {
        console.warn('updateDynamicInsight recebeu dados inválidos. Usando array vazio.');
        history = [];
    }
    
    // Se não há histórico, mostra mensagem padrão
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

    // Análise inteligente do histórico
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

/**
 * Gera insights inteligentes baseados em análise profunda do histórico
 */
function generateSmartInsight(history) {
    // VALIDAÇÃO CRÍTICA: Garante que history é um Array válido
    if (!Array.isArray(history) || history.length === 0) {
        return {
            icon: 'fa-solid fa-rocket',
            iconColor: 'text-blue-500',
            title: 'Comece sua jornada! 🚀',
            titleColor: 'text-blue-600 dark:text-blue-400',
            message: 'Faça seu primeiro simulado para receber insights personalizados baseados no seu desempenho.',
            action: '💡 Dica: Comece pelo modo Revisão para se familiarizar',
            actionColor: 'text-blue-600 dark:text-blue-400'
        };
    }
    
    // Como os gráficos agora vivem fora do app.js, vamos simular uma análise básica se 
    // a função calculateGlobalDomainStats não estiver injetada (ou injetá-la depois).
    // Por enquanto, o insight analisa apenas o item mais recente.
    
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
    
    let isConsistent = true;
    if (history.length >= 3) {
        const lastScores = history.slice(0, 5).map(t => t.percentage);
        const avg = lastScores.reduce((a, b) => a + b, 0) / lastScores.length;
        const variance = lastScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / lastScores.length;
        const stdDev = Math.sqrt(variance);
        isConsistent = stdDev < 15; 
    }
    
    const avgScore = last.percentage; // fallback
    const isNearPassing = avgScore >= 65 && avgScore < 70;
    
    const today = new Date();
    const testsToday = history.filter(t => {
        const testDate = new Date(t.date);
        return testDate.toDateString() === today.toDateString();
    }).length;
    
    let passingStreak = 0;
    for (let i = 0; i < history.length; i++) {
        if (history[i].percentage >= 70) passingStreak++;
        else break;
    }
    
    if (testsToday >= 4) {
        return {
            icon: 'fa-solid fa-battery-quarter', iconColor: 'text-red-500',
            title: 'Cuidado com o Burnout!', titleColor: 'text-red-600 dark:text-red-400',
            message: `Você já fez ${testsToday} simulados hoje. Seu cérebro precisa de descanso para consolidar o aprendizado.`,
            action: '💡 Dica: Pausas melhoram a retenção em até 30%', actionColor: 'text-blue-600 dark:text-blue-400'
        };
    }
    
    if (passingStreak >= 3 && avgScore >= 80) {
        return {
            icon: 'fa-solid fa-trophy', iconColor: 'text-yellow-500',
            title: 'Você está dominando! 🔥', titleColor: 'text-green-600 dark:text-green-400',
            message: `${passingStreak} aprovações seguidas com média de ${avgScore.toFixed(0)}%! Você está pronto para o exame.`,
            action: '🎯 Próximo passo: Agende seu exame AWS', actionColor: 'text-green-600 dark:text-green-400'
        };
    }
    
    if (trend === 'improving' && avgScore >= 60) {
        return {
            icon: 'fa-solid fa-chart-line', iconColor: 'text-green-500',
            title: 'Evolução Consistente! 📈', titleColor: 'text-green-600 dark:text-green-400',
            message: `Sua pontuação está melhorando! Média atual: ${avgScore.toFixed(0)}%. Continue nesse ritmo.`,
            action: '💪 Continue praticando!', actionColor: 'text-blue-600 dark:text-blue-400'
        };
    }
    
    if (trend === 'declining') {
        return {
            icon: 'fa-solid fa-chart-line-down', iconColor: 'text-orange-500',
            title: 'Atenção: Queda no Desempenho', titleColor: 'text-orange-600 dark:text-orange-400',
            message: `Suas últimas pontuações estão caindo. Isso pode indicar cansaço ou falta de revisão.`,
            action: '💡 Sugestão: Faça uma pausa e revise', actionColor: 'text-orange-600 dark:text-orange-400'
        };
    }
    
    if (isNearPassing) {
        return {
            icon: 'fa-solid fa-bullseye', iconColor: 'text-blue-500',
            title: 'Quase lá! Falta pouco! 🎯', titleColor: 'text-blue-600 dark:text-blue-400',
            message: `Você está a apenas ${(70 - avgScore).toFixed(0)}% da aprovação!`,
            action: '💪 Mais alguns simulados e estará pronto', actionColor: 'text-blue-600 dark:text-blue-400'
        };
    }
    
    if (!isConsistent && history.length >= 5) {
        return {
            icon: 'fa-solid fa-wave-square', iconColor: 'text-yellow-500',
            title: 'Desempenho Inconsistente', titleColor: 'text-yellow-600 dark:text-yellow-500',
            message: `Suas pontuações variam muito. Isso indica que precisa consolidar melhor os fundamentos.`,
            action: '💡 Dica: Faça simulados focados em um domínio', actionColor: 'text-yellow-600 dark:text-yellow-500'
        };
    }
    
    if (avgScore < 70) {
        const certName = last && last.certId ? last.certId.toUpperCase() : 'AWS';
        return {
            icon: 'fa-solid fa-book-open', iconColor: 'text-orange-500',
            title: 'Foco nos Estudos Necessário 📖', titleColor: 'text-orange-600 dark:text-orange-400',
            message: `Sua pontuação atual: ${avgScore.toFixed(0)}%. Revise os conceitos fundamentais para chegar aos 70%.`,
            action: `📚 Estude a documentação da ${certName}`, actionColor: 'text-orange-600 dark:text-orange-400'
        };
    }
    
    return {
        icon: 'fa-solid fa-rocket', iconColor: 'text-blue-500',
        title: 'Continue Praticando! 🚀', titleColor: 'text-blue-600 dark:text-blue-400',
        message: `Você já fez ${history.length} simulado${history.length > 1 ? 's' : ''}! Continue assim!`,
        action: '💡 A prática leva à perfeição', actionColor: 'text-blue-600 dark:text-blue-400'
    };
}

function renderGamification() {
    // VALIDAÇÃO: Verifica se storageManager existe
    if (!storageManager || typeof storageManager.getGamification !== 'function') {
        console.warn('storageManager não disponível em renderGamification');
        return;
    }
    
    const data = storageManager.getGamification();
    
    // VALIDAÇÃO DOM: Verifica se elemento existe
    const streakEl = document.getElementById('streak-counter');
    if (streakEl && data && typeof data.currentStreak === 'number') {
        streakEl.textContent = data.currentStreak;
    }
}

function updateGamification(pct) {
    // VALIDAÇÃO: Verifica se storageManager existe e pct é válido
    if (!storageManager || typeof pct !== 'number') {
        console.warn('Dados inválidos em updateGamification');
        return;
    }
    
    // Usa a função do storageManager que já faz toda a lógica
    storageManager.updateGamification(pct);
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
    // VALIDAÇÃO: Verifica se certId é válido
    if (!certId || typeof certId !== 'string') {
        console.warn('certId inválido em updateDifficultyFilters');
        return;
    }
    
    try {
        const fileSuffix = uiState.language === 'en' ? '-en' : '';
        const response = await fetch(`data/${certId}${fileSuffix}.json`);
        
        if (!response.ok) {
            console.warn(`Arquivo de dados não encontrado: data/${certId}${fileSuffix}.json`);
            return;
        }
        
        const questions = await response.json();
        
        // VALIDAÇÃO: Verifica se questions é um array válido
        if (!Array.isArray(questions)) {
            console.error('Dados de questões inválidos (não é array)');
            return;
        }
        
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
                label.title = 'Nenhuma questão disponível neste nível';
            } else {
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                input.disabled = false;
                label.title = value === 'all' ? `${count} questões disponíveis` : `${count} questões neste nível`;
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
    
    // VALIDAÇÃO: Verifica se instâncias e funções existem antes de chamar
    if (window.radarChartInstance && typeof renderRadarChart === 'function') {
        const results = engine.getFinalResults();
        if (results) {
            renderRadarChart(results, uiState.currentCertificationInfo);
        }
    }
    
    if (window.globalRadarChartInstance && typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }
}

function toggleLanguage() {
    uiState.language = uiState.language === 'pt' ? 'en' : 'pt';
    localStorage.setItem('aws_sim_lang', uiState.language);
    updateLanguageButtonUI();
    
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
    
    // VALIDAÇÃO: Verifica se a função existe antes de chamar
    if (typeof renderGlobalRadarChart === 'function') {
        renderGlobalRadarChart();
    }
    
    let history = storageManager.getHistory();
    
    // VALIDAÇÃO: Garante que history é um Array
    if (!Array.isArray(history)) {
        console.warn('Histórico corrompido em goHome. Forçando limpeza...');
        history = [];
        storageManager.clearHistory();
    }
    
    updateDynamicInsight(history);
}

function retakeQuiz() {
    goHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelQuiz() {
    if (confirm('Sair do simulado?')) goHome();
}

function generatePerformanceReport() {
    const reportElement = document.getElementById('detailed-report');
    
    // VALIDAÇÃO DOM: Verifica se elemento existe
    if (!reportElement) {
        alert('Relatório não encontrado para gerar PDF.');
        return;
    }
    
    // VALIDAÇÃO: Verifica se html2pdf está disponível
    if (typeof html2pdf !== 'function') {
        alert('Biblioteca de geração de PDF não está carregada. Recarregue a página e tente novamente.');
        return;
    }

    const opt = {
        margin:       10,
        filename:     'relatorio-simulado-aws.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const btn = document.querySelector('button[onclick="generatePerformanceReport()"]');
    const oldHtml = btn ? btn.innerHTML : '<i class="fa-solid fa-file-pdf mr-2"></i> Relatório PDF';
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Gerando...';
        btn.disabled = true;
    }

    // TRATAMENTO DE ERROS: Adiciona try/catch para capturar erros de geração
    try {
        html2pdf().set(opt).from(reportElement).save()
            .then(() => {
                if (btn) {
                    btn.innerHTML = oldHtml;
                    btn.disabled = false;
                }
            })
            .catch((error) => {
                console.error('Erro ao gerar PDF:', error);
                alert('Erro ao gerar PDF. Tente novamente.');
                if (btn) {
                    btn.innerHTML = oldHtml;
                    btn.disabled = false;
                }
            });
    } catch (error) {
        console.error('Erro ao iniciar geração de PDF:', error);
        alert('Erro ao gerar PDF. Tente novamente.');
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
}

// ============================================================================
// 8. MODO FLASHCARDS - Importado do módulo flashcards.js
// ============================================================================
import { 
    startFlashcards as startFlashcardsModule, 
    flipFlashcard as flipFlashcardModule,
    nextFlashcard as nextFlashcardModule,
    prevFlashcard as prevFlashcardModule,
    filterFlashcardsByCert
} from './flashcards.js';

// Wrappers para manter compatibilidade
function startFlashcards() {
    startFlashcardsModule(showScreen);
}

function flipFlashcard() {
    flipFlashcardModule();
}

function nextFlashcard() {
    nextFlashcardModule();
}

function prevFlashcard() {
    prevFlashcardModule();
}

// ============================================================================
// 9. PWA INSTALL BUTTON
// ============================================================================
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
        console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
        deferredPrompt = null;
        installButton.classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA instalado com sucesso!');
        installButton.classList.add('hidden');
        deferredPrompt = null;
    });
}

// ============================================================================
// 10. EXPOSIÇÃO GLOBAL (Ponte para o index.html)
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
window.filterFlashcardsByCert = filterFlashcardsByCert;