# 🚀 Guia de Início Rápido - AWS Certification Simulator

## ⚡ Começar em 5 Minutos

### 1. Usar o Simulador (Frontend)

#### Opção A: Online (Mais Rápido)
```
1. Acesse: https://karlarenatadev.github.io/projeto-simulados-certificacao-aws/
2. Selecione uma certificação
3. Configure filtros (quantidade, dificuldade, modo)
4. Clique em "Iniciar Simulação"
```

#### Opção B: Local
```bash
# Clone o repositório
git clone https://github.com/karlarenatadev/projeto-simulados-certificacao-aws.git
cd projeto-simulados-certificacao-aws

# Inicie um servidor local
python -m http.server 8000
# OU
npx http-server -p 8000

# Acesse no navegador
http://localhost:8000
```

### 2. Gerar Novas Questões (Backend)

```bash
# 1. Instale dependências
pip install -r scripts_python/requirements.txt

# 2. Configure API Key
echo "GEMINI_API_KEY=sua_chave_aqui" > .env

# 3. Gere questões
python scripts_python/auto_generate_questions.py clf-c02

# 4. Traduza para inglês
python scripts_python/translate_with_api.py clf-c02
```


---

## 📖 Funcionalidades Principais

### Simulador de Exames
- **Modo Exame**: Com timer baseado nos exames reais
- **Modo Revisão**: Sem pressão de tempo
- **Filtros**: Quantidade, dificuldade, tópico
- **Feedback**: Visual diferenciado (verde/vermelho)
- **Escala**: 100-1000 pontos (oficial AWS)

### Modo Flashcards
- **Acesso**: Botão "Modo Flashcards" na tela inicial
- **Navegação**: Anterior/Próximo
- **Interação**: Clique para virar o cartão
- **Termos**: 20 essenciais da AWS

### Análise de Desempenho
- **Pontuação**: Por domínio e global
- **Recomendações**: Baseadas em pontos fracos
- **Histórico**: Evolução ao longo do tempo
- **Relatório**: Exportável em PDF

---

## 🎯 Casos de Uso Comuns

### Estudante Iniciante
```
1. Comece com CLF-C02 (Cloud Practitioner)
2. Use filtro "Iniciante"
3. Faça simulados de 10 questões
4. Revise flashcards após cada simulado
5. Aumente dificuldade gradualmente
```

### Estudante Avançado
```
1. Escolha SAA-C03 ou DVA-C02
2. Use filtro "Todas" as dificuldades
3. Faça simulados de 65 questões (exame completo)
4. Modo Exame com timer
5. Analise relatório detalhado
```

### Desenvolvedor do Projeto
```
1. Gere questões com auto_generate_questions.py
2. Valide com sanity_check.py
3. Traduza com translate_with_api.py
4. Teste no navegador
5. Commit e push
```


---

## 🔧 Comandos Úteis

### Verificar Distribuição de Questões
```bash
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

### Validar JSON
```bash
python -m json.tool data/clf-c02.json > /dev/null && echo "✅ JSON válido"
```

### Fazer Backup
```bash
cp data/clf-c02.json data/backups/clf-c02_backup_$(date +%Y%m%d_%H%M%S).json
```

### Gerar Quantidade Específica
```bash
python scripts_python/quick_generate.py clf-c02 easy 10
```

### Traduzir Todas as Certificações
```bash
python scripts_python/translate_with_api.py all
```

---

## 📚 Próximos Passos

1. **Explore a Documentação**: Leia [Análise Completa](./analise-completa-projeto.md)
2. **Teste o Simulador**: Faça um simulado completo
3. **Experimente Flashcards**: Revise os 20 termos
4. **Gere Questões**: Teste o pipeline de IA
5. **Contribua**: Abra issues ou PRs no GitHub

---

## 🆘 Precisa de Ajuda?

- **Problemas Técnicos**: Consulte [Resolução de Problemas](./resolucao-problemas.md)
- **Dúvidas sobre Geração**: Veja [Guia de Geração](./guia-geracao.md)
- **Dúvidas sobre Tradução**: Veja [Status da Tradução](./status-traducao.md)
- **Contato**: [LinkedIn](https://www.linkedin.com/in/karlarenata-rosario/)

---

**Bons estudos! 🎓**
