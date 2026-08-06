/**
 * modules/quiz.js — Simulados module entry point
 *
 * Documenta as funções do app.js usadas pela página simulados.html.
 * O app.js é carregado diretamente pelo HTML e popula window.*.
 *
 * Funções usadas pela página de simulados via window.* ou onclick:
 *
 * Configuração e início:
 *   - window.startQuiz()             — inicia simulado com as configurações atuais
 *   - window.showQuizConfig()        — exibe tela de configuração
 *   - window.startMistakesQuiz()     — inicia simulado de erros
 *   - window.clearMistakes()         — limpa histórico de erros
 *
 * Execução do quiz:
 *   - window.submitAnswer()          — confirma resposta selecionada
 *   - window.nextQuestion()          — avança para próxima questão
 *   - window.finishQuiz()            — encerra simulado e vai para resultados
 *   - window.cancelQuiz()            — cancela simulado em andamento
 *   - window.toggleFlag()            — marca/desmarca questão para revisão
 *
 * Resultados e histórico:
 *   - window.retakeQuiz()            — refaz o mesmo simulado
 *   - window.generatePerformanceReport() — gera PDF de desempenho
 *   - window.showLastReport(certId)  — exibe último relatório salvo
 *   - window.showHistoricalReport(i) — exibe relatório histórico por índice
 *
 * Navegação:
 *   - window.showScreen(name)        — navega entre screens do SPA
 *   - window.goHome()                — volta ao hub
 *   - window.updateSidebarProgress() — atualiza painel de progresso
 *   - window.updateSidebarTexts()    — atualiza textos i18n da sidebar
 *
 * @module quiz
 */

// Nenhum import adicional — o app.js é carregado diretamente pelo HTML.
// Este arquivo serve como documentação de módulo e ponto de extensão futuro.
