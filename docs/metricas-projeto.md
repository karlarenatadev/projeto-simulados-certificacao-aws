# 📊 Métricas e Estatísticas do Projeto

## 📈 Visão Geral

**Projeto**: AWS Certification Simulator  
**Versão**: 2.0.0  
**Data da Análise**: 22 de Março de 2026

---

## 💾 Banco de Dados

### Questões por Certificação

| Certificação | Total | Fácil | Médio | Difícil | Múltipla Resposta |
|--------------|-------|-------|-------|---------|-------------------|
| CLF-C02      | 195   | TBD   | TBD   | TBD     | 5                 |
| SAA-C03      | 195   | TBD   | TBD   | TBD     | 0                 |
| AIF-C01      | 143   | TBD   | TBD   | TBD     | 5                 |
| DVA-C02      | 195   | TBD   | TBD   | TBD     | 0                 |
| **TOTAL**    | **728** | - | - | - | **10** |

### Tradução

| Certificação | PT-BR | EN-US | Status |
|--------------|-------|-------|--------|
| CLF-C02      | ✅    | ✅    | Completo |
| SAA-C03      | ✅    | ✅    | Completo |
| AIF-C01      | ✅    | 🚧    | Pendente |
| DVA-C02      | ✅    | ✅    | Completo |

### Glossário de Flashcards

- **Total de Termos**: 20
- **Categorias**: 4 (Gerenciamento, Computação, Rede, Monitoramento)
- **Definições**: Todas oficiais da AWS

---

## 💻 Código

### Frontend (JavaScript)

| Arquivo | Linhas | Funções | Descrição |
|---------|--------|---------|-----------|
| app.js | 988 | 30+ | Controller da UI |
| quizEngine.js | 150 | 8 | Motor de lógica |
| data.js | 200 | 2 | Configuração |
| storageManager.js | ~150 | 10+ | Persistência |
| **TOTAL** | **~1488** | **50+** | - |


### Backend (Python)

| Script | Linhas | Funções | Descrição |
|--------|--------|---------|-----------|
| generator.py | ~200 | 5 | Motor de geração |
| auto_generate_questions.py | ~150 | 6 | Balanceamento |
| translate_with_api.py | ~150 | 5 | Tradução |
| quick_generate.py | ~50 | 2 | Geração rápida |
| sanity_check.py | ~100 | 4 | Validação |
| aws_semantic_validator.py | ~100 | 3 | Validação semântica |
| duplicate_detector.py | ~80 | 3 | Detecção duplicatas |
| **TOTAL** | **~830** | **28** | - |

### Estilos (CSS)

| Arquivo | Linhas | Classes | Descrição |
|---------|--------|---------|-----------|
| style.css | ~600 | 50+ | Estilos customizados |
| Tailwind (CDN) | - | 1000+ | Framework CSS |

### HTML

| Arquivo | Linhas | Seções | Descrição |
|---------|--------|--------|-----------|
| index.html | 414 | 4 | Interface principal |

---

## 📚 Documentação

### Arquivos de Documentação

| Arquivo | Linhas | Palavras | Descrição |
|---------|--------|----------|-----------|
| README.md | ~500 | ~3500 | Documentação principal |
| CHANGELOG.md | ~200 | ~1500 | Registro de mudanças |
| analise-completa-projeto.md | ~400 | ~3000 | Análise técnica |
| resumo-executivo-v2.md | ~200 | ~1500 | Resumo executivo |
| guia-flashcards.md | ~150 | ~1000 | Guia flashcards |
| guia-inicio-rapido.md | ~100 | ~700 | Início rápido |
| metricas-projeto.md | ~100 | ~600 | Este arquivo |
| **TOTAL** | **~1650** | **~12000** | - |


---

## 🎨 Interface

### Componentes UI

| Componente | Quantidade | Descrição |
|------------|------------|-----------|
| Telas | 4 | Start, Quiz, Results, Flashcards |
| Botões | 20+ | Navegação e ações |
| Inputs | 10+ | Filtros e configurações |
| Cards | 5+ | Opções, histórico, insights |
| Modais | 0 | Sem modais (design limpo) |

### Temas

