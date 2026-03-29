import os
import json
import time
from google import genai
from google.genai import types 
from pydantic import BaseModel, Field, field_validator
from typing import List
from dotenv import load_dotenv

# Tenta importar o Groq (Plano B)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️ Biblioteca 'groq' não instalada. Fallback desativado. Instale com: pip install groq")

# 1. CONFIGURAÇÕES DE AMBIENTE
load_dotenv()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cliente Gemini (Principal)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Cliente Groq (Plano B)
if GROQ_AVAILABLE and os.getenv("GROQ_API_KEY"):
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
else:
    groq_client = None

# 2. CONFIGURAÇÃO DE EXAMES E DOMÍNIOS
EXAMES_CONFIG = {
    "clf-c02": ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"],
    "saa-c03": ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"],
    "aif-c01": ["fundamentals-ai-ml", "fundamentals-genai", "applications-foundation-models", "guidelines-responsible-ai", "security-compliance-governance"],
    "dva-c02": ["desenvolvimento-servicos", "implementacao", "seguranca-app", "resolucao-problemas"]
}

# 2.1 VALIDAÇÃO DE PORTUGUÊS BRASILEIRO
TERMOS_PROIBIDOS_PT = [
    "guardrails", "output", "outputs", "word filters", "content filters",
    "PII filters", "ecrã", "telemóvel", "gerir", "guardar",
    "políticas de conteúdo", "filtros de tópicos sensíveis", "validação de output"
]

TRADUCOES_AWS = {
    "guardrails": "barreiras de proteção",
    "output": "saída",
    "outputs": "saídas",
    "word filters": "filtros de palavras",
    "content filters": "filtros de conteúdo",
    "PII filters": "filtros de informações pessoais",
    "content policies": "políticas de conteúdo",
    "sensitive information filters": "filtros de informações sensíveis",
    "topic filters": "filtros de tópicos"
}

def validar_portugues_brasileiro(questao_dict):
    texto_completo = f"{questao_dict.get('question', '')} {' '.join(questao_dict.get('options', []))} {questao_dict.get('explanation', '')}"
    texto_lower = texto_completo.lower()
    
    for termo in TERMOS_PROIBIDOS_PT:
        if termo.lower() in texto_lower:
            sugestao = TRADUCOES_AWS.get(termo, "termo brasileiro equivalente")
            return False, f"Termo proibido encontrado: '{termo}'. Use: '{sugestao}'"
    
    return True, "OK"

# 3. SCHEMA DE VALIDAÇÃO (Pydantic V2)
class AWSQuestion(BaseModel):
    domain: str
    subdomain: str
    service: str
    difficulty: str
    type: str = "scenario"
    tags: List[str]
    question: str = Field(..., min_length=10)
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct: int | List[int] = Field(...)  # Suporta múltipla escolha (int) e múltipla resposta (List[int])
    explanation: str = Field(..., min_length=30)

    @field_validator('correct')
    @classmethod
    def validar_correct(cls, v, info):
        question_type = info.data.get('type', 'multiple-choice')
        
        # Para múltipla escolha, deve ser int
        if question_type == 'multiple-choice':
            if isinstance(v, list):
                raise ValueError("Para type='multiple-choice', 'correct' deve ser um inteiro (índice da resposta)")
            if not isinstance(v, int) or v < 0 or v > 3:
                raise ValueError("'correct' deve ser um inteiro entre 0 e 3")
        
        # Para múltipla resposta, deve ser lista
        elif question_type == 'multiple-answer':
            if not isinstance(v, list):
                raise ValueError("Para type='multiple-answer', 'correct' deve ser uma lista de índices")
            if not all(isinstance(idx, int) and 0 <= idx <= 3 for idx in v):
                raise ValueError("Todos os índices em 'correct' devem ser inteiros entre 0 e 3")
            if len(v) < 2:
                raise ValueError("'multiple-answer' deve ter pelo menos 2 respostas corretas")
        
        return v

    @field_validator('domain')
    @classmethod
    def validar_dominio(cls, v):
        todos_validos = [d for lista in EXAMES_CONFIG.values() for d in lista]
        v_norm = v.lower().strip()
        if v_norm not in todos_validos:
            raise ValueError(f"Domínio '{v}' não reconhecido pelo sistema.")
        return v_norm

# 4. MOTOR DE GERAÇÃO RESILIENTE (Com Fallback para Groq)
def fabricar_questoes(exame_id, nivel, qtd=3, retries=0):
    if exame_id not in EXAMES_CONFIG:
        print(f"❌ Erro: Certificação {exame_id} não configurada.")
        return

    print(f"\n🚀 [IA] A fabricar {qtd} questões ({nivel}) para {exame_id.upper()}...")
    
    dominios = EXAMES_CONFIG[exame_id]

    prompt = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇧🇷 IDIOMA OBRIGATÓRIO: PORTUGUÊS BRASILEIRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRA CRÍTICA: Use EXCLUSIVAMENTE português brasileiro em TODAS as questões, opções e explicações.

❌ TERMOS PROIBIDOS (Português de Portugal ou Anglicismos):
- "guardrails" → Use: "barreiras de proteção" ou "proteções"
- "output/outputs" → Use: "saída/saídas"
- "word filters" → Use: "filtros de palavras"
- "content filters" → Use: "filtros de conteúdo"
- "PII filters" → Use: "filtros de informações pessoais"
- "ecrã" → Use: "tela"
- "telemóvel" → Use: "celular"
- "gerir" → Use: "gerenciar"
- "guardar" → Use: "salvar" ou "armazenar"

