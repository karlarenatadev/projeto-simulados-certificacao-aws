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

def validate_question_record(item: object) -> list[str]:
    """Retorna erros estruturais sem modificar o registro recebido."""
    if not isinstance(item, dict):
        return ["question item must be an object"]

    required_fields = {
        "questionId", "certId", "examCode", "question", "options",
        "correct", "domain", "difficulty",
    }
    missing_fields = sorted(required_fields - item.keys())
    if missing_fields:
        return [f"missing fields: {', '.join(missing_fields)}"]

    try:
        SanitizedAWSQuestion(**item)
    except ValidationError as error:
        return [entry["msg"] for entry in error.errors()]
    return []


def validate_json_content(content: str) -> list[str]:
    """Valida JSON, formato de lista e todos os registros de um conteúdo."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as error:
        return [f"invalid JSON: {error.msg}"]

    if not isinstance(data, list):
        return ["root value must be a list of questions"]
    if not data:
        return ["question list must not be empty"]

    errors = []
    for index, item in enumerate(data):
        errors.extend(f"index {index}: {message}" for message in validate_question_record(item))
    return errors


def validate_json_file(filepath: Path) -> list[str]:
    """Valida JSON, formato de lista e todos os registros de um arquivo."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except OSError as error:
        return [f"cannot read file: {error}"]
    return validate_json_content(content)


def validar_banco_existente(data_dir: Path = PASTA_DATA):
    """Auditoria manual dos JSONs salvos na pasta data/questions/ da raiz do projeto."""
    if not data_dir.exists():
        print(f"Erro: pasta de dados obrigatoria nao encontrada: {data_dir}")
        return False

    if not data_dir.is_dir():
        print(f"Erro: o caminho de dados existe, mas nao e uma pasta: {data_dir}")
        return False

    arquivos_json = sorted(data_dir.glob("*.json"))
    if not arquivos_json:
        print(f"Erro: nenhum arquivo JSON encontrado em: {data_dir}")
        return False

    banco_valido = True
    for caminho in arquivos_json:
        print(f"\nAuditando {caminho.name}...")
        errors = validate_json_file(caminho)

        if not errors:
            print(f"  OK: {caminho.name} esta valido.")
        else:
            banco_valido = False
            print(f"  Aviso: {caminho.name} contem {len(errors)} erros estruturais.")
            for error in errors[:10]:
                print(f"    - {error}")

    return banco_valido


if __name__ == "__main__":
    sys.exit(0 if validar_banco_existente() else 1)
