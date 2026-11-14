# Checklist Go/No-Go de deploy

Data de corte: 13/10/2026 · checkout `login-integracao` (`ef31404`). Este checklist diferencia build e testes locais de acesso corporativo e homologação. Nenhuma etapa desta auditoria acessou produção ou criou recursos AWS.

## Pronto

- Build `local-first`, auditoria de segredos públicos e `npm run validate:pwa` passaram no checkout.
- Dados versionados passaram em `npm run validate:data`: 2.538 questões, 25 cases, 18 Labs, 241 serviços e demais catálogos sem erros ou lacunas reportadas.
- Lint e `format:check` passaram; Jest completo teve execução aprovada de 98 suites e 833 testes, com 107 testes condicionais ignorados. A rodada precede alguns retestes; consultar `AUDITORIA_DEPLOY_LOW_COST_AWS.md` e logs.
- Contratos F1/F2/F3 e runtime operacional PostgreSQL passaram em PostgreSQL efêmero real. São evidência de adaptador/API e não de migração ou deploy.
- PGlite: testes sintéticos locais completaram 10/30/50 usuários com persistência, dump/restore em diretório temporário, reinício gracioso e sem respostas duplicadas. Após alteração no rate limit, o ensaio de 150 teve apenas 131/150 completações; não é aprovado.
- Rate limit agora considera `sub` apenas de token validado e possui teste para limite, usuário paralelo e token adulterado. As leituras de perguntas e parte dos dados continuam públicas.
- Rotas de login e provisionamento legados são recusadas em staging/produção; configuração de PGlite endurecida para staging; erro de banco ao iniciar quiz mapeia a 503; listener de flashcards corrigido.
- Navegação E2E isolada passou 4/4. A suíte E2E completa ainda requer resultado consolidado após executar sem bloqueio ambiental.

## Bloqueado

- **Staging com funcionários reais e produção:** não liberar enquanto arquivos estáticos, JSONs e endpoints públicos não estiverem atrás de controle corporativo de acesso que também cubra HTTP direto. CORS, frontend autenticado e domínio Google não cumprem esse requisito.
- Política de elegibilidade individual e desligamento: determinar IdP/grupo/allowlist aprovado. Domínio de email e `email_verified` não são allowlist de colaboradores autorizados.
- Credenciais de OAuth, domínio, TLS e sessão: configurar no ambiente autorizado, HTTPS obrigatório, segredo forte fora do repositório, logout/revogação e expiração testados.
- Banco e dados reais: identificar a origem, volume e owner; definir cópia consistente, checksum/contagens, destino preservado, rollback e aprovação. Nenhuma base real foi aberta ou migrada.
- Recuperação operacional: produzir backup fora da falha do host, retenção/acesso, restore validado em destino separado, RPO/RTO acordados e exercício registrado. Snapshot da mesma VM sozinho não é recuperação suficiente.
- Acesso administrativo: confirmar contas individuais mínimas para ADMIN/VALIDATOR, bootstrap seguro e auditoria de operações privilegiadas.
- Homologação de rede, custo e operação: confirmar proxy/VPN/egress da A3Data, TLS/DNS, alarmes de gasto existentes, patching, responsável e runbook.

## Precisa de validação

- Reexecutar Jest completo e E2E completo no estado final das correções; o Jest registrado passou antes do último ajuste de limiter. Corrigir ou classificar a falha/timing com evidência, sem aumentar timeouts por conveniência.
- Repetir carga em Linux/ARM no candidato AWS: login sintético, carga lazy de questões, 10 respostas, finalização, dashboard/progresso; 10/30/50 e 150 como estresse. O ensaio local de 150 pós-fix falhou parcialmente.
- Medir CPU/RAM/RSS/heap/external, créditos T4g, event-loop, disco/IOPS, p50/p95/p99, 4xx/5xx, throughput, startup e restauração no host alvo. Fixar SLO e limite máximo de custo antes de ampliar usuários.
- Executar ensaio prolongado (soak) e carga com usuários A/B para provar isolamento transversal por `userId`, certificação e perfil em todo endpoint de leitura/gravação.
- Validar rate limit atrás do proxy realmente usado, headers de encaminhamento, CORS final, CSRF/cookies aplicáveis, logs sem tokens/PII e erros de indisponibilidade sem perda do estado local.
- Decidir PGlite de único processo versus PostgreSQL 16 local com base nos critérios de concorrência, recuperação e medições. PostgreSQL `postgres-test` não é runtime produtivo.
- Confirmar preço final no AWS Pricing Calculator, franquia egress, allowance regional Lightsail, impostos, IPv4, backup, custos organizacionais e região aprovados.
- Testar rollback de release sem remover o diretório de dados e atualização do PWA/cache com duas versões reais de build.

