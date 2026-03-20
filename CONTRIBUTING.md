# 🤝 Guia de Contribuição

## Como Adicionar Novas Questões

### 1. Estrutura de uma Questão

Cada questão deve seguir este formato:

```javascript
{
  id: 999,                          // ID único (número inteiro)
  domain: 'conceitos-cloud',        // ID do domínio (ver lista abaixo)
  question: 'Qual é...?',           // Texto da pergunta
  options: [                        // Exatamente 4 opções
    'Opção A',
    'Opção B',
    'Opção C',
    'Opção D'
  ],
  correct: 1,                       // Índice da resposta correta (0-3)
  explanation: 'Explicação...'      // Explicação detalhada da resposta
}
```

### 2. Domínios Disponíveis

#### CLF-C02 (Cloud Practitioner)
- `conceitos-cloud` - Conceitos de Cloud
- `seguranca` - Segurança e Conformidade
- `tecnologia` - Tecnologia e Serviços
- `faturamento` - Faturamento e Preços

#### SAA-C03 (Solutions Architect Associate)
- `design-resiliente` - Design de Arquiteturas Resilientes
- `design-performante` - Design de Arquiteturas de Alto Desempenho
- `design-seguro` - Design de Aplicações e Arquiteturas Seguras
- `design-otimizado` - Design de Arquiteturas Otimizadas em Custos

### 3. Boas Práticas

#### Qualidade das Questões

✅ **Faça:**
- Use linguagem clara e objetiva
- Baseie-se em cenários reais
- Forneça explicações educativas
- Inclua o "porquê" na explicação
- Revise ortografia e gramática

❌ **Evite:**
- Questões ambíguas ou "pegadinhas"
- Respostas óbvias demais
- Jargão excessivo sem contexto
- Explicações vagas ou incompletas

#### Exemplo de Questão Bem Escrita

```javascript
{
  id: 50,
  domain: 'tecnologia',
  question: 'Uma empresa precisa armazenar logs de aplicação que serão acessados raramente, mas devem ser mantidos por 7 anos para conformidade. Qual classe de armazenamento do S3 é mais econômica?',
  options: [
    'S3 Standard',
    'S3 Intelligent-Tiering',
    'S3 Glacier Deep Archive',
    'S3 One Zone-IA'
  ],
  correct: 2,
  explanation: 'S3 Glacier Deep Archive é a opção mais econômica para dados raramente acedidos com retenção de longo prazo. Oferece o menor custo de armazenamento (~$1/TB/mês) com tempo de recuperação de 12-48 horas, ideal para arquivos de conformidade. S3 Standard seria muito caro para dados raramente acedidos, Intelligent-Tiering é para padrões de acesso imprevisíveis, e One Zone-IA não oferece a mesma durabilidade multi-AZ necessária para dados críticos de conformidade.'
}
```

### 4. Onde Adicionar

Abra o ficheiro `data.js` e adicione sua questão no array apropriado:

```javascript
// Para CLF-C02
const questionsClf = [
  // ... questões existentes
  {
    // Sua nova questão aqui
  }
];

// Para SAA-C03
const questionsSaa = [
  // ... questões existentes
  {
    // Sua nova questão aqui
  }
];
```

### 5. Validação

Antes de submeter, verifique:

- [ ] ID único (não duplicado)
- [ ] Domínio válido
- [ ] Exatamente 4 opções
- [ ] Índice `correct` entre 0-3
- [ ] Explicação com pelo menos 50 caracteres
- [ ] Sem erros de sintaxe JavaScript
- [ ] Testado no browser

### 6. Teste Manual

1. Abra `index.html` no browser
2. Inicie um simulado
3. Verifique se sua questão aparece
4. Teste todas as opções de resposta
5. Confirme que a explicação é exibida corretamente

## Como Adicionar Nova Certificação

### 1. Definir a Certificação

Em `data.js`, adicione ao objeto `certificationPaths`:

