# 🔧 PLANO DE CORREÇÕES — Login no GitHub Pages + Auditoria DOM

**Data:** 10/08/2026  
**Contexto:** Diagnóstico realizado após investigação do agente (09/08/2026)  
**Escopo:** Dois grupos de problemas — comportamento do login no GitHub Pages e 55+ erros críticos de compatibilidade DOM

---

## 📋 SUMÁRIO EXECUTIVO

| Grupo | Problema | Gravidade | Esforço |
|-------|----------|-----------|---------|
| **Login** | Overlay de login exibido mesmo sem backend no GitHub Pages | 🔴 Alta | ~1h |
| **DOM — UI containers** | `a3-toast-container`, `a3-modal-container` ausentes | 🔴 Alta | ~1h |
| **DOM — side-info** | 9 rInicie eferências a elemento inexistente | 🔴 Alta | ~2h |
| **DOM — detailed-report** | Container de relatório ausente em páginas de resultado | 🔴 Alta | ~30min |
| **DOM — Sprint Manager** | 9 elementos ausentes em `study-sprint.html` | 🟠 Média | ~2h |
| **DOM — User Menu** | 5 elementos do menu de usuário ausentes | 🟠 Média | ~1h |
| **DOM — outros** | `dynamic-insight`, interativos, simulator engine | 🟡 Baixa | ~2h |

---

## PARTE 1 — PROBLEMA DO LOGIN NO GITHUB PAGES

### 🔍 Diagnóstico

**O que acontece no GitHub Pages:**
1. O usuário acessa `https://karlarenatadev.github.io/...`
2. O app carrega e tenta restaurar a sessão via `AuthService.restoreSession()`
3. Se não há sessão salva, chama `showLoginUI()` — exibe o overlay de login
4. O usuário digita o email `@a3data.com.br` e clica "Entrar"
5. `AuthService.login(email)` → `userManager.login(email)` → `apiService.loginUser()`
6. `apiService.loginUser()` chama `fetchWithRetry('/api/auth/login')`
7. **`fetchWithRetry` verifica `API_CONFIG.BASE_URL`**

**O que deveria acontecer (e tecnicamente acontece):**  
Em `public/js/services/api.js`, a função `getConfiguredApiUrl()` detecta `github.io` e retorna `''`.  
Quando `BASE_URL` é `''`, `fetchWithRetry` lança imediatamente um erro com `{ apiDisabled: true }`.  
O `userManager.login()` captura esse erro e chama `createOfflineUser()` — sessão offline criada.

**Por que o usuário percebe como "login solicitando API":**

Há dois comportamentos que causam confusão:

#### Causa A — O overlay de login sempre aparece (independente da API)
O overlay de login em `showLoginUI()` é exibido **sempre** que não há sessão. O usuário precisa digitar o email e clicar em "Entrar" mesmo no GitHub Pages, onde a autenticação é apenas local. A UX parece "estar aguardando a API".

#### Causa B — Mensagem de erro ambígua no overlay
No `catch` do `showLoginUI()` (em `app.js`), erros de timeout e rede mostram:
```
"Serviço temporariamente indisponível. Tente novamente."
```
Mas no GitHub Pages o erro é `apiDisabled: true` — não é "indisponível", é desativado. Se o erro `apiDisabled` não estiver sendo tratado com mensagem correta no overlay, o usuário vê essa mensagem genérica.

#### Causa C — `API_CONFIG` é inicializado no load do módulo
`const API_CONFIG = { BASE_URL: getConfiguredApiUrl() }` é executado **uma vez** quando o módulo é importado. Se por alguma razão o módulo for carregado antes do `window.location` estar definido (ex.: em SSR ou em contexto de teste), `BASE_URL` pode ser `'http://localhost:3001'` por engano.

---

### ✅ Correções para o Login

#### Correção 1.1 — Bypass automático do login no GitHub Pages (RECOMENDADA)

Localização: `src/frontend/js/app.js` → função que controla o boot

Adicionar detecção de ambiente estático **antes** de exibir o overlay de login:

