require('dotenv').config();
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// --- CONFIGURAÇÃO MASTER ---
const META_POR_NIVEL = 60;
const TENTATIVAS_MAXIMAS = 3; 
const ESPERA_ENTRE_BLOCOS = 20000; // 20 segundos para evitar erro 429 (Rate Limit)
const DIFICULDADES = ["easy", "medium", "hard"];

const EXAMES = [
    { 
        id: "clf-c02", 
        nome: "AWS Certified Cloud Practitioner (CLF-C02)",
        dominios: ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"]
    },
    { 
        id: "saa-c03", 
        nome: "AWS Certified Solutions Architect – Associate (SAA-C03)",
        dominios: ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"]
    },
    { 
        id: "aif-c01", 
        nome: "AWS Certified AI Practitioner (AIF-C01)",
        dominios: ["conceitos-ia", "ia-generativa", "seguranca-ia", "implementacao-ia"]
    }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function iniciarAutomacao() {
    console.log("\n🚀 [MOTOR DE IA] Iniciando processo de abastecimento resiliente...");
    
    for (const exame of EXAMES) {
        console.log(`\n📂 EXAME: ${exame.nome.toUpperCase()}`);
        
        // Ajustado para apontar para a pasta /data na raiz (Solução 2 do GitHub Pages)
        const caminho = path.join(__dirname, '../data', `${exame.id}.json`);
        
        // Garante que o diretório data existe
        const dirData = path.join(__dirname, '../data');
        if (!fs.existsSync(dirData)) {
            fs.mkdirSync(dirData, { recursive: true });
        }

        let banco = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho, 'utf-8')) : [];

        for (const nivel of DIFICULDADES) {
            let atuais = banco.filter(q => q.difficulty === nivel).length;
            
            while (atuais < META_POR_NIVEL) {
                const faltam = META_POR_NIVEL - atuais;
                // Reduzido para 10 para maior fiabilidade e menos timeouts na API gratuita
                const lote = Math.min(10, faltam);

                console.log(`   [${nivel.toUpperCase()}] Status: ${atuais}/${META_POR_NIVEL} | Gerando +${lote}...`);
                
                let sucesso = false;
                let tentativas = 0;

                while (!sucesso && tentativas < TENTATIVAS_MAXIMAS) {
                    const novas = await pedirIA(exame, nivel, lote);
                    
                    if (novas && Array.isArray(novas) && novas.length > 0) {
                        let ultimoId = banco.length > 0 ? Math.max(...banco.map(q => q.id)) : 1000;
                        
                        novas.forEach(q => { 
                            q.id = ++ultimoId; 
                            banco.push(q); 
                        });
                        
                        fs.writeFileSync(caminho, JSON.stringify(banco, null, 2));
                        atuais = banco.filter(q => q.difficulty === nivel).length;
                        sucesso = true;
                        console.log(`      ✅ Lote processado com sucesso!`);
                    } else {
                        tentativas++;
                        const tempoEspera = 10000 * tentativas;
                        console.warn(`      ⚠️  Falha na tentativa ${tentativas}. Aguardando ${tempoEspera/1000}s para tentar novamente...`);
                        await sleep(tempoEspera);
                    }
                }

                if (!sucesso) {
                    console.error(`      ❌ Nível ${nivel} ignorado após ${TENTATIVAS_MAXIMAS} falhas.`);
                    break;
                }

                // Pausa estratégica entre chamadas bem-sucedidas
                await sleep(ESPERA_ENTRE_BLOCOS);
            }
        }
    }
    console.log("\n🏆 [FINALIZADO] O banco de dados está completo e validado!");
}

async function pedirIA(exame, nivel, quantidade) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            generationConfig: { 
                responseMimeType: "application/json",
                // Força a API a devolver um JSON perfeito e validado nativamente
                responseSchema: {
                    type: SchemaType.ARRAY,
                    description: "Lista de questões de múltipla escolha para exames AWS.",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            domain: { type: SchemaType.STRING },
                            difficulty: { type: SchemaType.STRING },
                            question: { type: SchemaType.STRING },
                            options: { 
                                type: SchemaType.ARRAY, 
                                items: { type: SchemaType.STRING },
                                description: "Exatamente 4 opções limpas, sem letras no início."
                            },
                            correct: { type: SchemaType.INTEGER, description: "Índice de 0 a 3 indicando a correta." },
                            explanation: { type: SchemaType.STRING }
                        },
                        required: ["domain", "difficulty", "question", "options", "correct", "explanation"]
                    }
                }
            } 
        });

        // Few-Shot Prompting: Fornecendo um exemplo para guiar a IA e acelerar a resposta
        const prompt = `Atue como Arquiteto AWS Sênior. Gere ${quantidade} questões de múltipla escolha INÉDITAS para o exame ${exame.nome}.
        Dificuldade: "${nivel}". Domínios permitidos: ${JSON.stringify(exame.dominios)}.
        As questões devem focar em cenários reais e técnicos.
        
        Exemplo do que espero gerado:
        [
          {
            "domain": "${exame.dominios[0]}",
            "difficulty": "${nivel}",
            "question": "Qual serviço AWS permite gerenciar chaves de encriptação?",
            "options": ["AWS IAM", "AWS KMS", "AWS CloudTrail", "Amazon Inspector"],
            "correct": 1,
            "explanation": "O AWS KMS (Key Management Service) gerencia chaves de encriptação de forma segura."
          }
        ]
        Gere as ${quantidade} novas questões baseadas nos padrões oficiais da AWS.`;

        const result = await model.generateContent(prompt);
        // Com o Schema definido, o Gemini já devolve o JSON puro
        const data = JSON.parse(result.response.text());
        
        return Array.isArray(data) ? data : null;

    } catch (e) {
        console.error(`      ❌ Erro Técnico: ${e.message}`);
        return null;
    }
}

iniciarAutomacao();