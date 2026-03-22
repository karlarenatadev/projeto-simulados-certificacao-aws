# ☁️ AWS Certification Simulator

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3670A0?style=flat&logo=python)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat&logo=google&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-000?style=flat&logo=progressive-web-apps)

> **Simulador profissional de certificações AWS** com suporte a 4 certificações oficiais, questões de múltipla resposta, modo flashcards e geração automática de conteúdo via IA Generativa (Google Gemini).

---

## 🎯 Descrição

Plataforma completa de preparação para exames de certificação AWS que combina:

- **Simulador de Exames Realista**: Questões no formato oficial AWS, incluindo múltipla resposta ("Escolha 2" ou "Escolha 3")
- **IA Generativa**: Pipeline Python automatizado que gera questões inéditas usando Google Gemini 2.5 Flash
- **Modo Flashcards**: Sistema de revisão rápida com 20 termos AWS essenciais e efeito 3D
- **Escala Oficial AWS**: Pontuação convertida para escala 100-1000 pontos com selo de aprovação
- **PWA Offline**: Funciona 100% offline após instalação, ideal para estudo em qualquer lugar

---

## ✨ Funcionalidades

### 🎓 Simulação de Exames
- ✅ **4 Certificações Oficiais**: CLF-C02, SAA-C03, AIF-C01, DVA-C02
- ✅ **Questões de Múltipla Resposta**: Suporte completo para "Escolha 2" ou "Escolha 3"
- ✅ **Modo Exame**: Timer em tempo real baseado nos exames oficiais AWS
- ✅ **Modo Revisão**: Estudo sem pressão de tempo com explicações imediatas
- ✅ **Escala Oficial**: Pontuação 100-1000 pontos (padrão AWS)
- ✅ **Selo de Aprovação**: Feedback visual (verde >= 700, laranja < 700)

### 📚 Modo Flashcards
- ✅ **20 Termos Essenciais**: ACM, AMI, ASG, AZ, Artifact, Config, GuardDuty, KMS, Route 53, Shield, WAF, Trusted Advisor, CloudWatch, IAM, S3, Lambda, VPC, RDS, CloudFormation, CloudFront
- ✅ **Efeito 3D**: Animação de flip ao clicar no cartão
- ✅ **Definições Oficiais**: Conteúdo alinhado com documentação AWS
- ✅ **Navegação Intuitiva**: Contador de progresso e botões anterior/próximo

### 🌍 Internacionalização
- ✅ **Português (PT-BR)**: Idioma padrão
- ✅ **Inglês (EN-US)**: Alternância em tempo real
- ✅ **Sincronização**: IDs de questões idênticos entre idiomas

### 📊 Análise de Desempenho
- ✅ **Desempenho por Domínio**: Análise detalhada seguindo pesos oficiais AWS
- ✅ **Relatórios Históricos**: Acompanhamento de evolução ao longo do tempo
- ✅ **Recomendações Inteligentes**: IA identifica domínios fracos e sugere estudos
- ✅ **Exportação PDF**: Relatórios profissionais para impressão

### 🎮 Gamificação
- ✅ **Sistema de Streaks**: Ofensivas de estudo diário
- ✅ **Badges de Conquista**: Medalhas virtuais por marcos alcançados
- ✅ **Persistência Local**: Progresso salvo no navegador

### 🎨 Interface Moderna
- ✅ **Design Responsivo**: Otimizado para desktop, tablet e mobile
- ✅ **Dark Mode**: Alternância automática ou manual
- ✅ **Tailwind CSS**: Interface moderna e profissional
- ✅ **Animações Suaves**: Transições e feedbacks visuais

---

## 🛠️ Tecnologias

### Frontend
- **JavaScript ES6+**: Módulos, Classes, Async/Await
- **Tailwind CSS**: Framework CSS utility-first
- **PWA**: Service Workers para funcionamento offline
- **LocalStorage API**: Persistência de dados no navegador

### Backend (Pipeline de Dados)
- **Python 3.12+**: Linguagem principal do pipeline
- **Google Gemini 2.5 Flash**: IA Generativa para criação de questões
- **Pydantic V2**: Validação de schema e tipagem
- **JSON**: Formato de armazenamento de dados

### Arquitetura
```
┌─────────────────────────────────────────┐
│         Frontend (ES6 Modules)          │
├─────────────────────────────────────────┤
│  app.js          │ UI Controller        │
│  quizEngine.js   │ Lógica de Negócio   │
│  data.js         │ Configuração + Dados │
│  storageManager  │ Persistência         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         Camada de Dados (JSON)          │
├─────────────────────────────────────────┤
│  clf-c02.json    │ 195 questões         │
│  aif-c01.json    │ 143 questões         │
│  saa-c03.json    │ 184 questões         │
│  dva-c02.json    │ 14 questões          │
└─────────────────────────────────────────┘
```

