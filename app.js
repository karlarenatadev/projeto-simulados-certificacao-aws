/**
 * APP.JS - Lógica Principal da Aplicação
 * 
 * Gerencia o fluxo completo do simulador: seleção de certificação, quiz, 
 * análise de desempenho, persistência de dados e geração de relatórios.
 * 
 * Arquitetura: Separação de responsabilidades com funções puras e estado centralizado.
 */

// ============================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================================

let appState = {
  currentCertification: null,    // Certificação selecionada
  questions: [],                 // Questões do quiz atual
  currentQuestionIndex: 0,       // Índice da questão atual
  selectedAnswer: null,          // Resposta selecionada pelo utilizador
  answers: [],                   // Histórico de respostas
  score: 0,                      // Pontuação atual
  domainScores: {},              // Pontuação por domínio
  quizStartTime: null,           // Timestamp de início do quiz
  timerInterval: null,           // Referência do intervalo do timer
  timeRemaining: 15 * 60,        // Tempo restante em segundos (15 minutos)
  quizMode: 'exam'               // Modo do quiz: 'exam' ou 'study'
};

// ============================================================================
// CONSTANTES DE CONFIGURAÇÃO
// ============================================================================

const CONFIG = {
  QUIZ_DURATION: 15 * 60,        // Duração do quiz em segundos
  QUESTIONS_PER_QUIZ: 10,        // Número de questões por simulado
  PASSING_SCORE: 70,             // Pontuação mínima para aprovação (%)
  STORAGE_KEY_PREFIX: 'aws_sim_' // Prefixo para chaves do localStorage
};

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

/**
 * Inicializa a aplicação quando o DOM estiver pronto
 * Carrega dados persistidos e configura o gráfico radar
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeRadarChart();
  loadLastScore();
  updateHistoryDisplay();
  
  // Event listener para mudança de certificação (atualiza última pontuação)
  const certSelect = document.getElementById('certification-select');
  if (certSelect) {
    certSelect.addEventListener('change', () => {
      loadLastScore();
    });
  }
});

// ============================================================================
// GESTÃO DE ECRÃS E NAVEGAÇÃO
// ============================================================================

/**
 * Alterna entre os diferentes ecrãs da aplicação
 * @param {string} screenName - Nome do ecrã a exibir ('start', 'quiz', 'results')
 */
function showScreen(screenName) {
  const screens = {
    start: document.getElementById('screen-start'),
    quiz: document.getElementById('screen-quiz'),
    results: document.getElementById('screen-results')
  };
  
  // Esconde todos os ecrãs
  Object.values(screens).forEach(screen => {
    if (screen) {
      screen.classList.add('hidden');
      screen.classList.remove('flex', 'flex-col');
    }
  });
  
  // Mostra o ecrã solicitado com animação
  const targetScreen = screens[screenName];
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('flex', 'flex-col', 'fade-in');
  }
}

/**
 * Retorna ao ecrã inicial e reseta o estado
 */
function goHome() {
  resetAppState();
  showScreen('start');
  updateScoreDisplay();
  updateDynamicInsight('Comece o simulado para que a IA mapeie seu perfil de conhecimento.');
}

// ============================================================================
// GESTÃO DO QUIZ
// ============================================================================

/**
 * Inicia um novo quiz
 * Carrega questões aleatórias e inicializa o timer (se modo exame)
 * SEGURANÇA: Valida inputs do utilizador e existência de questões
 */
function startQuiz() {
  // Captura seleção de certificação do dropdown
  const certSelect = document.getElementById('certification-select');
  const selectedCertId = certSelect ? certSelect.value : 'clf-c02';
  
  // Captura modo de simulação (exame ou estudo)
  const modeExam = document.getElementById('mode-exam');
  const modeStudy = document.getElementById('mode-study');
  const quizMode = modeStudy && modeStudy.checked ? 'study' : 'exam';
  
  // VALIDAÇÃO: Verifica se a certificação existe
  if (!certificationPaths[selectedCertId]) {
    alert('Erro: Certificação selecionada não encontrada. Por favor, recarregue a página.');
    console.error(`Certificação inválida: ${selectedCertId}`);
    return;
  }
  
  // Carrega certificação e questões
  appState.currentCertification = certificationPaths[selectedCertId];
  appState.questions = getRandomQuestions(selectedCertId, CONFIG.QUESTIONS_PER_QUIZ);
  
  // VALIDAÇÃO CRÍTICA: Verifica se há questões disponíveis
  if (!appState.questions || appState.questions.length === 0) {
    alert(`Erro: Nenhuma questão disponível para ${appState.currentCertification.name}. Por favor, contacte o administrador.`);
    console.error(`Banco de questões vazio para: ${selectedCertId}`);
    return;
  }
  
  // Inicializa estado do quiz
  appState.currentQuestionIndex = 0;
  appState.answers = [];
  appState.score = 0;
  appState.domainScores = {};
  appState.quizStartTime = Date.now();
  appState.timeRemaining = CONFIG.QUIZ_DURATION;
  appState.quizMode = quizMode;
  
  // Inicializa pontuações por domínio
  appState.currentCertification.domains.forEach(domain => {
    appState.domainScores[domain.id] = { correct: 0, total: 0 };
  });
  
  showScreen('quiz');
  
  // Inicia timer APENAS se for modo exame
  if (quizMode === 'exam') {
    startTimer();
  }
  
  // Reconfigura gráfico radar com domínios da certificação selecionada
  reinitializeRadarChart();
  
  loadQuestion();
  updateScoreDisplay();
}

