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
  flaggedQuestions: [],
  isPaused: false
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
  checkMistakes();
  renderGamification();
  
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

    appState.questions = shuffleArray(questionsData)
      .slice(0, Math.min(quantity, questionsData.length))
      .map(q => shuffleQuestionOptions(q));
      
    appState.currentCertification = certificationPaths[selectedCertId];
    appState.currentQuestionIndex = 0;
    appState.score = 0;
    appState.answers = [];
    appState.flaggedQuestions = [];
    appState.quizMode = quizMode;
    appState.isPaused = false;
    
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

  if (mistakesIds.length === 0) return;

  try {
    const response = await fetch(`data/${certId}.json`);
    const questionsData = await response.json();
    
    appState.questions = shuffleArray(questionsData.filter(q => mistakesIds.includes(q.id)))
      .map(q => shuffleQuestionOptions(q));
      
    appState.currentCertification = certificationPaths[certId];
    appState.currentQuestionIndex = 0;
    appState.score = 0;
    appState.answers = [];
    appState.quizMode = 'study'; 
    appState.isPaused = false;
    
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
  
  // Garante que o painel volta a aparecer se vier de uma pausa
  document.getElementById('options-container').style.display = 'flex';
  
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
    const optionCard = document.createElement('div');
    optionCard.className = 'option-card p-4 rounded-lg flex items-start gap-3';
    optionCard.setAttribute('data-index', index);
    
    const letterCircle = document.createElement('div');
    letterCircle.className = 'flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400';
    letterCircle.textContent = String.fromCharCode(65 + index);
    
    // Uso de textContent evita que tags técnicas (ex: <S3>) desapareçam
    const optionText = document.createElement('div');
    optionText.className = 'flex-grow text-gray-700 dark:text-gray-200';
    optionText.textContent = option;
    
    optionCard.appendChild(letterCircle);
    optionCard.appendChild(optionText);
    
    optionCard.addEventListener('click', () => selectOption(index));
    fragment.appendChild(optionCard);
  });
  
  container.appendChild(fragment);
}

function selectOption(index) {
  if (appState.isPaused) return; // Impede seleções durante a pausa
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
  
  // Salva todos os dados necessários para a revisão final
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

function cancelQuiz() {
  if (confirm('Tem a certeza que deseja cancelar o simulado? O seu progresso não será guardado.')) {
    stopTimer();
    goHome();
  }
}

function retakeQuiz() {
  resetAppState();
  startQuiz();
}

// ============================================================================
// 5. TEMPORIZADOR E PAUSA
// ============================================================================

function startTimer() {
  let timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) {
    const scoreDisplay = document.getElementById('score-display');
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.className = 'bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2 transition-colors';
    scoreDisplay.parentElement.insertBefore(timerDisplay, scoreDisplay);
  }
  
  timerDisplay.innerHTML = `
    <button id="btn-pause-timer" onclick="togglePause()" class="text-white hover:text-yellow-300 transition-colors outline-none mr-1" title="Pausar Simulado">
      <i id="pause-icon" class="fa-solid fa-pause"></i>
    </button>
    <i class="fa-solid fa-clock text-blue-400"></i>
    <span id="timer-text" class="min-w-[45px] inline-block text-right">15:00</span>
  `;
  
  timerDisplay.classList.remove('hidden');
  appState.isPaused = false;
  appState.timerInterval = setInterval(timerTick, 1000);
}

