"""
Aplicação principal FastAPI
"""

import json

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from backend.api.database import get_connection
from backend.api.models import (
    GapsAnalysisResponse,
    QuestionResponse,
    QuizHistoryResponse,
    QuizSubmission,
    QuizSubmitResponse,
)
from backend.analytics.gaps_analyzer import analyze_gaps, validate_uuid

app = FastAPI(
    title="AWS Simulator API",
    description="API para simulados de certificação AWS",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get(
    "/",
    tags=["Health Check"],
    summary="Verifica se a API está online",
)
def health_check():
    return {
        "status": "online",
        "service": "AWS Simulator API",
    }

@app.get(
    "/api/questions",
    tags=["Questions"],
    summary="Retorna todas as questões ativas",
    response_model=list[QuestionResponse],
)
def get_questions():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id,
                certification,
                domain,
                difficulty,
                question_text,
                options
            FROM questions
            WHERE is_active = TRUE
        """)

        rows = cursor.fetchall()

        questions = []
        for row in rows:
            questions.append({
                "id": str(row[0]),
                "certification": row[1],
                "domain": row[2],
                "difficulty": row[3],
                "question_text": row[4],
                "options": row[5],
            })

        return questions

    finally:
        cursor.close()
        conn.close()

@app.get(
    "/api/questions/{question_id}",
    tags=["Questions"],
    summary="Retorna uma questão pelo ID",
    response_model=QuestionResponse,
)
def get_question(question_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                certification,
                domain,
                difficulty,
                question_text,
                options
            FROM questions
            WHERE id = %s
              AND is_active = TRUE
        """,
            (question_id,),
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )

        return {
            "id": str(row[0]),
            "certification": row[1],
            "domain": row[2],
            "difficulty": row[3],
            "question_text": row[4],
            "options": row[5],
        }

    finally:
        cursor.close()
        conn.close()

@app.post(
    "/api/quiz/submit",
    tags=["Quiz"],
    summary="Submete o resultado de um quiz realizado",
    response_model=QuizSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_quiz(submission: QuizSubmission):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        
        cursor.execute(
            """
            INSERT INTO quiz_history (
                user_id,
                certification,
                score,
                total_questions,
                percentage,
                domain_scores,
                weak_domains,
                time_spent_secs,
                status,
                started_at,
                completed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'completed', NOW(), NOW())
            RETURNING id
        """,
            (
                submission.user_id,
                submission.certification,
                submission.score,
                submission.total_questions,
                submission.percentage,
                json.dumps(submission.domain_scores),
                submission.weak_domains,
                submission.time_spent_secs,
            ),
        )

        quiz_id = str(cursor.fetchone()[0])

        if submission.answers:
            for answer in submission.answers:
                cursor.execute(
                    """
                    INSERT INTO answers (
                        quiz_id,
                        question_id,
                        user_answer,
                        is_correct,
                        time_secs
                    ) VALUES (%s, %s, %s, %s, %s)
                """,
                    (
                        quiz_id,
                        answer.question_id,
                        json.dumps(answer.user_answer),
                        answer.is_correct,
                        answer.time_secs,
                    ),
                )

        conn.commit()

        return {
            "id": quiz_id,
            "message": "Quiz submitted successfully",
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit quiz: {str(e)}",
        )

    finally:
        cursor.close()
        conn.close()

@app.get(
    "/api/history/{user_id}",
    tags=["History"],
    summary="Retorna o histórico de quizzes de um usuário",
    response_model=list[QuizHistoryResponse],
)
def get_history(user_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                certification,
                score,
                total_questions,
                percentage,
                domain_scores,
                weak_domains,
                time_spent_secs,
                completed_at
            FROM quiz_history
            WHERE user_id = %s
              AND status = 'completed'
            ORDER BY completed_at DESC
        """,
            (user_id,),
        )

        rows = cursor.fetchall()

        history = []
        for row in rows:
            history.append({
                "id": str(row[0]),
                "certification": row[1],
                "score": row[2],
                "total_questions": row[3],
                "percentage": float(row[4]),
                "domain_scores": row[5] if row[5] else {},
                "weak_domains": row[6] if row[6] else [],
                "time_spent_secs": row[7],
                "completed_at": row[8].isoformat() if row[8] else None,
            })

        return history

    finally:
        cursor.close()
        conn.close()


@app.get(
    "/api/analytics/gaps/{user_id}",
    tags=["Analytics"],
    summary="Analisa domínios fracos do usuário (taxa de erro alta)",
    response_model=GapsAnalysisResponse,
    status_code=status.HTTP_200_OK,
)
def get_gaps_analysis(user_id: str):
    """
    Analisa respostas incorretas do usuário e retorna os domínios com maior taxa de erro.

    **Path Parameters:**
    - `user_id`: UUID do usuário

    **Query Logic:**
    - Agrupa respostas por domínio
    - Calcula taxa de erro = erros / total_tentativas
    - Filtra apenas domínios com >= 3 tentativas (cold start mitigation)
    - Ordena por taxa_erro DESC
    - Retorna top 3 domínios fracos

    **Response Examples:**

    Usuário com histórico:
    ```json
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
    ```

    Usuário novo (sem histórico):
    ```json
    {
        "status": "success",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "weak_domains": [],
        "timestamp": "2026-06-23T10:30:45.123456Z"
    }
    ```

    **Status Codes:**
    - 200: Sucesso (mesmo se weak_domains vazio)
    - 400: user_id inválido (não é UUID v4)
    - 500: Erro interno do banco de dados
    """

    # Validar UUID
    if not validate_uuid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user_id format: '{user_id}' is not a valid UUID v4",
        )

    try:
        result = analyze_gaps(user_id)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze gaps: {str(e)}",
        )
