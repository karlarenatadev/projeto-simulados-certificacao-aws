/**
 * core/domain/identity/models.js
 * 
 * Contratos e Modelos do Domínio de Identidade
 * NOTA: Esta modelagem reflete o negócio de um LMS de Certificações, onde a identidade 
 * transcende o mero "controle de acesso". Aqui modelamos a jornada do usuário, seus 
 * vínculos educacionais e sua autoridade como especialista em diferentes certificações.
 */

/**
 * @typedef {Object} Profile
 * @property {string} avatarUrl
 * @property {string} bio
 * @property {string} linkedInUrl
 * @property {Object} preferences
 */

/**
 * @typedef {Object} User
 * @property {string} id - UUID do usuário
 * @property {string} name - Nome completo
 * @property {string} email - Email principal
 * @property {Profile} profile - Informações de perfil
 * @property {CertificationAssignment[]} assignments - Os papéis e escopos que o usuário exerce ativamente na plataforma
 * @property {Enrollment[]} enrollments - O progresso e matrículas do estudante
 * @property {number} createdAt - Timestamp de criação
 * @property {boolean} isShowcase - Flag indicando se é um usuário mock (apresentação)
 */

/**
 * @typedef {Object} CertificationAssignment
 * Representa a atuação explícita do usuário dentro do LMS.
 * Um mesmo usuário pode atuar como 'certification_specialist' na AWS CLF-C02
 * e ao mesmo tempo estar matriculado como 'student' na SAP-C02.
 * 
 * @property {string} id
 * @property {string} certificationId - ID da certificação alvo
 * @property {string} role - O papel exercido neste contexto ('student', 'certification_specialist', 'admin')
 * @property {string[]} permissions - Permissões específicas delegadas neste escopo
 * @property {string} scope - Contexto explícito da atuação (ex: 'certification:aws-clf-c02', 'domain:security')
 * @property {string} status - 'active', 'suspended', 'revoked'
 */

/**
 * @typedef {Object} Enrollment
 * Representa o histórico e o progresso acadêmico independente de um usuário
 * estudando para uma certificação.
 * 
 * @property {string} id - UUID da matrícula
 * @property {string} userId - UUID do usuário 
 * @property {string} certificationId - UUID da certificação
 * @property {number} enrolledAt - Timestamp da matrícula
 * @property {string} status - 'active', 'completed', 'paused'
 */

/**
 * @typedef {Object} Role
 * @property {string} id - Identificador único ('student', 'certification_specialist', 'admin')
 * @property {string} name - Nome legível
 * @property {string[]} basePermissions - Lista de permissões genéricas nativas do papel
 */

/**
 * @typedef {Object} Permission
 * @property {string} id - Identificador único (ex: 'manage_users', 'create_quiz', 'edit_explanation')
 * @property {string} description - Descrição legível do que a permissão permite
 * @property {string} module - Módulo ao qual a permissão pertence (ex: 'administration', 'learning')
 */

/**
 * @typedef {Object} Session
 * @property {string} sessionId - UUID da sessão atual
 * @property {string} userId - ID do usuário associado
 * @property {string} token - JWT ou Bearer Token
 * @property {number} expiresAt - Timestamp de expiração
 * @property {Object} deviceInfo - Metadados do dispositivo de acesso
 */
