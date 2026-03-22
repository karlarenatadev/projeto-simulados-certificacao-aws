# 🐍 Pipeline de Automação Python - AWS Simulator

## 📋 Visão Geral

Este diretório contém o pipeline completo de automação para geração e tradução de questões AWS usando IA Generativa (Google Gemini) e APIs de tradução.

**Funcionalidades principais**:
- 🤖 Geração automática de questões com IA
- 🌐 Tradução PT-BR → EN-US
- ✅ Validação de schema e semântica
- 🔍 Detecção de duplicatas
- 📊 Balanceamento de dificuldade

---

## 📂 Estrutura de Arquivos

```
scripts_python/
├── generator.py                    # Motor de geração com Gemini
├── sanity_check.py                 # Validação de schema
├── aws_semantic_validator.py       # Validação semântica AWS
├── duplicate_detector.py           # Detecção de duplicatas
├── auto_generate_questions.py      # Geração automática balanceada
├── quick_generate.py               # Geração rápida
├── translate_with_api.py           # Tradução com Google Translate
├── translate_aws_questions.py      # Tradução baseada em padrões
├── pipeline_runner.py              # Orquestrador do pipeline
├── requirements.txt                # Dependências Python
└── README.md                       # Este arquivo
```

---

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
pip install -r scripts_python/requirements.txt
```

**Dependências principais**:
- `google-genai` - API do Google Gemini
- `pydantic` - Validação de schema
- `deep-translator` - Tradução automática
- `python-dotenv` - Gerenciamento de variáveis de ambiente

### 2. Configurar API Key

Crie um arquivo `.env` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_aqui
```

**Obter chave gratuita**: https://aistudio.google.com/app/apikey

### 3. Gerar Questões

```bash
# Balancear automaticamente uma certificação
python scripts_python/auto_generate_questions.py clf-c02

# Gerar quantidade específica
python scripts_python/quick_generate.py clf-c02 easy 10
```

### 4. Traduzir para Inglês

```bash
# Traduzir uma certificação
python scripts_python/translate_with_api.py clf-c02

# Traduzir todas
python scripts_python/translate_with_api.py all
```

---

## 🤖 PARTE 1: Geração de Questões

### 📊 Distribuição Ideal por Certificação

| Certificação | Fácil | Intermediário | Difícil | Total |
|--------------|-------|---------------|---------|-------|
| **CLF-C02** | 60 | 70 | 60 | 190 |
| **SAA-C03** | 60 | 64 | 60 | 184 |
| **DVA-C02** | 30 | 40 | 30 | 100 |
| **AIF-C01** | 40 | 50 | 28 | 118 |

### 🛠️ Scripts de Geração

#### 1. `auto_generate_questions.py` (RECOMENDADO)

**Geração automática com balanceamento inteligente**

```bash
# Balancear uma certificação específica
python scripts_python/auto_generate_questions.py clf-c02

# Balancear todas as certificações
python scripts_python/auto_generate_questions.py all
```

**Características**:
- ✅ Analisa distribuição atual automaticamente
- ✅ Calcula quantas questões faltam por nível
- ✅ Gera automaticamente para balancear
- ✅ Pede confirmação antes de gerar
- ✅ Mostra progresso em tempo real
- ✅ Retry automático em caso de erro

**Exemplo de uso**:
```bash
$ python scripts_python/auto_generate_questions.py clf-c02

======================================================================
📊 ANÁLISE: CLF-C02
======================================================================

📈 Distribuição Atual:
   Fácil:          0 /  60 (faltam 60)
   Intermediário: 190 /  70 (faltam 0)
   Difícil:        0 /  60 (faltam 60)
   Total:        190 / 190

🎯 Necessário gerar: 120 questões

❓ Deseja gerar 120 questões para CLF-C02? (s/n): s

======================================================================
🎯 Gerando 60 questões de nível 'easy' para CLF-C02
======================================================================

📦 Lote 1/6: 10 questões...
✅ Geradas: 10 questões
📊 Progresso: 10/60
...
```

