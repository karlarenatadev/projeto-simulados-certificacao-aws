/**
 * APP.JS - Simulador de Certificações AWS (Versão Ultra 2026)
 * Inovações: Cards Interativos, Radar Pro, Links Oficiais, Gamificação e Relatórios.
 */

// ============================================================================
// 1. ESTADO GLOBAL
// ============================================================================
let appState = {
    currentCertification: null,
    questions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    answers: [],
    score: 0,
    domainScores: {},
    timerInterval: null,
    timeRemaining: 0,
    quizMode: 'exam',
    flaggedQuestions: [],
    isPaused: false
};

const APP_CONFIG = {
    PASSING_SCORE: 70,
    STORAGE_KEY: 'aws_sim_'
};

// ============================================================================
// 2. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeRadarChart();
    updateHistoryDisplay();
    renderGamification();

    const certSelect = document.getElementById('certification-select');
    
    // Força a injeção inicial dos tópicos e da última nota logo que a página carrega
    const initInterval = setInterval(() => {
        if (typeof certificationPaths !== 'undefined') {
            clearInterval(initInterval);
            if (certSelect) {
                appState.currentCertification = certificationPaths[certSelect.value];
                updateTopicDropdown();
                loadLastScore();
            }
        }
    }, 50);

    certSelect?.addEventListener('change', () => {
        const selectedId = certSelect.value;
        if (typeof certificationPaths !== 'undefined') {
            appState.currentCertification = certificationPaths[selectedId];
            reinitializeRadarChart();
            updateTopicDropdown(); 
            loadLastScore();
        }
    });
});

// ============================================================================
// 3. MOTOR DO QUIZ
// ============================================================================

async function startQuiz() {
    const certSelect = document.getElementById('certification-select');
    const quantitySelect = document.getElementById('question-quantity');
    const difficultySelect = document.getElementById('difficulty-level');
    const modeInput = document.querySelector('input[name="quiz-mode"]:checked');

    if (!certSelect || !quantitySelect) return;

    const selectedCertId = certSelect.value;
    const quantity = parseInt(quantitySelect.value);
    const difficulty = difficultySelect.value;
    const mode = modeInput ? modeInput.value : 'exam';

    const btn = document.getElementById('btn-start-quiz');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A carregar...';

        if (typeof certificationPaths === 'undefined') {
            throw new Error('Erro crítico: data.js não carregado.');
        }

        const response = await fetch(`data/${selectedCertId}.json`);
        if (!response.ok) throw new Error('Arquivo de questões não encontrado.');
        
        let data = await response.json();

        if (difficulty !== 'all') data = data.filter(q => q.difficulty === difficulty);
        
        const topicFilter = document.getElementById('topic-filter')?.value;
        if (topicFilter && topicFilter !== "") {
            data = data.filter(q => q.domain === topicFilter);
        }

        if (data.length === 0) {
            alert('Nenhuma questão encontrada com esses filtros.');
            btn.disabled = false;
            return;
        }

        appState.questions = shuffleArray(data).slice(0, Math.min(quantity, data.length)).map(q => shuffleQuestionOptions(q));
        appState.currentCertification = certificationPaths[selectedCertId];
        appState.currentQuestionIndex = 0;
        appState.score = 0;
        appState.answers = [];
        appState.quizMode = mode;
        appState.timeRemaining = appState.questions.length * 90;

        appState.domainScores = {};
        appState.currentCertification.domains.forEach(d => appState.domainScores[d.id] = { total: 0, correct: 0 });

        const oldReport = document.getElementById('detailed-report');
        if (oldReport) oldReport.remove();

        showScreen('quiz');
        if (mode === 'exam') startTimer();
        reinitializeRadarChart();
        loadQuestion();
        updateScoreDisplay();

    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Iniciar Simulação <i class="fa-solid fa-arrow-right ml-2"></i>';
    }
}

