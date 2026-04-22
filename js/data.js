// ============================================
// GLOSSÁRIO DE TERMOS AWS PARA FLASHCARDS
// Organizado por Certificação - BILÍNGUE (PT/EN)
// ============================================

export const glossaryTerms = [
  // ==========================================
  // CLF-C02: AWS Cloud Practitioner (Fundamentos)
  // ==========================================
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: { pt: "Região AWS", en: "AWS Region" },
    definition: {
      pt: "Área geográfica que contém múltiplas Zonas de Disponibilidade isoladas. Cada região é completamente independente para fornecer isolamento de falhas e estabilidade.",
      en: "Geographic area containing multiple isolated Availability Zones. Each region is completely independent to provide fault isolation and stability."
    }
  },
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: { pt: "AZ (Availability Zone)", en: "AZ (Availability Zone)" },
    definition: {
      pt: "Data center isolado dentro de uma região AWS, com energia, rede e conectividade redundantes. Múltiplas AZs em uma região permitem alta disponibilidade e tolerância a falhas.",
      en: "Isolated data center within an AWS region, with redundant power, networking, and connectivity. Multiple AZs in a region enable high availability and fault tolerance."
    }
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS IAM (Identity and Access Management)", en: "AWS IAM (Identity and Access Management)" },
    definition: {
      pt: "Serviço que permite gerenciar com segurança o acesso aos serviços e recursos AWS. Controla quem está autenticado (conectado) e autorizado (tem permissões) para usar recursos.",
      en: "Service that enables secure management of access to AWS services and resources. Controls who is authenticated (signed in) and authorized (has permissions) to use resources."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon S3 (Simple Storage Service)", en: "Amazon S3 (Simple Storage Service)" },
    definition: {
      pt: "Serviço de armazenamento de objetos que oferece escalabilidade, disponibilidade de dados, segurança e performance. Armazena e protege qualquer quantidade de dados para diversos casos de uso.",
      en: "Object storage service offering scalability, data availability, security, and performance. Stores and protects any amount of data for various use cases."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon EC2 (Elastic Compute Cloud)", en: "Amazon EC2 (Elastic Compute Cloud)" },
    definition: {
      pt: "Serviço de computação que fornece capacidade computacional redimensionável na nuvem. Permite criar e gerenciar servidores virtuais (instâncias) com diversos tipos e tamanhos.",
      en: "Compute service providing resizable compute capacity in the cloud. Enables creating and managing virtual servers (instances) with various types and sizes."
    }
  },
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: { pt: "AWS Well-Architected Framework", en: "AWS Well-Architected Framework" },
    definition: {
      pt: "Conjunto de melhores práticas para construir sistemas seguros, eficientes, resilientes e de alto desempenho na nuvem. Baseado em 6 pilares: Excelência Operacional, Segurança, Confiabilidade, Eficiência de Performance, Otimização de Custos e Sustentabilidade.",
      en: "Set of best practices for building secure, efficient, resilient, and high-performing systems in the cloud. Based on 6 pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability."
    }
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Pricing Calculator", en: "AWS Pricing Calculator" },
    definition: {
      pt: "Ferramenta gratuita que permite estimar o custo mensal dos serviços AWS. Ajuda a planejar e orçar gastos na nuvem antes de implementar recursos.",
      en: "Free tool that allows estimating monthly AWS service costs. Helps plan and budget cloud spending before implementing resources."
    }
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Free Tier", en: "AWS Free Tier" },
    definition: {
      pt: "Programa que oferece acesso gratuito a serviços AWS por tempo limitado ou com limites de uso. Inclui ofertas Always Free, 12 meses gratuitos e testes gratuitos.",
      en: "Program offering free access to AWS services for limited time or with usage limits. Includes Always Free offers, 12 months free, and free trials."
    }
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Organizations", en: "AWS Organizations" },
    definition: {
      pt: "Serviço de gerenciamento de contas que permite consolidar múltiplas contas AWS em uma organização. Facilita governança centralizada, faturamento consolidado e controle de políticas.",
      en: "Account management service that enables consolidating multiple AWS accounts into an organization. Facilitates centralized governance, consolidated billing, and policy control."
    }
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS CloudTrail", en: "AWS CloudTrail" },
    definition: {
      pt: "Serviço que registra e monitora atividades de conta AWS. Fornece histórico de eventos de chamadas de API para auditoria, conformidade e análise de segurança.",
      en: "Service that records and monitors AWS account activities. Provides event history of API calls for auditing, compliance, and security analysis."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon CloudWatch", en: "Amazon CloudWatch" },
    definition: {
      pt: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos.",
      en: "Monitoring and observability service providing data and insights to monitor applications, respond to performance changes, and optimize resource utilization."
    }
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS Shield", en: "AWS Shield" },
    definition: {
      pt: "Serviço gerenciado de proteção contra DDoS. Shield Standard é automático e gratuito; Shield Advanced oferece proteção adicional com resposta 24/7 e proteção de custos.",
      en: "Managed DDoS protection service. Shield Standard is automatic and free; Shield Advanced offers additional protection with 24/7 response and cost protection."
    }
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "Modelo de Responsabilidade Compartilhada", en: "Shared Responsibility Model" },
    definition: {
      pt: "Framework que define responsabilidades de segurança entre AWS e cliente. AWS é responsável pela segurança DA nuvem (infraestrutura); cliente é responsável pela segurança NA nuvem (dados, aplicações).",
      en: "Framework defining security responsibilities between AWS and customer. AWS is responsible for security OF the cloud (infrastructure); customer is responsible for security IN the cloud (data, applications)."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "AWS CLI (Command Line Interface)", en: "AWS CLI (Command Line Interface)" },
    definition: {
      pt: "Ferramenta unificada para gerenciar serviços AWS via linha de comando. Permite automatizar tarefas através de scripts.",
      en: "Unified tool for managing AWS services via command line. Enables automating tasks through scripts."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon DynamoDB", en: "Amazon DynamoDB" },
    definition: {
      pt: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor.",
      en: "Fully managed NoSQL database providing fast and predictable performance with automatic scaling. Supports document and key-value data models."
    }
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "AWS Global Accelerator", en: "AWS Global Accelerator" },
    definition: {
      pt: "Serviço de rede que melhora a disponibilidade e a performance das aplicações usando a infraestrutura de rede global da AWS para direcionar o tráfego por caminhos otimizados.",
      en: "Networking service that improves the availability and performance of applications by using AWS’s global network infrastructure to route traffic via optimized paths."
    }
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS Artifact", en: "AWS Artifact" },
    definition: {
      pt: "Portal de autoatendimento para acesso sob demanda a relatórios de conformidade da AWS e acordos online específicos (como o HIPAA).",
      en: "Self-service portal for on-demand access to AWS compliance reports and specific online agreements (such as HIPAA)."
    }
  },

  // ==========================================
  // SAA-C03: Solutions Architect Associate
  // ==========================================
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon VPC (Virtual Private Cloud)", en: "Amazon VPC (Virtual Private Cloud)" },
    definition: {
      pt: "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways.",
      en: "Logically isolated virtual network in AWS where you can launch resources with complete control over network configuration, including subnets, routing tables, and gateways."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon RDS (Relational Database Service)", en: "Amazon RDS (Relational Database Service)" },
    definition: {
      pt: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados. Suporta MySQL, PostgreSQL, Oracle, SQL Server, MariaDB e Amazon Aurora.",
      en: "Managed relational database service that makes it easy to set up, operate, and scale databases. Supports MySQL, PostgreSQL, Oracle, SQL Server, MariaDB, and Amazon Aurora."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "Amazon S3 Glacier", en: "Amazon S3 Glacier" },
    definition: {
      pt: "Classes de armazenamento de baixo custo para arquivamento de dados e backup de longo prazo. Oferece três opções de recuperação: Expedited, Standard e Bulk.",
      en: "Low-cost storage classes for data archiving and long-term backup. Offers three retrieval options: Expedited, Standard, and Bulk."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Elastic Load Balancing (ELB)", en: "Elastic Load Balancing (ELB)" },
    definition: {
      pt: "Distribui automaticamente tráfego de entrada entre múltiplos destinos. Inclui Application Load Balancer (ALB), Network Load Balancer (NLB) e Gateway Load Balancer.",
      en: "Automatically distributes incoming traffic across multiple targets. Includes Application Load Balancer (ALB), Network Load Balancer (NLB), and Gateway Load Balancer."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "AWS Lambda", en: "AWS Lambda" },
    definition: {
      pt: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução.",
      en: "Serverless compute service that runs code in response to events. Automatically manages compute resources and you only pay for execution time."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon Aurora Replicas", en: "Amazon Aurora Replicas" },
    definition: {
      pt: "Cópias independentes no cluster do Aurora que permitem escalar leituras e fornecem destinos de failover automático para alta disponibilidade.",
      en: "Independent copies in the Aurora cluster that allow for read scaling and provide automatic failover targets for high availability."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon Route 53", en: "Amazon Route 53" },
    definition: {
      pt: "Serviço web de DNS altamente disponível e escalável. Oferece roteamento de tráfego (como latência, geolocalização e failover) e verificações de integridade (health checks).",
      en: "Highly available and scalable cloud DNS web service. Offers traffic routing (such as latency, geolocation, and failover) and health checks."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon SQS (Simple Queue Service)", en: "Amazon SQS (Simple Queue Service)" },
    definition: {
      pt: "Serviço de filas de mensagens totalmente gerenciado que permite desacoplar e escalar microsserviços, sistemas distribuídos e aplicações serverless.",
      en: "Fully managed message queuing service that enables you to decouple and scale microservices, distributed systems, and serverless applications."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon EFS (Elastic File System)", en: "Amazon EFS (Elastic File System)" },
    definition: {
      pt: "Sistema de arquivos NFS elástico e totalmente gerenciado. Pode ser montado em várias instâncias EC2 simultaneamente, escalando automaticamente de petabytes.",
      en: "Fully managed, elastic NFS file system. Can be mounted on multiple EC2 instances concurrently, automatically scaling to petabytes."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Multi-AZ Deployment (RDS)", en: "Multi-AZ Deployment (RDS)" },
    definition: {
      pt: "Recurso do RDS que provisiona e mantém uma réplica síncrona em espera (standby) em uma Zona de Disponibilidade diferente para failover automático.",
      en: "RDS feature that provisions and maintains a synchronous standby replica in a different Availability Zone for automatic failover."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "AWS Auto Scaling", en: "AWS Auto Scaling" },
    definition: {
      pt: "Monitora aplicações e ajusta automaticamente a capacidade para manter um desempenho constante e previsível com o menor custo possível.",
      en: "Monitors your applications and automatically adjusts capacity to maintain steady, predictable performance at the lowest possible cost."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon CloudFront", en: "Amazon CloudFront" },
    definition: {
      pt: "Serviço de Content Delivery Network (CDN) rápido que entrega dados, vídeos e APIs com segurança a clientes globais com baixa latência e altas velocidades de transferência.",
      en: "Fast Content Delivery Network (CDN) service that securely delivers data, videos, and APIs to customers globally with low latency and high transfer speeds."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon ElastiCache", en: "Amazon ElastiCache" },
    definition: {
      pt: "Serviço totalmente gerenciado de armazenamento de dados em memória (Redis ou Memcached) que acelera o desempenho das aplicações.",
      en: "Fully managed in-memory data store service (Redis or Memcached) that accelerates application performance."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "AWS Transit Gateway", en: "AWS Transit Gateway" },
    definition: {
      pt: "Conecta VPCs e redes on-premises por meio de um hub central, simplificando a topologia da rede e evitando configurações complexas de peering.",
      en: "Connects VPCs and on-premises networks through a central hub, simplifying network topology and avoiding complex peering relationships."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon DynamoDB DAX", en: "Amazon DynamoDB DAX" },
    definition: {
      pt: "Cache em memória totalmente gerenciado e altamente disponível para o DynamoDB que reduz o tempo de resposta de milissegundos para microssegundos.",
      en: "Fully managed, highly available, in-memory cache for DynamoDB that reduces response times from milliseconds to microseconds."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "EBS Provisioned IOPS (io1/io2)", en: "EBS Provisioned IOPS (io1/io2)" },
    definition: {
      pt: "Volumes de armazenamento SSD de alto desempenho projetados para cargas de trabalho críticas e intensivas em E/S (I/O) que requerem baixa latência.",
      en: "High-performance SSD storage volumes designed for critical, I/O-intensive workloads that require low latency."
    }
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "AWS KMS (Key Management Service)", en: "AWS KMS (Key Management Service)" },
    definition: {
      pt: "Serviço gerenciado que facilita a criação e o controle das chaves criptográficas usadas para proteger seus dados na nuvem AWS.",
      en: "Managed service that makes it easy for you to create and control the cryptographic keys used to protect your data in the AWS cloud."
    }
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "AWS WAF (Web Application Firewall)", en: "AWS WAF (Web Application Firewall)" },
    definition: {
      pt: "Firewall de aplicação web que ajuda a proteger suas aplicações contra exploits comuns da web (como SQL injection e Cross-Site Scripting) que afetam a disponibilidade.",
      en: "Web application firewall that helps protect your web applications from common web exploits (like SQL injection and Cross-Site Scripting) that affect availability."
    }
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "AWS Secrets Manager", en: "AWS Secrets Manager" },
    definition: {
      pt: "Serviço que ajuda você a proteger, alternar, gerenciar e recuperar credenciais de banco de dados, chaves de API e outros segredos durante seu ciclo de vida.",
      en: "Service that helps you protect, rotate, manage, and retrieve database credentials, API keys, and other secrets throughout their lifecycle."
    }
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "Amazon GuardDuty", en: "Amazon GuardDuty" },
    definition: {
      pt: "Serviço de detecção de ameaças que monitora continuamente atividades maliciosas e comportamentos anômalos para proteger suas contas e cargas de trabalho na AWS.",
      en: "Threat detection service that continuously monitors for malicious activity and anomalous behavior to protect your AWS accounts and workloads."
    }
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "IAM Roles (Funções IAM)", en: "IAM Roles" },
    definition: {
      pt: "Uma identidade do IAM que você pode criar em sua conta e que tem permissões específicas. Não possui credenciais permanentes e é assumida temporariamente por usuários ou serviços.",
      en: "An IAM identity that you can create in your account that has specific permissions. It does not have standard long-term credentials and is temporarily assumed by users or services."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "Amazon EC2 Spot Instances", en: "Amazon EC2 Spot Instances" },
    definition: {
      pt: "Capacidade computacional ociosa da AWS disponível com grandes descontos (até 90%). Ideal para cargas de trabalho flexíveis e tolerantes a falhas, pois podem ser interrompidas.",
      en: "Spare AWS compute capacity available at steep discounts (up to 90%). Ideal for flexible, fault-tolerant workloads as they can be interrupted."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Savings Plans", en: "AWS Savings Plans" },
    definition: {
      pt: "Modelo de preços flexível que oferece preços mais baixos em troca do compromisso de usar uma quantidade específica (medida em $/hora) de poder de computação por 1 ou 3 anos.",
      en: "Flexible pricing model that offers lower prices in exchange for a commitment to use a specific amount (measured in $/hour) of compute power for 1 or 3 years."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "Amazon S3 Intelligent-Tiering", en: "Amazon S3 Intelligent-Tiering" },
    definition: {
      pt: "Classe de armazenamento do S3 que otimiza custos automaticamente, movendo dados entre camadas de acesso frequente e infrequente com base nos padrões de acesso.",
      en: "S3 storage class that automatically optimizes costs by moving data between frequent and infrequent access tiers based on access patterns."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Compute Optimizer", en: "AWS Compute Optimizer" },
    definition: {
      pt: "Recomenda os recursos de computação ideais da AWS para suas cargas de trabalho para reduzir custos e melhorar o desempenho usando machine learning.",
      en: "Recommends optimal AWS compute resources for your workloads to reduce costs and improve performance using machine learning."
    }
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Budgets", en: "AWS Budgets" },
    definition: {
      pt: "Permite definir orçamentos personalizados que alertam você quando seus custos ou uso excedem (ou prevêem exceder) o valor orçado definido.",
      en: "Allows you to set custom budgets that alert you when your costs or usage exceed (or are forecasted to exceed) your budgeted amount."
    }
  },

  // ==========================================
  // DVA-C02: Developer Associate
  // ==========================================
  {
    cert: "dva-c02",
    domain: "desenvolvimento-servicos",
    term: { pt: "AWS CodeCommit", en: "AWS CodeCommit" },
    definition: {
      pt: "Serviço de controle de versão totalmente gerenciado que hospeda repositórios Git privados. Elimina necessidade de operar sistema próprio de controle de versão.",
      en: "Fully managed source control service hosting private Git repositories. Eliminates the need to operate your own source control system."
    }
  },
  {
    cert: "dva-c02",
    domain: "implementacao",
    term: { pt: "AWS CodeBuild", en: "AWS CodeBuild" },
    definition: {
      pt: "Serviço de integração contínua totalmente gerenciado que compila código-fonte, executa testes e produz pacotes de software prontos para deploy.",
      en: "Fully managed continuous integration service that compiles source code, runs tests, and produces software packages ready for deployment."
    }
  },
  {
    cert: "dva-c02",
    domain: "desenvolvimento-servicos",
    term: { pt: "Amazon API Gateway", en: "Amazon API Gateway" },
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
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon SageMaker", en: "Amazon SageMaker" },
    definition: {
      pt: "Serviço totalmente gerenciado para construir, treinar e implantar modelos de machine learning em escala. Fornece notebooks Jupyter, algoritmos integrados e infraestrutura gerenciada.",
      en: "Fully managed service for building, training, and deploying machine learning models at scale. Provides Jupyter notebooks, built-in algorithms, and managed infrastructure."
    }
  },
  {
    cert: "aif-c01",
    domain: "applications-foundation-models",
    term: { pt: "Amazon Bedrock", en: "Amazon Bedrock" },
    definition: {
      pt: "Serviço totalmente gerenciado que oferece modelos de fundação (FMs) de alto desempenho de empresas líderes em IA via API única. Permite construir e escalar aplicações de IA generativa.",
      en: "Fully managed service offering high-performance foundation models (FMs) from leading AI companies via a single API. Enables building and scaling generative AI applications."
    }
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Rekognition", en: "Amazon Rekognition" },
    definition: {
      pt: "Serviço de análise de imagem e vídeo que identifica objetos, pessoas, texto, cenas e atividades. Também detecta conteúdo inadequado e fornece análise facial.",
      en: "Image and video analysis service that identifies objects, people, text, scenes, and activities. Also detects inappropriate content and provides facial analysis."
    }
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Comprehend", en: "Amazon Comprehend" },
    definition: {
      pt: "Serviço de processamento de linguagem natural (NLP) que usa machine learning para descobrir insights e relacionamentos em texto. Identifica idioma, entidades, sentimentos e tópicos.",
      en: "Natural language processing (NLP) service using machine learning to discover insights and relationships in text. Identifies language, entities, sentiments, and topics."
    }
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Translate", en: "Amazon Translate" },
    definition: {
      pt: "Serviço de tradução automática neural que fornece tradução de idiomas rápida, de alta qualidade e acessível. Suporta mais de 75 idiomas.",
      en: "Neural machine translation service providing fast, high-quality, and affordable language translation. Supports over 75 languages."
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