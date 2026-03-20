# 🎓 Simulador IA - Certificações AWS

[![Desenvolvido por](https://img.shields.io/badge/Desenvolvido%20por-Karla%20Renata-orange?style=for-the-badge&logoColor=white)](#)
[![AWS](https://img.shields.io/badge/AWS-Cloud-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

Aplicação web profissional para simulação de exames de certificação AWS com análise inteligente de desempenho em tempo real.

Projeto desenvolvido por **Karla Renata** para ajudar a comunidade a preparar-se para certificações AWS com foco em Clean Code e Segurança Web.

---

## 📚 Documentação Completa

- 📑 **[INDEX.md](INDEX.md)** - Índice completo de toda a documentação
- 🚀 **[QUICKSTART.md](QUICKSTART.md)** - Comece em 30 segundos
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura técnica detalhada
- 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guia para contribuidores
- 📊 **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - Sumário executivo
- 🛡️ **[SECURITY_IMPROVEMENTS.md](SECURITY_IMPROVEMENTS.md)** - Melhorias de segurança
- 📝 **[CHANGELOG.md](CHANGELOG.md)** - Histórico de mudanças e melhorias
- 🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guia dporte a leitores de ecrã

## 🏗️ Arquitetura

### Estrutura de Ficheiros

```
├── index.html          # Estrutura HTML limpa e semântica
├── style.css           # Estilos customizados e tema AWS
├── data.js             # Banco de questões e trilhas de certificação
├── app.js              # Lógica principal da aplicação
└── README.md           # Documentação do projeto
```

### Princípios Aplicados

- **Separação de Responsabilidades**: Dados, lógica e apresentação isolados
- **Clean Code**: Funções puras, nomes descritivos, early returns
- **Modularização**: Código organizado em módulos lógicos
- **Comentários Explicativos**: Documentação do "porquê" da lógica de negócio

## 🚀 Funcionalidades

### 1. Simulação de Exame

- 10 questões por simulado (configurável)
- Timer de 15 minutos com finalização automática
- Barra de progresso visual
- Feedback imediato com explicações detalhadas

### 2. Análise Inteligente

- **Gráfico Radar**: Visualização de desempenho por domínio (Chart.js)
- **Insights Dinâmicos**: Recomendações personalizadas da IA
- **Comparação de Resultados**: Badge de melhoria vs último simulado

### 3. Relatório de Desempenho

- Geração de relatório PDF profissional
- Inclui: score, gráfico, questões detalhadas, explicações e insights
- Formatação otimizada para impressão
- Uso de `window.print()` nativo do browser

### 4. Persistência de Dados

- **localStorage**: Armazena último resultado de cada certificação
- **Histórico**: Mantém os últimos 10 simulados realizados
- **Exibição no Início**: Mostra última pontuação no card da certificação

### 5. Certificações Disponíveis

#### AWS Certified Cloud Practitioner (CLF-C02)
- Conceitos de Cloud (24%)
- Segurança e Conformidade (30%)
- Tecnologia e Serviços (34%)
- Faturamento e Preços (12%)

#### AWS Certified Solutions Architect - Associate (SAA-C03)
- Design de Arquiteturas Resilientes (26%)
- Design de Arquiteturas de Alto Desempenho (24%)
- Design de Aplicações e Arquiteturas Seguras (30%)
- Design de Arquiteturas Otimizadas em Custos (20%)

## 🎨 Design e UX

### Tema AWS

- Cores oficiais: `#232f3e` (dark), `#ff9900` (orange)
- Tipografia: Open Sans
- Ícones: Font Awesome 6.4

### Responsividade

- Layout adaptativo para desktop, tablet e mobile
- Gráfico radar responsivo
- Stack de botões em ecrãs pequenos

### Acessibilidade (a11y)

- Atributos ARIA (`aria-label`, `aria-live`, `role`)
- Navegação por teclado (`tabindex`, `focus states`)
- Suporte a `prefers-reduced-motion`
- Suporte a `prefers-contrast: high`
- Foco visível para todos os elementos interativos

## 💻 Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos customizados + Tailwind CSS (CDN)
- **Vanilla JavaScript**: Lógica pura sem frameworks
- **Chart.js**: Gráfico radar de domínios
- **Font Awesome**: Ícones
- **localStorage API**: Persistência de dados

## 📦 Como Usar

1. Abra o ficheiro `index.html` num browser moderno
2. Clique em "Iniciar Simulação"
3. Responda às questões dentro do tempo limite
4. Visualize os resultados e análise de desempenho
5. Gere o relatório PDF se desejar

## 🔧 Configuração

### Constantes Editáveis (app.js)

```javascript
const CONFIG = {
  QUIZ_DURATION: 15 * 60,        // Duração em segundos
  QUESTIONS_PER_QUIZ: 10,        // Número de questões
  PASSING_SCORE: 70,             // Pontuação mínima (%)
  STORAGE_KEY_PREFIX: 'aws_sim_' // Prefixo localStorage
};
```

### Adicionar Novas Questões (data.js)

```javascript
{
  id: 101,
  domain: 'conceitos-cloud',
  question: 'Sua pergunta aqui?',
  options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
  correct: 1, // Índice da resposta correta (0-3)
  explanation: 'Explicação detalhada da resposta.'
}
```

## 🎯 Próximas Melhorias

- [ ] Filtro de questões por domínio
- [ ] Exportação de dados em JSON
- [ ] Modo escuro
- [ ] Integração com API de questões externas

## 📄 Licença

Este projeto é de código aberto para fins educacionais.

## 👨‍💻 Desenvolvimento

Desenvolvido seguindo princípios de:
- Clean Code (Robert C. Martin)
- SOLID Principles
- Web Accessibility Guidelines (WCAG)
- Progressive Enhancement

---

**Nota**: Este simulador é uma ferramenta de estudo e não representa um exame oficial AWS. As questões são exemplos educacionais.
