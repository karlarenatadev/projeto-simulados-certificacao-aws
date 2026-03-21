```markdown
# 🎓 AWS Certified Cloud Simulator - Pro Edition

Uma plataforma de elite para simulados AWS, unindo **Engenharia de Dados com Python** e uma **experiência de usuário (UX) de alto nível**.

Desenvolvido por **Karla Renata**, este simulador não é apenas um quiz, mas um **ecossistema completo focado em Clean Code, Data Integrity e Performance**.

---

# 🏗️ Arquitetura do Ecossistema

O projeto utiliza uma abordagem de **Decoupled Architecture (Arquitetura Desacoplada)**:

### Data Layer
**Python + Pydantic**

Pipeline de **curadoria e sanitização** que garante que **100% das questões sigam um contrato de dados estrito**.

### Storage Layer
**JSON**

Bancos de dados **otimizados e categorizados por certificação oficial**.

### Application Layer
**Vanilla JS + ES6**

Motor de simulado **assíncrono** com **gerenciamento de estado global e reatividade de DOM**.

### Presentation Layer
**TailwindCSS + Chart.js**

Interface **mobile-first** com **feedback visual imediato e análise de radar**.

---

# 📂 Estrutura do Projeto

```

├── 📂 data/             # Bancos de dados JSON validados
├── 📂 scripts_python/   # Pipeline de Sanitização e Geração IA (Pydantic)
├── 📂 assets/           # Ícones, Favicons e Estilos
├── app.js               # O "Coração": Motor do Simulado e Lógica de Estado
├── data.js              # Configurações de Domínios e Trilhas Oficiais
├── sw.js                # Service Worker (PWA) para estudo Offline
└── index.html           # Interface Semântica e Acessível

````

---

# 🚀 Diferenciais Técnicos

## 📊 Análise de Domínios (Radar Chart)

Implementação avançada com **Chart.js** que **mapeia o desempenho em tempo real**.

O gráfico utiliza:

- **Preenchimento de área (Alpha Transparency)**
- **Paddings dinâmicos**
- **Legibilidade otimizada para os domínios oficiais da AWS**

---

## 🛡️ Integridade de Dados com Pydantic

Diferente de simuladores comuns, este projeto possui um **Auditor de Dados em Python**.

Cada questão passa por uma validação que exige:

- mínimo de **30 caracteres na pergunta**
- **exatamente 4 opções de resposta**
- **mapeamento obrigatório para serviços reais da AWS** (S3, Lambda, etc)

---

## 📱 Experiência PWA (Mobile App)

Graças ao **Service Worker customizado**, o simulador:

- pode ser **instalado em Android/iOS**
- funciona **100% offline**
- permite **estudar sem consumo de dados**

---

# 🎯 Funcionalidades Premium

- ✅ **Cards de Opção Interativos**  
  Feedback visual com letras destacadas e estados de seleção.

- ✅ **Modo Exame vs Modo Estudo**  
  Timer regressivo ou revisão imediata com explicações.

- ✅ **Deep Linking de Documentação**  
  Botões diretos para **AWS Whitepapers** em cada resposta.

- ✅ **Gamificação**  
  Sistema de **streaks (dias seguidos)** e **badges de conquista**.

- ✅ **Banco de Erros**  
  Prática focada **apenas nas questões respondidas incorretamente**.

---

# 🛠️ Como Executar

O projeto utiliza a **Fetch API**, portanto requer um **servidor local**.

### Passos:

1. Clone o repositório

```bash
git clone https://github.com/karlarenatadev/projeto-simulados-certificacao-aws.git
````

2. Abra o projeto no **VS Code**

3. Abra o arquivo `index.html`

4. Clique em **Go Live**
   (extensão **Live Server**)

5. Acesse:

```
http://127.0.0.1:5500
```

---

# 📈 Roadmap de Evolução

* ✅ **V1.0** — Motor básico de questões
* ✅ **V2.0** — Migração para JSON + Validação Pydantic
* ✅ **V3.0** — UI Premium com Cards + Radar Chart

### Próximas versões

* ⬜ **V4.0** — Exportação de relatório de desempenho em PDF
* ⬜ **V5.0** — Deploy automatizado via **AWS S3 + CloudFront (CI/CD)**

---

# 📄 Licença e Uso

Este projeto é destinado a **fins educacionais e portfólio técnico**.

Desenvolvido com paixão por **Karla Renata** 🚀

---

# 💡 Dica Final da Karla

> **"A certificação é o seu destino, a disciplina é o seu motor.
> Pratique até o gráfico de radar estar totalmente preenchido."**

```

---

💡 **Sugestão estratégica (importante para seu portfólio):**

Esse README já está **muito acima da média para projetos de portfólio**, mas se você quiser eu posso também transformar ele em um **README nível sênior**, incluindo:

- badges de tecnologia
- preview do simulador
- arquitetura visual (diagrama)
- métricas do projeto
- seção de engenharia de dados
- seção de IA generativa

Isso deixa seu repositório **com cara de projeto de engenharia real**, algo que chama atenção de recrutadores.
```