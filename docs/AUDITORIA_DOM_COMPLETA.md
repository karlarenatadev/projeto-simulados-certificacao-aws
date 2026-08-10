# RELATÓRIO DE AUDITORIA COMPLETA — COMPATIBILIDADE JAVASCRIPT ↔ HTML

**Data:** C:\Users\karla.rosario_a3data\OneDrive\Documentos\GitHub\projeto-simulados-certificacao-aws

---

## A. RESUMO EXECUTIVO

- **Seletores JavaScript analisados:** 169
- **IDs HTML encontrados:** 133
- **Eventos addEventListener analisados:** 32
- **Erros críticos (getElementById sem elemento):** 92 ❌
- **Eventos quebrados:** 0 ⚠️

### Status Geral

❌ **CRÍTICO** — Múltiplos problemas que podem quebrar a aplicação!

## B. ERROS CRÍTICOS

Problemas que **QUEBRAM** a aplicação (getElementById retorna null):

### [1] `a3-modal-container`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 3

**Ocorrência 1:**
- Arquivo: `uiRenderer.js`
- Linha: 25

```javascript
if (document.getElementById("a3-modal-container")) return;
```

**Ocorrência 2:**
- Arquivo: `uiRenderer.js`
- Linha: 70

```javascript
const container = document.getElementById("a3-modal-container");
```

**Ocorrência 3:**
- Arquivo: `uiRenderer.js`
- Linha: 128

```javascript
const container = document.getElementById("a3-modal-container");
```

---

### [2] `a3-toast-container`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `uiRenderer.js`
- Linha: 17

```javascript
if (document.getElementById("a3-toast-container")) return;
```

**Ocorrência 2:**
- Arquivo: `uiRenderer.js`
- Linha: 34

```javascript
const container = document.getElementById("a3-toast-container");
```

---

### [3] `app-boot-overlay`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 315

```javascript
const bootOverlay = document.getElementById("app-boot-overlay");
```

---

### [4] `avg-score`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 306

```javascript
const avgScoreEl = document.getElementById("avg-score");
```

---

### [5] `btn-clear-history`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `initUI.js`
- Linha: 253

```javascript
const clearHistoryBtn = document.getElementById("btn-clear-history");
```

---

### [6] `btn-flashcards-home`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `flashcards.js`
- Linha: 231

```javascript
const homeBtn = document.getElementById("btn-flashcards-home");
```

---

### [7] `btn-pomodoro-toggle`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `pomodoroManager.js`
- Linha: 17

```javascript
const btn = document.getElementById("btn-pomodoro-toggle");
```

**Ocorrência 2:**
- Arquivo: `pomodoroManager.js`
- Linha: 47

```javascript
document.getElementById("btn-pomodoro-toggle").innerHTML =
```

---

### [8] `btn-start-personalized-diagnostic-quiz`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 964

```javascript
const btn = document.getElementById("btn-start-personalized-diagnostic-quiz");
```

---

### [9] `btn-validate-interactive`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `interactiveEngine.js`
- Linha: 88

```javascript
const validateBtn = document.getElementById("btn-validate-interactive");
```

---

### [10] `detailed-report`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 3

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 809

```javascript
const oldReport = document.getElementById("detailed-report");
```

**Ocorrência 2:**
- Arquivo: `app.js`
- Linha: 1890

```javascript
let reportDiv = document.getElementById("detailed-report");
```

**Ocorrência 3:**
- Arquivo: `app.js`
- Linha: 2929

```javascript
const oldReport = document.getElementById("detailed-report");
```

---

### [11] `dynamic-insight`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2425

```javascript
const insightEl = document.getElementById("dynamic-insight");
```

**Ocorrência 2:**
- Arquivo: `app.js`
- Linha: 3083

```javascript
const insightEl = document.getElementById("dynamic-insight");
```

---

### [12] `global-chart-container`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 286

```javascript
const chartContainer = document.getElementById("global-chart-container");
```

---

### [13] `global-chart-empty`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 285

```javascript
const emptyState = document.getElementById("global-chart-empty");
```

---

### [14] `global-stats-summary`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 287

```javascript
const statsContainer = document.getElementById("global-stats-summary");
```

---

### [15] `globalRadarChart`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 284

```javascript
const canvas = document.getElementById("globalRadarChart");
```

---

### [16] `header-pomodoro-timer`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `pomodoroManager.js`
- Linha: 109

```javascript
const headerTimer = document.getElementById("header-pomodoro-timer");
```

