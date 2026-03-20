/**
 * APP.JS - Simulador de Certificações AWS 
 * Gerencia o fluxo do quiz, análise de domínios e gamificação.
 */

// ============================================================================
// 1. CONFIGURAÇÃO DE TRILHAS (DOMÍNIOS OFICIAIS)
// ============================================================================

const certificationPaths = {
  "clf-c02": {
    id: "clf-c02",
    name: "Cloud Practitioner",
    domains: [
      { id: "conceitos-cloud", name: "Conceitos Cloud" },
      { id: "seguranca", name: "Segurança e Conformidade" },
      { id: "tecnologia", name: "Tecnologia e Serviços" },
      { id: "faturamento", name: "Faturamento e Preços" }
    ]
  },
  "saa-c03": {
    id: "saa-c03",
    name: "Solutions Architect Associate",
    domains: [
      { id: "design-resiliente", name: "Design de Arq. Resilientes" },
      { id: "design-performance", name: "Arq. de Alta Performance" },
      { id: "seguranca-aplicacoes", name: "Aplicações e Arq. Seguras" },
      { id: "design-custo", name: "Arq. Otimizadas para Custo" }
    ]
  },
  "aif-c01": {
    id: "aif-c01",
    name: "AI Practitioner",
    domains: [
      { id: "conceitos-ia", name: "Fundamentos de IA/ML" },
      { id: "ia-generativa", name: "IA Generativa e LLMs" },
      { id: "seguranca-ia", name: "Segurança e Ética em IA" },
      { id: "implementacao-ia", name: "Implementação de Soluções" }
    ]
  },
  "dva-c02": {
    id: "dva-c02",
    name: "Developer Associate",
    domains: [
      { id: "desenvolvimento-servicos", name: "Desenv. com Serviços AWS" },
      { id: "implementacao", name: "Implementação e Deployment" },
      { id: "seguranca-app", name: "Segurança de Aplicações" },
      { id: "resolucao-problemas", name: "Monitorização e Otimização" }
    ]
  }
};

// ============================================================================
// 2. ESTADO GLOBAL
// ============================================================================

let appState = {
  currentCertification: null,
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswer: null,
  answers: [],
  score: 0,
  domainScores: {},
  serviceScores: {},
  tagScores: {},
  timerInterval: null,
  timeRemaining: 0,
  quizMode: 'exam',
  flaggedQuestions: [],
  isPaused: false
};

const CONFIG = {
  PASSING_SCORE: 70,
  STORAGE_KEY_PREFIX: 'aws_sim_',
  DEFAULT_CERT: 'clf-c02'
};

// ============================================================================
// 3. INICIALIZAÇÃO E NAVEGAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initializeRadarChart();
  loadLastScore();
  updateHistoryDisplay();
  checkMistakes();
  renderGamification();

  // Listener para carregar histórico quando mudar de exame no select
  const certSelect = document.getElementById('certification-select');
  certSelect?.addEventListener('change', () => {
    loadLastScore();
    checkMistakes();
  });
});

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

// ============================================================================
// 4. MOTOR DO QUIZ
// ============================================================================

async function startQuiz() {
  const selectedCertId = document.getElementById('certification-select').value;
  const quantity = parseInt(document.getElementById('question-quantity').value);
  const difficulty = document.getElementById('difficulty-level').value;
  const mode = document.querySelector('input[name="quiz-mode"]:checked').value;

  const btn = document.getElementById('btn-start-quiz');
  
  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A carregar questões...';

    // Busca o JSON gerado pelo Python
    const response = await fetch(`data/${selectedCertId}.json`);
    if (!response.ok) throw new Error('Base de dados não encontrada.');
    
    let data = await response.json();

    // Filtros
    if (difficulty !== 'all') data = data.filter(q => q.difficulty === difficulty);
    
    const topicFilter = document.getElementById('topic-filter')?.value.toLowerCase().trim();
    if (topicFilter) {
      data = data.filter(q => 
        q.question.toLowerCase().includes(topicFilter) || 
        q.service?.toLowerCase().includes(topicFilter)
      );
    }

    if (data.length === 0) {
      alert('Nenhuma questão encontrada com estes filtros. Tente reduzir as restrições.');
      return;
    }

    // Configuração do Estado do Quiz
    appState.questions = shuffleArray(data).slice(0, Math.min(quantity, data.length)).map(q => shuffleQuestionOptions(q));
    appState.currentCertification = certificationPaths[selectedCertId];
    appState.currentQuestionIndex = 0;
    appState.score = 0;
    appState.answers = [];
    appState.quizMode = mode;
    appState.timeRemaining = appState.questions.length * 90; // 90s por questão

    // Reset de pontuações analíticas
    appState.domainScores = {};
    appState.currentCertification.domains.forEach(d => appState.domainScores[d.id] = { total: 0, correct: 0 });
    appState.serviceScores = {};
    appState.tagScores = {};

    showScreen('quiz');
    if (mode === 'exam') startTimer();
    reinitializeRadarChart();
    loadQuestion();
    updateScoreDisplay();

  } catch (err) {
    alert('Erro ao carregar o simulado. Verifique se o arquivo JSON existe na pasta /data.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Iniciar Simulação <i class="fa-solid fa-arrow-right ml-2"></i>';
  }
}

