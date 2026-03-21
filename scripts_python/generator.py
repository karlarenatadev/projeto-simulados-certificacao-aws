import os
import json
import time
from google import genai
from pydantic import BaseModel, Field, field_validator
from typing import List
from dotenv import load_dotenv

# 1. CONFIGURAÇÕES DE AMBIENTE
load_dotenv()
# BASE_DIR localiza a raiz do projeto para garantir caminhos de ficheiros corretos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Inicializa o cliente Gemini com o SDK mais recente
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 2. CONFIGURAÇÃO DE EXAMES E DOMÍNIOS
EXAMES_CONFIG = {
    "clf-c02": ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"],
    "saa-c03": ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"],
    "aif-c01": ["conceitos-ia", "ia-generativa", "seguranca-ia", "implementacao-ia"],
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
    
    caminho_json = os.path.join(BASE_DIR, "data", f"{exame_id}.json")
    dominios = EXAMES_CONFIG[exame_id]

    prompt = f"""
    Atue como Arquiteto AWS Sênior. Gere {qtd} questões inéditas para o exame {exame_id}.
    Nível: {nivel}. Domínios permitidos: {dominios}.
    Retorne APENAS o JSON puro. 
    Campos: domain, subdomain, service, difficulty, type, tags, question, options, correct, explanation.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        # Limpeza de possíveis blocos de código markdown
        texto_json = response.text.replace('```json', '').replace('```', '').strip()
        novas_questoes_raw = json.loads(texto_json)

        # Garantir que o ficheiro existe e carregar dados
        if os.path.exists(caminho_json):
            with open(caminho_json, 'r', encoding='utf-8') as f:
                banco = json.load(f)
        else:
            banco = []

        validas_no_lote = 0
        ultimo_id = max([q['id'] for q in banco]) if banco else 1000

        for item in novas_questoes_raw:
            try:
                # Validação total via Pydantic
                q_validada = AWSQuestion(**item).model_dump()
                
                ultimo_id += 1
                q_validada['id'] = ultimo_id
                banco.append(q_validada)
                validas_no_lote += 1
            except Exception as ve:
                print(f"   ⚠️ Questão descartada por erro de validação: {ve}")

        # Guardar progresso
        with open(caminho_json, 'w', encoding='utf-8') as f:
            json.dump(banco, f, indent=2, ensure_ascii=False)

        print(f"✅ Sucesso! {validas_no_lote} questões novas injetadas em {exame_id}.json")

    except Exception as e:
        # Tratamento do Erro 429 (Resource Exhausted)
        if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and retries < 3:
            tempo_espera = 30 + (retries * 10)
            print(f"⏳ [QUOTA] Limite atingido. A aguardar {tempo_espera}s (Tentativa {retries + 1}/3)...")
            time.sleep(tempo_espera)
            return fabricar_questoes(exame_id, nivel, qtd, retries + 1)
        else:
            print(f"❌ Erro crítico: {e}")

# 5. EXECUÇÃO DE EXEMPLO
if __name__ == "__main__":
    fabricar_questoes("aif-c01", "hard", 10) # Completa o que falta
    fabricar_questoes("dva-c02", "easy", 10) # Começa a encorpar a DVA