/**
 * Carrega e exibe a questão atual
 * SEGURANÇA: Usa textContent para prevenir XSS
 */
function loadQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];
  if (!question) return;
  
  // Atualiza informações da questão usando textContent
  const categoryElement = document.getElementById('question-category');
  const questionTextElement = document.getElementById('question-text');
  const currentQNumElement = document.getElementById('current-q-num');
  const totalQNumElement = document.getElementById('total-q-num');
  
  if (categoryElement) {
    categoryElement.textContent = getDomainName(question.domain);
  }
  
  if (questionTextElement) {
    // SEGURANÇA: Usa textContent em vez de innerHTML
    questionTextElement.textContent = question.question;
  }
  
  if (currentQNumElement) {
    currentQNumElement.textContent = appState.currentQuestionIndex + 1;
  }
  
  if (totalQNumElement) {
    totalQNumElement.textContent = appState.questions.length;
  }
  
  // Atualiza barra de progresso
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const progress = ((appState.currentQuestionIndex + 1) / appState.questions.length) * 100;
    progressBar.style.width = `${progress}%`;
  }
  
  // Renderiza opções de resposta
  renderOptions(question);
  
  // Reseta estado da questão
  appState.selectedAnswer = null;
  const btnSubmit = document.getElementById('btn-submit');
  const explanationBox = document.getElementById('explanation-box');
  const btnNext = document.getElementById('btn-next');
  const btnFinish = document.getElementById('btn-finish');
  
  if (btnSubmit) btnSubmit.disabled = true;
  if (explanationBox) explanationBox.classList.add('hidden');
  if (btnNext) btnNext.classList.add('hidden');
  if (btnFinish) btnFinish.classList.add('hidden');
  if (btnSubmit) btnSubmit.classList.remove('hidden');
}

/**
 * Renderiza as opções de resposta para a questão atual
 * SEGURANÇA: Usa textContent para prevenir XSS
 * @param {Object} question - Objeto da questão
 */
function renderOptions(question) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  
  question.options.forEach((option, index) => {
    const optionCard = document.createElement('div');
    optionCard.className = 'option-card p-4 rounded-lg flex items-start gap-3';
    optionCard.setAttribute('role', 'button');
    optionCard.setAttribute('tabindex', '0');
    optionCard.setAttribute('data-index', index);
    
    // Cria estrutura do card
    const letterCircle = document.createElement('div');
    letterCircle.className = 'flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center font-bold text-gray-500';
    letterCircle.textContent = String.fromCharCode(65 + index);
    
    const optionText = document.createElement('div');
    optionText.className = 'flex-grow text-gray-700';
    // SEGURANÇA: Usa textContent em vez de innerHTML para prevenir XSS
    optionText.textContent = option;
    
    optionCard.appendChild(letterCircle);
    optionCard.appendChild(optionText);
    
    // Event listeners para seleção (mouse e teclado)
    optionCard.addEventListener('click', () => selectOption(index));
    optionCard.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectOption(index);
      }
    });
    
    container.appendChild(optionCard);
  });
}

/**
 * Seleciona uma opção de resposta
 * @param {number} index - Índice da opção selecionada
 */
