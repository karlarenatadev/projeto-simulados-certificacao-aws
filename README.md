
# 🎓 Simulador IA - Certificações AWS

[![Desenvolvido por](https://img.shields.io/badge/Desenvolvido%20por-Karla%20Renata-orange?style=for-the-badge&logoColor=white)](#-autor)
[![AWS](https://img.shields.io/badge/AWS-Cloud-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)

Aplicação web profissional para simulação de exames de certificação AWS com análise inteligente de desempenho em tempo real.

Projeto desenvolvido por **Karla Renata** para ajudar a comunidade a preparar-se para certificações AWS com foco em Clean Code, Segurança Web e Performance.

---

## 📚 Documentação Completa

- 📑 **[INDEX.md](INDEX.md)** - Índice completo de toda a documentação
- 🚀 **[QUICKSTART.md](QUICKSTART.md)** - Comece em 30 segundos
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura técnica detalhada
- 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guia para contribuidores
- 📊 **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Sumário executivo
- 🛡️ **[SECURITY_IMPROVEMENTS.md](SECURITY_IMPROVEMENTS.md)** - Melhorias de segurança
- 📝 **[CHANGELOG.md](CHANGELOG.md)** - Histórico de mudanças e melhorias
- 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guia de Deployment

## 🏗️ Arquitetura

### Estrutura de Ficheiros

```text
├── index.html          # Estrutura HTML limpa e semântica
├── style.css           # Estilos customizados e tema AWS
├── app.js              # Lógica principal da aplicação (Assíncrona)
├── data.js             # Mapeamento de certificações e utilitários
├── /data/              # Pasta com os bancos de questões em JSON
│   ├── clf-c02.json    # Questões Cloud Practitioner
│   ├── saa-c03.json    # Questões Solutions Architect
│   └── aif-c01.json    # Questões AI Practitioner
├── sw.js               # Service Worker para funcionamento Offline (PWA)
├── manifest.json       # Configuração de instalação do PWA
└── README.md           # Documentação do projeto
```

### Princípios Aplicados

- **Separação de Responsabilidades**: Dados estáticos isolados em JSON, lógica e apresentação separados.
- **Clean Code**: Funções puras, nomes descritivos, early returns e otimização de DOM (DocumentFragment).
- **Segurança Core**: Prevenção XSS (`textContent`), blindagem do LocalStorage e validação de dados de entrada.
- **PWA (Progressive Web App)**: Cache de recursos para funcionamento 100% offline.

## 🚀 Funcionalidades

### 1. Simulação de Exame e Estudo
- **Modos Híbridos**: Alterne entre Modo Exame (com timer) e Modo Estudo (livre).
- 10 questões por simulado (configurável).
- Feedback imediato com explicações detalhadas.

### 2. Análise Inteligente
- **Gráfico Radar**: Visualização de desempenho por domínio (Chart.js).
- **Insights Dinâmicos**: Recomendações personalizadas da IA.
- **Comparação de Resultados**: Badge de melhoria vs último simulado.

### 3. Relatório de Desempenho
- Geração de relatório PDF profissional.
- Inclui: score, gráfico, questões detalhadas, explicações e insights.
- Formatação otimizada para impressão.

### 4. Persistência de Dados e PWA
- **localStorage Seguro**: Armazena último resultado e mantém histórico.
- **Suporte Offline**: Instale a aplicação no seu celular/desktop e estude sem internet.

### 5. Certificações Disponíveis

#### ☁️ AWS Certified Cloud Practitioner (CLF-C02)
- Conceitos de Cloud (24%) | Segurança e Conformidade (30%) | Tecnologia e Serviços (34%) | Faturamento e Preços (12%)

#### 🏗️ AWS Certified Solutions Architect - Associate (SAA-C03)
- Design de Arquiteturas Resilientes (26%) | Alto Desempenho (24%) | Arquiteturas Seguras (30%) | Otimizadas em Custos (20%)

#### 🤖 AWS Certified AI Practitioner (AIF-C01)
- Fundamentos de IA/ML | Amazon Bedrock | Prompt Engineering | Segurança em IA

## 🎨 Design e UX

### Tema AWS
- Cores oficiais: `#232f3e` (dark), `#ff9900` (orange)
- Tipografia: Open Sans
- Ícones: Font Awesome 6.4

### Responsividade e Acessibilidade (a11y)
- Layout adaptativo (mobile, tablet, desktop) com CSS Grid.
- Atributos ARIA (`aria-label`, `aria-live`, `role`).
- Navegação por teclado (`tabindex`, `focus states`) e inputs invisíveis apenas para Leitores de Tela (`sr-only`).

## 💻 Tecnologias

- **HTML5 & CSS3** (Tailwind CSS via CDN)
- **Vanilla JavaScript** (Lógica pura, ES6+, Fetch API)
- **Chart.js** (Gráfico radar dinâmico)
- **Service Workers** (PWA Offline)

## 📦 Como Usar

1. Clone o repositório ou faça o download da pasta.
2. Como o projeto usa `fetch()` para carregar arquivos `.json`, **é necessário rodar um servidor local** (ex: Extensão *Live Server* do VS Code).
3. Abra a porta do servidor local no seu browser.
4. Selecione a certificação, escolha o modo e clique em "Iniciar Simulação".

## 🔧 Configuração e Como Adicionar Questões

Para adicionar novas questões, não é mais necessário alterar o JavaScript. Basta abrir o arquivo JSON correspondente na pasta `/data/` e adicionar um novo objeto:

```json
{
  "id": 999,
  "domain": "conceitos-cloud",
  "question": "Sua nova pergunta aqui?",
  "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "correct": 1,
  "explanation": "Explicação detalhada da resposta."
}
```

## 🎯 Próximas Melhorias (Roadmap)

- [x] Separação de dados em arquivos `.json` nativos (Fetch API)
- [x] PWA (Progressive Web App) para acesso offline
- [x] Otimização de Performance (DocumentFragment no DOM)
- [ ] Filtro de questões por domínio específico
- [ ] Modo escuro (Dark Mode)
- [ ] Integração com backend / API de questões externas

## 📄 Licença

Este projeto é de código aberto sob a licença MIT para fins educacionais.

---

**Nota**: Este simulador é uma ferramenta de estudo e não representa um exame oficial AWS. As questões são exemplos educacionais baseados nos guias oficiais.
