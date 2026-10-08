# P1/P2 — Runtime PostgreSQL operacional

Data: 2026-10-08

## A. Estado inicial Git

- Branch: `login-integracao`.
- HEAD no início: `a3aaaa686c18d633d4b36a71c645fe5ea52993b0` (diferente do HEAD antigo citado no pedido).
- Status inicial: limpo; nenhum staged, unstaged ou untracked.
- F1/F2/F3/F4.1–F4.4 e relatórios estavam no commit inicial.
- Não houve commit, push, pull, merge, deploy, uso de AWS/CLI, Railway, Google Console ou volume PGlite original.

## B. Arquitetura DB antes

```text
DB_ENGINE=pglite (default)
  → database facade (backend/database/db.js)
  → PGlite + DB_DATA_DIR
  → prepareSchema(): schema.sql, alterações locais/idempotentes e local links
  → API Express

DB_ENGINE=postgres-test
  → database facade
  → runtime F3 (backend/database/postgres/runtime.js)
  → adapter F1 (pg Pool/transações/reserved client)
  → PostgreSQL 16 isolado
```

PGlite continua no caminho local-first; migrations/helpers de compatibilidade ainda são executados por esse caminho legado. `postgres-test` continua limitado a `NODE_ENV=test`, loopback, database `cloudacademy_f2_test`, role `cloudacademy_f3_runtime`, token/marker de teste, schema F2 esperado e role sem DDL. O runner F2 e seu alvo também permanecem test-only.

## C. Arquitetura DB depois

```text
DB_ENGINE=pglite
  → facade → PGlite → prepareSchema legado → API

DB_ENGINE=postgres-test
  → facade → runtime F3 → adapter F1/pool → PostgreSQL descartável

DB_ENGINE=postgres
  → facade → operationalRuntime
  → adapter F1/pool (TLS verify-full, transações/reserved client)
  → PostgreSQL 16 operacional
  → API Express
```

O novo runtime não é alias de `postgres-test`, não importa o runner F2 e não executa DDL. O pool é criado lazy: a API pode ficar viva sem conexão inicial; readiness permanece negativa até validar conexão, privilégios, ledger e schema.

## D. Contrato `DB_ENGINE=postgres`

Implementado em [db.js](../../backend/database/db.js), [operationalRuntime.js](../../backend/database/postgres/operationalRuntime.js) e [operationalConfig.js](../../backend/database/postgres/operationalConfig.js).

Aceita apenas `NODE_ENV=staging|production`. `DATABASE_URL` aceita host remoto e é validada sem imprimir URL, usuário ou senha. Pool e timeouts usam os nomes F1 existentes: `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS`, `DB_QUERY_TIMEOUT_MS`, `DB_TRANSACTION_IDLE_TIMEOUT_MS` e `DB_IDLE_TIMEOUT_MS`; limites inválidos, zero, negativos, `NaN` e valores acima dos máximos são recusados.

Exige explicitamente `PORT`, `AUTH_SESSION_SECRET`, `AUTH_ALLOWED_DOMAINS`, `GOOGLE_CLIENT_ID`, `TRUST_PROXY` e `CORS_ALLOWED_ORIGINS`. `DB_SHUTDOWN_TIMEOUT_MS` fica entre 1 e 5.000 ms, com default operacional 4.000 ms. Não há fallback silencioso para PGlite se a configuração operacional falhar.

## E. Configuração operacional

Configuração válida é coberta em staging e production; ausência e valores inválidos são cobertos em `postgresOperationalConfig.test.js`. Staging/prod precisam de segredo de sessão com pelo menos 32 bytes e sem placeholder, Client ID Google configurado, domínios válidos e `PORT` de 1 a 65535. `TRUST_PROXY` precisa aparecer no ambiente; string vazia significa proxy trust desligado. Hosts/CIDRs são validados, `true`, `/0` e valores inválidos são recusados.

O `.env.example` registra as opções sem incluir segredo real. `DB_ENGINE=pglite` continua o default de desenvolvimento.

## F. TLS

Para staging e produção, o contrato exige `DB_SSL_MODE=verify-full`, `rejectUnauthorized: true` e validação do hostname pelo TLS do Node. `DB_SSL_CA` aceita a CA PEM quando necessário. Testes validaram configuração para host remoto com verify-full; não foi feita conexão externa nem handshake com uma CA remota.

