/**
 * BANCO DE DADOS DAS PÍLULAS DE CONHECIMENTO (SPRINT 14 DIAS)
 * Bilíngue: PT-BR / EN-US
 * Uso: getPill(day, lang, certId) → retorna o objeto da pílula no idioma correto
 **/

const sprintPillsData = {
    // ==========================================
    // 1. CLOUD PRACTITIONER (CLF-C02)
    // ==========================================
    'clf-c02': {
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
                keyTakeaway: "Na nuvem, você paga apenas pelo que consome (Pay-as-you-go) e tem elasticidade sob demanda."
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
                keyTakeaway: "In the cloud, you only pay for what you use (Pay-as-you-go) and gain on-demand elasticity."
            }
        },
        2: {
            pt: { title: "Infraestrutura Global", 
                readTime: "4 min", 
                topic: "Conceitos Cloud", 
                content: `
                    <div class="space-y-4">
                        <p>A AWS opera em <strong>Regiões</strong> (áreas geográficas) e <strong>Zonas de Disponibilidade (AZs)</strong>. Uma Região tem no mínimo 3 AZs.</p><div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded"><strong>Dica:</strong> Edge Locations são usadas pelo CloudFront para reduzir latência.</div></div>`, 
                keyTakeaway: "Regiões fornecem isolamento; AZs fornecem alta disponibilidade." },

            en: { title: "Global Infrastructure", 
                readTime: "4 min", 
                topic: "Cloud Concepts", 
                content: `<p>AWS operates in Regions and Availability Zones (AZs)...</p>`, 
                keyTakeaway: "Regions for isolation; AZs for high availability." }
        },
        3: {
            pt: { title: "Modelo de Responsabilidade Compartilhada", 
                readTime: "3 min", 
                topic: "Segurança", 
                content: `<p>A AWS é responsável pela segurança <strong>DA</strong> nuvem (hardware, infra), e o cliente é responsável pela segurança <strong>NA</strong> nuvem (dados, SO, firewall).</p>`, 
                keyTakeaway: "AWS cuida do host; você cuida dos dados." },

            en: { title: "Shared Responsibility Model", 
                readTime: "3 min", 
                topic: "Security", 
                content: `<p>AWS is responsible for security OF the cloud; customer is responsible for security IN the cloud.</p>`, 
                keyTakeaway: "AWS manages the host; you manage the data." }
        },
        // Adicionar aqui os dias 4 ao 14 para a CLF-C02...
    },

    // ==========================================
    // 2. SOLUTIONS ARCHITECT (SAA-C03)
    // ==========================================
    'saa-c03': {
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
                keyTakeaway: "Desenhe arquiteturas assumindo que tudo pode falhar. Multi-AZ é o padrão de ouro para resiliência de banco de dados na AWS."
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
                keyTakeaway: "Design architectures assuming everything will fail. Multi-AZ is the gold standard."
            }
        },

        2: {
            pt: { title: "Infraestrutura Global", 
                readTime: "4 min", 
                topic: "Conceitos Cloud", 
                content: `<div class="space-y-4"><p>A AWS opera em <strong>Regiões</strong> (áreas geográficas) e <strong>Zonas de Disponibilidade (AZs)</strong>. Uma Região tem no mínimo 3 AZs.</p><div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded"><strong>Dica:</strong> Edge Locations são usadas pelo CloudFront para reduzir latência.</div></div>`, 
                keyTakeaway: "Regiões fornecem isolamento; AZs fornecem alta disponibilidade." },
            en: { title: "Global Infrastructure", 
                readTime: "4 min", 
                topic: "Cloud Concepts", 
                content: `<p>AWS operates in Regions and Availability Zones (AZs)...</p>`, 
                keyTakeaway: "Regions for isolation; AZs for high availability." }
        },

        3: {
            
            pt: { title: "Modelo de Responsabilidade Compartilhada", 
                readTime: "3 min", 
                topic: "Segurança", 
                content: `<p>A AWS é responsável pela segurança <strong>DA</strong> nuvem (hardware, infra), e o cliente é responsável pela segurança <strong>NA</strong> nuvem (dados, SO, firewall).</p>`, 
                keyTakeaway: "AWS cuida do host; você cuida dos dados." },
                
            en: { title: "Shared Responsibility Model", 
                readTime: "3 min", 
                topic: "Security", 
                content: `<p>AWS is responsible for security OF the cloud; customer is responsible for security IN the cloud.</p>`, 
                keyTakeaway: "AWS manages the host; you manage the data." }
        },
        // Adicionar aqui os dias 4 ao 14 para a SAA-C03...
    },

    // ==========================================
    // 3. AI PRACTITIONER (AIF-C01)
    // ==========================================
    'aif-c01': {
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
                keyTakeaway: "O Bedrock é Serverless. Você não provisiona infraestrutura para usar FMs como o Claude, Llama ou Titan."
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
                keyTakeaway: "Bedrock is Serverless. You don't provision infrastructure to use FMs."
            },
            2: {

            pt: { title: "Ciclo de Vida do ML", 
                readTime: "4 min", 
                topic: "IA/ML", 
                content: `<p>Coleta de dados → Preparação → Treinamento → Avaliação → Implantação.</p>`, 
                keyTakeaway: "O SageMaker gerencia todo esse ciclo." },

            en: { title: "ML Lifecycle", 
                readTime: "4 min", 
                topic: "AI/ML", 
                content: `<p>Data collection → Prep → Training → Evaluation → Deployment.</p>`, 
                keyTakeaway: "SageMaker manages this entire cycle." }
        },
        }
        // Adicionar aqui os dias 3 ao 14 para a AIF-C01...
    },

    // ==========================================
    // 4. DEVELOPER ASSOCIATE (DVA-C02)
    // ==========================================
    'dva-c02': {
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
                keyTakeaway: "O Lambda é orientado a eventos e cobra apenas pelos milissegundos de computação consumidos."
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
                keyTakeaway: "Lambda is event-driven and charges only for the compute milliseconds consumed."
            }
        },
        2: {
            pt: { 
                title: "CI/CD: CodePipeline e CodeBuild", 
                readTime: "5 min", 
                topic: "DevOps", 
                content: `<p>CodeBuild compila o código; CodePipeline orquestra as fases de teste e deploy.</p>`, 
                keyTakeaway: "Automatize tudo para evitar erros manuais." },
            en: { 
                title: "CI/CD: CodePipeline and CodeBuild", 
                readTime: "5 min", 
                topic: "DevOps", 
                content: `<p>CodeBuild compiles code; CodePipeline orchestrates test/deploy phases.</p>`, 
                keyTakeaway: "Automate everything to avoid manual errors." }
        },
        // Adicionar aqui os dias 3 ao 14 para a DVA-C02...
    }
};

/**
 * Retorna a pílula do dia no idioma e certificação corretos.
 * @param {number} day - Dia do sprint (1-14)
 * @param {string} lang - 'pt' ou 'en'
 * @param {string} certId - ID da certificação (ex: 'clf-c02')
 * @returns {object|null} Objeto com title, readTime, topic, content, keyTakeaway
 */
function getPill(day, lang, certId = 'clf-c02') {
    // 1. Procura a certificação no banco de dados (se não existir, falha silenciosamente)
    const certData = sprintPillsData[certId];
    if (!certData) return null;

    // 2. Procura o dia específico dentro dessa certificação
    const entry = certData[day];
    if (!entry) return null;

    // 3. Retorna o conteúdo no idioma solicitado (com fallback para pt se o en não existir)
    const l = (lang === 'en' && entry.en) ? 'en' : 'pt';
    return entry[l];
}

// Expõe a função globalmente para o app.js a conseguir chamar
window.getPill = getPill;