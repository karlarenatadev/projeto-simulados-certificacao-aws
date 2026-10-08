# Validação funcional da D4.2

**Data da validação:** 2026-09-28  
**Branch/HEAD:** `login-integracao` / `f29c95f401d86e6ad9e4c27781f6cc6565085fef`  
**Classificação:** **PARCIALMENTE CONCLU�?DA**

## 1. Resumo executivo

A D4.2 tem implementação e evidência atual para preservação de gravações locais durante sincronização, migração local aditiva e versionada para conta, autenticação/sessão com verificadores simulados, e parte da sincronização API. A execução atual aprovou a regressão Jest integral, os contratos selecionados contra PostgreSQL real e os builds local-first e híbrido em cópia isolada. Isso comprova desenvolvimento local; não comprova login Google externo real, artefato publicado, API produtiva disponível, nem operação com hospedagem/backup reais.

O fechamento é impedido por comportamento reproduzido: com PGlite fechado, uma chamada autenticada de estado retorna 401 (a readiness retorna 503), e o cliente elimina o token como sessão expirada; o namespace e o progresso locais sobrevivem. A reconciliação de Labs descarta IDs remotos, eventos XP remotos também se perdem, o PUT de gamificação global retorna 400 e três hooks antigos de sincronização não existem no cliente API. No E2E, 27 de 30 specs passaram; dois falharam porque o aviso fixo de sessão intercepta controles e um porque o botão de revisão permaneceu desabilitado.

**Conclusão:** requisitos essenciais de continuidade e sincronização ainda não estão comprovados. D4.2.3 e D4.2.4 não puderam ser reconstruídas com evidência no histórico/documentação consultados; não se atribuem requisitos a elas por inferência. Foi solicitada a especificação original desses itens durante a validação, mas ela não estava disponível ao fechar este relatório.

## 2. Escopo reconstruído

Foram inspecionados `docs/API_OPERATIONS.md`, `docs/audits/AUDITORIA_MIGRACAO_PGLITE_POSTGRESQL.md`, referências D4.2 na documentação e testes, implementação atual, e histórico acessível por `git log --all`. As referências diretas sustentam D4.2.1, .2, .5 e .6. Não foi localizada especificação primária para .3 e .4 nem registro correspondente em `docs/EPICOS-E-TASKS`; portanto, seus objetivos e critérios permanecem desconhecidos.

- **D4.2.1 — continuidade durante sincronização:** impedir que GET/PUT remoto pendente sobrescreva gravação local recente; preservar alterações durante recaptura/retomada. Evidência principal: `__tests__/accountSync.test.js`, `__tests__/progressSync.test.js`, `__tests__/googleLoginOrchestration.test.js`.
- **D4.2.2 — vínculo local versionado e aditivo:** associar progresso local à conta sem sobrescrever remoto, por escopo e com controle de versão/CAS. Os 20 escopos atuais são cinco módulos por quatro certificações. Evidência: `src/frontend/js/core/contracts/localLinkMigration.js`, `backend/database/localLinks.js`, `__tests__/localLinkSafety.test.js`, `__tests__/localLinks.test.js`.
- **D4.2.3 e D4.2.4 — não reconstruídas:** sem requisito, arquivos, testes ou critério de aceite atribuíveis com segurança. Mudanças de autenticação híbrida/local-first que aparecem em commits posteriores são contexto relacionado, não prova de que essas subetapas sejam essas mudanças.
- **D4.2.5 — contrato operacional da API:** `docs/API_OPERATIONS.md` documenta ambiente, armazenamento persistente PGlite, segredo HMAC, identidade pública Google, bind/proxy, HTTPS, health/readiness, logs, shutdown e backup/restore. A documentação também registra riscos operacionais, inclusive criação pública de usuário e compatibilidade de escrita versionada.
- **D4.2.6 — preparação da publicação:** a própria documentação deixa a seleção de hospedagem, volume, segredos, HTTPS/proxy, probes, backups e configuração real de `PUBLIC_API_BASE_URL` como passo futuro. Não há comprovação de implantação operacional nesta validação.

Planos antigos de dupla gravação/API-first não foram tratados como contrato vigente quando contradizem a implementação e os testes atuais. D4.4 F1/F2/F3 é uma trilha separada; a integração Express/PostgreSQL em teste não conclui D4.2 nem comprova a operação produtiva, que continua usando PGlite.

## 3. Matriz de requisitos e evidências

