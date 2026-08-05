# Auditoria de Arquitetura — Frontend

> Gerado em: 2026-08-05
> Status: documento vivo — atualizar a cada reorganização significativa de páginas ou módulos.

---

## 1. Estrutura de páginas

| Página | Scripts carregados | Observações |
|---|---|---|
| `index.html` | `shell.js`, `app.js`, `sprintData.js`, `pomodoroManager.js`, Chart.js (CDN), jsPDF (CDN), Sortable (CDN) | SPA principal — 1730 linhas. Contém todas as telas do simulador montadas no mesmo documento |
| `cases.html` | `shell.js`, `authService.js`, `caseManager.js` | Listagem de cases de arquitetura |
| `case-view.html` | `caseManager.js`, `architectureRenderer.js`, Drawflow (CDN) | Visualização individual de case com diagrama interativo |
| `resources.html` | `shell.js`, `authService.js` | Página de recursos de estudo |
| `profile.html` | `shell.js`, `authService.js`, `storageManager.js`, `userManager.js` | Perfil do usuário |
| `settings.html` | `shell.js`, `authService.js` | Configurações da aplicação |
| `simulator-hub.html` | JS inline (fetch `/api/cases` direto, **sem shell**) | Hub do simulador avançado — não usa o componente shell |
| `simulator-room.html` | `SimulatorEngineClient` via `/js/simulator/engine.js` (**sem shell**) | Sala de simulação avançada — não usa o componente shell |
| `sidebar.html` | — | Fragmento de template; **não é página standalone** |

---

## 2. Seções do index.html (SPA)

O `index.html` é um documento único em que cada "tela" é um bloco `<section>` ou `<div>` com visibilidade
controlada por JavaScript. O controle de exibição usa `showScreen(screenName)` exposto globalmente pelo
`app.js`.

| ID da seção | Linhas aprox. | Finalidade | Redundâncias identificadas |
|---|---|---|---|
| `screen-hub` | 300–533 | Dashboard — indicadores de progresso, guia da plataforma e quick links | Guia da plataforma duplica conteúdo do onboarding; quick links duplicam itens da sidebar |
| `screen-start` | 534–957 | Configuração do quiz (seleção de certificação, número de questões, modo) | 5 botões duplicam a sidebar: `btn-start-journey`, `btn-start-flashcards`, `btn-start-diagnostic`, `btn-cases`, `btn-resources` |
| `screen-jornada` | 958–997 | Trilha gamificada | Botão `goHome()` é redundante — a sidebar já oferece a mesma navegação |
| `screen-quiz` | 998–1144 | Execução do quiz (questão, opções, timer, progresso) | — |
| `screen-results` | 1145–1246 | Resultados do simulado (pontuação, acertos/erros, breakdown por domínio) | — |
| `screen-flashcards` | 1247–1387 | Revisão com cartões (flip, navegação, filtro por certificação) | Botão `goHome()` é redundante — a sidebar já oferece a mesma navegação |
| `side-info` | 1388+ | Painel direito — progresso, sprint, insight, radar de domínios, histórico, Pomodoro | — |

---

## 3. Funções globais expostas pelo app.js (window.*)

O `app.js` expõe **35 funções** no escopo global via `window.*` para permitir chamadas diretamente em
atributos `onclick` do HTML. Isso é um padrão intencional da arquitetura SPA sem bundler.

### Controle de quiz
| Função | Descrição |
|---|---|
| `startQuiz()` | Inicia um novo simulado com a configuração selecionada |
| `showQuizConfig()` | Exibe a tela de configuração do quiz (`screen-start`) |
| `submitAnswer()` | Registra a resposta da questão atual |
| `nextQuestion()` | Avança para a próxima questão |
| `finishQuiz()` | Encerra o simulado e vai para resultados |
| `cancelQuiz()` | Cancela o simulado em andamento |
| `retakeQuiz()` | Reinicia com a mesma configuração |

### Navegação e modos
| Função | Descrição |
|---|---|
| `startDiagnostic()` | Inicia o teste diagnóstico de nivelamento |
| `startJornada()` | Navega para a trilha gamificada |
| `startFlashcards()` | Navega para o módulo de flashcards |
| `startMistakesQuiz()` | Inicia simulado com questões previamente erradas |
| `showLearningHub()` | Exibe o hub de aprendizado (`screen-hub`) |
| `showScreen(name)` | Controle central de troca de telas |
| `goHome()` | Alias para `showLearningHub()` — retorna ao dashboard |

### Flashcards
| Função | Descrição |
|---|---|
| `flipFlashcard()` | Vira o cartão atual |
| `nextFlashcard()` | Avança para o próximo cartão |
| `prevFlashcard()` | Volta para o cartão anterior |
| `filterFlashcardsByCert(certId)` | Filtra cartões pela certificação selecionada |