✅ TRADUÇÕES CORRETAS DE TERMOS AWS:
- Amazon Bedrock Guardrails → Amazon Bedrock Barreiras de Proteção
- Model output → Saída do modelo
- Content policy → Política de conteúdo
- PII detection → Detecção de informações pessoais

Você é um Arquiteto AWS Sênior e criador oficial de exames da AWS. 
Sua missão é gerar exatamente {qtd} questões INÉDITAS para a certificação {exame_id}.

Nível de Dificuldade: {nivel}.
Domínios permitidos: {dominios}.

⚠️⚠️⚠️ REGRAS CRÍTICAS DE QUALIDADE E ESTRUTURA ⚠️⚠️⚠️

1. NARRATIVA FLUÍDA (ZERO RÓTULOS): NUNCA use palavras engessadas como "Contexto:", "Requisito:", "Cenário:" ou "Problema:" no texto da questão. Apresente um caso de uso corporativo real em um ou dois parágrafos contínuos e bem escritos.
2. TAG DE SERVIÇO PRECISA: No JSON, o campo "service" DEVE ser preenchido com o nome EXATO do serviço AWS primário sendo testado (ex: "Amazon S3", "Amazon EC2", "AWS Lambda", "Amazon VPC"). NUNCA preencha este campo apenas com a palavra "AWS".
3. DISTRATORES DE ALTO NÍVEL (PEGADINHAS): As alternativas incorretas NÃO podem ser respostas óbvias. Elas devem obrigatoriamente citar outros serviços reais da AWS que atuam na mesma área, mas que falham em atender a um requisito específico da narrativa.
4. CALIBRAGEM DA DIFICULDADE ({nivel}):
   - Se for 'easy': O cenário é mais direto e foca na funcionalidade principal do serviço.
   - Se for 'medium': A arquitetura envolve dois ou mais serviços interagindo.
   - Se for 'hard': Adicione restrições de arquitetura rigorosas (ex: menor custo absoluto, menor esforço operacional, alta disponibilidade multirregião).
"""

    novas_questoes_raw = []
    ia_usada = "Gemini"

    try:
        # TENTATIVA 1: GEMINI (Principal)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[AWSQuestion], 
                temperature=0.7 
            )
        )
        novas_questoes_raw = json.loads(response.text)

    except Exception as e:
        is_quota_error = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower()
        
        if is_quota_error and groq_client:
            # TENTATIVA 2: GROQ (Fallback / Plano B)
            print(f"⏳ [QUOTA] Limite do Gemini atingido! A acionar o Plano B (Groq)...")
            ia_usada = "Groq"
            
            # O Groq exige uma instrução extra no prompt para devolver o JSON no formato exato
            groq_prompt = prompt + """
            
            ⚠️ IMPORTANTE - FORMATO DE SAÍDA:
            Retorne EXATAMENTE um objeto JSON com a chave "questions" contendo a lista de questões. 
            Exemplo de formato:
            {
              "questions": [
                {
                  "domain": "...", "subdomain": "...", "service": "...", "difficulty": "...", "type": "scenario",
                  "tags": ["..."], "question": "...", "options": ["...", "...", "...", "..."], "correct": 0, "explanation": "..."
                }
              ]
            }
            """
            
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": "Você é um arquiteto AWS sênior e especialista em formatar respostas em JSON puro."},
                        {"role": "user", "content": groq_prompt}
                    ],
                    model="llama-3.3-70b-versatile", # Modelo inteligente e rápido do Groq
                    temperature=0.7,
                    response_format={"type": "json_object"}
                )
                
                raw_json = chat_completion.choices[0].message.content
                dados_groq = json.loads(raw_json)
                novas_questoes_raw = dados_groq.get("questions", [])
                
            except Exception as e_groq:
                print(f"❌ Erro crítico no Groq: {e_groq}")
                return None
                
        elif is_quota_error and not groq_client:
            # Se não tiver Groq, faz a espera clássica
            if retries < 3:
                tempo_espera = 30 + (retries * 10)
                print(f"⏳ [QUOTA] Limite atingido. Sem Groq configurado. A aguardar {tempo_espera}s (Tentativa {retries + 1}/3)...")
                time.sleep(tempo_espera)
                return fabricar_questoes(exame_id, nivel, qtd, retries + 1)
            else:
                print("❌ Limite de tentativas excedido.")
                return None
        else:
            print(f"❌ Erro crítico no Gemini: {e}")
            return None

    # VALIDAÇÃO COMUM (Roda independentemente de quem gerou: Gemini ou Groq)
    if not novas_questoes_raw:
        return None

    questoes_validas = []
    questoes_rejeitadas = 0
    
    for questao in novas_questoes_raw:
        # Garante que o nível de dificuldade seja respeitado pelo Groq
        questao["difficulty"] = nivel 
        
        valido, mensagem = validar_portugues_brasileiro(questao)
        if valido:
            questoes_validas.append(questao)
        else:
            questoes_rejeitadas += 1
            print(f"  ⚠️  Questão rejeitada (ID {questao.get('id', '?')}): {mensagem}")
    
    if questoes_rejeitadas > 0 or len(questoes_validas) > 0:
        print(f"  📊 Validação ({ia_usada}): {len(questoes_validas)} aceitas, {questoes_rejeitadas} rejeitadas")
        
    print("⏳ Pausa de segurança (5s) para as APIs respirarem...")
    time.sleep(5)
    
    return questoes_validas if questoes_validas else None

# 5. EXECUÇÃO DE EXEMPLO
if __name__ == "__main__":
    resultado = fabricar_questoes("clf-c02", "hard", 5) 
    print(resultado)