| Subetapa | Requisito | Implementado | Testado agora | Resultado | Pendência | Evidência |
|---|---|---|---|---|---|---|
| D4.2.1 | Escrita local não pode ser perdida enquanto GET/PUT está pendente; troca/retomada não deve aplicar dados de outra conta. | Sim, com snapshots e proteção por identidade nos caminhos cobertos. | Sim: Jest integral e focused; E2E local-first/continuidade. | Parcialmente aprovado. | Provar todas as corridas em módulos e respostas atrasadas, inclusive falha transitória; erro de banco hoje é classificado como 401 no PGlite. | `__tests__/accountSync.test.js`; `__tests__/googleLoginOrchestration.test.js`; `e2e/auth-continuity.spec.js`; sondas abaixo. |
| D4.2.2 | Link aditivo/versionado, CAS, conflito e retomada, limitado aos escopos declarados. | Sim para 20 escopos e fluxo coberto. | Sim: Jest; contratos PostgreSQL real; E2E local link. | Aprovado dentro do limite do vínculo v1, não para todos os módulos. | Não declarar sincronização integral de Labs, XP, histórico de simulados ou Pomodoro a partir desses escopos. | `LOCAL_LINK_SCOPES`; `__tests__/localLinks.test.js`; `__tests__/localLinkSafety.test.js`; E2E `local-first.spec.js`. |
| D4.2.3 | Não recuperado. | Não verificável. | Não. | NÃO VERIFIC�?VEL. | Recuperar descrição/aceite original antes de avaliar. | Busca `rg` em docs, backend, src, testes e `.github`; `git log --all`; sem referência primária localizada. |
| D4.2.4 | Não recuperado. | Não verificável. | Não. | NÃO VERIFIC�?VEL. | Recuperar descrição/aceite original antes de avaliar. | Mesma busca e histórico da linha D4.2.3. |
| D4.2.5 | Operação segura e recuperável da API: configuração, readiness, logs, encerramento, backup/restore e limites conhecidos. | Documentação existe; API local tem health/readiness e teste de encerramento. Produção continua PGlite e não foi operada aqui. | Parcial: Jest e sondas PGlite; teste PostgreSQL isolado. | Parcial. | Validar em ambiente operacional autorizado: persistência, backup e restore, HTTPS/proxy, segredos, probes e monitoramento. Corrigir semântica de falha de banco/401. | `docs/API_OPERATIONS.md`; `__tests__/apiProduction.test.js`; `/api/ready`; sonda PGlite; `__tests__/postgresApi.integration.test.js`. |
| D4.2.6 | Escolher/configurar hospedagem, volume e endpoint público; build e API publicados funcionando. | Requisitos são descritos como etapa futura; build local existe. | Build local-first/híbrido e runtime Pages testados localmente; sem publicação/API real. | Parcial; publicação não comprovada. | Decisão e validação operacional de publicação, URL HTTPS, domínio/OAuth e disponibilidade real. | `docs/API_OPERATIONS.md`; `scripts/public-runtime-config.cjs`; E2E `runtime-config.spec.js`, `api-origin.spec.js`, `pwa.spec.js`. |

## 4. Testes executados e resultados

