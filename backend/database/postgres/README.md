# Adaptador PostgreSQL isolado — D4.4.1 / F1

Este módulo não é importado pelo startup Express nem por `db.js`. Não carrega
`.env`, não abre PGlite, não aplica schema/migrations e não executa seeds. A criação
do adaptador valida a configuração e cria um pool lazy; a primeira operação abre
a conexão. A aplicação deverá criar uma instância por processo na integração futura.

```js
import { createPostgresAdapter } from "./backend/database/postgres/index.js";

const db = createPostgresAdapter({ env: isolatedEnvironment });
try {
  const rows = await db.executeQuery("SELECT $1::int AS value", [42]);
  const result = await db.transaction(async (tx) => {
    const { rows } = await tx.query("SELECT pg_backend_pid() AS pid");
    return rows[0];
  });
} finally {
  await db.close();
}
```

## Contratos

- `query(text, values = [])` retorna o `pg.Result`; `executeQuery` retorna apenas
  o array `rows`, como a fachada atual. Parâmetros continuam `$1`, `$2`, etc.
- `withClient(callback)` reserva um client e fornece executor com `query` e
  `executeQuery`; libera no `finally`. Não expõe o pool/client bruto nem exige
  que o consumidor lembre de chamar `release`. O executor expira ao sair do callback.
- `transaction(callback)` usa **um único client** de BEGIN até COMMIT/ROLLBACK.
  Retorna o resultado do callback somente após COMMIT confirmado. Erro SQL capturado
  e ignorado pelo callback ainda aborta a transação; não produz sucesso falso.
- Chamadas globais da mesma instância, reservas aninhadas e transações aninhadas
  dentro do callback são rejeitadas; usar o executor recebido. Savepoints não
  fazem parte de F1. A proteção de contexto não se estende a outras instâncias.
- Todos os comandos públicos usam protocolo estendido, uma instrução por chamada.
  Controle transacional é reservado ao adaptador. Essa verificação é proteção
  contra uso incorreto, não um sandbox de SQL. Usar parâmetros para valores;
  identificadores dinâmicos precisam de validação própria.
- Todas as operações, inclusive independentes, reservam um client internamente.
  Não há BEGIN/COMMIT em `pool.query` nem acesso global durante a transação.
- `close()` é idempotente, bloqueia novas reservas e drena as existentes. Ao vencer
  o prazo, destrói as conexões reservadas e rejeita com `PG_SHUTDOWN_TIMEOUT`.
  Não consegue cancelar código JavaScript arbitrário do callback. Chamar no ciclo
  de vida externo, após parar de aceitar trabalho, e aguardar todas as operações.
- `stats()` retorna estado e contagens do pool, além do último erro ocioso sanitizado.
  Não retorna URL, configuração, SQL, parâmetros ou credenciais.

Não iniciar consultas sem aguardá-las; todos os trabalhos do callback devem ser
concluídos antes de retornar. Não usar `withClient` para deixar alterações de sessão
para outro consumidor: usar `SET LOCAL` dentro de `transaction` quando necessário.

## Configuração

A configuração é passada explicitamente ou lida de `process.env` **somente na
chamada ao factory**. Não logar o objeto retornado por `readPostgresConfig`: ele
contém a credencial necessária ao driver. O adaptador não registra logs.

| Variável                         | Regra / padrão                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                   | Obrigatória: `postgres:`/`postgresql:`, host, usuário, senha e um banco explícitos; porta padrão 5432. Rejeita query string/fragmento, controles, escape inválido e caminho aninhado. Não há fallback para `DB_DATA_DIR` ou `PGHOST` |
| `NODE_ENV`                       | `development` (padrão), `test` ou `production`                                                                                                                                                                                       |
| `DB_SSL_MODE`                    | `verify-full` para produção ou host remoto; `disable` permitido apenas para loopback em dev/test. Não aceita `no-verify` nem parâmetros SSL escondidos na URL                                                                        |
| `DB_SSL_CA`                      | CA opcional, em PEM, para TLS com `rejectUnauthorized:true`; não é aceita com TLS desligado                                                                                                                                          |
| `DB_POOL_MAX`                    | 5; inteiro 1–100                                                                                                                                                                                                                     |
| `DB_CONNECTION_TIMEOUT_MS`       | 3000; conexão inicial e espera por vaga no pool                                                                                                                                                                                      |
| `DB_IDLE_TIMEOUT_MS`             | 10000; remoção de conexão ociosa                                                                                                                                                                                                     |
| `DB_STATEMENT_TIMEOUT_MS`        | 5000; cancelamento no servidor                                                                                                                                                                                                       |
| `DB_QUERY_TIMEOUT_MS`            | timeout de statement + 1000; prazo no cliente, obrigatoriamente maior que o do servidor                                                                                                                                              |
| `DB_TRANSACTION_IDLE_TIMEOUT_MS` | 10000; limite de sessão ociosa dentro de transação                                                                                                                                                                                   |
| `DB_SHUTDOWN_TIMEOUT_MS`         | 10000; prazo de drenagem                                                                                                                                                                                                             |

