# 🌐 Guia de Tradução de Questões AWS

## 📋 Visão Geral

Este diretório contém scripts para traduzir arquivos JSON de questões AWS do português (PT-BR) para inglês (EN-US), mantendo a integridade estrutural e preservando termos técnicos da AWS.

## 🛠️ Scripts Disponíveis

### 1. `translate_with_api.py` (RECOMENDADO)
**Tradução profissional usando Google Translate**

```bash
# Instalar dependências
pip install deep-translator

# Traduzir um arquivo específico
python scripts_python/translate_with_api.py clf-c02

# Traduzir todos os arquivos
python scripts_python/translate_with_api.py all
```

**Características:**
- ✅ Tradução completa e profissional
- ✅ Preserva termos técnicos AWS automaticamente
- ✅ Usa Google Translate (gratuito)
- ⚠️ Pode levar alguns minutos (190 questões ≈ 5-10 minutos)

### 2. `translate_aws_questions.py`
**Tradução baseada em padrões (rápida mas limitada)**

```bash
# Traduzir um arquivo
python scripts_python/translate_aws_questions.py clf-c02

# Traduzir todos
python scripts_python/translate_aws_questions.py all
```

**Características:**
- ✅ Muito rápido (segundos)
- ⚠️ Tradução parcial (baseada em padrões)
- ⚠️ Pode deixar partes em português

## 📁 Arquivos a Traduzir

| Arquivo Original | Arquivo Traduzido | Questões |
|-----------------|-------------------|----------|
| `clf-c02.json` | `clf-c02-en.json` | 190 |
| `saa-c03.json` | `saa-c03-en.json` | ? |
| `dva-c02.json` | `dva-c02-en.json` | ? |
| `aif-c01.json` | `aif-c01-en.json` | ? |

## 🔧 Campos Traduzidos vs Preservados

### ✅ Campos Traduzidos:
- `question` - Pergunta principal
- `options` - Array de opções de resposta
- `explanation` - Explicação da resposta correta

### 🔒 Campos Preservados (não alterados):
- `domain` - Domínio da questão
- `subdomain` - Subdomínio
- `service` - Serviço AWS
- `difficulty` - Nível de dificuldade (`easy`, `medium`, `hard`)
- `type` - Tipo de questão
- `tags` - Tags de categorização
- `correct` - Índice da resposta correta
- `reference_url` - URL de referência (se existir)

## 🎯 Termos Técnicos Preservados

Os seguintes termos AWS são automaticamente preservados durante a tradução:

- Serviços: EC2, S3, RDS, Lambda, VPC, IAM, CloudFront, etc.
- Conceitos: Security Group, S3 Bucket, IAM Role, Auto Scaling, etc.
- Tipos de instância: On-Demand, Reserved Instance, Spot Instance, etc.
- Tecnologias: SQL, NoSQL, DDoS, XSS, HTML, CSS, JavaScript, etc.

## 📊 Exemplo de Tradução

### Antes (PT-BR):
```json
{
  "question": "Uma startup de software está lançando seu primeiro produto...",
  "options": [
    "Instâncias Sob Demanda",
    "Instâncias Reservadas"
  ],
  "explanation": "As Instâncias Sob Demanda são ideais para..."
}
```

### Depois (EN-US):
```json
{
  "question": "A software startup is launching its first product...",
  "options": [
    "On-Demand Instances",
    "Reserved Instances"
  ],
  "explanation": "On-Demand Instances are ideal for..."
}
```

## ⚡ Dicas de Performance

### Para tradução rápida (teste):
```bash
# Cria um arquivo menor para teste
python -c "import json; data=json.load(open('data/clf-c02.json')); json.dump(data[:10], open('data/clf-c02-test.json', 'w'), indent=2)"

# Traduz apenas 10 questões
python scripts_python/translate_with_api.py clf-c02-test
```

### Para tradução em lote:
```bash
# Traduz todos os arquivos (pode levar 20-40 minutos)
python scripts_python/translate_with_api.py all
```

## 🐛 Solução de Problemas

### Erro: "Biblioteca 'deep-translator' não encontrada"
```bash
pip install deep-translator
```

### Erro: "Arquivo não encontrado"
Certifique-se de estar no diretório raiz do projeto:
```bash
cd /caminho/para/simulador-certificacao-aws
python scripts_python/translate_with_api.py clf-c02
```

### Tradução muito lenta
- Normal para arquivos grandes (190 questões ≈ 5-10 minutos)
- O script adiciona delay de 0.1s entre traduções para evitar rate limiting
- Deixe o processo rodar em background

### Caracteres estranhos (Ã, Ã§, etc.)
- Problema de encoding
- O script usa `encoding='utf-8'` automaticamente
- Se persistir, verifique o encoding do arquivo original

## 🔄 Workflow Recomendado

1. **Instalar dependências:**
   ```bash
   pip install -r scripts_python/requirements.txt
   ```

2. **Testar com arquivo pequeno:**
   ```bash
   # Criar arquivo de teste (10 questões)
   python -c "import json; data=json.load(open('data/clf-c02.json')); json.dump(data[:10], open('data/clf-c02-test.json', 'w'), indent=2)"
   
   # Traduzir teste
   python scripts_python/translate_with_api.py clf-c02-test
   
   # Verificar resultado
   cat data/clf-c02-test-en.json
   ```

3. **Traduzir arquivo completo:**
   ```bash
   python scripts_python/translate_with_api.py clf-c02
   ```

4. **Validar resultado:**
   ```bash
   # Verificar estrutura JSON
   python -m json.tool data/clf-c02-en.json > /dev/null && echo "✅ JSON válido"
   
   # Contar questões
   python -c "import json; print(f'Questões: {len(json.load(open(\"data/clf-c02-en.json\")))}')"
   ```

5. **Testar na aplicação:**
   - Abrir `index.html` no navegador
   - Clicar no botão de idioma (🇧🇷 PT-BR / 🇺🇸 EN-US)
   - Iniciar simulado e verificar se as questões aparecem em inglês

## 📝 Notas Importantes

- ⚠️ **Backup**: Os arquivos originais nunca são modificados
- ⚠️ **Validação**: Sempre valide o JSON após a tradução
- ⚠️ **Revisão**: Recomenda-se revisão manual das traduções para garantir qualidade
- ⚠️ **API Limits**: Google Translate gratuito pode ter limites de uso

## 🚀 Próximos Passos

Após traduzir os arquivos:

1. Testar a funcionalidade de troca de idioma na aplicação
2. Validar que os filtros funcionam corretamente
3. Verificar se os termos técnicos AWS estão corretos
4. Fazer revisão manual de qualidade (opcional mas recomendado)

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro do script
2. Valide o JSON com `python -m json.tool arquivo.json`
3. Teste com um arquivo menor primeiro
4. Verifique se todas as dependências estão instaladas
