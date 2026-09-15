# E0 — Auditoria de Autenticação

## Executive summary

O fluxo ativo possui dois modos:

- **Online**: frontend envia email corporativo a `POST /api/auth/login`; o backend faz `upsertUserByEmail`, consulta a role persistida e devolve um token de sessão HMAC.
- **Offline/local**: quando a API está desabilitada ou indisponível, `userManager` cria uma identidade local e persiste uma sessão no navegador.

Não foi encontrada implementação ativa de Google Identity Services/OIDC. A documentação existente descreve apenas viabilidade futura.

O BUG-001 está **CONFIRMADO**: no login online, a prova apresentada ao backend é somente um email corporativo aceito. Não há senha, Google credential, ID token OIDC ou outro fator de posse no fluxo atual.

## Arquitetura atual

```text
Usuário
  → login-overlay / email corporativo
  → AuthService.login()
  → userManager.login()
  → POST /api/auth/login
  → upsertUserByEmail()
  → token HMAC { sub: userId, exp, jti }
  → SessionManager.persist(cloudacademy_session)
  → API requests com Authorization: Bearer
  → requireAuth()
  → usuário carregado por token.sub
  → requireRole() / recurso
```

`authGuard` protege a navegação da UI; ele não substitui autorização backend.

## Development

O frontend usa `http://localhost:3001` por padrão quando a API está configurada. O backend escuta `0.0.0.0`. O fallback offline é acionado para email corporativo quando a API está desabilitada ou falha por rede.

## Test

`NODE_ENV=test` habilita o bypass `X-Test-Role` em `requireAuth`. Esse caminho cria `req.user` sintético e é usado pelos testes Jest; não é o mecanismo de produção.

## Production

O caminho esperado atualmente é `POST /api/auth/login` com email `@a3data.com.br` ou `@a3data.com`, seguido de Bearer token HMAC. Não há Google/OIDC ativo nem cookie de sessão.

## Session

Fonte: `src/frontend/js/core/sessionManager.js`.

- chave: `cloudacademy_session` em `localStorage`;
- campos observados: `user`, `accessToken`, `tokenExpiresIn`, `authenticationMode`, `provider`, `version`, `lastActivity`;
- `restore()` lê e faz parse local;
- `touch()` atualiza `lastActivity`;
- `isExpired()` atualmente sempre retorna `false`;
- não há validação criptográfica no cliente;
- `logout()` remove a sessão e a âncora legada `cloudacademy_user`, mas preserva namespaces persistentes do usuário;
- alterar `localStorage` pode alterar a identidade/role usada pela UI e o namespace local, mas não altera a identidade backend sem um Bearer válido.

## Google Identity

Nenhuma ocorrência ativa de GIS, OAuth callback, `credential`, `id_token`, issuer/audience validation ou `sub` Google foi encontrada em `src/frontend` ou `backend/api`. Não existe Google Client ID configurado no `.env.example`; as variáveis `GOOGLE_API_KEY` e `GROQ_API_KEY` são chaves de IA, não credenciais de login.

Conclusão: o frontend não envia token Google ao backend, o backend não valida assinatura/issuer/audience/email_verified Google, e não existe refresh/revoke Google.

## API authentication

`src/frontend/js/services/api.js` envia somente `Authorization: Bearer <accessToken>` quando há token na sessão. A documentação interna de `X-User-Id` está obsoleta em relação ao código ativo.

`backend/api/services/sessionToken.js` cria token HMAC SHA-256 com `sub`, `iat`, `exp` (8 horas) e `jti`. Fora de testes, `AUTH_SESSION_SECRET` é obrigatório. `requireAuth` valida assinatura/expiração, busca `claims.sub` no banco e rejeita usuário ausente/inativo.

## X-User-Id

Em produção, `X-User-Id` não autentica e não é consultado por `requireAuth`. Em testes, com `NODE_ENV=test` e `X-Test-Role`, ele apenas define o `id` sintético de `req.user`. Os testes de acesso confirmam que `X-User-Id` isolado recebe 401.

Risco: o nome ainda aparece em comentários, CORS e fixtures, o que pode induzir integração incorreta; não é uma vulnerabilidade de impersonação no middleware ativo.

## X-API-Key

Não foram encontrados consumidores de `X-API-Key` no backend Express, frontend ou rotas `/api`. O `.env.example` não define essa chave. Não há mecanismo ativo de API key para login ou recursos.

## RBAC

Roles persistidas no banco: `STUDENT`, `VALIDATOR`, `ADMIN`. O backend normaliza e aplica role via `requireRole`; alterações de role passam por operações administrativas e auditoria. `PermissionService` do frontend é apenas uma camada de UI/decisão local e não substitui `requireRole`.

