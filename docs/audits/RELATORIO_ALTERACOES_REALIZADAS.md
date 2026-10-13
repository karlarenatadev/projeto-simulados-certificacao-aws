# Relatório de alterações realizadas

Data: 13/10/2026 · Branch `login-integracao` · HEAD de referência `ef31404`. Mudanças locais são reversíveis e não foram commitadas. Não houve deploy, alteração de cloud, leitura de credencial real ou migração de dados.

## Correções de aplicação

| Arquivos | Problema | Alteração | Evidência |
|---|---|---|---|
| `backend/api/server.js`, `backend/api/config.js`, `backend/api/routes/auth.js`, `backend/api/routes/users.js`, `__tests__/deploySafety.test.js` | Limite global por IP bloqueava colaboradores no NAT; staging PGlite aceitava configuração/fluxos legados permissivos | Chave de rate limit usa subject apenas após verificação HMAC; fallback para IP normalizado. Configuração staging endurecida, CORS explícito aplicado também a PGlite e login/cadastro legados bloqueados | `deploySafety.test.js`: 7/7. O caso de 300 requests, 301ª rejeitada, outra conta aceita e token forjado continua sujeito ao IP passou |
| `backend/api/routes/quizzes.js`, `__tests__/deploySafety.test.js` | Indisponibilidade de DB na leitura de preferências podia virar 400 | Separada leitura do banco da validação de idioma, mantendo contrato 503 para falha de persistência | Teste dirigido confirma DB down → 503 e idioma inválido → 400 |
| `src/frontend/js/app.js`, `src/frontend/js/flashcards.js`, `e2e/flashcards.spec.js` | Listener de teclado dos flashcards era tardio e podia ser duplicado/ausente após renderização | Binding idempotente movido para inicialização do componente; removido listener tardio; E2E cobre Enter, Space, clique e reinicialização | O teste E2E direcionado passou na suíte anterior; a repetição isolada de navegação passou 4/4. A consolidação final completa aguarda execução sem bloqueio ambiental |
| `.env.example` | Texto não descrevia a allowlist CORS válida para os dois engines | Atualizada indicação de `CORS_ALLOWED_ORIGINS` | `deploySafety.test.js` e validação da configuração |

## Diagnósticos e evidências adicionadas

| Arquivo | Finalidade | Efeito/custo esperado | Limitações |
|---|---|---|---|
| `scripts/diagnostics/deploy-resource-audit.mjs` | Carga sintética local de API/PGlite, métricas de processo, consistência, dump, restart e restore | Instrumenta consumo sem dependência paga; não altera dados preexistentes e usa diretórios temporários | Reexecução depois do limiter concluiu 10/30/50 e falhou no teste 150 (131/150); não confundir fixture Windows com capacidade AWS |
| `scripts/diagnostics/frontend-resource-audit.mjs` | Mede Chromium local, heap, DOM, requests e bytes em seis telas | Identifica downloads repetidos e recursos sem ferramenta externa | Navegador offline, service worker/CDNs/API bloqueados; heap não é RSS |
| `scripts/diagnostics/aws-price-evidence.mjs` | Recupera catálogo público oficial de preços streaming para evidência | Não chama API autenticada nem gera custos de cloud | Atualidade e custos finais dependem de Calculator/conta/região/egress/impostos |
| `docs/audits/evidence/2026-10-13/*` | Logs de lint, format, build, Jest, PostgreSQL, E2E, PWA, auditoria de dependências, preços e métricas | Preserva reprodutibilidade das conclusões | JSON de auditoria npm tem formato binário no Git; conferir decodificação com Node antes de consumo automatizado |

## Validação observada

- `npm run lint`: PASS.
- `npm run format:check`: PASS depois de formatar `app.js`, `translations.js` e `login-overlay.html`; o diff de formatação em arquivos existentes é maior que o bug pontual e está refletido no build gerado.
- `npm run validate:data`, `npm run validate:pwa` e `PUBLIC_BUILD_TARGET=local-first npm run build`: PASS, incluindo auditoria de segredos no artefato.
- Jest completo: execução anterior PASS com 98 suites/833 testes e 107 skipped. Necessário repetir após limiter final.
- PostgreSQL real efêmero: F1 44 testes, F2 30, runner API F3/integrado iniciou 15 suites com os casos de concorrência/autorização e runtime operacional 12 testes; containers efêmeros verificados/removidos pelo runner.
- E2E de navegação isolado: 4/4 PASS. Suíte inteira anterior teve 54 PASS/1 timeout de sidebar sob build concorrente; novo E2E completo está em execução. A primeira tentativa final sem elevação falhou antes dos testes com `spawn EPERM`, um impedimento do sandbox Windows.
- `npm audit --omit=dev`: zero vulnerabilidades no snapshot de dependências de produção examinado.
- Carga sintética: artefato build 213 arquivos, 7.347.414 bytes, gzip aritmético individual 1.765.641 bytes; frontend Chromium capturou seis páginas e não observou recurso duplicado nessas navegações. 10/30/50 completaram na rodada pós-fix; 150 incompleto com 19 requests/fluxos não completados, demandando diagnóstico e repetição.

## Pendências mantidas sem alteração

- Bloqueio de arquivos JSON/HTML e rotas públicas pela borda corporativa; política de usuários autorizados, desativação e OAuth real dependem do IdP/owner A3Data.
- Homologação HTTPS/DNS, rede/proxy, segredo real, restore fora da VM, RPO/RTO e operação AWS.
- Qualquer cópia/cutover de dados preexistentes; F6, F7 e produção.
- Adoção produtiva de PostgreSQL: testes do `postgres-test` não são deploy e migrations continuam fora do startup.
- Alteração de esquema/runtime, migração de dados e escolha de plataforma definitiva, todos dependentes dos critérios no checklist Go/No-Go.

Nenhuma dependência foi removida: a auditoria não demonstrou ausência de consumidores com evidência suficiente. Não declarar redução quantitativa de custo ou melhoria de desempenho; os relatórios separam medição local, projeção e itens não medidos.

## Etapa 2 addendum: local PGlite staging preparation

Identity, API, and frontend changes, local diagnostics/backup scripts, and Nginx/systemd templates are detailed in [ETAPA2_STAGING_PGLITE.md](ETAPA2_STAGING_PGLITE.md). Tests were added for allowlisting, immediate revocation, anonymous content access, and authenticated Cases requests. Docker/Linux benchmarking under a 2 vCPU/4 GiB cgroup used synthetic fixtures only: 10/30/50/150 and 30 users behind one IP completed without errors or duplicates; p99 at 150 was 28.8 s, so this does not demonstrate an acceptable SLO. Crash testing confirmed committed data survived, an open transaction rolled back, and writes worked after recovery; it did not simulate disk/host failure. The encrypted backup utility requires `age`, unavailable in this environment, and passed syntax validation only; actual encryption, external copy, and encrypted restore remain pending. No AWS installation, infrastructure change, real-data access, or migration occurred.

Etapa 2 final validation: full Jest 98/98 suites (841 pass, 107 conditional skips), E2E 55/55, F3 PostgreSQL, and focused post-format regressions 77/77 passed. The local Linux functional matrix does not accept 150 concurrent users: p99 28.8 s. Backup encryption/off-host restore, Nginx/TLS, enterprise network/identity and AWS candidate measurements remain unvalidated. Full evidence: [ETAPA2_STAGING_PGLITE.md](ETAPA2_STAGING_PGLITE.md).
