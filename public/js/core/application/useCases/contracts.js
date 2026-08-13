/**
 * core/application/useCases/contracts.js
 *
 * Camada de Aplicação (Use Cases / Interactors)
 *
 * Orquestra as entidades e serviços de domínio. É a ponte entre a camada
 * de apresentação (UI/React) e as regras de negócio puras (Domain).
 */

/**
 * Interface Genérica para um Caso de Uso
 */
export class UseCase {
  /**
   * @param {Object} input - DTO de entrada (Data Transfer Object)
   * @returns {Promise<Object>} Output DTO
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

// ---------------------------------------------------------
// Exemplos de Casos de Uso (Domínio de Aprendizagem)
// ---------------------------------------------------------

/**
 * Inicia uma sessão de exame/simulado.
 * Responsabilidades:
 * - Validar se o usuário tem permissão
 * - Consultar o IQuestionBankService para buscar as questões
 * - Atualizar o state via ISessionService
 */
export class StartExamUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.userId
   * @param {string} input.certificationId
   * @param {string} input.mode - 'exam', 'practice', 'study'
   * @param {Object} input.filters
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

/**
 * Retoma um exame interrompido.
 */
export class ResumeExamUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.sessionId
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

/**
 * Finaliza o simulado e submete para avaliação.
 * Responsabilidades:
 * - Avaliar as respostas via QuizEngine
 * - Salvar o histórico via DataRepository
 * - Computar Gamificação
 * - Disparar evento para o Analytics
 */
export class FinishExamUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.sessionId
   * @param {Object} input.answers
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

/**
 * Submete a resposta de uma questão específica (útil no modo Estudo Prático).
 */
export class SubmitAnswerUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.sessionId
   * @param {string} input.questionId
   * @param {string[]} input.selectedOptionIds
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

/**
 * Finaliza a montagem de arquitetura no Simulador de Casos.
 */
export class FinishCaseUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.caseId
   * @param {string[]} input.selectedServiceIds
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}

/**
 * Marca uma Pílula de Conhecimento (Sprint) como concluída.
 */
export class CompleteSprintUseCase extends UseCase {
  /**
   * @param {Object} input
   * @param {string} input.userId
   * @param {string} input.sprintId
   * @param {number} input.dayNumber
   */
  async execute(_input) {
    throw new Error("Not implemented");
  }
}
