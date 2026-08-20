/**
 * BANCO DE DADOS DAS PÍLULAS DE CONHECIMENTO (SPRINT 14 DIAS)
 * Bilíngue: PT-BR / EN-US
 * Uso: getPill(day, lang, certId) → retorna o objeto da pílula no idioma correto
 **/

const sprintPillsData = {
  // ==========================================
  // 1. CLOUD PRACTITIONER (CLF-C02)
  // ==========================================
  "clf-c02": {
    1: {
      pt: {
        title: "Fundamentos: O que é a Nuvem AWS?",
        readTime: "3 min",
        topic: "Conceitos Cloud",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">O Paradigma Tradicional vs. Nuvem</h3>
                            <p>No modelo tradicional (on-premises), você paga por servidores físicos independentemente de usá-los. Na AWS, você troca <strong>despesas de capital (CapEx)</strong> por <strong>despesas variáveis (OpEx)</strong>.</p>
                        </section>
                        
                        <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                            <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                            <p class="text-sm">Sempre que a questão falar sobre "parar de adivinhar capacidade", refere-se à elasticidade da nuvem.</p>
                        </div>
                    </div>
                `,
        keyTakeaway:
          "Na nuvem, você paga apenas pelo que consome (Pay-as-you-go) e tem elasticidade sob demanda.",
      },
      en: {
        title: "Fundamentals: What is the AWS Cloud?",
        readTime: "3 min",
        topic: "Cloud Concepts",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Traditional vs. Cloud Paradigm</h3>
                            <p>In the traditional on-premises model, you pay for physical servers regardless of usage. In AWS, you trade <strong>Capital Expenses (CapEx)</strong> for <strong>Variable Expenses (OpEx)</strong>.</p>
                        </section>
                    </div>
                `,
        keyTakeaway:
          "In the cloud, you only pay for what you use (Pay-as-you-go) and gain on-demand elasticity.",
      },
    },
    2: {
      pt: {
        title: "Infraestrutura Global",
        readTime: "4 min",
        topic: "Conceitos Cloud",
        content: `
                    <div class="space-y-4">
                        <p>A AWS opera em <strong>Regiões</strong> (áreas geográficas) e <strong>Zonas de Disponibilidade (AZs)</strong>. Uma Região tem no mínimo 3 AZs.</p><div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded"><strong>Dica:</strong> Edge Locations são usadas pelo CloudFront para reduzir latência.</div></div>`,
        keyTakeaway:
          "Regiões fornecem isolamento; AZs fornecem alta disponibilidade.",
      },

      en: {
        title: "Global Infrastructure",
        readTime: "4 min",
        topic: "Cloud Concepts",
        content: `<p>AWS operates in Regions and Availability Zones (AZs)...</p>`,
        keyTakeaway: "Regions for isolation; AZs for high availability.",
      },
    },
    3: {
      pt: {
        title: "Modelo de Responsabilidade Compartilhada",
        readTime: "3 min",
        topic: "Segurança",
        content: `<p>A AWS é responsável pela segurança <strong>DA</strong> nuvem (hardware, infra), e o cliente é responsável pela segurança <strong>NA</strong> nuvem (dados, SO, firewall).</p>`,
        keyTakeaway: "AWS cuida do host; você cuida dos dados.",
      },

      en: {
        title: "Shared Responsibility Model",
        readTime: "3 min",
        topic: "Security",
        content: `<p>AWS is responsible for security OF the cloud; customer is responsible for security IN the cloud.</p>`,
        keyTakeaway: "AWS manages the host; you manage the data.",
      },
    },
    // Adicionar aqui os dias 4 ao 14 para a CLF-C02...
  },

  // ==========================================
  // 2. SOLUTIONS ARCHITECT (SAA-C03)
  // ==========================================
  "saa-c03": {
    1: {
      pt: {
        title: "Design Resiliente: Alta Disponibilidade",
        readTime: "4 min",
        topic: "Resiliência",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Multi-AZ vs Multi-Region</h3>
                            <p>Alta disponibilidade envolve garantir que sua aplicação continue funcionando mesmo que um componente falhe. Usar <strong>Múltiplas Zonas de Disponibilidade (Multi-AZ)</strong> protege contra falhas locais, enquanto <strong>Multi-Region</strong> protege contra falhas geográficas massivas (Disaster Recovery).</p>
                        </section>
                        <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                            <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                            <p class="text-sm">Para Amazon RDS, o Multi-AZ é usado para "Alta Disponibilidade", enquanto Read Replicas são para "Escalabilidade de Leitura".</p>
                        </div>
                    </div>
                `,
        keyTakeaway:
          "Desenhe arquiteturas assumindo que tudo pode falhar. Multi-AZ é o padrão de ouro para resiliência de banco de dados na AWS.",
      },
      en: {
        title: "Resilient Design: High Availability",
        readTime: "4 min",
        topic: "Resilience",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Multi-AZ vs Multi-Region</h3>
                            <p>High availability involves ensuring your application continues to function even if a component fails.</p>
                        </section>
                    </div>
                `,
        keyTakeaway:
          "Design architectures assuming everything will fail. Multi-AZ is the gold standard.",
      },
    },

    2: {
      pt: {
        title: "Infraestrutura Global",
        readTime: "4 min",
        topic: "Conceitos Cloud",
        content: `<div class="space-y-4"><p>A AWS opera em <strong>Regiões</strong> (áreas geográficas) e <strong>Zonas de Disponibilidade (AZs)</strong>. Uma Região tem no mínimo 3 AZs.</p><div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded"><strong>Dica:</strong> Edge Locations são usadas pelo CloudFront para reduzir latência.</div></div>`,
        keyTakeaway:
          "Regiões fornecem isolamento; AZs fornecem alta disponibilidade.",
      },
      en: {
        title: "Global Infrastructure",
        readTime: "4 min",
        topic: "Cloud Concepts",
        content: `<p>AWS operates in Regions and Availability Zones (AZs)...</p>`,
        keyTakeaway: "Regions for isolation; AZs for high availability.",
      },
    },

    3: {
      pt: {
        title: "Modelo de Responsabilidade Compartilhada",
        readTime: "3 min",
        topic: "Segurança",
        content: `<p>A AWS é responsável pela segurança <strong>DA</strong> nuvem (hardware, infra), e o cliente é responsável pela segurança <strong>NA</strong> nuvem (dados, SO, firewall).</p>`,
        keyTakeaway: "AWS cuida do host; você cuida dos dados.",
      },

      en: {
        title: "Shared Responsibility Model",
        readTime: "3 min",
        topic: "Security",
        content: `<p>AWS is responsible for security OF the cloud; customer is responsible for security IN the cloud.</p>`,
        keyTakeaway: "AWS manages the host; you manage the data.",
      },
    },
    // Adicionar aqui os dias 4 ao 14 para a SAA-C03...
  },

  // ==========================================
  // 3. AI PRACTITIONER (AIF-C01)
  // ==========================================
  "aif-c01": {
    1: {
      pt: {
        title: "Fundamentos: Modelos de Fundação (FMs)",
        readTime: "3 min",
        topic: "IA Generativa",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">O que é o Amazon Bedrock?</h3>
                            <p>O Amazon Bedrock é um serviço totalmente gerenciado que oferece acesso a FMs (Foundation Models) líderes de mercado por meio de uma única API. Ele não treina modelos do zero, mas permite a personalização com seus próprios dados.</p>
                        </section>
                    </div>
                `,
        keyTakeaway:
          "O Bedrock é Serverless. Você não provisiona infraestrutura para usar FMs como o Claude, Llama ou Titan.",
      },

      en: {
        title: "Fundamentals: Foundation Models (FMs)",
        readTime: "3 min",
        topic: "GenAI",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">What is Amazon Bedrock?</h3>
                            <p>Amazon Bedrock is a fully managed service that offers access to leading FMs via a single API.</p>
                        </section>
                    </div>
                `,
        keyTakeaway:
          "Bedrock is Serverless. You don't provision infrastructure to use FMs.",
      },
    },
    2: {
      pt: {
        title: "Ciclo de Vida do ML",
        readTime: "4 min",
        topic: "IA/ML",
        content: `<p>Coleta de dados → Preparação → Treinamento → Avaliação → Implantação.</p>`,
        keyTakeaway: "O SageMaker gerencia todo esse ciclo.",
      },

      en: {
        title: "ML Lifecycle",
        readTime: "4 min",
        topic: "AI/ML",
        content: `<p>Data collection → Prep → Training → Evaluation → Deployment.</p>`,
        keyTakeaway: "SageMaker manages this entire cycle.",
      },
    },
    // Adicionar aqui os dias 3 ao 14 para a AIF-C01...
  },

  // ==========================================
  // 4. DEVELOPER ASSOCIATE (DVA-C02)
  // ==========================================
  "dva-c02": {
    1: {
      pt: {
        title: "Desenvolvimento com AWS Lambda",
        readTime: "4 min",
        topic: "Serverless",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Execução Stateless</h3>
                            <p>O AWS Lambda executa código de forma <strong>stateless</strong>. Qualquer dado que precise persistir entre execuções deve ser salvo no Amazon S3, DynamoDB ou EFS.</p>
                        </section>
                        <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                            <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                            <p class="text-sm">Tempo máximo de execução de uma função Lambda é de 15 minutos. Se o processo demorar mais, use AWS Step Functions + ECS/Fargate.</p>
                        </div>
                    </div>
                `,
        keyTakeaway:
          "O Lambda é orientado a eventos e cobra apenas pelos milissegundos de computação consumidos.",
      },
      en: {
        title: "Developing with AWS Lambda",
        readTime: "4 min",
        topic: "Serverless",
        content: `
                    <div class="space-y-6 text-gray-700 dark:text-gray-300">
                        <section>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Stateless Execution</h3>
                            <p>AWS Lambda executes code in a stateless manner.</p>
                        </section>
                    </div>
                `,
        keyTakeaway:
          "Lambda is event-driven and charges only for the compute milliseconds consumed.",
      },
    },
    2: {
      pt: {
        title: "CI/CD: CodePipeline e CodeBuild",
        readTime: "5 min",
        topic: "DevOps",
        content: `<p>CodeBuild compila o código; CodePipeline orquestra as fases de teste e deploy.</p>`,
        keyTakeaway: "Automatize tudo para evitar erros manuais.",
      },
      en: {
        title: "CI/CD: CodePipeline and CodeBuild",
        readTime: "5 min",
        topic: "DevOps",
        content: `<p>CodeBuild compiles code; CodePipeline orchestrates test/deploy phases.</p>`,
        keyTakeaway: "Automate everything to avoid manual errors.",
      },
    },
    // Adicionar aqui os dias 3 ao 14 para a DVA-C02...
  },
};

function makeSprintPill({
  ptTitle,
  enTitle,
  ptTopic,
  enTopic,
  ptBody,
  enBody,
  ptTakeaway,
  enTakeaway,
  readTime = "5 min",
}) {
  return {
    pt: {
      title: ptTitle,
      readTime,
      topic: ptTopic,
      content: ptBody,
      keyTakeaway: ptTakeaway,
    },
    en: {
      title: enTitle,
      readTime,
      topic: enTopic,
      content: enBody,
      keyTakeaway: enTakeaway,
    },
  };
}

const supplementalPills = {
  "clf-c02": {
    4: makeSprintPill({
      ptTitle: "Compute sob demanda e escalável",
      enTitle: "On-demand and scalable compute",
      ptTopic: "Tecnologia",
      enTopic: "Technology",
      readTime: "5 min",
      ptBody:
        "<p>Compare Amazon EC2, AWS Lambda e contêineres pelo nível de controle, modelo operacional e duração das cargas.</p><p>Para uma execução orientada a eventos e sem servidores para administrar, priorize Lambda.</p>",
      enBody:
        "<p>Compare Amazon EC2, AWS Lambda, and containers by control level, operating model, and workload duration.</p><p>For event-driven execution without server management, prioritize Lambda.</p>",
      ptTakeaway:
        "Escolha compute pelo controle necessário e pelo padrão de execução, não apenas pelo nome do serviço.",
      enTakeaway:
        "Choose compute by required control and execution pattern, not only by the service name.",
    }),
    5: makeSprintPill({
      ptTitle: "Armazenamento: objeto, bloco e arquivo",
      enTitle: "Storage: object, block, and file",
      ptTopic: "Tecnologia",
      enTopic: "Technology",
      ptBody:
        "<p>Amazon S3 atende objetos duráveis; Amazon EBS fornece volumes de bloco para instâncias; Amazon EFS oferece arquivos compartilhados.</p><p>Associe a escolha ao padrão de acesso e não ao tamanho isolado do dado.</p>",
      enBody:
        "<p>Amazon S3 serves durable objects; Amazon EBS provides block volumes for instances; Amazon EFS provides shared files.</p><p>Match the choice to the access pattern, not to data size alone.</p>",
      ptTakeaway:
        "O tipo de armazenamento deve acompanhar como a aplicação acessa os dados.",
      enTakeaway:
        "The storage type should match how the application accesses data.",
    }),
    6: makeSprintPill({
      ptTitle: "Bancos de dados para necessidades diferentes",
      enTitle: "Databases for different needs",
      ptTopic: "Tecnologia",
      enTopic: "Technology",
      ptBody:
        "<p>Amazon RDS atende dados relacionais gerenciados; Amazon DynamoDB atende chave-valor com escala automática; Amazon Redshift é voltado a analytics.</p><p>Reveja o modelo de dados e a consulta principal antes de escolher.</p>",
      enBody:
        "<p>Amazon RDS serves managed relational data; Amazon DynamoDB serves key-value workloads with automatic scale; Amazon Redshift targets analytics.</p><p>Review the data model and primary query before choosing.</p>",
      ptTakeaway:
        "O modelo de acesso é o primeiro filtro para a escolha do banco.",
      enTakeaway:
        "The access model is the first filter when choosing a database.",
    }),
    7: makeSprintPill({
      ptTitle: "Conectividade e rede na AWS",
      enTitle: "Connectivity and networking in AWS",
      ptTopic: "Tecnologia",
      enTopic: "Technology",
      ptBody:
        "<p>Uma VPC organiza sub-redes, rotas e controles de acesso. Sub-redes públicas possuem rota para um Internet Gateway; privadas não precisam expor recursos diretamente.</p><p>Use o Amazon Route 53 para DNS e o Elastic Load Balancing para distribuir tráfego.</p>",
      enBody:
        "<p>A VPC organizes subnets, routes, and access controls. Public subnets have a route to an Internet Gateway; private subnets do not need to expose resources directly.</p><p>Use Amazon Route 53 for DNS and Elastic Load Balancing to distribute traffic.</p>",
      ptTakeaway:
        "Rede segura começa separando exposição pública de recursos internos.",
      enTakeaway:
        "Secure networking starts by separating public exposure from internal resources.",
    }),
    8: makeSprintPill({
      ptTitle: "Monitoramento e governança",
      enTitle: "Monitoring and governance",
      ptTopic: "Tecnologia",
      enTopic: "Technology",
      ptBody:
        "<p>Amazon CloudWatch reúne métricas, logs e alarmes. AWS CloudTrail registra atividades de API para auditoria.</p><p>Use ambos para responder tanto 'o que aconteceu no recurso?' quanto 'quem executou a ação?'.</p>",
      enBody:
        "<p>Amazon CloudWatch collects metrics, logs, and alarms. AWS CloudTrail records API activity for auditing.</p><p>Use both to answer 'what happened to the resource?' and 'who performed the action?'.</p>",
      ptTakeaway:
        "Métricas mostram comportamento; CloudTrail mostra ações administrativas.",
      enTakeaway:
        "Metrics show behavior; CloudTrail shows administrative actions.",
    }),
    9: makeSprintPill({
      ptTitle: "Responsabilidade compartilhada e compliance",
      enTitle: "Shared responsibility and compliance",
      ptTopic: "Segurança",
      enTopic: "Security",
      ptBody:
        "<p>A AWS protege a infraestrutura da nuvem; o cliente configura identidade, dados e controles do serviço utilizado.</p><p>Mapeie cada controle ao responsável e use serviços de conformidade sem assumir que a certificação da AWS substitui sua configuração.</p>",
      enBody:
        "<p>AWS protects the infrastructure of the cloud; the customer configures identity, data, and controls for the service used.</p><p>Map each control to its owner and do not assume AWS certifications replace your configuration.</p>",
      ptTakeaway:
        "A responsabilidade muda conforme o serviço, mas nunca desaparece para o cliente.",
      enTakeaway:
        "Responsibility changes by service, but it never disappears for the customer.",
    }),
    10: makeSprintPill({
      ptTitle: "Preços e modelos de cobrança",
      enTitle: "Pricing and billing models",
      ptTopic: "Faturamento",
      enTopic: "Billing",
      ptBody:
        "<p>Revise pay-as-you-go, Free Tier, Savings Plans e Reserved Instances. Compromissos podem reduzir preço, mas exigem previsibilidade de uso.</p><p>Use o AWS Pricing Calculator para estimar antes de implantar.</p>",
      enBody:
        "<p>Review pay-as-you-go, Free Tier, Savings Plans, and Reserved Instances. Commitments can reduce price but require predictable usage.</p><p>Use the AWS Pricing Calculator to estimate before deploying.</p>",
      ptTakeaway:
        "Custo baixo depende de conhecer o padrão de uso, não apenas de escolher a menor tarifa.",
      enTakeaway:
        "Low cost depends on understanding usage patterns, not only choosing the lowest rate.",
    }),
    11: makeSprintPill({
      ptTitle: "Cost management e suporte",
      enTitle: "Cost management and support",
      ptTopic: "Faturamento",
      enTopic: "Billing",
      ptBody:
        "<p>Use Cost Explorer para analisar gastos e AWS Budgets para alertas de custo ou uso. Tags e contas separadas ajudam a atribuir despesas.</p><p>Escolha o AWS Support Plan conforme o nível de orientação e resposta necessário.</p>",
      enBody:
        "<p>Use Cost Explorer to analyze spending and AWS Budgets for cost or usage alerts. Tags and separate accounts help attribute expenses.</p><p>Choose an AWS Support Plan according to the guidance and response level needed.</p>",
      ptTakeaway:
        "Visibilidade, alertas e atribuição de custos devem existir antes da otimização.",
      enTakeaway:
        "Visibility, alerts, and cost allocation should exist before optimization.",
    }),
    12: makeSprintPill({
      ptTitle: "Revisão integrada de serviços",
      enTitle: "Integrated service review",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Resolva cenários que combinam compute, armazenamento, banco, rede e segurança. Para cada escolha, explique o benefício principal e a responsabilidade do cliente.</p><p>Depois, revise os Flashcards do domínio em que você hesitou.</p>",
      enBody:
        "<p>Solve scenarios combining compute, storage, databases, networking, and security. For each choice, explain the main benefit and customer responsibility.</p><p>Then review Flashcards from the domain where you hesitated.</p>",
      ptTakeaway:
        "A prova testa a combinação de conceitos, não a memorização isolada de serviços.",
      enTakeaway:
        "The exam tests combinations of concepts, not isolated service memorization.",
    }),
    13: makeSprintPill({
      ptTitle: "Prática direcionada e análise de erros",
      enTitle: "Targeted practice and error analysis",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Faça um bloco de questões da certificação e classifique cada erro por domínio: conceito, serviço, segurança ou custo.</p><p>Escolha uma fraqueza principal e revise a explicação antes de tentar outra questão.</p>",
      enBody:
        "<p>Complete a certification question set and classify each error by domain: concept, service, security, or cost.</p><p>Choose one main weakness and review the explanation before attempting another question.</p>",
      ptTakeaway:
        "A análise do erro transforma uma questão incorreta em próxima ação de estudo.",
      enTakeaway:
        "Error analysis turns an incorrect question into the next study action.",
    }),
    14: makeSprintPill({
      ptTitle: "Revisão final do Cloud Practitioner",
      enTitle: "Cloud Practitioner final review",
      ptTopic: "Revisão final",
      enTopic: "Final review",
      ptBody:
        "<p>Faça uma revisão curta dos quatro domínios e um simulado misto. Não tente aprender um serviço novo agora; concentre-se nos erros recorrentes.</p><p>Feche com um checklist de identidade, segurança, custos e modelo de responsabilidade.</p>",
      enBody:
        "<p>Complete a short review of all four domains and a mixed practice set. Do not learn a new service now; focus on recurring errors.</p><p>Finish with a checklist covering identity, security, costs, and shared responsibility.</p>",
      ptTakeaway:
        "A preparação final é consolidar decisões recorrentes e controlar os pontos fracos.",
      enTakeaway:
        "Final preparation is about consolidating recurring decisions and controlling weak areas.",
    }),
  },
  "saa-c03": {
    3: makeSprintPill({
      ptTitle: "Desacoplamento e resiliência",
      enTitle: "Decoupling and resilience",
      ptTopic: "Design resiliente",
      enTopic: "Resilient design",
      ptBody:
        "<p>Amazon SQS desacopla produtores e consumidores, absorvendo picos sem exigir que ambos estejam disponíveis ao mesmo tempo.</p><p>Combine filas, retries e dead-letter queues para tratar falhas sem perder mensagens.</p>",
      enBody:
        "<p>Amazon SQS decouples producers and consumers, absorbing spikes without requiring both to be available at the same time.</p><p>Combine queues, retries, and dead-letter queues to handle failures without losing messages.</p>",
      ptTakeaway:
        "Desacoplamento reduz o raio de impacto de uma falha e suaviza variações de carga.",
      enTakeaway:
        "Decoupling reduces a failure's blast radius and smooths load variation.",
    }),
    4: makeSprintPill({
      ptTitle: "Armazenamento durável e recuperação",
      enTitle: "Durable storage and recovery",
      ptTopic: "Design resiliente",
      enTopic: "Resilient design",
      ptBody:
        "<p>Compare S3, EBS e EFS por durabilidade, compartilhamento e padrão de acesso. Para recuperação, associe backups, versionamento e políticas de retenção ao objetivo de RPO/RTO.</p><p>Uma cópia não substitui uma estratégia de recuperação testada.</p>",
      enBody:
        "<p>Compare S3, EBS, and EFS by durability, sharing, and access pattern. For recovery, match backups, versioning, and retention to the RPO/RTO goal.</p><p>One copy does not replace a tested recovery strategy.</p>",
      ptTakeaway:
        "Resiliência exige recuperar dados dentro do objetivo, não apenas armazená-los.",
      enTakeaway:
        "Resilience means recovering data within the objective, not merely storing it.",
    }),
    5: makeSprintPill({
      ptTitle: "Performance de dados e cache",
      enTitle: "Data performance and caching",
      ptTopic: "Design de performance",
      enTopic: "Performance design",
      ptBody:
        "<p>Read replicas distribuem leituras no RDS; ElastiCache reduz latência para dados acessados frequentemente; CloudFront aproxima conteúdo estático dos usuários.</p><p>Cache exige política de invalidação e tolerância a dados desatualizados.</p>",
      enBody:
        "<p>Read replicas distribute RDS reads; ElastiCache reduces latency for frequently accessed data; CloudFront moves static content closer to users.</p><p>Caching requires invalidation rules and tolerance for stale data.</p>",
      ptTakeaway:
        "Cache acelera leitura, mas precisa de uma estratégia explícita de consistência.",
      enTakeaway:
        "Caching speeds reads, but it needs an explicit consistency strategy.",
    }),
    6: makeSprintPill({
      ptTitle: "Segurança de aplicação em camadas",
      enTitle: "Layered application security",
      ptTopic: "Segurança",
      enTopic: "Security",
      ptBody:
        "<p>Use IAM para identidade, Security Groups para interfaces e NACLs para sub-redes. AWS WAF filtra requisições HTTP; KMS apoia criptografia de dados.</p><p>Não use um único controle como substituto para defesa em profundidade.</p>",
      enBody:
        "<p>Use IAM for identity, Security Groups for interfaces, and NACLs for subnets. AWS WAF filters HTTP requests; KMS supports data encryption.</p><p>Do not use one control as a substitute for defense in depth.</p>",
      ptTakeaway:
        "Controles complementares protegem diferentes camadas e diferentes tipos de ameaça.",
      enTakeaway:
        "Complementary controls protect different layers and different threat types.",
    }),
    7: makeSprintPill({
      ptTitle: "Otimização de custo por arquitetura",
      enTitle: "Architecture-driven cost optimization",
      ptTopic: "Design de custo",
      enTopic: "Cost design",
      ptBody:
        "<p>Compare capacidade sob demanda, Savings Plans, armazenamento por ciclo de vida e computação serverless. Avalie também transferência de dados e operação.</p><p>A alternativa mais barata só é adequada se cumprir disponibilidade e performance.</p>",
      enBody:
        "<p>Compare on-demand capacity, Savings Plans, lifecycle storage, and serverless compute. Also evaluate data transfer and operations.</p><p>The cheapest option is suitable only when it meets availability and performance goals.</p>",
      ptTakeaway:
        "Otimização de custo é uma decisão de trade-off, não uma busca isolada pelo menor preço.",
      enTakeaway:
        "Cost optimization is a trade-off decision, not an isolated search for the lowest price.",
    }),
    8: makeSprintPill({
      ptTitle: "VPC, rotas e conectividade",
      enTitle: "VPC, routes, and connectivity",
      ptTopic: "Networking",
      enTopic: "Networking",
      ptBody:
        "<p>Projete sub-redes por função, tabelas de rotas e caminhos de saída. Use NAT Gateway para saída de sub-redes privadas e VPC endpoints quando o tráfego de serviço puder permanecer privado.</p><p>Verifique rotas antes de diagnosticar a aplicação.</p>",
      enBody:
        "<p>Design subnets by function, route tables, and egress paths. Use a NAT Gateway for private subnet egress and VPC endpoints when service traffic can remain private.</p><p>Check routes before diagnosing the application.</p>",
      ptTakeaway:
        "Muitas falhas de conectividade são decisões de rota ou de sub-rede, não de aplicação.",
      enTakeaway:
        "Many connectivity failures are route or subnet decisions, not application decisions.",
    }),
    9: makeSprintPill({
      ptTitle: "Migração e continuidade de dados",
      enTitle: "Data migration and continuity",
      ptTopic: "Dados",
      enTopic: "Data",
      ptBody:
        "<p>Escolha o serviço de migração pelo tipo de fonte, volume e necessidade de continuidade. Replicação, sincronização e corte devem ser testados antes da mudança.</p><p>Defina como validar integridade e como voltar atrás.</p>",
      enBody:
        "<p>Choose a migration service by source type, volume, and continuity needs. Test replication, synchronization, and cutover before the change.</p><p>Define how to validate integrity and how to roll back.</p>",
      ptTakeaway:
        "Uma migração arquitetural inclui validação e rollback, não apenas cópia de dados.",
      enTakeaway:
        "An architectural migration includes validation and rollback, not only data copying.",
    }),
    10: makeSprintPill({
      ptTitle: "Serverless e escalabilidade",
      enTitle: "Serverless and scalability",
      ptTopic: "Arquitetura",
      enTopic: "Architecture",
      ptBody:
        "<p>Combine API Gateway, Lambda, DynamoDB e SQS para uma arquitetura desacoplada orientada a eventos. Analise limites de concorrência, retries e idempotência.</p><p>Serverless reduz operação, mas não elimina decisões de capacidade e observabilidade.</p>",
      enBody:
        "<p>Combine API Gateway, Lambda, DynamoDB, and SQS for a decoupled event-driven architecture. Analyze concurrency limits, retries, and idempotency.</p><p>Serverless reduces operations, but it does not remove capacity and observability decisions.</p>",
      ptTakeaway:
        "Serverless muda o modelo operacional; os requisitos de confiabilidade continuam existindo.",
      enTakeaway:
        "Serverless changes the operating model; reliability requirements still exist.",
    }),
    11: makeSprintPill({
      ptTitle: "Revisão arquitetural por requisitos",
      enTitle: "Requirements-driven architecture review",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Para cada cenário, liste disponibilidade, latência, segurança, custo e operação antes de escolher serviços. Depois elimine alternativas que violam um requisito obrigatório.</p><p>Pratique explicar por que a opção escolhida é melhor que a segunda colocada.</p>",
      enBody:
        "<p>For each scenario, list availability, latency, security, cost, and operations before choosing services. Then eliminate options that violate a mandatory requirement.</p><p>Practice explaining why the selected option is better than the runner-up.</p>",
      ptTakeaway:
        "Requisitos explícitos guiam a arquitetura mais do que a familiaridade com um serviço.",
      enTakeaway:
        "Explicit requirements guide architecture more than familiarity with a service.",
    }),
    12: makeSprintPill({
      ptTitle: "Prática de cenários arquiteturais",
      enTitle: "Architectural scenario practice",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Resolva questões que exigem combinar rede, armazenamento, banco e segurança. Marque o requisito decisivo em cada resposta.</p><p>Revisite Flashcards dos domínios em que confundiu disponibilidade, performance ou custo.</p>",
      enBody:
        "<p>Solve questions requiring a combination of networking, storage, databases, and security. Mark the decisive requirement in each answer.</p><p>Review Flashcards from domains where you confused availability, performance, or cost.</p>",
      ptTakeaway:
        "A alternativa correta é a que atende ao requisito principal com menos complexidade desnecessária.",
      enTakeaway:
        "The correct option meets the primary requirement with no unnecessary complexity.",
    }),
    13: makeSprintPill({
      ptTitle: "Análise de falhas e trade-offs",
      enTitle: "Failure analysis and trade-offs",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Escolha uma arquitetura e pergunte o que acontece quando uma AZ, uma dependência ou uma rede falha. Identifique o mecanismo de detecção, recuperação e impacto residual.</p><p>Registre também o custo operacional da resiliência escolhida.</p>",
      enBody:
        "<p>Choose an architecture and ask what happens when an AZ, dependency, or network fails. Identify detection, recovery, and residual impact.</p><p>Also record the operating cost of the selected resilience.</p>",
      ptTakeaway:
        "Arquitetura resiliente torna falhas esperadas e recuperáveis.",
      enTakeaway:
        "Resilient architecture makes failures expected and recoverable.",
    }),
    14: makeSprintPill({
      ptTitle: "Revisão final de Solutions Architect",
      enTitle: "Solutions Architect final review",
      ptTopic: "Revisão final",
      enTopic: "Final review",
      ptBody:
        "<p>Faça um simulado misto e revise cada erro pelo requisito que foi ignorado. Releia os quatro domínios: resiliência, performance, segurança e custo.</p><p>Finalize com um checklist de trade-offs e decisões de design.</p>",
      enBody:
        "<p>Complete a mixed practice set and review each error by the requirement that was missed. Revisit resilience, performance, security, and cost.</p><p>Finish with a trade-off and design-decision checklist.</p>",
      ptTakeaway:
        "A revisão final deve conectar requisitos a decisões arquiteturais concretas.",
      enTakeaway:
        "Final review should connect requirements to concrete architectural decisions.",
    }),
  },
  "aif-c01": {
    3: makeSprintPill({
      ptTitle: "Aprendizado supervisionado e não supervisionado",
      enTitle: "Supervised and unsupervised learning",
      ptTopic: "Fundamentos AI/ML",
      enTopic: "AI/ML fundamentals",
      ptBody:
        "<p>No aprendizado supervisionado, exemplos rotulados orientam a previsão; no não supervisionado, o algoritmo procura padrões sem rótulos fornecidos.</p><p>Relacione classificação a categorias e regressão a valores contínuos.</p>",
      enBody:
        "<p>In supervised learning, labeled examples guide prediction; in unsupervised learning, the algorithm finds patterns without provided labels.</p><p>Relate classification to categories and regression to continuous values.</p>",
      ptTakeaway:
        "A natureza do dado disponível ajuda a escolher o tipo de aprendizado.",
      enTakeaway:
        "The nature of available data helps select the learning type.",
    }),
    4: makeSprintPill({
      ptTitle: "Treinamento, inferência e avaliação",
      enTitle: "Training, inference, and evaluation",
      ptTopic: "Fundamentos AI/ML",
      enTopic: "AI/ML fundamentals",
      ptBody:
        "<p>Treinamento ajusta parâmetros com dados; inferência usa o modelo para produzir previsões. Avaliação deve usar dados separados e métricas adequadas ao problema.</p><p>Acurácia isolada pode esconder erros importantes em classes desbalanceadas.</p>",
      enBody:
        "<p>Training adjusts parameters with data; inference uses the model to produce predictions. Evaluation should use separate data and problem-appropriate metrics.</p><p>Accuracy alone can hide important errors in imbalanced classes.</p>",
      ptTakeaway:
        "Um modelo útil precisa generalizar e ser medido pela métrica certa.",
      enTakeaway:
        "A useful model must generalize and be measured with the right metric.",
    }),
    5: makeSprintPill({
      ptTitle: "Tokens, prompts e contexto",
      enTitle: "Tokens, prompts, and context",
      ptTopic: "IA generativa",
      enTopic: "Generative AI",
      ptBody:
        "<p>Modelos de linguagem processam tokens. Um prompt combina instruções, contexto e formato esperado para orientar a geração.</p><p>Contexto relevante e limites claros reduzem respostas fora do objetivo.</p>",
      enBody:
        "<p>Language models process tokens. A prompt combines instructions, context, and expected format to guide generation.</p><p>Relevant context and clear constraints reduce off-target responses.</p>",
      ptTakeaway:
        "Prompt engineering começa por declarar tarefa, contexto e critério de resposta.",
      enTakeaway:
        "Prompt engineering starts by stating the task, context, and response criteria.",
    }),
    6: makeSprintPill({
      ptTitle: "Embeddings e RAG",
      enTitle: "Embeddings and RAG",
      ptTopic: "IA generativa",
      enTopic: "Generative AI",
      ptBody:
        "<p>Embeddings representam significado em vetores. Em RAG, a aplicação recupera trechos relevantes e os fornece ao modelo antes da geração.</p><p>A recuperação melhora fundamentação, mas depende da qualidade e atualização da fonte.</p>",
      enBody:
        "<p>Embeddings represent meaning as vectors. In RAG, the application retrieves relevant passages and provides them to the model before generation.</p><p>Retrieval improves grounding, but depends on source quality and freshness.</p>",
      ptTakeaway:
        "RAG conecta geração a fontes externas, mas não substitui governança do conteúdo.",
      enTakeaway:
        "RAG connects generation to external sources, but does not replace content governance.",
    }),
    7: makeSprintPill({
      ptTitle: "Escolha e adaptação de foundation models",
      enTitle: "Foundation model selection and adaptation",
      ptTopic: "Modelos de fundação",
      enTopic: "Foundation models",
      ptBody:
        "<p>Compare modalidade, qualidade, latência, custo e contexto antes de selecionar um modelo. Use prompting, RAG ou fine-tuning conforme o problema.</p><p>Adaptação aumenta complexidade; não é a primeira resposta para toda tarefa.</p>",
      enBody:
        "<p>Compare modality, quality, latency, cost, and context before selecting a model. Use prompting, RAG, or fine-tuning according to the problem.</p><p>Adaptation increases complexity; it is not the first answer for every task.</p>",
      ptTakeaway:
        "Escolha o menor nível de adaptação capaz de atender ao caso de uso.",
      enTakeaway:
        "Choose the lowest adaptation level that can meet the use case.",
    }),
    8: makeSprintPill({
      ptTitle: "Aplicações com Amazon Bedrock",
      enTitle: "Applications with Amazon Bedrock",
      ptTopic: "Modelos de fundação",
      enTopic: "Foundation models",
      ptBody:
        "<p>Amazon Bedrock oferece acesso gerenciado a modelos por APIs. Uma aplicação deve controlar prompt, contexto, tratamento de erro e avaliação da saída.</p><p>O serviço reduz operação de infraestrutura, mas não elimina responsabilidades da aplicação.</p>",
      enBody:
        "<p>Amazon Bedrock provides managed API access to models. An application should control prompts, context, error handling, and output evaluation.</p><p>The service reduces infrastructure operations but does not remove application responsibilities.</p>",
      ptTakeaway:
        "Bedrock simplifica o acesso ao modelo; a qualidade continua sendo responsabilidade do desenho da aplicação.",
      enTakeaway:
        "Bedrock simplifies model access; quality remains a responsibility of application design.",
    }),
    9: makeSprintPill({
      ptTitle: "Fairness, viés e supervisão humana",
      enTitle: "Fairness, bias, and human oversight",
      ptTopic: "IA responsável",
      enTopic: "Responsible AI",
      ptBody:
        "<p>Dados e modelos podem produzir resultados desiguais. Avalie grupos relevantes, documente limitações e mantenha revisão humana para decisões de impacto.</p><p>Fairness é contextual: a métrica adequada depende do uso e do risco.</p>",
      enBody:
        "<p>Data and models can produce unequal outcomes. Evaluate relevant groups, document limitations, and keep human review for impactful decisions.</p><p>Fairness is contextual: the right metric depends on use and risk.</p>",
      ptTakeaway:
        "IA responsável combina métricas, documentação e supervisão, não apenas uma métrica de acurácia.",
      enTakeaway:
        "Responsible AI combines metrics, documentation, and oversight, not only accuracy.",
    }),
    10: makeSprintPill({
      ptTitle: "Segurança, privacidade e governança",
      enTitle: "Security, privacy, and governance",
      ptTopic: "Segurança e governança",
      enTopic: "Security and governance",
      ptBody:
        "<p>Limite acesso a modelos e dados com IAM, proteja informações em trânsito e repouso e defina retenção de prompts e logs.</p><p>Registre acessos e origem dos dados para apoiar auditoria e resposta a incidentes.</p>",
      enBody:
        "<p>Limit access to models and data with IAM, protect information in transit and at rest, and define prompt and log retention.</p><p>Record access and data origins to support auditing and incident response.</p>",
      ptTakeaway:
        "Governança de IA começa antes do prompt: identidade, dados, retenção e auditoria precisam estar definidos.",
      enTakeaway:
        "AI governance starts before the prompt: identity, data, retention, and auditing must be defined.",
    }),
    11: makeSprintPill({
      ptTitle: "Desenho de uma aplicação GenAI",
      enTitle: "Designing a GenAI application",
      ptTopic: "Aplicações de modelos",
      enTopic: "Model applications",
      ptBody:
        "<p>Mapeie entrada, recuperação de contexto, chamada do modelo, validação da resposta e observabilidade. Defina o que acontece quando a fonte não contém resposta.</p><p>Teste qualidade, latência, custo e segurança como requisitos do sistema.</p>",
      enBody:
        "<p>Map input, context retrieval, model invocation, response validation, and observability. Define what happens when the source has no answer.</p><p>Test quality, latency, cost, and security as system requirements.</p>",
      ptTakeaway:
        "Uma aplicação GenAI confiável é um fluxo controlado, não uma chamada isolada ao modelo.",
      enTakeaway:
        "A reliable GenAI application is a controlled flow, not an isolated model call.",
    }),
    12: makeSprintPill({
      ptTitle: "Prática de cenários AI/ML",
      enTitle: "AI/ML scenario practice",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Resolva cenários que exigem identificar tipo de aprendizado, estratégia de contexto, risco de alucinação ou controle de acesso.</p><p>Explique por que a alternativa escolhida atende ao objetivo sem introduzir exposição desnecessária.</p>",
      enBody:
        "<p>Solve scenarios requiring you to identify learning type, context strategy, hallucination risk, or access control.</p><p>Explain why the selected option meets the goal without introducing unnecessary exposure.</p>",
      ptTakeaway:
        "A resposta correta conecta conceito de IA, caso de uso e controle operacional.",
      enTakeaway:
        "The correct answer connects an AI concept, a use case, and an operational control.",
    }),
    13: makeSprintPill({
      ptTitle: "Revisão orientada por lacunas",
      enTitle: "Gap-driven review",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Faça um bloco de questões e classifique erros em fundamentos, GenAI, aplicação, responsabilidade ou segurança. Use os Flashcards do domínio mais fraco.</p><p>Releia também a justificativa das respostas corretas, não apenas os erros.</p>",
      enBody:
        "<p>Complete a question set and classify errors as fundamentals, GenAI, applications, responsibility, or security. Use Flashcards from the weakest domain.</p><p>Also reread explanations for correct answers, not only mistakes.</p>",
      ptTakeaway:
        "Revisão eficiente é seletiva e baseada em evidência de desempenho.",
      enTakeaway:
        "Efficient review is selective and based on performance evidence.",
    }),
    14: makeSprintPill({
      ptTitle: "Revisão final do AI Practitioner",
      enTitle: "AI Practitioner final review",
      ptTopic: "Revisão final",
      enTopic: "Final review",
      ptBody:
        "<p>Faça um simulado misto e revise conceitos fundamentais, GenAI, modelos de fundação, IA responsável e segurança. Não memorize nomes sem entender o cenário.</p><p>Finalize com um checklist de dados, avaliação, privacidade e supervisão humana.</p>",
      enBody:
        "<p>Complete a mixed practice set and review fundamentals, GenAI, foundation models, responsible AI, and security. Do not memorize names without understanding the scenario.</p><p>Finish with a checklist covering data, evaluation, privacy, and human oversight.</p>",
      ptTakeaway:
        "A preparação final combina entendimento técnico com uso responsável da IA.",
      enTakeaway:
        "Final preparation combines technical understanding with responsible AI use.",
    }),
  },
  "dva-c02": {
    3: makeSprintPill({
      ptTitle: "Modelagem de acesso no DynamoDB",
      enTitle: "DynamoDB access-pattern modeling",
      ptTopic: "Desenvolvimento de serviços",
      enTopic: "Service development",
      ptBody:
        "<p>Comece pelas consultas que a aplicação precisa executar e escolha partition key e sort key para atendê-las. Evite modelar apenas como se fosse um banco relacional.</p><p>Use índices secundários somente quando houver padrão de acesso claro.</p>",
      enBody:
        "<p>Start with the queries the application must execute and choose partition and sort keys to support them. Do not model it only like a relational database.</p><p>Use secondary indexes only when there is a clear access pattern.</p>",
      ptTakeaway: "No DynamoDB, o padrão de acesso orienta o modelo de dados.",
      enTakeaway: "In DynamoDB, the access pattern guides the data model.",
    }),
    4: makeSprintPill({
      ptTitle: "Eventos, estado e persistência",
      enTitle: "Events, state, and persistence",
      ptTopic: "Desenvolvimento de serviços",
      enTopic: "Service development",
      ptBody:
        "<p>Funções Lambda são stateless entre invocações. Guarde estado durável em DynamoDB, S3 ou outro serviço adequado e use eventos para reagir a mudanças.</p><p>Separe estado de execução temporário de estado de negócio.</p>",
      enBody:
        "<p>Lambda functions are stateless between invocations. Store durable state in DynamoDB, S3, or another suitable service and react to changes with events.</p><p>Separate temporary execution state from business state.</p>",
      ptTakeaway:
        "Persistência explícita evita depender do ambiente efêmero da função.",
      enTakeaway:
        "Explicit persistence avoids depending on the function's ephemeral environment.",
    }),
    5: makeSprintPill({
      ptTitle: "Mensageria e integração assíncrona",
      enTitle: "Messaging and asynchronous integration",
      ptTopic: "Desenvolvimento de serviços",
      enTopic: "Service development",
      ptBody:
        "<p>Use SQS para fila e processamento independente; SNS para distribuição a múltiplos assinantes; EventBridge para roteamento baseado em eventos.</p><p>Defina idempotência e tratamento de mensagens que falharem.</p>",
      enBody:
        "<p>Use SQS for queuing and independent processing; SNS for distribution to multiple subscribers; EventBridge for event-based routing.</p><p>Define idempotency and handling for messages that fail.</p>",
      ptTakeaway:
        "A escolha de integração depende de fila, fanout ou roteamento de eventos.",
      enTakeaway:
        "The integration choice depends on queueing, fanout, or event routing.",
    }),
    6: makeSprintPill({
      ptTitle: "Lambda na prática",
      enTitle: "Lambda in practice",
      ptTopic: "Desenvolvimento de serviços",
      enTopic: "Service development",
      ptBody:
        "<p>Configure handler, variáveis de ambiente, timeout e memória de acordo com a execução. Mantenha a função pequena e externalize dependências ou estado persistente.</p><p>Observe duração e erros para ajustar a configuração.</p>",
      enBody:
        "<p>Configure the handler, environment variables, timeout, and memory for the execution. Keep the function focused and externalize dependencies or durable state.</p><p>Observe duration and errors to adjust configuration.</p>",
      ptTakeaway:
        "Configuração e observabilidade fazem parte do código operacional da função.",
      enTakeaway:
        "Configuration and observability are part of a function's operational code.",
    }),
    7: makeSprintPill({
      ptTitle: "APIs e contratos de integração",
      enTitle: "APIs and integration contracts",
      ptTopic: "Desenvolvimento de serviços",
      enTopic: "Service development",
      ptBody:
        "<p>API Gateway expõe endpoints, integra com backends e aplica autenticação, limites e transformação quando configurado.</p><p>Defina contrato, códigos de erro e idempotência antes de conectar o consumidor.</p>",
      enBody:
        "<p>API Gateway exposes endpoints, integrates with backends, and can apply authentication, throttling, and transformations.</p><p>Define the contract, error codes, and idempotency before connecting consumers.</p>",
      ptTakeaway:
        "Uma API confiável explicita contrato e falhas, não apenas o caminho feliz.",
      enTakeaway:
        "A reliable API defines its contract and failures, not only the happy path.",
    }),
    8: makeSprintPill({
      ptTitle: "CI/CD para aplicações serverless",
      enTitle: "CI/CD for serverless applications",
      ptTopic: "Implementação",
      enTopic: "Implementation",
      ptBody:
        "<p>CodeBuild executa build e testes; CodePipeline orquestra etapas; SAM ou CloudFormation descrevem recursos de forma reproduzível.</p><p>Inclua validação antes do deploy e mantenha ambientes separados.</p>",
      enBody:
        "<p>CodeBuild runs builds and tests; CodePipeline orchestrates stages; SAM or CloudFormation describe resources reproducibly.</p><p>Include validation before deployment and keep environments separate.</p>",
      ptTakeaway: "Automação reduz drift e torna o deploy repetível.",
      enTakeaway: "Automation reduces drift and makes deployment repeatable.",
    }),
    9: makeSprintPill({
      ptTitle: "Logs, métricas e tracing",
      enTitle: "Logs, metrics, and tracing",
      ptTopic: "Resolução de problemas",
      enTopic: "Troubleshooting",
      ptBody:
        "<p>CloudWatch Logs mostra eventos detalhados; métricas mostram tendência; X-Ray relaciona o caminho de uma requisição entre componentes.</p><p>Comece pelo sintoma, correlacione timestamp e trace e só então altere configuração.</p>",
      enBody:
        "<p>CloudWatch Logs shows detailed events; metrics show trends; X-Ray connects a request path across components.</p><p>Start with the symptom, correlate timestamp and trace, and only then change configuration.</p>",
      ptTakeaway:
        "Diagnóstico distribuído exige combinar logs, métricas e traces.",
      enTakeaway:
        "Distributed diagnosis requires combining logs, metrics, and traces.",
    }),
    10: makeSprintPill({
      ptTitle: "Retries, DLQ e throttling",
      enTitle: "Retries, DLQs, and throttling",
      ptTopic: "Resolução de problemas",
      enTopic: "Troubleshooting",
      ptBody:
        "<p>Retries ajudam em falhas transitórias, mas devem ter limite e backoff. DLQs preservam mensagens que excederam tentativas; throttling indica limite de taxa ou concorrência.</p><p>Corrija a causa antes de aumentar limites indiscriminadamente.</p>",
      enBody:
        "<p>Retries help with transient failures but need limits and backoff. DLQs retain messages that exceeded attempts; throttling indicates a rate or concurrency limit.</p><p>Fix the cause before increasing limits indiscriminately.</p>",
      ptTakeaway:
        "Resiliência sem limite pode transformar uma falha transitória em tempestade de retries.",
      enTakeaway:
        "Unbounded resilience can turn a transient failure into a retry storm.",
    }),
    11: makeSprintPill({
      ptTitle: "Segurança para aplicações",
      enTitle: "Application security",
      ptTopic: "Segurança de aplicações",
      enTopic: "Application security",
      ptBody:
        "<p>Use roles e credenciais temporárias, armazene segredos em Secrets Manager ou Parameter Store e limite permissões ao recurso necessário.</p><p>Use KMS quando a aplicação precisar controlar chaves de criptografia.</p>",
      enBody:
        "<p>Use roles and temporary credentials, store secrets in Secrets Manager or Parameter Store, and limit permissions to required resources.</p><p>Use KMS when the application needs to control encryption keys.</p>",
      ptTakeaway:
        "O código não deve carregar credenciais permanentes nem permissões amplas.",
      enTakeaway:
        "Code should not carry long-lived credentials or broad permissions.",
    }),
    12: makeSprintPill({
      ptTitle: "Cenário completo serverless",
      enTitle: "Complete serverless scenario",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Desenhe um fluxo API Gateway → Lambda → DynamoDB e publique eventos em SQS ou EventBridge. Identifique autenticação, retries, logs e estado.</p><p>Explique onde a aplicação precisa ser idempotente.</p>",
      enBody:
        "<p>Design an API Gateway → Lambda → DynamoDB flow and publish events through SQS or EventBridge. Identify authentication, retries, logs, and state.</p><p>Explain where the application needs to be idempotent.</p>",
      ptTakeaway:
        "O desenvolvedor AWS precisa conectar código, contrato, segurança e operação.",
      enTakeaway:
        "An AWS developer must connect code, contract, security, and operations.",
    }),
    13: makeSprintPill({
      ptTitle: "Revisão orientada por erros",
      enTitle: "Error-driven review",
      ptTopic: "Revisão",
      enTopic: "Review",
      ptBody:
        "<p>Faça questões de implementação e classifique erros entre IAM, eventos, deploy, DynamoDB e troubleshooting. Refaça o fluxo que causou a dúvida.</p><p>Use Flashcards do domínio mais fraco para consolidar a definição curta.</p>",
      enBody:
        "<p>Complete implementation questions and classify errors as IAM, events, deployment, DynamoDB, or troubleshooting. Rework the flow that caused uncertainty.</p><p>Use Flashcards from the weakest domain to consolidate the short definition.</p>",
      ptTakeaway:
        "Revisar o fluxo completo revela lacunas que uma definição isolada não mostra.",
      enTakeaway:
        "Reviewing the complete flow reveals gaps that an isolated definition does not show.",
    }),
    14: makeSprintPill({
      ptTitle: "Revisão final do Developer Associate",
      enTitle: "Developer Associate final review",
      ptTopic: "Revisão final",
      enTopic: "Final review",
      ptBody:
        "<p>Faça um simulado misto e revise desenvolvimento, segurança, implementação e troubleshooting. Releia os erros procurando a causa, não apenas o serviço.</p><p>Finalize com um checklist de contrato, identidade, observabilidade e recuperação.</p>",
      enBody:
        "<p>Complete a mixed practice set and review development, security, implementation, and troubleshooting. Revisit errors looking for the cause, not only the service.</p><p>Finish with a checklist covering contracts, identity, observability, and recovery.</p>",
      ptTakeaway:
        "A preparação final integra código executável com operação segura e observável.",
      enTakeaway:
        "Final preparation integrates executable code with secure and observable operations.",
    }),
  },
};

for (const [certification, days] of Object.entries(supplementalPills)) {
  Object.assign(sprintPillsData[certification], days);
}

/**
 * Retorna a pílula do dia no idioma e certificação corretos.
 * @param {number} day - Dia do sprint (1-14)
 * @param {string} lang - 'pt' ou 'en'
 * @param {string} certId - ID da certificação (ex: 'clf-c02')
 * @returns {object|null} Objeto com title, readTime, topic, content, keyTakeaway
 */
function getPill(day, lang, certId = "clf-c02") {
  // 1. Procura a certificação no banco de dados (se não existir, falha silenciosamente)
  const certData = sprintPillsData[certId];
  if (!certData) return null;

  // 2. Procura o dia específico dentro dessa certificação
  const entry = certData[day];
  if (!entry) return null;

  // 3. Retorna o conteúdo no idioma solicitado (com fallback para pt se o en não existir)
  const l = lang === "en" && entry.en ? "en" : "pt";
  return entry[l];
}

export { getPill, sprintPillsData };

// Expõe a função globalmente para o app.js a conseguir chamar
if (typeof window !== "undefined") window.getPill = getPill;
