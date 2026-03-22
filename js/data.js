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
      { id: 'conceitos-cloud', name: 'Domínio 1: Conceitos de nuvem', weight: 24 },
      { id: 'seguranca', name: 'Domínio 2: Segurança e conformidade', weight: 30 },
      { id: 'tecnologia', name: 'Domínio 3: Tecnologia e serviços de nuvem', weight: 34 },
      { id: 'faturamento', name: 'Domínio 4: Faturamento, definição de preço e suporte', weight: 12 }
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
      // Reordenado para seguir o guia oficial do exame SAA-C03
      { id: 'seguranca-aplicacoes', name: 'Domínio 1: Design de arquiteturas seguras', weight: 30 },
      { id: 'design-resiliente', name: 'Domínio 2: Design de arquiteturas resilientes', weight: 26 },
      { id: 'design-performance', name: 'Domínio 3: Design de arquiteturas de alta performance', weight: 24 },
      { id: 'design-custo', name: 'Domínio 4: Design de arquiteturas com otimização de custos', weight: 20 }
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
      { id: 'fundamentals-ai-ml', name: 'Domínio 1: Fundamentos de IA e ML', weight: 20 },
      { id: 'fundamentals-genai', name: 'Domínio 2: Fundamentos de IA Generativa', weight: 24 },
      { id: 'applications-foundation-models', name: 'Domínio 3: Aplicações de Modelos de Fundação', weight: 28 },
      { id: 'guidelines-responsible-ai', name: 'Domínio 4: Diretrizes para IA Responsável', weight: 14 },
      { id: 'security-compliance-governance', name: 'Domínio 5: Segurança, Conformidade e Governança para Soluções de IA', weight: 14 }
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
      { id: 'desenvolvimento-servicos', name: 'Domínio 1: Desenvolvimento com Serviços AWS', weight: 32 },
      { id: 'seguranca-app', name: 'Domínio 2: Segurança', weight: 26 },
      { id: 'implementacao', name: 'Domínio 3: Implementação (Deployment)', weight: 24 },
      { id: 'resolucao-problemas', name: 'Domínio 4: Solução de problemas e otimização', weight: 18 }
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

// Glossário de Termos AWS para Flashcards
export const glossaryTerms = [
  {
    term: "ACM (AWS Certificate Manager)",
    definition: "Serviço que provisiona, gerencia e implanta certificados SSL/TLS públicos e privados para uso com serviços AWS e recursos internos conectados."
  },
  {
    term: "AMI (Amazon Machine Image)",
    definition: "Imagem pré-configurada que contém o sistema operacional e software necessário para lançar uma instância EC2. Funciona como um template para criar servidores virtuais."
  },
  {
    term: "ASG (Auto Scaling Group)",
    definition: "Coleção de instâncias EC2 que são tratadas como um grupo lógico para fins de escalabilidade automática e gerenciamento. Ajusta automaticamente a capacidade para manter a performance e otimizar custos."
  },
  {
    term: "AZ (Availability Zone)",
    definition: "Data center isolado dentro de uma região AWS, com energia, rede e conectividade redundantes. Múltiplas AZs em uma região permitem alta disponibilidade e tolerância a falhas."
  },
  {
    term: "AWS Artifact",
    definition: "Portal de autoatendimento para acesso sob demanda a relatórios de conformidade e acordos da AWS. Fornece documentação de auditoria e certificações de segurança."
  },
  {
    term: "AWS Config",
    definition: "Serviço que avalia, audita e avalia as configurações dos recursos AWS. Monitora e registra continuamente as configurações e permite automatizar a avaliação de conformidade."
  },
  {
    term: "Amazon GuardDuty",
    definition: "Serviço de detecção de ameaças que monitora continuamente atividades maliciosas e comportamentos não autorizados para proteger contas, cargas de trabalho e dados armazenados na AWS."
  },
  {
    term: "AWS KMS (Key Management Service)",
    definition: "Serviço gerenciado que facilita a criação e o controle de chaves de criptografia usadas para proteger dados. Integra-se com outros serviços AWS para criptografia de dados."
  },
  {
    term: "Amazon Route 53",
    definition: "Serviço de DNS (Domain Name System) altamente disponível e escalável. Roteia usuários finais para aplicações da Internet traduzindo nomes de domínio em endereços IP."
  },
  {
    term: "AWS Shield",
    definition: "Serviço gerenciado de proteção contra DDoS (Distributed Denial of Service) que protege aplicações executadas na AWS. Shield Standard é automático e gratuito; Shield Advanced oferece proteção adicional."
  },
  {
    term: "AWS WAF (Web Application Firewall)",
    definition: "Firewall de aplicação web que protege aplicações contra explorações comuns da web que podem afetar disponibilidade, comprometer segurança ou consumir recursos excessivos."
  },
  {
    term: "AWS Trusted Advisor",
    definition: "Ferramenta online que fornece orientação em tempo real para ajudar a provisionar recursos seguindo as melhores práticas da AWS em otimização de custos, performance, segurança e tolerância a falhas."
  },
  {
    term: "Amazon CloudWatch",
    definition: "Serviço de monitoramento e observabilidade que fornece dados e insights acionáveis para monitorar aplicações, responder a mudanças de performance e otimizar a utilização de recursos."
  },
  {
    term: "AWS IAM (Identity and Access Management)",
    definition: "Serviço que permite gerenciar com segurança o acesso aos serviços e recursos AWS. Controla quem está autenticado (conectado) e autorizado (tem permissões) para usar recursos."
  },
  {
    term: "Amazon S3 (Simple Storage Service)",
    definition: "Serviço de armazenamento de objetos que oferece escalabilidade, disponibilidade de dados, segurança e performance. Armazena e protege qualquer quantidade de dados para diversos casos de uso."
  },
  {
    term: "AWS Lambda",
    definition: "Serviço de computação sem servidor que executa código em resposta a eventos e gerencia automaticamente os recursos de computação. Você paga apenas pelo tempo de computação consumido."
  },
  {
    term: "Amazon VPC (Virtual Private Cloud)",
    definition: "Rede virtual logicamente isolada na AWS Cloud onde você pode lançar recursos AWS em uma rede virtual que você define, com controle completo sobre o ambiente de rede."
  },
  {
    term: "Amazon RDS (Relational Database Service)",
    definition: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados na nuvem. Suporta vários mecanismos de banco de dados como MySQL, PostgreSQL, Oracle e SQL Server."
  },
  {
    term: "AWS CloudFormation",
    definition: "Serviço de infraestrutura como código que permite modelar e provisionar recursos AWS e de terceiros usando templates. Automatiza e padroniza a criação de infraestrutura."
  },
  {
    term: "Amazon CloudFront",
    definition: "Serviço de rede de entrega de conteúdo (CDN) que entrega dados, vídeos, aplicações e APIs com segurança para clientes globalmente com baixa latência e altas velocidades de transferência."
  }
];