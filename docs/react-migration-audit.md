# Auditoria de Migração — React Clean Architecture

> Gerado em: 2026-08-06  
> Branch de destino: `feat/frontend-react-clean`  
> Frontend original: `src/frontend/`

---

## 1. Arquitetura Atual

### Estrutura de pastas

```
src/frontend/
├── pages/          # HTMLs independentes (MPA) + SPA via index.html
├── js/             # JavaScript vanilla (126 KB só no app.js)
│   ├── app.js              # Orquestrador principal — 126 KB, ~3500 linhas
│   ├── shell.js            # App shell: tema, sidebar, header, user menu — 25 KB
│   ├── storageManager.js   # Toda a persistência localStorage — 36 KB
│   ├── quizEngine.js       # Motor de quiz — 23 KB
│   ├── quizManager.js      # Gerência de sessão de quiz — 8 KB
│   ├── dataRepository.js   # Fonte de dados com fallback JSON/API — 8.6 KB
│   ├── userManager.js      # Login, sessão, usuário offline
│   ├── chartManager.js     # Gráficos (Chart.js)
│   ├── pdfReport.js        # Geração de PDF
│   ├── insightEngine.js    # Insights de IA
│   ├── pomodoroManager.js  # Timer Pomodoro
│   ├── timerManager.js     # Temporizadores gerais
│   ├── flashcards.js       # Lógica de flashcards
│   ├── sprintData.js       # Dados de sprint (14 dias)
│   ├── data.js             # Certificações, domínios, metadata — 28 KB
│   ├── uiRenderer.js       # Renderização imperativa de UI
│   ├── types.js            # Tipos/contratos JS
│   ├── core/               # Facades: theme, storage, auth, session
│   ├── services/           # api.js, authService, permissions, modal, notification
│   ├── gamificacao/        # trail, leaderboard, badges, sprintManager
│   ├── recommendations/    # studyNow, resourceMapper, recommendationEngine
│   ├── analytics/          # learningAnalytics, domainAnalyzer, trendAnalyzer
│   ├── simulator/          # engine.js
│   ├── cases/              # caseManager, architectureRenderer
│   ├── modules/            # quiz, hub, flashcards, diagnostico, jornada (thin wrappers)
│   ├── i18n/               # translations.js (PT/EN), initUI.js, useTranslation.js
│   └── utils/              # sanitize, logger, questionIdentity
├── styles/
│   ├── tokens.css          # Design tokens A3Data — bem estruturado
│   ├── style.css           # Residual global (boot overlay, screen transitions)
│   ├── cases.css           # Estilos do módulo Cases — 44 KB (muito grande)
│   ├── utilities.css       # Utilitários
│   ├── base.css            # Reset / base
│   ├── themes.css          # Overrides de tema escuro
│   └── components/
│       ├── layout.css      # Grid, container, header
│       ├── sidebar.css     # Sidebar esquerda fixa
│       ├── shell.css       # Shell geral
│       ├── dashboard.css   # Dashboard
│       ├── cards.css       # Cards genéricos
│       ├── buttons.css     # Botões
│       ├── forms.css       # Formulários
│       ├── badges.css      # Badges de certificação
│       ├── quiz.css        # Quiz/simulado
│       ├── simulator.css   # Sala do simulador
│       ├── gamification.css # Trilha/jornada — 25 KB
│       ├── profile.css     # Perfil
│       ├── settings.css    # Configurações
│       └── animations.css  # Keyframes
└── partials/
    ├── header-spa.html     # Header do SPA principal
    ├── sidebar.html        # Sidebar (placeholder — populada dinamicamente)
    ├── header-page.html    # Header de páginas secundárias
    ├── pomodoro-widget.html
    ├── login-overlay.html
    ├── boot-overlay.html
    └── footer.html
```

### Modelo de dados e páginas

| Página HTML | Rota equivalente | Módulo JS principal |
|---|---|---|
| `index.html` | `/` (SPA) | `app.js` |
| `simulados.html` | `/simulados` | `modules/quiz.js`, `quizEngine.js` |
| `flashcards.html` | `/flashcards` | `flashcards.js` |
| `cases.html` | `/cases` | `cases/caseManager.js` |
| `case-view.html` | `/cases/:id` | `cases/architectureRenderer.js` |
| `jornada.html` | `/jornada` | `gamificacao/trailManager.js` |
| `diagnostico.html` | `/diagnostico` | `modules/diagnostico.js` |
| `resources.html` | `/recursos` | `recommendations/resourceMapper.js` |
| `study-now.html` | `/study-now` | `recommendations/studyNow.js` |
| `study-sprint.html` | `/study-sprint` | `gamificacao/sprintManager.js` |
| `simulator-hub.html` | `/simulator-hub` | `modules/hub.js` |
| `simulator-room.html` | `/simulator-room` | `simulator/engine.js` |
| `profile.html` | `/perfil` | — |
| `settings.html` | `/configuracoes` | — |

