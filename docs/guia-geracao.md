# 🤖 Guia Rápido: Gerar Questões Automaticamente

## 🎯 Objetivo

Balancear automaticamente os níveis de dificuldade em cada certificação AWS usando IA.

## 📊 Situação Atual vs Meta

### CLF-C02 (Cloud Practitioner)
| Nível | Atual | Meta | Faltam |
|-------|-------|------|--------|
| Fácil | 0 | 60 | **60** |
| Intermediário | 190 | 70 | 0 (excesso) |
| Difícil | 0 | 60 | **60** |

### SAA-C03 (Solutions Architect)
✅ **JÁ ESTÁ BALANCEADO** (60 easy, 64 medium, 60 hard)

### DVA-C02 (Developer Associate)
| Nível | Atual | Meta | Faltam |
|-------|-------|------|--------|
| Fácil | 3 | 30 | **27** |
| Intermediário | 7 | 40 | **33** |
| Difícil | 4 | 30 | **26** |

### AIF-C01 (AI Practitioner)
| Nível | Atual | Meta | Faltam |
|-------|-------|------|--------|
| Fácil | 0 | 40 | **40** |
| Intermediário | 118 | 50 | 0 (excesso) |
| Difícil | 0 | 28 | **28** |

---

## 🚀 Como Gerar Questões

### Opção 1: Geração Automática Completa (RECOMENDADO)

```bash
# Balancear CLF-C02 (gerará 60 easy + 60 hard)
python scripts_python/auto_generate_questions.py clf-c02

# Balancear TODAS as certificações
python scripts_python/auto_generate_questions.py all
```

**Tempo estimado:**
- CLF-C02: ~15-20 minutos (120 questões)
- DVA-C02: ~10-15 minutos (86 questões)
- AIF-C01: ~10-15 minutos (68 questões)
- **Total:** ~40-50 minutos

### Opção 2: Geração Rápida para Teste

```bash
# Gerar apenas 10 questões fáceis para CLF-C02
python scripts_python/quick_generate.py clf-c02 easy 10

# Gerar 5 questões difíceis para testar
python scripts_python/quick_generate.py clf-c02 hard 5
```

**Tempo estimado:** ~1-2 minutos

---

## 📋 Passo a Passo Completo

### 1. Preparação (5 minutos)

```bash
# 1.1. Verificar se tem API key configurada
cat .env | grep GEMINI_API_KEY

# Se não tiver, criar:
echo "GEMINI_API_KEY=sua_chave_aqui" > .env

# 1.2. Instalar dependências (se ainda não instalou)
pip install -r scripts_python/requirements.txt

# 1.3. Fazer backup dos arquivos atuais
cp data/clf-c02.json data/clf-c02_backup_$(date +%Y%m%d).json
cp data/dva-c02.json data/dva-c02_backup_$(date +%Y%m%d).json
cp data/aif-c01.json data/aif-c01_backup_$(date +%Y%m%d).json
```

### 2. Teste Rápido (2 minutos)

```bash
# Gerar 5 questões fáceis para testar
python scripts_python/quick_generate.py clf-c02 easy 5

# Verificar se funcionou
python -c "import json; data=json.load(open('data/clf-c02.json')); print(f'Total: {len(data)} questões')"

# Ver últimas 5 questões geradas
python -c "import json; data=json.load(open('data/clf-c02.json')); print(json.dumps(data[-5:], indent=2, ensure_ascii=False))"
```

### 3. Geração Completa (40-50 minutos)

```bash
# Opção A: Gerar para uma certificação específica
python scripts_python/auto_generate_questions.py clf-c02

# Opção B: Gerar para todas (recomendado fazer durante a noite)
python scripts_python/auto_generate_questions.py all
```

### 4. Validação (5 minutos)

```bash
# Verificar distribuição final
python -c "
import json
from collections import Counter

for cert in ['clf-c02', 'saa-c03', 'dva-c02', 'aif-c01']:
    data = json.load(open(f'data/{cert}.json'))
    dist = Counter(q['difficulty'] for q in data)
    print(f'{cert.upper()}: Easy={dist.get(\"easy\",0)} Medium={dist.get(\"medium\",0)} Hard={dist.get(\"hard\",0)} Total={len(data)}')
"

# Validar JSON
python -m json.tool data/clf-c02.json > /dev/null && echo "✅ CLF-C02 JSON válido"
python -m json.tool data/dva-c02.json > /dev/null && echo "✅ DVA-C02 JSON válido"
python -m json.tool data/aif-c01.json > /dev/null && echo "✅ AIF-C01 JSON válido"
```

