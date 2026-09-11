# Auditoria Estrutural — Cloud Academy A3

**Data da auditoria:** 11 de setembro de 2026  
**Branch auditada:** `main`  
**Escopo:** frontend, backend, persistência, dados, PWA/offline, internacionalização, navegação, segurança, testes, build, CI e deploy.

> Este documento registra somente investigação e recomendações. Nenhuma correção, refatoração, alteração de código, staging ou commit foi realizada durante a auditoria.

## Resumo executivo

- Problemas confirmados: **34**
- Críticos: **2**
- Altos: **12**
- Médios: **14**
- Baixos: **6**
- Bugs latentes: **9** — já existem no código, mas alguns dependem da ativação do backend, retomada de uma feature ou condições específicas.
- Potenciais problemas que requerem validação: **1**
- Conflitos arquiteturais principais: **8**
- Lacunas críticas de cobertura: **14**
- Testes Jest: **389 passaram**
- E2E Chromium: **17 passaram**
- Gate de cobertura: **falhou**, com 49,57% de statements para mínimo global de 50%.
- Build, lint, formatação, validadores de dados e PWA: passaram.

Conclusão: a aplicação está relativamente estável no fluxo estático/local exercitado pelos testes, mas essa estabilidade não se estende ao backend online. O contrato do quiz entre API e frontend está quebrado; autenticação, integridade do score, sincronização e gamificação não têm garantias suficientes para uso multiusuário.

---

## Mapa da arquitetura

```text
Frontend multipágina / SPA híbrida
src/frontend/pages + src/frontend/js
        ↓
Shell, i18n, QuizEngine, managers de labs/cases/flashcards/sprints
        ↓
DataRepository
├── StorageManager → localStorage/sessionStorage
└── ApiService → Express API
                     ↓
            Rotas auth/questions/quizzes/users/cases/state
                     ↓
                  PGlite
        schema.sql + scripts de seed

Conteúdo estático
data/questions, labs, cases, flashcards, tips, taxonomia
        ↓
scripts/build.cjs
        ↓
public/ gerado
        ↓
GitHub Pages + Service Worker
```

### Responsabilidades encontradas

- Frontend canônico: `src/frontend/`; `public/` é artefato gerado.
- Backend oficial nos scripts Node: Express em `backend/api/server.js`.
- Persistência oficial do backend: PGlite em `backend/database/`.
- Persistência local: `localStorage`, com chaves por usuário em `storageManager.js`.
- Estado transitório: `sessionStorage`, usado para contexto diagnóstico, estudo e flags offline.
- Não foi encontrado uso direto de IndexedDB no frontend.
- Conteúdo: JSON versionado em `data/`, projetado no PGlite por seeds.
- PWA: `src/frontend/pwa/sw.js`, manifest e fallback 404.
- Deploy Pages: gera e publica `public/`.
- Existe ainda uma implementação FastAPI/PostgreSQL paralela, não conectada aos scripts principais.

### Fluxos críticos

| Fluxo | Resultado da auditoria |
| --- | --- |
| Iniciar simulado online | Quebrado pelo contrato API → QuizEngine |
| Responder online | Permite repetir ou injetar questões fora do quiz |
| Finalizar duas vezes | Bloqueio de UI existe, mas a persistência assíncrona invalida a deduplicação de gamificação |
| Refresh durante simulado | Sessão ativa é persistida e pode ser restaurada |
| Abandonar simulado online | Fica registrado como quiz concluído com nota zero |
| Estudo/exame offline | Fluxo básico funciona, mas respostas sem sync não são reenviadas |
| Flashcards | Fluxo local e troca de certificação cobertos; offline completo não está garantido |
| Trilhas/sprints | Dias esparsos geram dias falsamente concluídos; streak do sprint aceita repetição |
| Labs | Conclusão pode ser enviada para a certificação errada |
| Cases | Falha de API é convertida silenciosamente em “concluído localmente” |
| Dicas | Catálogo principal funciona e possui cobertura E2E |
| Perfil/XP | Exibe XP calculado localmente, diferente do XP persistido no backend |
| Badges/streak | Existem duas representações; streak pode continuar após vários dias de ausência |
| Troca de idioma | Núcleo coberto, mas cases e simulador mantêm mensagens em português |
| Navegação Pages | Simulator Hub quebra; fallback para rotas sem extensão perde a rota |
| PWA | Núcleo offline parcial; várias páginas e datasets não fazem parte do cache controlado |

---

## CRÍTICO

### [BUG-001] Autenticação baseada somente no conhecimento do e-mail

**Severidade:** Crítico  
**Área:** Segurança / Autenticação

**Arquivos envolvidos:**

