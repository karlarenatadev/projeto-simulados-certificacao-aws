/**
 * modules/flashcards.js — Flashcards module entry point
 *
 * Documenta as funções do app.js e flashcards.js usadas pela página flashcards.html.
 * O app.js e pomodoroManager.js são carregados diretamente pelo HTML e populam window.*.
 *
 * Funções usadas pelos Flashcards via window.* ou onclick:
 *
 * Navegação de cartões (app.js → window.*):
 *   - window.startFlashcards()           — inicializa a tela de flashcards
 *   - window.flipFlashcard()             — vira o cartão atual
 *   - window.nextFlashcard()             — avança para o próximo cartão
 *   - window.prevFlashcard()             — volta ao cartão anterior
 *   - window.filterFlashcardsByCert(c)   — filtra cartões por certificação
 *   - window.startSmartFlashcards(d)     — inicia revisão inteligente por domínios
 *
 * Exportação (flashcards.js → window.*):
 *   - window.exportToAnki()              — exporta deck para formato Anki
 *
 * Navegação (app.js → window.*):
 *   - window.showScreen(name)            — navega entre screens do SPA
 *   - window.goHome()                    — volta ao hub
 *
 * @module flashcards
 */

// Nenhum import adicional — o app.js é carregado diretamente pelo HTML.
// Este arquivo serve como documentação de módulo e ponto de extensão futuro.
