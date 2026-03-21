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
    tempSelectedAnswer: null
};

// ============================================================================
// 1. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeRadarChart();
    updateHistoryDisplay();
    renderGamification();

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
// 2. MOTOR DO QUIZ
// ============================================================================
async function startQuiz() {
    const certSelect = document.getElementById('certification-select');
    const quantitySelect = document.getElementById('question-quantity');
    const difficultySelect = document.getElementById('difficulty-level');
    const topicSelect = document.getElementById('topic-filter');
    const modeInput = document.querySelector('input[name="quiz-mode"]:checked');
    const btn = document.getElementById('btn-start-quiz');
    
    if (!certSelect || !quantitySelect) return;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A carregar...';

        const certId = certSelect.value;
        
        // Pega a info importada de forma nativa e segura
        const currentCertInfo = certificationPaths[certId];
        uiState.currentCertificationInfo = currentCertInfo;

        const filters = {
            quantity: parseInt(quantitySelect.value),
            difficulty: difficultySelect.value,
            topic: topicSelect ? topicSelect.value : '',
            mode: modeInput ? modeInput.value : 'exam'
        };

        // Chama o motor para buscar e processar as questões
        const result = await engine.loadQuestions(certId, currentCertInfo.domains, filters);

        if (!result.success) {
            alert(result.message);
            return;
        }

        // Configura o timer (90 segundos por questão)
        uiState.timeRemaining = result.totalQuestions * 90; 
        
        // Limpa relatórios antigos da tela
        const oldReport = document.getElementById('detailed-report');
        if (oldReport) oldReport.remove();

        showScreen('quiz');
        if (filters.mode === 'exam') startTimer();
        
        reinitializeRadarChart();
        loadQuestionUI();

    } catch (err) {
        alert("Erro ao iniciar o simulado: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Iniciar Simulação <i class="fa-solid fa-arrow-right ml-2"></i>';
    }
}

