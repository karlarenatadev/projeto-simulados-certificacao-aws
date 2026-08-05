#!/usr/bin/env node

/**
 * Seed script for the Practice Domain (Cases + AWS Services)
 * Run: node scripts/seed-cases.mjs
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 */

import {
  initializeDatabase,
  closeDatabase,
  executeQuery,
  insertAwsService,
  insertCase,
  insertCaseDialogue,
  insertCaseEvent,
  insertCaseEvaluationCriteria,
} from '../../backend/database/db.js';

// ============================================================================
// AWS SERVICES CATALOG — CLF-C02 + SAA-C03 essentials
// ============================================================================

const AWS_SERVICES = [
  // Compute
  {
    slug: 'amazon-ec2',
    name: 'Amazon EC2',
    category: 'Compute',
    short_desc: 'Servidores virtuais redimensionáveis na nuvem. Permite executar qualquer carga de trabalho com controle total sobre SO, rede e armazenamento.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Compute/EC2.svg',
    doc_url: 'https://docs.aws.amazon.com/ec2/',
  },
  {
    slug: 'aws-lambda',
    name: 'AWS Lambda',
    category: 'Compute',
    short_desc: 'Compute serverless orientado a eventos. Execute código sem provisionar ou gerenciar servidores, pagando apenas pela execução.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Compute/Lambda.svg',
    doc_url: 'https://docs.aws.amazon.com/lambda/',
  },
  {
    slug: 'amazon-ecs',
    name: 'Amazon ECS',
    category: 'Compute',
    short_desc: 'Serviço gerenciado de orquestração de contêineres Docker. Executa aplicações em contêineres sem gerenciar a infraestrutura de cluster.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Containers/ECS.svg',
    doc_url: 'https://docs.aws.amazon.com/ecs/',
  },
  // Storage
  {
    slug: 'amazon-s3',
    name: 'Amazon S3',
    category: 'Storage',
    short_desc: 'Object storage com 99,999999999% de durabilidade. Ideal para backups, data lakes, hosting de sites estáticos e assets de aplicações.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Storage/S3.svg',
    doc_url: 'https://docs.aws.amazon.com/s3/',
  },
  {
    slug: 'amazon-ebs',
    name: 'Amazon EBS',
    category: 'Storage',
    short_desc: 'Volumes de armazenamento em bloco de alta performance para uso com instâncias EC2. Persiste independente do ciclo de vida da instância.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Storage/EBS.svg',
    doc_url: 'https://docs.aws.amazon.com/ebs/',
  },
  {
    slug: 'amazon-efs',
    name: 'Amazon EFS',
    category: 'Storage',
    short_desc: 'Sistema de arquivos NFS totalmente gerenciado e escalável para uso compartilhado entre múltiplas instâncias EC2 simultaneamente.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Storage/EFS.svg',
    doc_url: 'https://docs.aws.amazon.com/efs/',
  },
  // Database
  {
    slug: 'amazon-rds',
    name: 'Amazon RDS',
    category: 'Database',
    short_desc: 'Banco de dados relacional gerenciado (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB). Automatiza patches, backups e replicação.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Database/RDS.svg',
    doc_url: 'https://docs.aws.amazon.com/rds/',
  },
  {
    slug: 'amazon-dynamodb',
    name: 'Amazon DynamoDB',
    category: 'Database',
    short_desc: 'Banco NoSQL serverless, totalmente gerenciado, com latência de milissegundos em qualquer escala. Ideal para aplicações web, mobile e IoT.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Database/DynamoDB.svg',
    doc_url: 'https://docs.aws.amazon.com/dynamodb/',
  },
  {
    slug: 'amazon-elasticache',
    name: 'Amazon ElastiCache',
    category: 'Database',
    short_desc: 'Cache em memória gerenciado (Redis ou Memcached) para acelerar aplicações reduzindo a latência de bancos de dados.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Database/ElastiCache.svg',
    doc_url: 'https://docs.aws.amazon.com/elasticache/',
  },
  // Networking
  {
    slug: 'amazon-vpc',
    name: 'Amazon VPC',
    category: 'Networking',
    short_desc: 'Rede virtual isolada na AWS. Controle total sobre endereçamento IP, sub-redes, tabelas de roteamento e gateways.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/VPC.svg',
    doc_url: 'https://docs.aws.amazon.com/vpc/',
  },
  {
    slug: 'amazon-cloudfront',
    name: 'Amazon CloudFront',
    category: 'Networking',
    short_desc: 'CDN global com mais de 400 pontos de presença. Reduz latência entregando conteúdo estático e dinâmico aos usuários finais.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/CloudFront.svg',
    doc_url: 'https://docs.aws.amazon.com/cloudfront/',
  },
  {
    slug: 'amazon-api-gateway',
    name: 'Amazon API Gateway',
    category: 'Networking',
    short_desc: 'Serviço gerenciado para criar, publicar e proteger APIs REST, HTTP e WebSocket em qualquer escala, integrado ao Lambda e outros backends.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg',
    doc_url: 'https://docs.aws.amazon.com/apigateway/',
  },
  {
    slug: 'elastic-load-balancing',
    name: 'Elastic Load Balancing',
    category: 'Networking',
    short_desc: 'Distribui automaticamente o tráfego entre múltiplos destinos (EC2, contêineres, IPs). Tipos: ALB (HTTP/HTTPS), NLB (TCP/UDP) e GLB.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg',
    doc_url: 'https://docs.aws.amazon.com/elasticloadbalancing/',
  },
  {
    slug: 'amazon-route53',
    name: 'Amazon Route 53',
    category: 'Networking',
    short_desc: 'Serviço DNS altamente disponível e escalável com roteamento inteligente (failover, latência, geolocalização) e registro de domínios.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Route-53.svg',
    doc_url: 'https://docs.aws.amazon.com/route53/',
  },
  // Security
  {
    slug: 'aws-iam',
    name: 'AWS IAM',
    category: 'Security',
    short_desc: 'Gerencia identidades, permissões e políticas para usuários, grupos, funções e serviços AWS. Base de segurança de toda a nuvem AWS.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/IAM.svg',
    doc_url: 'https://docs.aws.amazon.com/iam/',
  },
  {
    slug: 'aws-kms',
    name: 'AWS KMS',
    category: 'Security',
    short_desc: 'Serviço gerenciado para criar e controlar chaves de criptografia usadas para proteger dados em repouso e em trânsito.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/Key-Management-Service.svg',
    doc_url: 'https://docs.aws.amazon.com/kms/',
  },
  {
    slug: 'aws-waf',
    name: 'AWS WAF',
    category: 'Security',
    short_desc: 'Web Application Firewall que protege APIs e aplicações web contra exploits como SQL injection, XSS e ataques DDoS de camada 7.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Security-Identity-Compliance/WAF.svg',
    doc_url: 'https://docs.aws.amazon.com/waf/',
  },
  // Messaging
  {
    slug: 'amazon-sqs',
    name: 'Amazon SQS',
    category: 'Messaging',
    short_desc: 'Fila de mensagens totalmente gerenciada para desacoplar e escalar microsserviços, sistemas distribuídos e aplicações serverless.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/App-Integration/SQS.svg',
    doc_url: 'https://docs.aws.amazon.com/sqs/',
  },
  {
    slug: 'amazon-sns',
    name: 'Amazon SNS',
    category: 'Messaging',
    short_desc: 'Serviço pub/sub e notificações push totalmente gerenciado. Entrega mensagens para SQS, Lambda, HTTP, e-mail e SMS.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/App-Integration/SNS.svg',
    doc_url: 'https://docs.aws.amazon.com/sns/',
  },
  // Monitoring
  {
    slug: 'amazon-cloudwatch',
    name: 'Amazon CloudWatch',
    category: 'Monitoring',
    short_desc: 'Plataforma de observabilidade que coleta métricas, logs e eventos. Cria alarmes, dashboards e ações automatizadas para recursos AWS.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg',
    doc_url: 'https://docs.aws.amazon.com/cloudwatch/',
  },
  {
    slug: 'aws-cloudtrail',
    name: 'AWS CloudTrail',
    category: 'Monitoring',
    short_desc: 'Registra e audita chamadas de API de todos os serviços AWS. Essencial para compliance, análise de segurança e rastreamento de mudanças.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Management-Governance/CloudTrail.svg',
    doc_url: 'https://docs.aws.amazon.com/cloudtrail/',
  },
  // Auto Scaling
  {
    slug: 'amazon-auto-scaling',
    name: 'Amazon Auto Scaling',
    category: 'Compute',
    short_desc: 'Ajusta automaticamente a capacidade de recursos (EC2, ECS, DynamoDB) para manter performance e minimizar custos conforme a demanda.',
    icon_url: 'https://icon.icepanel.io/AWS/svg/Compute/Auto-Scaling.svg',
    doc_url: 'https://docs.aws.amazon.com/autoscaling/',
  },
];

