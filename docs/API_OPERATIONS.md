# API: contrato operacional para o primeiro deploy (D4.2.5)

Nenhum provedor, domínio ou deploy é definido nesta etapa. A API é
`backend/api/server.js`, iniciada por `npm run api:start`. Não requer build do
frontend. Usar Node 22, uma réplica e um único processo Node proprietário do
banco. Não usar cluster/PM2 com múltiplos workers, autoscaling horizontal,
filesystem efêmero ou dois processos abrindo o mesmo diretório PGlite.

## Configuração e volume

Definir `NODE_ENV=production` explicitamente. Antes de abrir o banco/porta,
o startup valida:

- `DB_DATA_DIR`: caminho de filesystem não vazio, sem URI `memory://`.
  Montar nele um volume persistente gravável pelo usuário do processo.
  O código não consegue provar que a infraestrutura persiste o disco: isso
  precisa ser verificado na hospedagem. Preferir caminho absoluto.
- `AUTH_SESSION_SECRET`: pelo menos 32 bytes, diversidade mínima de caracteres
  e rejeição de placeholders óbvios. Gerar 32 bytes criptograficamente aleatórios
  (por exemplo `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`)
  e armazenar no mecanismo de segredos da hospedagem. Comprimento/diversidade
  não comprovam entropia; não escolher uma frase humana. Preservar o segredo
  entre reinícios; sua troca invalida sessões existentes.
- `GOOGLE_CLIENT_ID`: Client ID público válido em formato
  `*.apps.googleusercontent.com`, igual ao frontend. A configuração externa do
  Google continua exigindo verificação; o startup não a valida remotamente.
- `PORT`: inteiro entre 1 e 65535 (padrão 3001); bind em `0.0.0.0`.
- `TRUST_PROXY`, se fornecido: somente IPs/CIDRs explícitos de proxies confiáveis.

Configuração inválida encerra com código 1 e nome da variável, sem seu valor.
Desenvolvimento/testes mantêm o fallback de segredo exclusivo de teste e banco
em memória exclusivo de teste. `ALLOW_DEV_EMAIL_LOGIN=true` continua incapaz de
habilitar login por email em produção.

## HTTPS, proxy e monitoramento

Terminar HTTPS na infraestrutura e restringir acesso direto à porta Node.
`TRUST_PROXY` vazio mantém `false`. Quando a topologia for conhecida, listar
somente o proxy/subnet que realmente conecta ao processo. O proxy deve
sobrescrever os headers encaminhados; não usar `true`, contagem arbitrária de
hops nem subnets abrangendo clientes. Assim o rate limit não aceita
`X-Forwarded-For` de qualquer origem. Validar o IP observado antes de publicar.

CORS continua autorizando `https://karlarenatadev.github.io`; não é controle de
autenticação nem proteção contra clientes fora do navegador.

- `GET /api/health`: liveness, 200 enquanto o HTTP responde, inclusive com banco
  indisponível.
- `GET /api/ready`: 200 `{ "ready": true }` somente após startup/migrations,
  configuração válida e consulta `SELECT 1` bem-sucedida. Banco fechado,
  indisponível, shutdown ou consulta acima de 1 segundo: 503, sem detalhes.
- Configurar probes espaçadas; ambas continuam sob o rate limit geral de
  300 requisições/15 minutos. Não usar alta frequência a partir de um só IP.
- Disponibilizar logs e reinício automático após falha. Logs de produção
  omitem headers, corpos, tokens, paths arbitrários e mensagens/stacks de
  erros SQL/terceiros. Mantêm contexto estático e SQLSTATE quando disponível.
  Consultas/parâmetros SQL não são impressos em produção, mesmo se `DEBUG` ou
  `DB_DEBUG` forem habilitados. Fora de produção, o diagnóstico SQL opt-in pode
  conter dados pessoais; manter ambas as flags desligadas por padrão.

## Inicialização e parada

Banco vazio recebe schema; banco existente passa pelas migrations idempotentes.
O retry de abertura executa a mesma sequência, incluindo vínculos locais e a
permissão de `mistakes`. O retry não torna seguro compartilhar o volume.

