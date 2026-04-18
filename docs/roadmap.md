# 🗺 Roadmap do Projeto

Nossa visão é evoluir este simulador até que ele se torne a **Cloud Certification Study Tool** de referência para a comunidade, unindo inteligência de dados, automação e uma experiência de estudo gamificada.

### 🟢 Fase 1: MVP Funcional (Status: Concluído/Atual)
- [x] **Motor de Quiz**: Lógica central em JavaScript para execução dos simulados(`quizEngine.js`).
- [x] **Base de Conhecimento**: Estrutura de dados em JSON com suporte a +1.900 questões.
- [x] **Certificações Iniciais**: Inicialmente focado em Cloud Practitioner e Solutions Architect.
- [x] **Esteira de Dados**: Scripts Python para ETL, tradução automática e validação semântica.
- [x] **CI/CD Implementada**: Validação automática de novas questões e testes de código via GitHub Actions.
- [x] **Qualidade de Software**: Testes unitários para garantir a integridade da lógica do quiz e da persistência de dados.

### 🟡 Fase 2: Engajamento e UX (Próximos Passos)
- [x] **Persistência de Dados**: Sistema de pontuação e histórico de desempenho utilizando o (`storageManager.js`).
- [x] **Estudo Ativo**: Implementação de Flashcards interativos para memorização (`flashcards.js`).
- [ ] **Interface Moderna**: Melhoria da interface do usuário focada em UX responsivo e intuitivo.
- [ ] **Categorização**: Sistema de filtros por categorias específicas e níveis de dificuldade por questão.
- [ ] **Jornada de 14 Dias**: Trilha de estudos estruturada em "pílulas de conhecimento" de 15 minutos diários.
- [ ] **Governança**: Definição formal de padrões de commit e fluxos de contribuição para a guilda.

### 🔵 Fase 3: Analytics e Gamificação
- [x] **Dashboard de Progresso**: Visualização de desempenho através de gráficos dinâmicos com (`chartManager.js`).
- [ ] **Análise de Gaps**: Sugestão inteligente de temas para estudo baseada nos erros frequentes do usuário.
- [x] **Relatório de Performance**: Funcionalidade de exportação de resultados em PDF para acompanhamento offline.

### 🟣 Fase 4: Escalabilidade e Plataforma
-[ ] **Leaderboard**: Backend para ranqueamento competitivo e anônimo entre os membros da guilda.
[ ] **Autenticação**: Sistema de login para sincronização de progresso entre múltiplos dispositivos.
[ ] **Comunidade**: Abertura oficial da ferramenta para estudantes externos, expandindo o ecossistema open-source.