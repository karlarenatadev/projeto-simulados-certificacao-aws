/**
 * core/domain/ai/models.js
 *
 * Contratos e Modelos do Domínio de Inteligência Artificial
 */

/**
 * @typedef {Object} ExplanationContext
 * @property {string} questionId - ID da questão que o aluno errou
 * @property {string[]} selectedOptionIds - IDs das alternativas marcadas pelo aluno
 * @property {string[]} correctOptionIds - IDs das alternativas corretas
 * @property {string} userProficiencyLevel - Nível atual de proficiência do usuário (ex: 'beginner', 'advanced')
 * @property {Object} pastMistakes - Contexto de erros anteriores do aluno neste mesmo domínio
 */

/**
 * @typedef {Object} StudyPlanContext
 * @property {string} userId
 * @property {string} certificationId
 * @property {number} availableTimeMinutesPerDay
 * @property {Object} domainProficiencies - Mapeamento { domainId: score } indicando pontos fortes e fracos
 * @property {Date} targetExamDate - Data alvo do exame (opcional)
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} id
 * @property {string} type - 'review_topic', 'take_quiz', 'read_resource', 'do_case'
 * @property {string} targetId - ID do recurso alvo (ex: ID de um tópico ou case)
 * @property {string} rationale - Texto justificando por que a IA recomendou isso (ex: "Notamos que você errou 3 questões seguidas sobre S3...")
 * @property {number} priorityScore - 0 a 100
 */