- [`backend/api/routes/auth.js:35`](backend/api/routes/auth.js#L35)
- [`src/frontend/js/userManager.js:18`](src/frontend/js/userManager.js#L18)

**Problema**

O login envia somente o e-mail e dados de perfil. Não existe senha, prova de posse do e-mail, OIDC, OAuth ou autenticação corporativa.

**Evidência**

A rota localiza ou cria o usuário a partir do e-mail e emite um token assinado contendo inclusive a role armazenada no banco.

**Como reproduzir**

Com o Express disponível, enviar ao endpoint de autenticação o e-mail conhecido de uma conta privilegiada. O servidor não solicita um segundo fator de identidade antes de emitir o token.

**Impacto**

Impersonação de estudantes, validadores ou administradores e acesso às rotas protegidas pela role da vítima. O GitHub Pages estático não expõe esse backend, mas qualquer deploy da API torna o risco explorável.

**Causa raiz**

O e-mail foi tratado como credencial, quando deveria ser apenas identificador.

**Correção sugerida**

Adotar autenticação verificável, impedir autoaprovisionamento privilegiado, vincular roles somente no servidor e prever revogação/rotação dos tokens existentes.

---

### [BUG-002] O quiz online recebe questões que o próprio QuizEngine considera inválidas

**Severidade:** Crítico  
**Área:** Simulado / Contrato API

**Arquivos envolvidos:**

- [`backend/api/routes/quizzes.js:87`](backend/api/routes/quizzes.js#L87)
- [`src/frontend/js/quizEngine.js:151`](src/frontend/js/quizEngine.js#L151)
- [`src/frontend/js/dataRepository.js:349`](src/frontend/js/dataRepository.js#L349)
- [`src/frontend/js/app.js:874`](src/frontend/js/app.js#L874)

**Problema**

A API omite `correct_answer`, explicação e status de validação. O frontend exige esses campos para normalizar e aceitar uma questão.

**Evidência**

Uma questão no formato real retornado pela API foi passada ao loader. Resultado reproduzido:

```json
{"success":false,"message":"Nenhuma questão válida restou após a sanitização."}
```

Além disso, o backend cria o registro do quiz antes de o frontend descobrir que nenhuma questão pôde ser usada.

**Como reproduzir**

Ativar a API, autenticar-se e iniciar um simulado. A API responde com sucesso, mas o `QuizEngine` elimina todas as questões.

**Impacto**

Simulados online não iniciam e deixam registros de histórico com nota zero. O fallback estático mascara o defeito em GitHub Pages.

**Causa raiz**

Backend e frontend implementam modelos incompatíveis de correção: o backend tenta ocultar a resposta, enquanto o engine local precisa dela para corrigir no navegador.

**Correção sugerida**

Definir um único contrato. No modo online, o frontend não deve receber a resposta correta nem corrigi-la localmente; a API deve fornecer um modelo público e retornar feedback/correção por resposta ou na finalização.

---

## ALTO

### [BUG-003] Respostas não pertencem formalmente ao conjunto de questões do quiz

**Severidade:** Alto  
**Área:** Segurança / Score / API

**Arquivos envolvidos:**

- [`backend/api/routes/quizzes.js:116`](backend/api/routes/quizzes.js#L116)
- [`backend/database/db.js:2051`](backend/database/db.js#L2051)
- [`backend/database/schema.sql:322`](backend/database/schema.sql#L322)

**Problema**

O endpoint verifica o proprietário do quiz e a existência global da questão, mas não se a questão foi selecionada para aquele quiz. Também não há unicidade `(quiz_id, question_id)`.

**Evidência**

Cada POST insere uma nova resposta. O resumo soma todas as linhas armazenadas, inclusive repetições.

**Como reproduzir**

Iniciar um quiz e reenviar várias vezes uma questão correta, ou enviar o ID de uma questão de outra certificação.

**Impacto**

Score, porcentagem, domínios fracos, ranking e progresso podem ser manipulados. A porcentagem pode inclusive ultrapassar o total lógico do quiz.

**Causa raiz**

O conjunto de questões sorteadas não é persistido como parte da entidade quiz e o endpoint não é idempotente.

**Correção sugerida**

Persistir `quiz_questions`, criar unicidade por questão, aceitar atualização controlada da resposta e validar certificação, status e membership.

---

### [BUG-004] Iniciar um quiz já o contabiliza como concluído

**Severidade:** Alto  
**Área:** Progresso / Banco

**Arquivos envolvidos:**

- [`backend/api/routes/quizzes.js:68`](backend/api/routes/quizzes.js#L68)
- [`backend/database/schema.sql:294`](backend/database/schema.sql#L294)
- [`backend/database/schema.sql:426`](backend/database/schema.sql#L426)

**Problema**

O histórico é criado no início com score zero e `completed_at` recebe `NOW()` por padrão. Não existe status `started/abandoned/completed`.

**Evidência**

As estatísticas contam registros de `quiz_history`, sem separar tentativas apenas abertas.

**Como reproduzir**

Abrir um simulado e sair antes de responder. Consultar histórico e estatísticas.

**Impacto**

Total de simulados, média, taxa de aprovação, weak domains e leaderboard ficam contaminados por tentativas que nunca ocorreram.

**Causa raiz**

Ciclo de vida do quiz foi reduzido a uma única tabela sem estado explícito.

**Correção sugerida**

Adicionar status e timestamps de início/finalização; contabilizar somente `completed`; prever expiração/abandono.

---

### [BUG-005] Sincronização local/API pode sobrescrever progresso mais novo

**Severidade:** Alto  
**Área:** Persistência / Concorrência

**Arquivos envolvidos:**

- [`src/frontend/js/dataRepository.js:23`](src/frontend/js/dataRepository.js#L23)
- [`src/frontend/js/dataRepository.js:295`](src/frontend/js/dataRepository.js#L295)
- [`backend/database/db.js:1299`](backend/database/db.js#L1299)

**Problema**

Se o servidor tiver qualquer estado, ele vence o local sem comparação temporal. Escritas são frequentemente fire-and-forget e seus erros são engolidos. O versionamento do backend usa leitura seguida de escrita, sem operação atômica.

**Evidência**

`hydrate` substitui o local pelo remoto; o frontend não envia versão em vários fluxos; `_safeApiCall` transforma falhas em retorno neutro.

**Como reproduzir**

Estudar offline, alterar o mesmo módulo em outro dispositivo e reconectar o primeiro.

**Impacto**

Perda silenciosa de respostas, progresso de sprint, decks, badges ou conclusões. Em duas abas, prevalece a última escrita, não necessariamente o estado mais novo.

**Causa raiz**

Não há protocolo de reconciliação, merge por entidade, fila confiável ou compare-and-swap.

**Correção sugerida**

Adotar versões/timestamps do servidor, conflitos explícitos, operações atômicas e fila de mutações offline idempotentes.

---

### [BUG-006] A identidade offline muda a cada novo login

**Severidade:** Alto  
**Área:** Usuário / Persistência local

**Arquivos envolvidos:**

- [`src/frontend/js/userManager.js:69`](src/frontend/js/userManager.js#L69)
- [`src/frontend/js/storageManager.js:34`](src/frontend/js/storageManager.js#L34)

**Problema**

O identificador offline é `local_${Date.now()}`. As chaves de progresso são segregadas por esse ID.

**Evidência**

Sair e entrar novamente com o mesmo e-mail cria outro namespace. Ao migrar depois para o UUID do servidor, ocorre uma terceira identidade.

**Como reproduzir**

Entrar offline, concluir atividades, sair e entrar novamente com o mesmo e-mail.

**Impacto**

O progresso anterior parece ter desaparecido, embora ainda esteja no navegador sob outra chave.

**Causa raiz**

Identidade da sessão foi usada como identidade persistente.

**Correção sugerida**

Criar identidade offline estável e implementar migração/merge explícito quando o usuário autenticar online.

---

### [BUG-007] XP e gamificação possuem fontes de verdade incompatíveis

**Severidade:** Alto  
**Área:** Gamificação / Perfil / Leaderboard

**Arquivos envolvidos:**

- [`backend/database/schema.sql:345`](backend/database/schema.sql#L345)
- [`src/frontend/js/dataRepository.js:177`](src/frontend/js/dataRepository.js#L177)
- [`src/frontend/pages/profile.html:227`](src/frontend/pages/profile.html#L227)
- [`src/frontend/js/leaderboard.js:120`](src/frontend/js/leaderboard.js#L120)

**Problema**

O banco possui XP, níveis, badges e streak próprios; o frontend local não possui o mesmo modelo; `syncGamification` não existe no cliente API. O perfil fabrica XP a partir de outras métricas.

**Evidência**

Leaderboard mistura `best_score`, XP e cálculos artificiais. “XP da guilda” é `quantidade de usuários × 15`; “média semanal” deriva da média das cinco melhores notas.

**Como reproduzir**

Comparar perfil, jornada, estado local e `/api/leaderboard` para o mesmo usuário.

**Impacto**

Telas discordam entre si; mudanças de dispositivo alteram XP/badges aparentes; métricas são rotuladas com significados que não representam.

**Causa raiz**

Dois sistemas de gamificação evoluíram de forma independente.

**Correção sugerida**

Escolher um modelo canônico, definir eventos idempotentes de concessão e derivar todas as telas da mesma projeção.

---

### [BUG-008] Streak continua válido após períodos de inatividade

**Severidade:** Alto  
**Área:** Streak / Datas

**Arquivos envolvidos:**

- [`src/frontend/js/storageManager.js:130`](src/frontend/js/storageManager.js#L130)
- [`src/frontend/js/storageManager.js:846`](src/frontend/js/storageManager.js#L846)

**Problema**

O cálculo parte da aprovação histórica mais recente, sem exigir atividade hoje ou ontem. O update incrementa ao detectar apenas uma data diferente, sem conferir consecutividade.

**Evidência**

Uma atividade aprovada semanas depois da anterior pode aumentar o streak. Datas são truncadas por UTC com `toISOString()`, não pelo dia local brasileiro.

**Como reproduzir**

Registrar aprovação, avançar vários dias e registrar outra aprovação; ou responder perto da meia-noite em UTC-3.

**Impacto**

Streak e badges derivados não representam dias consecutivos.

**Causa raiz**

O código compara igualdade de datas, não diferença calendárica no fuso escolhido.

**Correção sugerida**

Centralizar calendário/fuso, exigir diferença de exatamente um dia e testar virada de mês, ano e horário de verão aplicável.

---

### [BUG-009] Conclusão de lab pode ser sincronizada para outra certificação

**Severidade:** Alto  
**Área:** Labs / Sincronização

**Arquivos envolvidos:**

- [`src/frontend/js/modules/laboratorios.js:475`](src/frontend/js/modules/laboratorios.js#L475)

**Problema**

A chave local usa a certificação exibida no filtro; o envio à API usa a certificação ativa da conta.

**Evidência**

São duas variáveis distintas utilizadas na mesma operação de conclusão.

**Como reproduzir**

Estar autenticado em uma certificação, visualizar os labs de outra e concluir um lab.

**Impacto**

O lab aparece concluído localmente na certificação B, mas é gravado remotamente no estado da certificação A.

**Causa raiz**

Contexto visual e contexto persistente não foram unificados no payload.

**Correção sugerida**

Persistir usando a certificação do próprio lab/visão e validar no servidor a relação lab-certificação.

---

### [BUG-010] Simulator Hub publicado possui imports quebrados

**Severidade:** Alto  
**Área:** Navegação / GitHub Pages

**Arquivos envolvidos:**

- [`src/frontend/pages/simulator-hub.html:46`](src/frontend/pages/simulator-hub.html#L46)
- [`scripts/build.cjs:168`](scripts/build.cjs#L168)
- [`public/simulator-hub.html:51`](public/simulator-hub.html#L51)

**Problema**

A página fonte usa imports `../js/...`, mas o build move a página para a raiz de `public/` sem reescrever os caminhos.

**Evidência**

Teste real sob o subpath de Pages retornou 200 para o HTML, mas zero níveis renderizados e três 404:

- `/js/shell.js`
- `/js/core/languageManager.js`
- `/js/i18n/useTranslation.js`

**Como reproduzir**

Abrir `/projeto-simulados-certificacao-aws/simulator-hub.html`.

**Impacto**

A página carrega visualmente, mas sua funcionalidade central não inicializa.

**Causa raiz**

O build achata páginas enquanto preserva caminhos relativos baseados na localização em `src/`.

**Correção sugerida**

Padronizar URLs relativas ao artefato final e adicionar teste E2E executado no mesmo base path do Pages.

---

### [BUG-011] Banco inglês CLF-C02 contém conteúdo majoritariamente em português

**Severidade:** Alto  
**Área:** Dados / Internacionalização

**Arquivos envolvidos:**

- [`data/questions/clf-c02-en.json:22`](data/questions/clf-c02-en.json#L22)
- [`scripts/validation/validate_data_consistency.mjs:463`](scripts/validation/validate_data_consistency.mjs#L463)

**Problema**

No arquivo marcado como inglês, **329 de 394** entradas possuem diacríticos fortemente associados ao texto português em pergunta, alternativas ou explicação. A primeira amostra já é code-mixed.

**Evidência**

O validador atual compara presença e quantidade de arquivos, mas não valida semanticamente o idioma.

**Como reproduzir**

Selecionar CLF-C02 em inglês e percorrer as questões.

**Impacto**

A troca de idioma promete conteúdo inglês, mas entrega conteúdo parcial ou predominantemente português.

**Causa raiz**

A governança verifica estrutura, não idioma efetivo.

**Correção sugerida**

Revisar/traduzir o dataset e adicionar detecção semântica com revisão humana para falsos positivos.

---

### [BUG-012] Banco SAA-C03 começa com conteúdo de AI Practitioner

**Severidade:** Alto  
**Área:** Dados / Certificação

**Arquivos envolvidos:**

- [`data/questions/saa-c03.json:3`](data/questions/saa-c03.json#L3)
- [`data/questions/saa-c03.json:19`](data/questions/saa-c03.json#L19)

**Problema**

As primeiras 12 questões tratam de temperatura de LLM, few-shot, RAG, agentes, prompt engineering e avaliação de foundation models, classificadas como “Design High-Performing Architectures”.

**Evidência**

O guia atual SAA Domain 3 trata de armazenamento, compute, banco, redes e ingestão. Prompt engineering e foundation models aparecem no domínio 3 do AIF:

- [SAA Domain 3 — AWS](https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03-domain3.html)
- [AIF Domain 3 — AWS](https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01-domain3.html)

**Como reproduzir**

Iniciar um simulado SAA-C03 que sorteie os registros iniciais.

**Impacto**

Score por certificação/domínio, weak domains e recomendações são calculados sobre conteúdo da prova errada.

**Causa raiz**

Classificação editorial incompatível com a taxonomia oficial, não detectada pela validação estrutural.

**Correção sugerida**

Auditar o banco SAA completo contra o blueprint oficial e mover/remover questões com revisão de especialista.

---

### [BUG-013] HTML de questões pode alcançar `innerHTML` sem sanitização

**Severidade:** Alto  
**Área:** Segurança / XSS  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/js/app.js:1565`](src/frontend/js/app.js#L1565)
- [`backend/api/routes/questions.js:314`](backend/api/routes/questions.js#L314)
- [`__tests__/xssSinks.test.js:1`](__tests__/xssSinks.test.js#L1)

**Problema**

Alternativas e explicações são interpoladas em `innerHTML`. A API aceita strings editoriais sem sanitização HTML.

**Evidência**

Os testes XSS existentes cobrem leaderboard e Validation UI, não a renderização do quiz.

**Como reproduzir**

Inserir uma questão autorizada contendo markup ativo e carregá-la no fluxo local/API após corrigir o contrato do BUG-002.

**Impacto**

Execução de script na origem da aplicação, com acesso ao token armazenado no `localStorage`.

**Causa raiz**

Conteúdo editorial foi tratado como HTML confiável.

**Correção sugerida**

Renderizar texto com `textContent`; quando markup for necessário, aplicar sanitização por allowlist e testes de payloads armazenados.

---

### [BUG-014] Respostas offline não sincronizadas nunca são reenviadas

**Severidade:** Alto  
**Área:** Offline / Persistência

**Arquivos envolvidos:**

- [`src/frontend/js/quizManager.js:114`](src/frontend/js/quizManager.js#L114)
- [`src/frontend/js/app.js:1474`](src/frontend/js/app.js#L1474)
- [`src/frontend/js/app.js:2587`](src/frontend/js/app.js#L2587)

**Problema**

Falhas de envio deixam registros com `synced:false`, mas não há rotina que localize e reenvie esses registros.

**Evidência**

O comentário menciona retry futuro, porém nenhuma implementação consome a fila. A UI registra “completed and synced” apenas porque existe `currentQuizId`.

**Como reproduzir**

Responder com a API indisponível, restaurar a rede e consultar o backend.

**Impacto**

O navegador mostra resultado completo, mas o servidor mantém o quiz incompleto.

**Causa raiz**

Persistência local foi implementada sem o reconciliador correspondente.

**Correção sugerida**

Implementar outbox idempotente, reenvio em reconexão/startup e estado visual “pendente de sincronização”.

---

## MÉDIO

### [BUG-015] Filtros online são ignorados e a seleção não é aleatória

**Severidade:** Médio  
**Área:** Simulado / Dados

**Arquivos envolvidos:**

- [`src/frontend/js/quizManager.js:55`](src/frontend/js/quizManager.js#L55)
- [`backend/api/routes/quizzes.js:28`](backend/api/routes/quizzes.js#L28)
- [`backend/database/db.js:791`](backend/database/db.js#L791)

**Problema**

Dificuldade e tópico selecionados não são enviados à API.

**Evidência**

O backend filtra somente certificação, idioma e quantidade e usa `ORDER BY created_at DESC LIMIT`.

**Como reproduzir**

Iniciar dois quizzes online com dificuldades diferentes.

**Impacto**

As mesmas questões recentes aparecem repetidamente e as escolhas da interface são ignoradas.

**Causa raiz**

Os filtros só foram implementados no loader local.

**Correção sugerida**

Formalizar filtros no contrato e usar seleção aleatória ou adaptativa auditável.

---

### [BUG-016] Nove níveis do simulador apontam para apenas três cases

**Severidade:** Médio  
**Área:** Simulador  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/pages/simulator-hub.html:133`](src/frontend/pages/simulator-hub.html#L133)
- [`src/frontend/pages/simulator-hub.html:235`](src/frontend/pages/simulator-hub.html#L235)
- [`src/frontend/js/simulator/engine.js:68`](src/frontend/js/simulator/engine.js#L68)

**Problema**

Os nove cartões são reduzidos a beginner/intermediate/advanced; o engine usa o primeiro `find()` daquela dificuldade.

**Evidência**

Área, certificação ou ID do cartão não participam da seleção.

**Como reproduzir**

Após corrigir o BUG-010, abrir dois cartões avançados distintos.

**Impacto**

Security, Data, AI e outros cartões podem abrir exatamente o mesmo cenário.

**Causa raiz**

O nível visual não possui identidade de domínio no contrato.

**Correção sugerida**

Passar um ID/slug estável e resolver o case por ele.

---

### [BUG-017] Contrato do avaliador do simulador diverge entre cliente e servidor

**Severidade:** Médio  
**Área:** Simulador / API

**Arquivos envolvidos:**

- [`src/frontend/js/simulator/engine.js:361`](src/frontend/js/simulator/engine.js#L361)
- [`src/frontend/js/simulator/engine.js:391`](src/frontend/js/simulator/engine.js#L391)
- [`backend/api/simulatorEngine.js:26`](backend/api/simulatorEngine.js#L26)

**Problema**

O servidor retorna `score`, `missingCritical`, `badChoices` e `finalPercentage`; o frontend espera score percentual, `passed`, `feedback` e nomes snake_case.

**Evidência**

Campos consumidos pelo renderer não são os retornados pela API. O fallback offline oferece apenas serviços esperados, sem distratores.

**Como reproduzir**

Avaliar via API e inspecionar feedback; offline, selecionar todos os serviços apresentados.

**Impacto**

Feedback online incorreto ou indefinido; desafio offline trivialmente solucionável.

**Causa raiz**

Modelos evoluíram separadamente.

**Correção sugerida**

Criar schema compartilhado e incluir catálogo de distratores controlado.

---

### [BUG-018] Resultado assíncrono é tratado como booleano e invalida deduplicação

**Severidade:** Médio  
**Área:** Gamificação / Estado  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/js/storageManager.js:1383`](src/frontend/js/storageManager.js#L1383)
- [`src/frontend/js/dataRepository.js:65`](src/frontend/js/dataRepository.js#L65)
- [`src/frontend/js/app.js:2579`](src/frontend/js/app.js#L2579)

**Problema**

O singleton exportado possui `saveQuizResult()` assíncrono, mas `app.js` usa a Promise como booleano.

**Evidência**

Uma Promise é sempre truthy; portanto `if (!saved)` nunca detecta duplicata e `if (saved)` sempre aciona gamificação.

**Como reproduzir**

Salvar duas vezes um resultado com a mesma identidade.

**Impacto**

O histórico pode deduplicar, mas streak e badges são concedidos novamente.

**Causa raiz**

Substituição de objeto síncrono por facade assíncrona sem atualizar consumidores.

**Correção sugerida**

Tornar `saveQuizResult` e `finishQuiz` assíncronos e aguardar o resultado antes de efeitos derivados.

---

### [BUG-019] Seed não atualiza conteúdo corrigido de questões existentes

**Severidade:** Médio  
**Área:** Dados / Banco  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`scripts/seed/seed-pglite.mjs:154`](scripts/seed/seed-pglite.mjs#L154)
- [`__tests__/datasetSeeds.test.js:44`](__tests__/datasetSeeds.test.js#L44)

**Problema**

Para questão existente, o seed atualiza apenas tags, idioma e source ID.

**Evidência**

Pergunta, opções, resposta, explicação, domínio e dificuldade antigos são preservados.

**Como reproduzir**

Corrigir uma questão JSON já semeada e executar o seed novamente em uma cópia do banco.

**Impacto**

Pages e API podem servir versões diferentes do conteúdo.

**Causa raiz**

Preservação de campos operacionais foi confundida com imutabilidade editorial.

**Correção sugerida**

Separar campos editoriais e operacionais e atualizar os editoriais por versão ou checksum.

---

### [BUG-020] Conclusão de case não possui retry ou reconciliação

**Severidade:** Médio  
**Área:** Cases / Offline

**Arquivos envolvidos:**

- [`src/frontend/js/cases/caseManager.js:288`](src/frontend/js/cases/caseManager.js#L288)

**Problema**

O estado é gravado localmente e uma falha da API é convertida em sucesso.

**Evidência**

Não existe fila posterior de conclusão pendente.

**Como reproduzir**

Concluir offline, voltar online e consultar o progresso em outro navegador.

**Impacto**

O usuário vê o case concluído somente no dispositivo original.

**Causa raiz**

Fallback local sem protocolo de sincronização.

**Correção sugerida**

Implementar outbox idempotente e indicação explícita de sync pendente.

---

### [BUG-021] Dias esparsos fazem o sprint exibir dias não concluídos como concluídos

**Severidade:** Médio  
**Área:** Sprint / Progresso  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/js/gamificacao/sprintManager.js:99`](src/frontend/js/gamificacao/sprintManager.js#L99)
- [`src/frontend/js/gamificacao/sprintManager.js:209`](src/frontend/js/gamificacao/sprintManager.js#L209)
- [`src/frontend/js/gamificacao/sprintManager.js:397`](src/frontend/js/gamificacao/sprintManager.js#L397)

**Problema**

`currentDay = quantidade concluída + 1`, em vez do primeiro dia ausente. A UI marca dias anteriores ao currentDay como concluídos.

**Evidência**

O teste aceita `[1,2,14] → currentDay 4`; assim, o dia 3 pode aparecer concluído. Completar repetidamente um dia também incrementa `streakDays`.

**Como reproduzir**

Persistir dias 1, 2 e 14 e abrir a trilha.

**Impacto**

Estados impossíveis, desbloqueios falsos e streak inflado.

**Causa raiz**

Progresso sequencial inferido por contagem de um conjunto não sequencial.

**Correção sugerida**

Usar membership real por dia, validar pré-requisitos e tornar conclusão idempotente.

---

### [BUG-022] Grafo offline não cobre todas as páginas e datasets

**Severidade:** Médio  
**Área:** PWA / Offline

**Arquivos envolvidos:**

- [`src/frontend/pwa/sw.js:5`](src/frontend/pwa/sw.js#L5)
- [`src/frontend/pwa/sw.js:30`](src/frontend/pwa/sw.js#L30)

**Problema**

Sete das 17 páginas fonte não estão no precache: case view, profile, settings, simulator hub, simulator room, study now e o fragmento scratch. JSONs de labs, cases, badges e taxonomia canônica também não entram na allowlist lazy.

**Evidência**

JSON não allowlisted é explicitamente ignorado pelo Service Worker.

**Como reproduzir**

Instalar a PWA online, ficar offline antes de abrir essas áreas e acessá-las.

**Impacto**

Partes centrais falham offline apesar da proposta PWA.

**Causa raiz**

A lista de cache é manual e não deriva do manifesto de páginas e assets do build.

**Correção sugerida**

Gerar o precache no build e testar cada rota/asset em um contexto realmente offline e sem HTTP cache prévio.

---

### [BUG-023] Revalidação em background não está ligada ao ciclo de vida do evento

**Severidade:** Médio  
**Área:** PWA / Atualização  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/pwa/sw.js:126`](src/frontend/pwa/sw.js#L126)
- [`src/frontend/pwa/sw.js:75`](src/frontend/pwa/sw.js#L75)

**Problema**

Quando há cache, o worker cria a Promise de atualização e retorna imediatamente, sem `event.waitUntil(update)`. `skipWaiting` e `clients.claim` ainda permitem que uma versão nova controle documentos antigos já abertos.

**Evidência**

O navegador pode encerrar o worker antes de `cache.put`; HTML antigo pode conviver com JavaScript novo.

**Como reproduzir**

Abrir uma versão, publicar outra e simular encerramento do worker ou reload parcial.

**Impacto**

Assets permanecem antigos ou versões incompatíveis são misturadas.

**Causa raiz**

Estratégia stale-while-revalidate incompleta e ativação imediata sem coordenação da UI.

**Correção sugerida**

Prender a atualização ao evento e implementar política explícita de “nova versão disponível/recarregar”.

---

### [BUG-024] Fallback 404 do Pages perde a rota original

**Severidade:** Médio  
**Área:** Navegação / Deploy

**Arquivos envolvidos:**

- [`src/frontend/pwa/404.html:8`](src/frontend/pwa/404.html#L8)
- [`src/frontend/js/app.js:235`](src/frontend/js/app.js#L235)

**Problema**

`/repo/cases` vira `/?cases`, mas o app só interpreta parâmetros nomeados como `mode`, `cert`, `persona` e `offline`.

**Evidência**

O valor bare query nunca é convertido novamente em rota.

**Como reproduzir**

Acessar diretamente uma rota sem extensão.

**Impacto**

O usuário cai na home ou login, não na página solicitada.

**Causa raiz**

Redirecionador e roteador usam protocolos diferentes.

**Correção sugerida**

Redirecionar com parâmetro nomeado ou adotar roteamento compatível com Pages.

---

### [BUG-025] Internacionalização de cases e simulador é parcial

**Severidade:** Médio  
**Área:** PT/EN

**Arquivos envolvidos:**

- [`src/frontend/pages/cases.html:169`](src/frontend/pages/cases.html#L169)
- [`src/frontend/pages/case-view.html:923`](src/frontend/pages/case-view.html#L923)
- [`e2e/cases.spec.js:4`](e2e/cases.spec.js#L4)

**Problema**

Títulos de conteúdo mudam de idioma, mas cards, erros, conclusão e explicações permanecem hardcoded em português.

**Evidência**

O E2E valida somente que o título do case mudou.

**Como reproduzir**

Selecionar inglês, abrir ou concluir um case e provocar um erro.

**Impacto**

Interface e conteúdo ficam code-mixed.

**Causa raiz**

i18n foi aplicada ao dataset, mas não a todos os estados da página.

**Correção sugerida**

Inventariar todas as strings e testar estados normal, vazio, loading, erro e conclusão em PT/EN.

---

### [BUG-026] CI referencia caminhos antigos dos bancos de questões

**Severidade:** Médio  
**Área:** CI / Governança / Deploy

**Arquivos envolvidos:**

- [`.github/workflows/prevent-main-file-edits.yml:5`](.github/workflows/prevent-main-file-edits.yml#L5)
- [`.github/workflows/stats-report.yml:31`](.github/workflows/stats-report.yml#L31)
- [`.github/workflows/deploy-pages.yml:117`](.github/workflows/deploy-pages.yml#L117)

**Problema**

Workflows procuram `data/*.json`, enquanto os bancos estão em `data/questions/*.json`.

**Evidência**

A proteção não detecta edições reais e o relatório `jq` tenta abrir arquivos inexistentes. O smoke de deploy não inclui Simulator Hub.

**Como reproduzir**

Alterar apenas `data/questions/...` em PR ou executar o workflow de estatísticas.

**Impacto**

Controles de governança não são acionados e páginas quebradas podem ser publicadas.

**Causa raiz**

Reorganização de diretórios sem atualização dos workflows.

**Correção sugerida**

Fazer workflows consumirem o mesmo manifesto do build e do validador.

---

### [BUG-027] Histórico corrompido é apagado silenciosamente

**Severidade:** Médio  
**Área:** Persistência / Tratamento de erros

**Arquivos envolvidos:**

- [`src/frontend/js/storageManager.js:558`](src/frontend/js/storageManager.js#L558)

**Problema**

JSON inválido ou valor que não seja array leva à remoção da chave e retorno de histórico vazio.

**Evidência**

Não há backup, quarantine, export ou aviso ao usuário.

**Como reproduzir**

Interromper ou esgotar uma gravação, ou inserir valor truncado na chave de histórico.

**Impacto**

Perda aparente e irreversível do histórico naquele navegador.

**Causa raiz**

A estratégia de recuperação equivale a apagar o dado defeituoso.

**Correção sugerida**

Preservar cópia corrompida, registrar diagnóstico e oferecer recuperação ou reset consciente.

---

### [BUG-028] Foreign key usa `SET NULL` sobre coluna da chave primária

**Severidade:** Médio  
**Área:** Banco  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`backend/database/schema.sql:673`](backend/database/schema.sql#L673)

**Problema**

`case_questions.question_id` compõe a chave primária, portanto é não nula, mas a FK declara `ON DELETE SET NULL`.

**Evidência**

Uma exclusão física tenta produzir um estado proibido pela própria tabela.

**Como reproduzir**

Vincular uma questão a um case e apagar fisicamente a questão.

**Impacto**

A exclusão falha em runtime e pode abortar migração ou manutenção.

**Causa raiz**

Ação referencial incompatível com a nulabilidade.

**Correção sugerida**

Escolher `CASCADE`, `RESTRICT` ou remodelar a associação conforme a política editorial.

---

## BAIXO

### [BUG-029] Cliente descarta mensagens de erro retornadas como `error`

**Severidade:** Baixo  
**Área:** Tratamento de erros

**Arquivos envolvidos:**

- [`src/frontend/js/services/api.js:153`](src/frontend/js/services/api.js#L153)
- [`backend/api/server.js:117`](backend/api/server.js#L117)

**Problema**

O cliente lê `data.message`; várias respostas usam `{error}`.

**Evidência**

Nesses casos sobra somente “HTTP NNN”.

**Como reproduzir**

Provocar um erro de autenticação ou erro global.

**Impacto**

Diagnóstico ruim e mensagens pouco úteis.

**Causa raiz**

Envelope de erro não padronizado.

**Correção sugerida**

Definir schema único e fallback para `message`, `error` e código estruturado.

---

### [BUG-030] ID duplicado na página de cases

**Severidade:** Baixo  
**Área:** DOM / Acessibilidade

**Arquivos envolvidos:**

- [`src/frontend/pages/cases.html:106`](src/frontend/pages/cases.html#L106)

**Problema**

`cases-diagnostic-context` aparece duas vezes.

**Evidência**

`getElementById` e seletores de ID encontram somente a primeira ocorrência de forma útil.

**Como reproduzir**

Consultar o DOM da página.

**Impacto**

Atualização pode atingir o painel errado e a árvore DOM fica inválida.

**Causa raiz**

Duplicação de bloco visual.

**Correção sugerida**

Usar IDs únicos e seleção por classe ou data attribute quando houver múltiplos contextos.

---

### [BUG-031] Fragmento scratch é publicado como página

**Severidade:** Baixo  
**Área:** Build / Código morto

**Arquivos envolvidos:**

- [`src/frontend/pages/scratch_quiz_block.html`](src/frontend/pages/scratch_quiz_block.html)
- [`scripts/build.cjs:168`](scripts/build.cjs#L168)

**Problema**

O build copia todo `*.html`, incluindo um fragmento scratch sem navegação conhecida.

**Evidência**

Ele aparece explicitamente entre os 17 artefatos do build.

**Como reproduzir**

Executar build em cópia isolada e abrir a URL correspondente.

**Impacto**

Superfície pública não intencional e ruído de manutenção.

**Causa raiz**

Descoberta automática por extensão sem manifesto de páginas.

**Correção sugerida**

Usar allowlist de entradas; validar antes se o arquivo ainda tem consumidor.

---

### [BUG-032] Dados de nivelamento e engine interativa parecem legado não integrado

**Severidade:** Baixo  
**Área:** Código morto / Dados carregados

**Arquivos envolvidos:**

- [`src/frontend/pwa/sw.js:41`](src/frontend/pwa/sw.js#L41)
- [`scripts/validation/validate_data_consistency.mjs:491`](scripts/validation/validate_data_consistency.mjs#L491)
- [`src/frontend/js/gamificacao/interactiveEngine.js:90`](src/frontend/js/gamificacao/interactiveEngine.js#L90)

**Problema**

Oito datasets de nivelamento são cacheados, embora o Diagnostic V2 use o banco principal. `interactiveEngine.js` não possui importador encontrado e concede `lab_master`, ausente do catálogo de badges.

**Evidência**

Referências aos datasets ficam no SW, validador e tradutor, não no loader atual.

**Como reproduzir**

Rastrear imports e referências a partir das páginas publicadas.

**Impacto**

Cache e manutenção de conteúdo aparentemente não utilizado.

**Causa raiz**

Versões paralelas mantidas após migração.

**Correção sugerida**

Confirmar telemetria e consumidores antes de arquivar ou remover.

---

### [BUG-033] Dependências CDN duplicadas e não fixadas

**Severidade:** Baixo  
**Área:** Performance / Supply chain  
**Classificação:** **BUG LATENTE**

**Arquivos envolvidos:**

- [`src/frontend/pages/jornada.html:141`](src/frontend/pages/jornada.html#L141)
- [`src/frontend/pages/index.html:970`](src/frontend/pages/index.html#L970)

**Problema**

Chart.js e confetti são carregados duas vezes em jornada; páginas usam `sortablejs@latest`. Não há SRI e recursos externos não são controlados pelo SW.

**Evidência**

Tags duplicadas e versão `latest` no HTML.

**Como reproduzir**

Inspecionar Network ou simular CDN indisponível.

**Impacto**

Downloads e execução duplicados e mudança futura não controlada.

**Causa raiz**

Dependências incluídas diretamente por página sem inventário central.

**Correção sugerida**

Fixar versões, eliminar duplicatas e decidir política de bundle, SRI e offline.

---

### [BUG-034] Manifest possui somente ícone não quadrado

**Severidade:** Baixo  
**Área:** PWA  
**Classificação:** **POTENCIAL PROBLEMA — REQUER VALIDAÇÃO**

**Arquivos envolvidos:**

- [`src/frontend/pwa/manifest.json:12`](src/frontend/pwa/manifest.json#L12)

**Problema**

Há apenas um ícone 199×200 declarado como `any maskable`, sem tamanhos quadrados usuais 192×192 e 512×512.

**Evidência**

O manifesto passa no validador interno, mas o conjunto é insuficiente para garantir boa instalação em todas as plataformas.

**Como reproduzir**

Executar auditoria de instalação em Chrome/Android e Safari/iOS reais.

**Impacto**

Ícone cortado, distorcido ou instalação não promovida em alguns clientes.

**Causa raiz**

A validação interna verifica presença, não compatibilidade multiplataforma.

**Correção sugerida**

Gerar ícones quadrados separados para `any` e `maskable` e validar em navegadores reais.

---

## Segurança — classificação consolidada

| Risco | Classificação |
| --- | --- |
| Login por e-mail sem prova de identidade | Crítico confirmado |
| Injeção ou repetição de questões no score | Alto confirmado |
| Stored XSS no quiz | Alto, bug latente |
| Token no `localStorage` | Amplifica o impacto de XSS |
| Secrets versionados | Nenhum segredo real encontrado nos arquivos rastreados; somente placeholders |
| Dependências npm conhecidas | `npm audit` e `npm audit --omit=dev`: 0 vulnerabilidades |
| FastAPI paralelo | Potencial problema, descrito abaixo |

### POTENCIAL PROBLEMA — REQUER VALIDAÇÃO

O backend legado [`backend/api/main.py:26`](backend/api/main.py#L26) usa origem CORS `*` com credenciais e recebe `user_id`, score e `is_correct` do cliente em rotas sem autenticação aparente.

Ele não está conectado aos scripts Node ou ao deploy atual, portanto não foi classificado como vulnerabilidade ativa. Se esse FastAPI estiver implantado em qualquer ambiente, deve ser tratado como risco crítico.

---

## MELHORIA ESTRUTURAL

Os oito conflitos arquiteturais centrais são:

1. Contratos de quiz online e local representam entidades diferentes.
2. `DataRepository` expõe uma interface parcialmente síncrona e parcialmente assíncrona.
3. Local e servidor são ambos tratados como fonte autoritativa, sem política de conflitos.
4. Quiz iniciado e quiz concluído são a mesma entidade ou estado no banco.
5. XP, badges e streak têm implementações locais e remotas incompatíveis.
6. Governança de dados valida forma e contagem, mas não idioma ou aderência à certificação.
7. Express/PGlite e FastAPI/PostgreSQL coexistem como backends paralelos.
8. Build, Service Worker, CI e rotas mantêm listas independentes de páginas e datasets.

Também há declaração duplicada de trigger no schema e `docker-compose.yml` representa apenas PostgreSQL, enquanto o fluxo Node documentado usa PGlite. Não há evidência de falha ativa por esses dois pontos, mas são sinais de drift.

---

## Auditoria dos dados

### Verificações estruturais que passaram

Nos oito bancos de questões:

- IDs ausentes: 0
- IDs duplicados dentro do arquivo: 0
- Índices de resposta correta inválidos: 0
- Alternativas duplicadas dentro da mesma questão: 0

Inventário validado:

| Dataset | Quantidade |
| --- | ---: |
| Questões totais | 2.498 |
| CLF-C02 PT/EN | 394 / 394 |
| SAA-C03 PT/EN | 285 / 285 |
| DVA-C02 PT/EN | 284 / 284 |
| AIF-C01 PT/EN | 286 / 286 |
| Labs | 18 |
| Cases | 25 |
| Builder cases | 25 |
| Flashcards | 170 |
| Dicas | 143 |
| Serviços | 241 |
| Dias de sprint | 56 |

O validador retornou zero erros, warnings ou content gaps e quatro diagnósticos `LEGACY`. Apesar disso, BUG-011 e BUG-012 passaram porque a validação não compreende o significado do texto.

Os IDs compartilhados entre PT/EN são inconsistentes — CLF 105, SAA 0, DVA 0, AIF 2. Isso não prova um bug funcional, mas dificulta rastreabilidade, diff de tradução e correção sincronizada.

---

## Testes: o que não está sendo testado

A suíte passa porque vários testes verificam componentes isolados ou até codificam o comportamento defeituoso:

- O teste de API confirma que `correct_answer` foi omitido, mas não passa essa resposta pelo `QuizEngine`.
- O teste do loader usa mocks compatíveis, não a resposta real do Express.
- O teste de account sync considera correto o servidor sempre vencer, sem timestamps.
- O teste de sprint aceita `[1,2,14] → currentDay 4`.
- O teste PWA verifica strings específicas no Service Worker, não o grafo offline completo.
- O E2E usa frontend estático e não integra Express/PGlite.
- O Simulator Hub não faz parte do E2E.
- A troca de idioma de cases verifica o título, não mensagens e estados auxiliares.

### Cobertura ausente prioritária

1. Resposta real de `POST /api/quiz/start` atravessando o QuizEngine e a UI.
2. Tentativa de impersonação por e-mail.
3. Membership de questões e repetição de respostas.
4. Abandono, retomada e finalização do quiz.
5. Retry de respostas offline.
6. Conflito entre abas e dispositivos.
7. Migração da identidade offline para online.
8. Streak hoje ou ontem e fuso horário.
9. Labs visualizados fora da certificação ativa.
10. Todos os níveis do Simulator Hub em base path de Pages.
11. Contrato cliente ou servidor do avaliador.
12. Cada rota PWA instalada, offline e após atualização.
13. Validação semântica de idioma e certificação.
14. Workflows CI usando os caminhos canônicos atuais.

### Cobertura medida

```text
Statements : 49.57% (3454/6967)
Branches   : 45.09% (2388/5295)
Functions  : 56.68% (704/1242)
Lines      : 51.00% (3287/6445)
```

Todos os 389 testes passaram, mas o comando saiu com código 1 porque statements ficaram abaixo do mínimo global de 50%.

---

## Build, CI e comandos executados

| Comando | Resultado |
| --- | --- |
| `git status --short --branch` | Limpo |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npm run validate:data` | PASS |
| `npm run validate:pwa` | PASS |
| `npm test -- --runInBand` | PASS — 50 suites, 389 testes |
| `npm audit --omit=dev` | PASS — 0 vulnerabilidades |
| `npm audit` | PASS — 0 vulnerabilidades |
| `npm run build` | PASS em cópia temporária isolada |
| `npm run test:e2e` | PASS em cópia temporária — 17/17 |
| `npm run test:coverage -- --coverageDirectory C:\Users\KARLA~1.ROS\AppData\Local\Temp\cloudacademy-coverage-summary-4718a2887c034a63a3ee45d186c3757c --coverageReporters=text-summary --silent --runInBand` | FAIL somente no threshold |
| `git status --short --branch; git diff --stat; git diff --cached --stat` | Nenhuma alteração |

O build e E2E foram executados em cópia temporária porque `npm run build` normalmente regenera `public/`. A cópia e os relatórios temporários foram removidos depois.

O probe Playwright direcionado ao Simulator Hub encontrou inicialmente `spawn EPERM` dentro do sandbox; a repetição autorizada fora desse bloqueio executou e confirmou os três 404. Isso não afetou o E2E completo, que passou em cópia isolada.

---

## Matriz final

| ID | Severidade | Área | Problema | Impacto | Arquivo principal | Confiança |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | Crítico | Auth | Login somente por e-mail | Impersonação e elevação por conta existente | `auth.js` | ALTA |
| BUG-002 | Crítico | Quiz/API | API fornece questão rejeitada pelo engine | Quiz online inutilizável | `quizzes.js` | ALTA |
| BUG-003 | Alto | Score/API | Resposta sem membership ou unicidade | Score manipulável | `quizzes.js` | ALTA |
| BUG-004 | Alto | Progresso | Quiz iniciado conta como concluído | Estatísticas falsas | `schema.sql` | ALTA |
| BUG-005 | Alto | Sync | Remoto sobrescreve local sem versão | Perda silenciosa | `dataRepository.js` | ALTA |
| BUG-006 | Alto | Identidade | Novo ID em todo login offline | Progresso desaparece | `userManager.js` | ALTA |
| BUG-007 | Alto | Gamificação | XP e badges têm duas fontes | Telas inconsistentes | `profile.html` | ALTA |
| BUG-008 | Alto | Streak | Não verifica dias consecutivos | Streak e badges incorretos | `storageManager.js` | ALTA |
| BUG-009 | Alto | Labs | Certificação local diferente da remota | Progresso cruzado | `laboratorios.js` | ALTA |
| BUG-010 | Alto | Pages | Imports quebrados no Simulator Hub | Página sem níveis | `simulator-hub.html` | ALTA |
| BUG-011 | Alto | Dados/i18n | CLF EN majoritariamente PT | Conteúdo em idioma errado | `clf-c02-en.json` | ALTA |
| BUG-012 | Alto | Dados | Conteúdo AIF dentro de SAA | Preparação e analytics errados | `saa-c03.json` | ALTA |
| BUG-013 | Alto | XSS | Questões entram em `innerHTML` | Execução de script e roubo de token | `app.js` | ALTA |
| BUG-014 | Alto | Offline | Respostas pendentes nunca reenviadas | Backend incompleto | `quizManager.js` | ALTA |
| BUG-015 | Médio | Quiz | Filtros ignorados e sem random | Simulados repetitivos | `db.js` | ALTA |
| BUG-016 | Médio | Simulador | Nove cartões viram três cases | Cenário errado | `simulator-hub.html` | ALTA |
| BUG-017 | Médio | Simulador/API | Contrato de avaliação divergente | Feedback incorreto | `engine.js` | ALTA |
| BUG-018 | Médio | Estado | Promise tratada como booleano | Gamificação duplicada | `app.js` | ALTA |
| BUG-019 | Médio | Seed | Correção editorial não atualiza DB | Conteúdo divergente | `seed-pglite.mjs` | ALTA |
| BUG-020 | Médio | Cases | Conclusão sem retry | Estado apenas local | `caseManager.js` | ALTA |
| BUG-021 | Médio | Sprint | Contagem usada como sequência | Dias e desbloqueios falsos | `sprintManager.js` | ALTA |
| BUG-022 | Médio | PWA | Precache e JSON incompletos | Áreas falham offline | `sw.js` | ALTA |
| BUG-023 | Médio | PWA | Revalidação sem `waitUntil` | Cache antigo ou misto | `sw.js` | MÉDIA |
| BUG-024 | Médio | Rotas | 404 e app discordam | Deep link perdido | `404.html` | ALTA |
| BUG-025 | Médio | i18n | Estados de cases hardcoded PT | Interface code-mixed | `case-view.html` | ALTA |
| BUG-026 | Médio | CI | Workflows usam caminhos antigos | Governança inoperante | workflows | ALTA |
| BUG-027 | Médio | Storage | Corrupção apaga histórico | Perda de dados local | `storageManager.js` | ALTA |
| BUG-028 | Médio | Banco | `SET NULL` em PK | Exclusão falha | `schema.sql` | ALTA |
| BUG-029 | Baixo | Erros | `error` não é exibido | Diagnóstico genérico | `api.js` | ALTA |
| BUG-030 | Baixo | DOM | ID duplicado | Atualização ambígua | `cases.html` | ALTA |
| BUG-031 | Baixo | Build | Scratch publicado | Superfície não intencional | `build.cjs` | ALTA |
| BUG-032 | Baixo | Legado | Dados ou engine sem consumidor | Drift e cache inútil | `sw.js` | MÉDIA |
| BUG-033 | Baixo | CDN | Duplicação e `@latest` | Regressão externa | `jornada.html` | ALTA |
| BUG-034 | Baixo | PWA | Ícone único não quadrado | Instalação inconsistente | `manifest.json` | MÉDIA |
| POT-001 | A validar | FastAPI | CORS, auth e score confiado ao cliente | Crítico se implantado | `main.py` | BAIXA |

---

## Top 10 problemas para corrigir primeiro

1. **BUG-001** — substituir autenticação por e-mail.
2. **BUG-003** — impedir injeção e repetição de respostas e score.
3. **BUG-002** — alinhar o contrato completo do quiz online.
4. **BUG-005** — impedir sobrescrita de progresso local mais novo.
5. **BUG-006** — estabilizar e migrar identidade offline.
6. **BUG-013** — eliminar stored XSS no conteúdo do quiz.
7. **BUG-004** — separar quiz iniciado, abandonado e concluído.
8. **BUG-007** — unificar XP, badges, streak e leaderboard.
9. **BUG-014** — implementar sincronização confiável de respostas pendentes.
10. **BUG-012** — corrigir a classificação do banco SAA-C03.

BUG-011, BUG-009, BUG-010 e BUG-018 devem entrar imediatamente depois, antes de expandir funcionalidades.

---

## Plano de correção

### Fase 1 — Bugs críticos

- Definir autenticação real e modelo de autorização.
- Especificar o contrato público e privado do quiz.
- Criar estado de ciclo de vida do quiz.
- Persistir o conjunto de questões e tornar respostas idempotentes.
- Cobrir tudo com testes de integração frontend/API/PGlite.

### Fase 2 — Integridade de dados

- Auditar SAA-C03 contra o blueprint oficial.
- Corrigir o conteúdo inglês CLF-C02.
- Criar validação semântica de idioma e certificação.
- Versionar conteúdo e permitir que seeds atualizem campos editoriais.
- Corrigir FK incompatível e caminhos antigos dos workflows.

### Fase 3 — Estado e arquitetura

- Escolher fonte canônica para XP, badges, streak e progresso.
- Corrigir facade assíncrona e consumidores.
- Criar identidade offline estável.
- Implementar versionamento, merge e outbox.
- Tornar cases, labs, quizzes e sprints idempotentes.

### Fase 4 — PWA/offline

- Gerar precache automaticamente a partir do build.
- Cobrir todas as páginas e datasets realmente offline.
- Corrigir revalidação e política de ativação.
- Corrigir base path do Simulator Hub e fallback 404.
- Fixar dependências externas e completar ícones.

### Fase 5 — Testes e prevenção de regressão

- Adicionar integração real API → frontend.
- Testar abuso de autenticação e score.
- Testar refresh, abandono, retry e conflitos entre dispositivos.
- Executar E2E sob o base path real do Pages.
- Testar cada rota em contexto offline limpo e após update do Service Worker.
- Corrigir o gate atual de cobertura sem reduzir o threshold.
- Fazer CI consumir os mesmos manifestos e contratos da aplicação.

---

## Estado da entrega

Esta auditoria não implementa correções. Qualquer mudança de código, dados, schema, build ou deploy depende de autorização posterior e deve ser executada por fases, começando pelos riscos críticos.