As execuções principais foram feitas em cópia isolada do HEAD, com `node_modules` compartilhado por junction. A cópia isolada mantém artefatos de build fora do worktree. Não foram usados dados ou credenciais corporativas. Logs e JSON foram mantidos temporariamente em `%TEMP%\D4.2-validation-bac0b276ba85455e852d0665eb96f7d7\` e `%TEMP%\D4.2-current-postgres-api.log`.

| Comando / execução | Ambiente e escopo | Resultado |
|---|---|---|
| `npm test -- --runInBand --json --outputFile=../full.json` | Cópia isolada; `NODE_ENV=test`, `DB_ENGINE=pglite`, `DB_DATA_DIR=memory://`; integração PostgreSQL desativada. | Exit 0; 96 suites: 93 aprovadas, 3 skipped; 846 testes: 789 aprovados, 57 skipped; ~586,95 s. Os 57 skipped são integrações F1/F2/F3 PostgreSQL, não aprovados. |
| `npm test -- --runInBand --runTestsByPath accountSync localLinkSafety googleLoginOrchestration offlineLinking localLinks progressSync accountPersistence userIsolation sessionExpiry sessionUX sessionToken auth401 googleAuth googleAuthRoute authRoles api.access apiService apiConfig publicRuntimeConfig localFirstRuntimeConfig apiOperations apiProduction databaseRetry casesEvaluateAuth --json` | Cópia isolada; PGlite/mocks, conforme cada teste. | Primeira execução: 24 suites (22 aprovadas, 2 falharam), 253 aprovados, 6 falhos, por `spawn EPERM` em `apiProduction` e `publicRuntimeConfig`; sem falhas funcionais demonstradas nessa tentativa. Repetição escalada apenas de `apiProduction.test.js` e `publicRuntimeConfig.test.js`: exit 0, 2 suites/21 testes aprovados, 45,94 s. Log `focused-recovery.log`. |
| `npm run test:postgres:api` | Worktree atual; PostgreSQL real em container de teste isolado/tmpfs, role restrita e schema preparado pelo runner. | Exit 0; 10 suites de contrato, 70 aprovados, 1 skipped (teste de role explicitamente condicional), ~104,1 s. Inclui `postgresApi.integration` 8 testes e contratos de API, contas, auth, links e autorização. Isso valida D4.4 F3 selecionado, não a produção nem todos os requisitos D4.2. Log `%TEMP%\D4.2-current-postgres-api.log`. |
| `npm run test:e2e -- local-first.spec.js auth-continuity.spec.js runtime-config.spec.js api-origin.spec.js settings.spec.js pwa.spec.js diagnostic.spec.js diagnostic-result.spec.js flashcards.spec.js review-deck.spec.js mistakes-center.spec.js study-sprint.spec.js labs.spec.js cases.spec.js simulator.spec.js pomodoro.spec.js --reporter=list,json` | Cópia isolada; Chromium/Playwright; config sintética local-first, sem API/Google reais. | Exit 1; 27/30 passaram. 3 falhas detalhadas na seção 5; execução ~197,76 s. Tentativa inicial sem escalada falhou no bootstrap por `spawn EPERM`; a repetição completou os specs. |
| `npm run build` | Cópia isolada; local-first sem endpoint e sem Client ID. | Exit 0; banco de questões validado; auditoria de segredos pública PASS. |
| `npm run build` | Cópia isolada; hybrid com `fixture.apps.googleusercontent.com` e `https://api.example.test`; depois `assertPublicConfigArtifact('./public/js/runtimeConfig.js', process.env)`. | Exit 0; auditoria de segredos PASS; artefato híbrido confere com configuração sintética (assert PASS). Nenhum segredo real. |
| `node ../probes.mjs` | Cópia isolada; API Express + PGlite real em memória; usuário/sessão sintéticos; encerra DB durante a execução. | Script terminou; 7 de 15 expectativas funcionais avaliadas falharam. Evidências detalhadas abaixo; não substitui suíte automatizada. Resultado JSON em `%TEMP%\D4.2-validation-bac0b276ba85455e852d0665eb96f7d7\probes.json`. |

Os três suites E2E que falharam não foram repetidos com alteração de fonte ou fixture. Os 57 skipped na regressão integral não são contados como aprovação. O estado PostgreSQL foi registrado separadamente de PGlite e dos mocks; login Google real não foi executado.

## 5. Cenários funcionais, falhas e impacto

**Comportamentos aprovados nesta execução:**

- Entrada local sem API e sem autenticação; progresso sobrevive ao reload; estudo offline e conteúdo de PWA continuam acessíveis.
- Namespaces separados por certificação e identidade; troca A→B e retorno A→A cobertos em E2E; logout não remove namespaces locais.
- Link local pending/completed, escopos do vínculo, retomada e conflito exercitados pelos testes de unidade/API e E2E. Os 20 escopos foram contados em runtime.
- Sessão restaurada, expiração/inatividade e roles cobertas por testes. Autorização e recusa de usuário inativo exercitadas localmente; 401/403 têm cobertura nos testes de auth/roles. Novo dispositivo hidratou estado de Jornada pela API PGlite.
- `/api/health` permaneceu 200 e `/api/ready` passou a 503 depois que PGlite foi fechado. PostgreSQL real: 70 contratos atuais aprovados, inclusive startup restrito/sem DDL conforme suíte F3.
- Builds sintéticos local-first e híbrido passaram; testes runtime de Pages sob subpath, configuração Google/API e service worker passaram no E2E selecionado.

**Falhas/limites reproduzidos:**