A exceção de TLS desabilitado existe só no harness: requer ao mesmo tempo `PG_OPERATIONAL_TEST_TOKEN`, `NODE_ENV=staging`, loopback, database `cloudacademy_f2_test`, role `cloudacademy_operational_runtime`, marker do database igual ao token e `DB_SSL_MODE=disable`. Não é aceita para production ou host remoto. A configuração futura de RDS deve usar endpoint DNS do banco e CA confiável, sem desabilitar verificação.

## G. Runtime role

Readiness verifica que a role não é superuser, não tem atributos elevados, memberships, ownership, `CREATE`/`TEMP` no database ou `CREATE` em schema. Verifica também `USAGE` de schemas, DML nas tabelas operacionais, sequences e leitura do ledger. O harness concedeu apenas CONNECT/USAGE, DML, uso de sequences e SELECT no ledger; tentativas de CREATE foram recusadas com SQLSTATE `42501`.

Separação preservada: migration/admin role é diferente da runtime role. Não foi concedido DDL ao runtime e nenhuma migration foi criada.

## H. Migrations e startup

Startup operacional valida configuração e cria o pool; não aplica schema, migrations, seed de usuário/conteúdo ou bootstrap ADMIN. Readiness compara a única versão F2 atual (baseline), checksum SQL, checksum do schema efetivo e estrutura inspecionada. Schema/ledger incompatível mantém ready em 503 sem reparo automático.

O harness prepara o database descartável usando o runner F2 já existente em modo test-only e depois cria role operacional restrita. Isso não torna o runner apto para um banco staging real. A execução de migrations com credencial admin operacional continua pendente e é um gate antes de criar/homologar staging AWS; as guards F2 não foram relaxadas.

Contrato futuro do job permanece: processo CLI/admin separado → runner F2 → migration role → advisory lock/ledger/checksum → exit; API continua sem DDL.

## I. Schema compatibility

Runtime exige PostgreSQL major 16, ledger F2 com baseline/checksums esperados e checksum de `inspectSchema()` igual ao manifesto versionado. Também confere role/database conectados e privilégios necessários. Teste alterou schema após startup: readiness passou a 503, health permaneceu 200; removida a alteração, readiness recuperou 200. Não houve migration nem edição de baseline/manifesto.

## J. Health e readiness

- `GET /api/health`: 200 enquanto Express responde, inclusive quando o PostgreSQL está indisponível.
- `GET /api/ready`: 200 somente se processo não está drenando e conexão, permissões, ledger e schema estão compatíveis; indisponibilidade, schema incompatível ou encerramento retornam 503.
- Harness pausou e retomou o container descartável: readiness/rota autenticada observaram 503, health permaneceu 200 e readiness voltou a 200 após unpause, sem reiniciar a API.

## K. Contratos HTTP

Preservados e testados no caminho HTTP: 401 para credencial ausente/inválida; 403 para papel/ação não permitidos; 409 no conflito CAS; 500 sanitizado para erro SQL interno; 503 em indisponibilidade do PostgreSQL. A indisponibilidade não foi convertida em 401.

## L. Pool

Reutilizado adapter F1 com reserved client, transações e parser local de `BIGINT`; a suíte validou conversão segura até `Number.MAX_SAFE_INTEGER`. O runtime mantém os limites do pool F1. Dimensionamento futuro deve respeitar:

```text
tasks × DB_POOL_MAX + conexões de migration/admin + margem < limite de conexões RDS
```

Nenhuma classe/tamanho de RDS foi definida.

## M. Shutdown

SIGTERM preserva a ordem existente: API para de aceitar tráfego, readiness fica indisponível, HTTP drena até 10 s, fecha pool e termina dentro do deadline de 15 s. O pool operacional tem limite padrão de 4 s (máximo 5 s), sem aumentar o grace atual. A suíte enviou shutdown ao processo real; ele saiu com código 0. Teste isolado confirmou pool no estado `closed` após `close()`.

## N. Logging e secrets