#### 2. `quick_generate.py`

**Geração rápida sem confirmação**

```bash
# Sintaxe: quick_generate.py <cert_id> <difficulty> <quantity>

# Gerar 10 questões fáceis para CLF-C02
python scripts_python/quick_generate.py clf-c02 easy 10

# Gerar 5 questões difíceis para SAA-C03
python scripts_python/quick_generate.py saa-c03 hard 5

# Gerar 15 questões médias para DVA-C02
python scripts_python/quick_generate.py dva-c02 medium 15
```

**Características**:
- ⚡ Geração rápida (sem confirmação)
- ✅ Ideal para testes e ajustes
- ✅ Controle preciso de quantidade
- ✅ Mostra distribuição atualizada

#### 3. `generator.py`

**Motor de geração (usado pelos outros scripts)**

```python
from generator import fabricar_questoes

# Gerar 5 questões difíceis para CLF-C02
questions = fabricar_questoes("clf-c02", "hard", 5)
```

**Características**:
- 🤖 Usa Google Gemini 2.5 Flash
- ✅ Validação automática de português brasileiro
- ✅ Schema Pydantic para garantir qualidade
- ✅ Retry automático em caso de quota
- ✅ Prompt engineering otimizado

### 📝 Formato das Questões Geradas

```json
{
  "domain": "conceitos-cloud",
  "subdomain": "beneficios-da-nuvem",
  "service": "AWS Cloud",
  "difficulty": "easy",
  "type": "scenario",
  "tags": ["cloud", "beneficios", "escalabilidade"],
  "question": "Uma startup de tecnologia está crescendo rapidamente...",
  "options": [
    "Amazon EC2",
    "AWS Lambda",
    "Amazon S3",
    "Amazon RDS"
  ],
  "correct": 0,
  "explanation": "O Amazon EC2 é ideal porque..."
}
```

### ✅ Validações Automáticas

#### 1. **Português Brasileiro** (`generator.py`)
- ✅ Termos corretos: "armazenamento", "gerenciar", "tela"
- ❌ Termos proibidos: "guardrails", "output", "ecrã"

#### 2. **Formato de Caso de Uso** (`aws_semantic_validator.py`)
- ✅ Sempre inicia com cenário de negócio
- ❌ Nunca pergunta definições diretas ("O que é...?")

#### 3. **Opções Curtas** (`sanity_check.py`)
- ✅ Apenas nomes de serviços: "Amazon S3"
- ❌ Nunca frases longas nas opções

#### 4. **Detecção de Duplicatas** (`duplicate_detector.py`)
- ✅ Similaridade < 85% com questões existentes
- ✅ Usa SequenceMatcher do Python

### ⚡ Performance e Limites

**Geração em Lotes**:
- Lotes de 10 questões por vez
- Tempo médio: ~30 segundos por lote
- 60 questões ≈ 3-5 minutos

**Limites da API**:
- Google Gemini Free: 15 requisições/minuto
- Retry automático até 3 tentativas
- Aguarda automaticamente se atingir limite

---

## 🌐 PARTE 2: Tradução de Questões

### 🛠️ Scripts de Tradução

#### 1. `translate_with_api.py` (RECOMENDADO)

**Tradução profissional usando Google Translate**

```bash
# Instalar dependência
pip install deep-translator

# Traduzir um arquivo específico
python scripts_python/translate_with_api.py clf-c02

# Traduzir todos os arquivos
python scripts_python/translate_with_api.py all
```

**Características**:
- ✅ Tradução completa e profissional
- ✅ Preserva termos técnicos AWS automaticamente
- ✅ Usa Google Translate (gratuito)
- ⚠️ Pode levar alguns minutos (190 questões ≈ 5-10 minutos)

#### 2. `translate_aws_questions.py`

**Tradução baseada em padrões (rápida mas limitada)**

```bash
# Traduzir um arquivo
python scripts_python/translate_aws_questions.py clf-c02

# Traduzir todos
python scripts_python/translate_aws_questions.py all
```