function timerTick() {
  appState.timeRemaining--;
  
  const minutes = Math.floor(appState.timeRemaining / 60);
  const seconds = appState.timeRemaining % 60;
  const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  document.getElementById('timer-text').textContent = timerText;
  const timerDisplay = document.getElementById('timer-display');
  
  if (appState.timeRemaining <= 120 && appState.timeRemaining > 0) {
    timerDisplay.classList.add('bg-red-600', 'warning');
    timerDisplay.classList.remove('bg-gray-700');
  }
  
  if (appState.timeRemaining <= 0) {
    stopTimer();
    finishQuiz();
  }
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

function togglePause() {
  if (appState.quizMode !== 'exam' || appState.timeRemaining <= 0) return;
  
  appState.isPaused = !appState.isPaused;
  const pauseIcon = document.getElementById('pause-icon');
  const timerDisplay = document.getElementById('timer-display');
  const questionText = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');
  const btnSubmit = document.getElementById('btn-submit');
  
  if (appState.isPaused) {
    clearInterval(appState.timerInterval);
    pauseIcon.classList.remove('fa-pause');
    pauseIcon.classList.add('fa-play');
    timerDisplay.classList.add('bg-yellow-600');
    timerDisplay.classList.remove('bg-gray-700', 'bg-red-600');
    
    questionText.dataset.originalText = questionText.textContent;
    questionText.innerHTML = '<i class="fa-solid fa-mug-hot text-orange-400 mr-2"></i> Simulado em Pausa';
    optionsContainer.style.display = 'none';
    if (btnSubmit) btnSubmit.style.display = 'none';
    
  } else {
    appState.timerInterval = setInterval(timerTick, 1000);
    pauseIcon.classList.remove('fa-play');
    pauseIcon.classList.add('fa-pause');
    timerDisplay.classList.remove('bg-yellow-600');
    
    if (appState.timeRemaining <= 120) {
      timerDisplay.classList.add('bg-red-600');
    } else {
      timerDisplay.classList.add('bg-gray-700');
    }
    
    questionText.textContent = questionText.dataset.originalText;
    optionsContainer.style.display = 'flex';
    if (btnSubmit && !btnSubmit.classList.contains('hidden')) {
      btnSubmit.style.display = 'block';
    }
  }
}

// ============================================================================
// 6. PERSISTÊNCIA E LÓGICA DE ERROS
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
  updateMistakesDatabase(certId, result.answers);
  
  updateGamification(result);
  
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
  const btnClear = document.getElementById('btn-clear-mistakes');
  
  if (mistakes.length > 0 && btn && count) {
    btn.classList.remove('hidden');
    if(btnClear) btnClear.classList.remove('hidden');
    count.textContent = mistakes.length;
  } else if (btn) {
    btn.classList.add('hidden');
    if(btnClear) btnClear.classList.add('hidden');
  }
}

function clearMistakes() {
  const certId = document.getElementById('certification-select').value;
  if (confirm('Deseja limpar a sua lista de questões erradas para esta certificação?')) {
    localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}mistakes_${certId}`);
    checkMistakes(); 
  }
}

function loadLastScore() {
  const certSelect = document.getElementById('certification-select');
  const selectedCertId = certSelect ? certSelect.value : 'clf-c02';
  try {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}last_${selectedCertId}`);
    const lastResult = data ? JSON.parse(data) : null;
    const banner = document.getElementById('last-score-banner');
    
    if (lastResult && banner) {
      banner.innerHTML = `<i class="fa-solid fa-history mr-2"></i> Última pontuação: <strong>${lastResult.percentage.toFixed(0)}%</strong> (${lastResult.score}/${lastResult.total}) - ${new Date(lastResult.date).toLocaleDateString('pt-PT')}`;
      banner.classList.remove('hidden');
    } else if (banner) {
      banner.classList.add('hidden');
    }
  } catch(e) { console.error(e); }
}