Runtime emite JSON com timestamp, nível, UUID request ID, método, route template, status, duração e classe/código sanitizados. Não confia no header de request ID recebido; devolve `X-Request-Id` e o expõe ao browser. Logs não incluem path/query não normalizado, body, Authorization, token de sessão, token Google, URL do banco, senha ou SQL/parâmetros.

Também foi fechado um vazamento potencial em `debugQuery`: `DEBUG=true`/`DB_DEBUG=true` agora não imprimem SQL/parâmetros quando `DB_ENGINE=postgres` ou `NODE_ENV=staging`. O teste operacional foi executado com ambas as flags verdadeiras e confirmou a ausência de SQL, credenciais e URL nos logs.

## O. CORS

`CORS_ALLOWED_ORIGINS` é lista explícita de origens HTTPS exatas, sem wildcard, path, query ou credenciais. Origem fora da lista não recebe `Access-Control-Allow-Origin`; o harness testou origem autorizada e não autorizada. Para `pglite` e `postgres-test`, a allowlist anterior foi preservada. CORS não é tratado como autorização de API.

## P. Trust proxy

`TRUST_PROXY` continua restrito a IPs/CIDRs explícitos; vazio desativa proxy trust. `true`, domínio, CIDR inválido e `/0` falham. Nenhuma topologia futura ALB/ECS foi escolhida. Rate limit do Express continua usando `req.ip` segundo o proxy configurado, sem confiança genérica em `X-Forwarded-For`.

## Q. `POST /api/users`

A rota cria conta anônima sem autenticação e tem um método cliente legado; não foram encontrados chamadores frontend ativos, e o login Google provisiona por `resolveGoogleIdentity`. Classificação: **legado, removível após verificar compatibilidade externa**. Em `DB_ENGINE=postgres` a rota agora retorna 403; PGlite e `postgres-test` preservam comportamento. Isso torna explícita a mudança no modo operacional e reduz criação anônima/abuso de armazenamento. Consumidores externos ainda não foram inventariados.

## R. Alterações implementadas

- Novo `DB_ENGINE=postgres` e configuração operacional dedicada, sem alterar as guards F3.
- Readiness F2/schema/permissões e conversão segura de `BIGINT`, sem DDL no runtime.
- Configuração HTTPS/CORS/proxy e logs operacionais sanitizados com request ID.
- Harness Docker separado, limitado a um container próprio, loopback e tmpfs.
- Suite de configuração e integração; script `npm run test:postgres:operational`.
- Documentação `.env.example` e `docs/API_OPERATIONS.md`.
- Nenhuma migration, Dockerfile, alteração frontend ou conteúdo editorial.

## S. Suite operacional isolada

`npm run test:postgres:operational` — exit 0 na última execução; 2 suites / 12 testes aprovados / 0 skips; Jest 11,856 s. A primeira execução falhou por configuração incompleta do teste de integração (facade não inicializado naquele worker e cenário F3 com alvo/environment incompatível); o teste foi corrigido e repetido. Container foi removido após verificar nome, label, ID e tmpfs. Nenhum container preexistente foi usado.

## T. PostgreSQL utilizado

Imagem fixada por digest `postgres:16-alpine`, porta host efêmera publicada somente em `127.0.0.1`, banco e dados descartáveis em tmpfs. Readiness validou major 16. A senha/admin e runtime role foram geradas para o teste e não foram impressas. O teste local desabilitou TLS somente com a exceção estreita descrita na seção F; não substitui homologação TLS remota.

## U. Regressão F1

`npm run test:postgres` — exit 0; 2 suites, 44/44 aprovados, 0 skips; PostgreSQL 16.14; Jest 5,605 s. COMMIT/ROLLBACK e transações do adapter passaram.

## V. Regressão F2

`npm run test:postgres:migrations` — exit 0; 1 suite, 30/30 aprovados, 0 skips; PostgreSQL 16.14; Jest 46,03 s. Baseline, ledger/checksum, idempotência, rollback e advisory lock passaram. Nenhuma migration foi criada nesta entrega.

## W. Regressão F3

`npm run test:postgres:api` — repetido após a última alteração compartilhada; exit 0; 15 suites, 116 aprovados, 1 skip legado e 0 falhas; 114,6 s. PostgreSQL descartável real. A suite `postgresApi.integration` manteve readiness, ausência de DDL, schema drift, BIGINT, 401/403/409/503, recuperação e shutdown.

