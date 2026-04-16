# Contribuindo com o Cloud Certification Study Tool - By Guilda

Primeiramente, obrigado pelo interesse em contribuir! 🎉 
Este projeto é um laboratório colaborativo da nossa Guilda para aprendermos Cloud, Dados, UX e Desenvolvimento de Software na prática.

## � Pré-Requisitos

Antes de começar, certifique-se de que seu ambiente está configurado:

### Dependências Obrigatórias
- **Git** - para controle de versão
- **Python 3.12+** - para scripts de geração e validação de questões
- **Node.js 18+** - para dependências JavaScript e testes
- **npm** - gerenciador de pacotes JavaScript

### Variáveis de Ambiente
1. Crie um arquivo `.env` na raiz do projeto (copie de `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Configure suas chaves de API:
   - `GOOGLE_API_KEY` - obtenha em [Google AI Studio](https://aistudio.google.com/app/apikey)
   - `GROQ_API_KEY` - obtenha em [Groq Console](https://console.groq.com/keys)

> ⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` com suas chaves reais. Use `.env.example` como template.

## 🚀 Setup Inicial

### 1. Clone o repositório
```bash
git clone <link-do-seu-fork>
cd projeto-simulados-certificacao-aws
```

### 2. Instale dependências JavaScript
```bash
npm install
```

### 3. Instale dependências Python
```bash
pip install -r scripts_python/requirements.txt
```

### 4. Configure variáveis de ambiente (veja seção acima)

## ✅ Validação do Setup

Para verificar se tudo está funcionando:
```bash
# Teste JavaScript
npm test

# Teste Python básico
python scripts_python/sanity_check.py
```

---

## �🛠 Como contribuir

1. Faça o **Fork** deste repositório.
2. Clone o seu fork para a sua máquina local: `git clone <link-do-seu-fork>`
3. Crie uma branch para a sua alteração:
   `git checkout -b feature/minha-nova-funcionalidade` ou `git checkout -b fix/correcao-bug`
4. Faça suas alterações e commit: `git commit -m "feat: adiciona 10 novas perguntas de SAA"`
5. Envie para o seu fork: `git push origin feature/minha-nova-funcionalidade`
6. Abra um **Pull Request (PR)** neste repositório.

## 🤝 Áreas de Contribuição

Você pode escolher a área que mais se alinha com seus objetivos de estudo:

### ☁️ Contribuir com Questões (NOVO FLUXO!)

**⚠️ IMPORTANTE**: Não edite mais os arquivos principais (`clf-c02.json`, `saa-c03.json`, etc.)!

Agora usamos um **sistema modular** que evita conflitos de merge:

#### Passo 1: Crie sua questão individual

```bash
# Copie o template
cp data/contributions/_TEMPLATE.json data/contributions/clf-c02/questao-s3-versionamento.json

# Ou para questões de múltipla resposta
cp data/contributions/_TEMPLATE_MULTIPLE_ANSWER.json data/contributions/clf-c02/questao-ec2-tipos.json
```

#### Passo 2: Preencha sua questão

Edite o arquivo JSON com sua questão. Exemplo:

```json
{
  "domain": "tecnologia",
  "subdomain": "armazenamento",
  "service": "Amazon S3",
  "difficulty": "medium",
  "type": "multiple-choice",
  "tags": ["s3", "versionamento", "backup"],
  "question": "Uma empresa precisa proteger dados contra exclusões acidentais...",
  "options": [
    "Habilitar versionamento no S3",
    "Usar apenas backups manuais",
    "Desabilitar todas as permissões",
    "Criar múltiplas contas AWS"
  ],
  "correct": 0,
  "explanation": "O versionamento do S3 mantém múltiplas versões...",
  "reference": "https://docs.aws.amazon.com/s3/",
  "contributor": {
    "name": "Seu Nome",
    "github": "seu-usuario",
    "date": "2026-03-24"
  }
}
```

#### Passo 3: Valide sua questão

```bash
# Valide sua questão antes de submeter
python scripts_python/validate_contribution.py data/contributions/clf-c02/questao-s3-versionamento.json
```

O validador verificará:
- ✅ Estrutura JSON correta
- ✅ Campos obrigatórios preenchidos
- ✅ Tipo de certificação válida
- ✅ Semântica AWS (evita pegadinhas fracas)

Se houver erros, o validador exibirá mensagens explicativas. Corrija os erros e rode novamente.

#### Passo 4: Teste localmente (opcional mas recomendado)

Para testar sua questão no app antes de submeter:

1. Copie o JSON para a pasta de testes:
   ```bash
   cp data/contributions/clf-c02/questao-s3-versionamento.json data/
   ```

2. Abra `index.html` no navegador ou rode um servidor local:

#### 🧪 Testes Automatizados

Quando você abre um PR:
1. **GitHub Actions** roda validações automáticas:
   - Valida a estrutura JSON
   - Verifica se não há edições dos arquivos principais
   - Executa testes Python
   - Análise semântica de qualidade

2. Se alguma validação falhar, você verá no PR e pode corrigir
   ```bash
   npx http-server
   ```

3. Selecione a certificação e teste sua questão

4. Desfaça a cópia antes de fazer commit (não copie para `data/`)

#### Passo 5: Faça o Pull Request

Seu PR conterá apenas **1 arquivo novo**, evitando conflitos com outras contribuições!

```bash
git add data/contributions/clf-c02/questao-s3-versionamento.json
git commit -m "feat(clf-c02): adiciona questão sobre versionamento S3"
git push origin feature/questao-s3-versionamento
```

#### Como funciona o merge?

Os mantenedores executarão periodicamente:

```bash
python scripts_python/merge_contributions.py clf-c02
```

Isso consolidará todas as contribuições validadas no arquivo principal automaticamente!

### 💻 Desenvolvimento Web (`/js` e `/index.html`)

Criar novas funcionalidades, melhorar o motor do quiz (`quizEngine.js`) ou implementar PWA (`sw.js`).

### 🎨 UX / UI (`style.css`)

Melhorar a interface, responsividade, acessibilidade e experiência visual.

### 🐍 Automação (`/scripts_python`)

Melhorar nossos scripts de geração, tradução e validação de perguntas via IA.

### 📚 Documentação (`/docs`)

Melhorar nossos guias e tutoriais.

## 🏷️ Encontrando Tarefas para Contribuir

Na aba **[Issues](https://github.com/karlarenatadev/projeto-simulados-certificacao-aws/issues)**, procure por:

| Label | Significado |
|-------|-------------|
| `good-first-issue` | Perfeito para começar! Tarefas pequenas e bem documentadas |
| `help-wanted` | Precisamos de ajuda! Tarefas variadas com diferentes níveis |
| `bug` | Bug encontrado que precisa ser corrigido |
| `enhancement` | Novas funcionalidades ou melhorias |
| `documentation` | Melhorias na documentação |

## 🚦 Boas Práticas

- **Procure por Issues**: Consulte a aba **Issues** e escolha uma etiquetada com `good-first-issue` ou `help-wanted`.
- **Antes de grandes mudanças**: Abra uma Issue para discutirmos a abordagem antes de começar!
- **Use o fluxo modular**: Para questões, sempre use a pasta `data/contributions/` (não edite `data/*.json` diretamente)
- **Valide antes de submeter**: Execute o validador para questões e testes para código
- **Siga os templates**: Mantenha consistência usando os templates fornecidos
- **Commits descritivos**: Use o padrão: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

## 🧪 Testando suas Contribuições

### Para Questões
```bash
# Validar estrutura e semântica
python scripts_python/validate_contribution.py data/contributions/clf-c02/sua-questao.json
```

### Para Código JavaScript
```bash
# Rodar testes unitários
npm test

# Testar no navegador (local server)
npx http-server
```

### Para Scripts Python
```bash
# Rodar validação geral
python scripts_python/sanity_check.py

# Testar um script específico
python scripts_python/seu_script.py
```

---

## ❓ FAQ / Troubleshooting

### Validador retorna erro de JSON
**Solução**: Use um validador JSON online ou seu editor. Verifique:
- Aspas duplas (não simples)
- Vírgulas entre elementos
- Sem vírgula após último elemento

### API Key inválida ao rodar scripts
**Solução**: 
1. Verifique o arquivo `.env` existe e está preenchido
2. Confirme que sua chave de API é válida
3. Certifique-se de que copiou a chave inteira (sem espaços extras)

### `ModuleNotFoundError: No module named 'pydantic'`
**Solução**: Instale as dependências:
```bash
pip install -r scripts_python/requirements.txt
```

### Testes npm falhando
**Solução**:
1. Limpe cache: `npm cache clean --force`
2. Reinstale: `rm -rf node_modules && npm install`
3. Rode novamente: `npm test`

### Meu PR foi rejeitado porque editei arquivos `.json` principais
**Solução**: Use o fluxo modular! Seu arquivo deve estar em:
```
data/contributions/CERTIFICACAO/meu-arquivo.json
```
Não em:
```
data/clf-c02.json  ❌ (não faça isso!)
```

### Como resetar meu ambiente local?
```bash
# Limpe dependências
rm -rf node_modules
pip uninstall -r scripts_python/requirements.txt -y

# Reinstale do zero
npm install
pip install -r scripts_python/requirements.txt
```

---

## 📋 Checklist para PRs de Questões

Use o template automático que aparecerá ao abrir seu PR. Ele inclui:
- [ ] Usei o template correto (`_TEMPLATE.json` ou `_TEMPLATE_MULTIPLE_ANSWER.json`)
- [ ] Executei o validador e corrigi todos os erros
- [ ] Preenchi as informações do contribuidor
- [ ] Adicionei referência para documentação oficial AWS
- [ ] Testei a questão localmente (se possível)
- [ ] Criei apenas 1 arquivo por PR (ou no máximo 3 questões relacionadas)