---

## 📖 Pesos Oficiais dos Domínios

O simulador respeita rigorosamente a distribuição de domínios oficial da AWS:

### CLF-C02 (Cloud Practitioner)
- **Domínio 1**: Conceitos de nuvem (24%)
- **Domínio 2**: Segurança e conformidade (30%)
- **Domínio 3**: Tecnologia e serviços de nuvem (34%)
- **Domínio 4**: Faturamento, definição de preço e suporte (12%)

### SAA-C03 (Solutions Architect Associate)
- **Domínio 1**: Design de arquiteturas seguras (30%)
- **Domínio 2**: Design de arquiteturas resilientes (26%)
- **Domínio 3**: Design de arquiteturas de alta performance (24%)
- **Domínio 4**: Design de arquiteturas com otimização de custos (20%)

### AIF-C01 (AI Practitioner)
- **Domínio 1**: Fundamentos de IA e ML (20%)
- **Domínio 2**: Fundamentos de IA Generativa (24%)
- **Domínio 3**: Aplicações de Modelos de Fundação (28%)
- **Domínio 4**: Diretrizes para IA Responsável (14%)
- **Domínio 5**: Segurança, Conformidade e Governança (14%)

### DVA-C02 (Developer Associate)
- **Domínio 1**: Desenvolvimento com Serviços AWS (32%)
- **Domínio 2**: Segurança (26%)
- **Domínio 3**: Implementação (Deployment) (24%)
- **Domínio 4**: Solução de problemas e otimização (18%)

---

## 🚀 Como Executar

### Pré-requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Python 3.12+ (apenas para geração de questões)