```javascript
'dva-c02': {
  id: 'dva-c02',
  name: 'AWS Certified Developer - Associate',
  code: 'DVA-C02',
  description: 'Certificação para desenvolvedores que criam aplicações na AWS',
  icon: 'fa-code',
  color: 'green',
  domains: [
    { id: 'desenvolvimento', name: 'Desenvolvimento com Serviços AWS', weight: 32 },
    { id: 'seguranca-dev', name: 'Segurança', weight: 26 },
    { id: 'deployment', name: 'Deployment', weight: 24 },
    { id: 'troubleshooting', name: 'Troubleshooting e Otimização', weight: 18 }
  ]
}
```

### 2. Criar Banco de Questões

```javascript
const questionsDva = [
  {
    id: 201,
    domain: 'desenvolvimento',
    question: 'Qual serviço AWS...',
    options: ['A', 'B', 'C', 'D'],
    correct: 0,
    explanation: 'Explicação...'
  },
  // Mínimo 10 questões recomendado
];
```

### 3. Registar no Mapeamento

```javascript
const questionBanks = {
  'clf-c02': questionsClf,
  'saa-c03': questionsSaa,
  'dva-c02': questionsDva  // Adicione aqui
};
```

### 4. Adicionar Recursos de Estudo

```javascript
const studyResources = {
  // ... recursos existentes
  'desenvolvimento': [
    { name: 'AWS SDK Documentation', url: 'https://...', icon: 'fa-code', color: 'blue' }
  ],
  // ...
};
```

### 5. Atualizar UI (Futuro)

Quando implementarmos seleção de certificação, o card será gerado automaticamente baseado nos dados.

## Diretrizes de Código

### JavaScript

```javascript
// ✅ Bom: Função pura, nome descritivo
function calculateDomainPercentage(correct, total) {
  if (total === 0) return 0;
  return (correct / total) * 100;
}

// ❌ Evite: Função impura, nome vago
function calc(c, t) {
  score = (c / t) * 100;
  return score;
}
```

### CSS

```css
/* ✅ Bom: Nome descritivo, comentário útil */
.option-card--selected {
  /* Destaque visual quando o utilizador seleciona uma opção */
  border-color: var(--aws-orange);
  background-color: #fffaf0;
}

/* ❌ Evite: Nome genérico, sem contexto */
.selected {
  border-color: orange;
}
```

### HTML

```html
<!-- ✅ Bom: Semântico, acessível -->
<button 
  onclick="submitAnswer()" 
  aria-label="Confirmar resposta selecionada"
  class="btn-primary">
  Confirmar
</button>

<!-- ❌ Evite: Não semântico, sem acessibilidade -->
<div onclick="submitAnswer()" class="btn">
  Confirmar
</div>
```

## Checklist de Pull Request

Antes de submeter alterações:

- [ ] Código testado no browser
- [ ] Sem erros no console
- [ ] Sem warnings de acessibilidade
- [ ] Responsivo em mobile
- [ ] Comentários adicionados onde necessário
- [ ] README.md atualizado se aplicável
- [ ] Sem código comentado ou console.log()

## Reportar Bugs

### Template de Issue

```markdown
**Descrição do Bug**
Descrição clara do problema.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente**
- Browser: [ex: Chrome 120]
- OS: [ex: Windows 11]
- Versão: [ex: 1.0.0]
```

## Sugerir Funcionalidades

### Template de Feature Request

```markdown
**Problema a Resolver**
Descrição clara do problema ou necessidade.

**Solução Proposta**
Como você imagina que isso funcionaria.

**Alternativas Consideradas**
Outras abordagens que você pensou.

**Contexto Adicional**
Qualquer outra informação relevante.
```

## Código de Conduta

- Seja respeitoso e construtivo
- Foque no código, não na pessoa
- Aceite feedback com mente aberta
- Ajude outros contribuidores

## Dúvidas?

Abra uma issue com a tag `question` ou entre em contato.

---

Obrigado por contribuir! 🎉