function loadQuestion() {
    const q = appState.questions[appState.currentQuestionIndex];
    if (!q) return;

    document.getElementById('question-category').textContent = getDomainName(q.domain);
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('current-q-num').textContent = appState.currentQuestionIndex + 1;
    document.getElementById('total-q-num').textContent = appState.questions.length;
    
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${((appState.currentQuestionIndex + 1) / appState.questions.length) * 100}%`;
    }

    renderOptions(q);
    
    appState.selectedAnswer = null;
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('explanation-box').classList.add('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('btn-finish').classList.add('hidden');
    document.getElementById('btn-submit').classList.remove('hidden');
}

function renderOptions(question) {
    const container = document.getElementById('options-container');
    if (!container) return;
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

            appState.selectedAnswer = idx;
            document.getElementById('btn-submit').disabled = false;
        };

        container.appendChild(card);
    });
}

function submitAnswer() {
    const q = appState.questions[appState.currentQuestionIndex];
    const isCorrect = appState.selectedAnswer === q.correct;
    
    appState.answers.push({ ...q, userSelection: appState.selectedAnswer, isCorrect });
    if (isCorrect) appState.score++;

    if (appState.domainScores[q.domain]) {
        appState.domainScores[q.domain].total++;
        if (isCorrect) appState.domainScores[q.domain].correct++;
    }

    document.querySelectorAll('.option-card').forEach((card, idx) => {
        card.classList.add('pointer-events-none');
        if (idx === q.correct) card.classList.add('bg-green-50', 'border-green-500', 'dark:bg-green-900/20');
        if (idx === appState.selectedAnswer && !isCorrect) card.classList.add('bg-red-50', 'border-red-500', 'dark:bg-red-900/20');
    });

    const userText = q.options[appState.selectedAnswer];
    const correctText = q.options[q.correct];
    const expBox = document.getElementById('explanation-box');
    const docLink = q.reference_url ? 
        `<a href="${q.reference_url}" target="_blank" class="mt-3 inline-block text-orange-600 font-bold hover:underline">
            <i class="fa-solid fa-book-open mr-1"></i> Ver Documentação Oficial
         </a>` : '';

    expBox.querySelector('h4').innerHTML = isCorrect ? 
        '<i class="fa-solid fa-check"></i> Correto!' : '<i class="fa-solid fa-xmark"></i> Incorreto';
    expBox.querySelector('h4').className = isCorrect ? "font-bold text-green-600 mb-3" : "font-bold text-red-600 mb-3";
    
    let feedbackHTML = "";
    if (!isCorrect) {
        feedbackHTML += `<div class="mb-2"><strong class="text-gray-800 dark:text-gray-200">Sua resposta:</strong> <span class="text-red-600 dark:text-red-400">${userText}</span></div>`;
        feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">Resposta correta:</strong> <span class="text-green-600 dark:text-green-400">${correctText}</span></div>`;
    } else {
        feedbackHTML += `<div class="mb-3"><strong class="text-gray-800 dark:text-gray-200">Sua resposta:</strong> <span class="text-green-600 dark:text-green-400">${correctText}</span></div>`;
    }
    feedbackHTML += `<div class="pt-3 mt-2 border-t border-blue-200 dark:border-slate-600"><strong class="text-gray-800 dark:text-gray-200">Por que?</strong><br>${q.explanation}</div>`;

    document.getElementById('explanation-text').innerHTML = `${feedbackHTML} ${docLink}`;
    expBox.classList.remove('hidden');

    document.getElementById('btn-submit').classList.add('hidden');
    if (appState.currentQuestionIndex < appState.questions.length - 1) {
        document.getElementById('btn-next').classList.remove('hidden');
    } else {
        document.getElementById('btn-finish').classList.remove('hidden');
    }

    updateScoreDisplay();
    updateRadarChart();
}

// ============================================================================
// 4. SUPORTE UI & NAVEGAÇÃO
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

function nextQuestion() {
    appState.currentQuestionIndex++;
    loadQuestion();
}

function finishQuiz() {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    saveQuizResult();
    updateHistoryDisplay();
    loadLastScore();
    showResultsScreen();
}

function goHome() {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    showScreen('start');
    loadLastScore();
}

function cancelQuiz() {
    if (confirm('Sair do simulado?')) goHome();
}

// ============================================================================
// 5. RADAR CHART
// ============================================================================

