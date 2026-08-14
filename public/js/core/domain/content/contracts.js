/**
 * core/domain/content/contracts.js
 *
 * Contratos e Interfaces do Domínio de Conteúdo
 */

/**
 * Interface de Acesso ao Banco de Questões
 * Responsável por expor métodos ricos de query.
 */
export class IQuestionBankService {
  /**
   * Obtém questões baseadas em filtros complexos.
   * Suporta paginação para bancos gigantes.
   * @param {Object} filters
   * @param {string} filters.certificationId
   * @param {string} [filters.domainId]
   * @param {string} [filters.difficulty]
   * @param {string[]} [filters.tags]
   * @param {number} [filters.limit]
   * @param {number} [filters.offset]
   * @returns {Promise<Question[]>}
   */
  async getQuestions(_filters) {
    throw new Error("Not implemented");
  }

  /**
   * Obtém uma questão específica pelo ID (útil para links diretos e deep-linking).
   * @param {string} questionId
   * @returns {Promise<Question|null>}
   */
  async getQuestionById(_questionId) {
    throw new Error("Not implemented");
  }
}

/**
 * Interface do Serviço de Taxonomia
 * Responsável por gerenciar os vínculos estruturais (Tags, Categorias, Competências, Certificações)
 */
export class ITaxonomyService {
  /**
   * Retorna os metadados de uma certificação específica.
   * @param {string} certId
   * @returns {Promise<Certification>}
   */
  async getCertificationTree(_certId) {
    throw new Error("Not implemented");
  }

  /**
   * Resolve e retorna competências associadas a uma certificação.
   * @param {string} certId
   * @returns {Promise<Competency[]>}
   */
  async getCompetencies(_certId) {
    throw new Error("Not implemented");
  }
}

/**
 * Interface do Serviço de Entrega de Conteúdo (Cases, Sprints, Trails)
 * Entidade responsável por servir material rico de leitura ou interação longa.
 */
export class IContentDeliveryService {
  /**
   * Obtém o plano de um Sprint.
   * @param {string} sprintId
   * @returns {Promise<Sprint>}
   */
  async getSprint(_sprintId) {
    throw new Error("Not implemented");
  }

  /**
   * Obtém um Caso de Estudo Prático.
   * @param {string} caseId
   * @returns {Promise<Case>}
   */
  async getCase(_caseId) {
    throw new Error("Not implemented");
  }

  /**
   * Obtém uma Trilha Estruturada de Aprendizagem.
   * @param {string} trailId
   * @returns {Promise<Trail>}
   */
  async getTrail(_trailId) {
    throw new Error("Not implemented");
  }
}