---

### [17] `history-card-title`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `initUI.js`
- Linha: 248

```javascript
const historyTitle = document.getElementById("history-card-title");
```

---

### [18] `history-list`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2306

```javascript
const historyList = document.getElementById("history-list");
```

---

### [19] `hub-avg-score`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1664

```javascript
const avgEl = document.getElementById("hub-avg-score");
```

---

### [20] `hub-avg-score-hint`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1665

```javascript
const avgHintEl = document.getElementById("hub-avg-score-hint");
```

---

### [21] `hub-best-score`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1649

```javascript
const bestEl = document.getElementById("hub-best-score");
```

---

### [22] `hub-best-score-hint`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1650

```javascript
const bestHintEl = document.getElementById("hub-best-score-hint");
```

---

### [23] `hub-insight-text`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1732

```javascript
const insightEl = document.getElementById("hub-insight-text");
```

---

### [24] `hub-last-quiz`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1699

```javascript
const lastQuizEl = document.getElementById("hub-last-quiz");
```

---

### [25] `hub-mistakes-count`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1687

```javascript
const mistakesEl = document.getElementById("hub-mistakes-count");
```

---

### [26] `hub-quick-mistakes`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1691

```javascript
const quickMistakes = document.getElementById("hub-quick-mistakes");
```

---

### [27] `hub-streak`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1681

```javascript
const streakEl = document.getElementById("hub-streak");
```

---

### [28] `interactive-feedback`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `interactiveEngine.js`
- Linha: 104

```javascript
const feedbackArea = document.getElementById("interactive-feedback");
```

**Ocorrência 2:**
- Arquivo: `interactiveEngine.js`
- Linha: 144

```javascript
const feedbackArea = document.getElementById("interactive-feedback");
```

---

### [29] `jornada-accuracy`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `jornada.js`
- Linha: 32

```javascript
const accuracyEl = document.getElementById("jornada-accuracy");
```

---

### [30] `jornada-progress`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `jornada.js`
- Linha: 31

```javascript
const progressEl = document.getElementById("jornada-progress");
```

---

### [31] `jornada-questions`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `jornada.js`
- Linha: 33

```javascript
const questionsEl = document.getElementById("jornada-questions");
```

---

### [32] `jornada-weak-domain`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `jornada.js`
- Linha: 34

```javascript
const weakDomainEl = document.getElementById("jornada-weak-domain");
```

---

### [33] `login-btn-spinner`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 116

```javascript
const spinner = document.getElementById("login-btn-spinner");
```

---

### [34] `login-btn-text`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 115

```javascript
const btnText = document.getElementById("login-btn-text");
```

---

### [35] `login-email-input`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 113

```javascript
const emailInput = document.getElementById("login-email-input");
```

---

### [36] `login-error-msg`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 117

```javascript
const errorMsg = document.getElementById("login-error-msg");
```

---

### [37] `login-form`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 112

```javascript
const form = document.getElementById("login-form");
```

---

### [38] `login-overlay`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 111

```javascript
const overlay = document.getElementById("login-overlay");
```

---

### [39] `login-submit-btn`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 114

```javascript
const submitBtn = document.getElementById("login-submit-btn");
```

---

### [40] `modal-btn-cancel`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `uiRenderer.js`
- Linha: 110

```javascript
document.getElementById("modal-btn-cancel").onclick = () => close(false);
```

---

### [41] `modal-btn-confirm`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `uiRenderer.js`
- Linha: 111

```javascript
document.getElementById("modal-btn-confirm").onclick = () => close(true);
```

---

### [42] `pomodoro-display`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `pomodoroManager.js`
- Linha: 105

```javascript
const display = document.getElementById("pomodoro-display");
```

---

### [43] `pomodoro-widget`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `pomodoroManager.js`
- Linha: 12

```javascript
const widget = document.getElementById("pomodoro-widget");
```

---

### [44] `question-validation-badge`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 1170

```javascript
const oldBadge = document.getElementById("question-validation-badge");
```

**Ocorrência 2:**
- Arquivo: `app.js`
- Linha: 2729

```javascript
const badge = document.getElementById("question-validation-badge");
```

---

### [45] `score-container`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 7

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 826

```javascript
const scoreContainer = document.getElementById("score-container");
```

**Ocorrência 2:**
- Arquivo: `app.js`
- Linha: 923

```javascript
const scoreContainer = document.getElementById("score-container");
```

