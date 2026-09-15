# E1B — Expiração, continuidade offline e vínculo local

## Sessão

Sessões online agora persistem `expiresAt` no momento em que o HMAC é criado.
`SessionManager.isExpired()` compara esse valor com o relógio atual; sessões
online antigas sem uma expiração confiável são tratadas conservadoramente como
expiradas. `lastActivity` continua sendo telemetria/UX e não renova o token.

Ao expirar, a credencial é removida, mas o usuário e todos os namespaces locais
são preservados. O estado passa a `offline-expired`, com `sessionExpired: true`.

## Estados e erros

- `online`: sessão remota válida e sincronização permitida;
- `offline`: identidade local, estudo local;
- `offline-expired`: usuário preservado para estudo local, sem requests remotos;
- ausência/malformação: fluxo normal de autenticação.

HTTP 401 marca a sessão remota como expirada sem apagar progresso. HTTP 403
permanece uma falha de autorização e não executa logout. Falhas de rede não
marcam a sessão como expirada; operações locais continuam e a sincronização fica
pendente.

## Namespaces e vínculo

StorageManager mantém chaves escopadas pelo `user.id`. Um namespace cujo usuário
é explicitamente local (`local_*`, provider `local`) é elegível para o primeiro
vínculo Google. Antes de trocar a sessão, o estado elegível é capturado; depois
do login, cada módulo é reconciliado pelo `reconcileModuleState` existente e
gravado no namespace UUID remoto. O namespace anterior não é apagado.

Namespaces remotos/expirados de outro UUID nunca são migrados para outro
usuário. Não usamos email local como prova. A sessão registra
`linkedLocalUserId` para auditoria e a operação é idempotente porque os merges
existentes são por identidade/união.

Se o login ou a escrita remota falhar, o namespace local permanece intacto e o
vínculo não é considerado concluído. Um novo login pode repetir a operação.

## D1–D4 preservados

O vínculo reutiliza as regras D1 para histórico, erros, deck, jornada, XP,
streak e Sprint. Não altera score, readiness, XP, streak ou regras de Sprint.

## Limitações fora do escopo

Não foram adicionados refresh tokens, cookies, sessões server-side ou migração
de dados de namespaces remotos. Permanecem para fases futuras: FastAPI legado,
`cases/:id/evaluate` público, tombstones do Deck e eventuais handles antigos do
Jest.
