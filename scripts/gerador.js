require('dotenv').config();
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const stringSimilarity = require("string-similarity");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// --- CONFIGURAÇÃO MASTER ---
const META_POR_NIVEL = 60;
const TENTATIVAS_MAXIMAS = 3; 
const ESPERA_ENTRE_BLOCOS = 45000; 
const DIFICULDADES = ["easy", "medium", "hard"];

const DOMINIOS_VALIDOS = [
    "conceitos-cloud", "seguranca", "tecnologia", "faturamento",
    "design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo",
    "conceitos-ia", "ia-generativa", "seguranca-ia", "implementacao-ia"
];

const EXAMES = [
    { id: "clf-c02", nome: "AWS Certified Cloud Practitioner (CLF-C02)", dominios: ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"] },
    { id: "saa-c03", nome: "AWS Certified Solutions Architect – Associate (SAA-C03)", dominios: ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"] },
    { id: "aif-c01", nome: "AWS Certified AI Practitioner (AIF-C01)", dominios: ["conceitos-ia", "ia-generativa", "seguranca-ia", "implementacao-ia"] }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// ============================================================================
// FUNÇÕES DE VALIDAÇÃO E LIMPEZA (O "CUIDADO" COM OS DADOS)
// ============================================================================

/**
 * Valida se a questão tem estrutura correta e normaliza os campos.
 */
function validarEstrutura(q) {
    if (!q.domain || !q.difficulty || !q.question || !q.explanation || !q.options) return false;

    // NORMALIZAÇÃO: Converte para minúsculas e remove espaços extras
    const dRecebido = q.domain.toLowerCase().trim();
    const nRecebido = q.difficulty.toLowerCase().trim();

    if (!DOMINIOS_VALIDOS.includes(dRecebido)) {
        console.warn(`      ❌ Domínio Inválido: "${q.domain}" não reconhecido.`);
        return false;
    }
    if (!DIFICULDADES.includes(nRecebido)) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;

    // Atualiza o objeto com os valores normalizados para o JSON ficar limpo
    q.domain = dRecebido;
    q.difficulty = nRecebido;
    
    return true;
}

function validarQualidade(q) {
    if (q.question.length < 30 || q.explanation.length < 30) return false;
    const opcoesUnicas = new Set(q.options.map(o => o.toLowerCase().trim()));
    return opcoesUnicas.size === 4;
}

/**
 * Checa se a pergunta já existe (similaridade acima de 85%)
 */
function isDuplicate(nova, banco) {
    if (!banco || banco.length === 0) return false;
    const novaPergunta = nova.question.toLowerCase().trim();

    for (const qExistente of banco) {
        const existente = qExistente.question.toLowerCase().trim();
        if (existente === novaPergunta) return true;
        
        const score = stringSimilarity.compareTwoStrings(novaPergunta, existente);
        if (score > 0.85) return true;
    }
    return false;
}

/**
 * O ZELADOR: Limpa o que já existe no seu arquivo antes de começar.
 */
function sanitizarBancoExistente(banco, idExame) {
    const limpo = [];
    let removidas = 0;

    banco.forEach(q => {
        // Se a questão for válida e não for duplicada dentro do próprio arquivo...
        if (validarEstrutura(q) && validarQualidade(q) && !isDuplicate(q, limpo)) {
            limpo.push(q);
        } else {
            removidas++;
        }
    });

    if (removidas > 0) {
        console.log(`   [ZELADOR] ${idExame.toUpperCase()}: Removidas ${removidas} questões antigas que estavam duplicadas ou inválidas.`);
    }
    return limpo;
}

// ============================================================================
// MOTOR DE GERAÇÃO
// ============================================================================

async function iniciarAutomacao() {
    console.log("\n🚀 [MOTOR DE IA] Iniciando abastecimento resiliente...");
    
    for (const exame of EXAMES) {
        console.log(`\n📂 EXAME: ${exame.nome.toUpperCase()}`);
        const caminho = path.join(__dirname, '../data', `${exame.id}.json`);
        const dirData = path.join(__dirname, '../data');
        if (!fs.existsSync(dirData)) fs.mkdirSync(dirData, { recursive: true });

        // 1. CARREGA E LIMPA O QUE JÁ EXISTE (O CUIDADO)
        let bancoOriginal = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho, 'utf-8')) : [];
        let banco = sanitizarBancoExistente(bancoOriginal, exame.id);
        
        // Salva a versão limpa imediatamente
        fs.writeFileSync(caminho, JSON.stringify(banco, null, 2));

        for (const nivel of DIFICULDADES) {
            let atuais = banco.filter(q => q.difficulty === nivel).length;
            
            while (atuais < META_POR_NIVEL) {
                const faltam = META_POR_NIVEL - atuais;
                const lote = Math.min(10, faltam);

                console.log(`   [${nivel.toUpperCase()}] Status: ${atuais}/${META_POR_NIVEL} | Gerando +${lote}...`);
                
                let sucesso = false;
                let tentativas = 0;

                while (!sucesso && tentativas < TENTATIVAS_MAXIMAS) {
                    const loteIA = await pedirIA(exame, nivel, lote);
                    
                    if (loteIA && Array.isArray(loteIA)) {
                        const validas = loteIA.filter(q => {
                            return validarEstrutura(q) && validarQualidade(q) && !isDuplicate(q, banco);
                        });

                        if (validas.length > 0) {
                            let ultimoId = banco.length > 0 ? Math.max(...banco.map(q => q.id)) : 1000;
                            validas.forEach(q => { q.id = ++ultimoId; banco.push(q); });
                            
                            fs.writeFileSync(caminho, JSON.stringify(banco, null, 2));
                            atuais = banco.filter(q => q.difficulty === nivel).length;
                            sucesso = true;
                            console.log(`      ✅ Sucesso! +${validas.length} questões salvas.`);
                        } else {
                            console.warn("      🟠 Lote descartado (duplicado ou inválido). Tentando novamente...");
                            tentativas++;
                        }
                    } else {
                        tentativas++;
                        await sleep(10000 * tentativas);
                    }
                }
                if (!sucesso) break;
                await sleep(ESPERA_ENTRE_BLOCOS);
            }
        }
    }
    console.log("\n🏆 [FINALIZADO] Banco de dados sanitizado e atualizado!");
}

async function pedirIA(exame, nivel, quantidade) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", 
            generationConfig: { responseMimeType: "application/json" } 
        });

        const prompt = `Atue como Arquiteto AWS Sênior... (seu prompt atual)`;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());

    } catch (e) {
        // Se o erro for 429 (Quota Excedida)
        if (e.message.includes("429") || e.message.includes("quota")) {
            console.error(`      🚫 Quota atingida. A aguardar 60 segundos para resetar o limite...`);
            await sleep(60000); // Espera 1 minuto inteiro antes de deixar o motor tentar de novo
            return null; // Retorna null para o loop tentar a próxima "tentativa"
        }
        
        console.error(`      ❌ Erro na IA: ${e.message}`);
        return null;
    }
}