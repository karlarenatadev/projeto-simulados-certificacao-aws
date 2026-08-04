/**
 * types.js
 * Modelos de Domínio baseados em JSDoc para tipagem estática e documentação.
 * Preparação para a Arquitetura Enterprise (React/TypeScript).
 */

/**
 * @typedef {Object} Session
 * @property {string} id - O ID da tentativa (attemptId).
 * @property {string} userId - ID do usuário.
 * @property {string} certId - ID da certificação.
 * @property {'exam' | 'quiz' | 'mission'} mode - O modo do simulado.
 * @property {number} startTime - Timestamp absoluto de início.
 * @property {number} timeLimit - Tempo limite em segundos.
 * @property {boolean} isPaused - Indica se a sessão está pausada.
 * @property {'active' | 'completed' | 'abandoned'} status - O status da sessão.
 */

/**
 * @typedef {Object} Question
 * @property {string} id - ID único da questão.
 * @property {string} domainId - ID do domínio (ex: aws-security).
 * @property {'easy' | 'medium' | 'hard'} difficulty - Dificuldade da questão.
 * @property {string} text - O corpo/enunciado da questão.
 * @property {string[]} options - Array com o texto das alternativas.
 * @property {number[]} correctAnswers - Array contendo os índices das alternativas corretas (suporta múltipla escolha).
 * @property {string} explanation - A explicação da resposta correta.
 */

/**
 * @typedef {Object} Result
 * @property {string} sessionId - ID da sessão originadora.
 * @property {string} certId - ID da certificação.
 * @property {number} totalQuestions - Quantidade total de questões.
 * @property {number} correctCount - Quantidade de acertos.
 * @property {number} score - Pontuação percentual.
 * @property {boolean} passed - Se o usuário atingiu a média de aprovação (ex: 70%).
 * @property {Record<string, { total: number, correct: number }>} domainScores - Pontuação dividida por domínio.
 * @property {number} timeSpent - Tempo gasto em segundos.
 * @property {number} completedAt - Timestamp absoluto da conclusão.
 */

/**
 * @typedef {Object} PracticalCase
 * @property {string} id - ID único do caso.
 * @property {string} title - Título do caso prático.
 * @property {string} scenario - Cenário descritivo do problema.
 * @property {string[]} requirements - Lista de requisitos arquiteturais.
 * @property {string} [userSubmission] - Resposta discursiva salva via auto-save.
 * @property {number} [evaluationScore] - Pontuação após avaliação.
 * @property {number} [evaluatedAt] - Timestamp de avaliação.
 */

/**
 * @typedef {Object} SprintState
 * @property {string} userId - ID do usuário atrelado à sprint.
 * @property {string} activePathId - A trilha de aprendizagem ativa.
 * @property {string[]} completedStages - Fases já concluídas com sucesso.
 * @property {string[]} unlockedStages - Fases destravadas e disponíveis.
 * @property {string} currentGoalId - O objetivo atual selecionado.
 * @property {number} streakDays - Quantidade de dias consecutivos de estudo na sprint.
 */

/**
 * @typedef {'start_quiz' | 'view_dashboard' | 'admin_panel' | 'reset_progress'} Permission
 */

/**
 * @typedef {'guest' | 'student' | 'admin'} Role
 */

/**
 * @typedef {Object} User
 * @property {string} id - ID único do usuário.
 * @property {string} name - Nome de exibição.
 * @property {string} email - Email do usuário.
 * @property {Role} role - Papel principal no sistema.
 * @property {Permission[]} permissions - Lista de permissões granulares.
 * @property {number} createdAt - Timestamp de criação.
 * @property {boolean} isShowcase - Flag indicando se é um usuário fake injetado para demo.
 */

export {};
