# Database Layer

Atualizado em: 2026-06-18

Esta pasta contem a camada PGlite usada pela API Express.

## Arquivos

```text
db.js           camada publica de acesso ao banco
schema.sql     schema principal
normalizers.js normalizacao de certificacoes e campos
db.test.js     testes da camada de banco
```

## Responsabilidades

- Inicializar e fechar PGlite.
- Aplicar `schema.sql`.
- Executar queries parametrizadas.
- Normalizar entradas.
- Validar dados antes de gravar.
- Gerenciar questoes, usuarios, historico, respostas, gamificacao e leaderboard.
- Gerenciar validacao de questoes.

## Ambiente

Fora de testes, configure:

```ini
DB_DATA_DIR=.pglite-data
```

Em testes, `initializeDatabase()` pode usar `memory://`.

## Funcoes Publicas Principais

Core:

- `initializeDatabase(options)`
- `getDatabase()`
- `closeDatabase()`
- `executeQuery(query, params)`
- `executeSql(sql)`

Questoes:

- `getQuestions(filters)`
- `getQuestionById(id)`
- `searchQuestions(term, limit)`
- `getQuestionsByDomain(certification, domain, options)`
- `insertQuestion(data)`
- `updateQuestion(id, updates)`
- `deleteQuestion(id)`

Validacao:

- `getPendingQuestions(options)`
- `validateQuestion(questionId, validatorId, status, rejectionReason)`

Usuarios e gamificacao:

- `createUser(name)`
- `getUserById(id)`
- `getUserByName(name)`
- `updateUser(id, data)`
- `getGamification(userId)`
- `updateGamification(userId, data)`

Quiz e estatisticas:

- `createQuizHistory(data)`
- `getQuizHistory(userId, limit, offset)`
- `getQuizById(id)`
- `recordAnswer(data)`
- `completeQuiz(quizId, userId)`
- `abandonQuiz(quizId, userId)`
- `getAnswersByQuiz(id)`
- `calculateStats(userId)`
- `calculateQuizStats(quizId)`
- `getWeakDomains(userId, threshold)`
- `getUserStats(userId)`
- `getLeaderboard(limit)`

## Ciclo de vida de tentativas (BUG-004)

Novas linhas de `quiz_history` começam em `started`, com `started_at` preenchido
e `completed_at = NULL`. `completeQuiz` calcula o resultado com as respostas do
banco e faz a transição idempotente para `completed`. `abandonQuiz` é usado apenas
no descarte explícito de uma sessão local; perda de rede, refresh e fechamento
da aba não marcam abandono. O histórico de concluídos, a view `user_stats`,
`calculateStats`, `getUserStats` e `getWeakDomains` filtram `status = 'completed'`.

`migrateQuizLifecycle` roda na inicialização do PGlite, inclusive quando o
schema já existia. Registros anteriores recebem `completed`, preservando notas
0% legítimas: o schema antigo atribuía `completed_at` no início e não permite
distinguir retroativamente conclusão de abandono. A migração é reaplicável e
passa a usar `started` como default para novos registros. O mesmo upgrade
aditivo aparece em `schema.sql` antes das views para o caminho PostgreSQL de
`run_schema.py`. O leaderboard lê a
tabela independente `gamification`; iniciar uma tentativa não altera seus
contadores/XP. A reconciliação geral de gamificação permanece fora desta fase.

## Validacao De Questoes

Campos no schema:

- `validation_status`
- `rejection_reason`
- `validation_logs`
- `validated_by`
- `validated_at`

Status aceitos:

- `PENDING`
- `APPROVED`
- `REJECTED`

`validateQuestion()` exige motivo quando o status e `REJECTED`.

## Exemplo

```javascript
import {
  closeDatabase,
  createUser,
  getQuestions,
  initializeDatabase,
} from './db.js';

await initializeDatabase({
  dataDir: '.pglite-data',
  environment: 'development',
});

const user = await createUser('CloudNinja#1234');
const questions = await getQuestions({ certification: 'CLF-C02', limit: 10 });

console.log(user, questions.length);

await closeDatabase();
```

## Testes

```bash
npm test -- backend/database/db.test.js --runInBand
npm test -- --runInBand
```

Em 2026-06-18, a suite completa passou com 9 suites e 77 testes.

## Troubleshooting

### `Database not initialized`

Chame `initializeDatabase()` antes de usar queries.

### `DB_DATA_DIR is required outside the test environment`

Configure `.env` ou passe `initializeDatabase({ dataDir })`.

### `memory://` bloqueado

Use `memory://` apenas em `NODE_ENV=test`.