function formatChartLabel(name) {
    const words = name.split(' ');
    if (words.length > 2) {
        const mid = Math.ceil(words.length / 2);
        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    return name;
}

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

function reinitializeRadarChart() {
    if (!appState.currentCertification || !window.radarChartInstance) return;
    
    const labels = appState.currentCertification.domains.map(d => formatChartLabel(d.name));
    window.radarChartInstance.data.labels = labels;
    
    const certId = appState.currentCertification.id;
    const lastResult = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}last_${certId}`));

    if (lastResult && lastResult.domainScores) {
        const data = appState.currentCertification.domains.map(d => {
            const s = lastResult.domainScores[d.id];
            return (s && s.total > 0) ? (s.correct / s.total) * 100 : 0;
        });
        window.radarChartInstance.data.datasets[0].data = data;
    } else {
        window.radarChartInstance.data.datasets[0].data = labels.map(() => 0);
    }
    
    window.radarChartInstance.update();
}

function updateRadarChart() {
    if (!window.radarChartInstance) return;
    const data = appState.currentCertification.domains.map(d => {
        const s = appState.domainScores[d.id];
        return (s && s.total > 0) ? (s.correct / s.total) * 100 : 0;
    });
    window.radarChartInstance.data.datasets[0].data = data;
    window.radarChartInstance.update();
}

// ============================================================================
// 6. PERSISTÊNCIA, GAMIFICAÇÃO E HISTÓRICO
// ============================================================================

function saveQuizResult() {
    const certId = appState.currentCertification.id;
    const pct = (appState.score / appState.questions.length) * 100;
    
    const result = {
        certId, 
        score: appState.score, 
        total: appState.questions.length,
        percentage: pct, 
        date: new Date().toISOString(),
        domainScores: appState.domainScores,
        answers: appState.answers
    };

    localStorage.setItem(`${APP_CONFIG.STORAGE_KEY}last_${certId}`, JSON.stringify(result));
    
    let history = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}history`) || "[]");
    history.push(result);
    localStorage.setItem(`${APP_CONFIG.STORAGE_KEY}history`, JSON.stringify(history.slice(-10)));

    updateGamification(pct);
}

function renderGamification() {
    const data = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}gamification`) || '{"streak":0,"badges":[]}');
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.textContent = data.streak;
}

function updateGamification(pct) {
    let data = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}gamification`) || '{"streak":0,"badges":[],"lastDate":""}');
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDate !== today) {
        data.streak++;
        data.lastDate = today;
    }

    if (pct === 100 && !data.badges.some(b => b.id === 'perfect')) {
        data.badges.push({ id: 'perfect', name: 'Gabarito', icon: 'fa-star' });
    }

    localStorage.setItem(`${APP_CONFIG.STORAGE_KEY}gamification`, JSON.stringify(data));
    renderGamification();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}history`) || "[]");

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
        
        // O índice original para clicar
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
        localStorage.removeItem(`${APP_CONFIG.STORAGE_KEY}history`);
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

// ============================================================================
// 7. EXIBIÇÃO DE RESULTADOS E RELATÓRIOS
// ============================================================================

function loadLastScore() {
    const banner = document.getElementById('last-score-banner');
    const certId = document.getElementById('certification-select')?.value;
    if (!banner || !certId) return;

    const last = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}last_${certId}`));
    
    if (last && last.percentage !== undefined) {
        banner.classList.remove('hidden');
        banner.classList.add('cursor-pointer', 'hover:bg-blue-100', 'dark:hover:bg-blue-800', 'transition-all');
        banner.onclick = () => showLastReport(certId);

        banner.innerHTML = `
            <div class="flex justify-between items-center w-full">
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
    const lastResult = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}last_${certId}`));
    if(!lastResult || !lastResult.answers) {
        alert("Os detalhes deste relatório não foram salvos anteriormente. Faça um novo simulado!");
        return;
    }

    if (typeof certificationPaths !== 'undefined') {
        appState.currentCertification = certificationPaths[lastResult.certId];
    }
    appState.score = lastResult.score;
    appState.questions = lastResult.answers; 
    appState.answers = lastResult.answers;
    appState.domainScores = lastResult.domainScores;

    showResultsScreen();
}