## X. F4.1

Incluída no runner F3: 10/10 aprovados. Concorrência real PostgreSQL manteve locks e transações.

## Y. F4.2

Incluída no runner F3: 13/13 aprovados.

## Z. F4.3

Incluída no runner F3: 8/8 aprovados.

## AA. F4.4

Incluída no runner F3: 10/10 aprovados.

## AB. Regressões locais

Comando focal com `db.test.js`, `api.integration.test.js`, `apiSessionAvailability.test.js`, `apiOperations.test.js` e `postgresApi.integration.test.js`: 3 suites passaram, a suite PostgreSQL foi skipped fora do harness e 1 suite falhou no setup; 95 aprovados, 8 skips e 2 falhas antes de executar asserts em `apiSessionAvailability.test.js`. `apiOperations.test.js` passou 30/30 quando executado junto com os testes de configuração.

Repetidos isoladamente, `apiSessionAvailability.test.js` e o cenário persistente de `apiProduction.test.js` falharam ao abrir diretório temporário persistente PGlite com `ErrnoError errno 51`, também fora do sandbox. Não alteram a implementação operacional PostgreSQL e não chegaram aos asserts; os testes PGlite em memória e o fluxo equivalente 503/recuperação em PostgreSQL real passaram. Essa limitação ambiental do PGlite persistente permanece aberta.

## AC. Build e qualidade

Não houve mudança frontend; build/PWA/E2E não eram aplicáveis ao escopo. `node --check` passou nos arquivos JS/MJS alterados. ESLint focal: 0 erros e 5 avisos `no-console` em pontos de log do server/logger; esses logs são os sinks previstos, sem warnings de variáveis/erros. Prettier passou para arquivos novos, runner, testes novos e `package.json`. O check dos arquivos legados modificados ainda os marca por diferenças de estilo preexistentes; não houve reformat global nem reformat de `db.js`. `git diff --check` passou.

## AD. Limitações restantes

- O runner F2 continua test-only; falta caminho admin de migration operacional antes de conectar staging remoto. Guards não foram enfraquecidas.
- TLS verify-full foi validado por configuração, sem handshake remoto/CA RDS.
- Google OAuth foi coberto pelos testes existentes/mocks; Client ID/origens/usuários reais não foram homologados.
- Consumidores externos de `POST /api/users` precisam ser verificados antes de publicação.
- Readiness compara a baseline/ledger atual; futuras migrations exigem atualização versionada do catálogo/runtime.
- Testes persistentes PGlite falham neste ambiente com errno 51, conforme seção AB.
- Nenhum Dockerfile existe; `docker-compose.yml` não substitui artefato container para ECS. Hardening de imagem fica para P1.2.
- Nenhuma AWS, API pública, PostgreSQL remoto, domínio, CI/CD cloud ou OAuth real foi criada/testada.

## AE. Estado final Git

Branch `login-integracao`; HEAD final `74c528678543aef70edfb15b49c8e354abaa2969` (`feat: introduce operational PostgreSQL runtime with enhanced logging and error handling`), um commit à frente de `origin/login-integracao`. Esse commit surgiu durante a execução; nenhum comando de commit foi executado nesta tarefa. Sem staged changes. Permanecem unstaged apenas ajustes de formatação no teste operacional e no script do harness. O relatório está untracked. Não houve push, deploy, alteração AWS/Railway/Google Console ou acesso ao volume PGlite original.

## AF. Decisão

**VALIDADA localmente para `DB_ENGINE=postgres` contra PostgreSQL 16 com schema F2 preparado.** Config, pool, TLS seguro por contrato, role sem DDL, schema/readiness, indisponibilidade/recuperação, logs, erros HTTP, shutdown e F1–F4 foram cobertos por PostgreSQL real. Isso não significa staging AWS pronto: migração operacional F2, handshake TLS remoto, OAuth real, containerização e infraestrutura continuam gates separados.

## AG. Próxima etapa recomendada

**P1.2 — containerização da API e hardening de artefato para ECS/Fargate.** Preservar o gate de desenvolver/autorizar um job de migrations operacional antes de criar recursos AWS.