function selectOption(index) {
  // Remove seleção anterior
  document.querySelectorAll('.option-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  // Adiciona seleção à opção escolhida
  const selectedCard = document.querySelector(`[data-index="${index}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
    appState.selectedAnswer = index;
    document.getElementById('btn-submit').disabled = false;
  }
}

/**
 * Submete a resposta selecionada e exibe feedback
 * SEGURANÇA: Usa textContent para prevenir XSS nas explicações
 */
function submitAnswer() {
  if (appState.selectedAnswer === null) return;
  
  const question = appState.questions[appState.currentQuestionIndex];
  const isCorrect = appState.selectedAnswer === question.correct;
  
  // Regista a resposta
  appState.answers.push({
    questionId: question.id,
    domain: question.domain,
    question: question.question,
    selectedAnswer: appState.selectedAnswer,
    correctAnswer: question.correct,
    isCorrect: isCorrect,
    explanation: question.explanation
  });
  
  // Atualiza pontuações
  if (isCorrect) {
    appState.score++;
  }
  appState.domainScores[question.domain].total++;
  if (isCorrect) {
    appState.domainScores[question.domain].correct++;
  }
  
  // Atualiza UI com feedback visual
  document.querySelectorAll('.option-card').forEach((card, index) => {
    card.classList.add('disabled');
    if (index === question.correct) {
      card.classList.add('correct');
    } else if (index === appState.selectedAnswer && !isCorrect) {
      card.classList.add('incorrect');
    }
  });
  
  // Exibe explicação usando textContent (SEGURANÇA)
  const explanationText = document.getElementById('explanation-text');
  const explanationBox = document.getElementById('explanation-box');
  
  if (explanationText && explanationBox) {
    explanationText.textContent = question.explanation;
    explanationBox.classList.remove('hidden');
  }
  
  // Atualiza botões de navegação
  const btnSubmit = document.getElementById('btn-submit');
  const btnNext = document.getElementById('btn-next');
  const btnFinish = document.getElementById('btn-finish');
  
  if (btnSubmit) btnSubmit.classList.add('hidden');
  
  const isLastQuestion = appState.currentQuestionIndex === appState.questions.length - 1;
  if (isLastQuestion) {
    if (btnFinish) btnFinish.classList.remove('hidden');
  } else {
    if (btnNext) btnNext.classList.remove('hidden');
  }
  
  // Atualiza displays em tempo real
  updateScoreDisplay();
  updateRadarChart();
  updateDynamicInsight();
}

/**
 * Avança para a próxima questão
 */
function nextQuestion() {
  appState.currentQuestionIndex++;
  loadQuestion();
}

/**
 * Finaliza o quiz e exibe resultados
 */
function finishQuiz() {
  stopTimer();
  saveQuizResult();
  showResultsScreen();
  showScreen('results');
}

/**
 * Reinicia o quiz com novas questões
 */
function retakeQuiz() {
  resetAppState();
  startQuiz();
}

/**
 * Reseta o estado da aplicação
 * SEGURANÇA: Limpa timer e reseta gráfico de forma segura
 */
function resetAppState() {
  // Limpa timer se existir
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
  }
  
  appState = {
    currentCertification: null,
    questions: [],
    currentQuestionIndex: 0,
    selectedAnswer: null,
    answers: [],
    score: 0,
    domainScores: {},
    quizStartTime: null,
    timerInterval: null,
    timeRemaining: CONFIG.QUIZ_DURATION,
    quizMode: 'exam'
  };
  
  // Reseta gráfico radar de forma segura
  if (window.radarChartInstance) {
    try {
      // Reseta para labels padrão
      window.radarChartInstance.data.labels = ['Conceitos Cloud', 'Segurança', 'Tecnologia', 'Faturamento'];
      window.radarChartInstance.data.datasets[0].data = [0, 0, 0, 0];
      window.radarChartInstance.update();
    } catch (error) {
      console.error('Erro ao resetar gráfico radar:', error);
    }
  }
}

// ============================================================================
// GESTÃO DO TIMER
// ============================================================================

/**
 * Inicia o temporizador do quiz
 * Quando o tempo acaba, finaliza automaticamente o quiz
 */
function startTimer() {
  // Cria elemento do timer no header se não existir
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
  
  // Atualiza o timer a cada segundo
  appState.timerInterval = setInterval(() => {
    appState.timeRemaining--;
    
    const minutes = Math.floor(appState.timeRemaining / 60);
    const seconds = appState.timeRemaining % 60;
    const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timer-text').textContent = timerText;
    
    // Alerta visual quando restam 2 minutos
    if (appState.timeRemaining <= 120 && appState.timeRemaining > 0) {
      timerDisplay.classList.add('bg-red-600');
      timerDisplay.classList.remove('bg-gray-700');
    }
    
    // Tempo esgotado - finaliza automaticamente
    if (appState.timeRemaining <= 0) {
      stopTimer();
      finishQuiz();
    }
  }, 1000);
}

/**
 * Para o temporizador
 */
function stopTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
  
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.classList.add('hidden');
  }
}

// ============================================================================
// GRÁFICO RADAR (Chart.js)
// ============================================================================

/**
 * Inicializa o gráfico radar de domínios
 * O gráfico é atualizado em tempo real conforme o utilizador responde
 */
function initializeRadarChart() {
  const ctx = document.getElementById('radarChart');
  if (!ctx) return;
  
  // Configuração do gráfico com tema AWS
  window.radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Conceitos Cloud', 'Segurança', 'Tecnologia', 'Faturamento'],
      datasets: [{
        label: 'Desempenho (%)',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(255, 153, 0, 0.2)',
        borderColor: 'rgba(255, 153, 0, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 153, 0, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 153, 0, 1)',
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
          min: 0,
          ticks: {
            stepSize: 25,
            callback: function(value) {
              return value + '%';
            },
            font: { size: 10 }
          },
          pointLabels: {
            font: { size: 11, weight: '600' },
            color: '#232f3e'
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
          angleLines: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.r.toFixed(0)}% de acerto`;
            }
          }
        }
      }
    }
  });
}

