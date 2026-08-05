/**
 * modules/jornada.js — Jornada module entry point
 *
 * Documenta as funções do app.js usadas pela página jornada.html.
 * O app.js é carregado diretamente pelo HTML e popula window.*.
 *
 * Funções usadas pela Jornada via window.* ou onclick:
 *
 * Trilha e missões:
 *   - window.startJornada()              — inicializa a tela da jornada/trilha
 *   - window.startMission(stageId)       — inicia missão de um estágio
 *   - window.startTrailMission(stageId, stageTitle) — inicia missão pela trilha
 *   - window.completeSprintDay(day)      — marca dia do sprint como concluído
 *   - window.closeSprintReader()         — fecha o leitor do sprint
 *
 * Navegação:
 *   - window.showScreen(name)            — navega entre screens do SPA
 *   - window.goHome()                    — volta ao hub
 *
 * @module jornada
 */

// Nenhum import adicional — o app.js é carregado diretamente pelo HTML.
// Este arquivo serve como documentação de módulo e ponto de extensão futuro.
