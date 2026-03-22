# 📝 Changelog - Simulador AWS

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2026-03-22

### 🎉 Adicionado

#### Funcionalidades Principais
- **Suporte a Questões de Múltipla Resposta**: Motor de quiz agora suporta questões "Escolha 2" ou "Escolha 3", idênticas aos exames oficiais AWS
- **Modo Flashcards 3D**: Sistema de revisão rápida com 20 termos AWS essenciais e efeito 3D de flip com perspectiva de 1000px
- **Escala Oficial AWS**: Pontuação convertida para escala 100-1000 pontos (conversão: `(percentage / 100) * 900 + 100`)
- **Selo de Aprovação**: Badge visual verde (≥ 700) ou laranja (< 700) na tela de resultados
- **Fallback de IA**: Sistema Groq (Llama 3.3 70B) como backup quando quota do Gemini esgota

#### Conteúdo
- 5 novas questões de múltipla resposta para CLF-C02 (AWS Artifact, Config, Trusted Advisor, Shield/WAF, Route 53)
- 5 novas questões de múltipla resposta para AIF-C01 (Bedrock, SageMaker Clarify, RAG, KMS/Macie, SageMaker)
- Glossário com 20 termos AWS essenciais (ACM, AMI, ASG, AZ, Artifact, Config, GuardDuty, KMS, Route 53, Shield, WAF, Trusted Advisor, CloudWatch, IAM, S3, Lambda, VPC, RDS, CloudFormation, CloudFront)

#### Documentação
- `docs/analise-completa-projeto.md` - Análise técnica detalhada do projeto completo
- `docs/resumo-executivo-v2.md` - Resumo executivo atualizado para v2.0
- `docs/atualizacoes-implementadas.md` - Documentação completa das mudanças
- `docs/guia-flashcards.md` - Guia de uso do modo flashcards
- `docs/checklist-validacao.md` - Checklist de testes
- `docs/instrucoes-deploy.md` - Instruções de deploy
- `CHANGELOG.md` - Este arquivo
- `test-validation.html` - Página de testes automatizados

### 🔧 Modificado

#### Motor de Quiz (js/quizEngine.js)
- Método `submitAnswer` agora detecta automaticamente se a questão é de escolha única ou múltipla
- Implementada lógica de comparação de arrays ordenados para validação de múltiplas respostas
- Mantida compatibilidade total com questões de escolha única existentes

#### Interface do Usuário (app.js)
- Função `loadQuestionUI` agora exibe aviso "(Escolha X)" para questões de múltipla resposta
- Função `renderOptionsUI` permite seleção múltipla com limite baseado no número de respostas corretas
- Função `submitAnswer` aplica feedback visual diferenciado para cada opção (verde/vermelho)
- Função `displayReportFromResult` adiciona selo de aprovação/revisão dinamicamente
- Adicionadas funções de controle de flashcards: `startFlashcards`, `flipFlashcard`, `nextFlashcard`, `prevFlashcard`

#### Configuração (data.js)
- Peso do Domínio 5 do AIF-C01 corrigido de 12% para 14%
- Adicionado objeto `glossaryTerms` com 20 termos AWS
- Exportação do glossário para uso no modo flashcards

#### Interface HTML (index.html)
- Adicionada seção `screen-flashcards` com estrutura de cartões 3D
- Adicionado botão "Modo Flashcards" na tela inicial
- Estrutura de cartão com frente (termo) e verso (definição)
- Botões de navegação (anterior/próximo) e contador de progresso

#### Estilos (style.css)
- Adicionados estilos para flashcards com efeito 3D
- Animação de flip com `transform: rotateY(180deg)`
- Perspectiva de 1000px para profundidade
- Transição suave de 0.6s
- Estilos responsivos para mobile
- Compatibilidade com dark mode

#### Documentação (README.md)
- Atualizada seção "Funcionalidades Premium" com novas features
- Adicionada seção "Atualização Março 2026" no topo das atualizações
- Atualizada estrutura do projeto com novos arquivos
- Atualizada contagem de questões (CLF-C02: 195, AIF-C01: 143)

### 🐛 Corrigido

- Peso incorreto do Domínio 5 do AIF-C01 (era 12%, agora 14%)
- Falta de suporte para questões de múltipla resposta
- Ausência de escala oficial AWS (100-1000)
- Falta de feedback visual claro sobre aprovação/reprovação

### 🔒 Segurança

- Validação de sintaxe JSON para todos os arquivos de dados
- Verificação de integridade de arrays em questões de múltipla resposta
- Sanitização de entrada do usuário em seleções múltiplas