**Ocorrência 3:**
- Arquivo: `app.js`
- Linha: 1023

```javascript
const scoreContainer = document.getElementById("score-container");
```

**Ocorrência 4:**
- Arquivo: `app.js`
- Linha: 1591

```javascript
const scoreContainer = document.getElementById("score-container");
```

**Ocorrência 5:**
- Arquivo: `app.js`
- Linha: 2779

```javascript
const scoreContainer = document.getElementById("score-container");
```

... e mais 2 ocorrências.

---

### [46] `score-display`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2530

```javascript
const el = document.getElementById("score-display");
```

---

### [47] `side-info`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 9

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 815

```javascript
const sidebar = document.getElementById("side-info");
```

**Ocorrência 2:**
- Arquivo: `app.js`
- Linha: 907

```javascript
const sidebar = document.getElementById("side-info");
```

**Ocorrência 3:**
- Arquivo: `app.js`
- Linha: 1008

```javascript
const sidebar = document.getElementById("side-info");
```

**Ocorrência 4:**
- Arquivo: `app.js`
- Linha: 1573

```javascript
const sideInfo = document.getElementById("side-info");
```

**Ocorrência 5:**
- Arquivo: `app.js`
- Linha: 1589

```javascript
const sidebar = document.getElementById("side-info");
```

... e mais 4 ocorrências.

---

### [48] `sidebar-btn-mistakes`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2520

```javascript
const sidebarBtn = document.getElementById("sidebar-btn-mistakes");
```

---

### [49] `sidebar-cert-badge`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3132

```javascript
const badgeEl = document.getElementById("sidebar-cert-badge");
```

---

### [50] `sidebar-cert-label`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 2

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3124

```javascript
const labelEl = document.getElementById("sidebar-cert-label");
```

**Ocorrência 2:**
- Arquivo: `pdfReport.js`
- Linha: 45

```javascript
document.getElementById("sidebar-cert-label")?.innerText ||
```

---

### [51] `sidebar-cert-status`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3158

```javascript
const statusEl = document.getElementById("sidebar-cert-status");
```

---

### [52] `sidebar-collapse-btn`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 600

```javascript
const collapseBtn = document.getElementById("sidebar-collapse-btn");
```

---

### [53] `sidebar-mistakes-count`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2521

```javascript
const badge = document.getElementById("sidebar-mistakes-count");
```

---

### [54] `sidebar-pct-bar`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3171

```javascript
const bar = document.getElementById("sidebar-pct-bar");
```

---

### [55] `sidebar-pct-text`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3172

```javascript
const text = document.getElementById("sidebar-pct-text");
```

---

### [56] `sidebar-streak-value`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3177

```javascript
const streakValue = document.getElementById("sidebar-streak-value");
```

---

### [57] `sortable-list`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `interactiveEngine.js`
- Linha: 62

```javascript
const listElement = document.getElementById("sortable-list");
```

---

### [58] `streak-counter`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 2475

```javascript
const streakEl = document.getElementById("streak-counter");
```

---

### [59] `study-recommendation-banner`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `app.js`
- Linha: 3506

```javascript
const existingBanner = document.getElementById("study-recommendation-banner");
```

---

### [60] `timer-text`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `timerManager.js`
- Linha: 52

```javascript
const el = document.getElementById("timer-text");
```

---

### [61] `total-questions`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 307

```javascript
const totalQuestionsEl = document.getElementById("total-questions");
```

---

### [62] `total-quizzes`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `chartManager.js`
- Linha: 305

```javascript
const totalQuizzesEl = document.getElementById("total-quizzes");
```

---

### [63] `trail-container`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `trailManager.js`
- Linha: 120

```javascript
document.getElementById("trail-container") ||
```

---

### [64] `user-dropdown`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 383

```javascript
const dropdown = document.getElementById("user-dropdown");
```

---

### [65] `user-menu-btn`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 382

```javascript
const btn = document.getElementById("user-menu-btn");
```

---

### [66] `user-menu-logout`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 384

```javascript
const logoutBtn = document.getElementById("user-menu-logout");
```

---

### [67] `user-menu-profile`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 429

```javascript
const profileBtn = document.getElementById("user-menu-profile");
```

---

### [68] `user-menu-settings`

**Problema:** ID não existe em nenhum HTML
**Impacto:** Pode causar 'Cannot read properties of null'

**Ocorrências:** 1

**Ocorrência 1:**
- Arquivo: `shell.js`
- Linha: 438