// ============================================================================
// CASES SEED — 3 cases iniciais
// ============================================================================

const CASES = [
  {
    slug: 'serverless-web-api',
    title: 'API Web Serverless com Lambda + API Gateway + DynamoDB',
    scenario: `Uma startup de fintech precisa construir uma API REST escalável para seu app mobile de pagamentos. O time é pequeno (3 devs) e não quer gerenciar servidores. A API precisa suportar picos de 10.000 requisições/minuto durante campanhas promocionais, mas tem apenas ~200 req/min nos momentos normais.\n\nO CTO exige:\n- Zero gerenciamento de infraestrutura\n- Custo proporcional ao uso (não pagar quando idle)\n- Tempo de resposta < 300ms para 95% das requisições\n- Autenticação segura\n- Capacidade de auditar todas as chamadas`,
    objective: `Entender como construir uma arquitetura serverless end-to-end na AWS, conectando os serviços de API management, compute e database. Compreender os trade-offs de serverless vs. compute tradicional, como IAM protege cada componente, e como CloudWatch monitora a saúde da aplicação.`,
    difficulty: 'level_1_clf',
    certifications: ['CLF-C02', 'SAA-C03', 'DVA-C02'],
    budget_usd: 200.00,
    client_persona: { name: 'João', role: 'CTO Fintech' },
    constraints: ['Zero gerenciamento de infraestrutura', 'Custo proporcional ao uso'],
    architecture_graph: {
      type: 'mermaid',
      content: `graph LR
    Client(["📱 App Mobile"])
    CW(["📊 CloudWatch"])
    
    Client -->|HTTPS| APIGW["Amazon API Gateway\n(REST API)"]
    APIGW -->|Autoriza| IAM["AWS IAM\n(Resource Policy)"]
    APIGW -->|Invoca| Lambda["AWS Lambda\n(Função de negócio)"]
    Lambda -->|Lê/Escreve| DDB["Amazon DynamoDB\n(Tabela de pagamentos)"]
    Lambda -->|Logs e métricas| CW
    APIGW -->|Logs de acesso| CW`,
    },
    resources: [
      {
        type: 'doc',
        title: 'Guia do desenvolvedor Lambda',
        url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
      }
    ],
    tags: ['serverless', 'api', 'dynamodb', 'lambda', 'fintech', 'custo-otimizado'],
    servicesSlugs: ['aws-lambda', 'amazon-api-gateway', 'amazon-dynamodb', 'aws-iam', 'amazon-cloudwatch'],
    dialogues: [
      {
        question: 'Qual é a linguagem de programação que a equipe domina?',
        answer: 'Nossa equipe programa quase 100% em Node.js e Python.',
        hints: ['O AWS Lambda suporta nativamente Node.js e Python.']
      },
      {
        question: 'Os dados precisam ter relacionamentos complexos (JOINs)?',
        answer: 'Não, os acessos são feitos diretamente pelo ID do usuário ou da transação. Relacionamentos complexos não são necessários.',
        hints: ['DynamoDB é excelente para consultas baseadas em chave-valor.']
      }
    ],
    evaluationCriteria: [
      { service_slug: 'aws-lambda', pillar: 'performance', score_impact: 20, feedback_msg: 'Excelente! Lambda resolve a computação serverless perfeitamente.' },
      { service_slug: 'amazon-api-gateway', pillar: 'security', score_impact: 10, feedback_msg: 'API Gateway adiciona uma camada de proteção (Throttling, IAM) na borda.' },
      { service_slug: 'amazon-dynamodb', pillar: 'performance', score_impact: 20, feedback_msg: 'DynamoDB atende latência de milissegundos sem servidor para gerenciar.' },
      { service_slug: 'amazon-ec2', pillar: 'operational', score_impact: -30, feedback_msg: 'Você escolheu EC2, violando a restrição de "Zero gerenciamento de infraestrutura".' },
      { service_slug: 'amazon-rds', pillar: 'cost', score_impact: -15, feedback_msg: 'RDS não era estritamente necessário (não há JOINs) e gera cobrança fixa por hora, violando a regra de pagar pelo uso.' }
    ]
  },
  {
    slug: 'ha-web-app-3-tier',
    title: 'Aplicação Web 3 Camadas de Alta Disponibilidade',
    scenario: `Um e-commerce de médio porte precisa migrar sua aplicação monolítica (PHP + MySQL) hospedada num servidor único para a AWS. Nos últimos 6 meses, a loja teve 4 quedas durante campanhas de Black Friday, causando prejuízo estimado de R$800k.\n\nRequisitos do arquiteto-chave:\n- Alta disponibilidade em múltiplas Zonas de Disponibilidade (AZ)\n- Capacidade de suportar 5x o tráfego normal sem degradação\n- RTO < 1 hora e RPO < 15 minutos\n- Separar camadas de apresentação, aplicação e dados\n- Budget inicial: até US$ 2.000/mês`,
    objective: `Compreender os pilares de uma arquitetura 3-tier (web, app, data) na AWS, como usar ELB para distribuir tráfego, Auto Scaling para elasticidade, RDS Multi-AZ para alta disponibilidade de dados, e S3 + CloudFront para assets estáticos. Entender os conceitos de RTO, RPO e tolerância a falhas.`,
    difficulty: 'intermediate',
    certifications: ['SAA-C03', 'CLF-C02'],
    architecture_graph: {
      type: 'mermaid',
      content: `graph TB
    Users(["👥 Usuários"])
    
    subgraph CDN ["CDN Layer"]
        CF["Amazon CloudFront"]
        S3S["Amazon S3\n(Assets estáticos)"]
    end
    
    subgraph WebTier ["Web Tier — Multi-AZ"]
        ALB["Application Load Balancer"]
        EC2a["EC2 (AZ-a)\nApp PHP"]
        EC2b["EC2 (AZ-b)\nApp PHP"]
        ASG["Auto Scaling Group"]
    end
    
    subgraph DataTier ["Data Tier — Multi-AZ"]
        RDS_P["RDS MySQL\n(Primary AZ-a)"]
        RDS_R["RDS MySQL\n(Standby AZ-b)"]
        CACHE["ElastiCache Redis\n(Cache de sessão)"]
    end
    
    Users -->|HTTPS| CF
    CF --> S3S
    CF --> ALB
    ALB --> EC2a
    ALB --> EC2b
    ASG -.->|Gerencia| EC2a
    ASG -.->|Gerencia| EC2b
    EC2a & EC2b --> CACHE
    EC2a & EC2b --> RDS_P
    RDS_P -.->|Replicação síncrona| RDS_R`,
    },
    resources: [
      {
        type: 'doc',
        title: 'AWS Well-Architected Framework — Reliability Pillar',
        url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html',
      },
      {
        type: 'doc',
        title: 'RDS Multi-AZ Deployments',
        url: 'https://aws.amazon.com/rds/features/multi-az/',
      },
      {
        type: 'doc',
        title: 'Auto Scaling — Dynamic Scaling Policies',
        url: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scale-based-on-demand.html',
      },
    ],
    tags: ['alta-disponibilidade', 'multi-az', 'e-commerce', '3-tier', 'rds', 'elb', 'auto-scaling'],
    servicesSlugs: [
      'amazon-ec2', 'elastic-load-balancing', 'amazon-auto-scaling',
      'amazon-rds', 'amazon-elasticache', 'amazon-s3', 'amazon-cloudfront',
      'amazon-vpc', 'amazon-cloudwatch',
    ],
  },
  {
    slug: 'data-lake-analytics',
    title: 'Data Lake e Analytics com S3 + Athena + QuickSight',
    scenario: `Uma rede de varejo com 500 lojas físicas precisa centralizar e analisar dados de vendas, estoque e comportamento de clientes. Atualmente os dados ficam fragmentados em planilhas Excel e sistemas legados isolados por região.\n\nO diretor de dados exige:\n- Centralizar todos os dados históricos (últimos 5 anos, ~50TB)\n- Permitir consultas SQL ad-hoc sem infraestrutura de data warehouse fixa\n- Dashboards executivos atualizados a cada 4 horas\n- Custo de armazenamento < US$1.200/mês para os 50TB\n- Segregar dados por nível de confidencialidade`,
    objective: `Entender como construir um Data Lake econômico na AWS usando S3 como repositório central, Glue para catalogar e transformar dados, Athena para consultas serverless sobre S3 e QuickSight para visualização. Compreender particionamento, formatos de dados (Parquet vs CSV) e controle de acesso granular.`,
    difficulty: 'advanced',
    certifications: ['SAA-C03', 'CLF-C02'],
    architecture_graph: {
      type: 'mermaid',
      content: `graph LR
    subgraph Sources ["Fontes de Dados"]
        ERP["Sistemas ERP\n(Vendas)"]
        CRM["CRM\n(Clientes)"]
        IoT["Sensores IoT\n(Estoque)"]
    end
    
    subgraph Ingestion ["Ingestão"]
        KDF["Kinesis Data Firehose\n(Streaming)"]
        GlueCrawl["AWS Glue Crawler\n(Catalogação)"]
    end
    
    subgraph Lake ["Data Lake — S3"]
        RAW["S3 Raw\n(Dados brutos)"]
        CLEAN["S3 Curated\n(Parquet otimizado)"]
        GlueCat["AWS Glue Catalog\n(Metadados)"]
    end
    
    subgraph Analytics ["Analytics"]
        Athena["Amazon Athena\n(SQL Serverless)"]
        QS["Amazon QuickSight\n(Dashboards)"]
    end
    
    ERP & CRM --> KDF
    IoT --> KDF
    KDF --> RAW
    RAW --> GlueCrawl
    GlueCrawl --> GlueCat
    GlueCrawl --> CLEAN
    CLEAN --> Athena
    GlueCat --> Athena
    Athena --> QS`,
    },
    resources: [
      {
        type: 'doc',
        title: 'AWS Lake Formation — Getting Started',
        url: 'https://docs.aws.amazon.com/lake-formation/latest/dg/getting-started.html',
      },
      {
        type: 'doc',
        title: 'Athena — Query S3 Data',
        url: 'https://docs.aws.amazon.com/athena/latest/ug/what-is.html',
      },
      {
        type: 'blog',
        title: 'Data Lake Architecture on AWS (Whitepaper)',
        url: 'https://docs.aws.amazon.com/whitepapers/latest/building-data-lakes/building-data-lake-aws.html',
      },
    ],
    tags: ['data-lake', 'analytics', 's3', 'serverless', 'big-data', 'varejo'],
    servicesSlugs: ['amazon-s3', 'amazon-cloudwatch', 'aws-iam', 'aws-kms'],
  },
];