### Histórico e erros
| Função | Descrição |
|---|---|
| `clearHistory()` | Limpa todo o histórico de simulados |
| `clearMistakes()` | Limpa o banco de erros |
| `removeHistoryItem(index)` | Remove item específico do histórico |

### Relatórios
| Função | Descrição |
|---|---|
| `generatePerformanceReport()` | Gera e baixa relatório PDF do desempenho atual |
| `showLastReport()` | Exibe o último relatório gerado |
| `showHistoricalReport()` | Exibe relatório com histórico acumulado |

### UI e preferências
| Função | Descrição |
|---|---|
| `toggleDarkMode()` | Alterna entre tema claro e escuro |
| `toggleLanguage()` | Alterna entre PT e EN |
| `togglePomodoro()` | Liga/desliga o timer Pomodoro |
| `togglePomodoroWidget()` | Mostra/oculta o widget flutuante do Pomodoro |
| `resetPomodoro()` | Reinicia o timer Pomodoro |

### Sidebar e progresso
| Função | Descrição |
|---|---|
| `updateSidebarProgress()` | Atualiza indicadores de progresso na sidebar |
| `updateSidebarTexts()` | Atualiza textos da sidebar conforme idioma ativo |

### Sprint e missões
| Função | Descrição |
|---|---|
| `completeSprintDay(day)` | Marca dia da sprint como concluído |
| `closeSprintReader()` | Fecha o painel de leitura da sprint |
| `startMission(missionId)` | Inicia missão da trilha |
| `startTrailMission(missionId)` | Inicia missão no contexto da trilha gamificada |
| `startSmartFlashcards()` | Inicia revisão inteligente (flashcards priorizados por domínios fracos) |

---

## 4. localStorage — chaves utilizadas

### Estáticas (configuração e sessão de usuário)

| Chave | Conteúdo |
|---|---|
| `aws_sim_cert` | Certificação ativa selecionada pelo usuário |
| `aws_sim_lang` | Idioma ativo (`pt` ou `en`) |
| `aws_sim_theme` | Tema ativo (`dark` ou `light`) |
| `cloudacademy_user` | Objeto de sessão do usuário logado |
| `sidebar_closed` | Estado de colapso da sidebar |

### Dinâmicas (prefixo `aws_sim_`)

| Chave | Conteúdo |
|---|---|
| `aws_sim_history` | Array com histórico de simulados realizados |
| `aws_sim_mistakes` | Array com questões respondidas incorretamente |
| `aws_sim_gamification` | Estado da trilha gamificada e pontuação |
| `aws_sim_focus_log` | Log de sessões do Pomodoro |

### Por certificação (chave dinâmica com `certId`)

| Padrão | Conteúdo |
|---|---|
| `active_session_{certId}` | Sessão de quiz em andamento para a certificação |
| `sprint_state_{certId}` | Estado do progresso da sprint de 14 dias |
| `last_{certId}` | Resultado do último simulado realizado |
| `{certId}_review_deck` | Deck de flashcards para revisão da certificação |

### Por usuário

| Chave | Conteúdo |
|---|---|
| `aws_sim_user_id` | ID do usuário no backend |
| `aws_sim_user_email` | E-mail do usuário |
| `aws_sim_user_name` | Nome completo do usuário |
| `aws_sim_user_role` | Papel/perfil do usuário |
| `aws_sim_user_nickname` | Apelido exibido na interface |

### Cases

| Chave | Conteúdo |
|---|---|
| `cases:completed` | Array de IDs de cases concluídos |

---

## 5. APIs consumidas

### Backend Express (local, porta 3001)

| Endpoint | Método | Descrição | Fallback |
|---|---|---|---|
| `/api/cases` | GET | Lista de cases de arquitetura | `data/cases/architecture_cases.json` |
| `/api/cases/:idOrSlug` | GET | Case individual por ID ou slug | — |
| `/api/services` | GET | Catálogo de serviços AWS | — |
| `/api/auth/login` | POST | Autenticação do usuário | — |
| `/api/auth/me` | GET | Dados do usuário autenticado | — |
| `/api/questions` | GET | Questões (com filtros por cert/domínio) | `data/questions/{certId}.json` |
| `/api/quiz/start` | POST | Inicia sessão de quiz no backend | — |
| `/api/quiz/:id/answer` | POST | Registra resposta no backend | — |
| `/api/quiz/:id/results` | GET | Resultados da sessão de quiz | — |
| `/api/users/:id/stats` | GET | Estatísticas acumuladas do usuário | — |
| `/api/users/:id/weak-domains` | GET | Domínios com menor desempenho | — |

### Dados locais (JSON versionado em `data/`)

| Fonte | Conteúdo |
|---|---|
| `data/questions/{certId}.json` | Banco de questões por certificação |
| `data/nivelamento/diagnostic-{certId}.json` | Questões do diagnóstico por certificação |

