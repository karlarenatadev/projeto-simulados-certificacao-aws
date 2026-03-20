# 🧪 Guia de Testes - Novas Funcionalidades

## Checklist de Testes

### ✅ 1. Seleção de Certificação

**Passos:**
1. Abra `index.html` no browser
2. Verifique o dropdown "Selecione sua Certificação"
3. Teste cada opção:
   - [ ] CLF-C02 (Cloud Practitioner)
   - [ ] SAA-C03 (Solutions Architect)
   - [ ] AIF-C01 (AI Practitioner) ⭐ NOVO

**Resultado Esperado:**
- Dropdown estilizado com borda suave
- Foco laranja AWS ao clicar
- Banner de "Última Pontuação" atualiza ao mudar certificação

---

### ✅ 2. Modo Exame vs Modo Estudo

**Passos:**
1. Verifique os dois cards de modo
2. Teste seleção de cada modo:
   - [ ] Modo Exame (ícone relógio)
   - [ ] Modo Estudo (ícone livro)

**Resultado Esperado:**
- Cards com borda e fundo mudam ao selecionar
- Modo Exame: borda laranja, fundo laranja claro
- Modo Estudo: borda azul, fundo azul claro

**Teste Funcional:**
1. Selecione "Modo Exame" → Clique "Iniciar Simulação"
   - [ ] Timer aparece no header (15:00)
   - [ ] Timer conta regressivamente
   
2. Volte ao início → Selecione "Modo Estudo" → Clique "Iniciar Simulação"
   - [ ] Timer NÃO aparece
   - [ ] Pode responder sem pressão de tempo

---

### ✅ 3. Layout Horizontal (Insight e Histórico)

**Passos:**
1. Inicie um simulado
2. Observe o painel direito (aside)
3. Redimensione a janela do browser

**Resultado Esperado:**
- **Desktop (>1280px):** Insight e Histórico lado a lado
- **Tablet (768-1280px):** Empilhados verticalmente
- **Mobile (<768px):** Empilhados verticalmente
- Ambos cards com mesma altura

---

### ✅ 4. Nova Certificação AIF-C01

**Passos:**
1. Selecione "AWS Certified AI Practitioner (AIF-C01)"
2. Clique "Iniciar Simulação"
3. Observe as questões

**Resultado Esperado:**
- [ ] 5 questões sobre IA/ML aparecem
- [ ] Domínios no gráfico radar:
  - Fundamentos de IA/ML
  - Amazon Bedrock
  - Prompt Engineering
  - Segurança em IA
- [ ] Questões técnicas sobre:
  - Bedrock Guardrails
  - Zero-shot prompting
  - RAG
  - Bedrock Agents
  - Segurança (PII, encriptação)

---

### ✅ 5. Segurança - Proteção XSS

**Teste Manual:**
1. Abra DevTools (F12) → Console
2. Execute:
```javascript
// Tentar injetar HTML malicioso
const malicious = '<script>alert("XSS")</script>';
document.getElementById('question-text').textContent = malicious;
```

**Resultado Esperado:**
- [ ] Texto aparece literalmente (não executa)
- [ ] Nenhum alert é exibido
- [ ] HTML é escapado automaticamente

---

### ✅ 6. Segurança - localStorage Corrompido

**Teste Manual:**
1. Abra DevTools → Application → Local Storage
2. Adicione entrada inválida:
```javascript
localStorage.setItem('aws_sim_last_clf-c02', 'invalid json{{{');
```
3. Recarregue a página

**Resultado Esperado:**
- [ ] Aplicação NÃO quebra
- [ ] Console mostra erro (mas aplicação continua)
- [ ] Entrada inválida é removida automaticamente
- [ ] Banner "Última Pontuação" não aparece (ou está vazio)

---

### ✅ 7. Validação - Certificação Inválida

**Teste Manual:**
1. Abra DevTools → Console
2. Execute:
```javascript
document.getElementById('certification-select').value = 'invalid-cert';
startQuiz();
```

**Resultado Esperado:**
- [ ] Alert: "Erro: Certificação selecionada não encontrada"
- [ ] Console: erro logado
- [ ] Quiz NÃO inicia
- [ ] Permanece no ecrã inicial

---

### ✅ 8. Validação - Banco de Questões Vazio

**Teste Manual:**
1. Abra DevTools → Console
2. Execute:
```javascript
questionBanks['clf-c02'] = [];
startQuiz();
```

**Resultado Esperado:**
- [ ] Alert: "Erro: Nenhuma questão disponível"
- [ ] Console: erro logado
- [ ] Quiz NÃO inicia
- [ ] Permanece no ecrã inicial

---

### ✅ 9. Gráfico Radar - Precisão

**Passos:**
1. Selecione CLF-C02 → Inicie simulado
2. Observe labels do gráfico radar
3. Volte ao início
4. Selecione AIF-C01 → Inicie simulado
5. Observe labels do gráfico radar