**Características**:
- ✅ Muito rápido (segundos)
- ⚠️ Tradução parcial (baseada em padrões)
- ⚠️ Pode deixar partes em português

### 📁 Arquivos de Tradução

| Arquivo Original | Arquivo Traduzido | Status |
|-----------------|-------------------|--------|
| `clf-c02.json` | `clf-c02-en.json` | ✅ Disponível |
| `saa-c03.json` | `saa-c03-en.json` | ✅ Disponível |
| `dva-c02.json` | `dva-c02-en.json` | ✅ Disponível |
| `aif-c01.json` | `aif-c01-en.json` | 🚧 Pendente |

### 🔧 Campos Traduzidos vs Preservados

**✅ Campos Traduzidos**:
- `question` - Pergunta principal
- `options` - Array de opções de resposta
- `explanation` - Explicação da resposta correta

**🔒 Campos Preservados** (não alterados):
- `domain`, `subdomain`, `service`
- `difficulty` (`easy`, `medium`, `hard`)
- `type`, `tags`
- `correct` (índice da resposta)
- `reference_url`

### 🎯 Termos Técnicos Preservados

Termos AWS automaticamente preservados:
- **Serviços**: EC2, S3, RDS, Lambda, VPC, IAM, CloudFront, etc.
- **Conceitos**: Security Group, S3 Bucket, IAM Role, Auto Scaling, etc.
- **Tipos**: On-Demand, Reserved Instance, Spot Instance, etc.
- **Tecnologias**: SQL, NoSQL, DDoS, XSS, HTML, CSS, JavaScript, etc.

### 📊 Exemplo de Tradução

**Antes (PT-BR)**:
```json
{
  "question": "Uma startup de software está lançando seu primeiro produto...",
  "options": ["Instâncias Sob Demanda", "Instâncias Reservadas"],
  "explanation": "As Instâncias Sob Demanda são ideais para..."
}
```

**Depois (EN-US)**:
```json
{
  "question": "A software startup is launching its first product...",
  "options": ["On-Demand Instances", "Reserved Instances"],
  "explanation": "On-Demand Instances are ideal for..."
}
```

---

## 🔄 Workflow Completo

### Cenário 1: Balancear CLF-C02

```bash
# 1. Analisar situação atual
python scripts_python/auto_generate_questions.py clf-c02

# 2. Confirmar geração (s/n)
# O script gerará automaticamente as questões faltantes

# 3. Aguardar conclusão (10-20 minutos)

# 4. Validar resultado
python -c "import json; from collections import Counter; data=json.load(open('data/clf-c02.json')); print(Counter(q['difficulty'] for q in data))"

# 5. Traduzir para inglês
python scripts_python/translate_with_api.py clf-c02

# 6. Testar na aplicação
# Abrir index.html no navegador
```

### Cenário 2: Gerar Questões Específicas

```bash
# 1. Gerar 10 questões fáceis rapidamente
python scripts_python/quick_generate.py clf-c02 easy 10

# 2. Verificar resultado
python -c "import json; print(f'Total: {len(json.load(open(\"data/clf-c02.json\")))}')"

# 3. Validar JSON
python -m json.tool data/clf-c02.json > /dev/null && echo "✅ JSON válido"
```

### Cenário 3: Traduzir Todas as Certificações

```bash
# 1. Traduzir todos os arquivos
python scripts_python/translate_with_api.py all

# 2. Validar traduções
for cert in clf-c02 saa-c03 dva-c02 aif-c01; do
    python -m json.tool data/${cert}-en.json > /dev/null && echo "✅ ${cert}-en.json válido"
done

# 3. Testar alternância de idioma na aplicação
```

---

## 🐛 Solução de Problemas

### Erro: "GEMINI_API_KEY não encontrada"
```bash
# Criar arquivo .env na raiz
echo "GEMINI_API_KEY=sua_chave_aqui" > .env
```