> Certificações suportadas: `clf-c02`, `saa-c03`, `dva-c02`, `aif-c01`.

---

## 6. Componentes compartilhados

| Componente | Responsabilidade |
|---|---|
| `shell.js` | Renderiza header, sidebar e userMenu; aplica tema e idioma; executa `authGuard` |
| `authService.js` | `restoreSession()` — recupera sessão do `localStorage`; `logout()` — limpa sessão e redireciona |
| `storageManager.js` | Abstração centralizada para toda persistência em `localStorage` |
| `style.css` | Design system consolidado (fonte de verdade em `src/frontend/css/`; copiado para `public/css/` pelo build) |
| `cases.css` | Estilos específicos das páginas de cases (`cases.html`, `case-view.html`) |

### Fluxo do build

```
npm run build
  └─ scripts/build.cjs
       ├─ copia src/frontend/ → public/
       └─ copia data/         → public/data/
```

- **`src/frontend/js/`** é a fonte de verdade do JavaScript.
- **`public/js/`** é artefato gerado — não editar diretamente.
- **`public/index.html`** é a fonte do HTML (não gerado pelo build; editar diretamente).

---

## 7. Riscos identificados

### 🔴 Alto — quebra de deploy

| Risco | Detalhe | Impacto |
|---|---|---|
| Path absoluto `/css/style.css` | `simulator-hub.html` e `simulator-room.html` usam `href="/css/style.css"` | Quebra no GitHub Pages (subpasta) e em qualquer host com base diferente de `/` |
| `sidebar.html` fora do controle do build | Arquivo existe em `public/` mas **não** existe em `src/frontend/` | Alterações em `sidebar.html` são perdidas no próximo `npm run build` |

### 🟡 Médio — acoplamento e manutenção

| Risco | Detalhe |
|---|---|
| 86 IDs referenciados em `app.js` | `document.getElementById()` / `querySelector()` chamados para 86 IDs distintos; 8 deles são gerados dinamicamente pelo próprio JS |
| 35 funções globais via `window.*` | Qualquer renomeação de ID ou função exige varredura manual em todo o HTML |
| Botões duplicados na `screen-start` | 5 botões (`btn-start-journey`, `btn-start-flashcards`, `btn-start-diagnostic`, `btn-cases`, `btn-resources`) replicam a navegação da sidebar, criando dois pontos de manutenção |
| Botão `goHome()` em múltiplas telas | Presente em `screen-jornada` e `screen-flashcards`; redunda com a sidebar |

### 🟢 Baixo — observações

| Observação | Detalhe |
|---|---|
| `bindClick()` é guard-safe | Não lança erro se o elemento não existe no DOM — seguro para telas parcialmente renderizadas |
| Dependências CDN | Chart.js, jsPDF e Sortable são carregados de CDN externo; sem CDN local, a aplicação fica sem gráficos/PDF/ordenação |

---

## 8. Estrutura alvo (após reorganização modular)

A reorganização proposta separa cada módulo funcional do `index.html` em sua própria página,
transformando o SPA monolítico em um MPA leve com navegação por URL. O `index.html` torna-se
exclusivamente o dashboard executivo.

```
index.html        → Dashboard executivo (indicadores, links, progresso geral)
simulados.html    → Módulo completo de simulados (config + execução + resultados)
jornada.html      → Módulo de jornada/trilha gamificada
flashcards.html   → Módulo de revisão com flashcards
diagnostico.html  → Módulo Raio-X (diagnóstico e plano personalizado)
cases.html        → Mantido (já é módulo próprio)
case-view.html    → Mantido
resources.html    → Mantido
profile.html      → Mantido
settings.html     → Mantido
```

### Benefícios esperados

- URLs significativas e compartilháveis por módulo.
- Redução do `index.html` de ~1730 linhas para ~200–300 linhas.
- Eliminação dos botões duplicados (cada módulo tem seu próprio entry point).
- `app.js` pode ser dividido em módulos menores e coesos.
- Facilita testes automatizados por módulo.

### Pré-condições

1. Corrigir os paths absolutos em `simulator-hub.html` e `simulator-room.html` antes da reorganização.
2. Mover `sidebar.html` para `src/frontend/` e incluir no pipeline do build.
3. Mapear os 86 IDs e documentar quais pertencem a cada módulo antes de separar os arquivos.

---

## Referências

- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — visão geral da arquitetura do projeto
- [docs/ROUTES_AND_INTEGRATIONS.md](ROUTES_AND_INTEGRATIONS.md) — contratos de rotas da API
- [docs/EPICOS-E-TASKS.md](EPICOS-E-TASKS.md) — backlog e tarefas de evolução
- [docs/roadmap.md](roadmap.md) — fases de evolução do projeto