**Resultado Esperado:**
- **CLF-C02:** Conceitos Cloud, Segurança, Tecnologia, Faturamento
- **AIF-C01:** Fundamentos IA/ML, Amazon Bedrock, Prompt Engineering, Segurança em IA
- [ ] Labels mudam corretamente
- [ ] Sem vazamento de domínios anteriores
- [ ] Dados resetados (todos em 0%)

---

### ✅ 10. Timer - Finalização Automática

**Passos:**
1. Selecione "Modo Exame"
2. Inicie simulado
3. Abra DevTools → Console
4. Execute (acelera timer):
```javascript
appState.timeRemaining = 5; // 5 segundos
```
5. Aguarde 5 segundos

**Resultado Esperado:**
- [ ] Timer chega a 0:00
- [ ] Quiz finaliza automaticamente
- [ ] Vai para tela de resultados
- [ ] Todas as questões não respondidas contam como erro

---

### ✅ 11. Modo Estudo - Sem Timer

**Passos:**
1. Selecione "Modo Estudo"
2. Inicie simulado
3. Observe header

**Resultado Esperado:**
- [ ] Timer NÃO aparece no header
- [ ] Pode responder no seu ritmo
- [ ] Nenhuma finalização automática

---

### ✅ 12. Responsividade

**Passos:**
1. Abra DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Teste diferentes resoluções:
   - [ ] iPhone SE (375px)
   - [ ] iPad (768px)
   - [ ] Desktop (1920px)

**Resultado Esperado:**
- [ ] Dropdown de certificação responsivo
- [ ] Cards de modo empilham em mobile
- [ ] Gráfico radar adapta-se
- [ ] Insight e Histórico empilham/lado a lado conforme tamanho

---

### ✅ 13. Navegação por Teclado

**Passos:**
1. Inicie simulado
2. Use apenas teclado:
   - Tab para navegar
   - Enter/Space para selecionar opção
   - Tab até botão "Confirmar"
   - Enter para confirmar

**Resultado Esperado:**
- [ ] Foco visível em todos os elementos
- [ ] Pode selecionar opções com teclado
- [ ] Pode confirmar resposta com teclado
- [ ] Navegação completa sem mouse

---

### ✅ 14. Persistência de Dados

**Passos:**
1. Complete um simulado CLF-C02
2. Observe pontuação final
3. Volte ao início
4. Verifique banner "Última Pontuação"
5. Mude para AIF-C01
6. Verifique banner

**Resultado Esperado:**
- [ ] Banner mostra última pontuação CLF-C02
- [ ] Ao mudar para AIF-C01, banner desaparece (sem histórico)
- [ ] Complete AIF-C01 → Banner aparece para AIF-C01
- [ ] Dados persistem após recarregar página

---

### ✅ 15. Histórico

**Passos:**
1. Complete 3 simulados
2. Observe painel "Histórico"

**Resultado Esperado:**
- [ ] Últimos 3 resultados aparecem
- [ ] Data formatada (DD/MM)
- [ ] Percentagem exibida
- [ ] Ícone verde (✓) se passou, vermelho (✗) se não

---

### ✅ 16. Relatório PDF

**Passos:**
1. Complete um simulado
2. Clique "Gerar Relatório PDF"

**Resultado Esperado:**
- [ ] Nova janela abre
- [ ] Relatório formatado profissionalmente
- [ ] Inclui: score, gráfico (visual), questões, explicações
- [ ] Botão "Imprimir / Salvar como PDF" funciona
- [ ] Pode salvar como PDF

---

## 🐛 Bugs Conhecidos

Nenhum bug conhecido no momento.

---

## 📊 Resultados dos Testes

### Funcionalidades UI/UX
- [ ] Seleção de Certificação
- [ ] Modo Exame vs Estudo
- [ ] Layout Horizontal
- [ ] Nova Certificação AIF-C01

### Segurança
- [ ] Proteção XSS
- [ ] localStorage Corrompido
- [ ] Validação de Certificação
- [ ] Validação de Questões

### Precisão
- [ ] Gráfico Radar Dinâmico
- [ ] Timer Funcional
- [ ] Modo Estudo Sem Timer

### Responsividade
- [ ] Mobile
- [ ] Tablet
- [ ] Desktop

### Acessibilidade
- [ ] Navegação por Teclado
- [ ] Focus States
- [ ] ARIA Labels

---

## 📝 Notas de Teste

**Data:** ___________  
**Testador:** ___________  
**Browser:** ___________  
**Versão:** ___________  

**Observações:**
_______________________________________
_______________________________________
_______________________________________

---

**Status Geral:** [ ] Aprovado [ ] Reprovado [ ] Pendente

---

**Última atualização:** 2024-03-20
