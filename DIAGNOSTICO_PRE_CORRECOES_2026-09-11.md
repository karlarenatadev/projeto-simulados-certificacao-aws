# Diagnóstico Pré-Correções — Cloud Academy A3

**Data:** 2026-09-11  
**Base obrigatória:** `AUDITORIA_ESTRUTURAL.md`  
**Status:** diagnóstico concluído; nenhuma correção implementada nesta etapa.

## 1. Arquivos e componentes encontrados para os 12 pontos

### 1.1 Evolução do desempenho

Arquivos principais:

- `src/frontend/js/storageManager.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/chartManager.js`
- `src/frontend/js/app.js`
- `src/frontend/js/analytics/trendAnalyzer.js`
- `backend/database/db.js`

Causa confirmada: o armazenamento local usa `unshift`, mantendo o histórico do mais recente para o mais antigo. A consulta do backend também usa `ORDER BY completed_at DESC`. O gráfico recebe esse array e gera `Simulado 1`, `Simulado 2` etc. na ordem recebida, sem ordenação cronológica própria.

A ordenação descendente é apropriada para a lista de histórico, mas incorreta para o gráfico. Será necessário criar uma projeção cronológica ascendente, sem modificar a ordem persistida.

Também será necessário normalizar os campos temporais existentes: `date`, `completedAt`, `completed_at` e `timestamp`.

### 1.2 Insight de estudo

Arquivos principais:

- `src/frontend/js/insightEngine.js`
- `src/frontend/js/analytics/trendAnalyzer.js`
- `src/frontend/js/analytics/learningAnalytics.js`
- `src/frontend/js/app.js`
- `__tests__/insightEngine.test.js`

Causa confirmada: os analisadores dependem implicitamente da ordem recebida. Não existe uma normalização cronológica comum antes do cálculo.

Foi encontrado outro defeito: `trendAnalyzer.js` filtra resultados com `p > 0`, descartando notas válidas iguais a zero. Isso distorce tendências como `100 → 0 → 100 → 50`.

A correção deve compartilhar o mesmo normalizador temporal do gráfico e testar explicitamente:

- `50 → 70 → 80`;
- `90 → 80 → 60`;
- `60 → 80 → 75`;
- somente uma tentativa;
- tentativas contendo nota zero.

### 1.3 Menu “Dicas”

Arquivos principais:

- `src/frontend/js/shell.js`
- `src/frontend/js/i18n/translations.js`
- `src/frontend/styles/components/sidebar.css`
- `src/frontend/styles/components/shell.css`
- `e2e/exam-tips.spec.js`

O item é definido em `shell.js` como “Dicas de Prova”. O texto visual usa tradução, mas `title` e `aria-label` são montados separadamente. Como o mapa acessível não possui uma entrada específica para esse item, esses atributos podem permanecer com o texto inicial mesmo depois da troca de idioma.

Planejamento:

- rótulo visual: “Dicas” / “Tips”;
- descrição acessível: “Dicas de prova e certificação” / equivalente em inglês;
- manter o título da página de dicas mais descritivo;
- validar desktop, menu recolhido e responsivo.

### 1.4 “Comece por aqui”

Arquivos principais:

- `src/frontend/pages/index.html`
- `src/frontend/js/app.js`
- `src/frontend/js/core/navigation.js`
- `__tests__/buttonHandlers.test.js`
- `__tests__/navigation.test.js`

A seção possui três CTAs:

- “Simular agora” chama `showLearningHubQuickStart()`, que executa `showScreen("start")`;
- “Minha Jornada” chama `startJornada()`, que executa `showScreen("jornada")`;
- “Diagnóstico” chama `startDiagnostic()`, que depende de `#certification-select`.

A home atual contém apenas `#screen-hub`. Ela não contém `#screen-start`, `#screen-jornada` nem o seletor exigido pelo diagnóstico. Por isso dois fluxos ocultam a home e tentam abrir telas inexistentes, enquanto o diagnóstico encerra silenciosamente.

Destinos canônicos encontrados:

- Simulados: `simulados.html`;
- Jornada: `jornada.html`;
- Diagnóstico: `diagnostico.html`.

Os CTAs serão convertidos para navegação multipágina usando o resolvedor compatível com o base path do GitHub Pages.

### 1.5 Guia da Plataforma

Arquivos principais:

- `src/frontend/pages/index.html`
- `src/frontend/js/shell.js`
- `src/frontend/js/pomodoroManager.js`
- `src/frontend/pages/settings.html`
- `src/frontend/js/i18n/translations.js`

