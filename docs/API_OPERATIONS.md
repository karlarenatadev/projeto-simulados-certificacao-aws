# API: contrato operacional do staging PGlite

Este contrato descreve o runtime Express/PGlite atual e a preparação de uma única máquina. Não representa publicação ou homologação AWS. A API inicia com `npm run api:start`; o pacote estático precisa ser gerado com `npm run build` antes de ser publicado.

## Runtime, bind e processo

O runtime candidato para staging é Node.js **24.21.0**, usado pelo ensaio Linux da Etapa 3. O repositório não declara `engines`; CI e publicação GitHub Pages usam Node 22, e o ambiente local desta auditoria usa Node 24.14.0. Assim, 24.21.0 é uma escolha para reproduzir a evidência de desempenho, não uma declaração de compatibilidade já homologada. O preflight exige essa versão exata; validar dependências e build nela no host Linux antes do canário.

`backend/api/config.js` configura o bind conforme ambiente: desenvolvimento PGlite normalmente usa `0.0.0.0`; `NODE_ENV=staging` ou `production` usa `127.0.0.1`; `DB_ENGINE=postgres-test` também permanece em loopback. Em staging, Nginx na mesma máquina encaminha `/api/` para `http://127.0.0.1:3001`. A porta 3001 não deve ser publicada na rede. Definir `TRUST_PROXY=127.0.0.1` (ou `127.0.0.1/32`) somente para esse proxy local; forwarded headers devem ser sobrescritos pelo Nginx. CORS restringe origens de navegadores, mas não autentica clientes nem substitui firewall/proxy.

Usar uma única réplica e um processo Node proprietário de `DB_DATA_DIR`. Não usar cluster, PM2 com workers, autoscaling horizontal, filesystem efêmero ou dois processos abrindo o mesmo diretório. PGlite é incorporado ao processo e o diretório não oferece coordenação entre instâncias.

## Variáveis e identidade

Staging exige `NODE_ENV=staging`, `DB_ENGINE=pglite`, `DB_DATA_DIR`, `AUTH_SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `AUTH_ALLOWED_DOMAINS`, `AUTH_ALLOWED_EMAILS`, `TRUST_PROXY` e `CORS_ALLOWED_ORIGINS`. Valores corporativos devem vir dos responsáveis A3Data; não usar exemplos deste documento como allowlist real.

`AUTH_ALLOWED_EMAILS` limita indivíduos autorizados e cada identidade deve estar no domínio explicitamente autorizado. Google OAuth verifica token, audience/issuer/expiração e email verificado; em staging login local por email fica desabilitado. O preflight verifica formato/configuração local, não consulta Google nem prova desligamento/revogação corporativa. O responsável pela allowlist deve remover acessos desligados; validar o fluxo de revogação e expiração no canário.

`AUTH_SESSION_SECRET` deve conter pelo menos 32 bytes de material aleatório, ser mantido em secret store aprovado e permanecer estável entre reinícios. A troca invalida sessões. Não imprimir ou incluir segredos no bundle público, logs ou Git. `GOOGLE_CLIENT_ID` é público, mas deve corresponder ao OAuth Client e às origens aprovadas no Google Console.

`POST /api/users` responde **403** quando `NODE_ENV` é `staging`/`production` ou `DB_ENGINE=postgres`; a criação anônima legada só fica disponível no ambiente local permitido. Isso é independente do endpoint de login por email, também recusado no modo hardened. Provisionamento corporativo ocorre no fluxo autenticado Google.

## PGlite, inicialização e readiness

`DB_DATA_DIR` é diretório de filesystem, não URI `memory://`. O código valida que foi configurado, mas o preflight de staging exige caminho absoluto, diretório já existente e gravável. No Linux, usar proprietário do serviço e permissões sem acesso de grupo/outros (recomendação `0700`). O preflight não cria nem corrige o volume.

No startup, a aplicação abre PGlite, aplica schema e migrations idempotentes e só então sinaliza readiness. Restart reabre o mesmo diretório; testes locais não provam que o volume AWS sobrevive à troca/falha de host. Garantir persistência e exclusividade no provedor antes do canário.

- `GET /api/health`: liveness HTTP; pode responder 200 mesmo se o banco estiver indisponível.
- `GET /api/ready`: 200 após inicialização e consulta simples do banco; durante startup, falha ou shutdown responde 503. O teste de banco tem timeout curto.

Ambos estão sujeitos ao rate limit geral, portanto usar probes espaçadas e validar limites no Nginx. O readiness não comprova identidade, backup nem conectividade externa.