function showHistoricalReport(index) {
    const history = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}history`) || "[]");
    const result = history[index];
    
    if(!result || !result.answers) {
        alert("Os detalhes deste relatório não estão mais disponíveis.");
        return;
    }

    if (typeof certificationPaths !== 'undefined') {
        appState.currentCertification = certificationPaths[result.certId];
    }
    appState.score = result.score;
    appState.questions = result.answers; 
    appState.answers = result.answers;
    appState.domainScores = result.domainScores;

    showResultsScreen();
}

function showResultsScreen() {
    const total = appState.questions.length;
    const pct = (appState.score / total) * 100;
    
    document.getElementById('final-score-percent').textContent = `${pct.toFixed(0)}%`;
    document.getElementById('final-correct').textContent = appState.score;
    document.getElementById('final-incorrect').textContent = total - appState.score;

    let weakestDomain = null;
    let lowestScore = 100;

    for (const [domainId, scoreData] of Object.entries(appState.domainScores)) {
        if (scoreData.total > 0) {
            const domainPct = (scoreData.correct / scoreData.total) * 100;
            if (domainPct <= lowestScore) {
                lowestScore = domainPct;
                weakestDomain = domainId;
            }
        }
    }

    const domainName = getDomainName(weakestDomain) || "Tópicos Gerais";
    const recText = document.getElementById('recommendation-text');

    if (pct >= 85) {
        recText.innerHTML = `<strong>Excelente desempenho!</strong> Você demonstrou um domínio profundo. Se quiser alcançar a perfeição, faça uma revisão rápida em: <em>${domainName}</em>.`;
    } else if (pct >= APP_CONFIG.PASSING_SCORE) {
        recText.innerHTML = `<strong>Parabéns, você passou!</strong> Para aumentar sua segurança para o exame real, concentre seus estudos finais no domínio: <em>${domainName}</em>.`;
    } else {
        recText.innerHTML = `<strong>Não desanime!</strong> Sua maior oportunidade de melhoria está no domínio: <em>${domainName}</em>. Revise a documentação oficial sobre esse tema e tente novamente.`;
    }

    renderDetailedReport();
    showScreen('results');
}

function renderDetailedReport() {
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

    const total = appState.questions.length;
    const pct = (appState.score / total) * 100;
    const recText = document.getElementById('recommendation-text')?.innerHTML || '';

    let html = `
        <div class="hidden print:block mb-8 border-b-2 border-black pb-6">
            <h2 class="text-3xl font-bold mb-4 print-text-black">Relatório Oficial - Simulado AWS</h2>
            <p class="text-xl mb-4 print-text-black"><strong>Pontuação Final:</strong> ${pct.toFixed(0)}% (${appState.score} acertos de ${total})</p>
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
    
    appState.answers.forEach((ans, index) => {
        const userText = ans.options[ans.userSelection];
        const correctText = ans.options[ans.correct];
        const isRight = ans.isCorrect;
        
        const colorClass = isRight ? "print-text-green text-green-600 dark:text-green-400" : "print-text-red text-red-600 dark:text-red-400";
        const icon = isRight ? "✅" : "❌";

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
                
                ${!isRight ? `
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

function generatePerformanceReport() {
    window.print();
}

// ============================================================================
// 8. UTILITÁRIOS GERAIS
// ============================================================================

function updateTopicDropdown() {
    const topicSelect = document.getElementById('topic-filter');
    if (!topicSelect || topicSelect.tagName !== 'SELECT' || !appState.currentCertification) {
        return; 
    }

    topicSelect.innerHTML = '<option value="">Todos os Tópicos</option>';

    appState.currentCertification.domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain.id;
        option.textContent = domain.name;
        topicSelect.appendChild(option);
    });
}

function shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function shuffleQuestionOptions(q) {
    let opts = q.options.map((t, i) => ({ t, isCorrect: i === q.correct }));
    opts = shuffleArray(opts);
    return { ...q, options: opts.map(o => o.t), correct: opts.findIndex(o => o.isCorrect) };
}

function getDomainName(id) {
    return appState.currentCertification?.domains.find(d => d.id === id)?.name || id;
}

function updateScoreDisplay() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = `${appState.score} / ${appState.answers.length}`;
}

function startTimer() {
    if (appState.timerInterval) clearInterval(appState.timerInterval);
    appState.timerInterval = setInterval(() => {
        if (appState.isPaused) return;
        appState.timeRemaining--;
        const min = Math.floor(appState.timeRemaining / 60);
        const sec = appState.timeRemaining % 60;
        const el = document.getElementById('timer-text');
        if (el) el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        if (appState.timeRemaining <= 0) finishQuiz();
    }, 1000);
}

function initTheme() {
    const theme = localStorage.getItem('aws_sim_theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('aws_sim_theme', isDark ? 'dark' : 'light');
}

function retakeQuiz() {
    goHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Placeholders para evitar erros se não implementados
function checkMistakes() {}
function updateFlagUI() {}