1. **Indisponibilidade confundida com sessão inválida (impacto alto):** depois de fechar PGlite, `/api/ready` retornou 503, porém uma chamada autenticada (`/auth/me`) retornou 401. O cliente classificou a falha como sessão expirada e removeu o token. O identificador de conta e o progresso local permaneceram, mas a sessão foi descartada e pode exigir novo login. Não satisfaz o contrato de continuidade em falha transitória. A sonda exercitou PGlite; a regressão PostgreSQL aprovada não cobre necessariamente a mesma corrida de DB fechado no cliente.
2. **Merge de Labs perde dado remoto:** `reconcileModuleState('labs', {completedLabIds:['local']}, {completedLabIds:['remote']})` devolveu apenas `['local']`. A sincronização contra API/PGlite também deixou apenas o ID local na leitura remota posterior. Um progresso remoto pode desaparecer do estado reconciliado.
3. **União de eventos XP incompleta:** eventos XP local/remoto produziram apenas o evento local. A reconciliação global de gamificação falha adicionalmente por incompatibilidade de escopo: `PUT /api/me/state/gamification` com `certId: null` retornou 400, pois a rota exige certificação para módulos que não sejam preferências.
4. **Hooks de sync sem consumidor API correspondente:** `DataRepository` tenta opcionalmente `syncQuizResult`, `syncGamification` e `syncFocusSession`, mas os métodos não existem no `ApiService`. Esses fluxos permanecem locais; não há prova de envio remoto por tais hooks.
5. **Aviso de sessão cobre controles na interface:** E2E de configurações e resultado de diagnóstico expirado falharam por timeout; o elemento fixo `#auth-session-notice` interceptou o clique em `#settings-btn-save` e `#btn-next`. Isso bloqueia ações em cenários com aviso visível.
6. **Deck de revisão não habilita ação esperada:** E2E `review-deck.spec.js` esperava `#review-deck-mastered-btn` habilitado, mas recebeu botão desabilitado. A causa exata de estado/setup não foi alterada nem isolada; comportamento segue pendente.
7. **Autenticação externa não comprovada:** primeiro login Google, recuperação real de conta existente e validade externa de tokens foram testados com verificador mockado. Testes de UUID/role/sessão comprovam o contrato interno, não integração OAuth com Google.
8. **Novo dispositivo:** hidratação de Jornada via API PGlite foi aprovada, mas não comprova recuperação universal de todos os módulos nem setup operacional de uma instalação publicada.

## 6. Cobertura por módulo

Classificação: **A** local-only; **B** sincronização implementada e validada; **C** parcial; **D** contrato incompatível; **E** não implementado. O vínculo local v1 cobre apenas seus 20 escopos e não transforma outros domínios em sincronização integral.

| Módulo | Estado | Evidência e limite |
|---|---|---|
| Diagnóstico | C | Resultado/histórico local e persistência local aprovados; estado de diagnóstico tem caminhos de sync/versionamento. E2E do diagnóstico final falhou por overlay de sessão, portanto o fluxo completo não ficou verde. |
| Erros | B no escopo vinculado | Persistência e sincronização de estado cobertas por accountSync/progressSync e pelo link por certificação; corridas selecionadas passam. |
| Flashcards e revisão | C | Flashcards e troca de certificação passaram E2E; ação “Já domino�? não passou no deck e estado de revisão não foi provado de ponta a ponta. |
| Jornada | B no escopo vinculado | Escrita/hidratação remota, versionamento e nova instalação foram testados. Não equivale à migração de todos os módulos. |
| Sprint | B no escopo vinculado | Estado coberto pelo progresso sincronizável e spec de sprint local passou; requerimentos globais além do snapshot não demonstrados. |
| Labs | C | Endpoint/estado existe e E2E local de conclusão/reload passou; união de `completedLabIds` comprovadamente descarta remoto. |
| Gamificação e XP | D para sync global; A/C no restante | Evento XP fica local na reconciliação; PUT global com certificação ausente retorna 400. Não classificar XP como sync operacional. |
| Histórico de simulados | A | Histórico offline/local; `syncQuizResult` opcional sem implementação no ApiService/endpoint comprovado. Não há sync validada. |
| Cases | A para progresso pessoal | Catálogo/avaliação HTTP e autorização de case têm contratos e testes próprios; isso não comprova sincronização de progresso/histórico pessoal de case. E2E de cases passou. |
| Pomodoro | A | Sessões locais; hook `syncFocusSession` não existe em ApiService. E2E local do Pomodoro passou. |

## 7. Configuração, publicação e evidência externa

O código de configuração pública foi exercitado em builds locais com variáveis explícitas. O local-first produziu config sem API; o híbrido incluiu somente Client ID sintético e URL de teste, e a auditoria de segredos passou em ambos. Testes `publicRuntimeConfig` validaram rejeição de configuração inadequada. O E2E cobriu runtime config e rotas de Pages sob subpath e service worker local.

Isso não prova o artefato que está publicado, a disponibilidade da API de produção, OAuth autorizado no Google Console, domínio/HTTPS operacional, nem backup/restore. Não houve consulta ou alteração de Railway, volume, Pages, S3 ou Google Console nesta validação. A publicação continua fora do escopo e exige autorização própria.