SIGTERM/SIGINT/SIGHUP iniciam shutdown único: readiness negativa, servidor deixa de aceitar conexões, requisições em andamento drenam e banco fecha depois. O processo interrompe conexões restantes após cerca de 10 segundos e força saída após 15 segundos totais. O serviço do host deve permitir grace maior que 15s; o exemplo systemd usa 30s.

## Proxy e conteúdo

O template `docs/audits/staging/nginx/cloudacademy.conf.example` termina TLS, restringe a rede por uma allowlist CIDR inicialmente vazia e encaminha API somente ao loopback. O arquivo `approved-cidrs.map.example` é deliberadamente deny-all até a equipe de rede fornecer faixas aprovadas. Nginx deve sobrescrever `Host`, `X-Real-IP`, `X-Forwarded-For` e `X-Forwarded-Proto`, e o firewall deve negar acesso direto à porta Node.

Os arquivos `public/` (HTML, JS, CSS, JSON, imagens e Service Worker) são conteúdo estático acessível a quem alcança o host; autenticação da API não protege esses arquivos. Não colocar dados de usuário ou segredos no bundle. O cache offline do PWA pode conservar conteúdo estático em um dispositivo após revogação; revogação de sessão bloqueia chamadas autenticadas, mas não apaga cópias já baixadas. A restrição de rede corporativa é requisito de confidencialidade para o canário e depende da configuração real de VPN/proxy/firewall da A3Data.

## Logs mínimos

Em staging/produção, logs de request devem conter request ID gerado pelo servidor, método, rota normalizada, status e duração; erros usam classe/código sanitizado. Não registrar email, token, headers, query string, corpo, parâmetros SQL, segredo ou stack/mensagem potencialmente sensível. A aplicação não instala agente de observabilidade nem fornece métricas do host. No canário, coletar externamente ao processo CPU, RSS, heap, event-loop lag, reinicializações e readiness com ferramentas aprovadas pela A3Data, mantendo logs locais protegidos.

## Backup e restauração

O backup é **offline**: parar a API, aguardar saída e confirmar que nenhum outro processo abre o diretório. `scripts/operations/backup-pglite.mjs` exige `DB_DATA_DIR` absoluto, `BACKUP_OUTPUT_DIR` preexistente fora do diretório (inclusive após resolução de symlinks) e `BACKUP_AGE_RECIPIENT`. O diretório externo deve ser criado antes; o script não cria diretórios que poderiam atravessar symlinks até o banco. Executa `syncToFs`, `dumpDataDir("gzip")`, fecha PGlite e criptografa com `age`; publica um arquivo novo sem sobrescrever nome existente e remove o parcial após erro. A chave privada permanece separada do host/destino.

O dump compactado é mantido em memória e a versão atual ainda lê o artefato criptografado inteiro para calcular SHA-256; o pico de RAM do backup não foi medido e deve ser medido em staging sintético antes de janela de backup curta. O script não detecta por si só outro processo usando o banco: parada e exclusividade são pré-condições operacionais.

`scripts/operations/verify-pglite-backup.mjs` exige artefato criptografado, identidade `age` autorizada e um caminho absoluto de restauração que ainda não exista. Descriptografa em memória, abre em diretório novo e verifica tabelas esperadas, contagens e consulta simples; mantém o diretório restaurado para inspeção. Isso não compara contagens com um manifesto de origem nem prova restauração de host AWS. Após validação, remover o diretório sintético conforme o procedimento controlado local; nunca apontar para o volume ativo.

Retenção, destino externo, chaves, custódia, teste periódico, RPO e RTO dependem de aprovação A3Data. Não houve ensaio criptográfico nesta máquina porque `age` não está instalado; portanto criptografia e restore não estão homologados.

## Runtime PostgreSQL separado

`DB_ENGINE=postgres` e `postgres-test` são runtimes separados, não selecionados para este contrato de staging PGlite. As instruções de migrations, pool e TLS em documentos históricos não autorizam banco externo ou cutover. Não executar runner de migrations operacional sem plano e aprovação específicos.

## Preflight local

Antes de empacotar, executar `npm run build` e `npm run preflight:staging`. O preflight verifica versão Node, configuração hardened, allowlist, segredo sem revelar valor, origem HTTPS, confiança explícita no proxy local, diretório, artefatos, templates Nginx/systemd e padrões conhecidos de credenciais em arquivos públicos. Um resultado local sem bloqueios é apenas validação estática; não testa Nginx, TLS, firewall, OAuth, IAM, volume ou AWS e não autoriza deploy. Veja `docs/audits/ETAPA4_1_CONTRATO_CANARIO_STAGING.md` para a matriz de gates.
