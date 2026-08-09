# RELATORIO DE AUDITORIA — COMPATIBILIDADE JAVASCRIPT <-> HTML

**Data:** C:\Users\karla.rosario_a3data\OneDrive\Documentos\GitHub\projeto-simulados-certificacao-aws

---

## A. RESUMO EXECUTIVO

- **Seletores JavaScript analisados:** 169
- **IDs HTML encontrados:** 165
- **Erros criticos:** 62 [CRITICO]
- **Elementos ausentes:** 0 [AVISO]

## B. ERROS CRITICOS

Problemas que **QUEBRAM** a aplicacao:

### [1] `login-overlay`

- **Arquivo:** `app.js`
- **Linha:** 111
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const overlay = document.getElementById("login-overlay");
```

### [2] `login-form`

- **Arquivo:** `app.js`
- **Linha:** 112
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const form = document.getElementById("login-form");
```

### [3] `login-email-input`

- **Arquivo:** `app.js`
- **Linha:** 113
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const emailInput = document.getElementById("login-email-input");
```

### [4] `login-submit-btn`

- **Arquivo:** `app.js`
- **Linha:** 114
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const submitBtn = document.getElementById("login-submit-btn");
```

### [5] `login-btn-text`

- **Arquivo:** `app.js`
- **Linha:** 115
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const btnText = document.getElementById("login-btn-text");
```

### [6] `login-btn-spinner`

- **Arquivo:** `app.js`
- **Linha:** 116
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const spinner = document.getElementById("login-btn-spinner");
```

### [7] `login-error-msg`

- **Arquivo:** `app.js`
- **Linha:** 117
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const errorMsg = document.getElementById("login-error-msg");
```

### [8] `app-boot-overlay`

- **Arquivo:** `app.js`
- **Linha:** 315
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const bootOverlay = document.getElementById("app-boot-overlay");
```

### [9] `detailed-report`

- **Arquivo:** `app.js`
- **Linha:** 809
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const oldReport = document.getElementById("detailed-report");
```

### [10] `detailed-report`

- **Arquivo:** `app.js`
- **Linha:** 1890
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
let reportDiv = document.getElementById("detailed-report");
```

### [11] `detailed-report`

- **Arquivo:** `app.js`
- **Linha:** 2929
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const oldReport = document.getElementById("detailed-report");
```

### [12] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 815
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [13] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 907
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [14] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 1008
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [15] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 1573
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sideInfo = document.getElementById("side-info");
```

### [16] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 1589
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [17] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 2777
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [18] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 2934
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [19] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 3396
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [20] `side-info`

- **Arquivo:** `app.js`
- **Linha:** 3614
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebar = document.getElementById("side-info");
```

### [21] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 826
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [22] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 923
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [23] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 1023
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [24] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 1591
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [25] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 2779
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [26] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 2943
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [27] `score-container`

- **Arquivo:** `app.js`
- **Linha:** 3417
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const scoreContainer = document.getElementById("score-container");
```

### [28] `btn-start-personalized-diagnostic-quiz`

- **Arquivo:** `app.js`
- **Linha:** 964
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const btn = document.getElementById("btn-start-personalized-diagnostic-quiz");
```

### [29] `question-validation-badge`

- **Arquivo:** `app.js`
- **Linha:** 1170
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const oldBadge = document.getElementById("question-validation-badge");
```

### [30] `question-validation-badge`

- **Arquivo:** `app.js`
- **Linha:** 2729
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const badge = document.getElementById("question-validation-badge");
```

### [31] `hub-last-quiz`

- **Arquivo:** `app.js`
- **Linha:** 1699
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const lastQuizEl = document.getElementById("hub-last-quiz");
```

### [32] `dynamic-insight`

- **Arquivo:** `app.js`
- **Linha:** 2425
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const insightEl = document.getElementById("dynamic-insight");
```

### [33] `dynamic-insight`

- **Arquivo:** `app.js`
- **Linha:** 3083
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const insightEl = document.getElementById("dynamic-insight");
```

### [34] `sidebar-btn-mistakes`

- **Arquivo:** `app.js`
- **Linha:** 2520
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const sidebarBtn = document.getElementById("sidebar-btn-mistakes");
```

### [35] `sidebar-mistakes-count`

- **Arquivo:** `app.js`
- **Linha:** 2521
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const badge = document.getElementById("sidebar-mistakes-count");
```

### [36] `score-display`

- **Arquivo:** `app.js`
- **Linha:** 2530
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const el = document.getElementById("score-display");
```

### [37] `study-recommendation-banner`

- **Arquivo:** `app.js`
- **Linha:** 3506
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const existingBanner = document.getElementById("study-recommendation-banner");
```

### [38] `btn-flashcards-home`

- **Arquivo:** `flashcards.js`
- **Linha:** 231
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const homeBtn = document.getElementById("btn-flashcards-home");
```

### [39] `pomodoro-widget`

- **Arquivo:** `pomodoroManager.js`
- **Linha:** 12
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const widget = document.getElementById("pomodoro-widget");
```

### [40] `btn-pomodoro-toggle`

- **Arquivo:** `pomodoroManager.js`
- **Linha:** 17
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const btn = document.getElementById("btn-pomodoro-toggle");
```

### [41] `btn-pomodoro-toggle`

- **Arquivo:** `pomodoroManager.js`
- **Linha:** 47
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
document.getElementById("btn-pomodoro-toggle").innerHTML =
```

### [42] `pomodoro-display`

- **Arquivo:** `pomodoroManager.js`
- **Linha:** 105
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const display = document.getElementById("pomodoro-display");
```

### [43] `header-pomodoro-timer`

- **Arquivo:** `pomodoroManager.js`
- **Linha:** 109
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const headerTimer = document.getElementById("header-pomodoro-timer");
```

### [44] `user-menu-btn`

- **Arquivo:** `shell.js`
- **Linha:** 382
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const btn = document.getElementById("user-menu-btn");
```

### [45] `user-dropdown`

- **Arquivo:** `shell.js`
- **Linha:** 383
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const dropdown = document.getElementById("user-dropdown");
```

### [46] `user-menu-logout`

- **Arquivo:** `shell.js`
- **Linha:** 384
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const logoutBtn = document.getElementById("user-menu-logout");
```

### [47] `user-menu-profile`

- **Arquivo:** `shell.js`
- **Linha:** 429
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const profileBtn = document.getElementById("user-menu-profile");
```

### [48] `user-menu-settings`

- **Arquivo:** `shell.js`
- **Linha:** 438
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const settingsBtn = document.getElementById("user-menu-settings");
```

### [49] `sidebar-collapse-btn`

- **Arquivo:** `shell.js`
- **Linha:** 600
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const collapseBtn = document.getElementById("sidebar-collapse-btn");
```

### [50] `timer-text`

- **Arquivo:** `timerManager.js`
- **Linha:** 52
- **Tipo:** `getElementById`
- **Problema:** ID não existe em nenhum HTML
- **Impacto:** Pode causar 'Cannot read properties of null'

```javascript
const el = document.getElementById("timer-text");
```

## C. ELEMENTOS HTML AUSENTES

[OK] Todos os elementos HTML necessarios existem!