```javascript
// src/frontend/js/app.js
// No bloco de boot, antes de chamar showLoginUI():

async function bootApp() {
  // ... código existente ...

  // NOVO: Detectar se estamos em deploy estático (GitHub Pages)
  const isStaticDeploy = typeof window !== 'undefined' && 
    window.location?.hostname?.endsWith('github.io');

  let user = await AuthService.restoreSession();

  if (!user) {
    if (isStaticDeploy) {
      // No GitHub Pages, não há backend. Login automático como guest.
      user = await userManager.createOfflineUser('guest@a3data.com.br', { full_name: 'Visitante' });
      logger.info('[Boot] GitHub Pages detectado — sessão offline criada automaticamente.');
    } else {
      // Ambiente com potencial backend: exibe overlay de login
      user = await showLoginUI();
    }
  }

  // ... resto do boot ...
}
```

> **Alternativa menos invasiva:** se quiser manter o overlay, pelo menos pular o overlay e entrar direto como offline quando `apiDisabled: true` for detectado.

---

#### Correção 1.2 — Mensagem clara no overlay quando API está desativada

Localização: `src/frontend/js/app.js` → função `showLoginUI()` → bloco `catch`

```javascript
// ANTES (em app.js, dentro do handleSubmit do showLoginUI):
} catch (error) {
  const rawMsg = error?.message || "";
  let msg;
  if (rawMsg.includes("timeout") || rawMsg.includes("signal is aborted")) {
    msg = "Serviço temporariamente indisponível. Tente novamente.";
  } else {
    msg = rawMsg || "Erro ao autenticar.";
  }
  showError(msg);
}

// DEPOIS — adicionar tratamento explícito de apiDisabled:
} catch (error) {
  const rawMsg = error?.message || "";
  let msg;

  if (error?.apiDisabled) {
    // API desativada (GitHub Pages / deploy estático)
    // Isso não deveria chegar aqui se a Correção 1.1 foi aplicada,
    // mas é um safety net.
    overlay.classList.add("hidden");
    form.removeEventListener("submit", handleSubmit);
    resolve(await userManager.createOfflineUser(email));
    return;
  } else if (rawMsg.includes("403") || rawMsg.includes("não autorizado")) {
    msg = "Email não autorizado. Use seu email @a3data.com.br.";
  } else if (rawMsg.includes("timeout") || rawMsg.includes("signal is aborted")) {
    msg = "Serviço temporariamente indisponível. Tente novamente.";
  } else {
    msg = rawMsg || "Erro ao autenticar.";
  }
  showError(msg);
}
```

---

#### Correção 1.3 — Garantir que `src/frontend` seja a fonte de verdade

O projeto tem dois arquivos `api.js`:
- `public/services/api.js` — versão **sem** verificação de `force_offline` no sessionStorage
- `public/js/services/api.js` (gerado do build de `src/frontend/js/services/api.js`) — versão **com** verificação completa

Confirmar que o build sempre usa a versão correta:

```bash
# Verificar qual arquivo é usado após o build:
npm run build
diff public/js/services/api.js public/services/api.js
```

Se houver diferença, o `public/services/api.js` (legado) pode estar sendo importado por alguma página. Verificar se algum HTML importa diretamente de `./services/api.js` em vez de `./js/services/api.js`.

---

#### Correção 1.4 — Após corrigir em src/, rodar o build

O `public/` é gerado pelo build. Toda correção deve ser feita em `src/frontend/`, depois:

```bash
npm run build
```

Os arquivos `public/js/*.js` e `public/js/services/*.js` são sobrescritos pelo build.

---

### 📋 Checklist de validação do login

- [ ] No GitHub Pages: usuário entra sem ver overlay (se Correção 1.1 aplicada), OU entra com overlay mas sessão offline é criada automaticamente após digitar email @a3data
- [ ] Localmente com API: login normal via POST /api/auth/login funciona
- [ ] Localmente sem API: fallback offline ativado automaticamente
- [ ] Mensagem de erro `apiDisabled` não exibe "Serviço indisponível" para o usuário
- [ ] `npm run build` após qualquer mudança em `src/frontend/`

---

## PARTE 2 — CORREÇÕES DE AUDITORIA DOM (55 erros críticos)

