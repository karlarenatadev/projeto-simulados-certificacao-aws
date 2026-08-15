// ============================================
// GLOSSÁRIO DE TERMOS AWS PARA FLASHCARDS
// Organizado por Certificação - BILÍNGUE (PT/EN)
// ============================================

const glossaryTermsSource = [
  // ==========================================
  // CLF-C02: AWS Cloud Practitioner (Fundamentos)
  // ==========================================
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: { pt: "Região AWS", en: "AWS Region" },
    definition: {
      pt: "Área geográfica que contém múltiplas Zonas de Disponibilidade isoladas. Cada região é completamente independente para fornecer isolamento de falhas e estabilidade.",
      en: "Geographic area containing multiple isolated Availability Zones. Each region is completely independent to provide fault isolation and stability.",
    },
  },
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: { pt: "AZ (Availability Zone)", en: "AZ (Availability Zone)" },
    definition: {
      pt: "Data center isolado dentro de uma região AWS, com energia, rede e conectividade redundantes. Múltiplas AZs em uma região permitem alta disponibilidade e tolerância a falhas.",
      en: "Isolated data center within an AWS region, with redundant power, networking, and connectivity. Multiple AZs in a region enable high availability and fault tolerance.",
    },
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: {
      pt: "AWS IAM (Identity and Access Management)",
      en: "AWS IAM (Identity and Access Management)",
    },
    definition: {
      pt: "Serviço que permite gerenciar com segurança o acesso aos serviços e recursos AWS. Controla quem está autenticado (conectado) e autorizado (tem permissões) para usar recursos.",
      en: "Service that enables secure management of access to AWS services and resources. Controls who is authenticated (signed in) and authorized (has permissions) to use resources.",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: {
      pt: "Amazon S3 (Simple Storage Service)",
      en: "Amazon S3 (Simple Storage Service)",
    },
    definition: {
      pt: "Serviço de armazenamento de objetos que oferece escalabilidade, disponibilidade de dados, segurança e performance. Armazena e protege qualquer quantidade de dados para diversos casos de uso.",
      en: "Object storage service offering scalability, data availability, security, and performance. Stores and protects any amount of data for various use cases.",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: {
      pt: "Amazon EC2 (Elastic Compute Cloud)",
      en: "Amazon EC2 (Elastic Compute Cloud)",
    },
    definition: {
      pt: "Serviço de computação que fornece capacidade computacional redimensionável na nuvem. Permite criar e gerenciar servidores virtuais (instâncias) com diversos tipos e tamanhos.",
      en: "Compute service providing resizable compute capacity in the cloud. Enables creating and managing virtual servers (instances) with various types and sizes.",
    },
  },
  {
    cert: "clf-c02",
    domain: "conceitos-cloud",
    term: {
      pt: "AWS Well-Architected Framework",
      en: "AWS Well-Architected Framework",
    },
    definition: {
      pt: "Conjunto de melhores práticas para construir sistemas seguros, eficientes, resilientes e de alto desempenho na nuvem. Baseado em 6 pilares: Excelência Operacional, Segurança, Confiabilidade, Eficiência de Performance, Otimização de Custos e Sustentabilidade.",
      en: "Set of best practices for building secure, efficient, resilient, and high-performing systems in the cloud. Based on 6 pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability.",
    },
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Pricing Calculator", en: "AWS Pricing Calculator" },
    definition: {
      pt: "Ferramenta gratuita que permite estimar o custo mensal dos serviços AWS. Ajuda a planejar e orçar gastos na nuvem antes de implementar recursos.",
      en: "Free tool that allows estimating monthly AWS service costs. Helps plan and budget cloud spending before implementing resources.",
    },
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Free Tier", en: "AWS Free Tier" },
    definition: {
      pt: "Programa que oferece acesso gratuito a serviços AWS por tempo limitado ou com limites de uso. Inclui ofertas Always Free, 12 meses gratuitos e testes gratuitos.",
      en: "Program offering free access to AWS services for limited time or with usage limits. Includes Always Free offers, 12 months free, and free trials.",
    },
  },
  {
    cert: "clf-c02",
    domain: "faturamento",
    term: { pt: "AWS Organizations", en: "AWS Organizations" },
    definition: {
      pt: "Serviço de gerenciamento de contas que permite consolidar múltiplas contas AWS em uma organização. Facilita governança centralizada, faturamento consolidado e controle de políticas.",
      en: "Account management service that enables consolidating multiple AWS accounts into an organization. Facilitates centralized governance, consolidated billing, and policy control.",
    },
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS CloudTrail", en: "AWS CloudTrail" },
    definition: {
      pt: "Serviço que registra e monitora atividades de conta AWS. Fornece histórico de eventos de chamadas de API para auditoria, conformidade e análise de segurança.",
      en: "Service that records and monitors AWS account activities. Provides event history of API calls for auditing, compliance, and security analysis.",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon CloudWatch", en: "Amazon CloudWatch" },
    definition: {
      pt: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos.",
      en: "Monitoring and observability service providing data and insights to monitor applications, respond to performance changes, and optimize resource utilization.",
    },
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS Shield", en: "AWS Shield" },
    definition: {
      pt: "Serviço gerenciado de proteção contra DDoS. Shield Standard é automático e gratuito; Shield Advanced oferece proteção adicional com resposta 24/7 e proteção de custos.",
      en: "Managed DDoS protection service. Shield Standard is automatic and free; Shield Advanced offers additional protection with 24/7 response and cost protection.",
    },
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: {
      pt: "Modelo de Responsabilidade Compartilhada",
      en: "Shared Responsibility Model",
    },
    definition: {
      pt: "Framework que define responsabilidades de segurança entre AWS e cliente. AWS é responsável pela segurança DA nuvem (infraestrutura); cliente é responsável pela segurança NA nuvem (dados, aplicações).",
      en: "Framework defining security responsibilities between AWS and customer. AWS is responsible for security OF the cloud (infrastructure); customer is responsible for security IN the cloud (data, applications).",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: {
      pt: "AWS CLI (Command Line Interface)",
      en: "AWS CLI (Command Line Interface)",
    },
    definition: {
      pt: "Ferramenta unificada para gerenciar serviços AWS via linha de comando. Permite automatizar tarefas através de scripts.",
      en: "Unified tool for managing AWS services via command line. Enables automating tasks through scripts.",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "Amazon DynamoDB", en: "Amazon DynamoDB" },
    definition: {
      pt: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor.",
      en: "Fully managed NoSQL database providing fast and predictable performance with automatic scaling. Supports document and key-value data models.",
    },
  },
  {
    cert: "clf-c02",
    domain: "tecnologia",
    term: { pt: "AWS Global Accelerator", en: "AWS Global Accelerator" },
    definition: {
      pt: "Serviço de rede que melhora a disponibilidade e a performance das aplicações usando a infraestrutura de rede global da AWS para direcionar o tráfego por caminhos otimizados.",
      en: "Networking service that improves the availability and performance of applications by using AWS’s global network infrastructure to route traffic via optimized paths.",
    },
  },
  {
    cert: "clf-c02",
    domain: "seguranca",
    term: { pt: "AWS Artifact", en: "AWS Artifact" },
    definition: {
      pt: "Portal de autoatendimento para acesso sob demanda a relatórios de conformidade da AWS e acordos online específicos (como o HIPAA).",
      en: "Self-service portal for on-demand access to AWS compliance reports and specific online agreements (such as HIPAA).",
    },
  },

  // ==========================================
  // SAA-C03: Solutions Architect Associate
  // ==========================================
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: {
      pt: "Amazon VPC (Virtual Private Cloud)",
      en: "Amazon VPC (Virtual Private Cloud)",
    },
    definition: {
      pt: "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways.",
      en: "Logically isolated virtual network in AWS where you can launch resources with complete control over network configuration, including subnets, routing tables, and gateways.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: {
      pt: "Amazon RDS (Relational Database Service)",
      en: "Amazon RDS (Relational Database Service)",
    },
    definition: {
      pt: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados. Suporta MySQL, PostgreSQL, Oracle, SQL Server, MariaDB e Amazon Aurora.",
      en: "Managed relational database service that makes it easy to set up, operate, and scale databases. Supports MySQL, PostgreSQL, Oracle, SQL Server, MariaDB, and Amazon Aurora.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "Amazon S3 Glacier", en: "Amazon S3 Glacier" },
    definition: {
      pt: "Classes de armazenamento de baixo custo para arquivamento de dados e backup de longo prazo. Oferece três opções de recuperação: Expedited, Standard e Bulk.",
      en: "Low-cost storage classes for data archiving and long-term backup. Offers three retrieval options: Expedited, Standard, and Bulk.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: {
      pt: "Elastic Load Balancing (ELB)",
      en: "Elastic Load Balancing (ELB)",
    },
    definition: {
      pt: "Distribui automaticamente tráfego de entrada entre múltiplos destinos. Inclui Application Load Balancer (ALB), Network Load Balancer (NLB) e Gateway Load Balancer.",
      en: "Automatically distributes incoming traffic across multiple targets. Includes Application Load Balancer (ALB), Network Load Balancer (NLB), and Gateway Load Balancer.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "AWS Lambda", en: "AWS Lambda" },
    definition: {
      pt: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução.",
      en: "Serverless compute service that runs code in response to events. Automatically manages compute resources and you only pay for execution time.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon Aurora Replicas", en: "Amazon Aurora Replicas" },
    definition: {
      pt: "Cópias independentes no cluster do Aurora que permitem escalar leituras e fornecem destinos de failover automático para alta disponibilidade.",
      en: "Independent copies in the Aurora cluster that allow for read scaling and provide automatic failover targets for high availability.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Amazon Route 53", en: "Amazon Route 53" },
    definition: {
      pt: "Serviço web de DNS altamente disponível e escalável. Oferece roteamento de tráfego (como latência, geolocalização e failover) e verificações de integridade (health checks).",
      en: "Highly available and scalable cloud DNS web service. Offers traffic routing (such as latency, geolocation, and failover) and health checks.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: {
      pt: "Amazon SQS (Simple Queue Service)",
      en: "Amazon SQS (Simple Queue Service)",
    },
    definition: {
      pt: "Serviço de filas de mensagens totalmente gerenciado que permite desacoplar e escalar microsserviços, sistemas distribuídos e aplicações serverless.",
      en: "Fully managed message queuing service that enables you to decouple and scale microservices, distributed systems, and serverless applications.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: {
      pt: "Amazon EFS (Elastic File System)",
      en: "Amazon EFS (Elastic File System)",
    },
    definition: {
      pt: "Sistema de arquivos NFS elástico e totalmente gerenciado. Pode ser montado em várias instâncias EC2 simultaneamente, escalando automaticamente de petabytes.",
      en: "Fully managed, elastic NFS file system. Can be mounted on multiple EC2 instances concurrently, automatically scaling to petabytes.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "Multi-AZ Deployment (RDS)", en: "Multi-AZ Deployment (RDS)" },
    definition: {
      pt: "Recurso do RDS que provisiona e mantém uma réplica síncrona em espera (standby) em uma Zona de Disponibilidade diferente para failover automático.",
      en: "RDS feature that provisions and maintains a synchronous standby replica in a different Availability Zone for automatic failover.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-resiliente",
    term: { pt: "AWS Auto Scaling", en: "AWS Auto Scaling" },
    definition: {
      pt: "Monitora aplicações e ajusta automaticamente a capacidade para manter um desempenho constante e previsível com o menor custo possível.",
      en: "Monitors your applications and automatically adjusts capacity to maintain steady, predictable performance at the lowest possible cost.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon CloudFront", en: "Amazon CloudFront" },
    definition: {
      pt: "Serviço de Content Delivery Network (CDN) rápido que entrega dados, vídeos e APIs com segurança a clientes globais com baixa latência e altas velocidades de transferência.",
      en: "Fast Content Delivery Network (CDN) service that securely delivers data, videos, and APIs to customers globally with low latency and high transfer speeds.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon ElastiCache", en: "Amazon ElastiCache" },
    definition: {
      pt: "Serviço totalmente gerenciado de armazenamento de dados em memória (Redis ou Memcached) que acelera o desempenho das aplicações.",
      en: "Fully managed in-memory data store service (Redis or Memcached) that accelerates application performance.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "AWS Transit Gateway", en: "AWS Transit Gateway" },
    definition: {
      pt: "Conecta VPCs e redes on-premises por meio de um hub central, simplificando a topologia da rede e evitando configurações complexas de peering.",
      en: "Connects VPCs and on-premises networks through a central hub, simplifying network topology and avoiding complex peering relationships.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: { pt: "Amazon DynamoDB DAX", en: "Amazon DynamoDB DAX" },
    definition: {
      pt: "Cache em memória totalmente gerenciado e altamente disponível para o DynamoDB que reduz o tempo de resposta de milissegundos para microssegundos.",
      en: "Fully managed, highly available, in-memory cache for DynamoDB that reduces response times from milliseconds to microseconds.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-performance",
    term: {
      pt: "EBS Provisioned IOPS (io1/io2)",
      en: "EBS Provisioned IOPS (io1/io2)",
    },
    definition: {
      pt: "Volumes de armazenamento SSD de alto desempenho projetados para cargas de trabalho críticas e intensivas em E/S (I/O) que requerem baixa latência.",
      en: "High-performance SSD storage volumes designed for critical, I/O-intensive workloads that require low latency.",
    },
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: {
      pt: "AWS KMS (Key Management Service)",
      en: "AWS KMS (Key Management Service)",
    },
    definition: {
      pt: "Serviço gerenciado que facilita a criação e o controle das chaves criptográficas usadas para proteger seus dados na nuvem AWS.",
      en: "Managed service that makes it easy for you to create and control the cryptographic keys used to protect your data in the AWS cloud.",
    },
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: {
      pt: "AWS WAF (Web Application Firewall)",
      en: "AWS WAF (Web Application Firewall)",
    },
    definition: {
      pt: "Firewall de aplicação web que ajuda a proteger suas aplicações contra exploits comuns da web (como SQL injection e Cross-Site Scripting) que afetam a disponibilidade.",
      en: "Web application firewall that helps protect your web applications from common web exploits (like SQL injection and Cross-Site Scripting) that affect availability.",
    },
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "AWS Secrets Manager", en: "AWS Secrets Manager" },
    definition: {
      pt: "Serviço que ajuda você a proteger, alternar, gerenciar e recuperar credenciais de banco de dados, chaves de API e outros segredos durante seu ciclo de vida.",
      en: "Service that helps you protect, rotate, manage, and retrieve database credentials, API keys, and other secrets throughout their lifecycle.",
    },
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "Amazon GuardDuty", en: "Amazon GuardDuty" },
    definition: {
      pt: "Serviço de detecção de ameaças que monitora continuamente atividades maliciosas e comportamentos anômalos para proteger suas contas e cargas de trabalho na AWS.",
      en: "Threat detection service that continuously monitors for malicious activity and anomalous behavior to protect your AWS accounts and workloads.",
    },
  },
  {
    cert: "saa-c03",
    domain: "seguranca-aplicacoes",
    term: { pt: "IAM Roles (Funções IAM)", en: "IAM Roles" },
    definition: {
      pt: "Uma identidade do IAM que você pode criar em sua conta e que tem permissões específicas. Não possui credenciais permanentes e é assumida temporariamente por usuários ou serviços.",
      en: "An IAM identity that you can create in your account that has specific permissions. It does not have standard long-term credentials and is temporarily assumed by users or services.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "Amazon EC2 Spot Instances", en: "Amazon EC2 Spot Instances" },
    definition: {
      pt: "Capacidade computacional ociosa da AWS disponível com grandes descontos (até 90%). Ideal para cargas de trabalho flexíveis e tolerantes a falhas, pois podem ser interrompidas.",
      en: "Spare AWS compute capacity available at steep discounts (up to 90%). Ideal for flexible, fault-tolerant workloads as they can be interrupted.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Savings Plans", en: "AWS Savings Plans" },
    definition: {
      pt: "Modelo de preços flexível que oferece preços mais baixos em troca do compromisso de usar uma quantidade específica (medida em $/hora) de poder de computação por 1 ou 3 anos.",
      en: "Flexible pricing model that offers lower prices in exchange for a commitment to use a specific amount (measured in $/hour) of compute power for 1 or 3 years.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: {
      pt: "Amazon S3 Intelligent-Tiering",
      en: "Amazon S3 Intelligent-Tiering",
    },
    definition: {
      pt: "Classe de armazenamento do S3 que otimiza custos automaticamente, movendo dados entre camadas de acesso frequente e infrequente com base nos padrões de acesso.",
      en: "S3 storage class that automatically optimizes costs by moving data between frequent and infrequent access tiers based on access patterns.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Compute Optimizer", en: "AWS Compute Optimizer" },
    definition: {
      pt: "Recomenda os recursos de computação ideais da AWS para suas cargas de trabalho para reduzir custos e melhorar o desempenho usando machine learning.",
      en: "Recommends optimal AWS compute resources for your workloads to reduce costs and improve performance using machine learning.",
    },
  },
  {
    cert: "saa-c03",
    domain: "design-custo",
    term: { pt: "AWS Budgets", en: "AWS Budgets" },
    definition: {
      pt: "Permite definir orçamentos personalizados que alertam você quando seus custos ou uso excedem (ou prevêem exceder) o valor orçado definido.",
      en: "Allows you to set custom budgets that alert you when your costs or usage exceed (or are forecasted to exceed) your budgeted amount.",
    },
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
      en: "Fully managed source control service hosting private Git repositories. Eliminates the need to operate your own source control system.",
    },
  },
  {
    cert: "dva-c02",
    domain: "implementacao",
    term: { pt: "AWS CodeBuild", en: "AWS CodeBuild" },
    definition: {
      pt: "Serviço de integração contínua totalmente gerenciado que compila código-fonte, executa testes e produz pacotes de software prontos para deploy.",
      en: "Fully managed continuous integration service that compiles source code, runs tests, and produces software packages ready for deployment.",
    },
  },
  {
    cert: "dva-c02",
    domain: "desenvolvimento-servicos",
    term: { pt: "Amazon API Gateway", en: "Amazon API Gateway" },
    definition: {
      pt: "Serviço totalmente gerenciado para criar, publicar, manter, monitorar e proteger APIs REST, HTTP e WebSocket em qualquer escala.",
      en: "Fully managed service for creating, publishing, maintaining, monitoring, and securing REST, HTTP, and WebSocket APIs at any scale.",
    },
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
      en: "Fully managed service for building, training, and deploying machine learning models at scale. Provides Jupyter notebooks, built-in algorithms, and managed infrastructure.",
    },
  },
  {
    cert: "aif-c01",
    domain: "applications-foundation-models",
    term: { pt: "Amazon Bedrock", en: "Amazon Bedrock" },
    definition: {
      pt: "Serviço totalmente gerenciado que oferece modelos de fundação (FMs) de alto desempenho de empresas líderes em IA via API única. Permite construir e escalar aplicações de IA generativa.",
      en: "Fully managed service offering high-performance foundation models (FMs) from leading AI companies via a single API. Enables building and scaling generative AI applications.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Rekognition", en: "Amazon Rekognition" },
    definition: {
      pt: "Serviço de análise de imagem e vídeo que identifica objetos, pessoas, texto, cenas e atividades. Também detecta conteúdo inadequado e fornece análise facial.",
      en: "Image and video analysis service that identifies objects, people, text, scenes, and activities. Also detects inappropriate content and provides facial analysis.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Comprehend", en: "Amazon Comprehend" },
    definition: {
      pt: "Serviço de processamento de linguagem natural (NLP) que usa machine learning para descobrir insights e relacionamentos em texto. Identifica idioma, entidades, sentimentos e tópicos.",
      en: "Natural language processing (NLP) service using machine learning to discover insights and relationships in text. Identifies language, entities, sentiments, and topics.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-ai-ml",
    term: { pt: "Amazon Translate", en: "Amazon Translate" },
    definition: {
      pt: "Serviço de tradução automática neural que fornece tradução de idiomas rápida, de alta qualidade e acessível. Suporta mais de 75 idiomas.",
      en: "Neural machine translation service providing fast, high-quality, and affordable language translation. Supports over 75 languages.",
    },
  },

  // DVA-C02 coverage additions: one concept per canonical domain.
  {
    cert: "dva-c02",
    domain: "desenvolvimento-servicos",
    term: { pt: "AWS SDK", en: "AWS SDK" },
    definition: {
      pt: "Conjunto de bibliotecas que permite chamar serviços AWS diretamente a partir do código da aplicação.",
      en: "Set of libraries that lets application code call AWS services directly.",
    },
  },
  {
    cert: "dva-c02",
    domain: "implementacao",
    term: { pt: "AWS CodeDeploy", en: "AWS CodeDeploy" },
    definition: {
      pt: "Serviço que automatiza a implantação de aplicações em instâncias, serviços serverless e plataformas gerenciadas.",
      en: "Service that automates application deployments to instances, serverless services, and managed platforms.",
    },
  },
  {
    cert: "dva-c02",
    domain: "implementacao",
    term: { pt: "AWS CodePipeline", en: "AWS CodePipeline" },
    definition: {
      pt: "Serviço de entrega contínua que modela as etapas de compilação, teste e implantação de uma aplicação.",
      en: "Continuous delivery service that models an application's build, test, and deployment stages.",
    },
  },
  {
    cert: "dva-c02",
    domain: "seguranca-app",
    term: { pt: "AWS Secrets Manager", en: "AWS Secrets Manager" },
    definition: {
      pt: "Armazena e recupera credenciais e outros segredos com controle de acesso e rotação automatizada.",
      en: "Stores and retrieves credentials and other secrets with access control and automated rotation.",
    },
  },
  {
    cert: "dva-c02",
    domain: "seguranca-app",
    term: { pt: "Amazon Cognito", en: "Amazon Cognito" },
    definition: {
      pt: "Oferece autenticação, autorização e gerenciamento de usuários para aplicações web e móveis.",
      en: "Provides authentication, authorization, and user management for web and mobile applications.",
    },
  },
  {
    cert: "dva-c02",
    domain: "seguranca-app",
    term: { pt: "AWS Identity and Access Management", en: "AWS Identity and Access Management" },
    definition: {
      pt: "Controla identidades, funções e permissões usadas para acessar recursos AWS.",
      en: "Controls identities, roles, and permissions used to access AWS resources.",
    },
  },
  {
    cert: "dva-c02",
    domain: "resolucao-problemas",
    term: { pt: "Amazon CloudWatch Logs", en: "Amazon CloudWatch Logs" },
    definition: {
      pt: "Centraliza logs de aplicações e recursos para consulta, monitoramento e investigação de falhas.",
      en: "Centralizes application and resource logs for querying, monitoring, and troubleshooting failures.",
    },
  },
  {
    cert: "dva-c02",
    domain: "resolucao-problemas",
    term: { pt: "AWS X-Ray", en: "AWS X-Ray" },
    definition: {
      pt: "Rastreia requisições distribuídas para identificar gargalos e erros em aplicações compostas por vários serviços.",
      en: "Traces distributed requests to identify bottlenecks and errors in applications built from multiple services.",
    },
  },
  {
    cert: "dva-c02",
    domain: "resolucao-problemas",
    term: { pt: "Amazon API Gateway access logs", en: "Amazon API Gateway access logs" },
    definition: {
      pt: "Registram chamadas às APIs, códigos de resposta e latência para apoiar a investigação de problemas.",
      en: "Record API calls, response codes, and latency to support problem investigation.",
    },
  },

  // AIF-C01 coverage additions: complete the minimum floor for every domain.
  {
    cert: "aif-c01",
    domain: "applications-foundation-models",
    term: { pt: "Amazon Bedrock knowledge bases", en: "Amazon Bedrock knowledge bases" },
    definition: {
      pt: "Conectam modelos de fundação a fontes privadas para gerar respostas baseadas em dados recuperados.",
      en: "Connect foundation models to private data sources to generate answers grounded in retrieved data.",
    },
  },
  {
    cert: "aif-c01",
    domain: "applications-foundation-models",
    term: { pt: "Amazon Bedrock Agents", en: "Amazon Bedrock Agents" },
    definition: {
      pt: "Orquestram modelos de fundação, APIs e fontes de dados para executar tarefas em aplicações generativas.",
      en: "Orchestrate foundation models, APIs, and data sources to perform tasks in generative applications.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-genai",
    term: { pt: "Modelo de fundação", en: "Foundation model" },
    definition: {
      pt: "Modelo treinado em grandes volumes de dados e adaptável a diferentes tarefas de inteligência artificial.",
      en: "Model trained on large volumes of data and adaptable to different artificial intelligence tasks.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-genai",
    term: { pt: "Prompt engineering", en: "Prompt engineering" },
    definition: {
      pt: "Prática de estruturar instruções para orientar a resposta de um modelo generativo.",
      en: "Practice of structuring instructions to guide a generative model's response.",
    },
  },
  {
    cert: "aif-c01",
    domain: "fundamentals-genai",
    term: { pt: "Tokens", en: "Tokens" },
    definition: {
      pt: "Unidades de texto processadas por um modelo e usadas para medir entrada, saída e limites de contexto.",
      en: "Text units processed by a model and used to measure input, output, and context limits.",
    },
  },
  {
    cert: "aif-c01",
    domain: "guidelines-responsible-ai",
    term: { pt: "Explicabilidade", en: "Explainability" },
    definition: {
      pt: "Capacidade de comunicar os fatores que contribuem para uma previsão ou decisão de um modelo.",
      en: "Ability to communicate the factors that contribute to a model's prediction or decision.",
    },
  },
  {
    cert: "aif-c01",
    domain: "guidelines-responsible-ai",
    term: { pt: "Viés em modelos", en: "Model bias" },
    definition: {
      pt: "Tendência sistemática que pode produzir resultados injustos ou menos precisos para determinados grupos.",
      en: "Systematic tendency that can produce unfair or less accurate results for certain groups.",
    },
  },
  {
    cert: "aif-c01",
    domain: "guidelines-responsible-ai",
    term: { pt: "Guardrails", en: "Guardrails" },
    definition: {
      pt: "Controles que ajudam a limitar entradas e saídas inadequadas em uma aplicação de IA generativa.",
      en: "Controls that help limit unsuitable inputs and outputs in a generative AI application.",
    },
  },
  {
    cert: "aif-c01",
    domain: "security-compliance-governance",
    term: { pt: "Proteção de dados em IA", en: "AI data protection" },
    definition: {
      pt: "Práticas para controlar acesso, uso e retenção dos dados processados por soluções de inteligência artificial.",
      en: "Practices for controlling access to, use of, and retention of data processed by AI solutions.",
    },
  },
  {
    cert: "aif-c01",
    domain: "security-compliance-governance",
    term: { pt: "Amazon Macie", en: "Amazon Macie" },
    definition: {
      pt: "Serviço que usa machine learning para descobrir e proteger dados sensíveis armazenados no Amazon S3.",
      en: "Service that uses machine learning to discover and protect sensitive data stored in Amazon S3.",
    },
  },
  {
    cert: "aif-c01",
    domain: "security-compliance-governance",
    term: { pt: "AWS CloudTrail", en: "AWS CloudTrail" },
    definition: {
      pt: "Registra atividades de API para apoiar auditoria, rastreabilidade e investigação de segurança.",
      en: "Records API activity to support auditing, traceability, and security investigations.",
    },
  },
  // CLF-C02: conceitos-cloud (7 novos)
  { id: "fc-11-2-clf-conceitos-cloud-01", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "O que diferencia elasticidade de escalabilidade?", en: "What distinguishes elasticity from scalability?" }, definition: { pt: "Elasticidade ajusta recursos dinamicamente à demanda; escalabilidade é a capacidade de crescer para suportar mais carga.", en: "Elasticity adjusts resources dynamically to demand; scalability is the ability to grow to support more load." } },
  { id: "fc-11-2-clf-conceitos-cloud-02", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "O que significa alta disponibilidade?", en: "What does high availability mean?" }, definition: { pt: "Manter um serviço acessível com interrupções mínimas por meio de redundância e recuperação de falhas.", en: "Keeping a service accessible with minimal interruption through redundancy and failure recovery." } },
  { id: "fc-11-2-clf-conceitos-cloud-03", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "Qual é a diferença entre uma Região e uma Availability Zone?", en: "What is the difference between a Region and an Availability Zone?" }, definition: { pt: "Uma Região é uma área geográfica; uma Availability Zone é uma localização isolada dentro dela.", en: "A Region is a geographic area; an Availability Zone is an isolated location within it." } },
  { id: "fc-11-2-clf-conceitos-cloud-04", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "O que caracteriza o modelo OpEx?", en: "What characterizes the OpEx model?" }, definition: { pt: "Custos operacionais variáveis pagos conforme o consumo, sem grande investimento inicial em infraestrutura.", en: "Variable operating costs paid according to usage, without a large upfront infrastructure investment." } },
  { id: "fc-11-2-clf-conceitos-cloud-05", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "Por que a nuvem facilita a experimentação?", en: "Why does the cloud make experimentation easier?" }, definition: { pt: "Recursos podem ser provisionados rapidamente e removidos quando não são mais necessários.", en: "Resources can be provisioned quickly and removed when they are no longer needed." } },
  { id: "fc-11-2-clf-conceitos-cloud-06", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "O que é um modelo de serviço gerenciado?", en: "What is a managed service model?" }, definition: { pt: "A AWS opera parte da infraestrutura e das tarefas de manutenção para que o cliente foque no uso do serviço.", en: "AWS operates part of the infrastructure and maintenance tasks so the customer can focus on using the service." } },
  { id: "fc-11-2-clf-conceitos-cloud-07", cert: "clf-c02", domain: "conceitos-cloud", term: { pt: "Qual benefício está associado à presença global da AWS?", en: "What benefit is associated with AWS global presence?" }, definition: { pt: "Aplicações podem ser implantadas mais perto dos usuários para reduzir latência e atender requisitos regionais.", en: "Applications can be deployed closer to users to reduce latency and meet regional requirements." } },
  // CLF-C02: seguranca (5 novos)
  { id: "fc-11-2-clf-seguranca-01", cert: "clf-c02", domain: "seguranca", term: { pt: "Qual é a função do MFA no IAM?", en: "What is the purpose of MFA in IAM?" }, definition: { pt: "Adicionar uma segunda evidência de identidade além da senha ou credencial principal.", en: "Adding a second identity factor beyond the password or primary credential." } },
  { id: "fc-11-2-clf-seguranca-02", cert: "clf-c02", domain: "seguranca", term: { pt: "O que significa aplicar o princípio do menor privilégio?", en: "What does applying least privilege mean?" }, definition: { pt: "Conceder somente as permissões necessárias para uma tarefa e nada além disso.", en: "Granting only the permissions necessary for a task and nothing more." } },
  { id: "fc-11-2-clf-seguranca-03", cert: "clf-c02", domain: "seguranca", term: { pt: "Para que serve o AWS CloudTrail?", en: "What is AWS CloudTrail used for?" }, definition: { pt: "Registrar chamadas de API para auditoria, investigação e rastreabilidade.", en: "Recording API calls for auditing, investigation, and traceability." } },
  { id: "fc-11-2-clf-seguranca-04", cert: "clf-c02", domain: "seguranca", term: { pt: "Qual responsabilidade normalmente pertence ao cliente na nuvem?", en: "Which responsibility usually belongs to the customer in the cloud?" }, definition: { pt: "Configurar acesso, dados e sistemas operacionais conforme o serviço utilizado.", en: "Configuring access, data, and operating systems according to the service used." } },
  { id: "fc-11-2-clf-seguranca-05", cert: "clf-c02", domain: "seguranca", term: { pt: "Quando o AWS Organizations é útil?", en: "When is AWS Organizations useful?" }, definition: { pt: "Quando é necessário administrar várias contas, políticas e controles de forma centralizada.", en: "When multiple accounts, policies, and controls need centralized management." } },
  // CLF-C02: tecnologia (4 novos)
  { id: "fc-11-2-clf-tecnologia-01", cert: "clf-c02", domain: "tecnologia", term: { pt: "Qual categoria descreve o Amazon EC2?", en: "Which category describes Amazon EC2?" }, definition: { pt: "Computação que fornece máquinas virtuais configuráveis.", en: "Compute that provides configurable virtual machines." } },
  { id: "fc-11-2-clf-tecnologia-02", cert: "clf-c02", domain: "tecnologia", term: { pt: "Qual serviço oferece armazenamento de objetos?", en: "Which service provides object storage?" }, definition: { pt: "O Amazon S3 armazena objetos em buckets com alta durabilidade e acesso pela rede.", en: "Amazon S3 stores objects in buckets with high durability and network access." } },
  { id: "fc-11-2-clf-tecnologia-03", cert: "clf-c02", domain: "tecnologia", term: { pt: "Para que serve o Amazon CloudWatch?", en: "What is Amazon CloudWatch used for?" }, definition: { pt: "Monitorar métricas, logs e alarmes de recursos e aplicações.", en: "Monitoring metrics, logs, and alarms for resources and applications." } },
  { id: "fc-11-2-clf-tecnologia-04", cert: "clf-c02", domain: "tecnologia", term: { pt: "Qual serviço fornece um banco relacional gerenciado?", en: "Which service provides a managed relational database?" }, definition: { pt: "O Amazon RDS simplifica a operação de engines relacionais suportadas.", en: "Amazon RDS simplifies operating supported relational database engines." } },
  // CLF-C02: faturamento (7 novos)
  { id: "fc-11-2-clf-faturamento-01", cert: "clf-c02", domain: "faturamento", term: { pt: "Para que serve o AWS Cost Explorer?", en: "What is AWS Cost Explorer used for?" }, definition: { pt: "Analisar custos e uso ao longo do tempo usando filtros e agrupamentos.", en: "Analyzing costs and usage over time using filters and groupings." } },
  { id: "fc-11-2-clf-faturamento-02", cert: "clf-c02", domain: "faturamento", term: { pt: "O que um AWS Budget ajuda a controlar?", en: "What does an AWS Budget help control?" }, definition: { pt: "Limites e alertas de custo ou uso para apoiar o acompanhamento financeiro.", en: "Cost or usage thresholds and alerts to support financial tracking." } },
  { id: "fc-11-2-clf-faturamento-03", cert: "clf-c02", domain: "faturamento", term: { pt: "Quando o Free Tier pode ser usado?", en: "When can the Free Tier be used?" }, definition: { pt: "Para consumir determinados serviços dentro dos limites e condições gratuitos aplicáveis.", en: "To use selected services within their applicable free limits and conditions." } },
  { id: "fc-11-2-clf-faturamento-04", cert: "clf-c02", domain: "faturamento", term: { pt: "Qual é o objetivo do right-sizing?", en: "What is the goal of right-sizing?" }, definition: { pt: "Escolher recursos compatíveis com a carga real para evitar capacidade e custo desnecessários.", en: "Choosing resources that match actual load to avoid unnecessary capacity and cost." } },
  { id: "fc-11-2-clf-faturamento-05", cert: "clf-c02", domain: "faturamento", term: { pt: "O que os Savings Plans podem reduzir?", en: "What can Savings Plans reduce?" }, definition: { pt: "O custo de uso comprometido de computação em troca de compromisso de consumo.", en: "The cost of committed compute usage in exchange for a usage commitment." } },
  { id: "fc-11-2-clf-faturamento-06", cert: "clf-c02", domain: "faturamento", term: { pt: "Quando uma Reserved Instance pode ser adequada?", en: "When can a Reserved Instance be appropriate?" }, definition: { pt: "Quando existe uso previsível de uma capacidade compatível durante um período contratado.", en: "When predictable use of compatible capacity exists during a contracted period." } },
  { id: "fc-11-2-clf-faturamento-07", cert: "clf-c02", domain: "faturamento", term: { pt: "O que é o custo total de propriedade?", en: "What is total cost of ownership?" }, definition: { pt: "A avaliação do custo completo de adquirir, operar e manter uma solução.", en: "An evaluation of the complete cost to acquire, operate, and maintain a solution." } },
  // SAA-C03: design-resiliente (2 novos)
  { id: "fc-11-2-saa-design-resiliente-01", cert: "saa-c03", domain: "design-resiliente", term: { pt: "Por que distribuir instâncias em várias Availability Zones?", en: "Why distribute instances across multiple Availability Zones?" }, definition: { pt: "Para reduzir o impacto de uma falha isolada de zona e manter capacidade disponível.", en: "To reduce the impact of an isolated zone failure and keep capacity available." } },
  { id: "fc-11-2-saa-design-resiliente-02", cert: "saa-c03", domain: "design-resiliente", term: { pt: "Qual padrão permite reprocessar mensagens que falharam?", en: "Which pattern allows failed messages to be reprocessed?" }, definition: { pt: "Uma dead-letter queue separa mensagens não processadas após as tentativas configuradas.", en: "A dead-letter queue separates unprocessed messages after configured attempts." } },
  // SAA-C03: design-performance (3 novos)
  { id: "fc-11-2-saa-design-performance-01", cert: "saa-c03", domain: "design-performance", term: { pt: "Qual serviço reduz a latência de conteúdo distribuído globalmente?", en: "Which service reduces latency for globally distributed content?" }, definition: { pt: "O Amazon CloudFront usa uma rede de pontos de presença para entregar conteúdo mais perto do usuário.", en: "Amazon CloudFront uses a network of points of presence to deliver content closer to users." } },
  { id: "fc-11-2-saa-design-performance-02", cert: "saa-c03", domain: "design-performance", term: { pt: "Para que servem read replicas no Amazon RDS?", en: "What are read replicas used for in Amazon RDS?" }, definition: { pt: "Distribuir leituras para melhorar a capacidade de leitura sem substituir a instância primária.", en: "Distributing reads to improve read capacity without replacing the primary instance." } },
  { id: "fc-11-2-saa-design-performance-03", cert: "saa-c03", domain: "design-performance", term: { pt: "Quando o Amazon ElastiCache é útil?", en: "When is Amazon ElastiCache useful?" }, definition: { pt: "Quando dados acessados frequentemente podem ser mantidos em memória para reduzir latência.", en: "When frequently accessed data can be kept in memory to reduce latency." } },
  // SAA-C03: seguranca-aplicacoes (5 novos)
  { id: "fc-11-2-saa-seguranca-01", cert: "saa-c03", domain: "seguranca-aplicacoes", term: { pt: "Qual é a diferença básica entre Security Group e NACL?", en: "What is the basic difference between a Security Group and a NACL?" }, definition: { pt: "Security Groups protegem interfaces com estado; NACLs protegem sub-redes e são stateless.", en: "Security Groups protect interfaces statefully; NACLs protect subnets and are stateless." } },
  { id: "fc-11-2-saa-seguranca-02", cert: "saa-c03", domain: "seguranca-aplicacoes", term: { pt: "Quando usar o AWS KMS?", en: "When should AWS KMS be used?" }, definition: { pt: "Para criar e controlar chaves usadas em operações de criptografia e integração com serviços AWS.", en: "To create and control keys used in encryption operations and AWS service integrations." } },
  { id: "fc-11-2-saa-seguranca-03", cert: "saa-c03", domain: "seguranca-aplicacoes", term: { pt: "Para que serve o AWS Secrets Manager?", en: "What is AWS Secrets Manager used for?" }, definition: { pt: "Armazenar, controlar e recuperar segredos de aplicações com rotação quando configurada.", en: "Storing, controlling, and retrieving application secrets with rotation when configured." } },
  { id: "fc-11-2-saa-seguranca-04", cert: "saa-c03", domain: "seguranca-aplicacoes", term: { pt: "O que um VPC endpoint pode evitar?", en: "What can a VPC endpoint avoid?" }, definition: { pt: "A necessidade de encaminhar determinado tráfego de serviço por um caminho público da internet.", en: "The need to route certain service traffic through a public internet path." } },
  { id: "fc-11-2-saa-seguranca-05", cert: "saa-c03", domain: "seguranca-aplicacoes", term: { pt: "Qual é o papel do AWS WAF?", en: "What is the role of AWS WAF?" }, definition: { pt: "Filtrar requisições HTTP e HTTPS conforme regras de proteção configuradas.", en: "Filtering HTTP and HTTPS requests according to configured protection rules." } },
  // SAA-C03: design-custo (4 novos)
  { id: "fc-11-2-saa-custo-01", cert: "saa-c03", domain: "design-custo", term: { pt: "Como uma política de ciclo de vida do S3 pode reduzir custos?", en: "How can an S3 lifecycle policy reduce costs?" }, definition: { pt: "Movendo objetos conforme sua idade e padrão de acesso para classes mais econômicas.", en: "By moving objects according to age and access pattern to more economical classes." } },
  { id: "fc-11-2-saa-custo-02", cert: "saa-c03", domain: "design-custo", term: { pt: "Qual escolha evita manter servidores ociosos para uma carga variável?", en: "Which choice avoids keeping idle servers for variable load?" }, definition: { pt: "Usar computação elástica ou serverless alinhada à demanda em vez de capacidade fixa excessiva.", en: "Using elastic or serverless compute aligned to demand instead of excessive fixed capacity." } },
  { id: "fc-11-2-saa-custo-03", cert: "saa-c03", domain: "design-custo", term: { pt: "Por que avaliar transferência de dados em uma arquitetura?", en: "Why evaluate data transfer in an architecture?" }, definition: { pt: "Porque volume, direção e localização do tráfego podem alterar significativamente o custo.", en: "Because traffic volume, direction, and location can significantly affect cost." } },
  { id: "fc-11-2-saa-custo-04", cert: "saa-c03", domain: "design-custo", term: { pt: "Qual prática complementa o right-sizing?", en: "Which practice complements right-sizing?" }, definition: { pt: "Medir o uso real continuamente e ajustar recursos quando o padrão de carga mudar.", en: "Continuously measuring actual usage and adjusting resources when load patterns change." } },
  // DVA-C02: desenvolvimento-servicos (7 novos)
  { id: "fc-11-2-dva-desenvolvimento-01", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "O que caracteriza uma função AWS Lambda?", en: "What characterizes an AWS Lambda function?" }, definition: { pt: "Código executado sob demanda sem o desenvolvedor administrar servidores diretamente.", en: "Code executed on demand without the developer directly managing servers." } },
  { id: "fc-11-2-dva-desenvolvimento-02", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Qual é o papel de um estágio no API Gateway?", en: "What is the role of a stage in API Gateway?" }, definition: { pt: "Representar uma implantação nomeada de uma API, como dev, test ou prod.", en: "Representing a named deployment of an API, such as dev, test, or prod." } },
  { id: "fc-11-2-dva-desenvolvimento-03", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Como o DynamoDB modela acesso eficiente?", en: "How does DynamoDB model efficient access?" }, definition: { pt: "A tabela deve ser desenhada a partir dos padrões de acesso e das chaves necessárias às consultas.", en: "The table should be designed from access patterns and the keys required by queries." } },
  { id: "fc-11-2-dva-desenvolvimento-04", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Quando o Amazon EventBridge é apropriado?", en: "When is Amazon EventBridge appropriate?" }, definition: { pt: "Para rotear eventos entre produtores e consumidores usando regras e destinos desacoplados.", en: "To route events between producers and consumers using decoupled rules and targets." } },
  { id: "fc-11-2-dva-desenvolvimento-05", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Qual problema o AWS Step Functions ajuda a organizar?", en: "What problem does AWS Step Functions help organize?" }, definition: { pt: "Orquestrar etapas, estados, retries e caminhos de uma execução distribuída.", en: "Orchestrating steps, states, retries, and paths in a distributed execution." } },
  { id: "fc-11-2-dva-desenvolvimento-06", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Por que uma operação idempotente é importante?", en: "Why is an idempotent operation important?" }, definition: { pt: "Repetir a mesma solicitação não deve produzir efeitos duplicados indesejados.", en: "Repeating the same request should not produce unintended duplicate effects." } },
  { id: "fc-11-2-dva-desenvolvimento-07", cert: "dva-c02", domain: "desenvolvimento-servicos", term: { pt: "Quando o Amazon SNS é preferível ao SQS?", en: "When is Amazon SNS preferable to SQS?" }, definition: { pt: "Quando uma mensagem precisa ser publicada para vários assinantes por um padrão fanout.", en: "When a message needs to be published to multiple subscribers using a fanout pattern." } },
  // DVA-C02: seguranca-app (7 novos)
  { id: "fc-11-2-dva-seguranca-01", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Por que uma aplicação usa IAM role em vez de chave fixa?", en: "Why does an application use an IAM role instead of a fixed key?" }, definition: { pt: "A role fornece credenciais temporárias e reduz a necessidade de armazenar segredos de longa duração.", en: "A role provides temporary credentials and reduces the need to store long-lived secrets." } },
  { id: "fc-11-2-dva-seguranca-02", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Quando o AWS Secrets Manager é adequado para uma aplicação?", en: "When is AWS Secrets Manager suitable for an application?" }, definition: { pt: "Quando a aplicação precisa recuperar credenciais ou outros segredos protegidos em runtime.", en: "When an application needs to retrieve protected credentials or other secrets at runtime." } },
  { id: "fc-11-2-dva-seguranca-03", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Qual é o uso típico do AWS Systems Manager Parameter Store?", en: "What is a typical use of AWS Systems Manager Parameter Store?" }, definition: { pt: "Centralizar parâmetros de configuração e, conforme o tipo, valores protegidos.", en: "Centralizing configuration parameters and, depending on type, protected values." } },
  { id: "fc-11-2-dva-seguranca-04", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Para que o Amazon Cognito fornece tokens?", en: "What does Amazon Cognito provide tokens for?" }, definition: { pt: "Representar a identidade autenticada e autorizar acesso a recursos conforme as regras da aplicação.", en: "Representing an authenticated identity and authorizing resource access according to application rules." } },
  { id: "fc-11-2-dva-seguranca-05", cert: "dva-c02", domain: "seguranca-app", term: { pt: "O que são credenciais temporárias?", en: "What are temporary credentials?" }, definition: { pt: "Credenciais com validade limitada emitidas para uma identidade ou sessão específica.", en: "Credentials with limited validity issued for a specific identity or session." } },
  { id: "fc-11-2-dva-seguranca-06", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Por que uma requisição assinada é usada?", en: "Why is a signed request used?" }, definition: { pt: "Para permitir que o serviço verifique autenticidade, integridade e contexto da requisição.", en: "To let the service verify the request's authenticity, integrity, and context." } },
  { id: "fc-11-2-dva-seguranca-07", cert: "dva-c02", domain: "seguranca-app", term: { pt: "Como o KMS participa de uma aplicação?", en: "How does KMS participate in an application?" }, definition: { pt: "Gerenciando chaves usadas por serviços e aplicações em operações de criptografia.", en: "By managing keys used by services and applications in encryption operations." } },
  // DVA-C02: implementacao (7 novos)
  { id: "fc-11-2-dva-implementacao-01", cert: "dva-c02", domain: "implementacao", term: { pt: "O que o AWS SAM simplifica?", en: "What does AWS SAM simplify?" }, definition: { pt: "A definição e o empacotamento de aplicações serverless para implantação.", en: "The definition and packaging of serverless applications for deployment." } },
  { id: "fc-11-2-dva-implementacao-02", cert: "dva-c02", domain: "implementacao", term: { pt: "Qual é o papel do AWS CodeBuild?", en: "What is the role of AWS CodeBuild?" }, definition: { pt: "Compilar código, executar testes e produzir artefatos em um ambiente gerenciado.", en: "Compiling code, running tests, and producing artifacts in a managed environment." } },
  { id: "fc-11-2-dva-implementacao-03", cert: "dva-c02", domain: "implementacao", term: { pt: "Para que serve o CodeDeploy?", en: "What is CodeDeploy used for?" }, definition: { pt: "Automatizar a implantação de versões de aplicações em destinos suportados.", en: "Automating application version deployments to supported targets." } },
  { id: "fc-11-2-dva-implementacao-04", cert: "dva-c02", domain: "implementacao", term: { pt: "O que uma versão de Lambda representa?", en: "What does a Lambda version represent?" }, definition: { pt: "Um snapshot imutável do código e da configuração publicados de uma função.", en: "An immutable snapshot of a function's published code and configuration." } },
  { id: "fc-11-2-dva-implementacao-05", cert: "dva-c02", domain: "implementacao", term: { pt: "Por que usar um alias de Lambda?", en: "Why use a Lambda alias?" }, definition: { pt: "Para apontar um nome estável para uma versão ou conjunto de versões da função.", en: "To point a stable name to a function version or weighted set of versions." } },
  { id: "fc-11-2-dva-implementacao-06", cert: "dva-c02", domain: "implementacao", term: { pt: "O que caracteriza uma implantação canary?", en: "What characterizes a canary deployment?" }, definition: { pt: "Liberar uma versão para uma pequena parcela do tráfego antes de ampliar sua exposição.", en: "Releasing a version to a small portion of traffic before expanding exposure." } },
  { id: "fc-11-2-dva-implementacao-07", cert: "dva-c02", domain: "implementacao", term: { pt: "Qual é o benefício do CloudFormation?", en: "What is the benefit of CloudFormation?" }, definition: { pt: "Declarar e reproduzir recursos de infraestrutura de forma versionável.", en: "Defining and reproducing infrastructure resources in a versionable way." } },
  // DVA-C02: resolucao-problemas (7 novos)
  { id: "fc-11-2-dva-resolucao-01", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "Qual dado o CloudWatch Logs ajuda a investigar?", en: "What data does CloudWatch Logs help investigate?" }, definition: { pt: "Eventos e mensagens produzidos por aplicações e serviços durante a execução.", en: "Events and messages produced by applications and services during execution." } },
  { id: "fc-11-2-dva-resolucao-02", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "Quando o AWS X-Ray é útil?", en: "When is AWS X-Ray useful?" }, definition: { pt: "Para rastrear uma requisição entre componentes distribuídos e localizar latência ou falhas.", en: "To trace a request across distributed components and locate latency or failures." } },
  { id: "fc-11-2-dva-resolucao-03", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "O que uma métrica pode revelar sobre uma Lambda?", en: "What can a metric reveal about a Lambda?" }, definition: { pt: "Tendências como duração, erros, invocações ou throttling ao longo do tempo.", en: "Trends such as duration, errors, invocations, or throttling over time." } },
  { id: "fc-11-2-dva-resolucao-04", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "Qual é o objetivo de uma retry policy?", en: "What is the purpose of a retry policy?" }, definition: { pt: "Tentar novamente falhas transitórias de forma controlada, evitando repetições infinitas.", en: "Retrying transient failures in a controlled way while avoiding infinite repetition." } },
  { id: "fc-11-2-dva-resolucao-05", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "O que o throttling indica?", en: "What does throttling indicate?" }, definition: { pt: "Que uma chamada excedeu um limite de taxa ou capacidade do serviço.", en: "That a call exceeded a service rate or capacity limit." } },
  { id: "fc-11-2-dva-resolucao-06", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "Para que serve uma DLQ em um fluxo assíncrono?", en: "What is a DLQ used for in an asynchronous flow?" }, definition: { pt: "Reter mensagens que não puderam ser processadas para investigação ou tratamento posterior.", en: "Holding messages that could not be processed for investigation or later handling." } },
  { id: "fc-11-2-dva-resolucao-07", cert: "dva-c02", domain: "resolucao-problemas", term: { pt: "Como a concorrência da Lambda pode causar falhas?", en: "How can Lambda concurrency cause failures?" }, definition: { pt: "Uma demanda acima dos limites pode provocar throttling e atrasar ou rejeitar invocações.", en: "Demand above limits can cause throttling and delay or reject invocations." } },
  // AIF-C01: fundamentals-ai-ml (6 novos)
  { id: "fc-11-2-aif-ml-01", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "O que é aprendizado supervisionado?", en: "What is supervised learning?" }, definition: { pt: "Aprendizado com exemplos rotulados para relacionar entradas a resultados conhecidos.", en: "Learning from labeled examples to relate inputs to known outcomes." } },
  { id: "fc-11-2-aif-ml-02", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "Qual é um uso típico de classificação?", en: "What is a typical use of classification?" }, definition: { pt: "Atribuir uma entrada a uma categoria, como fraude ou não fraude.", en: "Assigning an input to a category, such as fraud or not fraud." } },
  { id: "fc-11-2-aif-ml-03", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "Qual é um uso típico de regressão?", en: "What is a typical use of regression?" }, definition: { pt: "Estimar um valor numérico contínuo, como demanda ou preço.", en: "Estimating a continuous numeric value, such as demand or price." } },
  { id: "fc-11-2-aif-ml-04", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "O que acontece na fase de inferência?", en: "What happens during inference?" }, definition: { pt: "Um modelo treinado produz previsões a partir de novos dados.", en: "A trained model produces predictions from new data." } },
  { id: "fc-11-2-aif-ml-05", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "O que uma feature representa?", en: "What does a feature represent?" }, definition: { pt: "Uma característica ou variável usada pelo modelo para aprender padrões.", en: "A characteristic or variable used by a model to learn patterns." } },
  { id: "fc-11-2-aif-ml-06", cert: "aif-c01", domain: "fundamentals-ai-ml", term: { pt: "Por que separar dados de treino e teste?", en: "Why separate training and test data?" }, definition: { pt: "Para medir generalização em dados que não foram usados para ajustar o modelo.", en: "To measure generalization on data not used to fit the model." } },
  // AIF-C01: fundamentals-genai (7 novos)
  { id: "fc-11-2-aif-genai-01", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "O que caracteriza a IA generativa?", en: "What characterizes generative AI?" }, definition: { pt: "Produzir novo conteúdo a partir de padrões aprendidos em dados de treinamento.", en: "Producing new content from patterns learned in training data." } },
  { id: "fc-11-2-aif-genai-02", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "O que é um token em um modelo de linguagem?", en: "What is a token in a language model?" }, definition: { pt: "Uma unidade de texto processada pelo modelo, que pode ser uma palavra ou parte dela.", en: "A text unit processed by the model, which can be a word or part of one." } },
  { id: "fc-11-2-aif-genai-03", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "Como a temperatura influencia uma resposta?", en: "How does temperature influence a response?" }, definition: { pt: "Valores maiores tendem a aumentar a variedade; valores menores tendem a tornar a saída mais previsível.", en: "Higher values tend to increase variety; lower values tend to make output more predictable." } },
  { id: "fc-11-2-aif-genai-04", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "O que é uma alucinação de modelo?", en: "What is a model hallucination?" }, definition: { pt: "Uma resposta plausível, porém incorreta ou sem suporte suficiente nos dados disponíveis.", en: "A plausible response that is incorrect or insufficiently supported by available data." } },
  { id: "fc-11-2-aif-genai-05", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "Para que servem embeddings?", en: "What are embeddings used for?" }, definition: { pt: "Representar conteúdo como vetores para comparar significado e encontrar itens relacionados.", en: "Representing content as vectors to compare meaning and find related items." } },
  { id: "fc-11-2-aif-genai-06", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "O que é RAG?", en: "What is RAG?" }, definition: { pt: "Uma abordagem que recupera contexto relevante antes de gerar a resposta.", en: "An approach that retrieves relevant context before generating a response." } },
  { id: "fc-11-2-aif-genai-07", cert: "aif-c01", domain: "fundamentals-genai", term: { pt: "O que o contexto de um prompt fornece?", en: "What does prompt context provide?" }, definition: { pt: "Informações e instruções que orientam o modelo sobre a tarefa e os limites da resposta.", en: "Information and instructions that guide the model about the task and response boundaries." } },
  // AIF-C01: applications-foundation-models (7 novos)
  { id: "fc-11-2-aif-foundation-01", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "O que é um foundation model?", en: "What is a foundation model?" }, definition: { pt: "Um modelo treinado em grande volume de dados e adaptável a diversas tarefas.", en: "A model trained on large volumes of data and adaptable to many tasks." } },
  { id: "fc-11-2-aif-foundation-02", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "Qual é o papel do Amazon Bedrock?", en: "What is the role of Amazon Bedrock?" }, definition: { pt: "Oferecer acesso a modelos de base por APIs gerenciadas para construir aplicações de IA generativa.", en: "Providing managed API access to foundation models for building generative AI applications." } },
  { id: "fc-11-2-aif-foundation-03", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "Como escolher um modelo de base?", en: "How should a foundation model be selected?" }, definition: { pt: "Comparando tarefa, modalidade, qualidade, latência, custo e requisitos de dados.", en: "By comparing task, modality, quality, latency, cost, and data requirements." } },
  { id: "fc-11-2-aif-foundation-04", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "O que uma Knowledge Base do Bedrock apoia?", en: "What does a Bedrock Knowledge Base support?" }, definition: { pt: "Recuperar informação de fontes conectadas para fundamentar respostas de uma aplicação.", en: "Retrieving information from connected sources to ground an application's responses." } },
  { id: "fc-11-2-aif-foundation-05", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "Para que servem Agents for Amazon Bedrock?", en: "What are Agents for Amazon Bedrock used for?" }, definition: { pt: "Orquestrar etapas e chamadas a APIs para executar tarefas em nome da aplicação.", en: "Orchestrating steps and API calls to perform tasks on behalf of an application." } },
  { id: "fc-11-2-aif-foundation-06", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "Quando o prompt engineering é útil?", en: "When is prompt engineering useful?" }, definition: { pt: "Ao estruturar instruções e contexto para melhorar a consistência e a utilidade das respostas.", en: "When structuring instructions and context to improve response consistency and usefulness." } },
  { id: "fc-11-2-aif-foundation-07", cert: "aif-c01", domain: "applications-foundation-models", term: { pt: "Por que avaliar custo e latência juntos?", en: "Why evaluate cost and latency together?" }, definition: { pt: "Porque uma solução de IA precisa atender o tempo de resposta sem exceder o orçamento de operação.", en: "Because an AI solution must meet response time without exceeding its operating budget." } },
  // AIF-C01: guidelines-responsible-ai (7 novos)
  { id: "fc-11-2-aif-responsible-01", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "O que é viés em um sistema de IA?", en: "What is bias in an AI system?" }, definition: { pt: "Uma tendência sistemática que pode produzir resultados injustos ou desiguais para grupos ou casos.", en: "A systematic tendency that can produce unfair or unequal outcomes for groups or cases." } },
  { id: "fc-11-2-aif-responsible-02", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "Por que avaliar fairness?", en: "Why evaluate fairness?" }, definition: { pt: "Para verificar se o sistema trata grupos relevantes de forma consistente e adequada ao contexto.", en: "To verify that the system treats relevant groups consistently and appropriately for the context." } },
  { id: "fc-11-2-aif-responsible-03", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "O que a explicabilidade ajuda a compreender?", en: "What does explainability help understand?" }, definition: { pt: "Como fatores e decisões do sistema contribuíram para determinado resultado.", en: "How factors and system decisions contributed to a particular outcome." } },
  { id: "fc-11-2-aif-responsible-04", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "Qual é o papel da transparência em IA?", en: "What is the role of transparency in AI?" }, definition: { pt: "Comunicar de forma clara o uso, as limitações e o comportamento esperado do sistema.", en: "Clearly communicating the system's use, limitations, and expected behavior." } },
  { id: "fc-11-2-aif-responsible-05", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "Por que manter supervisão humana?", en: "Why maintain human oversight?" }, definition: { pt: "Para revisar decisões de impacto e intervir quando o resultado automatizado não for adequado.", en: "To review impactful decisions and intervene when an automated result is not appropriate." } },
  { id: "fc-11-2-aif-responsible-06", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "O que uma avaliação de modelo deve considerar além da acurácia?", en: "What should a model evaluation consider beyond accuracy?" }, definition: { pt: "Riscos, fairness, robustez, explicabilidade e adequação ao uso pretendido.", en: "Risks, fairness, robustness, explainability, and fitness for the intended use." } },
  { id: "fc-11-2-aif-responsible-07", cert: "aif-c01", domain: "guidelines-responsible-ai", term: { pt: "Como reduzir respostas inadequadas de uma aplicação generativa?", en: "How can inappropriate responses from a generative application be reduced?" }, definition: { pt: "Com instruções claras, filtros, testes, monitoramento e revisão humana quando necessário.", en: "With clear instructions, filters, testing, monitoring, and human review when needed." } },
  // AIF-C01: security-compliance-governance (7 novos)
  { id: "fc-11-2-aif-governance-01", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "Por que controlar o acesso a modelos de IA?", en: "Why control access to AI models?" }, definition: { pt: "Para limitar uso não autorizado, proteger dados e manter rastreabilidade das aplicações.", en: "To limit unauthorized use, protect data, and maintain application traceability." } },
  { id: "fc-11-2-aif-governance-02", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "Qual risco existe ao enviar dados sensíveis em um prompt?", en: "What risk exists when sending sensitive data in a prompt?" }, definition: { pt: "Os dados podem ser expostos a um fluxo ou modelo que não deveria recebê-los.", en: "The data may be exposed to a flow or model that should not receive it." } },
  { id: "fc-11-2-aif-governance-03", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "Como a criptografia protege dados usados por aplicações de IA?", en: "How does encryption protect data used by AI applications?" }, definition: { pt: "Reduz a exposição do conteúdo quando armazenado ou transmitido sem autorização adequada.", en: "It reduces content exposure when data is stored or transmitted without proper authorization." } },
  { id: "fc-11-2-aif-governance-04", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "O que uma política de retenção define?", en: "What does a retention policy define?" }, definition: { pt: "Por quanto tempo dados, prompts, respostas ou logs podem ser mantidos.", en: "How long data, prompts, responses, or logs may be retained." } },
  { id: "fc-11-2-aif-governance-05", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "Por que registrar eventos de acesso a uma aplicação de IA?", en: "Why record access events for an AI application?" }, definition: { pt: "Para apoiar auditoria, investigação e comprovação de uso conforme as políticas.", en: "To support auditing, investigation, and evidence of policy-compliant use." } },
  { id: "fc-11-2-aif-governance-06", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "O que significa governança de dados em IA?", en: "What does data governance in AI mean?" }, definition: { pt: "Definir regras de qualidade, acesso, uso, proteção e responsabilidade sobre os dados.", en: "Defining rules for data quality, access, use, protection, and accountability." } },
  { id: "fc-11-2-aif-governance-07", cert: "aif-c01", domain: "security-compliance-governance", term: { pt: "Por que validar a origem dos dados de uma base de conhecimento?", en: "Why validate the origin of knowledge base data?" }, definition: { pt: "Para garantir que as respostas sejam fundamentadas em fontes autorizadas e confiáveis.", en: "To ensure responses are grounded in authorized and trustworthy sources." } },
]; 