/**
 * Reinicializa o gráfico radar com os domínios da certificação selecionada
 * PRECISÃO: Garante que os labels correspondem exatamente aos domínios da prova
 */
function reinitializeRadarChart() {
  if (!window.radarChartInstance || !appState.currentCertification) return;
  
  const domains = appState.currentCertification.domains;
  const labels = domains.map(d => d.name);
  const dataPoints = new Array(domains.length).fill(0);
  
  // Atualiza labels e dados do gráfico
  window.radarChartInstance.data.labels = labels;
  window.radarChartInstance.data.datasets[0].data = dataPoints;
  window.radarChartInstance.update();
}

/**
 * Atualiza o gráfico radar com as pontuações atuais por domínio
 * Calcula a percentagem de acerto em cada domínio
 */
function updateRadarChart() {
  if (!window.radarChartInstance || !appState.currentCertification) return;
  
  const domains = appState.currentCertification.domains;
  const data = domains.map(domain => {
    const domainScore = appState.domainScores[domain.id];
    if (!domainScore || domainScore.total === 0) return 0;
    return (domainScore.correct / domainScore.total) * 100;
  });
  
  window.radarChartInstance.data.datasets[0].data = data;
  window.radarChartInstance.update('none'); // 'none' evita animação para melhor performance
}

// ============================================================================
// ATUALIZAÇÕES DE UI E FEEDBACK
// ============================================================================

/**
 * Atualiza o display de pontuação no header
 */
function updateScoreDisplay() {
  const display = document.getElementById('score-display');
  if (display) {
    display.textContent = `${appState.score} / ${appState.answers.length}`;
  }
}

/**
 * Atualiza o insight dinâmico da IA baseado no desempenho atual
 * Fornece feedback contextual e recomendações de estudo
 * SEGURANÇA: Usa textContent e createElement para prevenir XSS
 */
function updateDynamicInsight(customMessage = null) {
  const insightElement = document.getElementById('dynamic-insight');
  if (!insightElement) return;
  
  if (customMessage) {
    insightElement.textContent = customMessage;
    return;
  }
  
  if (appState.answers.length === 0) {
    insightElement.textContent = 'Comece o simulado para que a IA mapeie seu perfil de conhecimento.';
    return;
  }
  
  // Calcula estatísticas para gerar insight inteligente
  const totalAnswered = appState.answers.length;
  const currentScore = appState.score;
  const percentage = (currentScore / totalAnswered) * 100;
  
  // Identifica domínio mais fraco
  let weakestDomain = null;
  let lowestScore = 100;
  
  Object.entries(appState.domainScores).forEach(([domainId, scores]) => {
    if (scores.total > 0) {
      const domainPercentage = (scores.correct / scores.total) * 100;
      if (domainPercentage < lowestScore) {
        lowestScore = domainPercentage;
        weakestDomain = domainId;
      }
    }
  });
  
  // Gera mensagem contextual baseada no desempenho
  // SEGURANÇA: Usa createElement e textContent
  insightElement.innerHTML = '';
  
  let message = '';
  let statusClass = '';
  
  if (percentage >= 80) {
    statusClass = 'text-green-600';
    message = `Excelente! Você está com ${percentage.toFixed(0)}% de acerto. Continue assim!`;
  } else if (percentage >= 60) {
    statusClass = 'text-blue-600';
    message = `Bom desempenho! ${percentage.toFixed(0)}% de acerto. `;
    if (weakestDomain) {
      message += `Foque em ${getDomainName(weakestDomain)} para melhorar ainda mais.`;
    }
  } else {
    statusClass = 'text-orange-600';
    message = `Continue estudando! ${percentage.toFixed(0)}% de acerto. `;
    if (weakestDomain) {
      message += `Priorize o domínio ${getDomainName(weakestDomain)} nos seus estudos.`;
    }
  }
  
  const strong = document.createElement('strong');
  strong.className = statusClass;
  
  // Extrai primeira parte (até primeiro ponto de exclamação)
  const parts = message.split('!');
  if (parts.length > 1) {
    strong.textContent = parts[0] + '!';
    insightElement.appendChild(strong);
    insightElement.appendChild(document.createTextNode(' ' + parts.slice(1).join('!')));
  } else {
    insightElement.textContent = message;
  }
}

