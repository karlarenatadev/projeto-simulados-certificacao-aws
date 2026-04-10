// ============================================
// GLOSSÁRIO DE TERMOS AWS PARA FLASHCARDS
// Organizado por Certificação - BILÍNGUE (PT/EN)
// ============================================

export const glossaryTerms = [
  // ==========================================
  // TERMOS GERAIS (Todas as Certificações)
  // ==========================================
  {
    cert: "all",
    term: {
      pt: "Região AWS",
      en: "AWS Region"
    },
    definition: {
      pt: "Área geográfica que contém múltiplas Zonas de Disponibilidade isoladas. Cada região é completamente independente para fornecer isolamento de falhas e estabilidade.",
      en: "Geographic area containing multiple isolated Availability Zones. Each region is completely independent to provide fault isolation and stability."
    }
  },
  {
    cert: "all",
    term: {
      pt: "AZ (Availability Zone)",
      en: "AZ (Availability Zone)"
    },
    definition: {
      pt: "Data center isolado dentro de uma região AWS, com energia, rede e conectividade redundantes. Múltiplas AZs em uma região permitem alta disponibilidade e tolerância a falhas.",
      en: "Isolated data center within an AWS region, with redundant power, networking, and connectivity. Multiple AZs in a region enable high availability and fault tolerance."
    }
  },
  {
    cert: "all",
    term: {
      pt: "AWS IAM (Identity and Access Management)",
      en: "AWS IAM (Identity and Access Management)"
    },
    definition: {
      pt: "Serviço que permite gerenciar com segurança o acesso aos serviços e recursos AWS. Controla quem está autenticado (conectado) e autorizado (tem permissões) para usar recursos.",
      en: "Service that enables secure management of access to AWS services and resources. Controls who is authenticated (signed in) and authorized (has permissions) to use resources."
    }
  },
  {
    cert: "all",
    term: {
      pt: "Amazon S3 (Simple Storage Service)",
      en: "Amazon S3 (Simple Storage Service)"
    },
    definition: {
      pt: "Serviço de armazenamento de objetos que oferece escalabilidade, disponibilidade de dados, segurança e performance. Armazena e protege qualquer quantidade de dados para diversos casos de uso.",
      en: "Object storage service offering scalability, data availability, security, and performance. Stores and protects any amount of data for various use cases."
    }
  },
  {
    cert: "all",
    term: {
      pt: "Amazon EC2 (Elastic Compute Cloud)",
      en: "Amazon EC2 (Elastic Compute Cloud)"
    },
    definition: {
      pt: "Serviço de computação que fornece capacidade computacional redimensionável na nuvem. Permite criar e gerenciar servidores virtuais (instâncias) com diversos tipos e tamanhos.",
      en: "Compute service providing resizable compute capacity in the cloud. Enables creating and managing virtual servers (instances) with various types and sizes."
    }
  },

  // ==========================================
  // CLF-C02: AWS Cloud Practitioner
  // ==========================================
  {
    cert: "clf-c02",
    term: {
      pt: "AWS Well-Architected Framework",
      en: "AWS Well-Architected Framework"
    },
    definition: {
      pt: "Conjunto de melhores práticas para construir sistemas seguros, eficientes, resilientes e de alto desempenho na nuvem. Baseado em 6 pilares: Excelência Operacional, Segurança, Confiabilidade, Eficiência de Performance, Otimização de Custos e Sustentabilidade.",
      en: "Set of best practices for building secure, efficient, resilient, and high-performing systems in the cloud. Based on 6 pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "AWS Pricing Calculator",
      en: "AWS Pricing Calculator"
    },
    definition: {
      pt: "Ferramenta gratuita que permite estimar o custo mensal dos serviços AWS. Ajuda a planejar e orçar gastos na nuvem antes de implementar recursos.",
      en: "Free tool that allows estimating monthly AWS service costs. Helps plan and budget cloud spending before implementing resources."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "AWS Free Tier",
      en: "AWS Free Tier"
    },
    definition: {
      pt: "Programa que oferece acesso gratuito a serviços AWS por tempo limitado ou com limites de uso. Inclui ofertas Always Free, 12 meses gratuitos e testes gratuitos.",
      en: "Program offering free access to AWS services for limited time or with usage limits. Includes Always Free offers, 12 months free, and free trials."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "AWS Organizations",
      en: "AWS Organizations"
    },
    definition: {
      pt: "Serviço de gerenciamento de contas que permite consolidar múltiplas contas AWS em uma organização. Facilita governança centralizada, faturamento consolidado e controle de políticas.",
      en: "Account management service that enables consolidating multiple AWS accounts into an organization. Facilitates centralized governance, consolidated billing, and policy control."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "AWS CloudTrail",
      en: "AWS CloudTrail"
    },
    definition: {
      pt: "Serviço que registra e monitora atividades de conta AWS. Fornece histórico de eventos de chamadas de API para auditoria, conformidade e análise de segurança.",
      en: "Service that records and monitors AWS account activities. Provides event history of API calls for auditing, compliance, and security analysis."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "Amazon CloudWatch",
      en: "Amazon CloudWatch"
    },
    definition: {
      pt: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos.",
      en: "Monitoring and observability service providing data and insights to monitor applications, respond to performance changes, and optimize resource utilization."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "AWS Shield",
      en: "AWS Shield"
    },
    definition: {
      pt: "Serviço gerenciado de proteção contra DDoS. Shield Standard é automático e gratuito; Shield Advanced oferece proteção adicional com resposta 24/7 e proteção de custos.",
      en: "Managed DDoS protection service. Shield Standard is automatic and free; Shield Advanced offers additional protection with 24/7 response and cost protection."
    }
  },
  {
    cert: "clf-c02",
    term: {
      pt: "Modelo de Responsabilidade Compartilhada",
      en: "Shared Responsibility Model"
    },
    definition: {
      pt: "Framework que define responsabilidades de segurança entre AWS e cliente. AWS é responsável pela segurança DA nuvem (infraestrutura); cliente é responsável pela segurança NA nuvem (dados, aplicações).",
      en: "Framework defining security responsibilities between AWS and customer. AWS is responsible for security OF the cloud (infrastructure); customer is responsible for security IN the cloud (data, applications)."
    }
  },

  // ==========================================
  // SAA-C03: Solutions Architect Associate
  // ==========================================
  {
    cert: "saa-c03",
    term: {
      pt: "Amazon VPC (Virtual Private Cloud)",
      en: "Amazon VPC (Virtual Private Cloud)"
    },
    definition: {
      pt: "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways.",
      en: "Logically isolated virtual network in AWS where you can launch resources with complete control over network configuration, including subnets, routing tables, and gateways."
    }
  },
  {
    cert: "saa-c03",
    term: {
      pt: "Amazon RDS (Relational Database Service)",
      en: "Amazon RDS (Relational Database Service)"
    },
    definition: {
      pt: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados. Suporta MySQL, PostgreSQL, Oracle, SQL Server, MariaDB e Amazon Aurora.",
      en: "Managed relational database service that makes it easy to set up, operate, and scale databases. Supports MySQL, PostgreSQL, Oracle, SQL Server, MariaDB, and Amazon Aurora."
    }
  },
  {
    cert: "saa-c03",
    term: {
      pt: "Amazon S3 Glacier",
      en: "Amazon S3 Glacier"
    },
    definition: {
      pt: "Classes de armazenamento de baixo custo para arquivamento de dados e backup de longo prazo. Oferece três opções de recuperação: Expedited, Standard e Bulk.",
      en: "Low-cost storage classes for data archiving and long-term backup. Offers three retrieval options: Expedited, Standard, and Bulk."
    }
  },
  {
    cert: "saa-c03",
    term: {
      pt: "Elastic Load Balancing (ELB)",
      en: "Elastic Load Balancing (ELB)"
    },
    definition: {
      pt: "Distribui automaticamente tráfego de entrada entre múltiplos destinos. Inclui Application Load Balancer (ALB), Network Load Balancer (NLB) e Gateway Load Balancer.",
      en: "Automatically distributes incoming traffic across multiple targets. Includes Application Load Balancer (ALB), Network Load Balancer (NLB), and Gateway Load Balancer."
    }
  },
  {
    cert: "saa-c03",
    term: {
      pt: "AWS Lambda",
      en: "AWS Lambda"
    },
    definition: {
      pt: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução.",
      en: "Serverless compute service that runs code in response to events. Automatically manages compute resources and you only pay for execution time."
    }
  },

  // ==========================================
  // DVA-C02: Developer Associate
  // ==========================================
  {
    cert: "dva-c02",
    term: {
      pt: "AWS CodeCommit",
      en: "AWS CodeCommit"
    },
    definition: {
      pt: "Serviço de controle de versão totalmente gerenciado que hospeda repositórios Git privados. Elimina necessidade de operar sistema próprio de controle de versão.",
      en: "Fully managed source control service hosting private Git repositories. Eliminates the need to operate your own source control system."
    }
  },
  {
    cert: "dva-c02",
    term: {
      pt: "AWS CodeBuild",
      en: "AWS CodeBuild"
    },
    definition: {
      pt: "Serviço de integração contínua totalmente gerenciado que compila código-fonte, executa testes e produz pacotes de software prontos para deploy.",
      en: "Fully managed continuous integration service that compiles source code, runs tests, and produces software packages ready for deployment."
    }
  },
  {
    cert: "dva-c02",
    term: {
      pt: "AWS Lambda",
      en: "AWS Lambda"
    },
    definition: {
      pt: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução.",
      en: "Serverless compute service that runs code in response to events. Automatically manages compute resources and you only pay for execution time."
    }
  },
  {
    cert: "dva-c02",
    term: {
      pt: "Amazon DynamoDB",
      en: "Amazon DynamoDB"
    },
    definition: {
      pt: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor.",
      en: "Fully managed NoSQL database providing fast and predictable performance with automatic scaling. Supports document and key-value data models."
    }
  },
  {
    cert: "dva-c02",
    term: {
      pt: "Amazon API Gateway",
      en: "Amazon API Gateway"
    },
    definition: {
      pt: "Serviço totalmente gerenciado para criar, publicar, manter, monitorar e proteger APIs REST, HTTP e WebSocket em qualquer escala.",
      en: "Fully managed service for creating, publishing, maintaining, monitoring, and securing REST, HTTP, and WebSocket APIs at any scale."
    }
  },

  // ==========================================
  // AIF-C01: AI Practitioner
  // ==========================================
  {
    cert: "aif-c01",
    term: {
      pt: "Amazon SageMaker",
      en: "Amazon SageMaker"
    },
    definition: {
      pt: "Serviço totalmente gerenciado para construir, treinar e implantar modelos de machine learning em escala. Fornece notebooks Jupyter, algoritmos integrados e infraestrutura gerenciada.",
      en: "Fully managed service for building, training, and deploying machine learning models at scale. Provides Jupyter notebooks, built-in algorithms, and managed infrastructure."
    }
  },
  {
    cert: "aif-c01",
    term: {
      pt: "Amazon Bedrock",
      en: "Amazon Bedrock"
    },
    definition: {
      pt: "Serviço totalmente gerenciado que oferece modelos de fundação (FMs) de alto desempenho de empresas líderes em IA via API única. Permite construir e escalar aplicações de IA generativa.",
      en: "Fully managed service offering high-performance foundation models (FMs) from leading AI companies via a single API. Enables building and scaling generative AI applications."
    }
  },
  {
    cert: "aif-c01",
    term: {
      pt: "Amazon Rekognition",
      en: "Amazon Rekognition"
    },
    definition: {
      pt: "Serviço de análise de imagem e vídeo que identifica objetos, pessoas, texto, cenas e atividades. Também detecta conteúdo inadequado e fornece análise facial.",
      en: "Image and video analysis service that identifies objects, people, text, scenes, and activities. Also detects inappropriate content and provides facial analysis."
    }
  },
  {
    cert: "aif-c01",
    term: {
      pt: "Amazon Comprehend",
      en: "Amazon Comprehend"
    },
    definition: {
      pt: "Serviço de processamento de linguagem natural (NLP) que usa machine learning para descobrir insights e relacionamentos em texto. Identifica idioma, entidades, sentimentos e tópicos.",
      en: "Natural language processing (NLP) service using machine learning to discover insights and relationships in text. Identifies language, entities, sentiments, and topics."
    }
  },
  {
    cert: "aif-c01",
    term: {
      pt: "Amazon Translate",
      en: "Amazon Translate"
    },
    definition: {
      pt: "Serviço de tradução automática neural que fornece tradução de idiomas rápida, de alta qualidade e acessível. Suporta mais de 75 idiomas.",
      en: "Neural machine translation service providing fast, high-quality, and affordable language translation. Supports over 75 languages."
    }
  },

  // ==========================================
  // TERMOS ADICIONAIS IMPORTANTES
  // ==========================================
  {
    cert: "all",
    term: {
      pt: "AWS CLI (Command Line Interface)",
      en: "AWS CLI (Command Line Interface)"
    },
    definition: {
      pt: "Ferramenta unificada para gerenciar serviços AWS via linha de comando. Permite automatizar tarefas através de scripts.",
      en: "Unified tool for managing AWS services via command line. Enables automating tasks through scripts."
    }
  },
  {
    cert: "all",
    term: {
      pt: "Amazon DynamoDB",
      en: "Amazon DynamoDB"
    },
    definition: {
      pt: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor.",
      en: "Fully managed NoSQL database providing fast and predictable performance with automatic scaling. Supports document and key-value data models."
    }
  },
  {
    cert: "all",
    term: {
      pt: "Amazon CloudWatch",
      en: "Amazon CloudWatch"
    },
    definition: {
      pt: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos.",
      en: "Monitoring and observability service providing data and insights to monitor applications, respond to performance changes, and optimize resource utilization."
    }
  }
];

