import { glossaryTerms } from './data.js';

// Movemos o estado específico dos flashcards para cá!
let flashcardState = {
    index: 0,
    flipped: false
};

// Recebe a função showScreen do app.js para poder mudar a tela
export function startFlashcards(showScreenFn) {
    // VALIDAÇÃO: Verifica se glossaryTerms existe e é um array válido
    if (!glossaryTerms || !Array.isArray(glossaryTerms) || glossaryTerms.length === 0) {
        alert('Nenhum termo disponível no glossário.');
        return;
    }
    
    flashcardState.index = 0;
    flashcardState.flipped = false;
    
    // VALIDAÇÃO: Verifica se showScreenFn é uma função
    if (typeof showScreenFn === 'function') {
        showScreenFn('flashcards');
    }
    
    loadFlashcard();
}

export function loadFlashcard() {
    // VALIDAÇÃO: Verifica se glossaryTerms existe e é válido
    if (!glossaryTerms || !Array.isArray(glossaryTerms) || glossaryTerms.length === 0) {
        alert('Nenhum termo disponível no glossário.');
        return;
    }
    
    // VALIDAÇÃO: Verifica se o índice está dentro dos limites
    if (flashcardState.index < 0 || flashcardState.index >= glossaryTerms.length) {
        console.warn('Índice de flashcard inválido. Resetando para 0.');
        flashcardState.index = 0;
    }
    
    const card = glossaryTerms[flashcardState.index];
    
    // VALIDAÇÃO: Verifica se o card existe e tem as propriedades necessárias
    if (!card || !card.term || !card.definition) {
        console.error('Flashcard inválido no índice:', flashcardState.index);
        return;
    }
    
    // VALIDAÇÃO DOM: Verifica se elementos existem antes de manipular
    const termEl = document.getElementById('flashcard-term');
    const definitionEl = document.getElementById('flashcard-definition');
    const counterEl = document.getElementById('flashcard-counter');
    const cardContainer = document.getElementById('flashcard-container');
    
    if (termEl) termEl.textContent = card.term;
    if (definitionEl) definitionEl.textContent = card.definition;
    if (counterEl) counterEl.textContent = `${flashcardState.index + 1} / ${glossaryTerms.length}`;
    
    if (cardContainer) {
        cardContainer.classList.remove('flipped');
        flashcardState.flipped = false;
    }
    
    updateFlashcardButtons();
}

export function flipFlashcard() {
    const cardContainer = document.getElementById('flashcard-container');
    if (cardContainer) {
        cardContainer.classList.toggle('flipped');
        flashcardState.flipped = !flashcardState.flipped;
    }
}

export function nextFlashcard() {
    // VALIDAÇÃO: Verifica se glossaryTerms existe
    if (!glossaryTerms || !Array.isArray(glossaryTerms)) {
        console.warn('glossaryTerms não disponível em nextFlashcard');
        return;
    }
    
    if (flashcardState.index < glossaryTerms.length - 1) {
        flashcardState.index++;
        loadFlashcard();
    }
}

export function prevFlashcard() {
    if (flashcardState.index > 0) {
        flashcardState.index--;
        loadFlashcard();
    }
}

function updateFlashcardButtons() {
    // VALIDAÇÃO: Verifica se glossaryTerms existe
    if (!glossaryTerms || !Array.isArray(glossaryTerms)) {
        console.warn('glossaryTerms não disponível em updateFlashcardButtons');
        return;
    }
    
    // VALIDAÇÃO DOM: Verifica se elementos existem
    const prevBtn = document.getElementById('btn-prev-flashcard');
    const nextBtn = document.getElementById('btn-next-flashcard');
    
    if (prevBtn) {
        prevBtn.disabled = flashcardState.index === 0;
        prevBtn.classList.toggle('opacity-50', flashcardState.index === 0);
        prevBtn.classList.toggle('cursor-not-allowed', flashcardState.index === 0);
    }
    
    if (nextBtn) {
        nextBtn.disabled = flashcardState.index === glossaryTerms.length - 1;
        nextBtn.classList.toggle('opacity-50', flashcardState.index === glossaryTerms.length - 1);
        nextBtn.classList.toggle('cursor-not-allowed', flashcardState.index === glossaryTerms.length - 1);
    }
}