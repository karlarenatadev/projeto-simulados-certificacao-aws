require('dotenv').config(); // Carrega as variáveis de segurança do ficheiro .env
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// 1. A CHAVE AGORA VEM DO FICHEIRO .ENV DE FORMA SEGURA
const API_KEY = process.env.GEMINI_API_KEY; 

// Validação de segurança: Impede o script de rodar se esquecer de configurar o .env
if (!API_KEY) {
    console.error("❌ ERRO: Chave API não encontrada! Certifique-se de que criou o ficheiro .env com a variável GEMINI_API_KEY.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// 2. CONFIGURAÇÕES DO ALVO (Altere conforme o exame que quer gerar)
const NOME_DO_FICHEIRO = "clf-c02.json";
const EXAME_ALVO = "AWS Certified Cloud Practitioner (CLF-C02)";
const DOMINIOS_VALIDOS = ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"];
const QUANTIDADE = 10; // Quantas questões gerar por execução

async function gerarQuestoes() {
    // Usamos o modelo Flash, que é super rápido e ótimo para JSON
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Atue como um Arquiteto de Soluções AWS elaborando questões de exame.
    Gere ${QUANTIDADE} questões técnicas inéditas de múltipla escolha para o exame ${EXAME_ALVO}.
    
    Regras estritas:
    1. Retorne APENAS um array JSON válido.
    2. Os níveis de 'difficulty' permitidos são apenas: "easy", "medium" ou "hard".
    3. Os valores de 'domain' permitidos são apenas: ${JSON.stringify(DOMINIOS_VALIDOS)}.
    4. O campo 'correct' deve ser um número inteiro de 0 a 3, indicando o índice da resposta correta no array 'options'.
    
    Estrutura JSON obrigatória para cada objeto no array:
    {
      "id": 0,
      "domain": "string",
      "difficulty": "string",
      "question": "texto da pergunta",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Explicação técnica detalhada do porquê a resposta está correta"
    }`;

    try {
        console.log(`🤖 A pedir à IA para gerar ${QUANTIDADE} questões... Aguarde.`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Converte o texto da IA para um Array JavaScript
        const novasQuestoes = JSON.parse(responseText);

        // 3. LER O BANCO DE DADOS ATUAL
        const caminhoFicheiro = path.join(__dirname, 'data', NOME_DO_FICHEIRO);
        let bancoDeDados = [];
        
        if (fs.existsSync(caminhoFicheiro)) {
            const ficheiroAtual = fs.readFileSync(caminhoFicheiro, 'utf-8');
            bancoDeDados = JSON.parse(ficheiroAtual);
        }

        // 4. ATUALIZAR IDs PARA NÃO HAVER CONFLITOS
        let ultimoId = bancoDeDados.length > 0 ? Math.max(...bancoDeDados.map(q => q.id)) : 1000;
        
        novasQuestoes.forEach(q => {
            ultimoId++;
            q.id = ultimoId;
        });

        // 5. JUNTAR E GUARDAR O FICHEIRO
        const bancoAtualizado = [...bancoDeDados, ...novasQuestoes];
        fs.writeFileSync(caminhoFicheiro, JSON.stringify(bancoAtualizado, null, 2));
        
        console.log(`✅ Sucesso! ${novasQuestoes.length} novas questões foram adicionadas ao ficheiro ${NOME_DO_FICHEIRO}.`);
        console.log(`📊 O seu banco de dados agora tem um total de ${bancoAtualizado.length} questões.`);

    } catch (error) {
        console.error("❌ Ocorreu um erro ao gerar as questões:", error);
    }
}

// Executa a função
gerarQuestoes();