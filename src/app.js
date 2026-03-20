/**
 * APP.JS - Lógica Principal da Aplicação
 * Gerencia o fluxo completo do simulador: seleção de certificação, quiz, 
 * análise de desempenho, persistência de dados e geração de relatórios.
 */

// ============================================================================
// 1. ESTADO GLOBAL DA APLICAÇÃO
// ============================================================================

let appState = {
  currentCertification: null,
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswer: null,
  answers: [],
  score: 0,
  domainScores: {},
  quizStartTime: null,
  timerInterval: null,
  timeRemaining: 15 * 60,
  quizMode: 'exam',
  flaggedQuestions: []
};

const CONFIG = {
  QUIZ_DURATION: 15 * 60,
  QUESTIONS_PER_QUIZ: 10,
  PASSING_SCORE: 70,
  STORAGE_KEY_PREFIX: 'aws_sim_'
};

// ============================================================================
// 2. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initializeRadarChart();
  loadLastScore();
  updateHistoryDisplay();
  checkMistakes(); // Verifica erros ao carregar a página
  
  const certSelect = document.getElementById('certification-select');
  if (certSelect) {
    certSelect.addEventListener('change', () => {
      loadLastScore();
      checkMistakes(); // Atualiza botão ao trocar de certificação
    });
  }
});

// ============================================================================
// 3. GESTÃO DE ECRÃS E NAVEGAÇÃO
// ============================================================================

function showScreen(screenName) {
  const screens = {
    start: document.getElementById('screen-start'),
    quiz: document.getElementById('screen-quiz'),
    results: document.getElementById('screen-results')
  };
  
  Object.values(screens).forEach(screen => {
    if (screen) {
      screen.classList.add('hidden');
      screen.classList.remove('flex', 'flex-col');
    }
  });
  
  const targetScreen = screens[screenName];
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('flex', 'flex-col', 'fade-in');
  }
}

function goHome() {
  resetAppState();
  showScreen('start');
  updateScoreDisplay();
  checkMistakes();
  updateDynamicInsight('Comece o simulado para que a IA mapeie seu perfil de conhecimento.');
}

// ============================================================================
// 4. GESTÃO DO QUIZ E LOGICA DE QUESTÕES
// ============================================================================

async function startQuiz() {
  const certSelect = document.getElementById('certification-select');
  const quantitySelect = document.getElementById('question-quantity');
  const difficultySelect = document.getElementById('difficulty-level');
  const topicFilterInput = document.getElementById('topic-filter');
  
  const selectedCertId = certSelect ? certSelect.value : 'clf-c02';
  const quantity = quantitySelect ? parseInt(quantitySelect.value) : CONFIG.QUESTIONS_PER_QUIZ;
  const difficulty = difficultySelect ? difficultySelect.value : 'all';
  const filterText = topicFilterInput ? topicFilterInput.value.toLowerCase().trim() : '';
  const quizMode = document.getElementById('mode-study')?.checked ? 'study' : 'exam';

  const startBtn = document.getElementById('btn-start-quiz');
  
  try {
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>A preparar...';

    const response = await fetch(`data/${selectedCertId}.json`);
    if (!response.ok) throw new Error('Falha ao carregar banco de dados.');
    let questionsData = await response.json();

    if (difficulty !== 'all') {
      questionsData = questionsData.filter(q => q.difficulty === difficulty);
    }

    if (filterText) {
      questionsData = questionsData.filter(q => 
        q.question.toLowerCase().includes(filterText) || 
        q.domain.toLowerCase().includes(filterText)
      );
    }

    if (questionsData.length === 0) {
      alert('Nenhuma questão encontrada com estes filtros.');
      return;
    }

    // Baralha as questões escolhidas E as alternativas de cada uma
    appState.questions = shuffleArray(questionsData)
      .slice(0, Math.min(quantity, questionsData.length))
      .map(q => shuffleQuestionOptions(q));
      
    appState.currentCertification = certificationPaths[selectedCertId];
    appState.currentQuestionIndex = 0;
    appState.score = 0;
    appState.answers = [];
    appState.flaggedQuestions = [];
    appState.quizMode = quizMode;
    
    appState.domainScores = {};
    appState.currentCertification.domains.forEach(d => {
      appState.domainScores[d.id] = { total: 0, correct: 0 };
    });

    appState.timeRemaining = quantity * 90; 

    showScreen('quiz');
    if (quizMode === 'exam') startTimer();
    reinitializeRadarChart();
    loadQuestion();
    updateScoreDisplay();

  } catch (error) {
    console.error('Erro ao iniciar:', error);
  } finally {
    startBtn.disabled = false;
    startBtn.innerHTML = 'Iniciar Simulação <i class="fa-solid fa-arrow-right ml-2"></i>';
  }
}