function loadQuestionUI() {
    const q = engine.getCurrentQuestion();
    const progress = engine.getProgress();
    
    document.getElementById('question-category').textContent = getDomainName(q.domain);
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('current-q-num').textContent = progress.current;
    document.getElementById('total-q-num').textContent = progress.total;
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${progress.percentage}%`;

    renderOptionsUI(q);
    
    // Reset de botões e explicações
    uiState.tempSelectedAnswer = null;
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
    
    question.options.forEach((opt, idx) => {
        const card = document.createElement('div');
        card.className = 'option-card group p-4 rounded-xl flex items-center gap-4 cursor-pointer border-2 border-gray-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800';
        
        card.innerHTML = `
            <div class="option-letter w-10 h-10 flex-shrink-0 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center font-bold text-gray-500 group-hover:text-orange-600 transition-colors">
                ${String.fromCharCode(65 + idx)}
            </div>
            <div class="flex-grow text-gray-700 dark:text-gray-200 font-medium">
                ${opt}
            </div>
        `;

        card.onclick = () => {
            const isAnswered = !document.getElementById('btn-next').classList.contains('hidden') || 
                               !document.getElementById('btn-finish').classList.contains('hidden');
            if (isAnswered) return;

            document.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('selected', 'border-orange-500', 'bg-orange-50');
                c.querySelector('.option-letter').classList.remove('bg-orange-500', 'text-white');
            });

            card.classList.add('selected', 'border-orange-500', 'bg-orange-50');
            card.querySelector('.option-letter').classList.add('bg-orange-500', 'text-white');

            uiState.tempSelectedAnswer = idx;
            document.getElementById('btn-submit').disabled = false;
        };

        container.appendChild(card);
    });
}

function submitAnswer() {
    const result = engine.submitAnswer(uiState.tempSelectedAnswer);
    const q = engine.getCurrentQuestion();

    document.querySelectorAll('.option-card').forEach((card, idx) => {
        card.classList.add('pointer-events-none');
        if (idx === result.correctIndex) card.classList.add('bg-green-50', 'border-green-500', 'dark:bg-green-900/20');
        if (idx === uiState.tempSelectedAnswer && !result.isCorrect) card.classList.add('bg-red-50', 'border-red-500', 'dark:bg-red-900/20');
    });

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
        feedbackHTML += `<div class="mb-2"><strong class="text-gray-800 dark:text-gray-200">Sua resposta:</strong> <span class="text-red-600 dark:text-red-400">${q.options[uiState.tempSelectedAnswer]}</span></div>`;
    }
    feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">Resposta correta:</strong> <span class="text-green-600 dark:text-green-400">${q.options[result.correctIndex]}</span></div>`;
    feedbackHTML += `<div class="pt-3 mt-2 border-t border-blue-200 dark:border-slate-600"><strong class="text-gray-800 dark:text-gray-200">Por que?</strong><br>${result.explanation}</div>`;

    document.getElementById('explanation-text').innerHTML = `${feedbackHTML} ${docLink}`;
    expBox.classList.remove('hidden');

    document.getElementById('btn-submit').classList.add('hidden');
    
    if (!result.isFinished) {
        document.getElementById('btn-next').classList.remove('hidden');
    } else {
        document.getElementById('btn-finish').classList.remove('hidden');
    }

    updateScoreDisplayUI();
    updateRadarChartUI();
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
// 3. TELAS E RELATÓRIOS
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

    document.getElementById('final-score-percent').textContent = `${results.percentage.toFixed(0)}%`;
    document.getElementById('final-correct').textContent = results.score;
    document.getElementById('final-incorrect').textContent = results.total - results.score;

    const recText = document.getElementById('recommendation-text');

    if (recText) {
        // Lógica baseada em weakDomains (array)
        const weakDomains = results.weakDomains || [];
        
        if (weakDomains.length === 0) {
            // Caso 0: Nenhum domínio fraco
            recText.innerHTML = `<strong>Excelente! Você demonstrou consistência em todos os domínios.</strong> Continue assim e você estará mais do que preparado para o exame real.`;
        } else if (weakDomains.length === 1) {
            // Caso 1: Um único domínio fraco
            const domainName = getDomainName(weakDomains[0]) || "Tópicos Gerais";
            if (results.percentage >= 85) {
                recText.innerHTML = `<strong>Excelente desempenho!</strong> Você demonstrou um domínio profundo. Se quiser alcançar a perfeição, faça uma revisão rápida em: <em>${domainName}</em>.`;
            } else if (results.passed || results.percentage >= APP_CONFIG.PASSING_SCORE) {
                recText.innerHTML = `<strong>Parabéns, você passou!</strong> Para aumentar sua segurança para o exame real, concentre seus estudos finais no domínio: <em>${domainName}</em>.`;
            } else {
                recText.innerHTML = `<strong>Não desanime!</strong> Sua maior oportunidade de melhoria está no domínio: <em>${domainName}</em>. Revise a documentação oficial sobre esse tema e tente novamente.`;
            }
        } else {
            // Caso 2+: Múltiplos domínios fracos
            const domainNames = weakDomains.map(id => getDomainName(id)).join(', ');
            recText.innerHTML = `<strong>Atenção! Você precisa reforçar seus estudos em múltiplas áreas críticas:</strong> <em>${domainNames}</em>. Revise a documentação oficial sobre esses temas antes de tentar novamente.`;
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

    let html = `
        <div class="hidden print:block mb-8 border-b-2 border-black pb-6">
            <h2 class="text-3xl font-bold mb-4 print-text-black">Relatório Oficial - Simulado AWS</h2>
            <p class="text-xl mb-4 print-text-black"><strong>Pontuação Final:</strong> ${results.percentage.toFixed(0)}% (${results.score} acertos de ${results.total})</p>
            <div class="border border-black p-4 mt-4">
                <strong class="text-lg block mb-2 print-text-black">Sugestão de Estudo (IA):</strong>
                <span class="text-base print-text-black">${recText}</span>
            </div>
        </div>
        <div class="report-header pb-4 mb-6 border-b border-gray-300 dark:border-slate-700 print:hidden">
            <h3 class="text-2xl font-bold aws-text-dark dark:text-white">
                <i class="fa-solid fa-list-check text-aws-orange mr-2"></i> Revisão do Simulado
            </h3>
        </div>
    `;
    
    results.answers.forEach((ans, index) => {
        const userText = ans.options[ans.userSelection];
        const correctText = ans.options[ans.correct];
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
                    <span class="${colorClass} font-semibold block">${icon} ${userText}</span>
                </div>
                ${!ans.isCorrect ? `
                <div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600 print-border-black">
                    <span class="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider block mb-1 print-text-black">Resposta Correta:</span>
                    <span class="print-text-green text-green-600 dark:text-green-400 font-semibold block">✅ ${correctText}</span>
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
// 4. PERSISTÊNCIA, GAMIFICAÇÃO E HISTÓRICO
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

        banner.innerHTML = `
            <div class="flex justify-between items-center w-full h-full" onclick="showLastReport('${certId}')">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-history"></i> 
                    <span>Última Nota: <strong>${last.percentage.toFixed(0)}%</strong></span>
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
    
    // Calcula weakDomains se não existir (compatibilidade com relatórios antigos)
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
    
    // Calcula weakDomains se não existir (compatibilidade com relatórios antigos)
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
        
        const originalIndex = history.length - 1 - index;

        html += `
        <li onclick="showHistoricalReport(${originalIndex})" class="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-all group">
            <div>
                <div class="font-bold text-gray-700 dark:text-gray-200 group-hover:text-aws-orange transition-colors">${certName}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${date}</div>
            </div>
            <div class="flex flex-col items-end">
                <div class="${color} font-bold text-lg flex items-center gap-1">
                    ${item.percentage.toFixed(0)}% <i class="fa-solid ${icon}"></i>
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
        insightEl.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-bold text-base"><i class="fa-solid fa-thumbs-up"></i> Bom trabalho!</span><br><br>Você passou no último simulado, mas ainda há espaço para revisar. Reforce seus pontos fracos olhando o gráfico ao lado.`;
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
// 5. CHART E UTILITÁRIOS GERAIS
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
                    pointLabels: {
                        font: { size: 11, family: "'Open Sans', sans-serif" },
                        padding: 5
                    }
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

function startTimer() {
    if (uiState.timerInterval) clearInterval(uiState.timerInterval);
    uiState.timerInterval = setInterval(() => {
        if (uiState.isPaused) return;
        uiState.timeRemaining--;
        const min = Math.floor(uiState.timeRemaining / 60);
        const sec = uiState.timeRemaining % 60;
        const el = document.getElementById('timer-text');
        if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        if (uiState.timeRemaining <= 0) finishQuiz();
    }, 1000);
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
// 6. EXPOSIÇÃO GLOBAL (Ponte para o index.html)
// ============================================================================
window.startQuiz = startQuiz;
window.submitAnswer = submitAnswer;
window.nextQuestion = nextQuestion;
window.finishQuiz = finishQuiz;
window.cancelQuiz = cancelQuiz;
window.goHome = goHome;
window.retakeQuiz = retakeQuiz;
window.toggleDarkMode = toggleDarkMode;
window.clearHistory = clearHistory;
window.showLastReport = showLastReport;
window.showHistoricalReport = showHistoricalReport;
window.generatePerformanceReport = generatePerformanceReport;
window.toggleFlag = toggleFlag;