SIGTERM, SIGINT e SIGHUP iniciam uma única parada: readiness negativa, HTTP deixa
de aceitar conexões, conexões ociosas fecham, requisições em curso drenam e só
depois PGlite fecha. Após 10 segundos, conexões HTTP restantes são interrompidas;
após 15 segundos totais, saída forçada com código 1 se a parada não concluiu.
Configurar grace period da infraestrutura superior a 15 segundos. Falhas fatais
usam a mesma sequência com saída 1. Reinício só deve começar após saída do processo.

## Backup e restauração

**Todo o diretório `DB_DATA_DIR` é estado persistente**, incluindo catálogo,
dados e arquivos internos do PostgreSQL/PGlite. Não copiar apenas tabelas nem
selecionar arquivos internos. O dump contém dados pessoais e deve ter controle
de acesso, criptografia e cópia externa ao volume de produção.

Procedimento consistente com o utilitário existente (janela de manutenção):

1. Drenar/parar a API e aguardar a saída. Confirmar que nenhum outro processo
   usa o banco. Não executar o utilitário sobre o volume aberto pela API.
2. Definir `RECOVERY_DATA_DIR` como o diretório existente, previamente verificado,
   e `RECOVERY_DUMP_PATH` como um arquivo novo fora desse diretório. Executar
   `node scripts/diagnostics/pglite-recovery.mjs`. Verificar exit 0 e `DUMP_BYTES`.
3. Copiar o dump para armazenamento externo protegido e registrar checksum,
   data e versão do PGlite/aplicação. Reiniciar a API e verificar `/api/ready`.
4. Testar restauração regularmente em um diretório **novo e vazio**, com a mesma
   versão do PGlite. Exemplo de script ESM executado na raiz do projeto:

```js
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = await PGlite.create({
  dataDir: process.env.RESTORE_DATA_DIR, // obrigatório: diretório novo e vazio
  loadDataDir: new Blob([await readFile(process.env.RECOVERY_DUMP_PATH)]),
});
try {
  await db.query('SELECT count(*) FROM users');
  await db.query('SELECT count(*) FROM user_module_state');
  await db.query('SELECT count(*) FROM local_identity_links');
} finally {
  await db.close();
}
```

5. Para recuperar produção: API parada, conservar o diretório original; apontar
   `DB_DATA_DIR` ao volume restaurado, iniciar e validar readiness e dados antes
   de liberar tráfego. Nunca sobrescrever o banco ativo.

O utilitário não verifica exclusividade, existência prévia do banco nem impede
sobrescrever o arquivo de dump. Esses controles são pré-condições do operador;
não houve alteração nele. Uma evolução separada pode adicionar essas guardas.
Backup offline do diretório inteiro também exige processo totalmente encerrado.

## Contratos preservados e dívidas

`POST /api/users` ainda é público. Há método `ApiService.createUser()` em
`src/frontend/js/services/api.js` e documentação pública da rota; não foram
encontrados chamadores ativos desse método no frontend atual. Login Google
cria usuários internamente por `resolveGoogleIdentity`, sem essa rota. Não é
possível excluir consumidores externos: proteção/retirada requer decisão de
compatibilidade. Proposta mínima futura: restringir o POST legado em produção,
preservando o provisionamento Google. Risco atual: criação anônima/abuso de disco.

`PUT /api/me/state/:module` continua aceitando versão omitida. O cliente público
`saveModuleState(..., version = null)` e testes de persistência cobrem o contrato
legado; o repositório atual usa versões conforme D4.2.2. Tornar versão obrigatória
globalmente exige migração de consumidores e permanece dívida técnica.

Não se alteraram OAuth, frontend, Service Worker, namespaces, regras de merge,
normalização `certId`, banco externo ou infraestrutura. A D4.2.6 deve selecionar
hospedagem que satisfaça este contrato, configurar volume/segredos/HTTPS/proxy/
probes/backup e obter a URL real para `PUBLIC_API_BASE_URL`, mediante autorização.