async function startMistakesQuiz() {
  const certId = document.getElementById('certification-select').value;
  const mistakesIds = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}mistakes_${certId}`) || "[]");

  try {
    const response = await fetch(`data/${certId}.json`);
    const questionsData = await response.json();
    
    // Baralha as questões erradas E as alternativas
    appState.questions = shuffleArray(questionsData.filter(q => mistakesIds.includes(q.id)))
      .map(q => shuffleQuestionOptions(q));
      
    appState.currentCertification = certificationPaths[certId];
    appState.currentQuestionIndex = 0;
    appState.score = 0;
    appState.answers = [];
    appState.quizMode = 'study'; 
    
    showScreen('quiz');
    reinitializeRadarChart();
    loadQuestion();
    updateScoreDisplay();
  } catch (error) {
    console.error('Erro ao carregar revisão:', error);
  }
}

function loadQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];
  if (!question) return;
  
  document.getElementById('question-category').textContent = getDomainName(question.domain);
  document.getElementById('question-text').textContent = question.question;
  document.getElementById('current-q-num').textContent = appState.currentQuestionIndex + 1;
  document.getElementById('total-q-num').textContent = appState.questions.length;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${((appState.currentQuestionIndex + 1) / appState.questions.length) * 100}%`;
  }
  
  updateFlagUI();
  renderOptions(question);
  
  appState.selectedAnswer = null;
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('explanation-box').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-finish').classList.add('hidden');
  document.getElementById('btn-submit').classList.remove('hidden');
}