// ============================================================================
// ECRÃ DE RESULTADOS
// ============================================================================

/**
 * Exibe o ecrã de resultados com análise completa do desempenho
 */
function showResultsScreen() {
  const totalQuestions = appState.questions.length;
  const correctAnswers = appState.score;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const percentage = (correctAnswers / totalQuestions) * 100;
  
  // Atualiza estatísticas principais
  document.getElementById('final-score-percent').textContent = `${percentage.toFixed(0)}%`;
  document.getElementById('final-correct').textContent = correctAnswers;
  document.getElementById('final-incorrect').textContent = incorrectAnswers;
  
  // Exibe badge de melhoria (comparação com último resultado)
  showImprovementBadge(percentage);
  
  // Gera recomendação da IA
  generateAIRecommendation(percentage);
  
  // Atualiza gráfico radar final
  updateRadarChart();
}

/**
 * Exibe badge de melhoria comparando com o último resultado
 * @param {number} currentPercentage - Percentagem atual
 */
function showImprovementBadge(currentPercentage) {
  const lastResult = getLastQuizResult();
  const badge = document.getElementById('improvement-badge');
  
  if (!lastResult || !badge) return;
  
  const lastPercentage = lastResult.percentage;
  const difference = currentPercentage - lastPercentage;
  
  if (Math.abs(difference) < 1) {
    badge.innerHTML = '<i class="fa-solid fa-minus improvement-same"></i> Desempenho mantido';
    badge.className = 'text-sm font-bold improvement-same';
  } else if (difference > 0) {
    badge.innerHTML = `<i class="fa-solid fa-arrow-up improvement-up"></i> +${difference.toFixed(0)}% vs último simulado`;
    badge.className = 'text-sm font-bold improvement-up';
  } else {
    badge.innerHTML = `<i class="fa-solid fa-arrow-down improvement-down"></i> ${difference.toFixed(0)}% vs último simulado`;
    badge.className = 'text-sm font-bold improvement-down';
  }
  
  badge.classList.remove('hidden');
}

/**
 * Gera recomendação personalizada da IA baseada no desempenho
 * @param {number} percentage - Percentagem de acerto
 */
function generateAIRecommendation(percentage) {
  const recommendationText = document.getElementById('recommendation-text');
  const studySitesContainer = document.getElementById('study-sites');
  
  if (!recommendationText || !studySitesContainer) return;
  
  let message = '';
  let weakDomains = [];
  
  // Identifica domínios fracos (abaixo de 70%)
  Object.entries(appState.domainScores).forEach(([domainId, scores]) => {
    if (scores.total > 0) {
      const domainPercentage = (scores.correct / scores.total) * 100;
      if (domainPercentage < 70) {
        weakDomains.push(domainId);
      }
    }
  });
  
  // Gera mensagem baseada no desempenho geral
  if (percentage >= CONFIG.PASSING_SCORE) {
    message = `🎉 Parabéns! Você atingiu ${percentage.toFixed(0)}% e está acima da nota de corte (${CONFIG.PASSING_SCORE}%). `;
    if (weakDomains.length > 0) {
      message += `Para garantir aprovação no exame real, revise os domínios: ${weakDomains.map(d => getDomainName(d)).join(', ')}.`;
    } else {
      message += 'Continue praticando para manter o alto desempenho!';
    }
  } else {
    message = `Você obteve ${percentage.toFixed(0)}%, abaixo da nota de corte (${CONFIG.PASSING_SCORE}%). `;
    if (weakDomains.length > 0) {
      message += `Foque seus estudos em: ${weakDomains.map(d => getDomainName(d)).join(', ')}. `;
    }
    message += 'Revise o material e refaça o simulado para melhorar sua pontuação.';
  }
  
  recommendationText.textContent = message;
  
  // Adiciona links de estudo para domínios fracos
  studySitesContainer.innerHTML = '';
  if (weakDomains.length > 0) {
    const resources = getStudyResourcesForDomains(weakDomains);
    resources.forEach(resource => {
      const link = document.createElement('a');
      link.href = resource.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = `site-link bg-${resource.color}-100 text-${resource.color}-700 hover:bg-${resource.color}-200`;
      link.innerHTML = `<i class="fa-solid ${resource.icon}"></i> ${resource.name}`;
      studySitesContainer.appendChild(link);
    });
  }
}

