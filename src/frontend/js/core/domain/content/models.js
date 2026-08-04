/**
 * core/domain/content/models.js
 * 
 * Contratos e Modelos do Domínio de Conteúdo (Maior ativo da plataforma)
 */

/**
 * @typedef {Object} Metadata
 * @property {string} authorId - ID do criador original
 * @property {number} createdAt - Data de criação
 * @property {number} updatedAt - Data da última atualização
 * @property {number} version - Versão do conteúdo
 * @property {string[]} tags - Tags genéricas para busca rápida
 * @property {string} status - Estado de publicação (draft, published, archived)
 */

/**
 * @typedef {Object} Competency
 * @property {string} id
 * @property {string} name - Nome da competência (ex: 'Serverless Compute')
 * @property {string} categoryId - ID da categoria a que pertence
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name - Nome da Categoria (ex: 'Cloud Computing')
 * @property {string} taxonomyId - Referência na taxonomia global
 */

/**
 * @typedef {Object} Certification
 * @property {string} id - UUID
 * @property {string} code - Código oficial (ex: 'CLF-C02')
 * @property {string} name - Nome completo da certificação
 * @property {string} provider - Provedor (ex: 'AWS', 'Azure', 'GCP')
 * @property {Domain[]} domains - Lista de domínios avaliados
 * @property {Metadata} metadata
 */

/**
 * @typedef {Object} Domain
 * @property {string} id
 * @property {string} name - Nome do domínio
 * @property {number} weight - Peso percentual do domínio na prova (0 a 1)
 */

/**
 * @typedef {Object} Resource
 * @property {string} id
 * @property {string} type - Tipo de recurso ('link', 'video', 'pdf', 'image')
 * @property {string} url - URL para o recurso
 * @property {string} title - Título descritivo
 */

/**
 * @typedef {Object} Explanation
 * @property {string} text - Texto explicativo detalhado
 * @property {Resource[]} resources - Recursos adicionais para estudo (Documentação oficial, etc)
 */

/**
 * @typedef {Object} QuestionOption
 * @property {string} text - Texto da alternativa
 * @property {string} [id] - Opcional identificador
 */

/**
 * @typedef {Object} Question
 * @property {string} id - UUID da questão
 * @property {string} text - Enunciado principal
 * @property {string} certificationId - Referência cruzada para a certificação
 * @property {string} domainId - Referência cruzada para o domínio testado
 * @property {string[]} competencyIds - Referências para as competências testadas
 * @property {string} type - 'multiple_choice' ou 'multiple_response'
 * @property {QuestionOption[]} options - As alternativas disponíveis
 * @property {number[]} correctOptionIndexes - Índices (ou IDs) das alternativas corretas
 * @property {Explanation} explanation - Explicação vinculada
 * @property {string} difficulty - 'easy', 'medium', 'hard'
 * @property {Metadata} metadata
 */

/**
 * @typedef {Object} Case
 * @property {string} id
 * @property {string} title - Título do caso prático
 * @property {string} scenario - Texto com o cenário da arquitetura
 * @property {string} certificationId
 * @property {Object} constraints - Limitações e requisitos de negócio/técnicos
 * @property {Metadata} metadata
 */

/**
 * @typedef {Object} Sprint
 * @property {string} id
 * @property {string} certificationId
 * @property {number} durationDays - Duração padrão do Sprint (ex: 14)
 * @property {SprintDay[]} days - Cronograma de estudo diário
 * @property {Metadata} metadata
 */

/**
 * @typedef {Object} Trail
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string[]} certificationIds - Certificações contempladas nesta trilha
 * @property {Metadata} metadata
 */