Timeouts são inteiros positivos até 300000 ms, exceto o de query, limitado a
600000 ms. A sessão usa UTC e `application_name=cloudacademy-postgres-adapter`.
Essas variáveis pertencem ao módulo novo; não modificam a configuração atual da API.

## Falhas e precisão

Erros do driver viram `PostgresAdapterError` com `kind`, `code` e `phase`, sem
mensagem/detail/cause originais. Categorias: autenticação do **banco** (não HTTP
401), conexão, timeout, constraint, conflito, query ou uso incorreto. SQLSTATE é
mantido quando seguro. Falha de rollback não substitui o erro primário; conexão
duvidosa é descartada. Erros de negócio lançados pelo callback são preservados,
portanto seu conteúdo continua sendo responsabilidade do chamador.

Timeout do servidor (`57014`) permite rollback; timeout de leitura no cliente
descarta a conexão, pois rejeitar uma Promise não prova cancelamento no servidor.
Não há retry automático. Falha de conexão/timeout durante COMMIT marca
`commitOutcome: 'unknown'`: o chamador deve reconciliar/idempotentizar, nunca repetir
uma escrita cegamente. O mapeamento HTTP fica para a integração futura.

BIGINT escalar permanece string decimal exata por parser local, sem alterar o
registro global do `pg`; arrays int8 também permanecem strings pelo parser padrão.
UUID é string e JSONB usa objetos/arrays nativos. Números dentro de JSONB seguem
os limites de Number/JSON.parse; valores inteiros grandes dentro de JSON devem ser
codificados como texto pelo contrato. Não há conversão automática de revisão para
Number: o futuro DTO deve validar `Number.isSafeInteger`. Não se promete equivalência
de tipos numéricos/datas com PGlite sem testes dos consumidores.

## Testes reais e isolamento

```text
npm run test:postgres
npm run test:postgres -- --full
```

Requer Docker local disponível e a imagem PostgreSQL 16 fixada por digest no runner
`scripts/testing/postgres-integration.mjs`. O primeiro comando executa configuração
e integração do adaptador; `--full` executa toda a suíte Jest incluindo a integração.
Não requer `.env`, Railway nem banco pré-existente.

O runner cria `cloudacademy-f1-test-<UUID>` com label de propriedade, banco/usuário
`cloudacademy_f1_test`, senha aleatória efêmera, autenticação SCRAM, tmpfs e porta
aleatória publicada **somente em 127.0.0.1**. Não monta diretório do host nem volume
persistente. Confere nome, ID, label e tmpfs antes de remover esse container.
Caso a validação falhe, mantém o container e reporta seu nome para inspeção.

As fixtures criam somente `f1_adapter_<UUID>` e uma tabela sintética. Antes da
criação e remoção, verificam PostgreSQL 16, banco/usuário exatos e host loopback.
Cleanup usa apenas o schema gerado nessa execução; nunca faz DROP DATABASE nem
limpeza de schemas existentes. Não é baseline ou migration da aplicação.

Uma execução Jest comum deixa a integração explicitamente **skipped** quando
`PG_ADAPTER_INTEGRATION` não é `1`. Isso não aprova F1: executar o runner é obrigatório.
O runner define `PG_ADAPTER_TEST_URL` internamente e ignora `DATABASE_URL` herdada
para esses testes. Fornece `DB_DATA_DIR=memory://` à regressão legada; testes de
persistência existentes usam seus próprios diretórios temporários.

Para serviço PostgreSQL 16 equivalente, somente após verificar que é exclusivamente
de teste: fornecer `PG_ADAPTER_INTEGRATION=1` e `PG_ADAPTER_TEST_URL` com o banco e
usuário acima, em loopback, e executar as duas suítes com Jest. URL ausente ou alvo
fora da allowlist falha; nunca usar túnel para produção. Esse modo não cria/remove
o serviço, somente o schema sintético da execução.

## F2 e integração posterior

Permanecem pendentes baseline efetiva, ledger/checksum/lock de migrations, papel
DDL separado, adaptação de `.exec`/scripts multi-instrução e importação de dados.
Conectar Express, migrar repositórios, alterar HTTP/auth/RBAC e corrigir sync estão
fora desta entrega. PGlite, socket e recuperação permanecem disponíveis.

Referências: [contrato do pool](https://node-postgres.com/apis/pool),
[transações no mesmo client](https://node-postgres.com/features/transactions),
[TLS](https://node-postgres.com/features/ssl) e
[auditoria F1](../../../docs/audits/AUDITORIA_MIGRACAO_PGLITE_POSTGRESQL.md).
