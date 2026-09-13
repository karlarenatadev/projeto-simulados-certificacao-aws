# API Express

Atualizado em: 2026-06-25

Esta documentacao resume o contrato real da API Express local usada pelo projeto.

Base local padrao:

```text
http://127.0.0.1:3001/api
```

Servidor:

```text
backend/api/server.js
```

Banco:

```text
backend/database/db.js
backend/database/schema.sql
```

## Como Rodar

```bash
cp .env.example .env
npm run db:seed
npm run api:start
```

PowerShell:

```powershell
Copy-Item .env.example .env
npm run db:seed
npm run api:start
```

## Health

```text
GET /api/health
```

Resposta:

```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2026-06-25T00:00:00.000Z"
}
```

## Questoes

Listar:

```text
GET /api/questions
GET /api/questions?certification=CLF-C02&domain=faturamento&difficulty=easy&limit=10&offset=0
GET /api/questions?search=s3&limit=20
GET /api/questions/pending
GET /api/questions/:id
```

Criar:

```text
POST /api/questions
```

Payload minimo:

```json
{
  "certification": "CLF-C02",
  "domain": "faturamento",
  "difficulty": "easy",
  "question_text": "Question text with at least ten characters",
  "options": ["A", "B", "C", "D"],
  "correct_answer": [0],
  "explanation": "Why the answer is correct"
}
```

Atualizar e remover:

```text
PUT /api/questions/:id
DELETE /api/questions/:id
```

`DELETE` usa soft delete.

## Validacao De Questoes

```text
GET /api/questions/pending
POST /api/questions/:id/validate
```

Aprovar:

```json
{
  "status": "APPROVED",
  "validator_id": "reviewer-name"
}
```

Rejeitar:

```json
{
  "status": "REJECTED",
  "validator_id": "reviewer-name",
  "feedback": "Explain what must be fixed"
}
```

Regras:

- status aceitos: `PENDING`, `APPROVED`, `REJECTED`;
- rejeicao exige motivo;
- a decisao atualiza `validation_status`, `rejection_reason`, `validated_by`, `validated_at` e `validation_logs`.

## Quiz

Aliases suportados:

```text
POST /api/quiz/start
POST /api/quizzes/start
POST /api/quiz/:id/answer
POST /api/quizzes/:id/answer
POST /api/quiz/:id/finish
POST /api/quizzes/:id/finish
POST /api/quiz/:id/abandon
POST /api/quizzes/:id/abandon
GET /api/quiz/:id/results
GET /api/quizzes/:id/results
GET /api/quiz/:id
GET /api/quizzes/:id
```

Iniciar:

```json
{
  "certification": "CLF-C02",
  "num_questions": 10
}
```

O usuário é obtido da sessão autenticada. O retorno inclui `quiz_id`,
`status: "started"`, `started_at` e `completed_at: null`. Um quiz iniciado
permanece disponível por `GET /api/quiz/:id` para retomada, mas não entra nas
estatísticas de concluídos.

Responder:

```json
{
  "question_id": "uuid-da-questao",
  "user_answer": 0,
  "time_secs": 12
}
```

O backend calcula `is_correct`. Respostas só são aceitas em `started` e para o
usuário dono da tentativa; uma repetição idêntica não duplica a resposta.

`POST /api/quiz/:id/finish` não exige corpo. Calcula o resultado com as
respostas persistidas, muda o status para `completed` e preenche `completed_at`.
Repetições devolvem o resultado existente com `idempotent: true`, sem alterar a
data. `GET /api/quiz/:id/results` só retorna resultado final em `completed`.

`POST /api/quiz/:id/abandon` só deve ser chamado após descarte explícito da
sessão pelo usuário. Muda `started` para `abandoned` e preenche `abandoned_at`;
fechar a aba ou ficar offline não causa abandono automático. Operações
incompatíveis com o estado retornam HTTP 409.

Iniciar outra tentativa diretamente pela API não abandona a anterior: ambas
podem ficar `started` até que o usuário conclua ou descarte explicitamente.

## Usuarios

```text
POST /api/users
GET /api/users/:id/stats
GET /api/users/:id/weak-domains?threshold=70
```

Criar usuario:

```json
{
  "anonymous_name": "CloudNinja#1234"
}
```

Se `anonymous_name` nao for enviado, a API gera um nome anonimo.

## Leaderboard

```text
GET /api/leaderboard?limit=100
```

## Observacoes De Contrato

- Algumas rotas retornam `{ success, data }`; outras ainda retornam `{ error, status }` em erros.
- A padronizacao final para `{ success, data, error }` segue como pendencia tecnica.
- O frontend deve manter fallback para JSON/localStorage quando a API estiver indisponivel.
- O diagnostico personalizado ainda e montado no frontend, sem endpoint dedicado.

