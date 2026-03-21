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
    loadLastScore();
    updateHistoryDisplay();
    checkMistakes();
    renderGamification();

    const certSelect = document.getElementById('certification-select');
    
    // Blindagem: Garante que os dados (data.js) carregaram antes de preencher o dropdown
    const initInterval = setInterval(() => {
        if (typeof certificationPaths !== 'undefined') {
            clearInterval(initInterval);
            if (certSelect) {
                appState.currentCertification = certificationPaths[certSelect.value];
                updateTopicDropdown();
            }
        }
    }, 50);

    certSelect?.addEventListener('change', () => {
        loadLastScore();
        checkMistakes();
        const selectedId = certSelect.value;
        if (typeof certificationPaths !== 'undefined') {
            appState.currentCertification = certificationPaths[selectedId];
            reinitializeRadarChart();
            updateTopicDropdown(); // Atualiza a lista de domínios quando a prova muda
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

        // Filtro de Dificuldade
        if (difficulty !== 'all') data = data.filter(q => q.difficulty === difficulty);
        
        // Filtro de Tópico (Dropdown)
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

        // Remove o relatório anterior se houver
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
    updateFlagUI();
    
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

    // Feedback Visual nos Cards
    document.querySelectorAll('.option-card').forEach((card, idx) => {
        card.classList.add('pointer-events-none');
        if (idx === q.correct) card.classList.add('bg-green-50', 'border-green-500', 'dark:bg-green-900/20');
        if (idx === appState.selectedAnswer && !isCorrect) card.classList.add('bg-red-50', 'border-red-500', 'dark:bg-red-900/20');
    });

    // Prepara os textos para o feedback detalhado
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
    
    // Monta o feedback detalhado: Sua resposta x Resposta Correta x Por que
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
// 6. PERSISTÊNCIA & GAMIFICAÇÃO
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
        domainScores: appState.domainScores
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

// ============================================================================
// 7. RESULTADOS E RELATÓRIO PDF
// ============================================================================

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

    // Gera o relatório visual
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
        reportDiv.className = 'mt-8 mb-8 w-full max-w-3xl text-left bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-md border border-gray-200 dark:border-slate-700';
        resultsScreen.insertBefore(reportDiv, buttonsContainer);
    }

    let html = `<h3 class="text-2xl font-bold mb-6 aws-text-dark dark:text-white border-b border-gray-200 dark:border-slate-700 pb-3">
                    <i class="fa-solid fa-list-check text-aws-orange mr-2"></i> Revisão do Simulado
                </h3>`;
    
    appState.answers.forEach((ans, index) => {
        const userText = ans.options[ans.userSelection];
        const correctText = ans.options[ans.correct];
        const isRight = ans.isCorrect;
        
        const icon = isRight 
            ? `<i class="fa-solid fa-check-circle text-green-500 mr-1"></i>` 
            : `<i class="fa-solid fa-times-circle text-red-500 mr-1"></i>`;

        html += `
        <div class="mb-6 pb-6 border-b border-gray-100 dark:border-slate-700 question-review">
            <p class="font-bold text-gray-800 dark:text-gray-100 mb-4 leading-relaxed">
                ${index + 1}. ${ans.question}
            </p>
            <div class="text-sm mb-2 flex items-start gap-2">
                <span class="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">Sua Resposta:</span> 
                <span class="${isRight ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}">
                    ${icon} ${userText}
                </span>
            </div>
            ${!isRight ? `
            <div class="text-sm mb-3 flex items-start gap-2">
                <span class="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">Resposta Correta:</span> 
                <span class="text-green-600 dark:text-green-400 font-medium">
                    <i class="fa-solid fa-check-circle text-green-500 mr-1"></i> ${correctText}
                </span>
            </div>` : ''}
            <div class="mt-4 bg-blue-50 dark:bg-slate-700/50 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 border-l-4 border-blue-500">
                <strong class="text-blue-800 dark:text-blue-300 block mb-1">Explicação:</strong> 
                ${ans.explanation}
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
    if (!topicSelect || !appState.currentCertification) return;

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

function loadLastScore() {
    const banner = document.getElementById('last-score-banner');
    const certId = document.getElementById('certification-select')?.value;
    const last = JSON.parse(localStorage.getItem(`${APP_CONFIG.STORAGE_KEY}last_${certId}`));
    if (last && banner) {
        banner.innerHTML = `<i class="fa-solid fa-history mr-2"></i> Última: <strong>${last.percentage.toFixed(0)}%</strong>`;
        banner.classList.remove('hidden');
    } else {
        banner?.classList.add('hidden');
    }
}

function retakeQuiz() {
    goHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Placeholders para evitar erros
function updateHistoryDisplay() {}
function checkMistakes() {}
function updateFlagUI() {}