// ============================================================================
// SEED EXECUTION
// ============================================================================

async function seedServices() {
  console.log('[seed-cases] Seeding AWS Services catalog...');
  let inserted = 0;
  let skipped = 0;

  for (const service of AWS_SERVICES) {
    console.log(`\nIniciando: ${service.slug}`);

    console.time(service.slug);

    const result = await insertAwsService(service);

    console.timeEnd(service.slug);

    console.log(`Finalizado: ${service.slug}`);

    if (result) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`[seed-cases] Services: ${inserted} inserted, ${skipped} skipped`);
}

async function seedCases() {
  console.log('[seed-cases] Seeding Cases...');
  let inserted = 0;
  let skipped = 0;

  for (const caseData of CASES) {
    const { servicesSlugs, ...casePayload } = caseData;

    const caseRow = await insertCase(casePayload);

    if (!caseRow) {
      skipped++;
      console.log(`[seed-cases] Case already exists, skipping: ${caseData.slug}`);
      continue;
    }

    // Link services to the case
    for (const serviceSlug of servicesSlugs) {
      const serviceRows = await executeQuery(
        'SELECT id FROM aws_services WHERE slug = $1 AND is_active = TRUE',
        [serviceSlug],
      );

      if (serviceRows.length === 0) {
        console.warn(`[seed-cases] Service not found: ${serviceSlug}`);
        continue;
      }

      await executeQuery(
        `INSERT INTO case_services (case_id, service_id)
         VALUES ($1, $2)
         ON CONFLICT (case_id, service_id) DO NOTHING`,
        [caseRow.id, serviceRows[0].id],
      );
    }

    // Seed Dialogues
    if (caseData.dialogues) {
      for (const d of caseData.dialogues) {
        await insertCaseDialogue({
          case_id: caseRow.id,
          question: d.question,
          answer: d.answer,
          hints: d.hints
        });
      }
    }

    // Seed Evaluation Criteria
    if (caseData.evaluationCriteria) {
      for (const crit of caseData.evaluationCriteria) {
        await insertCaseEvaluationCriteria({
          case_id: caseRow.id,
          service_slug: crit.service_slug,
          pillar: crit.pillar,
          score_impact: crit.score_impact,
          feedback_msg: crit.feedback_msg
        });
      }
    }

    inserted++;
    console.log(`[seed-cases] Case inserted: ${caseData.slug}`);
  }

  console.log(`[seed-cases] Cases: ${inserted} inserted, ${skipped} skipped`);
}

async function main() {
  console.log('[seed-cases] Starting Practice Domain seed...');
  console.log(`[seed-cases] DB_DATA_DIR=${process.env.DB_DATA_DIR || '(from .env or unset)'}`);

  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  try {
    await seedServices();
    await seedCases();
    console.log('[seed-cases] ✅ Done!');
  } finally {
    await closeDatabase();
  }
}

main().catch(async (error) => {
  console.error(`[seed-cases] ❌ Failed: ${error.message}`);
  console.error(error.stack);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