O guia atual possui oito cards, mas não corresponde mais ao inventário real do menu.

Funcionalidades reais ausentes ou desatualizadas:

- Jornada;
- Raio-X/Diagnóstico;
- Dicas;
- Pomodoro;
- área canônica de Erros.

O link atual de revisão de erros usa `simulados.html#mistakes`, mas não existe tratamento para esse hash. Em uma etapa intermediária ele poderá apontar para uma âncora funcional do botão já existente em `simulados.html`; depois será direcionado para `erros.html` quando o fluxo da Fase C estiver pronto.

Existe somente uma área real de dicas, `dicas-prova.html`. O guia não deverá inventar duas funcionalidades diferentes para “Dicas” e “Dicas de prova”.

### 1.6 Próxima recomendação

Arquivos principais:

- `src/frontend/js/recommendations/studyNow.js`
- `src/frontend/js/analytics/learningAnalytics.js`
- `src/frontend/js/recommendations/recommendationEngine.js`
- `src/frontend/js/storageManager.js`
- `src/frontend/pages/index.html`
- `__tests__/studyNow.test.js`

Causa direta confirmada: `refreshStudyNow()` procura primeiro o container legado `#weak-domains-content` e encerra imediatamente quando ele não existe. A home atual possui apenas `#study-now-compact`. Assim, o código nunca substitui “Carregando sessão...”.

Problemas adicionais:

- não há máquina de estados explícita;
- o `catch` não garante a atualização do componente compacto;
- `LearningAnalytics` chama `getMistakes()` sem certificação e interpreta incorretamente o array retornado;
- sprint e deck de revisão ainda não participam adequadamente da recomendação.

A solução planejada terá estados explícitos `LOADING`, `READY`, `EMPTY` e `ERROR`. O estado offline será apresentado somente quando houver diferença real de comportamento; dados locais válidos poderão continuar gerando `READY`.

A prioridade será determinística e baseada em dados existentes, sem recomendação aleatória.

### 1.7 Progresso da certificação

Arquivos principais:

- `src/frontend/js/app.js`
- `src/frontend/js/gamificacao/trailManager.js`
- `src/frontend/js/analytics/learningAnalytics.js`
- `src/frontend/js/analytics/trendAnalyzer.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/storageManager.js`
- `src/frontend/js/quizManager.js`
- `src/frontend/js/services/api.js`
- `backend/api/routes/quizzes.js`
- `backend/database/db.js`
- `backend/database/schema.sql`

Causa direta confirmada: a área rotulada como “Prontidão para o Exame” chama `getCertificationProgress()` de `trailManager.js`. Essa função calcula etapas concluídas da jornada, não resultados de simulados. Portanto, realizar simulados não altera a barra.

Já existe uma fórmula de prontidão em `learningAnalytics.js`, baseada em:

- média;
- volume de tentativas;
- tendência;
- penalização por domínios críticos.

Portanto, não é necessário inventar uma fórmula. O plano é separar claramente:

- progresso da trilha;
- prontidão para o exame.

Também foi confirmado que o backend cria uma linha em `quiz_history` ao iniciar o quiz, com `completed_at` preenchido imediatamente. Essa linha pode parecer uma tentativa concluída com nota zero. O fechamento completo do BUG-004 exigirá uma subetapa isolada de ciclo de vida `iniciado → concluído`, sem misturá-la à simples troca da fonte exibida.

O `DataRepository` atualmente é local-first na prática; a sincronização de resultados é apenas um ponto de extensão. A correção não poderá alegar que o backend virou fonte canônica sem implementar e validar esse contrato.

### 1.8 Menu e prática de Erros

Arquivos principais:

- `src/frontend/js/shell.js`
- `src/frontend/js/storageManager.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/app.js`
- `src/frontend/js/quizEngine.js`
- `src/frontend/pages/simulados.html`
- `docs/error-lifecycle.md`

Nova página planejada:

- `src/frontend/pages/erros.html`
- `src/frontend/js/mistakes/mistakesPage.js`

O armazenamento existente já contém informação suficiente para a experiência básica:

- `questionId`;
- certificação;
- domínio;
- pergunta e alternativas;
- resposta selecionada;
- resposta correta;
- explicação;
- primeira e última ocorrência;
- `wrongCount`;
- `attemptId` e `quizId`;
- estado `resolved`.