```javascript
const settingsBtn = document.getElementById("user-menu-settings");
```

---

## C. EVENTOS QUEBRADOS

Eventos addEventListener associados a elementos inexistentes:

✅ **Todos os eventos têm elementos correspondentes!**

## D. ELEMENTOS HTML ÓRFÃOS

Elementos importantes que existem no HTML mas **não são utilizados** pelo JavaScript:

**Total de elementos órfãos:** 60

### cases.html

- Total de IDs na página: 6
- IDs órfãos (não referenciados pelo JS): 6

**IDs órfãos:**

- `cases-count-label`
- `cases-grid`
- `cases-main`
- `cases-page-body`
- `filter-certification`
- `filter-difficulty`

### diagnostico.html

- Total de IDs na página: 15
- IDs órfãos (não referenciados pelo JS): 1

**IDs órfãos:**

- `btn-cancel`

### jornada.html

- Total de IDs na página: 7
- IDs órfãos (não referenciados pelo JS): 1

**IDs órfãos:**

- `screen-jornada`

### profile.html

- Total de IDs na página: 15
- IDs órfãos (não referenciados pelo JS): 15

**IDs órfãos:**

- `profile-avatar-initials`
- `profile-badges-grid`
- `profile-badges-title`
- `profile-certs-list`
- `profile-certs-title`
- `profile-display-name`
- `profile-email`
- `profile-header`
- `profile-page`
- `profile-role-badge`
- `profile-stats-title`
- `stat-best-score`
- `stat-streak`
- `stat-total-quizzes`
- `stat-xp`

### resources.html

- Total de IDs na página: 1
- IDs órfãos (não referenciados pelo JS): 1

**IDs órfãos:**

- `resources-main`

### settings.html

- Total de IDs na página: 14
- IDs órfãos (não referenciados pelo JS): 14

**IDs órfãos:**

- `setting-btn-clear-history`
- `setting-btn-logout`
- `setting-btn-reset-all`
- `setting-daily-goal`
- `setting-dark-mode`
- `setting-display-name`
- `setting-lang`
- `setting-pomodoro`
- `setting-sidebar-closed`
- `settings-btn-save`
- `settings-page`
- `settings-toast`
- `settings-toast-msg`
- `settings-version`

### simulados.html

- Total de IDs na página: 53
- IDs órfãos (não referenciados pelo JS): 10

**IDs órfãos:**

- `ai-recommendation`
- `btn-cancel`
- `btn-results-home`
- `btn-retake-quiz`
- `improvement-badge`
- `quiz-timer`
- `sidebar-btn-hub`
- `simulados-content`
- `study-sites`
- `toast-container`

### simulator-room.html

- Total de IDs na página: 13
- IDs órfãos (não referenciados pelo JS): 8

**IDs órfãos:**

- `panel-1`
- `panel-2`
- `panel-3`
- `panel-4`
- `step-1`
- `step-2`
- `step-3`
- `step-4`

### study-sprint.html

- Total de IDs na página: 14
- IDs órfãos (não referenciados pelo JS): 4

**IDs órfãos:**

- `close-sprint-reader`
- `sprint-module`
- `sprint-reader-content`
- `study-sprint-content`

## E. ANÁLISE DE CARREGAMENTO DE SCRIPTS

Análise de quais scripts são carregados em cada página:

### cases.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### diagnostico.html

- **Total de scripts:** 3
- **Carrega app.js:** ✓

**Scripts carregados:**

- `https://cdn.jsdelivr.net/npm/chart.js`
- `./js/app.js`
- `https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js`

### flashcards.html

- **Total de scripts:** 2
- **Carrega app.js:** ✓

**Scripts carregados:**

- `./js/pomodoroManager.js`
- `./js/app.js`

### index.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### jornada.html

- **Total de scripts:** 6
- **Carrega app.js:** ✓

**Scripts carregados:**

- `./js/sprintData.js`
- `./js/app.js`
- `https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js`
- `https://cdn.jsdelivr.net/npm/chart.js`
- `https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js`
- `https://cdn.jsdelivr.net/npm/chart.js`

### profile.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### resources.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### settings.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### simulados.html

- **Total de scripts:** 6
- **Carrega app.js:** ✓

**Scripts carregados:**

