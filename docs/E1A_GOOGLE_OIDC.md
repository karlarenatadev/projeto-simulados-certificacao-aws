# E1A — Google OIDC verificável

## Executive summary

O login humano de produção agora usa `POST /api/auth/google` com um Google ID
token validado no backend. O token Google é trocado pelo Bearer HMAC já usado
pelas APIs da aplicação; ele não é persistido.

## Fluxo

Google Identity Services → credencial OIDC → verificação (`google-auth-library`)
→ domínio corporativo → vínculo `google/sub` → `users.id` interno → sessão HMAC.

São validados assinatura, issuer Google, audience (`GOOGLE_CLIENT_ID`), expiração,
`sub`, email e `email_verified`. Os domínios permitidos são configurados por
`AUTH_ALLOWED_DOMAINS` (padrão `a3data.com.br,a3data.com`); `hd`, quando presente,
é apenas uma verificação adicional.

## Identidades e contas

`user_identities` possui FK para `users`, `UNIQUE(provider, subject)` e mantém o
UUID/role/progresso existentes. O primeiro login de um email existente vincula
o subject sem criar usuário; conta nova recebe `STUDENT`. Um subject já vinculado
é resolvido antes do email. Email/subject conflitante retorna `409
identity_link_conflict`; a unicidade e a transação protegem corridas.

## Sessão e desenvolvimento

Após o vínculo, a API emite o HMAC atual (`sub = users.id`, `iat`, `exp`, `jti`).
O frontend persiste apenas essa sessão, com `provider: google`. `POST /api/auth/login`
email-only é negado em produção e só pode ser habilitado explicitamente com
`ALLOW_DEV_EMAIL_LOGIN=true` (o branch de testes permanece restrito a
`NODE_ENV=test`). Role é sempre recarregada do banco.

Modo offline/local continua separado: falha de rede pode manter estudo local,
mas não transforma email local em autenticação remota nem sincroniza sem sessão
HMAC válida.

## Configuração e Google Console

`GOOGLE_CLIENT_ID` é um identificador público e deve ser fornecido ao backend e
ao runtime público (`window.__APP_CONFIG__.googleClientId` ou
`data-google-client-id`). Não configurar `AUTH_SESSION_SECRET` no frontend.
No Google Console, cadastrar as origens efetivamente usadas: ambiente publicado
GitHub Pages e os endereços locais de desenvolvimento. `localhost` e
`127.0.0.1` são origins distintas e devem ser cadastradas/configuradas
coerentemente.

## Contratos e respostas

`400` credencial ausente/malformada, `401` token Google inválido/expirado ou não
verificado, `403` domínio/conta não autorizada, `409` conflito de vínculo.
`/api/auth/me` e `user_module_state` continuam usando o Bearer HMAC e o UUID
interno resolvido.

## Escopo e riscos remanescentes

Esta fase não implementa refresh token, cookies, sessão server-side, migração de
progresso offline, correção de `SessionManager.isExpired()`, FastAPI legado ou
`cases/:id/evaluate`. Esses itens ficam para E1B/fases posteriores.