Entretanto, ele não mantém uma lista detalhada de todas as tentativas; mantém primeira/última ocorrência e contador. Isso atende à reconstrução básica, mas não a uma auditoria completa por tentativa.

Problemas confirmados:

- o item do menu é uma ação JavaScript, não uma rota;
- em páginas secundárias, o fallback dessa ação volta para a home;
- acertar uma questão durante a revisão chama `removeMistake()`, apagando o registro;
- “erro histórico” e “pendente de revisão” não estão separados na API do storage.

O plano é preservar o registro histórico, marcar a pendência como revisada e manter a limpeza destrutiva apenas como ação explícita do usuário.

### 1.9 Flashcard salvo a partir do simulado

Arquivos principais:

- `src/frontend/js/app.js`
- `src/frontend/js/storageManager.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/flashcards.js`
- `src/frontend/js/modules/flashcards.js`
- `e2e/flashcards.spec.js`

A suspeita inicial de extração por `innerHTML` não corresponde ao fluxo principal atual. O simulado passa a questão estruturada para `addReviewQuestion()`.

A causa confirmada está em `flashcards.js`: ao transformar uma questão do deck em flashcard, o código cria textos contendo wrappers como:

```html
<span class="text-base font-normal leading-relaxed block">...</span>
```

Depois, a renderização segura usa `textContent`, fazendo esse HTML aparecer literalmente ao usuário.

A correção será feita na montagem do modelo do flashcard, mantendo campos estruturados e retirando markup de apresentação. Também será verificado se `src/frontend/js/modules/flashcards.js` é uma implementação legada antes de qualquer alteração.

Cards antigos terão migração preguiçosa e segura, sem regex genérica que possa destruir conteúdo de código, caracteres especiais ou quebras de linha.

### 1.10 Montar Arquitetura

Arquivos e dados principais:

- `data/taxonomy/canonical_taxonomy.json`
- `data/taxonomy/aws_services_catalog.json`
- `src/frontend/js/cases/architectureBuilder.js`
- `src/frontend/js/cases/architectureRenderer.js`
- `src/frontend/pages/case-view.html`
- `src/frontend/styles/cases.css`
- `scripts/seed/seed-cases.mjs`
- `__tests__/architectureBuilder.test.js`

Fontes canônicas encontradas:

- `canonical_taxonomy.json`: identidade e aliases dos serviços;
- `aws_services_catalog.json`: metadados de apresentação e categorias.

O builder atual limita a paleta usando:

- `LEGACY_PALETTE`;
- serviços obrigatórios, opcionais e distratores do case atual.

Isso explica por que a sugestão do cenário virou, na prática, o único catálogo disponível.

Também há duas implementações concorrentes:

- implementação inline extensa em `case-view.html`;
- módulo `architectureBuilder.js`, importado pela mesma página.

O plano é carregar o catálogo existente, separar visualmente “sugeridos” de “disponíveis” e manter a avaliação exclusivamente ligada ao `builder` do case. O catálogo bruto não será exposto cegamente, pois contém conceitos compostos e categorias genéricas além de serviços AWS utilizáveis.

### 1.11 Sprint de estudos

Arquivos principais:

- `src/frontend/js/gamificacao/sprintManager.js`
- `src/frontend/js/gamificacao/trailManager.js`
- `src/frontend/js/sprintData.js`
- `src/frontend/pages/study-sprint.html`
- `__tests__/sprintManager.test.js`
- `__tests__/trailManager.test.js`

Inventário atual:

| Certificação | Sprint configurada | Cobertura estrutural |
| ------------ | -----------------: | -------------------: |
| CLF-C02      |                Sim |        14 dias PT/EN |
| SAA-C03      |                Sim |        14 dias PT/EN |
| AIF-C01      |                Sim |        14 dias PT/EN |
| DVA-C02      |                Sim |        14 dias PT/EN |

Essa verificação confirma existência estrutural, não qualidade pedagógica do conteúdo.

O BUG-021 foi novamente confirmado:

- `currentDay` é calculado como quantidade de dias concluídos mais um;
- a interface marca todos os dias anteriores a esse número como concluídos;
- dias esparsos, como `[1, 3]`, fazem o dia 2 aparecer concluído;
- conclusão repetida ainda pode interferir em streak;
- `trailManager.js` replica parte dessa lógica.

Além disso, `sprintData.js` combina blocos parciais antigos com dados suplementares, enquanto `SPRINT_MAPS` duplica títulos e duração.

