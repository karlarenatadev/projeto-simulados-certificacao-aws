export const CERTIFICATIONS = [
  { id: 'clf-c02', label: 'Cloud Practitioner (CLF-C02)' },
  { id: 'saa-c03', label: 'Solutions Architect (SAA-C03)' },
  { id: 'aif-c01', label: 'AI Practitioner (AIF-C01)' },
  { id: 'dva-c02', label: 'Developer Associate (DVA-C02)' },
];

export const SPRINT_PILLS = {
  'clf-c02': [
    { day: 1, topic: 'Conceitos Cloud', title: 'Fundamentos: O que é a Nuvem AWS?', readTime: '3 min', keyTakeaway: 'Na nuvem, você paga apenas pelo que consome (Pay-as-you-go) e tem elasticidade sob demanda.' },
    { day: 2, topic: 'Conceitos Cloud', title: 'Infraestrutura Global', readTime: '4 min', keyTakeaway: 'Regiões fornecem isolamento; AZs fornecem alta disponibilidade.' },
    { day: 3, topic: 'Segurança', title: 'Modelo de Responsabilidade Compartilhada', readTime: '3 min', keyTakeaway: 'AWS cuida do host; você cuida dos dados.' },
    { day: 4, topic: 'Segurança', title: 'IAM: Identidade e Acesso', readTime: '5 min', keyTakeaway: 'Princípio do mínimo privilégio: conceda apenas as permissões necessárias.' },
    { day: 5, topic: 'Computação', title: 'Amazon EC2: Computação Elástica', readTime: '4 min', keyTakeaway: 'EC2 oferece diferentes famílias de instâncias; escolha pelo caso de uso.' },
    { day: 6, topic: 'Armazenamento', title: 'Amazon S3: Armazenamento de Objetos', readTime: '4 min', keyTakeaway: 'S3 é durável (11 noves), escalável e possui classes de armazenamento para custo.' },
    { day: 7, topic: 'Banco de Dados', title: 'RDS e DynamoDB: Bancos Gerenciados', readTime: '5 min', keyTakeaway: 'RDS para SQL relacional; DynamoDB para NoSQL de alta performance.' },
    { day: 8, topic: 'Rede', title: 'VPC: Rede Virtual Privada', readTime: '5 min', keyTakeaway: 'VPC isola seus recursos; subnets públicas e privadas controlam acesso à internet.' },
    { day: 9, topic: 'Precificação', title: 'Modelos de Precificação AWS', readTime: '4 min', keyTakeaway: 'Pay-as-you-go, Reserved Instances e Spot Instances oferecem diferentes trade-offs de custo.' },
    { day: 10, topic: 'Suporte', title: 'Planos de Suporte AWS', readTime: '3 min', keyTakeaway: 'Basic, Developer, Business e Enterprise — cada nível tem SLAs diferentes.' },
    { day: 11, topic: 'Governança', title: 'AWS Organizations e Control Tower', readTime: '4 min', keyTakeaway: 'Organizations gerencia múltiplas contas; SCPs controlam permissões em toda a org.' },
    { day: 12, topic: 'Tecnologia', title: 'Serviços de IA/ML na AWS', readTime: '4 min', keyTakeaway: 'Rekognition, Comprehend, Textract e SageMaker — cada um tem seu caso de uso.' },
    { day: 13, topic: 'Migração', title: 'Estratégias de Migração para a Nuvem', readTime: '4 min', keyTakeaway: 'Os 7Rs: Retire, Retain, Rehost, Replatform, Repurchase, Refactor, Relocate.' },
    { day: 14, topic: 'Revisão', title: 'Revisão Geral: Preparação Final', readTime: '5 min', keyTakeaway: 'Revise os 4 domínios do CLF-C02: Cloud Concepts, Security, Technology, Billing.' },
  ],
  'saa-c03': [
    { day: 1, topic: 'Resiliência', title: 'Design Resiliente: Alta Disponibilidade', readTime: '4 min', keyTakeaway: 'Multi-AZ é o padrão de ouro para resiliência de banco de dados na AWS.' },
    { day: 2, topic: 'Rede', title: 'VPC Avançado: Peering e Transit Gateway', readTime: '5 min', keyTakeaway: 'Transit Gateway simplifica conectividade entre múltiplas VPCs e on-premises.' },
    { day: 3, topic: 'Computação', title: 'Auto Scaling e Load Balancing', readTime: '5 min', keyTakeaway: 'ALB para HTTP/HTTPS, NLB para TCP de baixa latência, ASG para escala automática.' },
    { day: 4, topic: 'Armazenamento', title: 'EBS, EFS e S3: Escolha Certa', readTime: '5 min', keyTakeaway: 'EBS para instância única, EFS para múltiplas instâncias, S3 para objetos.' },
    { day: 5, topic: 'Banco de Dados', title: 'Aurora e ElastiCache', readTime: '5 min', keyTakeaway: 'Aurora é 5x mais rápido que MySQL; ElastiCache reduz latência de leitura.' },
    { day: 6, topic: 'Segurança', title: 'IAM Avançado: Roles e Policies', readTime: '5 min', keyTakeaway: 'Prefira Roles sobre Users; use condições em policies para controle granular.' },
    { day: 7, topic: 'Serverless', title: 'Lambda e API Gateway', readTime: '5 min', keyTakeaway: 'Lambda executa código sem servidor; API Gateway gerencia APIs RESTful e WebSocket.' },
    { day: 8, topic: 'Mensageria', title: 'SQS, SNS e EventBridge', readTime: '5 min', keyTakeaway: 'SQS para filas, SNS para pub/sub, EventBridge para event-driven architecture.' },
    { day: 9, topic: 'CDN', title: 'CloudFront e Route 53', readTime: '4 min', keyTakeaway: 'CloudFront acelera entrega de conteúdo; Route 53 oferece roteamento inteligente.' },
    { day: 10, topic: 'Governança', title: 'CloudTrail, Config e GuardDuty', readTime: '4 min', keyTakeaway: 'CloudTrail audita API calls; Config monitora compliance; GuardDuty detecta ameaças.' },
    { day: 11, topic: 'Migração', title: 'AWS Migration Hub e DMS', readTime: '4 min', keyTakeaway: 'DMS migra bancos de dados com downtime mínimo; SMS migra servidores.' },
    { day: 12, topic: 'Custo', title: 'Cost Explorer e Trusted Advisor', readTime: '4 min', keyTakeaway: 'Cost Explorer analisa gastos; Trusted Advisor recomenda otimizações.' },
    { day: 13, topic: 'Well-Architected', title: 'Os 6 Pilares do Well-Architected', readTime: '5 min', keyTakeaway: 'Excelência Operacional, Segurança, Confiabilidade, Performance, Custo, Sustentabilidade.' },
    { day: 14, topic: 'Revisão', title: 'Revisão Final SAA-C03', readTime: '5 min', keyTakeaway: 'Foco em design resiliente, custo-eficiente, seguro e de alta performance.' },
  ],
};

SPRINT_PILLS['aif-c01'] = SPRINT_PILLS['clf-c02'];
SPRINT_PILLS['dva-c02'] = SPRINT_PILLS['saa-c03'];

export function getSprintDays(certId) {
  return SPRINT_PILLS[certId] || SPRINT_PILLS['clf-c02'];
}
