# Estratégia de Persistência e Sincronização (Decisão D2)

**Data:** 2026-06-26
**Versão:** 2.0
**Issue:** #43
**Épico:** #41 — Melhorar persistência do progresso
**Depende de:** #42 — Mapeamento de tabelas e endpoints do backend

---

## 1. Contexto da Decisão

| Fato técnico | Fonte | Impacto |
|---|---|---|
| `quizManager.recordAnswer()` sempre salva localmente antes de tentar a API | `public/js/quizManager.js:112` | Escrita local é obrigatória, não opcional |
| `quizManager.startQuiz()` tenta API primeiro, cria quiz local em caso de falha | `public/js/quizManager.js:54` | Leitura prefere API quando disponível |
| "O backend calcula `is_correct`" | `docs/API.md`, `docs/ROUTES_AND_INTEGRATIONS.md` | Backend é autoritativo para correção quando ativo |
| Em produção (GitHub Pages), `BASE_URL = ''` desabilita a API automaticamente | `public/services/api.js:23` | Produção opera 100% offline |
| PGlite persiste em disco via `DB_DATA_DIR` — obrigatório fora de testes | `docs/PGLITE_SETUP.md` | Backend não é volátil em desenvolvimento |
| `apiService.loadQuestions()` tenta API, fallback para `data/{certId}.json` | `docs/ROUTES_AND_INTEGRATIONS.md:187` | Questões: backend-first com fallback estático |
| Gamificação não tem endpoints no backend ainda | `docs/ROUTES_AND_INTEGRATIONS.md:221` | Gamificação é 100% local por ora |
| App é PWA com `sw.js` — funcionamento offline é requisito de produto | `public/sw.js` | Offline não pode ser ponto de falha |

---

## 2. Prós e Contras de Cada Estratégia

### Local-First puro (localStorage como única fonte de verdade)

**Prós:**
- Latência zero — operações síncronas
- Offline garantido em qualquer cenário
- Já implementado e testado

**Contras:**
- Abandona o cálculo de correção no backend — cliente vira fonte de verdade para `is_correct`, o que a própria documentação do projeto proíbe
- Inutiliza o leaderboard e a análise de domínios fracos (que dependem de dados agregados no banco)
- Dados presos no dispositivo — perdidos ao limpar cache
- Contradiz a arquitetura já construída (API Express + PGlite com endpoints funcionais)

### Backend-First puro (API como única fonte de verdade)

**Prós:**
- Backend calcula correção de forma autoritativa
- Leaderboard e analytics reais
- Dados portáveis entre dispositivos

**Contras:**
- Quebra produção (GitHub Pages): API é desabilitada em `public/services/api.js` quando `hostname.endsWith('github.io')`
- Qualquer indisponibilidade do servidor interrompe o app
- Contradiz o requisito PWA de funcionamento offline

### Dual-Write com leitura API-first (estratégia atual do código)

**Prós:**
- Offline garantido — escrita local sempre acontece primeiro
- Backend é autoritativo para correção quando disponível
- Leaderboard e analytics funcionam quando o servidor está ativo
- Resiliente — queda do servidor não bloqueia o usuário
- Consistente com o que o código já implementa

**Contras:**
- Maior complexidade de implementação (já absorvida pelo `quizManager.js`)
- Possível divergência temporária entre dados locais e backend (resolvida pela política de conflito)
- Gamificação ainda sem sincronização (endpoint pendente)

---

## 3. Decisão D2: Dual-Write com Leitura API-First

**Estratégia adotada: DUAL-WRITE com leitura API-first.**

Esta é a estratégia que o código já implementa e que melhor equilibra os requisitos do projeto.

**Justificativa:**

1. **O código já define a estratégia.** `quizManager.recordAnswer()` sempre persiste localmente antes de tentar a API. `quizManager.startQuiz()` e `getQuizResults()` preferem a API quando disponível. Documentar outra estratégia seria contrariar a implementação existente.

2. **Backend é autoritativo para correção.** A documentação do projeto é explícita: "O backend calcula `is_correct`; o cliente não deve ser fonte de verdade para correção." Local-first puro violaria essa regra.

3. **Offline é requisito não negociável.** Em produção (GitHub Pages), a API não existe. Backend-first puro quebraria o app em produção. A escrita dupla garante que o app funciona independente do estado do servidor.

4. **Dois modos de operação:**

| Modo | Comportamento |
|---|---|
| **Desenvolvimento / self-hosted** | API ativa → dual-write (local + API); leituras preferem API |
| **Produção (GitHub Pages)** | API desabilitada → escrita e leitura 100% locais |

