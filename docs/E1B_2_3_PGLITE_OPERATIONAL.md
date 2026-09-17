# E1B.2.3 — Operational PGlite Recovery

Esta etapa criou um banco operacional novo; ela não recupera o banco legado.

## Original corrupted DB

- `.pglite-data` original: preservado.
- Backup raw E1B.2.2: preservado como manifesto/cópia histórica.
- Nova cópia raw independente: `%TEMP%\cloudacademy-pglite-recovery-20260916-2129\original-copy-final`.
- Nova cópia: 1.100 arquivos, 87.629.919 bytes, iguais ao original.
- Nenhum arquivo do original foi alterado.

## New operational DB

- Path: `%LOCALAPPDATA%\CloudAcademyA3\pglite-data`
- Fora do OneDrive: **SIM**
- Configurado somente no `.env` local via `DB_DATA_DIR`.
- PGlite: `0.5.4`

## Initialization and schema

`PGlite.create()` passou. A inicialização normal aplicou as migrations e criou
25 tabelas, incluindo `users`, `user_identities`, `user_module_state`,
`local_identity_links`, `questions`, `quiz_history`, `gamification`,
`focus_sessions`, `cases` e tabelas de validação.

Contagens iniciais: users 0, user_identities 0, user_module_state 0,
local_identity_links 0. Nenhum usuário/role foi inserido manualmente e nenhum
arquivo do banco legado foi copiado.

## Express

`npm run dev` iniciou o Express sem o PANIC:

- Port: `3001`
- Bind: `0.0.0.0`
- listen: alcançado
- `/api/health`: HTTP 200

O frontend serviu em `127.0.0.1:8080`. O encerramento posterior foi manual
(`Ctrl-C`), não falha de startup.

## API transport

- `http://127.0.0.1:3001/api/health`: HTTP 200
- `http://localhost:3001/api/health`: HTTP 200
- POST `/api/auth/google` sem credencial: HTTP 400 em ambos os hosts.

Isso confirma que a requisição chega ao Express; nenhuma credencial Google real
foi usada.

## Frontend/API URL

`127.0.0.1:8080` e `localhost:8080` responderam HTTP 200. A resolução local
permanece alinhada por hostname:

- frontend 127.0.0.1 → API 127.0.0.1:3001
- frontend localhost → API localhost:3001

O build não gera endpoint local para produção.

## Google configuration

- Client ID frontend: configurado.
- Client ID backend: configurado.
- Igualdade: confirmada anteriormente.
- Authorized JavaScript Origins ainda requerem verificação manual no Google
  Cloud para `http://127.0.0.1:8080`, `http://localhost:8080` e GitHub Pages.

## Manual login readiness

- [x] frontend 8080
- [x] Express 3001
- [x] health
- [x] auth route alcançável
- [x] Client ID carregado
- [ ] origin Google confirmada
- [ ] popup Google validado
- [ ] credential real enviada
- [ ] HMAC real retornado
- [ ] login Google concluído

Os itens finais dependem do Google Cloud/credencial externa.

## Old data

Não migrado. O progresso local permanece separado do banco novo. Recuperação
forense do datadir legado fica fora desta etapa (eventual E1B.2.4-F).

## Destructive actions

- `pg_resetwal`: **NOT RUN**
- WAL deletion: **NOT RUN**
- `pg_control` edit: **NOT RUN**
- binary patch: **NOT RUN**
- `pg_surgery`: **NOT RUN**
- original reset/delete/rename: **NOT RUN**

## Tests and validation

- Jest completo: **86 suites, 611 testes, exit code 0**.
- `npm run lint`: PASS
- `npm run format:check`: PASS
- `npm run build`: PASS
- `npm run validate:data`: PASS — Questions 2.538, Flashcards 178,
  Exam tips 151, Errors 0, Warnings 0, Legacy 4.
- `npm run validate:pwa`: PASS
- `git diff --check`: PASS (avisos CRLF/LF).

## Next step

**A — ambiente operacional pronto para validação manual do login**, após
verificar as Authorized JavaScript Origins no Google Cloud.

E2 e recovery forense destrutivo não foram iniciados.
