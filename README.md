# 🎓 AWS Certified Cloud Simulator - Pro Edition

![Python](https://img.shields.io/badge/Python-3670A0?style=flat&logo=python)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chart.js)
![PWA](https://img.shields.io/badge/PWA-000?style=flat&logo=progressive-web-apps)

Uma plataforma de elite para **simulados AWS**, unindo **Engenharia de Dados com Python**, **IA Generativa** e uma **experiência de usuário (UX) de alto nível**.  
Este simulador é um ecossistema completo, focado em **Clean Code, Integridade de Dados e Performance**.

---

## 📑 Índice

[🎓 AWS](#-aws-certified-cloud-simulator) | [📂 Estrutura](#-estrutura-de-arquivos-atualizada-e-profissional) | [📑 Docs](#-documentação-especializada-docs) | [⚙️ Dados](#-engenharia-de-dados-e-pipeline) | [🤖 IA](#-ia-generativa) | [🚀 Diferenciais](#-diferenciais-técnicos) | [🎯 Funcionalidades](#-funcionalidades-premium) | [🛠 Executar](#-requisitos-e-como-executar) | [📈 Roadmap](#-roadmap) | [🌐 Demo](#-demo-online) | [💡 Dica](#-dica-final) | [📄 Licença](#-licença)

---

## 📂 Estrutura de Arquivos (Atualizada e Profissional)

O projeto segue uma **organização modular**, permitindo escalabilidade, manutenção fácil e destaque para engenharia de dados e PWA:

```text
├── 📂 .github/workflows   # Automação de testes, CI/CD e validação contínua
├── 📂 data/               # Bancos de dados JSON validados via Pydantic
├── 📂 docs/               # Documentação técnica detalhada e modular
├── 📂 scripts_python/     # Backend: geração IA, auditoria e análise de dados
│   ├── generator.py       # Orquestrador de geração de questões (Gemini 1.5 Pro)
│   ├── sanity_check.py    # Validador de integridade e conformidade (Schema Enforcement)
│   └── analyzer.py        # Dashboard de cobertura de domínios e métricas de QA
├── 📂 tests/              # Testes unitários e validação do motor de simulado
├── app.js                 # Motor principal, gerenciamento de estado global e lógica de UI
├── data.js                # Configurações de trilhas oficiais e mapeamento de domínios AWS
├── sw.js                  # Service Worker PWA: cache, offline e atualização de assets
├── index.html             # Interface semântica, responsiva e acessível (UX/UI)
└── style.css              # Customizações de tema, animações e responsividade
````

---

## 📑 Documentação Especializada (/docs)

Cada arquivo `.md` detalha uma área-chave do projeto e pode ser acessado diretamente online:

| Arquivo | Descrição |
| :--- | :--- |
| [🚀 QUICKSTART.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/QUICKSTART.md) | Guia rápido para rodar o simulador localmente em menos de 1 minuto |
| [🏗 ARCHITECTURE.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/ARCHITECTURE.md) | Fluxo de dados completo: Python → JSON → Vanilla JS → Chart.js |
| [🛡 SECURITY.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/SECURITY.md) | Estratégias de prevenção de XSS, injeção de dados e práticas de acessibilidade (a11y) |
| [📈 EXECUTIVE_SUMMARY.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/EXECUTIVE_SUMMARY.md) | Resumo executivo com KPIs de cobertura, evolução de questões e métricas de engajamento |
| [🚢 DEPLOYMENT.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/DEPLOYMENT.md) | Passo a passo para hospedar no AWS S3 + CloudFront ou Vercel com CI/CD |
| [📝 CHANGELOG.md](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/docs/CHANGELOG.md) | Histórico detalhado de versões, updates e evolução do motor de simulado |

---

## ⚙️ Engenharia de Dados e Pipeline

> **Engenharia de Dados Própria:**
> O simulador utiliza um pipeline em **Python 3.12** com **Pydantic V2**, garantindo:

* Questões consistentes e completas (mínimo de 30 caracteres e 4 alternativas válidas)
* Conformidade com os domínios oficiais da AWS (S3, Lambda, EC2, etc)
* Validação automática e auditoria contínua para evitar inconsistências
* Integração com IA Generativa (Gemini 1.5 Pro) para geração de novas questões

Isso transforma o banco de dados em um **ativo confiável e auditável**, elevando o projeto a **plataforma de engenharia de dados profissional**.

---

## 🤖 IA Generativa

* O `generator.py` utiliza **Gemini 2.0 Flash** (Google) para gerar questões realistas.
* **Prompt Engineering:** Simula comportamento de um arquiteto AWS sênior.
* **Resiliência de Quota:** Retry com *exponential backoff* para erros de API.
* **Injeção Automática:** Questões validadas pelo Pydantic antes de serem adicionadas ao banco JSON.

---

## 🚀 Diferenciais Técnicos

### 📊 Radar Chart

* Implementado em **Chart.js**, com preenchimento de área, paddings dinâmicos e legibilidade otimizada.
* Feedback visual imediato do desempenho em cada domínio oficial.

### 🛡️ Segurança e Acessibilidade

* Sanitização via `textContent` para prevenir XSS.
* Atributos ARIA e roles semânticas para navegação por teclado e acessibilidade.

### 📱 Experiência PWA

* Instalável em **Android/iOS**.
* Funciona **100% offline**, ideal para estudo em qualquer lugar.

---

## 🎯 Funcionalidades Premium

* ✅ **Cards Interativos:** Letra destacada, estados de seleção e feedback visual
* ✅ **Modo Exame vs Estudo:** Timer regressivo ou revisão imediata
* ✅ **Deep Linking:** Botões para AWS Whitepapers
* ✅ **Gamificação:** Streaks e badges (`Gabarito`, `Focado`)
* ✅ **Banco de Erros:** Pratique apenas questões incorretas, persistido no `localStorage`

---

## 🛠 Como Executar

1. Clone o repositório:

```bash
git clone https://github.com/karlarenatadev/projeto-simulados-certificacao-aws.git
```

2. Abra no **VS Code**.
3. Abra `index.html` e inicie o **Live Server** (ou `python -m http.server 5500`).
4. Acesse: [http://127.0.0.1:5500](http://127.0.0.1:5500)

---

## 🛠️ Requisitos do Ambiente

| Ferramenta | Versão Recomendada | Observações |
|------------|-----------------|------------|
| Python     | 3.12+           | Necessário para scripts de auditoria e IA |
| Node.js    | 18+             | Para rodar possíveis scripts JS avançados |
| VS Code    | Última          | Com extensão **Live Server** para servir o projeto |
| Live Server| Última          | Para abrir index.html em localhost |
| Navegador  | Chrome/Edge     | Testado para PWA e Chart.js |

---

## 📈 Roadmap

* ✅ **V1.0** — Motor básico de questões
* ✅ **V2.0** — Migração para JSON + Pydantic
* ✅ **V3.0** — UI Premium com Cards + Radar Chart
* ⬜ **V4.0** — Exportação de relatório em PDF
* ⬜ **V5.0** — Deploy automatizado via **AWS S3 + CloudFront (CI/CD)**

---

## 🌐 Demo Online

Você pode testar o simulador online via **GitHub Pages**:

[https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/)

---

## 💡 Dica Final

> "A certificação é o seu destino, a disciplina é o seu motor.
> Pratique até o gráfico de radar estar totalmente preenchido."
> – Karla Renata

---

## 📄 Licença

Projeto **educacional**, desenvolvido por **Karla Renata**. Destinado a portfólio técnico e demonstração de competências em engenharia de dados e desenvolvimento web.
