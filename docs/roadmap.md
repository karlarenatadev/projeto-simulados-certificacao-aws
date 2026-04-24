# 🗺️ Roadmap do Projeto

Nossa visão é consolidar este simulador como a ferramenta de referência para a comunidade, unindo inteligência de dados, automação e uma experiência de estudo gamificada.

## 📌 Status Geral do Projeto

| Fase | Objetivo | Status |
| :--- | :--- | :--- |
| **Fase 1** | MVP Funcional & Infraestrutura Base | ✅ Concluído |
| **Fase 2** | Engajamento, UX & Trilha de 14 Dias | 🟡 Em Progresso |
| **Fase 3** | Analytics & Gamificação Avançada | 🔵 Planejado |
| **Fase 4** | Escalabilidade & Comunidade | 🟣 Futuro |

---

## 🟢 Fase 1: MVP Funcional (Status: Concluído)

- [x] **Motor de Quiz**: Lógica central em JavaScript (`quizEngine.js`).
- [x] **Base de Conhecimento**: Estrutura JSON com +1.900 questões.
- [x] **Certificações Iniciais**: Focado em Cloud Practitioner e Solutions Architect.
- [x] **Esteira de Dados**: Scripts Python para ETL, tradução automática e validação semântica.
- [x] **CI/CD Implementada**: Validação automática de novas questões e testes de código via GitHub Actions.
- [x] **Qualidade de Software**: Testes unitários garantindo a integridade da lógica e persistência.

## 🟡 Fase 2: Engajamento e UX (Status: Em Progresso)

- [x] **Persistência de Dados**: Sistema de pontuação e histórico via `storageManager.js`.
- [x] **Estudo Ativo**: Flashcards interativos para memorização (`flashcards.js`).
- [x] **Interface Moderna**: Foco em UX responsivo e mobile-first.
- [x] **Categorização**: Filtros por domínios específicos e níveis de dificuldade.
- [x] **Jornada de 14 Dias**: Trilha de estudos estruturada em "pílulas de conhecimento" de no máximo 15 minutos diários focada em Cloud Practitioner.
- [x] **Governança**: Padronização de commits e fluxos de contribuição para a guilda.

## 🔵 Fase 3: Analytics e Gamificação (Status: Planejado)

- [x] **Dashboard de Progresso**: Visualização de desempenho dinâmica via `chartManager.js`.
- [ ] **Trilha de Gamificação**: Evolução do formato de lista para "trilha de progresso" visual por módulos.
- [ ] **Análise de Gaps**: Sugestão inteligente de temas baseada nos erros frequentes (Pandas/SQLite).
- [x] **Exportação de Relatório**: Geração de PDF/CSV de performance para acompanhamento offline.

## 🟣 Fase 4: Escalabilidade e Plataforma (Status: Futuro)

- [ ] **Leaderboard**: Backend para ranqueamento competitivo e anônimo entre a guilda.
- [ ] **Autenticação**: Sistema de login para sincronização multiplataforma.
- [ ] **Comunidade**: Abertura oficial para estudantes externos (Open-Source).

---

# 🚀 Planejamento da Sprint Atual (Finalização em 30/04)

| Squad | Tarefa Principal | Detalhamento Técnico | Critério de Aceite | Prioridade | Responsável | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **Gamificação** | **Trilha de Estudos: Cloud Practitioner** | Estruturar a gamificação em formato de trilha sequencial, focando no módulo Practitioner. | Trilha funcional com progresso visual entre os módulos. | 1 | Karla Rosario | 🏃 Em andamento |
| **Gamificação** | **Jornada de 14 Dias (Pílulas)** | Criar o card de sprint de 14 dias com conteúdo fracionado (max 15 min/dia). | Interface exibindo "Dia X de 14" e liberação progressiva. | 1 | Karla Rosario | 🏃 Em andamento |
| **Frontend** | **Exportação de Relatório** | Manipular o DOM (JS) para compilar erros/acertos e gerar arquivo final da sessão. | Botão "Baixar Relatório" gerando CSV/PDF formatado e legível. | 1 | Amanda Veras / João Barros | 📅 Pendente |
| **Eng. Dados** | **Pipeline de Análise de Gaps** | Script Python (Pandas) para agrupar erros por categoria consumindo o SQLite. | Relatório listando os 3 domínios da prova CLF-C02 com maior índice de erro. | 1 | Otto / Marco / Maria Eduarda | 📅 Pendente |
| **Backend** | **Histórico (SQLite + FastAPI)** | Modificar API para gravar resultados associados a IDs anônimos (.db local). | Endpoint POST `/submit-results` documentado e gravando sem quebrar o app. | 1 | João Barros / Eduardo | 📅 Pendente |
| **Cloud/Infra** | **Arquitetura AWS e Custos** | Desenhar topologia Serverless e calcular custos para 20 usuários mensais. | Diagrama (Draw.io) + Estimativa gerada na AWS Pricing Calculator exportados. | 1 | Maria Prado / André | 📅 Pendente |
| **DevOps** | **Padrões de Repositório** | Decidir e documentar patterns de commits e interações de branches (GitFlow). | Arquivo com o guia de contribuição atualizado e aprovado no repo. | 1 | Otto / Karla Rosario | 📅 Pendente |