A correção será primeiro na semântica de conclusão. Depois, os dados existentes serão expostos por uma configuração única com certificação, duração e dias ordenados, sem criar novo conteúdo educacional em massa.

### 1.12 Credly

Arquivos relacionados à futura integração:

- `src/frontend/pages/profile.html`
- `src/frontend/js/services/api.js`
- `backend/api/routes/users.js`
- `backend/api/server.js`
- `backend/database/schema.sql`

Arquivo novo planejado nesta etapa:

- `docs/CREDLY_INTEGRATION_PLAN.md`

Não existe integração Credly implementada atualmente.

A pesquisa deverá consultar somente fontes oficiais e confirmar:

- existência e disponibilidade real de API;
- autenticação;
- dados públicos;
- consentimento e identificação do usuário;
- CORS;
- rate limits;
- necessidade de proxy backend;
- cache e privacidade.

Nenhuma alteração de schema ou implementação será feita apenas com base em hipótese.

## 2. Relação com os BUG-XXX da auditoria

| Ponto              | Relação com a auditoria                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Gráfico         | Bug novo confirmado. Interage com o BUG-005 porque local e backend possuem contratos e ordenações diferentes.                                                                                                             |
| 2. Insight         | Bug novo confirmado, com a mesma raiz cronológica do ponto 1. Também é afetado pelo BUG-005.                                                                                                                              |
| 3. Dicas           | Mesma família do BUG-025: tradução e atributos acessíveis não seguem necessariamente o mesmo estado.                                                                                                                      |
| 4. Comece por aqui | Relacionado diretamente ao BUG-024 e à migração incompleta entre SPA e páginas físicas. Tangencia o BUG-010, mas não é o mesmo defeito.                                                                                   |
| 5. Guia            | Relacionado aos BUG-024 e BUG-025: rotas antigas e conteúdo parcialmente internacionalizado.                                                                                                                              |
| 6. Recomendação    | Bug novo confirmado. A causa imediata é DOM legado; a qualidade dos dados é afetada pelos BUG-005 e BUG-027.                                                                                                              |
| 7. Progresso       | Relação direta com BUG-004, BUG-005, BUG-007 e BUG-018. A causa visual imediata é a confusão entre progresso da trilha e prontidão.                                                                                       |
| 8. Erros           | Relacionado aos BUG-014, BUG-022, BUG-024 e BUG-027: persistência local, cobertura offline, rota e recuperação de storage.                                                                                                |
| 9. Flashcards      | Relação direta com o BUG-013, pois envolve fronteira entre conteúdo estruturado e HTML renderizado.                                                                                                                       |
| 10. Arquitetura    | O conflito entre implementação inline e módulo é da mesma classe arquitetural do BUG-032. O BUG-017 deve permanecer coberto para não alterar o contrato de avaliação; o BUG-033 afeta dependências usadas pela interface. |
| 11. Sprint         | Relação direta com o BUG-021; também toca BUG-005 e BUG-007 por persistência, streak e gamificação.                                                                                                                       |
| 12. Credly         | Nenhuma relação direta com BUG existente. É feature separada.                                                                                                                                                             |

## 3. Correções que compartilham causa raiz

| Causa compartilhada                                           | Pontos afetados          |
| ------------------------------------------------------------- | ------------------------ |
| Histórico sem contrato cronológico canônico                   | 1, 2, 6 e 7              |
| Migração incompleta de SPA interna para navegação multipágina | 4, 5 e 8                 |
| Fontes divergentes de progresso e estado local/remoto         | 6, 7, 8 e 11             |
| Ciclo de vida inadequado dos registros de aprendizagem        | 7, 8 e 9                 |
| Conteúdo estruturado misturado com markup de apresentação     | 9 e, preventivamente, 10 |
| Configurações paralelas e responsabilidades duplicadas        | 5, 10 e 11               |
| Tradução visual separada de atributos acessíveis              | 3, 5, 6 e 8              |
| Cobertura offline incompleta para novas páginas               | 4, 8, 10 e 11            |

## 4. Plano de arquivos que serão modificados após autorização

### Fase A — Navegação e conteúdo

Previstos:

- `src/frontend/js/shell.js`
- `src/frontend/js/i18n/translations.js`
- `src/frontend/pages/index.html`
- `src/frontend/pages/simulados.html`
- `src/frontend/styles/components/sidebar.css`, somente se o rótulo menor não resolver todos os estados
- `__tests__/navigation.test.js`
- testes de sidebar
- `e2e/exam-tips.spec.js`
- novo `e2e/home-navigation.spec.js`