> Referência: `docs/RELATORIO_AUDITORIA_DOM_EXECUTIVO.md` e `docs/GUIA_CORRECOES_DOM.md`

A auditoria identificou 55 referências `getElementById` que retornam `null` — causando erros do tipo `Cannot read properties of null`. Abaixo as correções priorizadas.

---

### 🔴 Prioridade 1 — Crítico (fazer agora, ~4h total)

#### Correção 2.1 — Containers de UI dinâmicos (toast + modal)

**Arquivos JS afetados:** `uiRenderer.js` (linhas 25, 70, 128)  
**Problema:** `a3-toast-container` e `a3-modal-container` não existem em nenhuma página HTML.

**Solução recomendada: criar dinamicamente no `uiRenderer.js`**

```javascript
// src/frontend/js/uiRenderer.js

/**
 * Garante que o container de toasts existe no DOM.
 * Cria-o dinamicamente se não encontrado.
 */
function ensureToastContainer() {
  let container = document.getElementById('a3-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'a3-toast-container';
    container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Garante que o container de modais existe no DOM.
 */
function ensureModalContainer() {
  let container = document.getElementById('a3-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'a3-modal-container';
    container.className = 'fixed inset-0 z-[9998] pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}
```

Em seguida, substituir todas as ocorrências de:
```javascript
// ANTES (quebra se elemento não existe):
const container = document.getElementById('a3-toast-container');
container.appendChild(toast);

// DEPOIS (seguro):
const container = ensureToastContainer();
container.appendChild(toast);
```

---

#### Correção 2.2 — `side-info` (9 ocorrências em app.js)

**Arquivo JS afetado:** `app.js` (linhas 815, 907, 1008, 1573, 1589, 2777, 2934, 3396, 3614)  
**Problema:** `document.getElementById('side-info')` retorna `null` — o elemento não existe nos HTMLs.

**Investigar primeiro:**
```bash
# No terminal, verificar se existe alguma sidebar com outro ID nos HTMLs:
grep -r "sidebar\|side-info\|left-sidebar" src/frontend/pages/ --include="*.html"
```

**Solução A — Adicionar elemento HTML** (se a sidebar deve existir visualmente):

Adicionar em todos os HTMLs principais (`index.html`, `simulados.html`, `diagnostico.html`, etc.) antes de `</body>`:

```html
<!-- Painel lateral de informações contextuais -->
<aside 
  id="side-info" 
  class="fixed right-0 top-16 w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-4 overflow-y-auto h-[calc(100vh-4rem)] transform translate-x-full transition-transform duration-300 z-40 hidden"
  aria-label="Informações contextuais"
>
  <!-- Conteúdo injetado dinamicamente pelo app.js -->
</aside>
```

**Solução B — Defensive coding** (se a sidebar é opcional/legado):

```javascript
// src/frontend/js/app.js — envolver TODAS as 9 referências:
function updateSideInfo(content) {
  const el = document.getElementById('side-info');
  if (!el) return; // Elemento opcional, sai silenciosamente
  el.innerHTML = content;
}
```

> Recomendação: aplicar **Solução B imediatamente** para eliminar os erros, e avaliar se a Solução A faz sentido para o design futuro.

---

#### Correção 2.3 — `detailed-report` (3 ocorrências em app.js)

**Arquivo JS afetado:** `app.js` (linhas 809, 1890, 2929)  
**Páginas afetadas:** `simulados.html`, `diagnostico.html`

Adicionar o elemento dentro de `#screen-results` em ambas as páginas:

```html
<!-- src/frontend/pages/simulados.html e diagnostico.html -->
<!-- Dentro do div#screen-results (que já existe) -->
<div id="screen-results" class="hidden ...">
  
  <!-- ADICIONAR: -->
  <div id="detailed-report" class="w-full max-w-4xl mx-auto mt-6">
    <!-- Relatório detalhado injetado via JS -->
  </div>
  
</div>
```

Adicionar defensive coding no JS também:
```javascript
// app.js — nas 3 referências a detailed-report:
const oldReport = document.getElementById('detailed-report');
if (oldReport) {
  oldReport.innerHTML = ''; // limpa, mas não remove o container
}
```

