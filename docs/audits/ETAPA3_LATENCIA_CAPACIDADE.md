# Etapa 3 — investigação de latência e capacidade

**Data:** 13–14/10/2026. **Estado:** medições locais sintéticas; sem deploy ou acesso AWS.

## Conclusão executiva

O p99 de 28,8 s da Etapa 2 não representa a latência do Express/PGlite isolados: o ensaio anterior executava o cliente de carga e a aplicação no mesmo processo Node, compartilhando event loop, CPU e memória. O cliente agora roda em contêiner separado e usa um `http.Agent` com até uma conexão por usuário virtual. No primeiro ensaio isolado com 150 usuários, p99 caiu para 2,78 s; na matriz pós-correção mais recente, o p99 de 150 foi **3,77 s**, enquanto o p95 foi **3,01 s**. Isso confirma que 28,8 s era fortemente contaminado pelo gerador, mas também mostra saturação do event loop sob 150 usuários.

A evidência anterior está em `docs/audits/evidence/2026-10-13/resources-linux-full-stage2.json`: p99 28.797,63 ms e event loop p99 610,8 ms. A implementação `worker()` em `scripts/diagnostics/deploy-resource-audit.mjs` inicializava Express/PGlite e também chamava `fetch()`/`Promise.all()` no mesmo processo usado para medir CPU, memória e atraso do event loop. Assim, esse p99 mistura tempo do servidor, fila de conexões/execução do gerador e espera local. A nova matriz separa o processo cliente (1 CPU, 768 MiB) do servidor (2 CPU, 4 GiB); mesmo assim, o ensaio mede uma máquina Docker local, não clientes reais ou rede AWS.

Para o degrau operacional de 30 usuários, a rajada pós-correção mais recente mediu p95 de **0,384 s** e p99 de **2,736 s**, sem falhas ou duplicações. O p99 passou por margem menor que o p95 e variou entre execuções; um p99 isolado não constitui homologação. O processo API consumiu aproximadamente um núcleo durante a rajada, com event loop utilization de 98,99%; o RSS medido foi 536,82 MiB. O soak sintético completou **30,19 minutos** com 30 VUs, p95 de 51 ms, p99 de 261 ms, 900 quizzes e 9.000 respostas persistidas, sem falhas ou duplicações.

A correção aplicada remove uma consulta duplicada de quiz na rota de resposta. `recordAnswer` já bloqueia e valida dono/estado dentro da transação. No ensaio comparável de 30 usuários, essa mudança eliminou 300 `SELECT quiz_history` para 300 respostas. A queda observada do p95 de `/answer` (787 ms para 248 ms) é promissora, mas não pode ser atribuída quantitativamente só a essa consulta: houve uma execução de cada lado e variação no p99 agregado. Não alterei cálculo de nota, persistência, regras de propriedade nem limites de concorrência.

## O que foi medido

| Usuários | p50 total HTTP | p95 total HTTP | p99 total HTTP |  RPS | RSS Node | Event loop utilization | p99 de atraso do event loop | Falhas / duplicatas |
| -------: | -------------: | -------------: | -------------: | ---: | -------: | ---------------------: | --------------------------: | ------------------: |
|       10 |         118 ms |         276 ms |         631 ms | 65,3 |  495 MiB |                  98,4% |                      172 ms |               0 / 0 |
|       30 |         149 ms |         384 ms |       2.736 ms | 96,1 |  537 MiB |                  99,0% |                      272 ms |               0 / 0 |
|       50 |         578 ms |         937 ms |       1.118 ms | 82,4 |  601 MiB |                  98,0% |                      972 ms |               0 / 0 |
|      150 |       1.674 ms |       3.009 ms |       3.769 ms | 80,0 |  616 MiB |                  99,3% |                    3.041 ms |               0 / 0 |