### Fase B — Home, histórico e prontidão

Previstos:

- novo `src/frontend/js/utils/historyTimeline.js`
- `src/frontend/js/chartManager.js`
- `src/frontend/js/insightEngine.js`
- `src/frontend/js/analytics/trendAnalyzer.js`
- `src/frontend/js/analytics/learningAnalytics.js`
- `src/frontend/js/recommendations/studyNow.js`
- `src/frontend/js/app.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/storageManager.js`
- `__tests__/insightEngine.test.js`
- `__tests__/studyNow.test.js`
- novos testes de timeline, gráfico e prontidão

Subetapa isolada para fechar corretamente o BUG-004:

- `backend/database/schema.sql`
- `backend/database/db.js`
- `backend/api/routes/quizzes.js`
- `src/frontend/js/services/api.js`
- `src/frontend/js/quizManager.js`
- testes de API e banco correspondentes

Essa subetapa não será misturada silenciosamente à correção visual da barra.

### Fase C — Erros e review deck

Previstos:

- novo `src/frontend/pages/erros.html`
- novo `src/frontend/js/mistakes/mistakesPage.js`
- `src/frontend/js/shell.js`
- `src/frontend/js/storageManager.js`
- `src/frontend/js/dataRepository.js`
- `src/frontend/js/app.js`
- `src/frontend/js/flashcards.js`
- `src/frontend/js/i18n/translations.js`
- `src/frontend/pages/index.html`
- `src/frontend/pwa/sw.js`
- testes de ciclo de vida de erros e review deck
- novos E2E de erros e flashcards

### Fase D — Ferramentas

Previstos:

- `src/frontend/js/cases/architectureBuilder.js`
- possível novo `src/frontend/js/cases/serviceCatalog.js`
- `src/frontend/pages/case-view.html`
- `src/frontend/styles/cases.css`
- `__tests__/architectureBuilder.test.js`
- `src/frontend/js/gamificacao/sprintManager.js`
- `src/frontend/js/gamificacao/trailManager.js`
- `src/frontend/js/sprintData.js`
- `__tests__/sprintManager.test.js`
- `__tests__/trailManager.test.js`
- E2E direcionados ao builder e à sprint

Não está planejada alteração em massa nos datasets de serviços ou conteúdo educacional.

### Fase E — Credly e relatório

Novos arquivos previstos:

- `docs/CREDLY_INTEGRATION_PLAN.md`
- `CORRECOES_FUNCIONAIS_2026-09-11.md`

`public/` não será editado manualmente. Ele será regenerado exclusivamente pelo build após alterações em `src/`.

## 5. Riscos de regressão

- Ordenar o histórico global poderia inverter a lista visual. A ordenação ascendente ficará restrita à projeção do gráfico e dos analisadores.
- Datas ausentes ou inválidas precisam de fallback estável; empates não podem reorganizar tentativas aleatoriamente.
- Notas iguais a zero não podem continuar sendo tratadas como dados ausentes.
- “Prontidão” não pode substituir nem sobrescrever o progresso da Jornada. Serão métricas separadas.
- Corrigir o ciclo backend do quiz pode afetar respostas vinculadas a sessões em andamento; por isso será uma subetapa com testes de início, resposta, conclusão e abandono.
- A recomendação precisa ter prioridade determinística para evitar alternância entre sprint, erros, flashcards e domínio fraco.
- O novo fluxo de Erros não poderá apagar registros antigos ao marcar uma questão como revisada.
- A migração de cards antigos não pode remover conteúdo legítimo de código, caracteres especiais ou quebras de linha.
- A página de Erros precisará entrar no grafo offline; caso contrário funcionará online e falhará depois da instalação da PWA.
- A remoção da implementação inline do builder só poderá ocorrer depois de comprovar paridade com o módulo importado.
- O catálogo AWS contém conceitos que não são serviços diretamente arrastáveis; expor o arquivo bruto degradaria busca e avaliação.
- Estados antigos de sprint com dias esparsos precisarão ser interpretados sem conceder dias intermediários ou XP novamente.
- Mudanças de rota devem funcionar em localhost, acesso direto e no subdiretório do GitHub Pages.
- O build regenerará artefatos em `public/`, o que pode produzir diff amplo, embora a fonte permaneça em `src/`.
- Credly permanecerá somente como estudo técnico até haver confirmação oficial da abordagem.

---

Nenhuma correção deve ser iniciada antes de autorização explícita.