- `https://cdn.jsdelivr.net/npm/chart.js`
- `./js/sprintData.js`
- `./js/pomodoroManager.js`
- `./js/app.js`
- `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- `https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js`

### simulator-room.html

- **Total de scripts:** 0
- **Carrega app.js:** ✗

⚠️ **Nenhum script carregado**

### study-sprint.html

- **Total de scripts:** 7
- **Carrega app.js:** ✓

**Scripts carregados:**

- `https://cdn.jsdelivr.net/npm/chart.js`
- `./js/sprintData.js`
- `./js/pomodoroManager.js`
- `./js/app.js`
- `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- `https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js`
- `js/gamificacao/sprintManager.js`

## F. ANÁLISE DO FLUXO DO SIMULADOR

Análise específica do fluxo principal da aplicação:

### Fluxo esperado:

```
index.html (Learning Hub)
    ↓
jornada.html (Trilha Gamificada)
    ↓
diagnostico.html (Diagnóstico de Nivelamento)
    ↓ [questões do diagnóstico]
    ↓ [resultado do diagnóstico]
    ↓
simulados.html (Simulado Principal)
    ↓ [seleção de certificação]
    ↓ [questões do simulado]
    ↓ [resultado do simulado]
```

### Elementos-chave por etapa:

#### 1. Learning Hub (index.html)

**Elementos necessários:**
- `screen-hub` — Container principal do hub
- `btn-start-journey` — Botão para iniciar jornada
- `btn-start-diagnostic` — Botão para iniciar diagnóstico
- `sidebar-cert-badge` — Badge da certificação ativa
- `hub-best-score` — Melhor pontuação
- `hub-insight-text` — Texto do insight de IA

#### 2. Jornada (jornada.html)

**Elementos necessários:**
- `screen-jornada` — Container da tela de jornada
- `gamificacao-trail` — Container da trilha gamificada
- `gamificacao-badges-grid` — Grade de badges
- `guild-leaderboard` — Placar da guilda

#### 3. Diagnóstico (diagnostico.html)

**Elementos necessários:**
- `screen-start` — Tela inicial com seleção
- `screen-quiz` — Tela de execução do quiz
- `screen-results` — Tela de resultados
- `certification-select` — Seletor de certificação
- `btn-start-diagnostic` — Botão iniciar diagnóstico
- `progress-bar` — Barra de progresso
- `question-text` — Texto da questão
- `options-container` — Container de opções
- `btn-submit` — Botão confirmar resposta
- `btn-next` — Botão próxima questão
- `btn-finish` — Botão finalizar

#### 4. Simulado (simulados.html)

**Elementos necessários:**
- `screen-start` — Tela inicial com filtros
- `screen-quiz` — Tela de execução do simulado
- `certification-select` — Seletor de certificação
- `btn-start-quiz` — Botão iniciar simulação
- `quiz-timer` — Timer do modo exame
- `progress-bar` — Barra de progresso
- `question-text` — Texto da questão
- `options-container` — Container de opções
- `btn-practice-mistakes` — Botão praticar erros

## G. RECOMENDAÇÕES

Ordem sugerida para correção dos problemas encontrados:

### Prioridade 1: CRÍTICO

1. **Corrigir 92 referências getElementById quebradas**
   - Esses erros causam `Cannot read properties of null`
   - Impedem funcionalidades de executar
   - Devem ser corrigidos IMEDIATAMENTE

   **Ações sugeridas:**
   - Adicionar os IDs faltantes nos HTMLs corretos
   - OU adicionar validação `if (element)` antes de usar
   - OU remover código morto se a funcionalidade foi descontinuada

### Prioridade 2: ALTO

✅ **Todos os eventos têm elementos correspondentes**

### Prioridade 3: MÉDIO

3. **Revisar 60 elementos HTML órfãos**
   - Elementos que existem mas não são usados pelo JS
   - Podem ser código legado ou funcionalidades incompletas

   **Ações sugeridas:**
   - Documentar se são intencionais
   - Remover se forem código morto
   - Conectar ao JS se forem funcionalidades incompletas

### Prioridade 4: BAIXO (Melhorias)

4. **Adicionar defensive coding**
   - Adicionar validações `if (element)` em todos os seletores
   - Usar `?.` (optional chaining) onde aplicável
   - Adicionar try-catch em blocos críticos

5. **Padronizar nomenclatura**
   - Consistência entre PT/EN
   - Padrão de hífens vs underscores
   - Singular vs plural

6. **Documentar contratos DOM**
   - Documentar quais elementos cada página deve ter
   - Criar testes automatizados de estrutura DOM
   - Validar HTMLs em CI/CD
