# 🚀 Guia Rápido de Início

## Começar em 30 Segundos

1. **Abra o ficheiro** `index.html` no seu browser
2. **Clique** em "Iniciar Simulação"
3. **Responda** às 10 questões
4. **Visualize** seus resultados e análise de desempenho

Pronto! É tão simples assim. 🎉

---

## 📖 Estrutura do Projeto

```
📁 Simulador AWS
│
├── 📄 index.html          ← Abra este ficheiro no browser
├── 🎨 style.css           ← Estilos customizados
├── 📊 data.js             ← Banco de questões
├── ⚙️ app.js              ← Lógica da aplicação
│
└── 📚 Documentação
    ├── README.md          ← Visão geral completa
    ├── ARCHITECTURE.md    ← Detalhes técnicos
    ├── CONTRIBUTING.md    ← Como contribuir
    ├── CHANGELOG.md       ← Histórico de mudanças
    └── QUICKSTART.md      ← Este ficheiro
```

---

## 🎯 Funcionalidades Principais

### 1. Simulação Realista
- ⏱️ **Timer de 15 minutos** (finaliza automaticamente)
- 📊 **10 questões** por simulado
- 🔀 **Questões aleatórias** a cada vez
- ✅ **Feedback imediato** com explicações

### 2. Análise Inteligente
- 📈 **Gráfico radar** de desempenho por domínio
- 🤖 **Insights da IA** personalizados
- 📉 **Comparação** com resultados anteriores
- 🎯 **Recomendações** de estudo

### 3. Relatórios
- 📄 **Exportação para PDF** profissional
- 📊 **Análise completa** de todas as questões
- 💡 **Explicações detalhadas** dos erros
- 📚 **Links de estudo** recomendados

### 4. Histórico
- 💾 **Salva automaticamente** seus resultados
- 📅 **Histórico** dos últimos 10 simulados
- 📈 **Acompanhe** sua evolução

---

## 🎓 Certificações Disponíveis

### AWS Certified Cloud Practitioner (CLF-C02)
**Nível:** Fundamental  
**Domínios:**
- Conceitos de Cloud (24%)
- Segurança e Conformidade (30%)
- Tecnologia e Serviços (34%)
- Faturamento e Preços (12%)

**Questões disponíveis:** 10+

### AWS Certified Solutions Architect - Associate (SAA-C03)
**Nível:** Associate  
**Domínios:**
- Design de Arquiteturas Resilientes (26%)
- Design de Arquiteturas de Alto Desempenho (24%)
- Design de Aplicações e Arquiteturas Seguras (30%)
- Design de Arquiteturas Otimizadas em Custos (20%)

**Questões disponíveis:** 3+ (em expansão)

---

## 💡 Dicas de Uso

### Para Melhor Experiência

1. **Use um browser moderno**
   - Chrome 90+
   - Firefox 88+
   - Safari 14+
   - Edge 90+

2. **Tela cheia recomendada**
   - Pressione F11 para modo tela cheia
   - Melhor visualização do gráfico radar

3. **Sem distrações**
   - Feche outras abas
   - Silencie notificações
   - Simule ambiente de exame real

4. **Revise os erros**
   - Leia todas as explicações
   - Clique nos links de estudo
   - Refaça o simulado após estudar

### Atalhos de Teclado

- **Tab**: Navegar entre opções
- **Enter/Space**: Selecionar opção
- **Tab + Enter**: Confirmar resposta

---

## 🔧 Personalização Rápida

### Alterar Duração do Quiz

Abra `app.js` e modifique:

```javascript
const CONFIG = {
  QUIZ_DURATION: 15 * 60,  // ← Altere aqui (em segundos)
  // 10 minutos = 10 * 60
  // 20 minutos = 20 * 60
};
```

### Alterar Número de Questões

```javascript
const CONFIG = {
  QUESTIONS_PER_QUIZ: 10,  // ← Altere aqui
  // Mínimo: 5
  // Máximo: número de questões no banco
};
```

### Alterar Nota de Corte

```javascript
const CONFIG = {
  PASSING_SCORE: 70,  // ← Altere aqui (%)
  // Exame real CLF-C02: 70%
  // Exame real SAA-C03: 72%
};
```

---

## 📱 Uso em Mobile

### Funciona Perfeitamente

- ✅ Layout responsivo
- ✅ Gráfico adaptativo
- ✅ Botões touch-friendly
- ✅ Scroll suave

### Recomendações

- Use modo paisagem para melhor visualização
- Zoom do browser em 100%
- Conexão estável (CDNs externos)

---

## 🐛 Resolução de Problemas

### Gráfico não aparece?

**Solução:** Verifique sua conexão com a internet (Chart.js via CDN)

### Timer não funciona?

**Solução:** Certifique-se de que JavaScript está ativado no browser

### Dados não salvam?

**Solução:** Verifique se localStorage está habilitado (não use modo anónimo)

### Relatório PDF não gera?

**Solução:** Permita pop-ups no seu browser

---

## 📚 Próximos Passos

### Após Completar um Simulado

1. **Revise os erros** - Leia todas as explicações
2. **Estude os domínios fracos** - Use os links recomendados
3. **Refaça o simulado** - Novas questões a cada vez
4. **Acompanhe sua evolução** - Veja o histórico

### Para Aprofundar

- 📖 Leia o [README.md](README.md) completo
- 🏗️ Entenda a [ARCHITECTURE.md](ARCHITECTURE.md)
- 🤝 Contribua com [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🎯 Meta de Estudo Sugerida

### Iniciante (0-50%)
- **Frequência:** 1 simulado por dia
- **Foco:** Entender conceitos básicos
- **Meta:** Atingir 60% em 2 semanas

### Intermediário (50-70%)
- **Frequência:** 2 simulados por dia
- **Foco:** Domínios mais fracos
- **Meta:** Atingir 75% em 1 semana

### Avançado (70%+)
- **Frequência:** 1 simulado a cada 2 dias
- **Foco:** Manter consistência
- **Meta:** Manter 80%+ antes do exame

---

## 🌟 Recursos Adicionais

### Documentação Oficial AWS
- [AWS Training](https://aws.amazon.com/training/)
- [AWS Whitepapers](https://aws.amazon.com/whitepapers/)
- [AWS FAQs](https://aws.amazon.com/faqs/)

### Comunidade
- [AWS Community](https://aws.amazon.com/developer/community/)
- [AWS Forums](https://forums.aws.amazon.com/)
- [AWS Reddit](https://reddit.com/r/aws)

---

## ❓ Perguntas Frequentes

**P: Quantas vezes posso fazer o simulado?**  
R: Ilimitadas! Cada vez com questões diferentes.

**P: Os dados ficam salvos?**  
R: Sim, no localStorage do seu browser (local, não na nuvem).

**P: Posso usar offline?**  
R: Parcialmente. Precisa de internet para CDNs (Tailwind, Chart.js, Font Awesome).

**P: É gratuito?**  
R: Sim, 100% gratuito e open source.

**P: Posso adicionar minhas questões?**  
R: Sim! Veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🎉 Boa Sorte!

Lembre-se: a prática leva à perfeição. Continue estudando e você conseguirá sua certificação AWS! 💪

**Dúvidas?** Abra uma issue no repositório.

---

**Última atualização:** 2024-03-20
