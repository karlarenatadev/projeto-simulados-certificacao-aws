import json
from pathlib import Path
import pytest
from pydantic import ValidationError

import sys
# Add scripts directory to path to import sanity_check
sys.path.append(str(Path(__file__).resolve().parents[1]))
from sanity_check import SanitizedAWSQuestion

BASE_DIR = Path(__file__).resolve().parents[4]
QUESTIONS_DIR = BASE_DIR / "data" / "questions"


def get_question_files():
    if not QUESTIONS_DIR.exists():
        return []
    return sorted(QUESTIONS_DIR.glob("*.json"))


@pytest.mark.parametrize("filepath", get_question_files())
def test_questions_schema(filepath):
    """
    Testa se todos os objetos dentro dos arquivos JSON de perguntas
    respeitam estritamente o schema SanitizedAWSQuestion.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for index, item in enumerate(data):
        item_id = item.get("questionId", f"index-{index}")
        
        # Validacao estrutural basica
        assert isinstance(item, dict), f"Arquivo: {filepath.relative_to(BASE_DIR)}\nID: {item_id}\nErro: item não é um dicionario JSON"
        assert "question" in item, f"Arquivo: {filepath.relative_to(BASE_DIR)}\nID: {item_id}\nErro: campo 'question' ausente"
        assert "options" in item, f"Arquivo: {filepath.relative_to(BASE_DIR)}\nID: {item_id}\nErro: campo 'options' ausente"
        
        # Validacao forte do Pydantic
        try:
            SanitizedAWSQuestion(**item)
        except ValidationError as e:
            error_msg = e.errors()[0]['msg']
            field = e.errors()[0]['loc'][0] if e.errors()[0]['loc'] else 'desconhecido'
            pytest.fail(f"Arquivo: {filepath.relative_to(BASE_DIR)}\nID: {item_id}\nErro: campo {field} - {error_msg}")