// ============================================================================
// PERSISTÊNCIA DE DADOS (localStorage)
// ============================================================================

/**
 * Guarda o resultado do quiz no localStorage
 * Permite rastrear histórico e progresso do utilizador
 * SEGURANÇA: Protegido contra falhas de escrita no localStorage
 */
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
    timeSpent: CONFIG.QUIZ_DURATION - appState.timeRemaining,
    quizMode: appState.quizMode
  };
  
  try {
    // Guarda último resultado da certificação
    localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}last_${certId}`, JSON.stringify(result));
    
    // Adiciona ao histórico geral
    const history = getQuizHistory();
    history.push(result);
    
    // Mantém apenas os últimos 10 resultados
    if (history.length > 10) {
      history.shift();
    }
    
    localStorage.setItem(`${CONFIG.STORAGE_KEY_PREFIX}history`, JSON.stringify(history));
  } catch (error) {
    // SEGURANÇA: Captura erros de quota excedida ou localStorage desabilitado
    console.error('Erro ao salvar resultado no localStorage:', error);
    // Não bloqueia a aplicação - continua funcionando sem persistência
  }
}

/**
 * Obtém o último resultado de uma certificação específica
 * SEGURANÇA: Protegido contra dados corrompidos com try/catch
 * @param {string} certId - ID da certificação (opcional, usa atual se não fornecido)
 * @returns {Object|null} Último resultado ou null
 */
function getLastQuizResult(certId = null) {
  const id = certId || (appState.currentCertification ? appState.currentCertification.id : 'clf-c02');
  
  try {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}last_${id}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    // SEGURANÇA: Dados corrompidos - retorna null e limpa entrada inválida
    console.error('Erro ao ler último resultado (dados corrompidos):', error);
    try {
      localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}last_${id}`);
    } catch (e) {
      // Ignora erro de remoção
    }
    return null;
  }
}

/**
 * Obtém o histórico completo de quizzes
 * SEGURANÇA: Protegido contra dados corrompidos com try/catch
 * @returns {Array} Array de resultados
 */
function getQuizHistory() {
  try {
    const data = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}history`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    // SEGURANÇA: Dados corrompidos - retorna array vazio e limpa entrada inválida
    console.error('Erro ao ler histórico (dados corrompidos):', error);
    try {
      localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}history`);
    } catch (e) {
      // Ignora erro de remoção
    }
    return [];
  }
}

/**
 * Carrega e exibe a última pontuação no ecrã inicial
 * SEGURANÇA: Usa textContent para prevenir XSS
 */
function loadLastScore() {
  const certSelect = document.getElementById('certification-select');
  const selectedCertId = certSelect ? certSelect.value : 'clf-c02';
  const lastResult = getLastQuizResult(selectedCertId);
  const banner = document.getElementById('last-score-banner');
  
  if (lastResult && banner) {
    // SEGURANÇA: Usa textContent para partes dinâmicas
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-history mr-2';
    
    const text = document.createTextNode('Última pontuação: ');
    
    const strong = document.createElement('strong');
    strong.textContent = `${lastResult.percentage.toFixed(0)}%`;
    
    const details = document.createTextNode(` (${lastResult.score}/${lastResult.total}) - ${new Date(lastResult.date).toLocaleDateString('pt-PT')}`);
    
    banner.innerHTML = '';
    banner.appendChild(icon);
    banner.appendChild(text);
    banner.appendChild(strong);
    banner.appendChild(details);
    banner.classList.remove('hidden');
  } else if (banner) {
    banner.classList.add('hidden');
  }
}

/**
 * Atualiza o display do histórico no painel lateral
 */