### Erro: "RESOURCE_EXHAUSTED" ou "429"
- **Causa**: Limite de quota da API atingido
- **Solução**: O script aguarda automaticamente 30-60 segundos
- **Alternativa**: Aguardar alguns minutos e tentar novamente

### Questões com termos em inglês
- O script valida automaticamente
- Questões inválidas são rejeitadas
- Apenas questões em português brasileiro são salvas

### JSON corrompido
```bash
# Validar JSON
python -m json.tool data/clf-c02.json > /dev/null && echo "✅ JSON válido"

# Se corrompido, restaurar backup
cp data/backups/clf-c02_backup_pt.json data/clf-c02.json
```

### Tradução muito lenta
- Normal para arquivos grandes (190 questões ≈ 5-10 minutos)
- O script adiciona delay de 0.1s entre traduções
- Deixe o processo rodar em background

---

## 📊 Comandos Úteis

### Verificar Distribuição de Dificuldade

```bash
# Uma certificação específica
python -c "
import json
from collections import Counter

cert_id = 'clf-c02'
data = json.load(open(f'data/{cert_id}.json'))
dist = Counter(q['difficulty'] for q in data)

print(f'📊 {cert_id.upper()}')
print(f'   Fácil:        {dist.get(\"easy\", 0)}')
print(f'   Intermediário: {dist.get(\"medium\", 0)}')
print(f'   Difícil:      {dist.get(\"hard\", 0)}')
print(f'   Total:        {len(data)}')
"
```

### Verificar Todas as Certificações

```bash
for cert in clf-c02 saa-c03 dva-c02 aif-c01; do
    python -c "
import json
from collections import Counter
data = json.load(open('data/$cert.json'))
dist = Counter(q['difficulty'] for q in data)
print(f'$cert: E={dist.get(\"easy\",0)} M={dist.get(\"medium\",0)} H={dist.get(\"hard\",0)} T={len(data)}')
"
done
```

### Fazer Backup

```bash
# Backup com timestamp
cp data/clf-c02.json data/backups/clf-c02_backup_$(date +%Y%m%d_%H%M%S).json
```

---

## ✅ Checklist de Uso

### Geração de Questões
- [ ] Configurar `.env` com GEMINI_API_KEY
- [ ] Instalar dependências (`pip install -r requirements.txt`)
- [ ] Fazer backup dos arquivos atuais
- [ ] Gerar questões com `auto_generate_questions.py`
- [ ] Validar JSON gerado
- [ ] Verificar qualidade das questões
- [ ] Testar na aplicação

### Tradução
- [ ] Instalar `deep-translator`
- [ ] Traduzir com `translate_with_api.py`
- [ ] Validar JSON traduzido
- [ ] Testar alternância de idioma na aplicação
- [ ] Fazer commit das alterações

---

## 📞 Suporte

Se encontrar problemas:
1. Verificar se `.env` está configurado
2. Validar JSON com `python -m json.tool`
3. Verificar logs de erro
4. Tentar com quantidade menor primeiro
5. Consultar a documentação completa em `/docs`

---

## 🎉 Exemplo Completo

```bash
# 1. Verificar situação atual
python -c "import json; from collections import Counter; data=json.load(open('data/clf-c02.json')); print(Counter(q['difficulty'] for q in data))"

# 2. Gerar 10 questões fáceis para teste
python scripts_python/quick_generate.py clf-c02 easy 10

# 3. Verificar se funcionou
python -c "import json; from collections import Counter; data=json.load(open('data/clf-c02.json')); print(Counter(q['difficulty'] for q in data))"

# 4. Se OK, gerar o restante
python scripts_python/auto_generate_questions.py clf-c02

# 5. Traduzir para inglês
python scripts_python/translate_with_api.py clf-c02

# 6. Validar tudo
python -m json.tool data/clf-c02.json > /dev/null && echo "✅ PT válido"
python -m json.tool data/clf-c02-en.json > /dev/null && echo "✅ EN válido"

# 7. Testar na aplicação
# Abrir index.html no navegador
```

---

**Pipeline de automação pronto para uso!** 🚀