function renderOptions(question) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  
  question.options.forEach((option, index) => {
    const card = document.createElement('div');
    card.className = 'option-card p-4 rounded-lg flex items-start gap-3';
    card.setAttribute('data-index', index);
    card.innerHTML = `
      <div class="flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-500">${String.fromCharCode(65 + index)}</div>
      <div class="flex-grow text-gray-700">${option}</div>
    `;
    card.addEventListener('click', () => selectOption(index));
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

function selectOption(index) {
  document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-index="${index}"]`);
  if (card) {
    card.classList.add('selected');
    appState.selectedAnswer = index;
    document.getElementById('btn-submit').disabled = false;
  }
}

function submitAnswer() {
  if (appState.selectedAnswer === null) return;
  const question = appState.questions[appState.currentQuestionIndex];
  const isCorrect = appState.selectedAnswer === question.correct;
  
  // Salva os dados completos para a Revisão In-App funcionar
  appState.answers.push({ 
    questionId: question.id, 
    domain: question.domain, 
    isCorrect: isCorrect,
    question: question.question,
    selectedAnswer: appState.selectedAnswer,
    correctAnswer: question.correct,
    explanation: question.explanation
  });
  
  if (isCorrect) appState.score++;
  
  if (!appState.domainScores[question.domain]) appState.domainScores[question.domain] = { total: 0, correct: 0 };
  appState.domainScores[question.domain].total++;
  if (isCorrect) appState.domainScores[question.domain].correct++;
  
  document.querySelectorAll('.option-card').forEach((card, index) => {
    card.classList.add('disabled');
    if (index === question.correct) card.classList.add('correct');
    else if (index === appState.selectedAnswer && !isCorrect) card.classList.add('incorrect');
  });
  
  document.getElementById('explanation-text').textContent = question.explanation;
  document.getElementById('explanation-box').classList.remove('hidden');
  document.getElementById('btn-submit').classList.add('hidden');
  
  if (appState.currentQuestionIndex === appState.questions.length - 1) {
    document.getElementById('btn-finish').classList.remove('hidden');
  } else {
    document.getElementById('btn-next').classList.remove('hidden');
  }
  updateScoreDisplay();
  updateRadarChart();
}

function nextQuestion() {
  const quizScreen = document.getElementById('screen-quiz');
  quizScreen.classList.add('slide-out');
  
  setTimeout(() => {
    appState.currentQuestionIndex++;
    loadQuestion();
    quizScreen.classList.remove('slide-out');
    quizScreen.classList.add('slide-in');
    setTimeout(() => quizScreen.classList.remove('slide-in'), 300);
  }, 300);
}

function finishQuiz() {
  stopTimer();
  saveQuizResult(); 
  updateHistoryDisplay(); 
  showResultsScreen();
  showScreen('results');
}

// ============================================================================
// 5. PERSISTÊNCIA E LÓGICA DE ERROS
// ============================================================================

function saveQuizResult() {
  const certId = appState.currentCertification.id;
  const result = {
    certificationId: certId,
    certificationName: appState.currentCertification.name,
    date: new Date().toISOString(),
    score: appState.score,
    total: appState.questions.length,
    percentage: (appState.score / appState.questions.length) * 100,
    domainScores: appState.domainScores,
    answers: appState.answers,
    quizMode: appState.quizMode
  };
  
  localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}last_${certId}`, JSON.stringify(result));
  updateMistakesDatabase(certId, result.answers); // Atualiza os erros
  
  const history = getQuizHistory();
  history.push(result);
  if (history.length > 10) history.shift();
  localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}history`, JSON.stringify(history));
}

function updateMistakesDatabase(certId, answers) {
  const storageKey = `${CONFIG.STORAGE_KEY_PREFIX}mistakes_${certId}`;
  let mistakes = JSON.parse(localStorage.getItem(storageKey) || "[]");
  
  answers.forEach(ans => {
    if (!ans.isCorrect) {
      if (!mistakes.includes(ans.questionId)) mistakes.push(ans.questionId);
    } else {
      mistakes = mistakes.filter(id => id !== ans.questionId);
    }
  });
  localStorage.setItem(storageKey, JSON.stringify(mistakes));
}

function checkMistakes() {
  const certId = document.getElementById('certification-select')?.value;
  if (!certId) return;
  const mistakes = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}mistakes_${certId}`) || "[]");
  const btn = document.getElementById('btn-practice-mistakes');
  const count = document.getElementById('mistakes-count');
  
  if (mistakes.length > 0 && btn && count) {
    btn.classList.remove('hidden');
    count.textContent = mistakes.length;
  } else if (btn) {
    btn.classList.add('hidden');
  }
}

// ============================================================================
// 6. UI, GRÁFICOS E UTILITÁRIOS
// ============================================================================

function initializeRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Conceitos Cloud', 'Segurança', 'Tecnologia', 'Faturamento'],
      datasets: [{
        label: 'Desempenho (%)',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(255, 153, 0, 0.2)',
        borderColor: 'rgba(255, 153, 0, 1)',
        borderWidth: 2
      }]
    },
    options: { scales: { r: { beginAtZero: true, max: 100 } } }
  });
}

function reinitializeRadarChart() {
  if (!window.radarChartInstance || !appState.currentCertification) return;
  const labels = appState.currentCertification.domains.map(d => d.name);
  window.radarChartInstance.data.labels = labels;
  window.radarChartInstance.data.datasets[0].data = labels.map(() => 0);
  window.radarChartInstance.update();
}

function updateRadarChart() {
  if (!window.radarChartInstance || !appState.currentCertification) return;
  const data = appState.currentCertification.domains.map(domain => {
    const scores = appState.domainScores[domain.id];
    return scores && scores.total > 0 ? (scores.correct / scores.total) * 100 : 0;
  });
  window.radarChartInstance.data.datasets[0].data = data;
  window.radarChartInstance.update();
}

function initTheme() {
  const saved = localStorage.getItem('aws_sim_theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('aws_sim_theme', isDark ? 'dark' : 'light');
}

function resetAppState() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  appState = {
    currentCertification: null, questions: [], currentQuestionIndex: 0,
    selectedAnswer: null, answers: [], score: 0, domainScores: {},
    timerInterval: null, timeRemaining: CONFIG.QUIZ_DURATION,
    quizMode: 'exam', flaggedQuestions: []
  };
}

