/**
 * DATA.JS - Banco de Dados de Certificações AWS
 * Agora configurado como Módulo ES6.
 */

export const certificationPaths = {
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
      { id: 'fundamentals-ai-ml', name: 'Fundamentos de IA e ML', weight: 20 },
      { id: 'fundamentals-genai', name: 'Fundamentos de IA Generativa', weight: 24 },
      { id: 'applications-foundation-models', name: 'Aplicações de Modelos de Fundação', weight: 28 },
      { id: 'guidelines-responsible-ai', name: 'Diretrizes para IA Responsável', weight: 14 },
      { id: 'security-compliance-governance', name: 'Segurança, Conformidade e Governança', weight: 14 }
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
  'conceitos-cloud': [
    { name: 'O que é a Computação em Nuvem?', url: 'https://aws.amazon.com/pt/what-is-cloud-computing/', icon: 'fa-cloud', color: 'orange' },
    { name: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/pt/architecture/well-architected/', icon: 'fa-building', color: 'blue' }
  ],
  'seguranca': [
    { name: 'Modelo de Responsabilidade Compartilhada', url: 'https://aws.amazon.com/pt/compliance/shared-responsibility-model/', icon: 'fa-handshake', color: 'green' },
    { name: 'Documentação do AWS IAM', url: 'https://docs.aws.amazon.com/iam/', icon: 'fa-user-shield', color: 'orange' }
  ],
  'tecnologia': [
    { name: 'Visão Geral dos Serviços AWS', url: 'https://d1.awsstatic.com/whitepapers/aws-overview.pdf', icon: 'fa-book', color: 'blue' },
    { name: 'Guia do Usuário do Amazon EC2', url: 'https://docs.aws.amazon.com/ec2/', icon: 'fa-server', color: 'orange' }
  ],
  'faturamento': [
    { name: 'Preços da AWS', url: 'https://aws.amazon.com/pt/pricing/', icon: 'fa-money-bill-wave', color: 'green' },
    { name: 'AWS Cost Management', url: 'https://aws.amazon.com/pt/aws-cost-management/', icon: 'fa-chart-pie', color: 'purple' }
  ],
  'desenvolvimento-servicos': [
    { name: 'DynamoDB Guide', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/', icon: 'fa-database', color: 'blue' },
    { name: 'Lambda Developer Guide', url: 'https://docs.aws.amazon.com/lambda/latest/dg/', icon: 'fa-bolt', color: 'orange' }
  ],
  'seguranca-app': [
    { name: 'AWS KMS Documentation', url: 'https://docs.aws.amazon.com/kms/', icon: 'fa-key', color: 'red' },
    { name: 'Secrets Manager Guide', url: 'https://docs.aws.amazon.com/secretsmanager/', icon: 'fa-user-shield', color: 'orange' }
  ],
  'fundamentals-ai-ml': [
    { name: 'O que é Machine Learning?', url: 'https://aws.amazon.com/pt/what-is/machine-learning/', icon: 'fa-brain', color: 'purple' },
    { name: 'Amazon SageMaker Documentation', url: 'https://docs.aws.amazon.com/sagemaker/', icon: 'fa-robot', color: 'blue' }
  ],
  'fundamentals-genai': [
    { name: 'O que é IA Generativa?', url: 'https://aws.amazon.com/pt/what-is/generative-ai/', icon: 'fa-wand-magic-sparkles', color: 'purple' },
    { name: 'Amazon Bedrock Documentation', url: 'https://docs.aws.amazon.com/bedrock/', icon: 'fa-layer-group', color: 'orange' }
  ],
  'applications-foundation-models': [
    { name: 'Foundation Models no Amazon Bedrock', url: 'https://aws.amazon.com/pt/bedrock/foundation-models/', icon: 'fa-cubes', color: 'blue' },
    { name: 'Amazon Q Developer', url: 'https://aws.amazon.com/pt/q/developer/', icon: 'fa-code', color: 'green' }
  ],
  'guidelines-responsible-ai': [
    { name: 'IA Responsável na AWS', url: 'https://aws.amazon.com/pt/machine-learning/responsible-ai/', icon: 'fa-balance-scale', color: 'green' },
    { name: 'AWS AI Service Cards', url: 'https://aws.amazon.com/machine-learning/ai-service-cards/', icon: 'fa-file-contract', color: 'blue' }
  ],
  'security-compliance-governance': [
    { name: 'Segurança em Machine Learning', url: 'https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/security.html', icon: 'fa-shield-halved', color: 'red' },
    { name: 'AWS Governance at Scale', url: 'https://aws.amazon.com/pt/solutions/implementations/governance-at-scale/', icon: 'fa-sitemap', color: 'orange' }
  ]
};

export function getStudyResourcesForDomains(domains) {
  const resources = [];
  const seen = new Set();
  domains.forEach(domainId => {
    (studyResources[domainId] || []).forEach(res => {
      if (!seen.has(res.url)) { 
        seen.add(res.url); 
        resources.push(res); 
      }
    });
  });
  return resources;
}