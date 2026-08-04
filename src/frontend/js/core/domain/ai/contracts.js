/**
 * core/domain/ai/contracts.js
 *
 * Contratos e Interfaces do Domínio de Inteligência Artificial
 */

/**
 * Serviço de Recomendação Dinâmica
 */
export class IRecommendationService {
  /**
   * Avalia o perfil do usuário e devolve ações sugeridas.
   * @param {string} userId
   * @returns {Promise<Recommendation[]>}
   */
  async getNextBestActions(userId) {
    throw new Error("Not implemented");
  }
}

/**
 * Serviço de Geração de Planos de Estudo
 */
export class IStudyPlanService {
  /**
   * Monta um plano adaptado ao usuário com base nas proficiências atuais.
   * @param {StudyPlanContext} context
   * @returns {Promise<Object>} Plano de estudo diário estruturado
   */
  async generateAdaptivePlan(context) {
    throw new Error("Not implemented");
  }
}

/**
 * Serviço de Avaliação Adaptativa (Simulados Inteligentes)
 */
export class IAdaptiveLearningService {
  /**
   * Decide a próxima questão de um simulado adaptativo baseando-se no desempenho em tempo real.
   * @param {string} sessionId
   * @param {Object} currentPerformance
   * @returns {Promise<string>} O ID da próxima questão recomendada
   */
  async getNextAdaptiveQuestion(sessionId, currentPerformance) {
    throw new Error("Not implemented");
  }
}

/**
 * Serviço de Explicações Dinâmicas (Tutor Virtual)
 */
export class IExplanationService {
  /**
   * Fornece uma explicação personalizada de por que a resposta do aluno estava incorreta,
   * adaptando o vocabulário ao nível de proficiência.
   * @param {ExplanationContext} context
   * @returns {Promise<string>} O texto explicativo adaptado gerado pela IA
   */
  async generateCustomExplanation(context) {
    throw new Error("Not implemented");
  }
}