## 8. Dependências D4.4

- **F1/F2:** suas aprovações e testes reais de migrations pertencem à trilha D4.4 e não foram reexecutados como critério D4.2 neste relatório. A execução PostgreSQL atual consumiu o runner F3 e suas migrations previamente preparadas; os 57 testes desativados na suíte completa continuam separados.
- **F3:** validado agora em PostgreSQL real de teste (70 aprovados, 1 skipped) e útil para provar compatibilidade local da API. Não migra dados PGlite, não muda o runtime publicado e não resolve sozinho sincronização global de módulos.
- **F4:** dependência para hardening de concorrência/compatibilidade e condições de falha no caminho PostgreSQL antes de qualquer cutover; em particular, repetir a matriz de disponibilidade/401/503 e garantir preservação de sessão.
- **F5/F6:** qualquer etapa de migração/retomada de dados ou preparação e validação de origem que venha a ser definida depende dos critérios próprios dessas fases. Nenhum dado/usuário foi migrado nesta tarefa.
- **F7:** só ela (e autorização específica) pode sustentar troca operacional/publicação/cutover, validação da API pública e reversão. D4.2.6 não pode ser declarada operacional apenas por build local.

As dependências acima indicam relação de validação; não iniciam fases futuras nem afirmam que F4–F7 têm exatamente os objetivos acima sem a especificação aprovada de D4.4.

## 9. Critérios objetivos para encerrar D4.2

1. Recuperar e aprovar a especificação/aceite de D4.2.3 e D4.2.4, ou registrar formalmente que não pertencem ao escopo vigente.
2. Corrigir e testar indisponibilidade transitória como 503 (e preservar token, namespace e progresso); manter 401 para sessão inválida, 403 para permissão insuficiente e 409 para CAS concorrente.
3. Adicionar testes de reconciliação que comprovem união determinística/idempotente de `completedLabIds` e eventos XP local/remoto; definir se gamificação global é aceita e alinhar endpoint e consumidor, ou bloquear/documentar explicitamente o escopo local.
4. Resolver hooks pendentes de quiz, gamificação e Pomodoro, explicitando quais permanecem locais e testando que erro de rede não é tratado como progresso ausente.
5. Corrigir aviso de sessão para não interceptar controles; investigar o estado/setup do deck e obter execução E2E verde nas specs que falharam.
6. Reexecutar suíte focada e regressão pertinente após correções; todos os cenários aplicáveis aprovados ou skips justificados e listados, sem tratar skip como PASS.
7. Validar os requisitos operacionais de D4.2.5/6 em ambiente aprovado: persistência, backup e restore, probes, shutdown, HTTPS/proxy, URL pública e API disponível. Se a conclusão exigir login externo, fazer homologação Google com configuração autorizada, sem confundi-la com mocks.
8. Manter evidência separada para entrega local, execução de testes, homologação, publicação e operação. Somente publicar/cutover após autorização e fases D4.4 correspondentes; não migrar dados por inferência.

## 10. Próximas ações mínimas, em ordem de dependência

1. Fechar a lacuna documental .3/.4 e decidir quais módulos de fato entram na sincronização D4.2.
2. Tratar semântica 401/503 e preservação de sessão; adicionar caso real de falha de conexão aos testes atuais de sessão/sync.
3. Definir e implementar (ou retirar do escopo de sync) merge de Labs, eventos XP e contrato global de gamificação; declarar Quiz/Pomodoro como locais enquanto não houver contratos remotos.
4. Corrigir as duas falhas de overlay E2E e diagnosticar setup do deck; repetir focused E2E e regressão.
5. Aprovar e executar as verificações F4–F7 aplicáveis, incluindo operação/publicação apenas com autorização específica.

## 11. Estado final do Git

No início: branch `login-integracao`, HEAD `f29c95f401d86e6ad9e4c27781f6cc6565085fef`, staged/unstaged/untracked vazios. O commit contém F3 e o restante do trabalho F1/F2 permaneceu preservado. Durante a validação, um build híbrido foi inicialmente disparado por engano no worktree principal; ele alterou apenas artefatos gerados e a folha Tailwind gerada. Os cinco caminhos foram restaurados ao HEAD antes da entrega e o build híbrido foi repetido no checkout temporário.

Estado esperado após este relatório: somente `docs/audits/VALIDACAO_FUNCIONAL_D4_2.md` como arquivo novo não rastreado; nenhuma alteração staged ou de código. Não houve commit, push, deploy, reset, clean ou checkout destrutivo.