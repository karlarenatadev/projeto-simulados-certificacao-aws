# 🏛️ Arquitetura do Projeto

Bem-vindo à documentação de arquitetura do **Projeto Simulados Certificação AWS**.

Este documento explica como os diferentes componentes da nossa plataforma comunicam entre si.  
O projeto segue uma arquitetura baseada em **Static Site Generation (SSG) / Single Page Application (SPA)** aliada a **Automação de Dados via CI/CD**, dispensando a necessidade de um servidor back-end tradicional a correr 24/7.

---

## 🗺️ Visão Geral (Diagrama)

O fluxo principal do projeto divide-se em duas grandes áreas:  

- **Experiência do Utilizador (Front-end)**  
- **Motor de Contribuição (Back-end / Automação)**  

---

## 💻 1. Front-end (Aplicação Cliente)

A aplicação cliente é construída com **HTML, CSS e Vanilla JavaScript**, focando em performance e simplicidade. É servida diretamente como ficheiros estáticos (ex.: GitHub Pages).

### Ficheiros Principais

- **`index.html`** e **`style.css`** → Estrutura e design da página  
- **`js/app.js`** → Ponto de entrada; gere navegação, eventos de clique e troca de idiomas  
- **`js/quizEngine.js`** → Motor do simulado: lê questões, embaralha, valida respostas e calcula pontuação  
- **`js/storageManager.js`** → Persistência de dados via localStorage (histórico e progresso)  
- **`js/chartManager.js`** → Renderiza gráficos de desempenho no ecrã de resultados  
- **`js/flashcards.js`** → Sistema de estudo por cartões de memorização  
- **`sw.js`** e **`manifest.json`** → Configurações de PWA, permitindo instalação em dispositivos  

---

## 🗄️ 2. Camada de Dados (JSON DB)

Não usamos base de dados relacional. Toda a base de conhecimento (questões) está em ficheiros **JSON** na pasta `data/`.

- **`data/clf-c02.json`**, **`data/saa-c03.json`** → Ficheiros principais com questões validadas em Português  
- **`data/*-en.json`** → Versões traduzidas em Inglês  

**Fluxo:**  
O Front-end faz um `fetch()` para carregar o JSON correspondente na memória sempre que o usuário inicia um simulado.

---

## ⚙️ 3. Motor de Automação e Back-end (Python + GitHub Actions)

Responsável por validar e integrar novas questões sem quebrar o site.

### Fluxo de Contribuição

1. **Submissão:** Contribuidor cria um JSON na pasta `data/contributions/` e abre um Pull Request  
2. **Gatilho:** GitHub Actions detecta o PR e inicia a pipeline  
3. **Validação (Python):**  
   - **`validate_contribution.py`** → Estrutura e campos obrigatórios  
   - **`duplicate_detector.py`** → Evita questões duplicadas  
   - **`aws_semantic_validator.py`** (opcional) → Validação semântica de serviços AWS  
4. **Tradução:** **`translate_with_api.py`** gera versão em Inglês automaticamente  
5. **Integração:** **`merge_contributions.py`** move a questão aprovada para o ficheiro principal (`data/clf-c02.json`)  
6. **Deploy:** Após merge na branch principal, o site é atualizado automaticamente  

---

## 🚀 Visão de Futuro (Roadmap Arquitetural)

Embora a arquitetura atual seja rápida e escalável por ser estática, planejamos evoluções para personalização avançada:

- **Autenticação de Usuários:** Integração com Amazon Cognito para contas de usuário  
- **Sincronização na Cloud (BaaS):** Migrar dados do `localStorage` para **DynamoDB** via **API Gateway + Lambda**, permitindo sincronização entre dispositivos