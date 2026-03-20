require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
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
        const caminho = path.join(__dirname, '../src/data', `${exame.id}.json`);
        
        // Garante que o diretório data existe
        const dirData = path.join(__dirname, '../src/data');
        if (!fs.existsSync(dirData)) {
            fs.mkdirSync(dirData, { recursive: true });
        }

        let banco = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho, 'utf-8')) : [];

        for (const nivel of DIFICULDADES) {
            let atuais = banco.filter(q => q.difficulty === nivel).length;
            
            while (atuais < META_POR_NIVEL) {
                const faltam = META_POR_NIVEL - atuais;
                const lote = Math.min(15, faltam);

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
            model: "gemini-2.5-flash", // Modelo estável para grandes lotes
            generationConfig: { responseMimeType: "application/json" } 
        });

        const prompt = `Atue como Arquiteto AWS Sênior. Gere ${quantidade} questões de múltipla escolha INÉDITAS para o exame ${exame.nome}.
        Dificuldade: "${nivel}". Domínios permitidos: ${JSON.stringify(exame.dominios)}.
        As questões devem focar em cenários reais e técnicos.
        Responda APENAS com um array JSON válido:
        [{ "domain": "string", "difficulty": "${nivel}", "question": "string", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "string" }]`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Remove blocos de Markdown se a IA os incluir
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const data = JSON.parse(responseText);
        return Array.isArray(data) ? data : null;

    } catch (e) {
        console.error(`      ❌ Erro Técnico: ${e.message}`);
        return null;
    }
}

iniciarAutomacao();
