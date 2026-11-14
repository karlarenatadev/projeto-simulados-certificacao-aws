# Etapa 4.1 — Contrato do canário de staging PGlite

Data da verificação: 15/10/2026. Escopo: preparação local, runbook e guards reproduzíveis. Não houve deploy, acesso a serviço corporativo, alteração de credencial ou recurso AWS.

## Resumo executivo

O HEAD continua em `login-integracao` (`94a7684e4a0f448ab244d801c43c4e4d2f3850ec`), mesmo commit da Etapa 4. O contrato foi reconciliado com o código: staging hardened faz bind loopback, bloqueia criação anônima com HTTP 403 e usa Node 24.21.0 como runtime candidato por ser a versão do ensaio Linux da Etapa 3. Foram adicionados preflight estático fail-closed e testes sintéticos; logs de request do runtime PGlite hardened agora carregam o contexto operacional estruturado. O backup impede saída resolvida dentro do banco, publica sem sobrescrever e limpa parciais em falha.

**Decisão:** GO para preparação local e avaliação do contrato; NO-GO para implantação AWS e para usuários reais. O comando preflight executado neste Windows retornou `BLOCKED`, como esperado: Node 24.14.0, sem ambiente staging corporativo, allowlist, origem/proxy e CIDRs aprovados. Isso não é uma falha inesperada do código; demonstra que configurações operacionais ausentes não são aceitas silenciosamente. Sem `age` e sem host Linux, criptografia/restore e permissões Linux não foram homologados.

## Estado inicial e final do Git

Inicial: branch `login-integracao`, HEAD acima. Já existiam antes desta etapa `M scripts/diagnostics/run-stage3-linux.ps1` e `?? docs/audits/ETAPA4_PRONTIDAO_STAGING_AWS.md`; ambos foram preservados. Não foi feito reset, clean, commit, push, merge ou deploy.

Final: os arquivos novos/alterados desta etapa são os listados ao fim do documento. O build atualizou artefatos sob `public/`; os artefatos gerados rastreados foram restaurados ao estado versionado após a execução. As duas alterações preexistentes continuam preservadas. Confirmar `git status --short --branch` antes de qualquer próxima execução, pois o diretório é compartilhado e pode receber mudanças externas.

## Correções realizadas

