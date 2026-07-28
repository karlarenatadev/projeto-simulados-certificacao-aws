# Contribuicoes De Questoes

Atualizado em: 2026-06-18

Esta pasta recebe novas questoes antes de elas entrarem nos arquivos principais em `data/*.json`.

## Estrutura

```text
data/contributions/
  _TEMPLATE.json
  _TEMPLATE_MULTIPLE_ANSWER.json
  clf-c02/
  saa-c03/
  dva-c02/
  aif-c01/
```

## Como Criar Uma Questao

Copie um template:

```bash
cp data/contributions/_TEMPLATE.json data/contributions/clf-c02/questao-s3-versionamento.json
```

Para multipla resposta:

```bash
cp data/contributions/_TEMPLATE_MULTIPLE_ANSWER.json data/contributions/clf-c02/questao-iam-politicas.json
```

Preencha:

- dominio;
- subdominio, se aplicavel;
- servico AWS;
- dificuldade;
- tags;
- pergunta;
- opcoes;
- resposta correta;
- explicacao;
- referencia;
- dados do contribuidor.

## Validar

```bash
python src/python/scripts/validate_contribution.py data/contributions/clf-c02/questao-s3-versionamento.json
```

## Boas Praticas

- Use cenario realista.
- Evite pergunta de definicao pura.
- Evite ambiguidade.
- Use referencias oficiais AWS quando possivel.
- Explique a resposta correta de forma didatica.
- Crie um arquivo por questao.
- Use nomes descritivos e sem espacos.

## O Que Nao Fazer

- Nao copie dumps de prova.
- Nao edite `data/*.json` diretamente sem alinhamento.
- Nao envie questoes sem referencia.
- Nao misture muitas questoes diferentes no mesmo PR.

## Merge

Mantenedores podem consolidar contribuicoes com:

```bash
python src/python/scripts/merge_contributions.py clf-c02
```

Depois do merge, rode:

```bash
npm test -- --runInBand
npm run build
```