---

## 2. Mapeamento de Estado (localStorage)

Prefixo universal: `aws_sim_`

| Chave | Descrição |
|---|---|
| `aws_sim_theme` | `'light'` \| `'dark'` |
| `aws_sim_lang` | `'pt'` \| `'en'` |
| `aws_sim_history` | Array de sessões de quiz concluídas |
| `aws_sim_mistakes` | Objeto indexado por id de questão com erros |
| `aws_sim_gamification` | Objeto: totalQuizzes, bestScore, streak, badges |
| `aws_sim_focus_log` | Log de sessões Pomodoro |
| `aws_sim_active_session_{certId}` | Sessão de quiz em andamento |
| `aws_sim_last_{certId}` | Último resultado por certificação |
| `aws_sim_sprint_state_{certId}` | Estado da sprint de estudos |
| `aws_sim_active_case_{caseId}` | Caso prático em andamento |
| `aws_sim_{certId}_review_deck` | Deck de revisão por certificação |
| `aws_sim_user` | Dados do usuário logado (SessionManager) |

**Regra de compatibilidade:** o React deve manter exatamente este prefixo e estas chaves para não quebrar dados de usuários existentes.

---

## 3. Mapeamento de Chamadas API

Base URL: `http://localhost:3001` (dev) / `''` (GitHub Pages/estático)

| Endpoint | Método | Módulo que chama |
|---|---|---|
| `/api/health` | GET | `api.js` |
| `/api/auth/login` | POST | `userManager.login()` |
| `/api/questions?cert=&limit=` | GET | `dataRepository.js` |
| `/api/quiz/start` | POST | `quizManager.js` |
| `/api/quiz/submit` | POST | `quizManager.js` |
| `/api/quiz/answer` | POST | `quizEngine.js` |
| `/api/stats/domains?userId=&certId=` | GET | `chartManager.js` |
| `/api/stats/weak-domains?userId=` | GET | `insightEngine.js` |
| `/api/leaderboard` | GET | `gamificacao/leaderboard.js` |
| `/api/cases` | GET | `cases/caseManager.js` |
| `/api/cases/:id` | GET | `cases/caseManager.js` |
| `/api/validation/questions` | GET | `validation/` |

**Fallback offline:** todos os módulos têm fallback para JSONs em `data/` via `dataRepository.js`.

---

## 4. Regras de Negócio Críticas

### Autenticação
- Email obrigatoriamente `@a3data.com.br` ou `@a3data.com`
- Roles: `STUDENT`, `INSTRUCTOR`, `ADMIN`
- Sem API → usuário offline criado localmente, role sempre `STUDENT`

### Sidebar dinâmica
- Itens visíveis dependem do role do usuário
- `ADMIN` vê item de validação de questões
- Em páginas SPA → `window[action]()`; em páginas separadas → redirect

### Tema
- Toggle claro/escuro via classe `dark` no `<html>`
- Persiste em `aws_sim_theme`
- Inicializado antes do primeiro paint (evita flash)

### Pontuação
- Aprovação: 70% (`PASSING_SCORE = 70`)
- Streak: dias consecutivos com ≥ 70% de acerto
- Badges: `perfect` (100%), `dedicated` (≥10 quiz), `streak` (≥5 dias)

### Quiz / Simulado
- Modos: simulado cronometrado, missão, diagnóstico
- Timer por questão (missão) ou por sessão completa
- Auto-save em `active_session_{certId}` a cada resposta

---

## 5. Problemas Encontrados

### Acoplamento crítico
- `app.js` com 126 KB e ~3500 linhas: orquestra UI, lógica de negócio, eventos DOM, estado, timers e chamadas API no mesmo arquivo
- Funções globais via `window.*` usadas como handlers em `onclick=""` nos HTMLs
- `shell.js` acoplado ao DOM diretamente (cria elementos imperativamente)
- Sidebar construída por string concatenation no JS

### CSS
- `cases.css` com 44 KB — mistura layout, responsividade, animações e estados em um único arquivo
- `gamification.css` com 25 KB — mesmo problema
- `style.css` ainda tem ~21 KB de residuais que não foram totalmente migrados para componentes
- Tailwind CDN usado em produção (não otimizado, classes não purgadas)
- Mistura de Tailwind utility classes com CSS customizado — inconsistência visual
- Algumas classes ainda com valores literais (`margin: 17px`, `padding: 23px`) fora dos tokens — não verificado em massa, mas há indícios em partes não auditadas

### Dependências externas no HTML
- Tailwind CDN via `<script src="https://cdn.tailwindcss.com">`
- FontAwesome via CDN
- Sem bundler — todos os JS são ES modules carregados pelo browser

