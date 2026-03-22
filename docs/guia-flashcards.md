# 📚 Guia do Modo Flashcards

## O que é o Modo Flashcards?

O Modo Flashcards é uma funcionalidade de revisão rápida que permite memorizar termos essenciais da AWS através de cartões interativos com efeito 3D. É ideal para:

- Revisão rápida antes do exame
- Memorização de siglas e serviços AWS
- Estudo em intervalos curtos (5-10 minutos)
- Reforço de conceitos fundamentais

---

## Como Acessar

1. Na tela inicial do simulador, clique no botão **"Modo Flashcards (Revisão Rápida)"**
2. Você será direcionado para a interface de flashcards

---

## Como Usar

### Navegação Básica

- **Clique no cartão** para virar e ver a definição oficial
- **Botão "Anterior"**: Volta para o cartão anterior
- **Botão "Próximo"**: Avança para o próximo cartão
- **Contador**: Mostra sua posição atual (ex: "5 / 20")

### Dicas de Estudo

1. **Leia o termo** e tente lembrar a definição antes de virar
2. **Vire o cartão** para conferir se acertou
3. **Repita** os cartões que você errou até memorizar
4. **Faça sessões curtas** de 10-15 minutos várias vezes ao dia

---

## Termos Incluídos (20 Essenciais)

### Gerenciamento e Segurança
- **ACM** - AWS Certificate Manager
- **AWS Artifact** - Portal de conformidade
- **AWS Config** - Auditoria de configurações
- **GuardDuty** - Detecção de ameaças
- **KMS** - Key Management Service
- **Shield** - Proteção DDoS
- **WAF** - Web Application Firewall
- **Trusted Advisor** - Recomendações de otimização
- **IAM** - Identity and Access Management

### Computação e Armazenamento
- **AMI** - Amazon Machine Image
- **ASG** - Auto Scaling Group
- **Lambda** - Computação serverless
- **S3** - Simple Storage Service
- **RDS** - Relational Database Service

### Rede e Infraestrutura
- **AZ** - Availability Zone
- **VPC** - Virtual Private Cloud
- **Route 53** - Serviço de DNS
- **CloudFront** - CDN (Content Delivery Network)

### Monitoramento e Automação
- **CloudWatch** - Monitoramento e observabilidade
- **CloudFormation** - Infraestrutura como código

---

## Recursos Visuais

### Frente do Cartão
```
┌─────────────────────────┐
│     TERMO AWS           │
│                         │
│        ACM              │
│                         │
│  👆 Clique para ver     │
│     a definição         │
└─────────────────────────┘
```

### Verso do Cartão
```
┌─────────────────────────┐
│  DEFINIÇÃO OFICIAL      │
│                         │
│  Serviço que provisiona,│
│  gerencia e implanta    │
│  certificados SSL/TLS...│
│                         │
│  👆 Clique para voltar  │
└─────────────────────────┘
```

---

## Compatibilidade

✅ Desktop (Chrome, Firefox, Safari, Edge)
✅ Mobile (iOS Safari, Chrome Android)
✅ Tablet (iPad, Android Tablets)
✅ Dark Mode (automático)
✅ Offline (via PWA)

---

## Técnicas de Memorização

### Método Leitner (Recomendado)
1. Primeira rodada: Passe por todos os 20 cartões
2. Marque mentalmente os que você errou
3. Segunda rodada: Foque apenas nos que errou
4. Repita até acertar todos

### Repetição Espaçada
- **Dia 1**: Estude todos os cartões
- **Dia 2**: Revise todos novamente
- **Dia 4**: Revise apenas os difíceis
- **Dia 7**: Revisão geral
- **Dia 14**: Revisão final antes do exame

### Associação Visual
- Crie imagens mentais para cada termo
- Exemplo: **S3** = "Três baldes de armazenamento"
- Exemplo: **Lambda** = "Função que aparece e desaparece"

---

## Perguntas Frequentes

### Posso adicionar mais termos?
Sim! Edite o arquivo `data.js` e adicione novos objetos ao array `glossaryTerms`:

```javascript
{
  term: "Novo Termo",
  definition: "Definição oficial do termo..."
}
```

### Os flashcards funcionam offline?
Sim, se você instalou o simulador como PWA (Progressive Web App).

### Posso exportar os flashcards?
Atualmente não, mas você pode imprimir a lista de termos do arquivo `data.js`.

### Há flashcards específicos por certificação?
Na versão atual, os flashcards cobrem termos gerais. Futuras versões podem incluir filtros por certificação.

---

## Integração com o Simulado

O Modo Flashcards complementa o simulado principal:

1. **Antes do Simulado**: Use flashcards para revisar conceitos básicos
2. **Durante o Estudo**: Alterne entre simulados e flashcards
3. **Após Erros**: Se errar questões sobre um serviço, revise o flashcard correspondente
4. **Véspera do Exame**: Faça uma revisão rápida de todos os flashcards

---

## Estatísticas de Uso (Futuras)

Planejado para próximas versões:
- [ ] Contador de cartões revisados
- [ ] Marcação de cartões "dominados"
- [ ] Tempo médio por cartão
- [ ] Histórico de revisões
- [ ] Modo de quiz com os termos

---

## Feedback e Sugestões

Encontrou algum erro nas definições? Quer sugerir novos termos?

Entre em contato através do [LinkedIn](https://www.linkedin.com/in/karlarenata-rosario/)

---

**Dica Final**: A consistência é mais importante que a quantidade. É melhor revisar 5 minutos por dia do que 1 hora uma vez por semana! 🎯