// Auxiliares
function shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function getDomainName(id) { 
  const domain = appState.currentCertification?.domains.find(d => d.id === id);
  return domain ? domain.name : id; 
}
function updateScoreDisplay() { 
  document.getElementById('score-display').textContent = `${appState.score} / ${appState.answers.length}`; 
}

// ============================================================================
// 7. TEMPORIZADOR (TIMER)
// ============================================================================

function startTimer() {
  let timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) {
    const scoreDisplay = document.getElementById('score-display');
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.className = 'bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2';
    timerDisplay.innerHTML = '<i class="fa-solid fa-clock text-blue-400"></i><span id="timer-text">15:00</span>';
    scoreDisplay.parentElement.insertBefore(timerDisplay, scoreDisplay);
  }
  
  timerDisplay.classList.remove('hidden');
  
  appState.timerInterval = setInterval(() => {
    appState.timeRemaining--;
    
    const minutes = Math.floor(appState.timeRemaining / 60);
    const seconds = appState.timeRemaining % 60;
    const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timer-text').textContent = timerText;
    
    // Alerta visual quando restam 2 minutos
    if (appState.timeRemaining <= 120 && appState.timeRemaining > 0) {
      timerDisplay.classList.add('bg-red-600', 'warning');
      timerDisplay.classList.remove('bg-gray-700');
    }
    
    // Tempo esgotado
    if (appState.timeRemaining <= 0) {
      stopTimer();
      finishQuiz();
    }
  }, 1000);
}

function stopTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.classList.add('hidden');
    timerDisplay.classList.remove('warning', 'bg-red-600');
    timerDisplay.classList.add('bg-gray-700');
  }
}

// ============================================================================
// 8. NOVAS FUNCIONALIDADES (BARALHAR OPÇÕES E REVISÃO IN-APP)
// ============================================================================

/**
 * Baralha as opções (A, B, C, D) de uma questão
 * e atualiza o índice da resposta correta para não perder a referência.
 */
function shuffleQuestionOptions(question) {
  let optionsWithTracker = question.options.map((opt, index) => ({
    text: opt,
    isOriginalCorrect: index === question.correct
  }));
  
  optionsWithTracker = shuffleArray(optionsWithTracker);
  
  return {
    ...question,
    options: optionsWithTracker.map(o => o.text),
    correct: optionsWithTracker.findIndex(o => o.isOriginalCorrect)
  };
}

/**
 * Gera a interface de revisão Pós-Simulado diretamente no ecrã
 */
function toggleInAppReview() {
  const container = document.getElementById('in-app-review-container');
  const btn = document.getElementById('btn-toggle-review');
  
  if (container.classList.contains('hidden')) {
    container.innerHTML = ''; // Limpa conteúdo anterior
    
    appState.answers.forEach((ans, idx) => {
      const isCorrect = ans.isCorrect;
      const statusColor = isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20';
      const icon = isCorrect ? '<i class="fa-solid fa-check text-green-500"></i>' : '<i class="fa-solid fa-xmark text-red-500"></i>';
      
      const html = `
        <div class="border-l-4 ${statusColor} p-4 rounded-r-lg shadow-sm w-full mb-4 text-left">
          <p class="font-bold text-gray-800 dark:text-gray-200 mb-2">${idx + 1}. ${ans.question}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
            <strong>Sua Resposta:</strong> ${icon} ${appState.questions[idx].options[ans.selectedAnswer]}
          </p>
          ${!isCorrect ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-2"><strong>Correta:</strong> ${appState.questions[idx].options[ans.correctAnswer]}</p>` : ''}
          <div class="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-600">
            <strong>Explicação:</strong> ${ans.explanation}
          </div>
        </div>
      `;
      container.innerHTML += html;
    });
    
    container.classList.remove('hidden');
    container.classList.add('flex');
    btn.innerHTML = '<i class="fa-solid fa-eye-slash mr-2"></i> Ocultar Revisão';
  } else {
    container.classList.add('hidden');
    container.classList.remove('flex');
    btn.innerHTML = '<i class="fa-solid fa-list-check mr-2"></i> Rever Respostas do Simulado';
  }
}

function clearMistakes() {
  const certId = document.getElementById('certification-select').value;
  if (confirm('Deseja limpar a sua lista de questões erradas para esta certificação?')) {
    localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}mistakes_${certId}`);
    checkMistakes(); // Atualiza a UI
  }
}