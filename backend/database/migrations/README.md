# Migrations PostgreSQL — F2

Runner explícito para **PostgreSQL 16 descartável de teste**. Nenhum módulo daqui
é importado por `db.js` ou pelo startup Express. O runtime permanece PGlite.

## Executar

```text
npm run test:postgres:migrations
npm run test:postgres
```

O primeiro comando cria um container exclusivo F2, executa a suíte real e o remove
após verificar nome, ID, label e tmpfs. O segundo reexecuta os gates F1 em outro
container. `--full` em qualquer modo seleciona todo o Jest, mas só habilita a
integração PostgreSQL daquele modo; a outra suite fica explicitamente skipped.

O comando administrativo `npm run db:migrate:postgres` exige:

- `NODE_ENV=test`;
- `PG_MIGRATIONS_TEST_URL`: host `127.0.0.1`, banco e usuário
  `cloudacademy_f2_test`, senha explícita;
- `PG_MIGRATIONS_TEST_TOKEN`: UUID v4 que também consta no comentário do banco
  como `cloudacademy-f2-test:<UUID>`.

O harness provisiona essas condições internamente. Antes de DDL, o runner confirma
PostgreSQL 16, banco, session_user, current_user, proprietário, ausência de recovery
e marcador. Não lê `.env`, `DATABASE_URL` produtiva, `DB_DATA_DIR` ou defaults PG*.
Nunca apontar esse modo de teste a um túnel de produção. Não há comando de reset,
seed, importação, downgrade, reparo de checksum ou adoção de schema legado.

## Baseline e inventário

`0001-effective-baseline.sql` é uma fonte versionada independente para banco vazio,
consolidada de `backend/database/schema.sql` e do DDL das migrations JavaScript.
Ela não é regenerada durante execução. Contém 22 tabelas de aplicação, 4 enums,
2 views, 1 função própria, 5 triggers, 88 constraints, 83 índices (incluindo os
implícitos de PK/UNIQUE), `pgcrypto` e `pg_trgm`. O ledger fica em outro schema.

Não contém registros editoriais de `domains`, seeds de usuários/questões/progresso,
backfills ou reconciliações. Preserva os timestamps sem timezone do legado; a
sessão administrativa usa UTC. Preserva defaults, nullability, UUID, JSONB, arrays,
BIGINT, índices parciais e GIN. O ledger usa `timestamptz` para seu próprio histórico.

Diferenças deliberadas em relação ao SQL/DDL legado:

- `local_identity_links` e os oito módulos aceitos já estão no baseline.
- `case_questions.question_id` é explicitamente NOT NULL e sua FK usa RESTRICT.
  O SET NULL original conflita com a PK; a escolha bloqueia exclusão física e
  preserva vínculos. Soft delete continua compatível. Não se adotou CASCADE nem
  se alterou uma base existente.
- O CHECK de role duplicado foi reduzido a uma definição equivalente; o trigger
  repetido de `cases` é declarado uma vez. Permissões/RBAC não foram alterados.
- `validated_by_id` nasce no CREATE TABLE, mudando apenas a posição ordinal;
  `NOW()` equivale ao `CURRENT_TIMESTAMP` aplicado pela migration de lifecycle.
- Guards de upgrade, backfills e INSERT de domínios foram retirados. A existência
  de objetos sem ledger causa recusa; esse baseline **não é upgrade de legado**.

## Ledger, lock e atomicidade

`cloudacademy_migrations.history` registra `version` (PK), `name` (UNIQUE),
`checksum` SHA-256 do SQL com CRLF normalizado para LF, `schema_checksum` SHA-256
do manifesto JSON, `runner_version` e `applied_at`. Versões são sequenciais a
partir de 0001. Nome/checksums alterados, histórico incompatível e versões à frente
do checkout são rejeitados antes de aplicar novas migrations.

Cada execução cria um pool privado com máximo 1 e reserva um client. Um advisory
lock de sessão cobre bootstrap do ledger, inspeção e todas as migrations. BEGIN,
SQL, validação, INSERT no ledger e COMMIT usam esse mesmo client. Não há DDL por
consultas independentes ao pool global nem pelo executor público de consultas F1.
SQL confiável versionado usa protocolo simples para suportar funções e múltiplas
instruções; consultas com valores continuam parametrizadas.

Cada migration é transacional. A primeira inclui também a criação do ledger.
Falha gera ROLLBACK; versões anteriores já confirmadas são preservadas. O runner
não usa autocommit como fallback: `CREATE INDEX CONCURRENTLY` e outras operações
incompatíveis são recusadas pelo PostgreSQL dentro da transação. Uma necessidade
futura desse tipo exige desenho específico; não adicionar BEGIN/COMMIT/ROLLBACK
às fontes SQL. As migrations são código confiável revisado, não um sandbox de SQL.

SIGINT/SIGTERM do CLI acionam AbortSignal e destroem a conexão. O servidor desfaz
transações não confirmadas e libera seu lock ao terminar a sessão; isso pode
aguardar a instrução em curso, não é cancelamento instantâneo de computação.
Prazos: conexão 5 s, statement/espera pelo lock 15 s, leitura 17 s e transação
ociosa 15 s. São limites por operação, não um prazo global da execução.
Falha/interrupção durante COMMIT indica `commitOutcome=unknown`: reconciliar pelo
ledger na próxima execução, sem repetir escritas manualmente. Erros do driver
são sanitizados e a sessão reservada sempre é destruída ao terminar.

## Validação de schema

`0001-effective-baseline.schema.json` guarda o catálogo esperado, capturado no
PostgreSQL 16.14 e confrontado em teste com o schema efetivo legado. O runner
compara definições antes de continuar um histórico existente e antes de gravar
cada nova versão. Valida relações, colunas/tipos/nullability/defaults, constraints
e ações de FK, validade/definição de índices, valores ordenados de enums, views,
funções próprias, triggers/habilitação e versões/localização das extensões.
Não considera dados, OIDs, donos, comentários ou privilégios como catálogo de
aplicação. Permissões operacionais e papéis DDL/runtime pertencem à integração futura.

Não há captura automática nem atualização de snapshot nos testes regulares.
Uma mudança futura exige nova versão SQL e manifesto próprio, revisão das
diferenças e execução real. O formato de catálogo é estrito para PostgreSQL 16;
trocas de major, extensão ou formato de deparse exigem revisão explícita.

Relatório: [D4.4.2](../../../docs/audits/D4.4.2_MIGRATIONS_POSTGRESQL.md).
