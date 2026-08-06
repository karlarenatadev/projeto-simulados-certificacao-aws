/**
 * modules/diagnostico.js — Raio-X (Diagnóstico) module entry point
 *
 * Documenta as funções do app.js usadas pela página diagnostico.html.
 * O app.js e Chart.js são carregados diretamente pelo HTML e populam window.*.
 *
 * Funções usadas pelo Diagnóstico via window.* ou onclick:
 *
 * Diagnóstico:
 *   - window.startDiagnostic()           — inicia o quiz de nivelamento
 *
 * Gerado dinamicamente pelo app.js após o diagnóstico:
 *   - btn-start-personalized-diagnostic-quiz — gerado por renderDiagnosticReport()
 *     ao clicar, chama startPersonalizedDiagnosticQuiz() (não em window.*, interno)
 *
 * Navegação:
 *   - window.showScreen(name)            — navega entre screens do SPA
 *   - window.goHome()                    — volta ao hub
 *
 * Canvas requerido no DOM:
 *   - id="radarChart"                    — gráfico radar do diagnóstico
 *
 * @module diagnostico
 */

// Nenhum import adicional — o app.js é carregado diretamente pelo HTML.
// Este arquivo serve como documentação de módulo e ponto de extensão futuro.
