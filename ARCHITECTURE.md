# 🏛️ Documentação de Arquitetura

## Visão Geral da Arquitetura

Este documento detalha as decisões arquiteturais, padrões de design e estrutura técnica do Simulador IA AWS.

## 📐 Padrões de Design Aplicados

### 1. Separation of Concerns (SoC)

A aplicação está dividida em três camadas distintas:

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │
│         (index.html + style.css)        │
│  - Estrutura HTML semântica             │
│  - Estilos e tema visual                │
│  - Acessibilidade (ARIA)                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER            │
│              (app.js)                   │
│  - Gestão de estado                     │
│  - Fluxo do quiz                        │
│  - Cálculos e análises                  │
│  - Persistência de dados                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           DATA LAYER                    │
│             (data.js)                   │
│  - Banco de questões                    │
│  - Trilhas de certificação              │
│  - Recursos de estudo                   │
└─────────────────────────────────────────┘
```

### 2. State Management Pattern

O estado da aplicação é centralizado num único objeto global:

```javascript
let appState = {
  currentCertification: null,    // Certificação ativa
  questions: [],                 // Questões do quiz
  currentQuestionIndex: 0,       // Índice atual
  selectedAnswer: null,          // Resposta selecionada
  answers: [],                   // Histórico de respostas
  score: 0,                      // Pontuação
  domainScores: {},              // Pontuação por domínio
  quizStartTime: null,           // Timestamp de início
  timerInterval: null,           // Referência do timer
  timeRemaining: 15 * 60         // Tempo restante
};
```

**Vantagens:**
- Estado previsível e fácil de debugar
- Facilita testes unitários
- Evita inconsistências de dados

### 3. Module Pattern

Cada ficheiro JavaScript representa um módulo lógico:

- **data.js**: Módulo de dados (read-only)
- **app.js**: Módulo de aplicação (stateful)

### 4. Event-Driven Architecture

A aplicação responde a eventos do utilizador:

```javascript
// Eventos de UI
onclick="startQuiz()"
onclick="submitAnswer()"
onclick="nextQuestion()"

// Eventos de teclado (acessibilidade)
addEventListener('keypress', handleKeyPress)

// Eventos de timer
setInterval(() => updateTimer(), 1000)
```

## 🔄 Fluxo de Dados

### Ciclo de Vida do Quiz

```
[Início] → [Seleção] → [Carregamento] → [Questão] → [Resposta] → [Feedback]
                                            ↑            ↓
                                            └────────────┘
                                          (Loop até fim)
                                                 ↓
                                          [Resultados] → [Relatório]
```

### Fluxo de Persistência

```
[Ação do Utilizador]
        ↓
[Atualização do Estado]
        ↓
[Cálculo de Métricas]
        ↓
[Atualização da UI]
        ↓
[Persistência no localStorage]
```

## 🎯 Decisões Técnicas

### Por que Vanilla JS?

1. **Performance**: Sem overhead de frameworks
2. **Simplicidade**: Código direto e compreensível
3. **Portabilidade**: Funciona em qualquer browser moderno
4. **Aprendizado**: Demonstra fundamentos de JavaScript

### Por que localStorage?

1. **Simplicidade**: API nativa do browser
2. **Persistência**: Dados mantidos entre sessões
3. **Privacidade**: Dados ficam no dispositivo do utilizador
4. **Sem Backend**: Aplicação 100% client-side

### Por que Chart.js?

1. **Leveza**: Biblioteca pequena (~60KB)
2. **Responsiva**: Gráficos adaptam-se ao container
3. **Customizável**: Tema AWS facilmente aplicável
4. **Acessível**: Suporte a ARIA labels

## 📊 Estrutura de Dados

### Objeto de Certificação

```javascript
{
  id: 'clf-c02',
  name: 'AWS Certified Cloud Practitioner',
  code: 'CLF-C02',
  description: 'Descrição da certificação',
  icon: 'fa-cloud',
  color: 'orange',
  domains: [
    { id: 'conceitos-cloud', name: 'Conceitos de Cloud', weight: 24 },
    // ...
  ]
}
```

### Objeto de Questão

```javascript
{
  id: 1,
  domain: 'conceitos-cloud',
  question: 'Texto da pergunta?',
  options: ['A', 'B', 'C', 'D'],
  correct: 1,
  explanation: 'Explicação detalhada'
}
```

### Objeto de Resultado

```javascript
{
  certificationId: 'clf-c02',
  certificationName: 'AWS Certified Cloud Practitioner',
  date: '2024-03-20T10:30:00.000Z',
  score: 8,
  total: 10,
  percentage: 80,
  domainScores: {
    'conceitos-cloud': { correct: 2, total: 3 },
    // ...
  },
  answers: [...],
  timeSpent: 720 // segundos
}
```

## 🎨 Sistema de Design

### Paleta de Cores

```css
:root {
  --aws-dark: #232f3e;           /* Texto e header */
  --aws-orange: #ff9900;         /* Ações primárias */
  --aws-orange-hover: #ec7211;   /* Hover state */
  --aws-light-gray: #f2f3f3;     /* Background */
  --aws-border: #eaeded;         /* Bordas */
  --success-green: #22c55e;      /* Feedback positivo */
  --error-red: #ef4444;          /* Feedback negativo */
  --info-blue: #3b82f6;          /* Informações */
}
```

### Tipografia

- **Família**: Open Sans (Google Fonts)
- **Pesos**: 300 (light), 400 (regular), 600 (semibold), 700 (bold)
- **Tamanhos**: Sistema responsivo baseado em rem

### Espaçamento

Segue o sistema de espaçamento do Tailwind CSS:
- Base: 4px (0.25rem)
- Escala: 4, 8, 12, 16, 24, 32, 48, 64px

## ♿ Acessibilidade

### Atributos ARIA Implementados

```html
<!-- Regiões -->
<header role="banner">
<main role="main">
<aside role="complementary">