| Arquivo                                    | Alteração e evidência                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/API_OPERATIONS.md`                   | Substitui instruções contraditórias de Node/bind/POST `/api/users` e backup. Consolida o runtime PGlite atual, readiness, shutdown, identidade, conteúdo estático e limite de validação.                                                                                                                                                  |
| `scripts/operations/staging-preflight.mjs` | Verifica configuração hardened, Node 24.21.0, allowlist, segredo sem imprimi-lo, Client ID em formato, HTTPS, confiança explícita no proxy local, diretório PGlite absoluto e acessível, artefatos, contrato Nginx/systemd, placeholders de rede e padrões de credenciais nos arquivos públicos. Não altera arquivos nem autoriza deploy. |
| `package.json`                             | Adiciona `npm run preflight:staging`.                                                                                                                                                                                                                                                                                                     |
| `__tests__/stagingPreflight.test.js`       | Testa fixture sintética válida, bloqueio de configuração/runtimes inválidos, proteção de segredo e bloqueio de placeholder/credencial pública.                                                                                                                                                                                            |
| `backend/api/server.js`                    | Ativa logs estruturados sanitizados também para PGlite em staging/production; preserva logs de desenvolvimento. Erros hardened mantêm classe/código estável, sem mensagens SQL/terceiros.                                                                                                                                                 |
| `__tests__/deploySafety.test.js`           | Regressão valida request ID, rota, status, duração e ausência de query/token em log PGlite staging.                                                                                                                                                                                                                                       |
| `scripts/operations/backup-pglite.mjs`     | Exige diretório destino absoluto e preexistente, valida caminho resolvido fora do banco, publica por hard link exclusivo (falha se o destino existir) e remove parcial em falha. Evita criar pastas através de symlink que poderia apontar ao banco.                                                                                      |
| `__tests__/pgliteBackupSafety.test.js`     | Confirma que restore recusa diretório existente antes de invocar `age` e que backup recusa configuração ausente antes de abrir banco.                                                                                                                                                                                                     |

O preflight exige o diretório de dados preexistente; não cria nem modifica volume. Em Windows, valida existência/acesso, mas não atesta propriedade ou modo Unix. Linux target ainda deve demonstrar dono correto e modo recomendado `0700`.

## Contrato operacional consolidado

`backend/api/config.js` retorna bind `127.0.0.1` em staging e produção; modo de desenvolvimento PGlite retorna `0.0.0.0`. Nginx no mesmo host encaminha API ao loopback. Não abrir 3001 no firewall. Para esse desenho, `TRUST_PROXY=127.0.0.1` é explícito e encaminhamento precisa sobrescrever os headers. CORS permanece uma política de navegador, não uma barreira de autenticação.

Node 24.21.0 é a proposta única para o canário porque coincide com o ensaio Linux reportado na Etapa 3. `package.json` não fixa `engines`; CI e Pages usam Node 22 e o host local atual é Node 24.14.0. Compatibilidade sob Node 24.21.0 ainda precisa ser validada no Linux de homologação. O preflight não confere a compatibilidade binária de dependências além da versão indicada.

`DB_ENGINE=pglite` e `DB_DATA_DIR` absoluto em disco persistente; processo único/exclusivo; startup aplica schema/migrations; restart reabre o diretório; readiness só fica positiva após inicialização e verificação básica do banco. Código local não prova ciclo de vida do volume AWS. Shutdown entrega até 10s de drain e 15s totais; serviço do host deve conceder mais (template: 30s).

`POST /api/users` é negado com 403 se `DB_ENGINE=postgres` ou `NODE_ENV` for `staging`/`production`; login local por email também fica desabilitado em modo hardened. Google OAuth precisa de Client ID e origens configurados no Google Console e allowlist individual aprovada. Verificação estática não detecta funcionário desligado sem sincronização corporativa; a A3Data precisa designar mantenedor e rotina de revogação.

Arquivos servidos em `public/` são acessíveis a clientes que alcançam o Nginx. Não incluir dados particulares nesses arquivos. PWA pode conservar arquivos estáticos já baixados mesmo após revogação; sessão/API autenticada é revogável, cache offline não é apagável remotamente. Portanto hostname/rede e política de dispositivos continuam gates de confidencialidade.

Health é liveness HTTP; readiness inclui banco e startup. Ambos têm rate limit geral. Logs hardened passam a registrar request ID, método, rota normalizada, status, duração e erro categorizado; sem query, payload, token, email, SQL ou stack. Aplicação não coleta CPU/RAM/event-loop: isso requer mecanismo de host aprovado, ainda a escolher.

## Preflight e evidências

Execução local: `npm run preflight:staging` → exit 1, `status=BLOCKED`, `deployAuthorized=false`. Bloqueios observados: Node 24.14.0 versus 24.21.0; `NODE_ENV` atual não é staging; allowlist não operacional; par HTTPS/proxy local incompleto; placeholders e nenhuma faixa ativa de rede aprovada. Passaram: formato de dois domínios vindo do ambiente carregado, sintaxe do Client ID, forma/diversidade do segredo (sem valores impressos), diretório local acessível no Windows, artefatos `index.html`, `manifest.json`, `sw.js`, contrato estático Nginx/systemd e scanner de credenciais públicas. Isso não comprova propriedade corporativa dos domínios, validade OAuth nem custody/entropia do segredo.

O preflight contém `deployAuthorized:false` inclusive no caminho de sucesso. A fixture unitária usa apenas caminhos/identidades sintéticos em diretório temporário e injeta modo Linux; não chama rede ou AWS. O teste de backup testa guards antes de qualquer criptografia. Não foi executado backup real porque `age` está ausente; não houve restore nem medida de pico de RAM. Não foi possível executar `nginx -t`, systemd ou smoke Linux nesta estação Windows.

## Testes e validações

Executados:

- `npm test -- --runInBand --silent --runTestsByPath __tests__/stagingPreflight.test.js __tests__/pgliteBackupSafety.test.js __tests__/deploySafety.test.js __tests__/apiOperations.test.js`: 4 suítes, 41 testes aprovados.
- `npm run lint`: passou.
- `npm run format:check`: passou.
- `node --check` em preflight, backup e `backend/api/server.js`: passou.
- `npm run build`: terminou e auditoria de segredo público passou; artefatos gerados rastreados foram restaurados depois.
- `git diff --check`: passou.
- `npm run preflight:staging`: bloqueado por motivos descritos acima, sem revelar valores secretos.

O primeiro teste completo dentro do sandbox apresentou 3 suítes com falhas por `spawn EPERM`/inicialização de processo (além de 96 aprovadas e 8 ignoradas). A execução completa autorizada fora do sandbox passou: `npm test -- --runInBand --silent` → **100 suítes aprovadas, 8 ignoradas; 847 testes aprovados, 107 ignorados, 0 falhos**. E2E, `nginx -t`, ensaio age, restore isolado e Linux preflight não foram realizados por ausência de ambiente/ferramentas. Nenhuma repetição de carga foi necessária: esta etapa não alterou carga, queries nem capacity; não repetir 150 usuários evita ensaio sem motivação.

## Backup: limites e decisão

O dump continua offline e exige parar API e confirmar exclusividade. O script usa mecanismos de dump do PGlite instalado, `syncToFs()` e `dumpDataDir("gzip")`; criptografia via `age` é etapa externa. A saída precisa ser enviada posteriormente a destino aprovado, fora do host; chave privada não deve residir junto ao backup. Retenção, custódia e procedimento de restore exigem política A3Data.

A publicação agora não substitui um nome existente e uma saída cujo caminho real caia dentro do banco é recusada. O fluxo ainda mantém archive descompactado comprimido em Buffer e relê o arquivo cifrado para SHA-256, podendo manter múltiplas cópias na RAM. Não há medição de pico. O próximo teste de backup deve usar DB sintético e volume novo; avaliar streaming somente se perfil real justificar.

## Matriz de decisão A3Data

| Dependência                                                   | Responsável sugerido     | Decisão/valor exigido                                        | Evidência de aprovação                                                | Teste dependente                                                  |
| ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Conta AWS, região, Lightsail ou EC2 e teto mensal             | Cloud/FinOps             | Selecionar conta/região/opção e autorizar custo              | Registro de arquitetura/orçamento                                     | provisionamento autorizado e inventário de custos                 |
| Hostname, DNS, certificado TLS, firewall e caminho de entrada | Infra/Network/Security   | Nome, certificado, CIDRs VPN/proxy e regra que bloqueia 3001 | Change aprovado, teste de rota/IP e `nginx -t`                        | curl TLS/rede permitida e negada; tentativa direta à 3001 falha   |
| OAuth Google                                                  | IAM/Workspace            | Client ID, origens/redirect URI e política de consentimento  | Configuração no console corporativo revisada                          | login permitido e token/origem inválidos negados                  |
| Allowlist individual e desligamento                           | Dono do produto + RH/IAM | Mantenedor, fonte de verdade, frequência/SLA de revogação    | Lista autorizada controlada sem publicação de PII e processo assinado | permitido, fora da lista, desligado, desativado e sessão expirada |
| Segredos e acesso administrativo                              | Security/Platform        | Secret store, operadores e rotação                           | Registro de custódia/permissão                                        | auditoria de acesso e rotação controlada                          |
| Volume, backup externo e chaves                               | Infra/Backup/Security    | volume persistente, criptografia, retenção, chave/custódia   | política e job aprovados                                              | age backup/restore isolado, checksum e readiness após restauração |
| RPO, RTO, SLO e alertas                                       | Product owner + SRE      | Aprovar limiares e escala de resposta                        | SLO/RPO/RTO e runbook incidentes                                      | soak e exercício de falha/restore atendem aos limiares            |
| Dispositivos e cache offline                                  | Security/Product         | Aceitação de conteúdo estático offline, gestão de endpoints  | avaliação de risco e política de dispositivos                         | login revogado bloqueia API e UX de cache é aceita                |

Não há configuração permissiva de rede, identidade, segredo ou custo como alternativa aos gates acima.

## Checklist de homologação futura e Go/No-Go

1. Obter aprovações da matriz, criar ambiente isolado de staging por change autorizado e inserir somente dados sintéticos.
2. No Linux x64 alvo, instalar Node 24.21.0, dependências travadas e validar `npm ci`, lint, testes, build, preflight e `nginx -t`; conferir modo/dono do volume.
3. Criar diretório PGlite novo persistente; iniciar um único processo via systemd; validar logs sanitizados, `/api/health`, `/api/ready`, bind loopback e porta 3001 inacessível externamente.
4. Validar TLS/rede, frontend, Google OAuth, usuários allowlisted/não allowlisted e revogação, rotas protegidas e `POST /api/users` 403.
5. Rodar harness isolado do servidor, 10/30/50/150 simultâneos em repetições independentes; 150 é estresse. Para 30 usuários, soak mínimo 30 minutos e medir p50/p95/p99, RPS, erros, CPU, RSS/heap, event-loop lag, I/O, reinícios e integridade dos registros. Critérios propostos da Etapa 3 (p95 ≤1,5s, p99 ≤3,5s, RSS ≤1,5GiB e zero falha/perda/duplicação) precisam de aprovação do produto antes do aceite.
6. Com DB sintético, validar backup `age` externo, hash, restauração em caminho novo, consistência dos dados, restart normal e recuperação após falha de processo/host. Verificar persistência após evento real controlado do volume; definir e comprovar RPO/RTO.
7. Go apenas se cada gate aprovado, critérios funcionais/performance/persistência/segurança passarem e rollback/operadores estiverem prontos. Qualquer falha de identidade/rede, exposição de porta, backup/restore, volume, dados ou SLO é No-Go. Sem valores aprovados não existe aprovação implícita.

## Riscos remanescentes

- Sem prova em AWS de persistência/recuperação de volume, rede corporativa, TLS, firewall ou IAM.
- Sem execução real de OAuth/revogação com contas A3Data.
- Sem verificação age cifrada/restore e sem pico RAM de backup.
- Preflight valida forma e arquivos, mas não executa Nginx/systemd, não prova secret-store, OAuth nem validade de CIDR.
- Limiares de latência da Etapa 3 são candidatos e dependem do Product Owner.
- Cache offline pode conservar conteúdo estático após desligamento; requer decisão de risco/dispositivos.
- Uma instância/processo PGlite é limite deliberado; falha do host interrompe serviço até recuperação.

## Próxima execução recomendada

Próxima atividade técnica: **homologação local/Linux reproduzível do canário sem AWS**, em runner descartável x64 com Node 24.21.0 e `age` disponível: executar preflight com fixture de staging sintética, `nginx -t` sobre configuração renderizada sem CIDRs reais, smoke local da API com diretório PGlite temporário e backup/restore age em diretórios temporários. Não iniciar deploy; só após relatório desse runner e decisões corporativas completas preparar uma change de staging para aprovação.

| Prioridade | Ação                                                | Justificativa                                                 | Responsável sugerido    | Evidência necessária                                     | Condição de conclusão                                  |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------- | ----------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| P0         | Aprovar rede, OAuth e allowlist/revogação           | Sem perímetro e identidade corporativa não aceitar pessoas    | Security, IAM e Network | change, configs revisadas, owner da allowlist            | testes permitidos/negados/revogados aprovados          |
| P0         | Aprovar persistência, backup, chave, RPO/RTO        | Estado de estudo é dado do usuário                            | Infra/Backup/Security   | política de volume e backup                              | restore sintético externo validado e RPO/RTO atendidos |
| P1         | Executar pacote em Linux x64 com Node 24.21.0 e age | Windows não valida modo Unix, Nginx, systemd nem criptografia | DevOps/SRE              | logs de npm ci/test/build/preflight/nginx/backup restore | todos os comandos e smoke aprovados                    |
| P1         | Definir SLO e aceitar critérios de carga            | Métricas Etapa 3 ainda não são compromisso de produto         | Product owner/SRE       | SLO aprovado                                             | repetições e soak atendem limites aprovados            |
| P2         | Medir pico de memória do backup                     | Dump/sha mantêm buffers em memória                            | Backend/SRE             | RSS/heap no Linux com banco sintético representativo     | pico cabe no limite operacional com folga definida     |
| P2         | Decidir política de cache offline e dispositivos    | Conteúdo estático não pode ser revogado remotamente           | Security/Product        | avaliação de risco/dispositivos                          | aceite explícito e teste UX/revogação documentado      |

Arquivos alterados nesta etapa: `backend/api/server.js`, `docs/API_OPERATIONS.md`, `package.json`, `scripts/operations/staging-preflight.mjs`, `scripts/operations/backupGuards.mjs`, `scripts/operations/backup-pglite.mjs`, `scripts/operations/verify-pglite-backup.mjs`, `__tests__/deploySafety.test.js`, `__tests__/stagingPreflight.test.js`, `__tests__/pgliteBackupSafety.test.js`, `docs/audits/ETAPA4_1_CONTRATO_CANARIO_STAGING.md`.