export const glossaryTerms = glossaryTermsSource.map((card, index) => ({
  ...card,
  id: card.id ?? `${card.cert}-${card.domain}-${String(index + 1).padStart(3, "0")}`,
}));

// ============================================
// CONFIGURAÇÃO DAS CERTIFICAÇÕES
// ============================================

export const certificationPaths = {
  "clf-c02": {
    name: "AWS Certified Cloud Practitioner",
    code: "CLF-C02",
    domains: [
      { id: "conceitos-cloud", name: "Conceitos de Cloud", englishName: "Cloud Concepts" },
      { id: "seguranca", name: "Segurança e Conformidade", englishName: "Security and Compliance" },
      { id: "tecnologia", name: "Tecnologia", englishName: "Cloud Technology and Services" },
      { id: "faturamento", name: "Faturamento e Preços", englishName: "Billing and Pricing" },
    ],
  },
  "saa-c03": {
    name: "AWS Certified Solutions Architect - Associate",
    code: "SAA-C03",
    domains: [
      { id: "design-resiliente", name: "Design de Arquiteturas Resilientes", englishName: "Design Resilient Architectures" },
      { id: "design-performance", name: "Design de Alto Desempenho", englishName: "Design High-Performing Architectures" },
      { id: "seguranca-aplicacoes", name: "Design de Aplicações Seguras", englishName: "Design Secure Architectures" },
      { id: "design-custo", name: "Design Otimizado para Custos", englishName: "Design Cost-Optimized Architectures" },
    ],
  },
  "aif-c01": {
    name: "AWS Certified AI Practitioner",
    code: "AIF-C01",
    domains: [
      { id: "fundamentals-ai-ml", name: "Fundamentos de IA e ML", englishName: "Fundamentals of AI and ML" },
      { id: "fundamentals-genai", name: "Fundamentos de IA Generativa", englishName: "Fundamentals of Generative AI" },
      {
        id: "applications-foundation-models",
        name: "Aplicações e Modelos de Fundação",
        englishName: "Applications of Foundation Models"
      },
      {
        id: "guidelines-responsible-ai",
        name: "Diretrizes para IA Responsável",
        englishName: "Guidelines for Responsible AI"
      },
      { id: "security-compliance-governance", name: "Segurança e Governança", englishName: "Security, Compliance, and Governance for AI Solutions" },
    ],
  },
  "dva-c02": {
    name: "AWS Certified Developer - Associate",
    code: "DVA-C02",
    domains: [
      {
        id: "desenvolvimento-servicos",
        name: "Desenvolvimento com Serviços AWS",
        englishName: "Development with AWS Services"
      },
      { id: "seguranca-app", name: "Segurança", englishName: "Security" },
      { id: "implementacao", name: "Deployment e Implementação", englishName: "Deployment" },
      {
        id: "resolucao-problemas",
        name: "Troubleshooting e Resolução de Problemas",
        englishName: "Troubleshooting and Optimization"
      },
    ],
  },
};
