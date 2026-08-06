/**
 * modules/hub.js — Learning Hub module entry point
 *
 * Carrega o app.js (que inicializa o SPA e popula window.*)
 * e documenta explicitamente as funções que o Learning Hub utiliza.
 *
 * O app.js é a fonte de verdade — este módulo não duplica lógica.
 * Quando o app.js for progressivamente dividido, os imports serão
 * migrados aqui de forma incremental.
 *
 * Funções usadas pelo Hub via window.* ou onclick inline:
 *   - window.showLearningHub()        — exibe o painel hub
 *   - window.showScreen(name)         — navega entre screens
 *   - window.goHome()                 — volta ao hub
 *   - window.updateSidebarProgress()  — atualiza painel de progresso
 *   - window.updateSidebarTexts()     — atualiza textos i18n na sidebar
 *   - window.clearHistory()           — limpa histórico de simulados
 *   - window.removeHistoryItem(e, i)  — remove item do histórico
 *   - window.startMistakesQuiz()      — inicia revisão de erros (hub-quick-mistakes)
 *   - showLearningHubQuickStart()     — atalho do banner (definida no app.js, não em window)
 *
 * @module hub
 */

// Nenhum import adicional — o app.js é carregado diretamente pelo HTML.
// Este arquivo serve como documentação de módulo e ponto de extensão futuro.