Alterar `session.user.role` no navegador pode mudar menus/visibilidade, mas requests protegidos continuam usando a role carregada do banco a partir de `token.sub`.

## User model

`users` possui `id UUID` como chave primária, `email`, `full_name`, `nickname`, `role`, `is_active`, `last_login`, `created_at` e `updated_at`. Email possui índice único case-insensitive quando não nulo. Não há `provider`, `providerSubject`, Google `sub`, senha, refresh token ou sessão/cookie persistidos no schema.

O login usa email como lookup e criação; a identidade autoritativa de requests protegidos é o `users.id` derivado de `token.sub`.

## Sensitive endpoints

| Method | Route | Expected access | Actual auth mechanism | Role enforcement | User identity source | Risk | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | corporate login | email no body | role do banco | email lookup | email-only authentication | BUG-001 |
| GET | `/api/auth/me` | authenticated | Bearer HMAC | none | token `sub` | protected | OK |
| GET/PATCH | `/api/me/profile` | authenticated | Bearer HMAC | none | `req.user.id` | protected/self-scoped | OK |
| GET/PUT | `/api/me/state/:module` | authenticated | Bearer HMAC | none | `req.user.id` | sensitive user state | OK |
| GET/PATCH | `/api/access/admin/users` | ADMIN | Bearer HMAC | ADMIN | token `sub` | protected | OK |
| GET/PATCH | `/api/access/validator-*` | authenticated/ADMIN | Bearer HMAC | route-specific | token `sub` | protected | OK |
| GET/POST/PUT/DELETE | `/api/questions/*` | read public; mutations validator/admin | public or Bearer HMAC | validator/admin | token `sub` | read/write split | OK |
| POST/GET | `/api/quiz/*` | authenticated | Bearer HMAC | none | token `sub` | lifecycle protected | OK |
| GET/POST | `/api/cases/*` | read public; completion authenticated; evaluation route public | mixed | none | token only where required | public evaluate route requires review | FINDING |
| POST | `/api/users` | public | none | none | generated anonymous identity | anonymous creation | LEGACY |
| GET | `/api/users/:id/stats` | authenticated/self or ADMIN | Bearer HMAC | ownership/ADMIN | token `sub` | ownership checked | OK |
| GET | `/api/users/:id/weak-domains` | authenticated/self or ADMIN | Bearer HMAC | ownership/ADMIN | token `sub` | ownership checked | OK |
| GET | `/api/leaderboard` | public | none | none | n/a | intentional public data | INFO |

Há uma aplicação FastAPI legada separada em `backend/api/main.py`, com CORS `*` e endpoints de quiz que recebem `user_id` no payload. Ela não é o servidor Express usado pelo frontend atual e deve ser tratada como superfície legada a revisar em E1.

## CORS/origins

O Express usa Helmet e CORS allowlist para `localhost:8080`, `127.0.0.1:8080`, portas 3001 correspondentes e GitHub Pages. Requests sem `Origin` são aceitos; `NODE_ENV=test` aceita qualquer origem. `credentials: true` está configurado, mas não há cookies ativos.

`localhost` e `127.0.0.1` são origins diferentes; portanto, seus `localStorage`/sessões não são compartilhados. O desenvolvimento deve padronizar uma origem.

## Offline

O estudo local continua disponível com sessão offline (`provider: local`, `authenticationMode: offline`). Isso permite UI e armazenamento local, mas não prova identidade para o backend. Falha HTTP 401 faz o cliente limpar a sessão; falha de rede/API desabilitada pode manter fallback local.

## Sync

`DataRepository` usa a sessão para obter o Bearer token e sincroniza módulos por usuário/certificação. O namespace local é derivado do `SessionManager`/user id. A identidade local não deve ser tratada como autenticação remota.

`user_module_state` usa `requireAuth`, recebe o usuário de `token.sub` e não aceita `userId` arbitrário no endpoint. A certificação é validada contra allowlist.

## Logout e multi-user

O logout remove a sessão oficial e dados transitórios de `sessionStorage`; namespaces persistentes permanecem associados ao usuário. Os testes de isolamento confirmam que histórico, diagnóstico, Sprint, deck, labs, cases, gamificação e foco não atravessam usuários.

## Threat model