function loadQuestion() {
  const q = appState.questions[appState.currentQuestionIndex];
  
  document.getElementById('question-category').textContent = getDomainName(q.domain);
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('current-q-num').textContent = appState.currentQuestionIndex + 1;
  document.getElementById('total-q-num').textContent = appState.questions.length;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) progressBar.style.width = `${((appState.currentQuestionIndex + 1) / appState.questions.length) * 100}%`;

  renderOptions(q);
  
  appState.selectedAnswer = null;
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('explanation-box').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-finish').classList.add('hidden');
  document.getElementById('btn-submit').classList.remove('hidden');
  document.getElementById('options-container').style.display = 'flex';
}

function renderOptions(question) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  
  question.options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'option-card p-4 rounded-lg flex items-start gap-3 cursor-pointer border-2 border-gray-100 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500 transition-all';
    card.innerHTML = `
      <div class="flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-500">${String.fromCharCode(65 + idx)}</div>
      <div class="flex-grow text-gray-700 dark:text-gray-200">${opt}</div>
    `;
    card.onclick = () => {
      if (document.getElementById('btn-submit').classList.contains('hidden')) return;
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected', 'border-orange-500'));
      card.classList.add('selected', 'border-orange-500');
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

  // Atualiza analítica (Domínio, Serviço, Tags)
  updateAnalytics(q, isCorrect);

  // Interface de Feedback
  document.querySelectorAll('.option-card').forEach((card, idx) => {
    card.classList.add('pointer-events-none');
    if (idx === q.correct) card.classList.add('correct', 'bg-green-50', 'border-green-500');
    if (idx === appState.selectedAnswer && !isCorrect) card.classList.add('incorrect', 'bg-red-50', 'border-red-500');
  });

  const expBox = document.getElementById('explanation-box');
  expBox.querySelector('h4').className = isCorrect ? "font-bold text-green-600 mb-1" : "font-bold text-red-600 mb-1";
  expBox.querySelector('h4').innerHTML = isCorrect ? '<i class="fa-solid fa-check"></i> Correto!' : '<i class="fa-solid fa-xmark"></i> Incorreto';
  document.getElementById('explanation-text').textContent = q.explanation;
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
// 5. ANALÍTICA E UTILITÁRIOS
// ============================================================================

function updateAnalytics(q, isCorrect) {
  const d = appState.domainScores[q.domain];
  if (d) { d.total++; if (isCorrect) d.correct++; }

  if (q.service) {
    if (!appState.serviceScores[q.service]) appState.serviceScores[q.service] = { total: 0, correct: 0 };
    appState.serviceScores[q.service].total++;
    if (isCorrect) appState.serviceScores[q.service].correct++;
  }
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

// ============================================================================
// 6. GRÁFICOS E PERSISTÊNCIA
// ============================================================================

function initializeRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: { labels: [], datasets: [{ label: 'Desempenho (%)', data: [], backgroundColor: 'rgba(255, 153, 0, 0.2)', borderColor: '#ff9900', borderWidth: 2 }] },
    options: { scales: { r: { beginAtZero: true, max: 100, ticks: { display: false } } }, plugins: { legend: { display: false } } }
  });
}

function reinitializeRadarChart() {
  if (!appState.currentCertification) return;
  window.radarChartInstance.data.labels = appState.currentCertification.domains.map(d => d.name);
  window.radarChartInstance.data.datasets[0].data = appState.currentCertification.domains.map(() => 0);
  window.radarChartInstance.update();
}

function updateRadarChart() {
  const data = appState.currentCertification.domains.map(d => {
    const s = appState.domainScores[d.id];
    return s.total > 0 ? (s.correct / s.total) * 100 : 0;
  });
  window.radarChartInstance.data.datasets[0].data = data;
  window.radarChartInstance.update();
}

// Funções de Persistência Simplificadas
function saveQuizResult() {
  const history = JSON.parse(localStorage.getItem('aws_history') || '[]');
  history.push({
    cert: appState.currentCertification.id,
    score: appState.score,
    total: appState.questions.length,
    date: new Date().toISOString()
  });
  localStorage.setItem('aws_history', JSON.stringify(history.slice(-10)));
}

function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('aws_sim_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-sun text-xl' : 'fa-solid fa-moon text-xl';
}

function initTheme() {
  if (localStorage.getItem('aws_sim_theme') === 'dark') toggleDarkMode();
}

function startTimer() {
  appState.timerInterval = setInterval(() => {
    appState.timeRemaining--;
    if (appState.timeRemaining <= 0) finishQuiz();
  }, 1000);
}

function finishQuiz() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  saveQuizResult();
  showResultsScreen();
}

function goHome() { showScreen('start'); }
function cancelQuiz() { if(confirm('Sair do simulado?')) goHome(); }
function retakeQuiz() { startQuiz(); }

// ... (Outras funções auxiliares de UI permanecem as mesmas)