Os valores acima vêm da mesma execução com quatro rajadas sequenciais, não de testes estatísticos repetidos. A execução integral está em `docs/audits/evidence/2026-10-13/stage3/` e a primeira matriz separada antes da correção está em `before-route-optimization/`. Em cada etapa, 10 respostas por usuário foram submetidas, finalizadas e verificadas no PGlite. Os deltas persistidos foram, respectivamente, 10/100, 30/300, 50/500 e 150/1.500 usuários/respostas. Não houve quizzes iniciados pendentes, resposta sem vínculo, duplicação ou erro HTTP.

**Limites do ambiente:** Linux x64, Node 24.21.0, imagem `node:24-bookworm-slim`, Docker local em host Intel i5-1135G7; API/PGlite limitada a 2 vCPU e 4 GiB, carga limitada separadamente a 1 vCPU e 768 MiB. Isto não é uma instância AWS, não testa Graviton, EBS gp3, rede corporativa ou proxy corporativo. O teste de rajada tem zero pausa entre respostas; o ensaio sustentado usa 5 s entre respostas. `docker stats` fornece CPU, memória, rede e bloco acumulados; não fornece IOPS ou latência de disco por consulta.

## Localização do custo

`backend/database/performanceMetrics.js` adiciona instrumentação opt-in. `queryRows` em `backend/database/db.js` mede duração de `executor.query` (inclui o tempo observado dentro da chamada, portanto a espera interna que o PGlite expõe junto à execução), enquanto as transações de iniciar, responder e finalizar têm métricas próprias. A API mede duração do middleware ao `finish`, por rota. O endpoint de métricas e o endpoint de integridade só existem quando `NODE_ENV=test` e `CLOUDACADEMY_PERF_DIAGNOSTICS=1`; ambos exigem token sintético e não existem no modo normal.

Na matriz de 150, `recordAnswer` teve média de 12,41 ms e máximo de 49,89 ms por transação; o percentil 99 fica no bucket de até 50 ms. A rota HTTP de resposta teve média de 15,24 ms, máximo de 60,03 ms e percentil 99 no bucket de até 50 ms. Em contrapartida, o atraso p99 do event loop foi 3,04 s e o contêiner ficou próximo de 100% de um núcleo (amostras Docker: média 100,5%, pico 110,8%). A divergência entre as medições mostra espera antes do middleware/entrega do socket e pausas do event loop; não há uma consulta individual de vários segundos.

Na mesma matriz, os SQL mais frequentes foram `SELECT quiz_questions` (4.650 chamadas, média 1,39 ms), `SELECT users` (3.300, 1,69 ms), `SELECT quiz_history` (1.950, 1,49 ms), `SELECT questions` (1.800, 1,49 ms), `SELECT answers` (1.800, 1,46 ms), `UPDATE quiz_history` (1.650, 1,69 ms) e `INSERT answers` (1.500, 1,36 ms). Os máximos desses rótulos ficaram abaixo de 22 ms. As transações de criação e conclusão tiveram médias de 9,29 ms e 8,15 ms. Os p95/p99 SQL e de transações são buckets superiores de histograma, não percentis exatos.

Na mesma matriz, os SQL mais frequentes foram `SELECT quiz_questions` (4.650 chamadas, média 1,39 ms), `SELECT users` (3.300, 1,69 ms), `SELECT quiz_history` (1.950, 1,49 ms), `SELECT questions` (1.800, 1,49 ms), `SELECT answers` (1.800, 1,46 ms), `UPDATE quiz_history` (1.650, 1,69 ms) e `INSERT answers` (1.500, 1,36 ms). Os máximos observados nesses rótulos ficaram abaixo de 22 ms. As transações de criação e conclusão tiveram médias de 9,29 ms e 8,15 ms. Os p95/p99 SQL e das transações são buckets superiores de histograma (p.ex., até 50 ms), não percentis exatos.

