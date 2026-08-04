import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError

# Carrega .env antes de importar generator para uso local.
load_dotenv()

from pydantic import BaseModel, ValidationError, Field
from typing import List, Optional

BASE_DIR = Path(__file__).resolve().parents[3]
PASTA_DATA = BASE_DIR / "data" / "questions"

class SanitizedAWSQuestion(BaseModel):
    questionId: str
    certId: str
    examCode: str
    version: str
    domain: str
    difficulty: str
    services: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    question: str
    options: List[str]
    correct: int | List[int]
    explanation: str
    reference_url: Optional[str] = None
    validation: Optional[dict] = None

def filter_valid_schema(raw_questions: list) -> list:
    """Filtra questoes cruas da IA e mantem apenas as que respeitam o schema."""
    valid_questions = []
    for item in raw_questions:
        try:
            if not isinstance(item, dict) or "question" not in item or "options" not in item:
                continue
            q_validada = SanitizedAWSQuestion(**item).model_dump()
            valid_questions.append(q_validada)
        except ValidationError as e:
            print(
                "  Schema Error: questao descartada por nao respeitar o formato. "
                f"Detalhes: {e.errors()[0]['msg']}"
            )
    return valid_questions

def validar_banco_existente():
    """Auditoria manual dos JSONs salvos na pasta data/questions/ da raiz do projeto."""
    if not PASTA_DATA.exists():
        print(f"Erro: pasta de dados obrigatoria nao encontrada: {PASTA_DATA}")
        return False

    if not PASTA_DATA.is_dir():
        print(f"Erro: o caminho de dados existe, mas nao e uma pasta: {PASTA_DATA}")
        return False

    arquivos_json = sorted(PASTA_DATA.glob("*.json"))
    if not arquivos_json:
        print(f"Erro: nenhum arquivo JSON encontrado em: {PASTA_DATA}")
        return False

    for caminho in arquivos_json:
        print(f"\nAuditando {caminho.name}...")
        with open(caminho, "r", encoding="utf-8") as f:
            dados = json.load(f)

        erros = 0
        for item in dados:
            if not isinstance(item, dict) or "question" not in item or "options" not in item:
                print(f"  Erro no ID {item.get('questionId', 'N/A')}: Estrutura invalida")
                erros += 1
                continue
            try:
                SanitizedAWSQuestion(**item)
            except Exception as e:
                print(f"  Erro no ID {item.get('id', 'N/A')}: {e}")
                erros += 1

        if erros == 0:
            print(f"  OK: {caminho.name} esta valido.")
        else:
            print(f"  Aviso: {caminho.name} contem {erros} erros estruturais.")

    return True


if __name__ == "__main__":
    sys.exit(0 if validar_banco_existente() else 1)