function updateHistoryDisplay() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const history = getQuizHistory();
  
  if (history.length === 0) {
    historyList.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum simulado realizado ainda.</p>';
    return;
  }
  
  // Exibe os últimos 5 resultados
  const recentHistory = history.slice(-5).reverse();
  historyList.innerHTML = recentHistory.map(result => {
    const date = new Date(result.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    const passed = result.percentage >= CONFIG.PASSING_SCORE;
    const statusIcon = passed ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500';
    
    return `
      <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid ${statusIcon} text-xs"></i>
          <span class="text-xs text-gray-600">${date}</span>
        </div>
        <span class="text-sm font-bold ${passed ? 'text-green-600' : 'text-gray-600'}">${result.percentage.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
}

// ============================================================================
// GERAÇÃO DE RELATÓRIO PDF
// ============================================================================

/**
 * Gera e imprime relatório de desempenho em formato PDF
 * Usa a funcionalidade nativa de impressão do browser
 */
function generatePerformanceReport() {
  // Cria janela de impressão com conteúdo formatado
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Por favor, permita pop-ups para gerar o relatório.');
    return;
  }
  
  const totalQuestions = appState.questions.length;
  const correctAnswers = appState.score;
  const percentage = (correctAnswers / totalQuestions) * 100;
  const date = new Date().toLocaleDateString('pt-PT', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Gera HTML do relatório com estilos para impressão
  const reportHTML = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Desempenho - ${appState.currentCertification.name}</title>
      <style>
        @page { margin: 2cm; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #232f3e; 
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #ff9900; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .header h1 { color: #232f3e; margin: 0; font-size: 28px; }
        .header p { color: #666; margin: 5px 0; }
        .score-box { 
          background: #f8f9fa; 
          border: 2px solid #ff9900; 
          border-radius: 8px; 
          padding: 20px; 
          text-align: center; 
          margin: 20px 0; 
        }
        .score-box .percentage { font-size: 48px; font-weight: bold; color: #ff9900; }
        .score-box .label { font-size: 14px; color: #666; margin-top: 5px; }
        .stats { 
          display: flex; 
          justify-content: space-around; 
          margin: 20px 0; 
          padding: 15px; 
          background: #f8f9fa; 
          border-radius: 8px; 
        }
        .stat-item { text-align: center; }
        .stat-item .value { font-size: 24px; font-weight: bold; }
        .stat-item .label { font-size: 12px; color: #666; text-transform: uppercase; }
        .stat-item.correct .value { color: #22c55e; }
        .stat-item.incorrect .value { color: #ef4444; }
        .section { margin: 30px 0; page-break-inside: avoid; }
        .section h2 { 
          color: #232f3e; 
          border-bottom: 2px solid #eee; 
          padding-bottom: 10px; 
          font-size: 20px; 
        }
        .domain-scores { margin: 15px 0; }
        .domain-item { 
          display: flex; 
          justify-content: space-between; 
          padding: 10px; 
          border-bottom: 1px solid #eee; 
        }
        .domain-item:last-child { border-bottom: none; }
        .domain-name { font-weight: 600; }
        .domain-score { font-weight: bold; color: #ff9900; }
        .question-review { 
          margin: 15px 0; 
          padding: 15px; 
          border: 1px solid #eee; 
          border-radius: 8px; 
          page-break-inside: avoid; 
        }
        .question-review.correct { border-left: 4px solid #22c55e; background: #f0fdf4; }
        .question-review.incorrect { border-left: 4px solid #ef4444; background: #fef2f2; }
        .question-text { font-weight: 600; margin-bottom: 10px; }
        .answer-info { font-size: 14px; margin: 5px 0; }
        .explanation { 
          margin-top: 10px; 
          padding: 10px; 
          background: #fff; 
          border-radius: 4px; 
          font-size: 13px; 
          font-style: italic; 
        }
        .recommendation { 
          background: #fff3cd; 
          border: 1px solid #ff9900; 
          border-radius: 8px; 
          padding: 15px; 
          margin: 20px 0; 
        }
        .recommendation h3 { margin-top: 0; color: #ff9900; }
        .footer { 
          text-align: center; 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 2px solid #eee; 
          font-size: 12px; 
          color: #666; 
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatório de Desempenho</h1>
        <p><strong>${appState.currentCertification.name} (${appState.currentCertification.code})</strong></p>
        <p>${date}</p>
      </div>
      
      <div class="score-box">
        <div class="percentage">${percentage.toFixed(0)}%</div>
        <div class="label">Pontuação Final</div>
      </div>
      
      <div class="stats">
        <div class="stat-item correct">
          <div class="value">${correctAnswers}</div>
          <div class="label">Acertos</div>
        </div>
        <div class="stat-item">
          <div class="value">${totalQuestions}</div>
          <div class="label">Total</div>
        </div>
        <div class="stat-item incorrect">
          <div class="value">${totalQuestions - correctAnswers}</div>
          <div class="label">Erros</div>
        </div>
      </div>
      
      ${generateDomainScoresHTML()}
      ${generateRecommendationHTML(percentage)}
      ${generateQuestionsReviewHTML()}
      
      <div class="footer">
        <p>Relatório gerado automaticamente pelo Simulador IA AWS</p>
        <p>Este documento é apenas para fins de estudo e não representa um certificado oficial.</p>
      </div>
      
      <div class="no-print" style="text-align: center; margin: 20px 0;">
        <button onclick="window.print()" style="background: #ff9900; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
          Imprimir / Salvar como PDF
        </button>
        <button onclick="window.close()" style="background: #232f3e; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-left: 10px;">
          Fechar
        </button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(reportHTML);
  printWindow.document.close();
}

/**
 * Gera HTML das pontuações por domínio para o relatório
 * @returns {string} HTML formatado
 */
function generateDomainScoresHTML() {
  if (!appState.currentCertification) return '';
  
  const domains = appState.currentCertification.domains;
  const domainItems = domains.map(domain => {
    const scores = appState.domainScores[domain.id];
    if (!scores || scores.total === 0) {
      return `
        <div class="domain-item">
          <span class="domain-name">${domain.name}</span>
          <span class="domain-score">N/A</span>
        </div>
      `;
    }
    
    const percentage = (scores.correct / scores.total) * 100;
    return `
      <div class="domain-item">
        <span class="domain-name">${domain.name}</span>
        <span class="domain-score">${percentage.toFixed(0)}% (${scores.correct}/${scores.total})</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="section">
      <h2>Desempenho por Domínio</h2>
      <div class="domain-scores">
        ${domainItems}
      </div>
    </div>
  `;
}

/**
 * Gera HTML da recomendação da IA para o relatório
 * @param {number} percentage - Percentagem de acerto
 * @returns {string} HTML formatado
 */
function generateRecommendationHTML(percentage) {
  let message = '';
  let weakDomains = [];
  
  Object.entries(appState.domainScores).forEach(([domainId, scores]) => {
    if (scores.total > 0) {
      const domainPercentage = (scores.correct / scores.total) * 100;
      if (domainPercentage < 70) {
        weakDomains.push(domainId);
      }
    }
  });
  
  if (percentage >= CONFIG.PASSING_SCORE) {
    message = `Parabéns! Você atingiu ${percentage.toFixed(0)}% e está acima da nota de corte (${CONFIG.PASSING_SCORE}%). `;
    if (weakDomains.length > 0) {
      message += `Para garantir aprovação no exame real, revise os domínios: ${weakDomains.map(d => getDomainName(d)).join(', ')}.`;
    } else {
      message += 'Continue praticando para manter o alto desempenho!';
    }
  } else {
    message = `Você obteve ${percentage.toFixed(0)}%, abaixo da nota de corte (${CONFIG.PASSING_SCORE}%). `;
    if (weakDomains.length > 0) {
      message += `Foque seus estudos em: ${weakDomains.map(d => getDomainName(d)).join(', ')}. `;
    }
    message += 'Revise o material e refaça o simulado para melhorar sua pontuação.';
  }
  
  return `
    <div class="section">
      <div class="recommendation">
        <h3>🤖 Recomendação da IA</h3>
        <p>${message}</p>
      </div>
    </div>
  `;
}

/**
 * Gera HTML da revisão de questões para o relatório
 * @returns {string} HTML formatado
 */
function generateQuestionsReviewHTML() {
  const questionsHTML = appState.answers.map((answer, index) => {
    const question = appState.questions.find(q => q.id === answer.questionId);
    if (!question) return '';
    
    const statusClass = answer.isCorrect ? 'correct' : 'incorrect';
    const statusIcon = answer.isCorrect ? '✓' : '✗';
    const statusText = answer.isCorrect ? 'Correto' : 'Incorreto';
    
    return `
      <div class="question-review ${statusClass}">
        <div class="question-text">
          ${index + 1}. ${question.question}
        </div>
        <div class="answer-info">
          <strong>Sua resposta:</strong> ${question.options[answer.selectedAnswer]}
        </div>
        ${!answer.isCorrect ? `
          <div class="answer-info">
            <strong>Resposta correta:</strong> ${question.options[answer.correctAnswer]}
          </div>
        ` : ''}
        <div class="answer-info">
          <strong>Status:</strong> ${statusIcon} ${statusText}
        </div>
        <div class="explanation">
          <strong>Explicação:</strong> ${answer.explanation}
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="section">
      <h2>Revisão Detalhada das Questões</h2>
      ${questionsHTML}
    </div>
  `;
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Obtém o nome legível de um domínio pelo seu ID
 * @param {string} domainId - ID do domínio
 * @returns {string} Nome do domínio
 */
function getDomainName(domainId) {
  if (!appState.currentCertification) return domainId;
  
  const domain = appState.currentCertification.domains.find(d => d.id === domainId);
  return domain ? domain.name : domainId;
}

/**
 * Formata tempo em segundos para formato legível (MM:SS)
 * @param {number} seconds - Tempo em segundos
 * @returns {string} Tempo formatado
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Embaralha um array (Fisher-Yates shuffle)
 * @param {Array} array - Array a embaralhar
 * @returns {Array} Array embaralhado
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