### 5. Tradução para Inglês (30-40 minutos)

```bash
# Traduzir arquivos atualizados
python scripts_python/translate_with_api.py clf-c02
python scripts_python/translate_with_api.py dva-c02
python scripts_python/translate_with_api.py aif-c01
```

### 6. Teste na Aplicação (5 minutos)

1. Abrir `index.html` no navegador
2. Selecionar **CLF-C02**
3. Verificar que agora tem opções de dificuldade habilitadas
4. Selecionar "Fácil" e iniciar simulado
5. Verificar se questões aparecem corretamente
6. Testar com "Difícil" também

---

## 🎯 Exemplo de Execução

### Gerando 10 questões fáceis para CLF-C02:

```bash
$ python scripts_python/quick_generate.py clf-c02 easy 10

======================================================================
⚡ GERAÇÃO RÁPIDA
======================================================================
   Certificação: CLF-C02
   Dificuldade:  easy
   Quantidade:   10
======================================================================

🤖 Gerando questões com IA...
✅ Geradas: 10 questões
💾 Salvo em: data/clf-c02.json
📊 Total de questões no arquivo: 200

📈 Distribuição atual:
   Fácil:        10
   Intermediário: 190
   Difícil:      0
   Total:        200

✅ Geração concluída com sucesso!
```

### Balanceando CLF-C02 completo:

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

📦 Lote: 10 questões...
✅ Geradas: 10 questões
📊 Progresso: 10/60

📦 Lote: 10 questões...
✅ Geradas: 10 questões
📊 Progresso: 20/60

... (continua até 60)

======================================================================
🎯 Gerando 60 questões de nível 'hard' para CLF-C02
======================================================================

📦 Lote: 10 questões...
✅ Geradas: 10 questões
📊 Progresso: 10/60

... (continua até 60)

💾 Arquivo atualizado: data/clf-c02.json
   Total de questões: 310

======================================================================
✅ CONCLUÍDO: CLF-C02
======================================================================
   Fácil:        60
   Intermediário: 190
   Difícil:      60
   Total:        310
```

---

## 🐛 Problemas Comuns

### 1. "GEMINI_API_KEY não encontrada"

**Solução:**
```bash
# Criar arquivo .env
echo "GEMINI_API_KEY=sua_chave_aqui" > .env

# Obter chave gratuita em:
# https://aistudio.google.com/app/apikey
```

### 2. "RESOURCE_EXHAUSTED" ou erro 429

**Causa:** Limite de quota da API atingido (15 req/min no plano gratuito)

**Solução:** O script aguarda automaticamente. Apenas deixe rodar.

### 3. Questões com termos em inglês

**Causa:** IA às vezes gera termos em inglês

**Solução:** O script valida e rejeita automaticamente. Apenas questões em português brasileiro são salvas.

### 4. JSON corrompido

**Solução:**
```bash
# Restaurar backup
cp data/clf-c02_backup_20260322.json data/clf-c02.json
```

---

## ✅ Checklist Final

Antes de considerar concluído:

- [ ] Todas as certificações têm distribuição balanceada
- [ ] JSON de todos os arquivos está válido
- [ ] Arquivos traduzidos para inglês criados
- [ ] Testado na aplicação (filtros funcionando)
- [ ] Backup dos arquivos originais feito
- [ ] Commit das alterações no Git

---

## 🎉 Resultado Esperado

Após executar os scripts, você terá:

### CLF-C02
- ✅ 60 questões fáceis
- ✅ 70 questões intermediárias (ajustado de 190)
- ✅ 60 questões difíceis
- ✅ Total: 190 questões balanceadas

### DVA-C02
- ✅ 30 questões fáceis
- ✅ 40 questões intermediárias
- ✅ 30 questões difíceis
- ✅ Total: 100 questões balanceadas

### AIF-C01
- ✅ 40 questões fáceis
- ✅ 50 questões intermediárias (ajustado de 118)
- ✅ 28 questões difíceis
- ✅ Total: 118 questões balanceadas

### SAA-C03
- ✅ Já está balanceado (não precisa gerar)

---

## 📞 Precisa de Ajuda?

1. Consulte `scripts_python/README_GENERATION.md` para detalhes técnicos
2. Verifique logs de erro do script
3. Teste com quantidade menor primeiro (5-10 questões)
4. Valide JSON após cada geração

---

**Pronto para começar!** Execute o comando abaixo para iniciar:

```bash
python scripts_python/quick_generate.py clf-c02 easy 5
```

Isso gerará 5 questões fáceis para você testar o sistema. Se funcionar, pode prosseguir com a geração completa! 🚀
