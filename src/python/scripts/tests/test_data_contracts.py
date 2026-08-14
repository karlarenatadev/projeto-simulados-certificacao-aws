import json
import sys
import types
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SCRIPTS_DIR.parents[2]
sys.path.insert(0, str(SCRIPTS_DIR))

import analyzer
import auto_generate_questions
import quick_generate
import pipeline_runner
import sanity_check
import translate_aws_questions
import translate_with_api
from merge_contributions import ContributionMerger
from duplicate_detector import remove_duplicates


CERTIFICATIONS = ("clf-c02", "saa-c03", "dva-c02", "aif-c01")


@pytest.mark.parametrize("certification", CERTIFICATIONS)
@pytest.mark.parametrize("language_suffix", ("", "-en"))
def test_official_question_paths_and_files(certification, language_suffix):
    path = PROJECT_ROOT / "data" / "questions" / f"{certification}{language_suffix}.json"
    assert path.is_file()
    assert path.parent.name == "questions"


def test_scripts_use_questions_directory():
    assert analyzer.PASTA_DATA == PROJECT_ROOT / "data" / "questions"
    assert auto_generate_questions.DATA_DIR == PROJECT_ROOT / "data" / "questions"
    assert quick_generate.DATA_DIR == PROJECT_ROOT / "data" / "questions"
    assert translate_aws_questions.DATA_DIR == PROJECT_ROOT / "data" / "questions"
    assert translate_with_api.DATA_DIR == PROJECT_ROOT / "data" / "questions"


def test_real_question_bank_passes_sanity_check():
    assert sanity_check.validar_banco_existente() is True


@pytest.mark.parametrize(
    "content, expected_fragment",
    [
        ("{invalid", "invalid JSON"),
        ("", "invalid JSON"),
        ("[]", "must not be empty"),
        ("{}", "must be a list"),
        (json.dumps([{"question": "incompleta"}]), "missing fields"),
    ],
)
def test_sanity_check_reports_invalid_fixture(content, expected_fragment):
    errors = sanity_check.validate_json_content(content)

    assert errors
    assert any(expected_fragment in error for error in errors)


def test_analyzer_reads_official_file_without_writing(capsys):
    fixture = PROJECT_ROOT / "data" / "questions" / "clf-c02.json"
    before = fixture.read_bytes()

    assert analyzer.gerar_relatorio(fixture) == 394
    assert "Total de Quest" in capsys.readouterr().out
    assert fixture.read_bytes() == before


def test_duplicate_detector_isolated_by_question_text():
    existing = [{"question": "Qual serviço armazena objetos?"}]
    new_questions = [
        {"question": "Qual serviço armazena objetos?"},
        {"question": "Como funciona o Amazon VPC?"},
    ]

    unique = remove_duplicates(new_questions, existing.copy())

    assert [item["question"] for item in unique] == ["Como funciona o Amazon VPC?"]


def test_quick_generator_dry_run_does_not_write(monkeypatch):
    monkeypatch.setattr(quick_generate, "DATA_DIR", PROJECT_ROOT / "data" / "questions")
    monkeypatch.setattr(
        quick_generate,
        "fabricar_questoes",
        lambda *_args: [{"question": "Q", "difficulty": "easy"}],
    )
    fixture = PROJECT_ROOT / "data" / "questions" / "clf-c02.json"
    before = fixture.read_bytes()

    assert quick_generate.quick_generate("clf-c02", "easy", 1, dry_run=True) is True
    assert fixture.read_bytes() == before
    assert not (PROJECT_ROOT / "data" / "backups").exists()


def test_pipeline_dry_run_does_not_write(monkeypatch):
    fixture = PROJECT_ROOT / "data" / "questions" / "clf-c02.json"
    before = fixture.read_bytes()
    generated = [{"questionId": "fixture-1", "certId": "clf-c02", "question": "Q"}]
    monkeypatch.setattr(pipeline_runner, "fabricar_questoes", lambda *_args: generated)
    monkeypatch.setattr(pipeline_runner, "filter_valid_schema", lambda questions: questions)
    monkeypatch.setattr(pipeline_runner, "validate_semantics", lambda questions, _cert: questions)
    monkeypatch.setattr(pipeline_runner, "remove_duplicates", lambda questions, _existing: questions)

    pipeline_runner.executar_pipeline_etl("clf-c02", "medium", 1, dry_run=True)

    assert fixture.read_bytes() == before


def test_translation_models_preserve_certification_and_language_pair():
    question = {
        "questionId": "clf-c02-fixture-1",
        "certId": "clf-c02",
        "question": "Uma pergunta AWS",
        "options": ["Amazon S3", "Amazon EC2"],
        "correct": 0,
    }

    translated = translate_aws_questions.translate_question_obj(question)

    assert translated["certId"] == "clf-c02"
    assert translated["questionId"] == question["questionId"]
    assert translated["correct"] == question["correct"]


def test_merge_rejects_other_certification_without_writing(monkeypatch):
    class AlwaysValid:
        def __init__(self, _path):
            pass

        def validate(self):
            return True

    monkeypatch.setitem(
        sys.modules,
        "validate_contribution",
        types.SimpleNamespace(ContributionValidator=AlwaysValid),
    )
    merger = ContributionMerger("clf-c02", dry_run=True)
    main_questions = []

    merger._merge_single_contribution(
        Path("saa-contribution.json"),
        {
            "certId": "saa-c03",
            "language": "pt",
            "question": "Pergunta de outra certificação",
        },
        main_questions,
    )

    assert main_questions == []
    assert merger.merged_count == 0
    assert merger.skipped_count == 1
