// ============================================
// GLOSSÁRIO DE TERMOS AWS PARA FLASHCARDS
// Organizado por Certificação
// ============================================

export const glossaryTerms = [
  // ==========================================
  // TERMOS GERAIS (Todas as Certificações)
  // ==========================================
  {
    cert: "all",
    term: "Região AWS",
    definition: "Área geográfica que contém múltiplas Zonas de Disponibilidade isoladas. Cada região é completamente independente para fornecer isolamento de falhas e estabilidade."
  },
  {
    cert: "all",
    term: "AZ (Availability Zone)",
    definition: "Data center isolado dentro de uma região AWS, com energia, rede e conectividade redundantes. Múltiplas AZs em uma região permitem alta disponibilidade e tolerância a falhas."
  },
  {
    cert: "all",
    term: "AWS IAM (Identity and Access Management)",
    definition: "Serviço que permite gerenciar com segurança o acesso aos serviços e recursos AWS. Controla quem está autenticado (conectado) e autorizado (tem permissões) para usar recursos."
  },
  {
    cert: "all",
    term: "Amazon S3 (Simple Storage Service)",
    definition: "Serviço de armazenamento de objetos que oferece escalabilidade, disponibilidade de dados, segurança e performance. Armazena e protege qualquer quantidade de dados para diversos casos de uso."
  },
  {
    cert: "all",
    term: "Amazon EC2 (Elastic Compute Cloud)",
    definition: "Serviço de computação que fornece capacidade computacional redimensionável na nuvem. Permite criar e gerenciar servidores virtuais (instâncias) com diversos tipos e tamanhos."
  },

  // ==========================================
  // CLF-C02: AWS Cloud Practitioner
  // ==========================================
  {
    cert: "clf-c02",
    term: "AWS Well-Architected Framework",
    definition: "Conjunto de melhores práticas para construir sistemas seguros, eficientes, resilientes e de alto desempenho na nuvem. Baseado em 6 pilares: Excelência Operacional, Segurança, Confiabilidade, Eficiência de Performance, Otimização de Custos e Sustentabilidade."
  },
  {
    cert: "clf-c02",
    term: "AWS Pricing Calculator",
    definition: "Ferramenta gratuita que permite estimar o custo mensal dos serviços AWS. Ajuda a planejar e orçar gastos na nuvem antes de implementar recursos."
  },
  {
    cert: "clf-c02",
    term: "AWS Free Tier",
    definition: "Programa que oferece acesso gratuito a serviços AWS por tempo limitado ou com limites de uso. Inclui ofertas Always Free, 12 meses gratuitos e testes gratuitos."
  },
  {
    cert: "clf-c02",
    term: "AWS Support Plans",
    definition: "Planos de suporte técnico da AWS: Basic (gratuito), Developer, Business, Enterprise On-Ramp e Enterprise. Cada nível oferece diferentes tempos de resposta e recursos."
  },
  {
    cert: "clf-c02",
    term: "AWS Organizations",
    definition: "Serviço de gerenciamento de contas que permite consolidar múltiplas contas AWS em uma organização. Facilita governança centralizada, faturamento consolidado e controle de políticas."
  },
  {
    cert: "clf-c02",
    term: "AWS Trusted Advisor",
    definition: "Ferramenta que fornece orientação em tempo real para provisionar recursos seguindo melhores práticas em otimização de custos, performance, segurança, tolerância a falhas e limites de serviço."
  },
  {
    cert: "clf-c02",
    term: "AWS CloudTrail",
    definition: "Serviço que registra e monitora atividades de conta AWS. Fornece histórico de eventos de chamadas de API para auditoria, conformidade e análise de segurança."
  },
  {
    cert: "clf-c02",
    term: "AWS Config",
    definition: "Serviço que avalia, audita e avalia as configurações dos recursos AWS. Monitora continuamente as configurações e permite automatizar a avaliação de conformidade."
  },
  {
    cert: "clf-c02",
    term: "Amazon CloudWatch",
    definition: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos."
  },
  {
    cert: "clf-c02",
    term: "AWS Artifact",
    definition: "Portal de autoatendimento para acesso sob demanda a relatórios de conformidade e acordos da AWS. Fornece documentação de auditoria e certificações de segurança."
  },
  {
    cert: "clf-c02",
    term: "AWS Shield",
    definition: "Serviço gerenciado de proteção contra DDoS. Shield Standard é automático e gratuito; Shield Advanced oferece proteção adicional com resposta 24/7 e proteção de custos."
  },
  {
    cert: "clf-c02",
    term: "AWS WAF (Web Application Firewall)",
    definition: "Firewall de aplicação web que protege contra explorações comuns da web. Permite criar regras personalizadas para filtrar tráfego malicioso."
  },
  {
    cert: "clf-c02",
    term: "Amazon GuardDuty",
    definition: "Serviço de detecção de ameaças que monitora continuamente atividades maliciosas e comportamentos não autorizados usando machine learning e inteligência de ameaças."
  },
  {
    cert: "clf-c02",
    term: "AWS KMS (Key Management Service)",
    definition: "Serviço gerenciado para criar e controlar chaves de criptografia. Integra-se com outros serviços AWS para criptografia de dados em repouso e em trânsito."
  },
  {
    cert: "clf-c02",
    term: "Amazon Inspector",
    definition: "Serviço automatizado de avaliação de segurança que ajuda a melhorar a segurança e conformidade de aplicações. Avalia vulnerabilidades e desvios das melhores práticas."
  },
  {
    cert: "clf-c02",
    term: "AWS Cost Explorer",
    definition: "Ferramenta de visualização e análise de custos AWS. Permite visualizar, entender e gerenciar custos e uso ao longo do tempo com gráficos e relatórios personalizados."
  },
  {
    cert: "clf-c02",
    term: "AWS Budgets",
    definition: "Serviço que permite definir orçamentos personalizados e receber alertas quando custos ou uso excedem (ou prevê-se que excedam) os valores orçados."
  },
  {
    cert: "clf-c02",
    term: "Modelo de Responsabilidade Compartilhada",
    definition: "Framework que define responsabilidades de segurança entre AWS e cliente. AWS é responsável pela segurança DA nuvem (infraestrutura); cliente é responsável pela segurança NA nuvem (dados, aplicações)."
  },
  {
    cert: "clf-c02",
    term: "AWS Marketplace",
    definition: "Catálogo digital com milhares de listagens de software de fornecedores independentes. Facilita encontrar, testar, comprar e implantar software que roda na AWS."
  },
  {
    cert: "clf-c02",
    term: "AWS Personal Health Dashboard",
    definition: "Fornece alertas e orientação quando AWS está enfrentando eventos que podem impactar você. Visão personalizada da performance e disponibilidade de serviços AWS."
  },
  {
    cert: "clf-c02",
    term: "AWS Service Catalog",
    definition: "Permite organizações criar e gerenciar catálogos de serviços de TI aprovados para uso na AWS. Ajuda a alcançar governança consistente e atender requisitos de conformidade."
  },
  {
    cert: "clf-c02",
    term: "AWS Control Tower",
    definition: "Serviço que automatiza configuração de ambiente AWS multi-conta seguro e bem arquitetado. Implementa melhores práticas de governança usando blueprints."
  },
  {
    cert: "clf-c02",
    term: "AWS License Manager",
    definition: "Facilita gerenciar licenças de software de fornecedores como Microsoft, SAP, Oracle e IBM na AWS e on-premises. Ajuda a controlar custos e reduzir riscos de não conformidade."
  },
  {
    cert: "clf-c02",
    term: "AWS Compute Optimizer",
    definition: "Recomenda recursos AWS ideais para suas cargas de trabalho usando machine learning. Analisa métricas históricas de utilização para reduzir custos e melhorar performance."
  },
  {
    cert: "clf-c02",
    term: "AWS Cost and Usage Report",
    definition: "Relatório mais abrangente disponível sobre custos e uso da AWS. Fornece dados detalhados sobre uso de serviços, custos e atributos de recursos."
  },
  {
    cert: "clf-c02",
    term: "AWS Savings Plans",
    definition: "Modelo de preços flexível que oferece preços mais baixos em troca de compromisso de uso consistente (medido em $/hora) por período de 1 ou 3 anos."
  },
  {
    cert: "clf-c02",
    term: "Reserved Instances",
    definition: "Modelo de compra que oferece desconto significativo (até 75%) comparado a preços On-Demand em troca de compromisso de uso de instância por 1 ou 3 anos."
  },
  {
    cert: "clf-c02",
    term: "Spot Instances",
    definition: "Permite usar capacidade EC2 não utilizada com desconto de até 90% comparado a preços On-Demand. Ideal para cargas de trabalho tolerantes a falhas e flexíveis."
  },
  {
    cert: "clf-c02",
    term: "AWS Snow Family",
    definition: "Família de dispositivos físicos para migração de dados e edge computing. Inclui Snowcone, Snowball e Snowmobile para transferir petabytes de dados."
  },
  {
    cert: "clf-c02",
    term: "AWS Outposts",
    definition: "Serviço totalmente gerenciado que estende infraestrutura, serviços, APIs e ferramentas AWS para praticamente qualquer data center, espaço de colocation ou instalação on-premises."
  },

  // ==========================================
  // SAA-C03: Solutions Architect Associate
  // ==========================================
  {
    cert: "saa-c03",
    term: "Amazon S3 Glacier",
    definition: "Classes de armazenamento de baixo custo para arquivamento de dados e backup de longo prazo. Oferece três opções de recuperação: Expedited, Standard e Bulk."
  },
  {
    cert: "saa-c03",
    term: "Amazon S3 Intelligent-Tiering",
    definition: "Classe de armazenamento S3 que otimiza automaticamente custos movendo dados entre camadas de acesso quando padrões de acesso mudam, sem impacto operacional."
  },
  {
    cert: "saa-c03",
    term: "AWS Global Accelerator",
    definition: "Serviço de rede que melhora disponibilidade e performance de aplicações para usuários globais usando rede global AWS. Fornece IPs estáticos como ponto de entrada fixo."
  },
  {
    cert: "saa-c03",
    term: "Amazon Neptune",
    definition: "Serviço de banco de dados de grafos totalmente gerenciado. Otimizado para armazenar e consultar dados altamente conectados com performance de milissegundos."
  },
  {
    cert: "saa-c03",
    term: "AWS App Mesh",
    definition: "Service mesh que facilita monitorar e controlar microsserviços. Fornece visibilidade e controle de rede consistente para cada microsserviço em aplicação."
  },
  {
    cert: "saa-c03",
    term: "Amazon MQ",
    definition: "Serviço de message broker gerenciado para Apache ActiveMQ e RabbitMQ. Facilita migrar para nuvem aplicações que usam message brokers tradicionais."
  },
  {
    cert: "saa-c03",
    term: "AWS DataSync",
    definition: "Serviço de transferência de dados online que simplifica, automatiza e acelera movimentação de dados entre armazenamento on-premises e serviços AWS."
  },
  {
    cert: "saa-c03",
    term: "Amazon FSx",
    definition: "Família de serviços de sistema de arquivos totalmente gerenciados. Inclui FSx for Windows File Server, FSx for Lustre, FSx for NetApp ONTAP e FSx for OpenZFS."
  },
  {
    cert: "saa-c03",
    term: "AWS Transit Gateway",
    definition: "Serviço que permite conectar VPCs e redes on-premises através de hub central. Simplifica topologia de rede e reduz complexidade operacional."
  },
  {
    cert: "saa-c03",
    term: "AWS PrivateLink",
    definition: "Fornece conectividade privada entre VPCs, serviços AWS e redes on-premises sem expor tráfego à Internet pública. Melhora segurança e performance."
  },
  {
    cert: "saa-c03",
    term: "Amazon Athena",
    definition: "Serviço de consulta interativa que facilita analisar dados no S3 usando SQL padrão. Serverless, você paga apenas pelas consultas executadas."
  },
  {
    cert: "saa-c03",
    term: "AWS Backup",
    definition: "Serviço centralizado de backup que automatiza e consolida backup de dados entre serviços AWS. Simplifica conformidade com políticas de backup."
  },
  {
    cert: "saa-c03",
    term: "Amazon ElastiCache for Redis",
    definition: "Cache em memória compatível com Redis totalmente gerenciado. Oferece alta disponibilidade, backup automático e replicação multi-AZ."
  },
  {
    cert: "saa-c03",
    term: "Amazon ElastiCache for Memcached",
    definition: "Cache em memória compatível com Memcached totalmente gerenciado. Ideal para casos de uso simples de cache com modelo de dados chave-valor."
  },
  {
    cert: "saa-c03",
    term: "AWS Certificate Manager (ACM)",
    definition: "Serviço que facilita provisionar, gerenciar e implantar certificados SSL/TLS públicos e privados para uso com serviços AWS e recursos internos."
  },
  {
    cert: "saa-c03",
    term: "Amazon EventBridge",
    definition: "Barramento de eventos serverless que facilita conectar aplicações usando eventos de suas próprias aplicações, aplicações SaaS e serviços AWS."
  },
  {
    cert: "saa-c03",
    term: "AWS Systems Manager",
    definition: "Fornece visibilidade e controle unificados de infraestrutura AWS. Permite automatizar tarefas operacionais em recursos AWS e on-premises."
  },
  {
    cert: "saa-c03",
    term: "Amazon DocumentDB",
    definition: "Banco de dados de documentos totalmente gerenciado compatível com MongoDB. Facilita armazenar, consultar e indexar dados JSON com escalabilidade e durabilidade."
  },
  {
    cert: "saa-c03",
    term: "Amazon VPC (Virtual Private Cloud)",
    definition: "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways."
  },
  {
    cert: "saa-c03",
    term: "Amazon RDS (Relational Database Service)",
    definition: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados. Suporta MySQL, PostgreSQL, Oracle, SQL Server, MariaDB e Amazon Aurora."
  },
  {
    cert: "saa-c03",
    term: "Amazon Aurora",
    definition: "Banco de dados relacional compatível com MySQL e PostgreSQL, até 5x mais rápido que MySQL e 3x mais rápido que PostgreSQL. Oferece alta disponibilidade e durabilidade."
  },
  {
    cert: "saa-c03",
    term: "Amazon DynamoDB",
    definition: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor."
  },
  {
    cert: "saa-c03",
    term: "Amazon ElastiCache",
    definition: "Serviço de cache em memória totalmente gerenciado que suporta Redis e Memcached. Melhora performance de aplicações recuperando dados de caches rápidos em memória."
  },
  {
    cert: "saa-c03",
    term: "Amazon EBS (Elastic Block Store)",
    definition: "Armazenamento em bloco de alto desempenho para uso com EC2. Oferece volumes persistentes que podem ser anexados a instâncias e suporta snapshots para backup."
  },
  {
    cert: "saa-c03",
    term: "Amazon EFS (Elastic File System)",
    definition: "Sistema de arquivos NFS totalmente gerenciado e elástico para uso com serviços AWS Cloud e recursos on-premises. Escala automaticamente conforme necessário."
  },
  {
    cert: "saa-c03",
    term: "AWS Storage Gateway",
    definition: "Serviço híbrido que permite ambientes on-premises usar armazenamento na nuvem AWS. Oferece integração perfeita entre infraestrutura local e AWS."
  },
  {
    cert: "saa-c03",
    term: "Amazon CloudFront",
    definition: "Rede de entrega de conteúdo (CDN) que entrega dados, vídeos, aplicações e APIs globalmente com baixa latência e altas velocidades de transferência usando edge locations."
  },
  {
    cert: "saa-c03",
    term: "Elastic Load Balancing (ELB)",
    definition: "Distribui automaticamente tráfego de entrada entre múltiplos destinos. Inclui Application Load Balancer (ALB), Network Load Balancer (NLB) e Gateway Load Balancer."
  },
  {
    cert: "saa-c03",
    term: "Auto Scaling",
    definition: "Monitora aplicações e ajusta automaticamente a capacidade para manter performance estável e previsível ao menor custo possível. Funciona com EC2, ECS, DynamoDB e Aurora."
  },
  {
    cert: "saa-c03",
    term: "Amazon Route 53",
    definition: "Serviço de DNS altamente disponível e escalável. Oferece registro de domínio, roteamento de DNS e verificação de integridade com políticas de roteamento avançadas."
  },
  {
    cert: "saa-c03",
    term: "AWS Direct Connect",
    definition: "Conexão de rede dedicada entre seu data center e AWS. Reduz custos de rede, aumenta throughput de banda e fornece experiência de rede mais consistente que conexões baseadas em Internet."
  },
  {
    cert: "saa-c03",
    term: "Amazon SQS (Simple Queue Service)",
    definition: "Serviço de fila de mensagens totalmente gerenciado que permite desacoplar e escalar microsserviços, sistemas distribuídos e aplicações serverless."
  },
  {
    cert: "saa-c03",
    term: "Amazon SNS (Simple Notification Service)",
    definition: "Serviço de mensagens pub/sub totalmente gerenciado para comunicação entre aplicações e pessoas. Suporta SMS, email, push notifications e HTTP/HTTPS."
  },
  {
    cert: "saa-c03",
    term: "AWS Lambda",
    definition: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução."
  },
  {
    cert: "saa-c03",
    term: "Amazon API Gateway",
    definition: "Serviço totalmente gerenciado para criar, publicar, manter, monitorar e proteger APIs REST, HTTP e WebSocket em qualquer escala."
  },
  {
    cert: "saa-c03",
    term: "AWS CloudFormation",
    definition: "Serviço de infraestrutura como código que permite modelar e provisionar recursos AWS usando templates JSON ou YAML. Automatiza criação e gerenciamento de infraestrutura."
  },
  {
    cert: "saa-c03",
    term: "Amazon Kinesis",
    definition: "Plataforma para coletar, processar e analisar dados de streaming em tempo real. Inclui Kinesis Data Streams, Firehose, Analytics e Video Streams."
  },
  {
    cert: "saa-c03",
    term: "AWS Step Functions",
    definition: "Serviço de orquestração serverless que permite coordenar múltiplos serviços AWS em workflows visuais. Facilita construção de aplicações distribuídas e pipelines de dados."
  },
  {
    cert: "saa-c03",
    term: "Amazon Redshift",
    definition: "Data warehouse totalmente gerenciado e escalável para análise de dados usando SQL. Otimizado para consultas analíticas em grandes volumes de dados."
  },
  {
    cert: "saa-c03",
    term: "AWS Glue",
    definition: "Serviço de ETL (Extract, Transform, Load) serverless que facilita preparar e carregar dados para análise. Descobre, cataloga e transforma dados automaticamente."
  },

  // ==========================================
  // DVA-C02: Developer Associate
  // ==========================================
  {
    cert: "dva-c02",
    term: "AWS CodeCommit",
    definition: "Serviço de controle de versão totalmente gerenciado que hospeda repositórios Git privados. Elimina necessidade de operar sistema próprio de controle de versão."
  },
  {
    cert: "dva-c02",
    term: "AWS CodeBuild",
    definition: "Serviço de integração contínua totalmente gerenciado que compila código-fonte, executa testes e produz pacotes de software prontos para deploy."
  },
  {
    cert: "dva-c02",
    term: "AWS CodeDeploy",
    definition: "Serviço de deployment automatizado para EC2, Lambda, ECS e on-premises. Automatiza deployments de aplicações e minimiza tempo de inatividade."
  },
  {
    cert: "dva-c02",
    term: "AWS CodePipeline",
    definition: "Serviço de entrega contínua que automatiza pipelines de release para atualizações rápidas e confiáveis. Integra-se com CodeCommit, CodeBuild, CodeDeploy e ferramentas terceiras."
  },
  {
    cert: "dva-c02",
    term: "AWS X-Ray",
    definition: "Serviço de análise e debug de aplicações distribuídas. Ajuda a entender como aplicações e serviços subjacentes estão performando e identificar gargalos."
  },
  {
    cert: "dva-c02",
    term: "Amazon Cognito",
    definition: "Serviço de identidade para aplicações web e mobile. Fornece autenticação, autorização e gerenciamento de usuários com suporte a provedores de identidade social e empresarial."
  },
  {
    cert: "dva-c02",
    term: "AWS Secrets Manager",
    definition: "Serviço que ajuda a proteger acesso a aplicações, serviços e recursos. Facilita rotação, gerenciamento e recuperação de credenciais de banco de dados, chaves de API e outros segredos."
  },
  {
    cert: "dva-c02",
    term: "AWS Systems Manager Parameter Store",
    definition: "Armazenamento hierárquico seguro para dados de configuração e segredos. Integra-se com KMS para criptografia e oferece versionamento de parâmetros."
  },
  {
    cert: "dva-c02",
    term: "Amazon EventBridge",
    definition: "Barramento de eventos serverless que facilita conectar aplicações usando eventos de suas próprias aplicações, aplicações SaaS e serviços AWS."
  },
  {
    cert: "dva-c02",
    term: "AWS SAM (Serverless Application Model)",
    definition: "Framework open-source para construir aplicações serverless. Fornece sintaxe simplificada para definir funções Lambda, APIs, bancos de dados e mapeamentos de eventos."
  },
  {
    cert: "dva-c02",
    term: "Amazon ECS (Elastic Container Service)",
    definition: "Serviço de orquestração de contêineres totalmente gerenciado que facilita executar, parar e gerenciar contêineres Docker em cluster."
  },
  {
    cert: "dva-c02",
    term: "Amazon EKS (Elastic Kubernetes Service)",
    definition: "Serviço gerenciado que facilita executar Kubernetes na AWS sem necessidade de instalar e operar seu próprio plano de controle Kubernetes."
  },
  {
    cert: "dva-c02",
    term: "AWS Fargate",
    definition: "Motor de computação serverless para contêineres que funciona com ECS e EKS. Remove necessidade de provisionar e gerenciar servidores."
  },
  {
    cert: "dva-c02",
    term: "Amazon ECR (Elastic Container Registry)",
    definition: "Registro de contêineres Docker totalmente gerenciado que facilita armazenar, gerenciar e implantar imagens de contêineres."
  },
  {
    cert: "dva-c02",
    term: "AWS AppSync",
    definition: "Serviço gerenciado de GraphQL que facilita desenvolvimento de aplicações fornecendo consulta segura, atualização e publicação de dados de múltiplas fontes."
  },
  {
    cert: "dva-c02",
    term: "Amazon CloudWatch Logs",
    definition: "Serviço para monitorar, armazenar e acessar arquivos de log de EC2, CloudTrail, Lambda e outras fontes. Permite consultar e analisar dados de log."
  },
  {
    cert: "dva-c02",
    term: "AWS Elastic Beanstalk",
    definition: "Serviço PaaS para deploy e escala de aplicações web. Gerencia automaticamente infraestrutura (EC2, load balancers, auto scaling) enquanto você mantém controle."
  },

  // ==========================================
  // AIF-C01: AI Practitioner
  // ==========================================
  {
    cert: "aif-c01",
    term: "Amazon SageMaker",
    definition: "Serviço totalmente gerenciado para construir, treinar e implantar modelos de machine learning em escala. Fornece notebooks Jupyter, algoritmos integrados e infraestrutura gerenciada."
  },
  {
    cert: "aif-c01",
    term: "Amazon Bedrock",
    definition: "Serviço totalmente gerenciado que oferece modelos de fundação (FMs) de alto desempenho de empresas líderes em IA via API única. Permite construir e escalar aplicações de IA generativa."
  },
  {
    cert: "aif-c01",
    term: "Amazon Bedrock Barreiras de Proteção",
    definition: "Recurso que implementa proteções e políticas de segurança para modelos de IA. Inclui filtros de conteúdo, detecção de informações pessoais e validação de saídas do modelo."
  },
  {
    cert: "aif-c01",
    term: "Amazon Rekognition",
    definition: "Serviço de análise de imagem e vídeo que identifica objetos, pessoas, texto, cenas e atividades. Também detecta conteúdo inadequado e fornece análise facial."
  },
  {
    cert: "aif-c01",
    term: "Amazon Comprehend",
    definition: "Serviço de processamento de linguagem natural (NLP) que usa machine learning para descobrir insights e relacionamentos em texto. Identifica idioma, entidades, sentimentos e tópicos."
  },
  {
    cert: "aif-c01",
    term: "Amazon Translate",
    definition: "Serviço de tradução automática neural que fornece tradução de idiomas rápida, de alta qualidade e acessível. Suporta mais de 75 idiomas."
  },
  {
    cert: "aif-c01",
    term: "Amazon Polly",
    definition: "Serviço que converte texto em fala realista usando tecnologias de deep learning. Suporta múltiplos idiomas e vozes com pronúncia natural."
  },
  {
    cert: "aif-c01",
    term: "Amazon Transcribe",
    definition: "Serviço de reconhecimento automático de fala que converte áudio em texto. Suporta múltiplos idiomas, identificação de falantes e vocabulário personalizado."
  },
  {
    cert: "aif-c01",
    term: "Amazon Lex",
    definition: "Serviço para construir interfaces de conversação usando voz e texto. Mesma tecnologia que alimenta Amazon Alexa, permite criar chatbots sofisticados."
  },
  {
    cert: "aif-c01",
    term: "Amazon Kendra",
    definition: "Serviço de pesquisa empresarial inteligente alimentado por machine learning. Fornece respostas precisas a perguntas em linguagem natural de documentos corporativos."
  },
  {
    cert: "aif-c01",
    term: "Amazon Personalize",
    definition: "Serviço de machine learning que facilita criar recomendações personalizadas para clientes. Usa mesma tecnologia de recomendação da Amazon.com."
  },
  {
    cert: "aif-c01",
    term: "Amazon Forecast",
    definition: "Serviço de previsão de séries temporais baseado em machine learning. Usa mesma tecnologia da Amazon.com para prever demanda, recursos e métricas de negócio."
  },
  {
    cert: "aif-c01",
    term: "Amazon Textract",
    definition: "Serviço que extrai automaticamente texto, escrita manual e dados de documentos escaneados. Vai além de OCR simples identificando campos de formulários e tabelas."
  },
  {
    cert: "aif-c01",
    term: "Amazon SageMaker Ground Truth",
    definition: "Serviço de rotulagem de dados que facilita construir conjuntos de dados de treinamento precisos para machine learning. Usa rotulagem humana e machine learning ativo."
  },
  {
    cert: "aif-c01",
    term: "Amazon SageMaker Clarify",
    definition: "Ferramenta que ajuda a detectar viés em dados e modelos de ML. Fornece explicabilidade de modelos e monitora previsões para detectar desvios de qualidade."
  },
  {
    cert: "aif-c01",
    term: "Amazon Augmented AI (A2I)",
    definition: "Serviço que facilita construir workflows para revisão humana de previsões de ML. Permite implementar revisão humana quando modelo tem baixa confiança."
  },
  {
    cert: "aif-c01",
    term: "AWS DeepRacer",
    definition: "Carro de corrida autônomo em escala 1/18 para aprender reinforcement learning. Inclui simulador 3D, liga de corridas global e hardware físico."
  },
  {
    cert: "aif-c01",
    term: "Amazon CodeGuru",
    definition: "Serviço de revisão de código alimentado por ML que fornece recomendações inteligentes para melhorar qualidade do código e identificar linhas mais caras."
  },
  {
    cert: "aif-c01",
    term: "Amazon DevOps Guru",
    definition: "Serviço alimentado por ML que facilita melhorar disponibilidade operacional de aplicações. Detecta automaticamente comportamentos operacionais anormais."
  },
  {
    cert: "aif-c01",
    term: "Amazon Fraud Detector",
    definition: "Serviço totalmente gerenciado que usa ML para identificar atividades potencialmente fraudulentas. Detecta fraudes online como criação de contas falsas e pagamentos fraudulentos."
  },
  {
    cert: "aif-c01",
    term: "Amazon Lookout for Metrics",
    definition: "Serviço que usa ML para detectar automaticamente anomalias em métricas de negócio e operacionais. Identifica causa raiz de anomalias."
  },

  // ==========================================
  // TERMOS ADICIONAIS IMPORTANTES
  // ==========================================
  {
    cert: "all",
    term: "AWS CLI (Command Line Interface)",
    definition: "Ferramenta unificada para gerenciar serviços AWS via linha de comando. Permite automatizar tarefas através de scripts."
  },
  {
    cert: "all",
    term: "AWS SDK (Software Development Kit)",
    definition: "Conjunto de ferramentas e bibliotecas para desenvolver aplicações que usam serviços AWS. Disponível em múltiplas linguagens de programação."
  },
  {
    cert: "all",
    term: "Amazon VPC (Virtual Private Cloud)",
    definition: "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways."
  },
  {
    cert: "all",
    term: "AWS CloudFormation",
    definition: "Serviço de infraestrutura como código que permite modelar e provisionar recursos AWS usando templates JSON ou YAML. Automatiza criação e gerenciamento de infraestrutura."
  },
  {
    cert: "all",
    term: "AWS Lambda",
    definition: "Serviço de computação serverless que executa código em resposta a eventos. Gerencia automaticamente recursos de computação e você paga apenas pelo tempo de execução."
  },
  {
    cert: "all",
    term: "Amazon RDS (Relational Database Service)",
    definition: "Serviço de banco de dados relacional gerenciado que facilita configurar, operar e escalar bancos de dados. Suporta MySQL, PostgreSQL, Oracle, SQL Server, MariaDB e Amazon Aurora."
  },
  {
    cert: "all",
    term: "Amazon CloudWatch",
    definition: "Serviço de monitoramento e observabilidade que fornece dados e insights para monitorar aplicações, responder a mudanças de performance e otimizar utilização de recursos."
  },
  {
    cert: "all",
    term: "Elastic Load Balancing (ELB)",
    definition: "Distribui automaticamente tráfego de entrada entre múltiplos destinos. Inclui Application Load Balancer (ALB), Network Load Balancer (NLB) e Gateway Load Balancer."
  },
  {
    cert: "all",
    term: "Amazon DynamoDB",
    definition: "Banco de dados NoSQL totalmente gerenciado que fornece performance rápida e previsível com escalabilidade automática. Suporta modelos de dados de documentos e chave-valor."
  },
  {
    cert: "clf-c02",
    term: "AWS Marketplace",
    definition: "Catálogo digital com milhares de listagens de software de fornecedores independentes. Facilita encontrar, testar, comprar e implantar software que roda na AWS."
  },
  {
    cert: "clf-c02",
    term: "AWS Personal Health Dashboard",
    definition: "Fornece alertas e orientação quando AWS está enfrentando eventos que podem impactar você. Visão personalizada da performance e disponibilidade de serviços AWS."
  },
  {
    cert: "saa-c03",
    term: "Amazon FSx",
    definition: "Família de serviços de sistema de arquivos totalmente gerenciados. Inclui FSx for Windows File Server, FSx for Lustre, FSx for NetApp ONTAP e FSx for OpenZFS."
  },
  {
    cert: "saa-c03",
    term: "AWS Transit Gateway",
    definition: "Serviço que permite conectar VPCs e redes on-premises através de hub central. Simplifica topologia de rede e reduz complexidade operacional."
  },
  {
    cert: "saa-c03",
    term: "AWS PrivateLink",
    definition: "Fornece conectividade privada entre VPCs, serviços AWS e redes on-premises sem expor tráfego à Internet pública. Melhora segurança e performance."
  },
  {
    cert: "saa-c03",
    term: "Amazon Athena",
    definition: "Serviço de consulta interativa que facilita analisar dados no S3 usando SQL padrão. Serverless, você paga apenas pelas consultas executadas."
  },
  {
    cert: "saa-c03",
    term: "AWS Backup",
    definition: "Serviço centralizado de backup que automatiza e consolida backup de dados entre serviços AWS. Simplifica conformidade com políticas de backup."
  },
  {
    cert: "dva-c02",
    term: "Amazon DynamoDB Streams",
    definition: "Captura série ordenada no tempo de modificações em itens de tabela DynamoDB. Permite construir aplicações que reagem a mudanças de dados em tempo real."
  },
  {
    cert: "dva-c02",
    term: "AWS AppConfig",
    definition: "Serviço que permite criar, gerenciar e implantar rapidamente configurações de aplicações. Valida configurações e implanta de forma controlada."
  },
  {
    cert: "aif-c01",
    term: "Amazon SageMaker Autopilot",
    definition: "Recurso de AutoML que automaticamente treina e ajusta melhores modelos de ML para dados de classificação ou regressão. Fornece visibilidade completa do modelo."
  },
  {
    cert: "aif-c01",
    term: "Amazon SageMaker Neo",
    definition: "Permite treinar modelos de ML uma vez e executar em qualquer lugar na nuvem e na edge. Otimiza modelos para executar até 2x mais rápido com menos de 1/10 do tamanho."
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