<!-- Estados dinâmicos -->
<div role="status" aria-live="polite">
<div role="alert" aria-live="assertive">

<!-- Elementos interativos -->
<button aria-label="Descrição clara">
<div role="button" tabindex="0">

<!-- Gráficos -->
<div role="img" aria-label="Descrição do gráfico">
```

### Navegação por Teclado

- **Tab**: Navega entre elementos focáveis
- **Enter/Space**: Ativa botões e seleciona opções
- **Escape**: Fecha modais (futuro)

### Suporte a Preferências do Sistema

```css
/* Movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}

/* Alto contraste */
@media (prefers-contrast: high) {
  .option-card { border-width: 3px; }
}
```

## 📱 Responsividade

### Breakpoints

```css
/* Mobile First */
@media (max-width: 640px)  { /* Mobile */ }
@media (max-width: 768px)  { /* Tablet */ }
@media (max-width: 1024px) { /* Desktop pequeno */ }
@media (min-width: 1280px) { /* Desktop grande */ }
```

### Estratégias

1. **Layout Flexível**: Flexbox e Grid
2. **Unidades Relativas**: rem, em, %, vw, vh
3. **Imagens Responsivas**: max-width: 100%
4. **Gráficos Adaptativos**: Chart.js responsive: true

## 🔒 Segurança

### Boas Práticas Implementadas

1. **Sem eval()**: Código não executa strings como código
2. **Sanitização**: Conteúdo inserido via textContent (não innerHTML)
3. **CSP Ready**: Compatível com Content Security Policy
4. **localStorage Seguro**: Apenas dados não-sensíveis

### Limitações

- Dados não encriptados no localStorage
- Sem autenticação de utilizador
- Sem proteção contra manipulação de dados locais

## 🚀 Performance

### Otimizações Implementadas

1. **Lazy Loading**: Chart.js carregado via CDN
2. **Debouncing**: Timer atualiza a cada 1s (não em tempo real)
3. **Animações Eficientes**: CSS transforms (GPU accelerated)
4. **DOM Mínimo**: Atualiza apenas elementos necessários

### Métricas Alvo

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Lighthouse Score**: > 90

## 🧪 Testabilidade

### Funções Puras

```javascript
// Exemplo de função pura (fácil de testar)
function calculatePercentage(correct, total) {
  if (total === 0) return 0;
  return (correct / total) * 100;
}
```

### Separação de Lógica e UI

```javascript
// Lógica (testável)
function updateScore(currentScore, isCorrect) {
  return isCorrect ? currentScore + 1 : currentScore;
}

// UI (não testável unitariamente)
function updateScoreDisplay() {
  document.getElementById('score').textContent = appState.score;
}
```

## 📈 Escalabilidade

### Pontos de Extensão

1. **Novas Certificações**: Adicionar em `certificationPaths`
2. **Novas Questões**: Adicionar em `questionBanks`
3. **Novos Domínios**: Adicionar em `domains` array
4. **Novos Recursos**: Adicionar em `studyResources`

### Limites Atuais

- **localStorage**: ~5-10MB (suficiente para milhares de resultados)
- **Questões**: Sem limite técnico (apenas performance de shuffle)
- **Domínios**: Chart.js suporta até ~20 eixos no radar

## 🔮 Roadmap Técnico

### Curto Prazo
- [ ] Testes unitários (Jest)
- [ ] Validação de dados com JSON Schema
- [ ] Service Worker para offline

### Médio Prazo
- [ ] IndexedDB para histórico extenso
- [ ] Web Workers para cálculos pesados
- [ ] PWA (Progressive Web App)

### Longo Prazo
- [ ] Backend opcional (Node.js + MongoDB)
- [ ] Sincronização multi-dispositivo
- [ ] Analytics de aprendizado

---

**Última atualização**: 2024-03-20