### Executar o Simulador (Frontend)

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/karlarenatadev/projeto-simulados-certificacao-aws.git
   cd projeto-simulados-certificacao-aws
   ```

2. **Inicie um servidor local**:
   ```bash
   # Opção 1: Python
   python -m http.server 8000
   
   # Opção 2: Node.js
   npx http-server -p 8000
   
   # Opção 3: VS Code Live Server
   # Clique com botão direito no index.html > "Open with Live Server"
   ```

3. **Acesse no navegador**:
   ```
   http://localhost:8000
   ```

### Gerar Novas Questões (Backend)

1. **Instale as dependências**:
   ```bash
   pip install google-genai pydantic python-dotenv
   ```

2. **Configure a API Key**:
   Crie um arquivo `.env` na raiz:
   ```env
   GEMINI_API_KEY=sua_chave_de_api_aqui
   ```

3. **Execute o pipeline**:
   ```bash
   python scripts_python/pipeline_runner.py
   ```

---

## 📂 Estrutura do Projeto

```
projeto-simulados-certificacao-aws/
├── 📂 js/                      # Módulos JavaScript
│   ├── app.js                  # Controller da UI
│   ├── quizEngine.js           # Lógica de negócio
│   ├── storageManager.js       # Persistência de dados
│   └── data.js                 # Configuração e glossário
├── 📂 data/                    # Banco de questões
│   ├── clf-c02.json            # Cloud Practitioner (195)
│   ├── clf-c02-en.json         # Cloud Practitioner (EN)
│   ├── aif-c01.json            # AI Practitioner (143)
│   ├── saa-c03.json            # Solutions Architect (184)
│   ├── saa-c03-en.json         # Solutions Architect (EN)
│   ├── dva-c02.json            # Developer Associate (14)
│   └── 📂 backups/             # Backups de dados
├── 📂 scripts_python/          # Pipeline de IA
│   ├── generator.py            # Geração via Gemini
│   ├── sanity_check.py         # Validação de schema
│   ├── aws_semantic_validator.py # Validação semântica
│   ├── duplicate_detector.py   # Detecção de duplicatas
│   └── pipeline_runner.py      # Orquestrador
├── index.html                  # Interface principal
├── style.css                   # Estilos customizados
├── sw.js                       # Service Worker (PWA)
├── manifest.json               # Manifesto PWA
└── README.md                   # Este arquivo
```

---

## 🎓 Certificações Suportadas

| Código | Nome | Questões | Status |
|--------|------|----------|--------|
| **CLF-C02** | AWS Certified Cloud Practitioner | 195 | ✅ Completo |
| **SAA-C03** | AWS Certified Solutions Architect Associate | 184 | ✅ Completo |
| **AIF-C01** | AWS Certified AI Practitioner | 143 | ✅ Completo |
| **DVA-C02** | AWS Certified Developer Associate | 14 | 🚧 Em desenvolvimento |

**Total**: 536 questões validadas

---

## 🌟 Diferenciais

### 1. Fidelidade aos Exames Oficiais
- Questões de múltipla resposta ("Escolha 2" ou "Escolha 3")
- Escala de pontuação oficial AWS (100-1000)
- Pesos de domínios conforme guias oficiais
- Timer baseado nos exames reais

### 2. IA Generativa Integrada
- Pipeline automatizado de geração de questões
- Validação semântica em 4 camadas
- Detecção de duplicatas por similaridade
- Garantia de qualidade e relevância

### 3. Modo Flashcards Único
- Único simulador com flashcards integrados
- 20 termos essenciais com definições oficiais
- Efeito 3D profissional
- Ideal para revisão rápida

### 4. Explicações Aprimoradas
- Justificativa da resposta correta
- Explicação do porquê os distratores não se aplicam
- Links para documentação oficial AWS
- Foco em aprendizado, não apenas memorização

### 5. PWA Completo
- Funciona 100% offline
- Instalável em desktop e mobile
- Atualizações automáticas
- Performance otimizada

---

## 📊 Estatísticas

- **536 questões** validadas e revisadas
- **10 questões** de múltipla resposta
- **20 termos** no glossário de flashcards
- **4 certificações** oficiais AWS
- **2 idiomas** (PT-BR e EN-US)
- **100% offline** após instalação
- **0 dependências** externas no frontend

---

## 🌐 Demo Online

Teste a plataforma ao vivo:

🔗 **[Acessar o AWS Cloud Simulator](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/)**

---

## 📚 Documentação Detalhada

Para informações técnicas aprofundadas, consulte:

- **[Guia de Geração de Questões](./docs/guia-geracao.md)** - Como gerar questões automaticamente com IA
- **[Status da Tradução](./docs/status-traducao.md)** - Progresso das traduções PT-BR → EN-US
- **[Resolução de Problemas Técnicos](./docs/resolucao-problemas.md)** - Soluções para problemas comuns
- **[Checklist de Validação](./docs/checklist-validacao.md)** - Lista de verificação para garantir qualidade
- **[Instruções de Deploy](./docs/instrucoes-deploy.md)** - Como publicar o simulador em produção
- **[Guia de Flashcards](./docs/guia-flashcards.md)** - Documentação do modo de revisão rápida
- **[Atualizações Implementadas](./docs/atualizacoes-implementadas.md)** - Histórico de melhorias e features
- **[Guia de Automação Python](./scripts_python/README.md)** - Pipeline completo de geração e tradução

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é **educacional** e destinado a fins de portfólio técnico. Desenvolvido por **Karla Renata A. Rosario**.

---

## 👩‍💻 Autora

**Karla Renata A. Rosario**

- 💼 [LinkedIn](https://www.linkedin.com/in/karlarenata-rosario/)
- 🐙 [GitHub](https://github.com/karlarenatadev)
- 🌐 [Portfolio](https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/)

---

## 🙏 Agradecimentos

- **AWS** pela documentação oficial e guias de estudo
- **Google** pelo acesso à API do Gemini
- **Comunidade Open Source** pelas ferramentas e bibliotecas

---

## 📈 Roadmap

### v2.1.0 (Próxima Release)
- [ ] Tradução completa para inglês (AIF-C01)
- [ ] Mais 20 questões de múltipla resposta
- [ ] Expansão do glossário para 40 termos
- [ ] Estatísticas de uso de flashcards

### v2.2.0 (Futuro)
- [ ] Sistema de marcação de flashcards "dominados"
- [ ] Modo quiz com termos do glossário
- [ ] Exportação de flashcards para Anki
- [ ] Integração com Google Analytics

### v3.0.0 (Visão de Longo Prazo)
- [ ] Backend com Node.js e MongoDB
- [ ] Sistema de autenticação de usuários
- [ ] Sincronização multi-dispositivo
- [ ] Aplicativo mobile nativo

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela no GitHub!**

[![GitHub stars](https://img.shields.io/github/stars/karlarenatadev/projeto-simulados-certificacao-aws?style=social)](https://github.com/karlarenatadev/projeto-simulados-certificacao-aws)

</div>

---

<div align="center">
  <sub>Desenvolvido com ❤️ por Karla Renata | © 2026</sub>
</div>
