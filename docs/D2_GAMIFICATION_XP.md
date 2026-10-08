# D2 — Fonte única de XP

## Auditoria

O frontend possuía um estado legado de gamificação (`xp`), o backend possui
`gamification.xp_points`, e o fluxo interativo exibia `+10 XP` enquanto apenas
atualizava `labsCompleted`. Não havia ledger nem identidade de recompensa.
Quiz, diagnóstico, erros e Deck não tinham concessão XP canônica ativa.

## Política e ledger

`gamificationPolicy.js` é a fonte dos eventos e valores. O único evento ativo
documentado é `interactive_lab_completed` (10 XP, não repetível), preservando a
regra já apresentada pela experiência. `gamificationService.js` cria IDs
determinísticos (`eventType:sourceId`), rejeita tipos desconhecidos e une eventos
locais/remotos sem duplicação.

`gamificationProjection.js` calcula o total como baseline legado mais a soma de
eventos canônicos. O baseline (`xp`, `xp_points` ou `legacyBaselineXp`) não é
recontabilizado como evento.

## Offline e sincronização

Eventos são gravados localmente antes da sincronização. O estado do ledger usa o
módulo `gamification` de `user_module_state`, protegido pelo CAS/version da D1.1;
merge é união por event ID. Falhas preservam o evento local para retry.

O backend passou a aceitar o módulo `gamification`; não há alteração nas regras
de score, readiness, streak, Sprint ou autenticação.

### Contrato de sincronização corrigido em D4.2 — Correção 02

O snapshot `gamification` é **global por usuário**: certificação `null` no
GET/PUT, armazenada como escopo vazio pelo banco existente. Seus campos são
`events`, `legacyBaselineXp` e `activityDays`. A certificação de um evento é
metadado; Jornada continua separada por certificação. Não há migração de linhas
legadas nem extensão dos 20 escopos do vínculo local v1.

`core/contracts/gamificationState.js` concentra a união por `id` existente,
validação de identidade/amount, ordenação lexical determinística e preservação
dos metadados de eventos. Duplicatas compatíveis contam uma vez; diferenças
apenas de `createdAt` conservam o primeiro instante válido. IDs ausentes ou
payloads contraditórios para o mesmo ID deixam a sincronização pendente, sem
aplicar parcialmente nem inventar IDs. Os registros locais continuam preservados
e novos eventos locais ainda podem ser registrados. Corrigir dados legados
ambíguos exige uma evolução/migração separada.

O baseline usa o maior snapshot local/remoto, sem somar duas cópias do legado.
Esse valor também é persistido na hidratação. O total continua derivado do
baseline mais os eventos; não muda política de recompensas nem torna o ledger
um placar autoritativo do servidor. CAS 0/positivo e retomada após 409 usam os
contratos existentes. Falha de leitura remota não significa estado ausente.

Somente `preferences` e `gamification` permitem PUT sem certificação. O contrato
de gamificação rejeita certificação explícita em vez de misturar escopos.
Histórico offline de quizzes e Pomodoro continuam locais; os hooks especulativos
`syncQuizResult`/`syncFocusSession` não são chamados. Gamificação usa a API
genérica de estado, sem criar `syncGamification` ou endpoint adicional.

## Fora do escopo

Não foram criados novos eventos para quiz, diagnóstico, Jornada, labs comuns,
cases, Sprint, erros ou Deck. Não foram alterados níveis, badges existentes,
streak ou gamificação social. XP negativo, moedas, ranking e scheduling continuam
fora desta fase.