`recordAnswer` mantém uma transação curta e serializada por quiz (`SELECT ... FOR UPDATE`), mas cada resposta executa várias consultas: validação do quiz e da questão, membership, idempotência, INSERT, agregação do conjunto respondido, contagem de membership e UPDATE do resumo. Não há contenção do mesmo lock entre VUs porque cada VU tem quiz próprio; não foi observado lock longo. `createQuizWithQuestions` executa inserções sequenciais de vínculo para no máximo 10 itens, um custo limitado. `/stats` faz consultas agregadas, mas não apresenta N+1 por questão. A seleção de questões tem índices de certificação/idioma e a associação `quiz_questions` usa índices/chaves existentes; este teste não mostra gargalo de índice. Os SQL foram medidos individualmente e agregados por verbo/tabela; o PGlite não expõe tempo de fila separado do tempo de execução nem wait events.

O principal limite observado é CPU/event loop do único processo Node/PGlite sob rajada, não RSS, corrupção, I/O comprovadamente lento ou transação longa. A hipótese é consistente com utilization próxima de 100% e com o p99 do atraso do event loop crescer de 0,27 s em 30 VUs para 3,04 s em 150. O Docker local não permite concluir que adicionar CPU AWS eliminará pausas do event loop, especialmente porque a lógica JavaScript/PGlite usa um event loop principal.

## Antes e depois da correção

| Medida em 30 usuários          |  Antes |   Depois | Interpretação                                                                       |
| ------------------------------ | -----: | -------: | ----------------------------------------------------------------------------------- |
| `SELECT quiz_history` agregado |    690 |      390 | Foram removidas 300 leituras repetidas para 300 respostas, uma por resposta.        |
| p50 HTTP de `/answer`          | 477 ms |   146 ms | Redução observada em uma amostra de cada lado.                                      |
| p95 HTTP de `/answer`          | 787 ms |   248 ms | Redução observada; precisa repetição controlada para atribuição causal.             |
| p99 HTTP de `/answer`          | 921 ms |   273 ms | Redução observada; execução única, sujeita a ruído de cliente/host.                 |
| p99 agregado                   | 932 ms | 2.736 ms | Piorou por uma cauda de login/conexão na execução posterior; segue abaixo de 3,5 s. |

Os resultados completos estão nas duas versões dos arquivos `matrix-30.json`. O p99 agregado é o conjunto de todas as requisições do gerador; o p99 da rota API é medido do middleware Express ao fim da resposta. Não confundir os dois relógios. O maior custo do cenário de 150 é o número de operações no único processo durante rajada, não uma query lenta individual.

## Sustentação, capacidade e aceitação

| Critério operacional proposto para 30 VUs                           | Evidência atual                                                                           | Estado                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| p95 ≤ 1,5 s                                                         | 0,384 s na rajada; 51 ms no soak de 30 min                                                | Passou nos dois ensaios                 |
| p99 ≤ 3,5 s                                                         | 2,736 s na rajada; 261 ms no soak de 30 min                                               | Passou nos dois ensaios, repetir em AWS |
| RSS ≤ 1,5 GiB                                                       | 537 MiB no Node; cliente separado                                                         | Passou na rajada                        |
| Sem falhas, duplicatas e resposta perdida                           | 30 quizzes, 300 respostas, contagens e vínculos validados no PGlite                       | Passou na rajada                        |
| Estabilidade por pelo menos 30 min, sem crescimento contínuo de RSS | 30,19 min; RSS Docker amostrado 423–601 MiB, 563 MiB final; sem tendência crescente       | Passou no ensaio sintético              |
| Sem corrupção após crash/restart PGlite sintético                   | Commit pré-crash recuperado; transação aberta revertida; gravação pós-recovery persistida | Passou em diretório sintético local     |

Durante o soak, 285 amostras Docker registraram CPU média de 7,8% de um núcleo e pico de 104,6% em rajadas; event loop utilization final de 8,06%, atraso p99 de 31,9 ms, RSS do processo de 598 MiB e heap de 43 MiB. O diretório PGlite sintético mediu 61.632.605 bytes aos ~8 min e 64.073.821 bytes aos ~24 min. Esses pontos não substituem uma medida final do volume e não projetam crescimento real.

