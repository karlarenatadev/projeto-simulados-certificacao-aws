# PGlite Setup

Atualizado em: 2026-06-25

PGlite e a camada de banco local usada pela API Express. Ela permite demonstrar persistencia sem depender de um PostgreSQL externo.

## Arquivos

```text
backend/database/db.js          camada publica de acesso ao banco
backend/database/schema.sql     schema principal
backend/database/normalizers.js normalizadores compartilhados
backend/database/db.test.js     testes da camada de banco
scripts/seed/seed-pglite.mjs         seed dos JSONs principais
```

## Variaveis

Configure `.env`:

```ini
NODE_ENV=development
DB_DATA_DIR=.pglite-data
PORT=3001
```

Regras:

- fora de `NODE_ENV=test`, `DB_DATA_DIR` e obrigatorio;
- em testes, o banco usa `memory://`;
- `memory://` nao e permitido em desenvolvimento/producao;
- `.env` e local e nao deve ser commitado.

Criar `.env`:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

## Criar Banco E Popular Dados

```bash
npm run db:seed
```

Com diretorio explicito:

```bash
npm run db:seed -- --data-dir .pglite-data
```

O seed importa os JSONs principais PT/EN de `data/`, normaliza campos e evita duplicidade.

## Rodar API Com PGlite

```bash
npm run api:start
```

Health:

```text
http://127.0.0.1:3001/api/health
```

## Funcoes Principais

- `initializeDatabase(options)`
- `closeDatabase()`
- `executeQuery(sql, params)`
- `executeSql(sql)`
- `getQuestions(filters)`
- `insertQuestion(question)`
- `updateQuestion(id, updates)`
- `deleteQuestion(id)`
- `getPendingQuestions(options)`
- `validateQuestion(id, validatorId, status, reason)`
- `createUser(name)`
- `createQuizHistory(data)`
- `recordAnswer(data)`
- `getLeaderboard(limit)`
- `getWeakDomains(userId, threshold)`

## Validacao De Questoes

O schema oficial ja inclui:

- `validation_status`
- `rejection_reason`
- `validation_logs`
- `validated_by`
- `validated_at`

Status aceitos:

- `PENDING`
- `APPROVED`
- `REJECTED`

## Rodar Testes

```bash
npm test -- backend/database/db.test.js --runInBand
npm test -- __tests__/api.validation.test.js --runInBand
npm test -- --runInBand
```

Em 2026-06-25, a suite completa passou com 9 suites e 82 testes.

## Troubleshooting

### `DB_DATA_DIR is required outside the test environment.`

Configure:

```env
DB_DATA_DIR=.pglite-data
```

Depois rode:

```bash
npm run db:seed
```

### `In-memory PGlite is restricted to tests`

Use `memory://` apenas com `NODE_ENV=test`.

### Dados nao aparecem na API

1. Confirme `.env`.
2. Rode `npm run db:seed`.
3. Inicie `npm run api:start`.
4. Consulte `GET /api/questions?limit=5`.