function getQuizHistory() {
  try {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}history`);
    return data ? JSON.parse(data) : [];
  } catch (error) { return []; }
}

function updateHistoryDisplay() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const history = getQuizHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum simulado realizado ainda.</p>';
    return;
  }
  
  const recentHistory = history.slice(-5).reverse();
  historyList.innerHTML = recentHistory.map(result => {
    const date = new Date(result.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    const passed = result.percentage >= CONFIG.PASSING_SCORE;
    const statusIcon = passed ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500';
    return `
      <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${statusIcon} text-xs"></i>
          <span class="text-xs text-gray-600 dark:text-gray-400">${date}</span>
        </div>
        <span class="text-sm font-bold ${passed ? 'text-green-600' : 'text-gray-500'}">${result.percentage.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (!confirm('Deseja limpar todo o histórico de simulados?')) return;
  localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}history`);
  updateHistoryDisplay();
}

// ============================================================================
// 7. UI, GRÁFICOS E UTILITÁRIOS
// ============================================================================

function initializeRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Conceitos', 'Segurança', 'Tecnologia', 'Faturamento'],
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

function updateDynamicInsight(customMessage = null) {
  const insight = document.getElementById('dynamic-insight');
  if (!insight) return;
  if (customMessage) { insight.textContent = customMessage; return; }
  if (appState.answers.length === 0) return;
  
  const pct = (appState.score / appState.answers.length) * 100;
  let msg = '';
  if (pct >= 80) msg = `Excelente! Você está com ${pct.toFixed(0)}% de acerto.`;
  else if (pct >= 60) msg = `Bom desempenho! ${pct.toFixed(0)}% de acerto.`;
  else msg = `Continue estudando! ${pct.toFixed(0)}% de acerto.`;
  insight.textContent = msg;
}

function showResultsScreen() {
  const total = appState.questions.length;
  const pct = (appState.score / total) * 100;
  document.getElementById('final-score-percent').textContent = `${pct.toFixed(0)}%`;
  document.getElementById('final-correct').textContent = appState.score;
  document.getElementById('final-incorrect').textContent = total - appState.score;
  
  const rec = document.getElementById('recommendation-text');
  if(rec) {
    rec.textContent = pct >= CONFIG.PASSING_SCORE 
      ? `🎉 Parabéns! Você atingiu ${pct.toFixed(0)}% e está acima da nota de corte (${CONFIG.PASSING_SCORE}%).`
      : `Você obteve ${pct.toFixed(0)}%, abaixo da nota de corte (${CONFIG.PASSING_SCORE}%). Revise o material.`;
  }
}

function generatePerformanceReport() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert('Ative pop-ups para gerar PDF.');
  const total = appState.questions.length;
  const pct = (appState.score / total) * 100;
  const html = `<html><body style="font-family: sans-serif; padding: 40px; color: #333;">
    <h1 style="color: #ff9900;">Relatório: ${appState.currentCertification.name}</h1>
    <h2>Pontuação Final: ${pct.toFixed(0)}% (${appState.score}/${total})</h2>
    <p>Data: ${new Date().toLocaleDateString()}</p>
    <button onclick="window.print()" style="padding: 10px 20px; background: #ff9900; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir PDF</button>
  </body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
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
    quizMode: 'exam', flaggedQuestions: [], isPaused: false
  };
}

function shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function getDomainName(id) { 
  const domain = appState.currentCertification?.domains.find(d => d.id === id);
  return domain ? domain.name : id; 
}
function updateScoreDisplay() { 
  const disp = document.getElementById('score-display');
  if(disp) disp.textContent = `${appState.score} / ${appState.answers.length}`; 
}

function toggleFlag() {
  const idx = appState.currentQuestionIndex;
  const pos = appState.flaggedQuestions.indexOf(idx);
  if (pos > -1) appState.flaggedQuestions.splice(pos, 1);
  else appState.flaggedQuestions.push(idx);
  updateFlagUI();
}

function updateFlagUI() {
  const btn = document.getElementById('btn-flag');
  if (!btn) return;
  if (appState.flaggedQuestions.includes(appState.currentQuestionIndex)) {
    btn.classList.add('text-orange-500');
    btn.classList.remove('text-gray-400');
  } else {
    btn.classList.add('text-gray-400');
    btn.classList.remove('text-orange-500');
  }
}

// ============================================================================
// 8. NOVAS FUNCIONALIDADES (BARALHAR OPÇÕES E REVISÃO IN-APP)
// ============================================================================

function shuffleQuestionOptions(question) {
  let optionsWithTracker = question.options.map((opt, index) => {
    // Apaga as letras manuais ex: "A)", "b.", "C -", para evitar repetição
    const cleanText = opt.replace(/^[a-eA-E][\.\)\-]\s*/, '');
    
    return {
      text: cleanText,
      isOriginalCorrect: index === question.correct
    };
  });
  
  optionsWithTracker = shuffleArray(optionsWithTracker);
  
  return {
    ...question,
    options: optionsWithTracker.map(o => o.text),
    correct: optionsWithTracker.findIndex(o => o.isOriginalCorrect)
  };
}

