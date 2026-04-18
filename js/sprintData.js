/**
 * BANCO DE DADOS DAS PÍLULAS DE CONHECIMENTO (SPRINT 14 DIAS)
 * Bilíngue: PT-BR / EN-US
 * Uso: getPill(day, lang) → retorna o objeto da pílula no idioma correto
 **/

const sprintPillsData = {
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
                        <p class="text-sm">Sempre que a questão falar sobre "parar de adivinhar a capacidade", a resposta está ligada à <strong>Elasticidade</strong>.</p>
                    </div>

                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Modelos de Serviço (O Triângulo de Ouro)</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">IaaS:</span> Ex: EC2. Maior controle sobre o SO e o hardware virtual.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">PaaS:</span> Ex: Elastic Beanstalk. Foco no código; a AWS gerencia o SO.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">SaaS:</span> Ex: Rekognition. Produto final pronto para consumo via API ou Interface.
                            </div>
                        </div>
                    </section>
                </div>
            `,
            keyTakeaway: "A nuvem é baseada em pagamento sob demanda, elasticidade e agilidade nos negócios."
        },
        en: {
            title: "Fundamentals: What is the AWS Cloud?",
            readTime: "3 min",
            topic: "Cloud Concepts",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Traditional Model vs. Cloud</h3>
                        <p>In the traditional model (on-premises), you pay for physical servers regardless of whether you use them. With AWS, you trade <strong>capital expenses (CapEx)</strong> for <strong>variable expenses (OpEx)</strong>.</p>
                    </section>
                    
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Exam Tip</p>
                        <p class="text-sm">Whenever a question mentions "stop guessing capacity," the answer is related to <strong>Elasticity</strong>.</p>
                    </div>

                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Service Models (The Golden Triangle)</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">IaaS:</span> Ex: EC2. Greater control over the OS and virtual hardware.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">PaaS:</span> Ex: Elastic Beanstalk. Focus on code; AWS manages the OS.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">SaaS:</span> Ex: Rekognition. Final product ready to consume via API or Interface.
                            </div>
                        </div>
                    </section>
                </div>
            `,
            keyTakeaway: "The cloud is based on on-demand payment, elasticity, and business agility."
        }
    },

    2: {
        pt: {
            title: "Os 6 Pilares do Well-Architected Framework",
            readTime: "4 min",
            topic: "Conceitos Cloud",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Os 6 Pilares</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">1. Excelência Operacional:</span> Executar e monitorar sistemas para entregar valor de negócios.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">2. Segurança:</span> Proteger informações e sistemas.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">3. Confiabilidade:</span> Capacidade de recuperar falhas e atender à demanda.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">4. Eficiência de Performance:</span> Usar recursos computacionais com eficiência.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">5. Otimização de Custos:</span> Evitar gastos desnecessários.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">6. Sustentabilidade:</span> Minimizar impactos ambientais das cargas de trabalho.
                            </div>
                        </div>
                    </section>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                        <p class="text-sm">Memorize o acrônimo <strong>OSRECS</strong> (Operacional, Segurança, Reliability, Eficiência, Custo, Sustentabilidade).</p>
                    </div>
                </div>
            `,
            keyTakeaway: "O Well-Architected Framework tem 6 pilares que guiam a construção de sistemas robustos na AWS."
        },
        en: {
            title: "The 6 Pillars of the Well-Architected Framework",
            readTime: "4 min",
            topic: "Cloud Concepts",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">The 6 Pillars</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">1. Operational Excellence:</span> Run and monitor systems to deliver business value.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">2. Security:</span> Protect information and systems.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">3. Reliability:</span> Ability to recover from failures and meet demand.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">4. Performance Efficiency:</span> Use computing resources efficiently.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">5. Cost Optimization:</span> Avoid unnecessary spending.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">6. Sustainability:</span> Minimize environmental impact of workloads.
                            </div>
                        </div>
                    </section>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Exam Tip</p>
                        <p class="text-sm">Memorize the acronym <strong>OSRECS</strong> (Operational, Security, Reliability, Efficiency, Cost, Sustainability).</p>
                    </div>
                </div>
            `,
            keyTakeaway: "The Well-Architected Framework has 6 pillars that guide building robust systems on AWS."
        }
    },

    3: {
        pt: {
            title: "Modelo de Responsabilidade Compartilhada",
            readTime: "3 min",
            topic: "Conceitos Cloud",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Quem é responsável pelo quê?</h3>
                        <p>A AWS é responsável pela segurança <strong>DA</strong> nuvem. Você é responsável pela segurança <strong>NA</strong> nuvem.</p>
                    </section>
                    <div class="grid grid-cols-1 gap-3">
                        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p class="font-bold text-blue-600 dark:text-blue-400 mb-1">AWS é responsável por:</p>
                            <p class="text-sm">Hardware, datacenters, rede física, hipervisor, serviços gerenciados.</p>
                        </div>
                        <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <p class="font-bold text-green-600 dark:text-green-400 mb-1">Você é responsável por:</p>
                            <p class="text-sm">Dados, sistema operacional (no EC2), configuração de rede, IAM, criptografia.</p>
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                        <p class="text-sm">Em serviços gerenciados como S3 e Lambda, sua responsabilidade é <strong>menor</strong>. No EC2 é <strong>maior</strong>.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "AWS cuida da infraestrutura; você cuida dos dados e configurações dentro dos serviços."
        },
        en: {
            title: "Shared Responsibility Model",
            readTime: "3 min",
            topic: "Cloud Concepts",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Who is responsible for what?</h3>
                        <p>AWS is responsible for security <strong>OF</strong> the cloud. You are responsible for security <strong>IN</strong> the cloud.</p>
                    </section>
                    <div class="grid grid-cols-1 gap-3">
                        <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p class="font-bold text-blue-600 dark:text-blue-400 mb-1">AWS is responsible for:</p>
                            <p class="text-sm">Hardware, datacenters, physical network, hypervisor, managed services.</p>
                        </div>
                        <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <p class="font-bold text-green-600 dark:text-green-400 mb-1">You are responsible for:</p>
                            <p class="text-sm">Data, operating system (on EC2), network configuration, IAM, encryption.</p>
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Exam Tip</p>
                        <p class="text-sm">For managed services like S3 and Lambda, your responsibility is <strong>lower</strong>. For EC2 it is <strong>higher</strong>.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "AWS handles the infrastructure; you handle the data and configurations within the services."
        }
    },

    4: {
        pt: {
            title: "IAM: Identidade e Acesso na AWS",
            readTime: "4 min",
            topic: "Segurança",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">O que é IAM?</h3>
                        <p>IAM (Identity and Access Management) controla <strong>quem</strong> pode fazer <strong>o quê</strong> na sua conta AWS.</p>
                    </section>
                    <div class="grid grid-cols-1 gap-3">
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Usuários:</span> Identidades individuais com credenciais.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Grupos:</span> Coleções de usuários com permissões em comum.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Roles (Funções):</span> Identidades temporárias para serviços ou usuários externos.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Policies (Políticas):</span> Documentos JSON que definem permissões.
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                        <p class="text-sm">IAM é <strong>global</strong> (não regional), gratuito e segue o princípio do <strong>menor privilégio</strong>.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "IAM controla acesso com usuários, grupos, roles e políticas — sempre com menor privilégio."
        },
        en: {
            title: "IAM: Identity and Access on AWS",
            readTime: "4 min",
            topic: "Security",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">What is IAM?</h3>
                        <p>IAM (Identity and Access Management) controls <strong>who</strong> can do <strong>what</strong> in your AWS account.</p>
                    </section>
                    <div class="grid grid-cols-1 gap-3">
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Users:</span> Individual identities with credentials.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Groups:</span> Collections of users with shared permissions.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Roles:</span> Temporary identities for services or external users.
                        </div>
                        <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                            <span class="font-bold text-aws-orange">Policies:</span> JSON documents that define permissions.
                        </div>
                    </div>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Exam Tip</p>
                        <p class="text-sm">IAM is <strong>global</strong> (not regional), free, and follows the principle of <strong>least privilege</strong>.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "IAM controls access via users, groups, roles, and policies — always with least privilege."
        }
    },

    5: {
        pt: {
            title: "Segurança: MFA, KMS e Shield",
            readTime: "4 min",
            topic: "Segurança",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Serviços de Segurança Essenciais</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">MFA (Multi-Factor Auth):</span> Adiciona segunda camada de verificação ao login. Sempre habilite para o root.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">KMS (Key Management Service):</span> Cria e gerencia chaves de criptografia. Integrado com S3, EBS, RDS.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">Shield:</span> Proteção contra ataques DDoS. Standard (grátis) e Advanced (pago).
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">WAF (Web Application Firewall):</span> Protege apps web de ataques como SQL Injection e XSS.
                            </div>
                        </div>
                    </section>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Dica de Prova</p>
                        <p class="text-sm">DDoS → Shield. Criptografia de dados → KMS. Proteção de aplicação web → WAF.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "MFA, KMS, Shield e WAF são as ferramentas base de segurança na AWS — saiba para qual ameaça cada um serve."
        },
        en: {
            title: "Security: MFA, KMS and Shield",
            readTime: "4 min",
            topic: "Security",
            content: `
                <div class="space-y-6 text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Essential Security Services</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">MFA (Multi-Factor Auth):</span> Adds a second verification layer to login. Always enable for root.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">KMS (Key Management Service):</span> Creates and manages encryption keys. Integrated with S3, EBS, RDS.
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">Shield:</span> Protection against DDoS attacks. Standard (free) and Advanced (paid).
                            </div>
                            <div class="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                                <span class="font-bold text-aws-orange">WAF (Web Application Firewall):</span> Protects web apps from attacks like SQL Injection and XSS.
                            </div>
                        </div>
                    </section>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-aws-orange p-4 rounded-r-lg">
                        <p class="font-bold text-aws-orange text-xs uppercase tracking-widest mb-1">Exam Tip</p>
                        <p class="text-sm">DDoS → Shield. Data encryption → KMS. Web app protection → WAF.</p>
                    </div>
                </div>
            `,
            keyTakeaway: "MFA, KMS, Shield and WAF are the core security tools on AWS — know which threat each one addresses."
        }
    }

    // Os dias 6–14 seguem o mesmo padrão acima.
    // Adicione aqui conforme o conteúdo for criado.
};

/**
 * Retorna a pílula do dia no idioma correto.
 * @param {number} day - Dia do sprint (1-14)
 * @param {string} lang - 'pt' ou 'en'
 * @returns {object|null} Objeto com title, readTime, topic, content, keyTakeaway
 */
function getPill(day, lang) {
    const entry = sprintPillsData[day];
    if (!entry) return null;
    const l = (lang === 'en' && entry.en) ? 'en' : 'pt';
    return entry[l];
}

// Compatibilidade retroativa: expõe o objeto antigo (PT) para código legado
const sprintPills = {};
Object.keys(sprintPillsData).forEach(day => {
    sprintPills[parseInt(day)] = sprintPillsData[day].pt;
});

window.sprintPills    = sprintPills;
window.sprintPillsData = sprintPillsData;
window.getPill         = getPill;