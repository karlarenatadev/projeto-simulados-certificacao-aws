/**
 * DATA.JS - Banco de Dados de Certificações AWS
 * 
 * Este ficheiro centraliza todas as questões, trilhas de certificação e domínios oficiais AWS.
 * Mantém a separação de responsabilidades: dados isolados da lógica de negócio.
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
    // Domínios oficiais do exame AIF-C01
    domains: [
      { id: 'fundamentos-ia', name: 'Fundamentos de IA/ML', weight: 28 },
      { id: 'amazon-bedrock', name: 'Amazon Bedrock', weight: 32 },
      { id: 'prompt-engineering', name: 'Prompt Engineering', weight: 24 },
      { id: 'seguranca-ia', name: 'Segurança em IA', weight: 16 }
    ]
  }
};

// Banco de questões para CLF-C02
const questionsClf = [
  {
    id: 1,
    domain: 'conceitos-cloud',
    question: 'Qual das seguintes opções descreve melhor o modelo de responsabilidade compartilhada da AWS?',
    options: [
      'A AWS é responsável pela segurança NA nuvem, e o cliente é responsável pela segurança DA nuvem',
      'O cliente é responsável pela segurança NA nuvem, e a AWS é responsável pela segurança DA nuvem',
      'A AWS e o cliente compartilham igualmente todas as responsabilidades de segurança',
      'A AWS é responsável por toda a segurança, incluindo os dados do cliente'
    ],
    correct: 1,
    explanation: 'No modelo de responsabilidade compartilhada, a AWS gerencia a segurança DA nuvem (infraestrutura física, rede, hipervisor), enquanto o cliente é responsável pela segurança NA nuvem (dados, aplicações, configurações de SO, firewall, encriptação).'
  },
  {
    id: 2,
    domain: 'tecnologia',
    question: 'Uma empresa precisa de armazenamento de objetos escalável para backup de dados. Qual serviço AWS é mais adequado?',
    options: [
      'Amazon EBS',
      'Amazon S3',
      'Amazon RDS',
      'AWS Lambda'
    ],
    correct: 1,
    explanation: 'Amazon S3 (Simple Storage Service) é o serviço ideal para armazenamento de objetos escalável, durável e de baixo custo. EBS é para volumes de blocos anexados a instâncias EC2, RDS é para bases de dados relacionais, e Lambda é para computação serverless.'
  },
  {
    id: 3,
    domain: 'seguranca',
    question: 'Qual serviço AWS permite gerenciar chaves de encriptação e controlar o acesso a dados encriptados?',
    options: [
      'AWS IAM',
      'AWS KMS',
      'AWS CloudTrail',
      'Amazon Inspector'
    ],
    correct: 1,
    explanation: 'AWS KMS (Key Management Service) é o serviço gerenciado para criar e controlar chaves de encriptação. IAM gere identidades e permissões, CloudTrail regista atividades da conta, e Inspector avalia vulnerabilidades de segurança.'
  },
  {
    id: 4,
    domain: 'faturamento',
    question: 'Qual ferramenta AWS permite visualizar e analisar os custos e uso da conta ao longo do tempo?',
    options: [
      'AWS Budgets',
      'AWS Cost Explorer',
      'AWS Pricing Calculator',
      'AWS Trusted Advisor'
    ],
    correct: 1,
    explanation: 'AWS Cost Explorer fornece visualizações interativas dos custos e uso ao longo do tempo. Budgets define alertas de orçamento, Pricing Calculator estima custos futuros, e Trusted Advisor fornece recomendações de otimização.'
  },
  {
    id: 5,
    domain: 'conceitos-cloud',
    question: 'Qual é o principal benefício da elasticidade na AWS Cloud?',
    options: [
      'Redução de custos fixos de infraestrutura',
      'Capacidade de escalar recursos automaticamente conforme a demanda',
      'Acesso global a datacenters',
      'Segurança aprimorada'
    ],
    correct: 1,
    explanation: 'Elasticidade refere-se à capacidade de aumentar ou diminuir recursos automaticamente conforme a demanda, garantindo que você tenha sempre a capacidade certa no momento certo, otimizando custos e desempenho.'
  },
  {
    id: 6,
    domain: 'tecnologia',
    question: 'Qual serviço AWS fornece um sistema de nomes de domínio (DNS) escalável e de alta disponibilidade?',
    options: [
      'Amazon CloudFront',
      'AWS Direct Connect',
      'Amazon Route 53',
      'Elastic Load Balancing'
    ],
    correct: 2,
    explanation: 'Amazon Route 53 é o serviço DNS gerenciado da AWS, oferecendo roteamento de tráfego, registo de domínios e verificações de integridade. CloudFront é CDN, Direct Connect é conexão dedicada, e ELB distribui tráfego entre instâncias.'
  },
  {
    id: 7,
    domain: 'seguranca',
    question: 'Qual serviço AWS fornece proteção contra ataques DDoS?',
    options: [
      'AWS WAF',
      'AWS Shield',
      'Amazon GuardDuty',
      'AWS Security Hub'
    ],
    correct: 1,
    explanation: 'AWS Shield é o serviço gerenciado de proteção contra DDoS. Shield Standard é gratuito e automático, enquanto Shield Advanced oferece proteção adicional. WAF protege contra exploits web, GuardDuty detecta ameaças, e Security Hub centraliza alertas de segurança.'
  },
  {
    id: 8,
    domain: 'faturamento',
    question: 'Qual modelo de preços do Amazon EC2 oferece o maior desconto para cargas de trabalho previsíveis e de longo prazo?',
    options: [
      'On-Demand Instances',
      'Spot Instances',
      'Reserved Instances',
      'Dedicated Hosts'
    ],
    correct: 2,
    explanation: 'Reserved Instances oferecem descontos significativos (até 75%) em troca de compromisso de 1 ou 3 anos. On-Demand não tem compromisso, Spot oferece descontos mas pode ser interrompido, e Dedicated Hosts são servidores físicos dedicados.'
  },
  {
    id: 9,
    domain: 'tecnologia',
    question: 'Qual serviço AWS permite executar código sem provisionar ou gerenciar servidores?',
    options: [
      'Amazon EC2',
      'AWS Lambda',
      'Amazon ECS',
      'AWS Elastic Beanstalk'
    ],
    correct: 1,
    explanation: 'AWS Lambda é o serviço de computação serverless que executa código em resposta a eventos, sem necessidade de gerenciar servidores. Você paga apenas pelo tempo de computação consumido.'
  },
  {
    id: 10,
    domain: 'conceitos-cloud',
    question: 'Qual pilar do AWS Well-Architected Framework foca em executar sistemas para entregar valor de negócio?',
    options: [
      'Excelência Operacional',
      'Segurança',
      'Confiabilidade',
      'Eficiência de Performance'
    ],
    correct: 0,
    explanation: 'O pilar de Excelência Operacional concentra-se em executar e monitorizar sistemas para entregar valor de negócio e melhorar continuamente processos e procedimentos. Os outros pilares são: Segurança, Confiabilidade, Eficiência de Performance, Otimização de Custos e Sustentabilidade.'
  }
];

// Banco de questões para SAA-C03
const questionsSaa = [
  {
    id: 101,
    domain: 'design-resiliente',
    question: 'Uma aplicação web precisa de alta disponibilidade em múltiplas Availability Zones. Qual combinação de serviços AWS é mais apropriada?',
    options: [
      'Amazon EC2 com Auto Scaling Group e Application Load Balancer',
      'Amazon EC2 com Elastic IP',
      'AWS Lambda com API Gateway',
      'Amazon Lightsail'
    ],
    correct: 0,
    explanation: 'Auto Scaling Group distribui instâncias EC2 em múltiplas AZs automaticamente, enquanto o Application Load Balancer distribui o tráfego entre elas, garantindo alta disponibilidade e resiliência a falhas de zona.'
  },
  {
    id: 102,
    domain: 'design-performante',
    question: 'Uma aplicação global precisa de baixa latência para utilizadores em diferentes continentes. Qual serviço AWS deve ser implementado?',
    options: [
      'Amazon S3 Transfer Acceleration',
      'Amazon CloudFront',
      'AWS Global Accelerator',
      'Amazon Route 53 com roteamento geográfico'
    ],
    correct: 1,
    explanation: 'Amazon CloudFront é a CDN da AWS que distribui conteúdo através de edge locations globais, reduzindo significativamente a latência para utilizadores em qualquer parte do mundo através de cache de conteúdo próximo aos utilizadores finais.'
  },
  {
    id: 103,
    domain: 'design-seguro',
    question: 'Uma empresa precisa garantir que dados sensíveis em S3 sejam encriptados em repouso e em trânsito. Qual é a melhor abordagem?',
    options: [
      'Ativar apenas HTTPS para acesso aos objetos',
      'Usar S3 Server-Side Encryption (SSE) e forçar HTTPS através de bucket policy',
      'Encriptar dados manualmente antes do upload',
      'Usar apenas IAM policies para controlar acesso'
    ],
    correct: 1,
    explanation: 'A combinação de SSE (encriptação em repouso) com bucket policy que força HTTPS (encriptação em trânsito) garante proteção completa dos dados. SSE-S3, SSE-KMS ou SSE-C podem ser usados conforme os requisitos de gestão de chaves.'
  }
];

// Banco de questões para AIF-C01
const questionsAif = [
  {
    id: 201,
    domain: 'amazon-bedrock',
    question: 'Uma empresa precisa implementar guardrails para prevenir que um modelo de IA generativa produza conteúdo inadequado. Qual recurso do Amazon Bedrock deve ser configurado?',
    options: [
      'Amazon Bedrock Model Evaluation',
      'Amazon Bedrock Guardrails com políticas de conteúdo e filtros de tópicos sensíveis',
      'Amazon Bedrock Knowledge Bases com validação de contexto',
      'Amazon Bedrock Agents com validação de output'
    ],
    correct: 1,
    explanation: 'Amazon Bedrock Guardrails permite configurar políticas de conteúdo, filtros de tópicos sensíveis, filtros de PII (Personally Identifiable Information) e word filters para prevenir outputs inadequados. É a solução específica para governança e segurança de conteúdo gerado por modelos de IA.'
  },
  {
    id: 202,
    domain: 'prompt-engineering',
    question: 'Qual técnica de prompt engineering é mais eficaz quando o modelo precisa realizar uma tarefa completamente nova sem exemplos prévios?',
    options: [
      'Few-shot prompting com 3-5 exemplos',
      'Zero-shot prompting com instruções claras e contexto detalhado',
      'Chain-of-thought prompting',
      'Fine-tuning do modelo base'
    ],
    correct: 1,
    explanation: 'Zero-shot prompting é a técnica onde fornecemos apenas instruções claras sem exemplos, ideal para tarefas novas. Few-shot requer exemplos (que não temos), chain-of-thought é para raciocínio complexo, e fine-tuning não é prompt engineering. Zero-shot com contexto detalhado maximiza a compreensão do modelo sobre a tarefa.'
  },
  {
    id: 203,
    domain: 'fundamentos-ia',
    question: 'Qual é a principal diferença entre Retrieval-Augmented Generation (RAG) e fine-tuning de modelos de linguagem?',
    options: [
      'RAG modifica os pesos do modelo, enquanto fine-tuning adiciona conhecimento externo',
      'RAG recupera informações de fontes externas em tempo real, enquanto fine-tuning treina o modelo com novos dados',
      'RAG é mais caro que fine-tuning para implementar',
      'Fine-tuning funciona apenas com modelos pequenos'
    ],
    correct: 1,
    explanation: 'RAG (Retrieval-Augmented Generation) mantém o modelo original e busca informações relevantes de bases de conhecimento externas em tempo de inferência, combinando retrieval com generation. Fine-tuning modifica os pesos do modelo através de treino adicional. RAG é ideal para conhecimento dinâmico e específico de domínio sem retreinar o modelo.'
  },
  {
    id: 204,
    domain: 'amazon-bedrock',
    question: 'Uma aplicação precisa usar Amazon Bedrock Agents para automatizar tarefas complexas. Qual componente é essencial para permitir que o Agent execute ações específicas?',
    options: [
      'Amazon Bedrock Model Catalog',
      'Action Groups com funções Lambda associadas',
      'Amazon Bedrock Guardrails',
      'Amazon Bedrock Prompt Flows'
    ],
    correct: 1,
    explanation: 'Action Groups são componentes essenciais dos Bedrock Agents que definem as ações que o agente pode executar. Cada Action Group está associado a funções AWS Lambda que implementam a lógica de negócio. O agente usa o modelo de linguagem para decidir quando invocar estas ações baseado no contexto da conversa.'
  },
  {
    id: 205,
    domain: 'seguranca-ia',
    question: 'Ao implementar uma solução de IA generativa que processa dados sensíveis de clientes, qual prática de segurança do Amazon Bedrock deve ser priorizada?',
    options: [
      'Usar apenas modelos open-source',
      'Ativar encriptação em trânsito e em repouso, configurar Guardrails para filtrar PII, e usar VPC endpoints',
      'Desativar logging para evitar exposição de dados',
      'Permitir acesso público para facilitar integração'
    ],
    correct: 1,
    explanation: 'A segurança em IA requer múltiplas camadas: encriptação protege dados em trânsito (TLS) e em repouso (KMS), Guardrails com filtros PII previnem vazamento de informações sensíveis nos outputs, e VPC endpoints mantêm o tráfego na rede privada AWS. Logging deve ser mantido (com dados sanitizados) para auditoria e conformidade.'
  }
];

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
