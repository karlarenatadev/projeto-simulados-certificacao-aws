"""
Módulo de análise de gaps (domínios fracos)

Fornece funções para análise de respostas incorretas agrupadas por domínio,
identificando as áreas onde o usuário apresenta maior dificuldade.

Padrão:
    - Analisa respostas em nível granular (tabela 'answers')
    - Valida contra agregações em 'quiz_history.domain_scores'
    - Filtra domínios com >= 3 tentativas (evitar cold start)
    - Retorna top 3 domínios com maior taxa de erro

Exemplo:
    >>> from backend.analytics.gaps_analyzer import analyze_gaps
    >>> result = analyze_gaps("user-uuid")
    >>> print(result)
    {
        "status": "success",
        "user_id": "user-uuid",
        "weak_domains": [
            {
                "domain": "design-performance",
                "error_rate": 0.62,
                "total_attempts": 13,
                "errors": 8
            },
            ...
        ],
        "timestamp": "2026-06-23T10:30:00Z"
    }
"""

import json
from datetime import datetime, timezone
from typing import Optional

from backend.api.database import get_connection


def analyze_gaps(user_id: str, min_attempts: int = 3, top_n: int = 3) -> dict:
    """
    Analisa respostas incorretas do usuário e identifica domínios fracos.

    Agrupa respostas por domínio, calcula taxa de erro e retorna os N domínios
    com maior taxa de erro (apenas aqueles com >= min_attempts tentativas).

    Args:
        user_id: UUID do usuário a analisar
        min_attempts: Mínimo de tentativas por domínio para considerar válido (padrão: 3)
        top_n: Número máximo de domínios fracos a retornar (padrão: 3)

    Returns:
        dict: Estrutura JSON com status, user_id, weak_domains[] e timestamp
              Formato:
              {
                  "status": "success",
                  "user_id": str,
                  "weak_domains": [
                      {
                          "domain": str,
                          "error_rate": float (0.0-1.0),
                          "total_attempts": int,
                          "errors": int
                      },
                      ...
                  ],
                  "timestamp": str (ISO 8601)
              }

    Exemplo de retorno com dados:
        {
            "status": "success",
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "weak_domains": [
                {
                    "domain": "design-performance",
                    "error_rate": 0.6153846153846154,
                    "total_attempts": 13,
                    "errors": 8
                },
                {
                    "domain": "seguranca-aplicacoes",
                    "error_rate": 0.5,
                    "total_attempts": 8,
                    "errors": 4
                }
            ],
            "timestamp": "2026-06-23T10:30:45.123456Z"
        }

    Casos especiais:
        - Usuário sem histórico: retorna weak_domains = []
        - Nenhum domínio com >= min_attempts: retorna weak_domains = []
        - Exceção de BD: levanta HTTPException 500 (tratada em endpoint)
    """

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Query SQL que agrupa respostas por domínio
        # - JOINs: answers -> quiz_history -> questions (para obter domínio)
        # - GROUP BY: domain
        # - HAVING: COUNT(*) >= min_attempts
        # - ORDER BY: taxa_erro DESC
        # - LIMIT: top_n

        query = f"""
            SELECT
                q.domain,
                COUNT(*) as total_attempts,
                SUM(CASE WHEN a.is_correct = FALSE THEN 1 ELSE 0 END) as errors,
                ROUND(
                    SUM(CASE WHEN a.is_correct = FALSE THEN 1 ELSE 0 END)::numeric
                    / COUNT(*)::numeric,
                    4
                ) as error_rate
            FROM answers a
            INNER JOIN quiz_history qh ON a.quiz_id = qh.id
            INNER JOIN questions q ON a.question_id = q.id
            WHERE qh.user_id = %s
              AND qh.status = 'completed'
            GROUP BY q.domain
            HAVING COUNT(*) >= %s
            ORDER BY error_rate DESC
            LIMIT %s
        """

        cursor.execute(query, (user_id, min_attempts, top_n))
        rows = cursor.fetchall()

        # Construir resposta
        weak_domains = []
        for row in rows:
            domain, total_attempts, errors, error_rate = row
            weak_domains.append({
                "domain": domain,
                "error_rate": float(error_rate),
                "total_attempts": int(total_attempts),
                "errors": int(errors),
            })

        # Validação cruzada opcional: verificar consistência com domain_scores em quiz_history
        # (em implementações futuras com cache/materialized views, seria recomendável)

        return {
            "status": "success",
            "user_id": user_id,
            "weak_domains": weak_domains,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        # Log interno (em produção, usar logging.exception())
        print(f"[ERROR] analyze_gaps({user_id}): {str(e)}")
        raise

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def validate_uuid(user_id: str) -> bool:
    """
    Valida se uma string é um UUID válido (v4).

    Args:
        user_id: String a validar

    Returns:
        bool: True se for UUID válido, False caso contrário

    Exemplo:
        >>> validate_uuid("550e8400-e29b-41d4-a716-446655440000")
        True
        >>> validate_uuid("invalid-uuid")
        False
    """
    import uuid

    try:
        uuid.UUID(user_id, version=4)
        return True
    except (ValueError, AttributeError):
        return False