| Tema | Cores | Variáveis CSS |
|------|-------|---------------|
| Light | 10+ | 8 |
| Dark | 10+ | 8 |

### Responsividade

| Breakpoint | Largura | Otimizações |
|------------|---------|-------------|
| Mobile | ≤ 640px | Layout vertical, font reduzido |
| Tablet | 641-1024px | Layout intermediário |
| Desktop | ≥ 1025px | Layout completo com sidebar |

---

## 🚀 Performance

### Tamanhos de Arquivo

| Arquivo | Tamanho | Comprimido |
|---------|---------|------------|
| index.html | ~15KB | ~5KB |
| app.js | ~35KB | ~12KB |
| style.css | ~20KB | ~7KB |
| data/*.json | ~500KB | ~150KB |
| **TOTAL** | **~570KB** | **~174KB** |

### Métricas de Carregamento

| Métrica | Valor | Objetivo |
|---------|-------|----------|
| First Contentful Paint | < 1.5s | ✅ |
| Time to Interactive | < 3s | ✅ |
| Total Blocking Time | < 300ms | ✅ |
| Cumulative Layout Shift | < 0.1 | ✅ |


---

## 🤖 IA Generativa

### Motores Utilizados

| Motor | Modelo | Uso | Custo |
|-------|--------|-----|-------|
| Google Gemini | 2.5 Flash | Principal | Gratuito (quota) |
| Groq | Llama 3.3 70B | Fallback | Gratuito (quota) |

### Geração de Questões

| Métrica | Valor |
|---------|-------|
| Questões por lote | 10 |
| Tempo por lote | ~30s |
| Taxa de rejeição | ~10% |
| Retry máximo | 3 |

### Validações

| Validação | Tipo | Taxa de Rejeição |
|-----------|------|------------------|
| Português BR | Linguística | ~5% |
| Formato caso de uso | Semântica | ~3% |
| Opções curtas | Estrutural | ~2% |
| Duplicatas | Similaridade | ~1% |

---

## 🌐 Tradução

### Estatísticas

| Métrica | Valor |
|---------|-------|
| Termos preservados | 50+ |
| Questões traduzidas | 585 (3 certificações) |
| Tempo médio | 5-10 min por certificação |
| Taxa de erro | < 1% |

### Campos Traduzidos

| Campo | Traduzido | Preservado |
|-------|-----------|------------|
| question | ✅ | - |
| options | ✅ | - |
| explanation | ✅ | - |
| domain | - | ✅ |
| service | - | ✅ |
| difficulty | - | ✅ |


---

## 📱 PWA

### Características

| Característica | Status | Descrição |
|----------------|--------|-----------|
| Instalável | ✅ | Desktop e mobile |
| Offline | ✅ | 100% funcional |
| Service Worker | ✅ | Cache inteligente |
| Manifest | ✅ | Configurado |
| Ícones | ✅ | Múltiplos tamanhos |

### Cache

| Tipo | Estratégia | Tamanho |
|------|------------|---------|
| Assets estáticos | Cache-first | ~50KB |
| Dados JSON | Network-first | ~500KB |
| Imagens | Cache-first | ~10KB |

---

## 🎯 Uso e Engajamento

### Funcionalidades Mais Usadas (Estimado)

| Funcionalidade | Uso Estimado |
|----------------|--------------|
| Simulador | 90% |
| Flashcards | 60% |
| Relatórios | 80% |
| Histórico | 50% |
| Dark Mode | 40% |

### Certificações Mais Populares (Estimado)

| Certificação | Popularidade |
|--------------|--------------|
| CLF-C02 | 40% |
| SAA-C03 | 35% |
| DVA-C02 | 15% |
| AIF-C01 | 10% |

---

## 📊 Resumo Geral

### Totais do Projeto

| Categoria | Quantidade |
|-----------|------------|
| Linhas de código | ~2318 |
| Linhas de documentação | ~1650 |
| Arquivos de código | 12 |
| Arquivos de documentação | 11 |
| Questões no banco | 728 |
| Termos no glossário | 20 |
| Certificações suportadas | 4 |
| Idiomas suportados | 2 |
| Motores de IA | 2 |

---

**Documento gerado em**: 22 de Março de 2026  
**Versão do Projeto**: 2.0.0