// ============================================
// CONFIGURAÇÃO DAS CERTIFICAÇÕES
// ============================================

export const certificationPaths = {
  "clf-c02": {
    name: "AWS Certified Cloud Practitioner",
    code: "CLF-C02",
    domains: [
      { id: "conceitos-cloud", name: "Conceitos de Cloud" },
      { id: "seguranca", name: "Segurança e Conformidade" }, 
      { id: "tecnologia", name: "Tecnologia" },
      { id: "faturamento", name: "Faturamento e Preços" } 
    ]
  },
  "saa-c03": {
    name: "AWS Certified Solutions Architect - Associate",
    code: "SAA-C03",
    domains: [
      { id: "design-resiliente", name: "Design de Arquiteturas Resilientes" },
      { id: "design-performance", name: "Design de Alto Desempenho" }, 
      { id: "seguranca-aplicacoes", name: "Design de Aplicações Seguras" }, 
      { id: "design-custo", name: "Design Otimizado para Custos" } 
    ]
  },
  "aif-c01": {
    name: "AWS Certified AI Practitioner",
    code: "AIF-C01",
    domains: [
      { id: "fundamentals-ai-ml", name: "Fundamentos de IA e ML" }, 
      { id: "fundamentals-genai", name: "Fundamentos de IA Generativa" }, 
      { id: "applications-foundation-models", name: "Aplicações e Modelos de Fundação" }, 
      { id: "guidelines-responsible-ai", name: "Diretrizes para IA Responsável" }, 
      { id: "security-compliance-governance", name: "Segurança e Governança" } 
    ]
  },
  "dva-c02": {
    name: "AWS Certified Developer - Associate",
    code: "DVA-C02",
    domains: [
      { id: "desenvolvimento-servicos", name: "Desenvolvimento com Serviços AWS" }, 
      { id: "seguranca-app", name: "Segurança" }, 
      { id: "implementacao", name: "Deployment e Implementação" }, 
      { id: "resolucao-problemas", name: "Troubleshooting e Resolução de Problemas" } 
    ]
  }
};