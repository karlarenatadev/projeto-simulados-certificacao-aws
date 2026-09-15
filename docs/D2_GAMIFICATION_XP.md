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

## Fora do escopo

Não foram criados novos eventos para quiz, diagnóstico, Jornada, labs comuns,
cases, Sprint, erros ou Deck. Não foram alterados níveis, badges existentes,
streak ou gamificação social. XP negativo, moedas, ranking e scheduling continuam
fora desta fase.