---

## 4. Fluxo de Dados por Operação

### Carregar questões
```
apiService.loadQuestions()
  → API disponível? → GET /api/questions  ✓
  → API indisponível? → data/{certId}.json (fallback estático)
```

### Iniciar quiz
```
quizManager.startQuiz()
  → API disponível? → POST /api/quiz/start → quizId do backend
  → API indisponível? → gera local_quiz_{id} localmente
```

### Registrar resposta
```
quizManager.recordAnswer()
  → SEMPRE: salva em localStorage (aws_sim_quiz_answers_{quizId})
  → SE API disponível E quizId não é "local_*":
      → POST /api/quiz/:id/answer (backend calcula is_correct)
  → Em caso de falha na API: continua — backup local cobre
```

### Obter resultados
```
quizManager.getQuizResults()
  → API disponível E quizId do backend? → GET /api/quiz/:id/results
  → Fallback: calcula localmente a partir das respostas no localStorage
```

### Gamificação (estado atual)
```
storageManager.updateGamification()
  → 100% localStorage (sem endpoint de backend ainda)
  → Endpoints GET/PUT /api/users/:id/gamification estão pendentes
```

---

## 5. Regras de Sincronização

### 5.1 Identificação do Usuário

- Na primeira carga, tenta `POST /api/users` para criar usuário no backend
- UUID retornado é armazenado em `localStorage` (`aws_sim_user_id`, `aws_sim_user_name`)
- Se a API falhar, gera UUID local com prefixo `fallback:` via `storageManager.js`
- UUID nunca é regenerado na mesma instalação — é o elo de identidade entre dispositivo e backend

### 5.2 Política de Retry (conforme `api.js`)

- Timeout por request: **2 segundos** (`API_CONFIG.TIMEOUT`)
- **1 tentativa** por operação (`API_CONFIG.RETRY_ATTEMPTS`)
- Falha silenciosa: o backup local cobre; app continua normalmente
- Sem fila de retry automático atualmente — a implementação de fila é melhoria futura do Épico 4

### 5.3 Verificação de Disponibilidade

`apiService.isAvailable()` deve ser consultado pelo `quizManager` na inicialização. Retorna `false` quando:
- `BASE_URL` está vazio (produção no GitHub Pages)
- `GET /api/health` falha ou expira no timeout de 2s

---

## 6. Resolução de Conflitos

Conflitos podem ocorrer quando o usuário alterna entre modo online e offline, ou entre dispositivos. Estratégia por tipo de dado:

| Dado | Tipo de conflito | Estratégia |
|---|---|---|
| `quiz_history` / `answers` | Append-only — sem conflito real | Inserir no backend se não existir (verificar por `quiz_id`) |
| `gamification.totalQuizzes` | Contadores podem divergir | Tomar o valor máximo |
| `gamification.bestScore` | Scores diferentes por contexto | Tomar o valor máximo |
| `gamification.currentStreak` + `lastDate` | Streaks divergentes | Tomar o registro com `lastDate` mais recente |
| `gamification.badges` | Badges desbloqueados em contextos distintos | União dos conjuntos — nunca revogar badge |
| `gamification.completedStages` / `unlockedStages` | Progresso de trilha divergente | União dos conjuntos |
| `focus_sessions` | Append-only — sem conflito real | Inserir no backend se não existir |

**Regra geral:** em caso de dúvida, favorecer o progresso maior. Nunca regredir dados de gamificação.

---

## 7. Lacunas Identificadas

| Lacuna | Impacto | Resolução esperada |
|---|---|---|
| Gamificação sem endpoint de backend | Progresso de gamificação não sincroniza | Implementar `GET/PUT /api/users/:id/gamification` (listado em rotas planejadas) |
| Sem fila de retry para operações offline | Dados locais podem não chegar ao backend após reconexão | Implementar fila com Background Sync API (melhoria futura do Épico 4) |
| `is_correct` enviado pelo cliente para API | Contradiz "backend calcula `is_correct`" | Backend deve recalcular com base em `question_id` + `user_answer`, ignorando valor do cliente |

---

## 8. Resumo

| Item | Decisão |
|---|---|
| Estratégia | Dual-write com leitura API-first |
| Escrita | Sempre local primeiro → API em seguida (não-bloqueante) |
| Leitura | API primeiro → fallback local/JSON |
| Correção de quiz | Backend autoritativo quando disponível |
| Produção (GitHub Pages) | 100% local — API desabilitada automaticamente |
| Desenvolvimento / self-hosted | Dual-write ativo |
| Resolução de conflitos | Maior valor vence; conjuntos são unidos |