150 VUs é estresse. A última matriz de 150 excedeu os limites de latência sugeridos para operação (p95 3,01 s; p99 3,77 s), sem perda de dados. Não deve ser usada como número de usuários operacionais. A capacidade de staging mínima tecnicamente candidata continua sendo 2 vCPU/4 GiB, mas ainda não foi validada em AWS e depende da homologação da instância/rede corporativa. 4 GiB não foi necessário para memória neste ensaio (RSS máximo observado ~616 MiB); a RAM adicional é reserva de sistema operacional, PGlite, cache e crescimento do banco, não uma demanda medida de 1,5 GiB.

## Testes e próximos gates

- `npm test -- --runInBand`: **98 suites passaram, 841 testes passaram; 8 suites e 107 testes foram ignorados pela configuração existente**. A primeira execução falhou em 3 suites no sandbox por `spawn EPERM` ou inicialização PGlite isolada; as 3 passaram na reexecução local (33/33 testes). `api.integration.test.js` passou.
- Matriz Linux local separada: 10/30/50/150 VUs; todos os fluxos completos, 0 respostas duplicadas/sem membership e contagens sintéticas persistidas corretas. Evidência bruta JSON e amostras `docker stats` em `docs/audits/evidence/2026-10-13/stage3/`.
- Um primeiro soak de 1,89 min foi invalidado por conflito de versão do progresso no próprio gerador; está preservado como `soak-30m-incomplete-version-conflict.json` e **não conta**. O gerador agora lê/atualiza a versão CAS e valida deltas de integridade.
- Soak válido: 30,19 min, 30 VUs, 5 s entre respostas, 900 quizzes concluídos e 9.000 respostas; integridade confirmada, zero duplicatas, sem quizzes pendentes ou respostas fora do membership.
- Crash kill/recovery: `pglite-crash-recovery.mjs` passou em `dataDir` temporário sintético; não simula perda de host, dispositivo, snapshot AWS ou restauração externa.
- ESLint direto nos arquivos de backend/harness: encontrou 2 erros em `backend/database/db.js` (`setTimeout` sem global configurado e `answersMatch` não utilizado), além de avisos `no-console`; nenhum erro está nos trechos modificados. O lint termina com erro e permanece como pendência de qualidade.

Comando reproduzível do ensaio Linux, usando apenas rede Docker local, banco descartável e usuários com e-mails sintéticos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/diagnostics/run-stage3-linux.ps1
```

O script cria uma rede Docker própria, constrói uma imagem Node 24 de produção com os arquivos necessários, limita a API a 2 CPU/4 GiB, limita o cliente a 1 CPU/768 MiB, executa os quatro degraus, amostra `docker stats` e mantém o banco dentro do filesystem efêmero do contêiner. Não é um comando de deploy e não usa credenciais AWS.

## Alterações e arquivos envolvidos

- `backend/api/routes/quizzes.js`: remove leitura duplicada anterior à transação em `POST /:id/answer`; propriedade, estado e membership continuam validados no caminho transacional.
- `backend/database/db.js`: instrumenta `queryRows` e as transações de iniciar/responder/finalizar sem alterar contrato quando o diagnóstico está desligado.
- `backend/api/server.js`: instrumentação HTTP e endpoints locais de diagnóstico condicionais a `NODE_ENV=test` mais flag explícita.
- `backend/database/performanceMetrics.js`: histograma limitado de SQL/HTTP/transação e métricas de CPU, RSS, heap, ELU e atraso do event loop.
- `scripts/diagnostics/stage3-*` e `Dockerfile.stage3*`: carga externa à API e harness Linux com limites reproduzíveis.

Nenhum banco real, configuração AWS, dependência de produto, índice ou regra funcional foi alterado. A eventual evolução para reduzir mais operações por resposta precisa preservar o cálculo parcial de nota/domínios, idempotência, transações e isolamento; este relatório não recomenda retirar a agregação autoritativa sem uma mudança funcional testada.