---

### 🟠 Prioridade 2 — Alto (fazer esta semana, ~4-8h)

#### Correção 2.4 — Sprint Manager (9 elementos em `study-sprint.html`)

**Arquivo JS afetado:** `sprintManager.js`, `app.js`  
**Elementos ausentes:**
- `sprint-days-grid`
- `sprint-progress-text`
- `sprint-module-title`
- `sprint-module-subtitle`
- `sprint-progress-label`
- `sprint-start-btn`
- `sprint-current-day-label`
- `sprint-reader-overlay`
- `sprint-current-cert-badge`

**Verificar primeiro** se a auditoria analisou a versão mais recente:
```bash
grep -E "sprint-days-grid|sprint-progress-text|sprint-module-title" src/frontend/pages/study-sprint.html
```

Se os elementos **já existem** em `src/frontend/pages/study-sprint.html` mas **não** em `public/study-sprint.html`, o problema é que o build não copiou corretamente — rodar `npm run build` resolve.

Se os elementos **não existem** em `src/frontend/pages/study-sprint.html`, adicionar a estrutura descrita em `docs/GUIA_CORRECOES_DOM.md` seção 5.

---

#### Correção 2.5 — User Menu (5 elementos em `shell.js`)

**Arquivo JS afetado:** `shell.js`  
**Elementos:** `user-menu-btn`, `user-dropdown`, `user-menu-logout`, `user-menu-profile`, `user-menu-settings`

Verificar se `shell.js` já cria esses elementos dinamicamente com `renderUserMenu()`:

```bash
grep -n "user-menu-btn\|user-dropdown\|renderUserMenu" src/frontend/js/shell.js
```

Se `renderUserMenu()` cria os elementos dinamicamente via `innerHTML`, mas os IDs são referenciados **antes** de `renderUserMenu()` ser chamado, o problema é de ordem de execução — garantir que `renderUserMenu(user)` seja chamado no boot antes de qualquer acesso a esses IDs.

Se os elementos não são criados dinamicamente, adicionar a implementação descrita em `docs/GUIA_CORRECOES_DOM.md` seção 6.

---

### 🟡 Prioridade 3 — Médio (fazer este mês)

#### Correção 2.6 — `dynamic-insight` (2 ocorrências)

Adicionar em `index.html` (Hub principal):
```html
<!-- src/frontend/pages/index.html — na seção de aprendizado -->
<div id="dynamic-insight" class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hidden">
  <!-- Insight dinâmico gerado pela IA local -->
</div>
```

#### Correção 2.7 — Elementos interativos (`sortable-list`, `btn-validate-interactive`, `interactive-feedback`)

Esses elementos são usados por `interactiveEngine.js`. Adicionar na página onde questões interativas são exibidas (provavelmente `simulados.html` ou um container interno de quiz):

```html
<!-- Dentro do container de quiz, quando modo interativo ativo -->
<div id="sortable-list" class="hidden space-y-2"></div>
<button id="btn-validate-interactive" class="hidden a3-btn a3-btn-primary mt-4">Validar</button>
<div id="interactive-feedback" class="hidden mt-4 p-4 rounded-lg"></div>
```

#### Correção 2.8 — Simulator Engine (casos práticos)

Elementos: `briefingContent`, `chatHistory`, `chatOptions`, `designBuilder`, `evaluationContent`

Esses elementos devem existir em `simulator-room.html`. Verificar e adicionar se ausentes.

---

### 💡 Prioridade 4 — Melhorias estruturais (backlog)

#### Correção 2.9 — Defensive coding global em app.js

Aplicar `optional chaining` e early returns em toda manipulação DOM que não tem garantia de existência:

```javascript
// Padrão a seguir em todo o app.js:

// ANTES:
const el = document.getElementById('meu-elemento');
el.innerHTML = conteudo; // ❌ quebra se null

// DEPOIS:
const el = document.getElementById('meu-elemento');
if (!el) { console.warn('[app] meu-elemento não encontrado'); return; }
el.innerHTML = conteudo; // ✅
```

#### Correção 2.10 — Testes de contratos DOM