### i18n
- Sistema PT/EN funcional mas implementado como objeto global de strings
- `initUI.js` com 11 KB percorre o DOM aplicando `data-i18n` attributes
- Sem lazy loading das traduções

### Performance
- Bundle não otimizado (sem code splitting, sem tree shaking)
- `app.js` carrega todo o código na inicialização
- Charts (Chart.js) provavelmente carregados mesmo em páginas sem gráficos

---

## 6. Estratégia de Migração

### Princípio
Não é uma conversão 1:1 de HTML → JSX. É uma reescrita com separação clara de responsabilidades, reutilizando a lógica de negócio existente nos services.

### Abordagem: Strangler Fig
1. O React roda em paralelo em `src/react/`
2. O vanilla JS em `src/frontend/` permanece intacto como referência
3. As rotas React substituem gradualmente as páginas HTML
4. Serviços e lógica de negócio são adaptados e reutilizados (não copiados cegamente)

### O que preservar (adaptar, não reescrever do zero)
- `storageManager.js` → `storageService.js` (wrapper React-friendly)
- `services/api.js` → `api.js` (praticamente idêntico)
- `dataRepository.js` → integrado ao `questionService.js`
- `data.js` → importado diretamente
- `i18n/translations.js` → usado via hook `useTranslation`
- Tokens CSS → migrados 1:1 para `src/react/styles/tokens.css`

### O que não preservar
- Manipulação imperativa do DOM
- Funções globais `window.*`
- `onclick=""` inline nos HTMLs
- Construção de HTML por template strings
- Tailwind CDN (substituir por CSS Modules com tokens)

---

## 7. Componentes a Criar (Mapeamento Vanilla → React)

| Vanilla JS / HTML | Componente React | Localização |
|---|---|---|
| `partials/header-spa.html` + shell.js | `Header.jsx` | `components/navigation/` |
| `partials/sidebar.html` + `buildSidebar()` | `Sidebar.jsx` | `components/navigation/` |
| `services/modalService.js` | `Modal.jsx` | `components/feedback/` |
| `services/notificationService.js` | `Toast.jsx` | `components/feedback/` |
| Botões com classes `a3-btn` | `Button.jsx` | `components/common/` |
| Divs com classes `a3-card` | `Card.jsx` | `components/common/` |
| Badges de certificação | `Badge.jsx` | `components/common/` |
| Barras de progresso | `Progress.jsx` | `components/common/` |
| States vazios | `EmptyState.jsx` | `components/common/` |
| `screen-hub` (SPA) | `Dashboard/index.jsx` | `pages/Dashboard/` |
| `study-now.html` | `StudyNow/index.jsx` | `pages/StudyNow/` |
| `study-sprint.html` | `StudySprint/index.jsx` | `pages/StudySprint/` |
| `cases.html` | `Cases/index.jsx` | `pages/Cases/` |
| `resources.html` | `Resources/index.jsx` | `pages/Resources/` |
| `simulados.html` | `Simulados/index.jsx` | `pages/Simulados/` |
| `core/theme.js` | `ThemeContext.jsx` | `contexts/` |
| `userManager.js` + `core/sessionManager.js` | `UserContext.jsx` | `contexts/` |

---

## 8. Ordem de Migração (Sprints)

### Sprint 1 — Shell (esta sprint)
1. Configuração Vite + React
2. Design tokens (`tokens.css`, `globals.css`)
3. Componentes comuns: Button, Card, Badge, Progress, EmptyState
4. Navegação: Header, Sidebar
5. Feedback: Toast, Modal
6. Contextos: ThemeContext, UserContext
7. Layout: AppLayout
8. App shell: App.jsx, routes.jsx, main.jsx
9. Dashboard com FeatureCards
10. Services: api.js, questionService.js, storageService.js

### Sprint 2 — Módulos de estudo
- StudyNow (recomendações, estudo rápido)
- StudySprint (sprint de 14 dias)

### Sprint 3 — Prática
- Cases (casos arquiteturais)
- Resources (materiais de estudo)

### Sprint 4 — Simulados
- Simulados (quiz engine completo)
- Diagnóstico
- Flashcards

### Sprint 5 — Gamificação e perfil
- Jornada / Trilha
- Profile
- Settings
- Leaderboard

---

## 9. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Bundler | Vite 6 | Mais rápido, ESM nativo, HMR excelente |
| Roteamento | React Router v7 | Padrão da comunidade, lazy loading nativo |
| CSS | CSS Modules + tokens.css | Sem runtime overhead, escopo por componente |
| Estado global | Context API | Suficiente para tema e usuário; evita Redux prematuro |
| Ícones | react-icons (fa) | Substitui FontAwesome CDN, tree-shakable |
| i18n | Hook personalizado sobre translations.js existente | Reutiliza trabalho já feito |
| Testes | Vitest + React Testing Library | Integra com Vite nativamente |
| Linting | ESLint + eslint-plugin-react | Estende config existente do projeto |