### 📊 Métricas

- Total de questões: 728 (antes: 718)
- Questões de múltipla resposta: 10 (novo)
- Termos no glossário: 20 (novo)
- Arquivos modificados: 7 (app.js, quizEngine.js, data.js, index.html, style.css, README.md, CHANGELOG.md)
- Arquivos criados: 8 (7 documentos + test-validation.html)
- Linhas de código adicionadas: ~800
- Linhas de documentação adicionadas: ~2500
- Scripts Python: 7 (auto_generate, quick_generate, translate_with_api, generator, sanity_check, aws_semantic_validator, duplicate_detector)
- Motores de IA: 2 (Gemini 2.5 Flash + Groq Llama 3.3 70B)

---

## [1.3.0] - 2026-03-15

### 🎉 Adicionado

- Sistema de recomendação para múltiplos domínios fracos
- Mensagens personalizadas baseadas na quantidade de domínios com desempenho < 70%
- Compatibilidade com relatórios históricos (cálculo on-the-fly)

### 🔧 Modificado

- Função `getFinalResults` agora identifica todos os domínios fracos
- Função `displayReportFromResult` exibe recomendações personalizadas

---

## [1.2.0] - 2026-03-10

### 🎉 Adicionado

- Validação semântica aprimorada que rejeita questões diretas de definição
- Prompt de geração otimizado com exemplos explícitos
- Garantia de que todas as questões apresentam casos de uso reais

### 🔧 Modificado

- `aws_semantic_validator.py` com novas regras de validação
- `generator.py` com prompt aprimorado

---

## [1.1.0] - 2026-03-05

### 🎉 Adicionado

- Certificação AIF-C01 atualizada de 4 para 5 domínios oficiais
- Domínio 5: Segurança, Conformidade e Governança (14%)
- Migração automática de 138 questões existentes

### 🔧 Modificado

- `data.js` com nova estrutura de domínios do AIF-C01
- `fix_all_data.py` para migração de dados

---

## [1.0.0] - 2026-03-01

### 🎉 Adicionado

- Módulo `storageManager.js` para gerenciamento de persistência
- API limpa e documentada com JSDoc completo
- Métodos para gerenciamento de resultados, histórico e gamificação
- Suporte a exportação/importação de dados

### 🔧 Modificado

- `app.js` refatorado para usar `storageManager`
- Remoção de código duplicado de localStorage

---

## [0.9.0] - 2026-02-20

### 🎉 Lançamento Inicial

- Simulador de certificações AWS com 4 certificações
- Motor de quiz com lógica de negócio pura
- Gráficos radar de desempenho
- Sistema de gamificação (streaks e badges)
- PWA com suporte offline
- Dark mode
- Internacionalização (PT-BR e EN-US)
- Pipeline Python para geração de questões com IA
- Validação semântica e de schema
- Detecção de duplicatas

---

## Tipos de Mudanças

- `🎉 Adicionado` - para novas funcionalidades
- `🔧 Modificado` - para mudanças em funcionalidades existentes
- `🗑️ Removido` - para funcionalidades removidas
- `🐛 Corrigido` - para correção de bugs
- `🔒 Segurança` - para correções de vulnerabilidades
- `📊 Métricas` - para estatísticas e números

---

## Links

- [Repositório GitHub](https://github.com/karlarenatadev/projeto-simulados-certificacao-aws)
- [Demo Online](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/)
- [Documentação](./README.md)
- [Guia de Contribuição](./CONTRIBUTING.md) *(em breve)*

---

## Roadmap

### v2.1.0 (Planejado - Abril 2026)
- [ ] Arquivos `-en.json` para AIF-C01
- [ ] Mais 10 questões de múltipla resposta
- [ ] Expansão do glossário para 30 termos
- [ ] Estatísticas de uso de flashcards

### v2.2.0 (Planejado - Maio 2026)
- [ ] Sistema de marcação de flashcards "dominados"
- [ ] Modo quiz com termos do glossário
- [ ] Exportação de flashcards para Anki
- [ ] Google Analytics integrado

### v3.0.0 (Planejado - Junho 2026)
- [ ] Flashcards específicos por certificação
- [ ] Modo de estudo com repetição espaçada
- [ ] Aplicativo mobile nativo
- [ ] Backend com Node.js e MongoDB

---

**Mantenha-se atualizado**: Assine as [releases do GitHub](https://github.com/karlarenatadev/projeto-simulados-certificacao-aws/releases) para receber notificações de novas versões!
