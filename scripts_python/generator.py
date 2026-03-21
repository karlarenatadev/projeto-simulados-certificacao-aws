import os
import json
import time
from google import genai
from google.genai import types # Importação necessária para o config
from pydantic import BaseModel, Field, field_validator
from typing import List
from dotenv import load_dotenv


# 1. CONFIGURAÇÕES DE AMBIENTE
load_dotenv()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 2. CONFIGURAÇÃO DE EXAMES E DOMÍNIOS
EXAMES_CONFIG = {
    "clf-c02": ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"],
    "saa-c03": ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"],
    "aif-c01": ["fundamentals-ai-ml", "fundamentals-genai", "applications-foundation-models", "guidelines-responsible-ai", "security-compliance-governance"],
    "dva-c02": ["desenvolvimento-servicos", "implementacao", "seguranca-app", "resolucao-problemas"]
}

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
    correct: int = Field(..., ge=0, le=3)
    explanation: str = Field(..., min_length=30)

    @field_validator('domain')
    @classmethod
    def validar_dominio(cls, v):
        todos_validos = [d for lista in EXAMES_CONFIG.values() for d in lista]
        v_norm = v.lower().strip()
        if v_norm not in todos_validos:
            raise ValueError(f"Domínio '{v}' não reconhecido pelo sistema.")
        return v_norm

# 4. MOTOR DE GERAÇÃO RESILIENTE
def fabricar_questoes(exame_id, nivel, qtd=3, retries=0):
    if exame_id not in EXAMES_CONFIG:
        print(f"❌ Erro: Certificação {exame_id} não configurada.")
        return

    print(f"\n🚀 [IA] A fabricar {qtd} questões ({nivel}) para {exame_id.upper()}...")
    
    dominios = EXAMES_CONFIG[exame_id]

# PROMPT ENRIQUECIDO COM FOCO EM CENÁRIOS E RESPOSTAS CURTAS
    prompt = f"""
    Você é um Arquiteto AWS Sênior e criador oficial de exames da AWS. 
    Sua missão é gerar exatamente {qtd} questões INÉDITAS para a certificação {exame_id}.
    
    Nível de Dificuldade: {nivel}.
    Domínios permitidos: {dominios}.

    ⚠️⚠️⚠️ REGRA CRÍTICA - FORMATO DE CASO DE USO ⚠️⚠️⚠️
    
    NUNCA faça perguntas diretas de definição. TODAS as questões devem obrigatoriamente apresentar um caso de uso ou problema de negócio arquitetural.
    
    ❌ EXEMPLOS INVÁLIDOS (NUNCA FAÇA ISSO):
    - "O que é o Amazon S3?"
    - "Qual é a definição de AWS Lambda?"
    - "Como funciona o Amazon EC2?"
    - "Qual a diferença entre EBS e EFS?"
    
    ✅ EXEMPLOS VÁLIDOS (SEMPRE FAÇA ASSIM):
    - "Uma empresa de streaming precisa armazenar 500TB de vídeos com acesso frequente e baixa latência. Qual serviço AWS é mais adequado?"
    - "Um sistema de e-commerce precisa processar pedidos de forma assíncrona sem gerenciar servidores. Qual solução AWS atende esse requisito?"
    - "Uma startup quer hospedar uma aplicação web com escalabilidade automática. Qual serviço AWS deve ser usado?"

    ESTRUTURA OBRIGATÓRIA:
    1. CONTEXTO (mínimo 80 caracteres): Descreva um cenário de negócio real com requisitos específicos
    2. REQUISITO: Especifique o que precisa ser resolvido
    3. PERGUNTA: "Qual serviço/solução AWS..." ou "Como a empresa deve..."
    4. OPÇÕES: Apenas nomes de serviços AWS (ex: "Amazon S3", "AWS Lambda")
    5. EXPLICAÇÃO: Por que a resposta correta atende ao cenário e por que as outras não

    REGRAS ADICIONAIS:
    1. Formato de Caso de Uso: Inicie sempre com um cenário de negócios prático (ex: "Uma empresa precisa..."). Nunca pergunte definições diretas.
    2. RESPOSTAS CURTAS (MUITO IMPORTANTE): As 4 alternativas na lista 'options' DEVEM conter APENAS o nome oficial do serviço AWS (ex: "Amazon S3", "AWS Lambda", "Amazon EC2"). NUNCA escreva frases, ações ou explicações dentro das opções.
    3. Distratores Plausíveis: As opções erradas devem ser serviços reais da AWS que um candidato poderia confundir no cenário.
    4. Explicação: A justificativa deve mencionar o nome do serviço correto e explicar por que ele atende ao cenário, além de explicar por que os distratores estão errados.
    """

    try:
        # Usando a API nova para forçar a saída em JSON estruturado com base numa lista de AWSQuestion
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[AWSQuestion], # Força a IA a devolver uma lista validada pelo Pydantic
                temperature=0.7 # Adiciona um pouco de criatividade aos cenários
            )
        )
        
        # Como passamos o response_schema, a saída já é um JSON string perfeito
        novas_questoes_raw = json.loads(response.text)

        # AGORA É SÓ ISSO! Sem abrir arquivo, sem salvar, sem validar aqui.
        # Apenas devolvemos as questões "cruas" para o pipeline tratar.
        return novas_questoes_raw

    except Exception as e:
        if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and retries < 3:
            tempo_espera = 30 + (retries * 10)
            print(f"⏳ [QUOTA] Limite atingido. A aguardar {tempo_espera}s (Tentativa {retries + 1}/3)...")
            time.sleep(tempo_espera)
            return fabricar_questoes(exame_id, nivel, qtd, retries + 1)
        else:
            print(f"❌ Erro crítico: {e}")
            return None

# 5. EXECUÇÃO DE EXEMPLO (Pode remover isso depois, pois agora rodaremos pelo pipeline_runner.py)
if __name__ == "__main__":
    resultado = fabricar_questoes("clf-c02", "hard", 2) 
    print(resultado)