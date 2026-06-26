# Mapeamento de Tabelas e Endpoints do Backend

**Data:** 2026-06-26
**Versão:** 1.0
**Issue:** #42
**Épico:** #41 — Melhorar persistência do progresso

---

## 1. Tabelas Disponíveis

Fonte: `backend/database/schema.sql`

### 1.1 `users`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `anonymous_name` | VARCHAR(100) | NOT NULL, UNIQUE |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** nenhum adicional (PK cobre as buscas por id).
**Propósito:** Usuários anônimos do simulador.

---

### 1.2 `questions`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `certification` | VARCHAR(20) | NOT NULL |
| `domain` | VARCHAR(50) | NOT NULL |
| `difficulty` | VARCHAR(20) | NOT NULL |
| `question_text` | TEXT | NOT NULL |
| `options` | JSONB | NOT NULL |
| `correct_answer` | JSONB | NOT NULL |
| `explanation` | TEXT | NOT NULL |
| `reference_url` | TEXT | nullable |
| `validated_by` | VARCHAR(100) | nullable |
| `validated_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** `certification`, `domain`, `difficulty`, `validated_by`.
**Propósito:** Banco de questões de certificação AWS.

---

### 1.3 `quiz_history`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE |
| `certification` | VARCHAR(20) | NOT NULL |
| `score` | INTEGER | NOT NULL |
| `total_questions` | INTEGER | NOT NULL |
| `percentage` | DECIMAL(5,2) | NOT NULL |
| `domain_scores` | JSONB | NOT NULL |
| `weak_domains` | TEXT[] | nullable |
| `completed_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** `user_id`, `certification`, `completed_at`.
**Propósito:** Histórico de quizzes realizados por usuário.

---

### 1.4 `answers`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `quiz_id` | UUID | FK → quiz_history(id) ON DELETE CASCADE |
| `question_id` | UUID | FK → questions(id) ON DELETE SET NULL |
| `user_answer` | JSONB | NOT NULL |
| `is_correct` | BOOLEAN | NOT NULL |
| `answered_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** `quiz_id`, `question_id`, `is_correct`.
**Propósito:** Respostas individuais de cada questão por quiz.

---

### 1.5 `gamification`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE, UNIQUE |
| `total_quizzes` | INTEGER | DEFAULT 0 |
| `best_score` | DECIMAL(5,2) | DEFAULT 0 |
| `current_streak` | INTEGER | DEFAULT 0 |
| `last_date` | DATE | nullable |
| `badges` | TEXT[] | nullable |
| `completed_stages` | TEXT[] | nullable |
| `unlocked_stages` | TEXT[] | nullable |
| `labs_completed` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** `user_id`.
**Propósito:** Dados de gamificação — 1 linha por usuário (relação 1:1 com users).

---

### 1.6 `focus_sessions`

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE |
| `minutes` | INTEGER | NOT NULL |
| `session_type` | VARCHAR(20) | NOT NULL |
| `session_date` | DATE | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT NOW() |

**Índices:** `user_id`, `session_date`.
**Propósito:** Histórico de sessões de foco (Pomodoro).

---

## 2. Endpoints Disponíveis

**Nenhum endpoint HTTP está implementado no projeto.**

Os arquivos mencionados na issue como referência (`backend/database/db.js` e `backend/api/routes/users.js`) **não existem** no repositório. A estrutura atual do backend é:

```
backend/
└── database/
    ├── schema.sql   ← DDL do banco (existe)
    └── config.py    ← configuração de conexão via variáveis de ambiente (existe)
```

Não há pasta `backend/api/`, nenhuma camada HTTP e nenhum ORM ou pool de conexão implementado além do `config.py`.

> **Observação:** os arquivos `.js` referenciados na issue são inconsistentes com o stack Python do projeto (FastAPI + psycopg2 planejado). Provavelmente foram listados por engano ou como referência de estrutura futura.

---

## 3. Lacunas de Endpoint

Todas as 6 tabelas carecem de endpoints HTTP. A tabela abaixo mapeia as operações necessárias para atender ao Épico 4 (persistência de progresso):

| Tabela | Endpoints necessários | Prioridade (Épico 4) |
|--------|-----------------------|----------------------|
| `users` | `POST /users` — criar usuário anônimo | Alta — base de toda persistência |
| `users` | `GET /users/{id}` — buscar usuário | Alta |
| `questions` | `GET /questions` — listar com filtros (cert, domain, difficulty) | Alta — servir questões ao frontend |
| `questions` | `GET /questions/{id}` — buscar questão individual | Alta |
| `quiz_history` | `POST /quiz/submit` — salvar resultado do quiz | Alta — core da persistência |
| `quiz_history` | `GET /history/{user_id}` — histórico por usuário | Alta |
| `answers` | Coberto via `POST /quiz/submit` (enviar junto com o resultado) | Alta |
| `gamification` | `GET /gamification/{user_id}` — buscar progresso de gamificação | Alta |
| `gamification` | `PATCH /gamification/{user_id}` — atualizar progresso | Alta |
| `focus_sessions` | `POST /focus-sessions` — registrar sessão Pomodoro | Média |
| `focus_sessions` | `GET /focus-sessions/{user_id}` — histórico de sessões | Média |

---

## 4. Conclusão

### Resumo

| Item | Status |
|------|--------|
| Schema do banco (`schema.sql`) | ✅ Completo — 6 tabelas com índices e relacionamentos |
| Configuração de conexão (`config.py`) | ✅ Existe — variáveis de ambiente via `.env` |
| Camada de API HTTP | ❌ Não existe |
| Endpoints implementados | ❌ Nenhum |
| ORM ou pool de conexão | ❌ Não existe |

### Dependências para ativar a persistência

Esta task (mapeamento) desbloqueia as tasks subsequentes do Épico 4, porém a ativação real da persistência depende da **Task 1.3 do Épico 1** (`backend/api/main.py` com FastAPI), que ainda não foi implementada.

**Próximo passo recomendado:** priorizar a Task 1.3 para criar a API REST, que é o pré-requisito para expor os endpoints mapeados na Seção 3 deste documento.
