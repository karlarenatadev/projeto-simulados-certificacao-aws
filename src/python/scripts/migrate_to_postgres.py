"""
Migração de questões JSON para PostgreSQL.

Lê os arquivos JSON do diretório data/ e insere no banco PostgreSQL
usando o schema existente. Evita duplicatas via checagem de question_text.
"""

import json
import logging
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

try:
    from tqdm import tqdm
except ImportError:
    tqdm = None

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("migration_errors.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Caminhos
ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data" / "questions"
load_dotenv(ROOT_DIR / ".env")

# Mapeamento: (arquivo, certification_enum, language)
# Apenas PT pois o schema não tem coluna de idioma — EN pode ser adicionado depois
JSON_FILES = [
    ("clf-c02.json", "CLF-C02"),
    ("saa-c03.json", "SAA-C03"),
    ("dva-c02.json", "DVA-C02"),
    ("aif-c01.json", "AIF-C01"),
]

# Mapeamento de domain JSON → slug para lookup na tabela domains
DOMAIN_SLUG_MAP = {
    "conceitos-de-cloud": "conceitos-cloud",
    "conceitos-cloud": "conceitos-cloud",
    "seguranca": "seguranca",
    "tecnologia": "tecnologia",
    "faturamento": "faturamento",
    "rede": "rede",
    "operacoes": "operacoes",
    "automacao": "automacao",
    "arquitetura": "arquitetura",
    "inteligencia-artificial": "inteligencia-artificial",
}


def get_connection():
    """Cria conexão com PostgreSQL usando variáveis de ambiente."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "aws_simulator"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )


def load_json_file(filepath: Path) -> list:
    """Carrega e retorna lista de questões de um arquivo JSON."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_domains(cur) -> dict:
    """Carrega mapeamento (certification, slug) → domain_id."""
    cur.execute("SELECT id, certification::text, slug FROM domains")
    return {
        (row[1], row[2]): row[0] for row in cur.fetchall()
    }


def normalize_domain_slug(domain_name: str) -> str:
    """Converte nome de domínio do JSON para slug compatível com a tabela domains."""
    slug = domain_name.lower().replace(" ", "-")
    return DOMAIN_SLUG_MAP.get(slug, slug)


def prepare_row(q: dict, certification: str, domain_id, existing_texts: set) -> tuple | None:
    """Converte uma questão JSON em tupla para inserção. Retorna None se duplicada."""
    text = q["question"]
    if text in existing_texts:
        return None

    # correct_answer como JSONB
    correct = q["correct"] if isinstance(q["correct"], list) else [q["correct"]]

    # options como JSONB array de objetos com texto
    options = json.dumps(q["options"])
    correct_answer = json.dumps(correct)

    tags = q.get("tags", [])
    # tags é TEXT[] no schema
    explanation = q.get("explanation", "")
    reference_url = q.get("reference")

    return (
        certification,
        q["domain"],
        domain_id,
        q["difficulty"],
        text,
        options,
        correct_answer,
        explanation,
        reference_url,
        tags,
    )


def migrate():
    """Executa a migração completa."""
    logger.info("Iniciando migração JSON → PostgreSQL")

    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor()

    # Carregar domínios existentes
    domains_map = load_domains(cur)
    logger.info(f"Domínios carregados: {len(domains_map)}")

    # Carregar textos existentes para evitar duplicatas
    cur.execute("SELECT question_text FROM questions")
    existing_texts = {row[0] for row in cur.fetchall()}
    logger.info(f"Questões já no banco: {len(existing_texts)}")

    total_inserted = 0
    total_skipped = 0
    total_errors = 0

    files_iter = JSON_FILES
    if tqdm:
        files_iter = tqdm(JSON_FILES, desc="Migrando arquivos", unit="arquivo")

    for filename, certification in files_iter:
        filepath = DATA_DIR / filename
        if not filepath.exists():
            logger.warning(f"Arquivo não encontrado: {filepath}")
            continue

        questions = load_json_file(filepath)
        logger.info(f"Processando {filename}: {len(questions)} questões")

        rows = []
        for q in questions:
            try:
                slug = normalize_domain_slug(q["domain"])
                domain_id = domains_map.get((certification, slug))

                row = prepare_row(q, certification, domain_id, existing_texts)
                if row is None:
                    total_skipped += 1
                    continue
                rows.append(row)
                # Adicionar ao set para evitar duplicatas dentro do mesmo batch
                existing_texts.add(q["question"])
            except (KeyError, TypeError) as e:
                logger.error(f"Erro ao processar questão em {filename}: {e}")
                total_errors += 1

        if not rows:
            logger.info(f"  → {filename}: nenhuma questão nova para inserir")
            continue

        insert_sql = """
            INSERT INTO questions (
                certification, domain, domain_id, difficulty,
                question_text, options, correct_answer,
                explanation, reference_url, tags
            ) VALUES %s
        """

        try:
            execute_values(
                cur,
                insert_sql,
                rows,
                template="(%s::certification_type, %s, %s, %s::difficulty_level, %s, %s::jsonb, %s::jsonb, %s, %s, %s::text[])",
                page_size=100,
            )
            conn.commit()
            total_inserted += len(rows)
            logger.info(
                f"  ✓ {filename}: {len(rows)} inseridas, {total_skipped} duplicadas ignoradas"
            )
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao inserir batch de {filename}: {e}")
            total_errors += len(rows)

    # Validação final
    cur.execute("SELECT COUNT(*) FROM questions")
    final_count = cur.fetchone()[0]
    cur.close()
    conn.close()

    logger.info("=" * 50)
    logger.info("MIGRAÇÃO CONCLUÍDA")
    logger.info(f"  Inseridas: {total_inserted}")
    logger.info(f"  Duplicadas ignoradas: {total_skipped}")
    logger.info(f"  Erros: {total_errors}")
    logger.info(f"  Total no banco: {final_count}")
    logger.info("=" * 50)

    if total_errors > 0:
        logger.warning("Verifique migration_errors.log para detalhes dos erros")
        sys.exit(1)


if __name__ == "__main__":
    migrate()
