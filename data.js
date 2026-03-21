/**
 * DATA.JS - Banco de Dados de Certificações AWS
 */

const certificationPaths = {
  'clf-c02': {
    id: 'clf-c02',
    name: 'AWS Certified Cloud Practitioner',
    code: 'CLF-C02',
    description: 'Conhecimento fundamental da AWS Cloud.',
    icon: 'fa-cloud',
    color: 'orange',
    dataFile: 'data/clf-c02.json',
    domains: [
      { id: 'conceitos-cloud', name: 'Conceitos de Cloud', weight: 24 },
      { id: 'seguranca', name: 'Segurança e Conformidade', weight: 30 },
      { id: 'tecnologia', name: 'Tecnologia e Serviços', weight: 34 },
      { id: 'faturamento', name: 'Faturamento e Preços', weight: 12 }
    ]
  },
  'saa-c03': {
    id: 'saa-c03',
    name: 'AWS Certified Solutions Architect Associate',
    code: 'SAA-C03',
    description: 'Arquitetura de sistemas distribuídos.',
    icon: 'fa-diagram-project',
    color: 'blue',
    dataFile: 'data/saa-c03.json',
    domains: [
      { id: 'design-resiliente', name: 'Design Resiliente', weight: 26 },
      { id: 'design-performance', name: 'Design de Alta Performance', weight: 24 },
      { id: 'seguranca-aplicacoes', name: 'Arquiteturas Seguras', weight: 30 },
      { id: 'design-custo', name: 'Otimização de Custo', weight: 20 }
    ]
  },
  'aif-c01': {
    id: 'aif-c01',
    name: 'AWS Certified AI Practitioner',
    code: 'AIF-C01',
    description: 'IA e Machine Learning na AWS.',
    icon: 'fa-brain',
    color: 'purple',
    dataFile: 'data/aif-c01.json',
    domains: [
      { id: 'conceitos-ia', name: 'Fundamentos de IA/ML', weight: 28 },
      { id: 'ia-generativa', name: 'IA Generativa e LLMs', weight: 32 },
      { id: 'seguranca-ia', name: 'Segurança em IA', weight: 24 },
      { id: 'implementacao-ia', name: 'Implementação de Soluções', weight: 16 }
    ]
  },
  'dva-c02': {
    id: 'dva-c02',
    name: 'AWS Certified Developer Associate',
    code: 'DVA-C02',
    description: 'Desenvolvimento e manutenção de aplicações.',
    icon: 'fa-code',
    color: 'green',
    dataFile: 'data/dva-c02.json',
    domains: [
      { id: 'desenvolvimento-servicos', name: 'Desenv. com Serviços AWS', weight: 32 },
      { id: 'seguranca-app', name: 'Segurança de Aplicações', weight: 26 },
      { id: 'implementacao', name: 'Implementação e Deployment', weight: 24 },
      { id: 'resolucao-problemas', name: 'Monitorização e Otimização', weight: 18 }
    ]
  }
};

const studyResources = {
  'desenvolvimento-servicos': [
    { name: 'DynamoDB Guide', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/', icon: 'fa-database', color: 'blue' },
    { name: 'Lambda Developer Guide', url: 'https://docs.aws.amazon.com/lambda/latest/dg/', icon: 'fa-bolt', color: 'orange' }
  ],
  'seguranca-app': [
    { name: 'AWS KMS Documentation', url: 'https://docs.aws.amazon.com/kms/', icon: 'fa-key', color: 'red' },
    { name: 'Secrets Manager Guide', url: 'https://docs.aws.amazon.com/secretsmanager/', icon: 'fa-user-shield', color: 'orange' }
  ],
  // ... (mantenha os outros recursos de estudo que você já tinha)
};

function getStudyResourcesForDomains(domains) {
  const resources = [];
  const seen = new Set();
  domains.forEach(domainId => {
    (studyResources[domainId] || []).forEach(res => {
      if (!seen.has(res.url)) { seen.add(res.url); resources.push(res); }
    });
  });
  return resources;
}