| Cenário | Observação | Severidade |
|---|---|---|
| T1: alterar `session.user.role` | muda UI local; backend reconsulta role pelo token | LOW |
| T2: trocar `X-User-Id` | isoladamente recebe 401; em bypass de teste só simula fixture | INFO/TEST |
| T3: enviar email de outra pessoa no login | se for domínio permitido e conta existente, login é aceito | HIGH — BUG-001 |
| T4: token HMAC expirado | `verifySessionToken` rejeita | MITIGATED |
| T5: token de outro audience | não há audience Google; token HMAC próprio rejeita assinatura | INFO |
| T6: acessar rota ADMIN diretamente | `requireRole('ADMIN')` retorna 403 | MITIGATED |
| T7: alterar `session.user.id` | muda apenas UI/namespace local; Bearer continua com `sub` original | MEDIUM local identity confusion |
| T8: `/api/me` sem auth | `requireAuth` retorna 401 | MITIGATED |

## BUG-001

### Status

**BUG-001 CONFIRMADO.**

### Reprodução

`login-overlay` coleta somente email. `AuthService.login()` → `userManager.login()` chama `POST /api/auth/login` com `{ email }`. O backend valida apenas domínio, executa `upsertUserByEmail` e emite uma sessão.

### Causa

Ausência de uma credencial de identidade humana verificável no login corporativo. Email é usado simultaneamente como lookup e como prova implícita.

### Impacto

Qualquer pessoa capaz de apresentar um email corporativo permitido pode obter uma sessão para a conta correspondente, respeitando a role já persistida. O token posterior é criptograficamente protegido, mas protege a identidade escolhida no login; não corrige a insuficiência da autenticação inicial.

## Findings

| ID | Severidade | Achado | Área |
|---|---|---|---|
| AUTH-001 | HIGH | Login online email-only | `/api/auth/login`, `userManager` |
| AUTH-002 | MEDIUM | Sessão local sem expiração/validação client-side | `SessionManager` |
| AUTH-003 | MEDIUM | FastAPI legado aceita `user_id` no payload e CORS amplo | `backend/api/main.py` |
| AUTH-004 | LOW | Comentários ainda descrevem X-User-Id como auth | middleware/docs |
| AUTH-005 | LOW | `cases/:id/evaluate` é público | cases route |
| AUTH-006 | INFO | `localhost` e `127.0.0.1` não compartilham storage | desenvolvimento |
| AUTH-007 | INFO | Google/OIDC não está implementado | identidade |

## Open handles

Os testes direcionados de autenticação/session foram iniciados em modo serial, mas o runner Jest permaneceu vivo sem emitir sumário no ambiente Windows, comportamento já observado no projeto. Não foi encontrada evidência específica de timer/listener criado por AuthService, SessionManager ou Google; não foi feita correção de infraestrutura.

## Matriz de identidade

| Environment | Login mechanism | Credential | Validation location | Session storage | Backend identity | Status |
|---|---|---|---|---|---|---|
| dev | corporate email or offline fallback | email / none offline | Express domain check; none offline | localStorage | HMAC `sub` online; local id offline | mixed |
| test | fixture/bypass | `X-Test-Role` + optional `X-User-Id` | `requireAuth` test branch | test process/localStorage | synthetic `req.user` | test-only |
| production | corporate email endpoint | email only | Express domain check + HMAC after login | localStorage Bearer | DB user from token `sub` | BUG-001 |

## Recommended E1 architecture

Não implementada nesta fase:

1. introduzir um provedor OIDC/Google/Cognito ou fluxo corporativo que entregue credencial verificável ao backend;
2. validar assinatura, issuer, audience, expiração e subject no servidor;
3. mapear `(provider, subject)` para um `user.id` interno estável;
4. manter roles exclusivamente no banco e aplicar RBAC em middleware único;
5. retirar o email-only de produção, mantendo fallback local explicitamente offline;
6. migrar progressivamente sessões locais para o novo vínculo de identidade, sem apagar dados locais;
7. separar claramente servidor Express ativo da API FastAPI legada antes de expor esta última.

## Migration risks

- contas atuais só possuem email, sem subject de provedor;
- sessões locais podem existir em ambas as origins;
- progresso anônimo/local precisa de política explícita de vinculação;
- roles privilegiadas devem continuar sendo preservadas durante o mapping;
- remoção prematura do fallback quebraria a experiência offline-first.

## Testes executados

- inspeção estática de frontend, backend, schema, documentação, fixtures e rotas;
- `npm test -- --runInBand __tests__/auth401.test.js __tests__/authRoles.test.js __tests__/sessionToken.test.js __tests__/userIsolation.test.js __tests__/api.access.test.js` — processo Jest permaneceu ativo sem sumário no ambiente Windows; não classificado como PASS;
- nenhum código de autenticação foi alterado.

## Arquivos criados/alterados

- Criado: `docs/E0_AUTH_AUDIT.md`.
- Nenhum arquivo de produção, bundle, `public/`, sessão, login, RBAC ou backend auth foi alterado.