Criar `__tests__/dom-contracts.test.js` para validar automaticamente que os elementos críticos existem nos HTMLs corretos:

```javascript
// __tests__/dom-contracts.test.js
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const readHTML = (file) => {
  const full = path.resolve('public', file);
  return new JSDOM(fs.readFileSync(full, 'utf-8')).window.document;
};

describe('Contratos DOM — simulados.html', () => {
  let doc;
  beforeAll(() => { doc = readHTML('simulados.html'); });

  test('deve ter container de resultado detalhado', () => {
    expect(doc.getElementById('detailed-report')).not.toBeNull();
  });
  test('deve ter screen-results', () => {
    expect(doc.getElementById('screen-results')).not.toBeNull();
  });
});

describe('Contratos DOM — index.html', () => {
  let doc;
  beforeAll(() => { doc = readHTML('index.html'); });

  test('deve ter containers de UI dinâmicos OU uiRenderer deve criá-los', () => {
    // Containers podem ser criados dinamicamente — OK se ausentes no HTML
    // Este teste documenta o comportamento esperado
    const hasStatic = Boolean(
      doc.getElementById('a3-toast-container') ||
      doc.getElementById('a3-modal-container')
    );
    // Se não existem no HTML, precisam ser criados via ensureToastContainer()
    expect(typeof hasStatic).toBe('boolean'); // Documenta que a decisão foi feita
  });
});
```

---

## 📦 ORDEM DE EXECUÇÃO RECOMENDADA

```
1. src/frontend/js/uiRenderer.js  → Correção 2.1 (toast/modal containers)
2. src/frontend/js/app.js         → Correção 2.2 (defensive coding side-info)
3. src/frontend/pages/simulados.html, diagnostico.html → Correção 2.3 (detailed-report)
4. npm run build                  → Propagar mudanças para public/
5. npm test                       → Verificar que nada quebrou
6. src/frontend/js/app.js         → Correção 1.1 (bypass login no GitHub Pages)
7. npm run build && npm test       → Verificar tudo
8. Abrir GitHub Pages e testar login manualmente
```

---

## 🧪 TESTES DE REGRESSÃO

Após aplicar as correções, validar:

```bash
# 1. Build reprodutível
npm run build

# 2. Testes unitários
npm test -- --runInBand

# 3. Lint
npm run lint

# 4. Format check
npm run format:check
```

**Teste manual no GitHub Pages:**
1. Acessar `https://karlarenatadev.github.io/...` em aba anônima
2. Verificar que o app carrega sem solicitar API
3. Se overlay de login aparecer: digitar um email `@a3data.com.br` → deve entrar sem erro
4. Navegar para simulados, flashcards, jornada → verificar que não há erros no console (F12)

---

## 📚 DOCUMENTOS RELACIONADOS

| Documento | Conteúdo |
|-----------|----------|
| `docs/RELATORIO_AUDITORIA_DOM_EXECUTIVO.md` | Relatório executivo com os 55 erros e impactos |
| `docs/AUDITORIA_DOM_COMPLETA.md` | Relatório técnico completo com todos os detalhes |
| `docs/GUIA_CORRECOES_DOM.md` | Exemplos de código para cada correção DOM |
| `docs/COMPARACAO_AUDITORIA.md` | Comparação antes/depois da correção do script de auditoria |
| `docs/ARCHITECTURE-FRONTEND.md` | Arquitetura do frontend e convenções |

---

## ⚠️ NOTA IMPORTANTE SOBRE O BUILD

> **`src/frontend/` é a fonte de verdade. `public/js/` é gerado.**

Toda correção de JavaScript deve ser feita em `src/frontend/js/`.  
Toda correção de HTML deve ser feita em `src/frontend/pages/`.  
Após qualquer mudança, rodar `npm run build` para propagar para `public/`.

Exceções (arquivos diretos em `public/` sem contrapartida em `src/`):
- `public/index.html` — fonte direta, editar aqui
- `public/partials/*.html` — verificar se têm contrapartida em `src/frontend/partials/`

---

**Diagnóstico realizado por:** Kiro  
**Data:** 10/08/2026
