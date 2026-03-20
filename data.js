/**
 * DATA.JS - Banco de Dados de Certificações AWS
 * 
 * Este ficheiro centraliza as trilhas de certificação e domínios oficiais AWS.
 * As questões foram migradas para ficheiros JSON na pasta data/ para melhor organização.
 */

// Definição das trilhas de certificação disponíveis
const certificationPaths = {
  'clf-c02': {
    id: 'clf-c02',
    name: 'AWS Certified Cloud Practitioner',
    code: 'CLF-C02',
    description: 'Certificação fundamental para profissionais que desejam demonstrar conhecimento geral da AWS Cloud',
    icon: 'fa-cloud',
    color: 'orange',
    dataFile: 'data/clf-c02.json', // Caminho para o ficheiro JSON
    // Domínios oficiais do exame CLF-C02 (percentagens reais da prova)
    domains: [
      { id: 'conceitos-cloud', name: 'Conceitos de Cloud', weight: 24 },
      { id: 'seguranca', name: 'Segurança e Conformidade', weight: 30 },
      { id: 'tecnologia', name: 'Tecnologia e Serviços', weight: 34 },
      { id: 'faturamento', name: 'Faturamento e Preços', weight: 12 }
    ]
  },
  'saa-c03': {
    id: 'saa-c03',
    name: 'AWS Certified Solutions Architect - Associate',
    code: 'SAA-C03',
    description: 'Certificação para arquitetos de soluções que projetam sistemas distribuídos na AWS',
    icon: 'fa-diagram-project',
    color: 'blue',
    dataFile: 'data/saa-c03.json', // Caminho para o ficheiro JSON
    // Domínios oficiais do exame SAA-C03
    domains: [
      { id: 'design-resiliente', name: 'Design de Arquiteturas Resilientes', weight: 26 },
      { id: 'design-performante', name: 'Design de Arquiteturas de Alto Desempenho', weight: 24 },
      { id: 'design-seguro', name: 'Design de Aplicações e Arquiteturas Seguras', weight: 30 },
      { id: 'design-otimizado', name: 'Design de Arquiteturas Otimizadas em Custos', weight: 20 }
    ]
  },
  'aif-c01': {
    id: 'aif-c01',
    name: 'AWS Certified AI Practitioner',
    code: 'AIF-C01',
    description: 'Certificação para profissionais que trabalham com IA e Machine Learning na AWS',
    icon: 'fa-brain',
    color: 'purple',
    dataFile: 'data/aif-c01.json', // Caminho para o ficheiro JSON
    // Domínios oficiais do exame AIF-C01
    domains: [
      { id: 'fundamentos-ia', name: 'Fundamentos de IA/ML', weight: 28 },
      { id: 'amazon-bedrock', name: 'Amazon Bedrock', weight: 32 },
      { id: 'prompt-engineering', name: 'Prompt Engineering', weight: 24 },
      { id: 'seguranca-ia', name: 'Segurança em IA', weight: 16 }
    ]
  }
};

// Recursos de estudo recomendados por domínio
const studyResources = {
  'conceitos-cloud': [
    { name: 'AWS Cloud Concepts', url: 'https://aws.amazon.com/what-is-cloud-computing/', icon: 'fa-book', color: 'blue' },
    { name: 'Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/', icon: 'fa-building-columns', color: 'purple' }
  ],
  'seguranca': [
    { name: 'AWS Security Best Practices', url: 'https://aws.amazon.com/security/best-practices/', icon: 'fa-shield-halved', color: 'red' },
    { name: 'IAM Documentation', url: 'https://docs.aws.amazon.com/iam/', icon: 'fa-user-lock', color: 'orange' }
  ],
  'tecnologia': [
    { name: 'AWS Services Overview', url: 'https://aws.amazon.com/products/', icon: 'fa-server', color: 'green' },
    { name: 'AWS Documentation', url: 'https://docs.aws.amazon.com/', icon: 'fa-file-lines', color: 'blue' }
  ],
  'faturamento': [
    { name: 'AWS Pricing', url: 'https://aws.amazon.com/pricing/', icon: 'fa-dollar-sign', color: 'green' },
    { name: 'Cost Optimization', url: 'https://aws.amazon.com/pricing/cost-optimization/', icon: 'fa-chart-line', color: 'purple' }
  ],
  'design-resiliente': [
    { name: 'High Availability Architecture', url: 'https://aws.amazon.com/architecture/', icon: 'fa-diagram-project', color: 'blue' }
  ],
  'design-performante': [
    { name: 'Performance Efficiency Pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/', icon: 'fa-gauge-high', color: 'green' }
  ],
  'design-seguro': [
    { name: 'Security Pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/', icon: 'fa-lock', color: 'red' }
  ],
  'design-otimizado': [
    { name: 'Cost Optimization Pillar', url: 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/', icon: 'fa-coins', color: 'yellow' }
  ],
  'fundamentos-ia': [
    { name: 'AWS AI/ML Services', url: 'https://aws.amazon.com/machine-learning/', icon: 'fa-robot', color: 'purple' },
    { name: 'Machine Learning Basics', url: 'https://aws.amazon.com/what-is/machine-learning/', icon: 'fa-brain', color: 'blue' }
  ],
  'amazon-bedrock': [
    { name: 'Amazon Bedrock Documentation', url: 'https://docs.aws.amazon.com/bedrock/', icon: 'fa-book', color: 'purple' },
    { name: 'Bedrock Guardrails', url: 'https://aws.amazon.com/bedrock/guardrails/', icon: 'fa-shield', color: 'red' }
  ],
  'prompt-engineering': [
    { name: 'Prompt Engineering Guide', url: 'https://www.promptingguide.ai/', icon: 'fa-wand-magic-sparkles', color: 'purple' }
  ],
  'seguranca-ia': [
    { name: 'AI Security Best Practices', url: 'https://aws.amazon.com/ai/responsible-ai/', icon: 'fa-lock', color: 'red' }
  ]
};

// Mapeia certificações para seus bancos de questões
const questionBanks = {
  'clf-c02': questionsClf,
  'saa-c03': questionsSaa,
  'aif-c01': questionsAif
};

/**
 * Obtém questões aleatórias para uma certificação específica
 * @param {string} certId - ID da certificação
 * @param {number} count - Número de questões desejadas
 * @returns {Array} Array de questões embaralhadas
 */
function getRandomQuestions(certId, count) {
  const bank = questionBanks[certId] || [];
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Obtém recursos de estudo para domínios específicos
 * @param {Array} domains - Array de IDs de domínios
 * @returns {Array} Array de recursos únicos
 */
function getStudyResourcesForDomains(domains) {
  const resources = [];
  const seen = new Set();
  
  domains.forEach(domainId => {
    const domainResources = studyResources[domainId] || [];
    domainResources.forEach(resource => {
      if (!seen.has(resource.url)) {
        seen.add(resource.url);
        resources.push(resource);
      }
    });
  });
  
  return resources;
}