## Não necessário nesta etapa

- RDS (restrição explícita), Kubernetes/EKS/ECS/Fargate, NAT Gateway, ALB, Redis/ElastiCache, DynamoDB e Iceberg como banco operacional.
- S3 + CloudFront enquanto o acesso privado dos objetos não estiver resolvido e não houver medição que justifique separar frontend.
- Stack paga de APM/analytics. Usar monitoramento já contratado e métricas básicas; não suprimir alerta operacional para reduzir custo.
- HA multi-AZ ou escala horizontal sem requisito/SLO demonstrado; PGlite local não pode ser compartilhado entre múltiplos processos/hosts.

## Critérios verificáveis

### Liberar staging sintético

1. Uma instância descartável com dados sintéticos, sem credencial de produção e sem volume de origem real.
2. Ingress HTTPS restrito a testers autorizados na borda; validar que URL direta de HTML, JSON e `/api` recebe negação quando fora da rede/identidade aprovada.
3. Segredos injetados fora do Git, `NODE_ENV=staging`, readiness passa, shutdown gracioso e logs sanitizados.
4. Smoke de login, expiração, logout, A/B, roles, simulado, respostas, resultados, Labs, progresso e modo local sem conta; testes de regressão e build final verdes.
5. Backup realizado e restaurado em destino temporário distinto, com contagens/checksum aceitos e duração registrada; release anterior pode voltar sem tocar DB.
6. Limites de carga, erro e custo definidos; ensaios no Linux aprovado e runbook de restauração disponível.

### Liberar produção com dados pessoais

1. Todos os critérios de staging mantidos; owner de negócio e Segurança aprovam elegibilidade, classificação e retenção de dados.
2. Login prova membership individual e revogação; dois usuários não acessam progresso, resultados, perfil ou dados administrativos entre si.
3. Teste integrado Browser → HTTPS ingress → Express → banco operacional com recovery comprovado. Se PostgreSQL escolhido, provisionamento/schema feito fora do runtime e role online sem DDL; se PGlite, confirmar processo único e recovery compatível.
4. Cutover somente após inventário e ensaio de migração em cópia, comparação de contagens/checksums, critérios de reconciliação, janela, owner e rollback aprovados. A fonte fica preservada conforme política da empresa.
5. Backup fora do host com retenção e acesso testados, restauração periódica agendada, RPO/RTO aceitos, patch/monitoramento e controle de custo com responsável nomeado.
6. Aprovação formal de operação, Segurança e dono do produto, seguida por release controlado. Este relatório não autoriza nem executa deploy.

## Etapa 2 update (13/10/2026)

The previous load statement above is superseded by [ETAPA2_STAGING_PGLITE.md](ETAPA2_STAGING_PGLITE.md): synthetic Linux tests under a 2 vCPU/4 GiB cgroup completed 10, 30, 50, and 150 distinct-IP users plus 30 shared-IP users with zero errors/duplicates. The 150-user stress run has p99 28.8 s and is not an accepted SLO. Current local code implements exact employee-email allowlisting in staging/production, immediate per-request revocation, protection for question/case/service/leaderboard reads, and loopback binding. Synthetic staging is code-ready, but operational No-Go pending corporate identity/allowlist, network CIDRs, hostname/TLS, Nginx validation on Linux, and encrypted off-host backup/restore. Production remains No-Go pending those items plus employee account lifecycle, offline-cache confidentiality decision, backup RPO/RTO, real-host soak/load, and owner signoff.

## Final test update

Etapa 2 final validation supersedes the earlier pending entries above: full Jest passed 98/98 suites (841 passed, 107 conditional skips); the 9 focused security/API/Case suites passed again after formatting (77/77); Playwright passed 55/55 including `navigation-smoke`; and the isolated real-PostgreSQL F3 runner passed and removed its container. A final `local-first` build, PWA validation and data validation passed. These are local/synthetic results, not a production or AWS homologation.