function toggleInAppReview() {
  const container = document.getElementById('in-app-review-container');
  const btn = document.getElementById('btn-toggle-review');
  if(!container || !btn) return;
  
  if (container.classList.contains('hidden')) {
    container.innerHTML = ''; 
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

// ============================================================================
// 9. SISTEMA DE GAMIFICAÇÃO (STREAKS E CONQUISTAS)
// ============================================================================

function updateGamification(result) {
  // Carrega os dados atuais ou cria um perfil novo
  let gami = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}gamification`) || '{"lastDate":null,"streak":0,"todayCount":0,"badges":[]}');
  
  // Extrai apenas a data de hoje (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0]; 
  let newBadges = [];

  // 1. LÓGICA DE OFENSIVA (STREAK)
  if (gami.lastDate === today) {
    gami.todayCount++; // Fez mais de um simulado hoje
  } else {
    if (gami.lastDate) {
      // Verifica se a última vez foi exatamente ontem
      const lastDateObj = new Date(gami.lastDate);
      const todayObj = new Date(today);
      const diffTime = Math.abs(todayObj - lastDateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        gami.streak++; // Subiu a ofensiva!
      } else {
        gami.streak = 1; // Falhou um dia, recomeça do 1
      }
    } else {
      gami.streak = 1; // Primeiro dia de sempre
    }
    gami.todayCount = 1;
    gami.lastDate = today;
  }

  // 2. LÓGICA DE MEDALHAS (BADGES)
  const addBadge = (id, name, icon, color) => {
    if (!gami.badges.find(b => b.id === id)) {
      gami.badges.push({ id, name, icon, color });
      newBadges.push(name);
    }
  };

  // Avaliar Conquistas:
  addBadge('first_step', 'Primeiro Passo', 'fa-shoe-prints', 'blue');
  
  if (gami.todayCount >= 3) {
    addBadge('marathon', 'Maratonista', 'fa-person-running', 'purple');
  }
  
  if (result.percentage === 100) {
    addBadge('perfect', 'Gabarito', 'fa-star', 'yellow');
  }
  
  if (gami.streak >= 3) {
    addBadge('streak_3', 'Em Chamas (3 Dias)', 'fa-fire-flame-curved', 'orange');
  }
  
  // Medalhas de Domínio (Ex: Acertar 100% nas questões de Segurança)
  Object.entries(result.domainScores).forEach(([domainId, scores]) => {
    if (scores.total >= 3 && scores.correct === scores.total) {
      // Pega a primeira palavra do nome do domínio
      const shortName = getDomainName(domainId).split(' ')[0];
      addBadge(`master_${domainId}`, `Mestre: ${shortName}`, 'fa-crown', 'green');
    }
  });

  // Salva no localStorage e atualiza a interface
  localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}gamification`, JSON.stringify(gami));
  renderGamification();

  // Se ganhou medalhas novas, lança um alerta após 1 segundo
  if (newBadges.length > 0) {
    setTimeout(() => {
      alert(`🏆 PARABÉNS! Nova Conquista Desbloqueada!\n\nGanhaste a(s) medalha(s): ${newBadges.join(', ')}`);
    }, 1000);
  }
}

function renderGamification() {
  const gamiData = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}gamification`);
  if (!gamiData) return;
  
  const gami = JSON.parse(gamiData);
  
  // Atualiza o número do foguinho
  const streakCounter = document.getElementById('streak-counter');
  if (streakCounter) streakCounter.textContent = gami.streak;
  
  // Atualiza as medalhas visuais
  const container = document.getElementById('badges-container');
  if (container && gami.badges.length > 0) {
    // Mapa de cores para Tailwind
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
    };

    container.innerHTML = gami.badges.map(b => `
      <div class="flex items-center gap-1.5 ${colors[b.color]} px-2.5 py-1 rounded-md border text-xs font-bold shadow-sm transition-transform hover:scale-105 cursor-default" title="${b.name}">
        <i class="fa-solid ${b.icon}"></i> <span>${b.name}</span>
      </div>
    `).join('');
  }
}