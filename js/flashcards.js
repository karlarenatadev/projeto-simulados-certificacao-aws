import { glossaryTerms } from './data.js';
import { t } from './i18n/useTranslation.js';

// Get current language from localStorage
function getCurrentLanguage() {
    return localStorage.getItem('aws_sim_lang') || 'pt';
}

// Movemos o estado específico dos flashcards para cá!
let flashcardState = {
    index: 0,
    flipped: false,
    filteredTerms: [],
    currentFilter: 'all'
};

// Recebe a função showScreen do app.js para poder mudar a tela
export function startFlashcards(showScreenFn) {
    // VALIDAÇÃO: Verifica se glossaryTerms existe e é um array válido
    if (!glossaryTerms || !Array.isArray(glossaryTerms) || glossaryTerms.length === 0) {
        alert(t('no_terms_available', getCurrentLanguage()));
        return;
    }
    
    flashcardState.index = 0;
    flashcardState.flipped = false;
    flashcardState.currentFilter = 'general'; // Inicia com Termos Gerais
    // Filtra apenas termos gerais (cert === 'all')
    flashcardState.filteredTerms = glossaryTerms.filter(term => term.cert === 'all');
    
    // VALIDAÇÃO: Verifica se showScreenFn é uma função
    if (typeof showScreenFn === 'function') {
        showScreenFn('flashcards');
    }
    
    renderCertificationFilter();
    loadFlashcard();
}

// Nova função para renderizar filtro de certificação
function renderCertificationFilter() {
    const filterContainer = document.getElementById('flashcard-filter');
    if (!filterContainer) return;
    
    // Conta termos por categoria
    const counts = {
        all: glossaryTerms.length,
        general: glossaryTerms.filter(t => t.cert === 'all').length,
        'clf-c02': glossaryTerms.filter(t => t.cert === 'clf-c02').length,
        'saa-c03': glossaryTerms.filter(t => t.cert === 'saa-c03').length,
        'dva-c02': glossaryTerms.filter(t => t.cert === 'dva-c02').length,
        'aif-c01': glossaryTerms.filter(t => t.cert === 'aif-c01').length
    };
    
    const certifications = [
        { id: 'all', name: t('all_terms', getCurrentLanguage()), icon: '📚', count: counts.all },
        { id: 'general', name: t('general_terms', getCurrentLanguage()), icon: '🌐', count: counts.general },
        { id: 'clf-c02', name: t('cloud_practitioner', getCurrentLanguage()), icon: '☁️', count: counts['clf-c02'] },
        { id: 'saa-c03', name: t('solutions_architect', getCurrentLanguage()), icon: '🏗️', count: counts['saa-c03'] },
        { id: 'dva-c02', name: t('developer', getCurrentLanguage()), icon: '💻', count: counts['dva-c02'] },
        { id: 'aif-c01', name: t('ai_practitioner', getCurrentLanguage()), icon: '🤖', count: counts['aif-c01'] }
    ];
    
    filterContainer.innerHTML = certifications.map(cert => `
        <button 
            class="px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                flashcardState.currentFilter === cert.id 
                    ? 'bg-aws-orange text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
            }"
            onclick="window.filterFlashcardsByCert('${cert.id}')"
            title="${cert.name} (${cert.count} termos)"
        >
            <span class="mr-1">${cert.icon}</span>
            <span class="hidden sm:inline">${cert.name}</span>
            <span class="inline sm:hidden">${cert.name.split(' ')[0]}</span>
            <span class="ml-1 text-xs opacity-75">(${cert.count})</span>
        </button>
    `).join('');
}

// Nova função para filtrar flashcards por certificação
export function filterFlashcardsByCert(certId) {
    flashcardState.currentFilter = certId;
    
    if (certId === 'all') {
        // Mostra todos os termos
        flashcardState.filteredTerms = glossaryTerms;
    } else if (certId === 'general') {
        // Mostra APENAS termos gerais (aplicáveis a todas certificações)
        flashcardState.filteredTerms = glossaryTerms.filter(term => term.cert === 'all');
    } else {
        // Mostra APENAS termos específicos da certificação (SEM os gerais)
        flashcardState.filteredTerms = glossaryTerms.filter(term => term.cert === certId);
    }
    
    flashcardState.index = 0;
    flashcardState.flipped = false;
    
    renderCertificationFilter();
    loadFlashcard();
}

export function loadFlashcard() {
    // VALIDAÇÃO: Verifica se filteredTerms existe e é válido
    const terms = flashcardState.filteredTerms || glossaryTerms;
    
    if (!terms || !Array.isArray(terms) || terms.length === 0) {
        alert(t('no_terms_for_cert', getCurrentLanguage()));
        return;
    }
    
    // VALIDAÇÃO: Verifica se o índice está dentro dos limites
    if (flashcardState.index < 0 || flashcardState.index >= terms.length) {
        console.warn('Índice de flashcard inválido. Resetando para 0.');
        flashcardState.index = 0;
    }
    
    const card = terms[flashcardState.index];
    
    // VALIDAÇÃO: Verifica se o card existe e tem as propriedades necessárias
    if (!card || !card.term || !card.definition) {
        console.error('Flashcard inválido no índice:', flashcardState.index);
        return;
    }
    
    // Get current language
    const currentLang = getCurrentLanguage();
    
    // VALIDAÇÃO DOM: Verifica se elementos existem antes de manipular
    const termEl = document.getElementById('flashcard-term');
    const definitionEl = document.getElementById('flashcard-definition');
    const counterEl = document.getElementById('flashcard-counter');
    const cardContainer = document.getElementById('flashcard-container');
    
    if (termEl) termEl.textContent = card.term[currentLang];
    if (definitionEl) definitionEl.textContent = card.definition[currentLang];
    if (counterEl) counterEl.textContent = `${flashcardState.index + 1} / ${terms.length}`;
    
    // Preserva o estado de virado ao recarregar
    if (cardContainer) {
        if (flashcardState.flipped) {
            cardContainer.classList.add('flipped');
        } else {
            cardContainer.classList.remove('flipped');
        }
    }
    
    // Update click hints with current language
    const frontHint = document.querySelector('.flashcard-front .text-sm.italic');
    if (frontHint) frontHint.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_definition', currentLang)}`;
    
    const backHint = document.querySelector('.flashcard-back .text-sm.italic');
    if (backHint) backHint.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_term', currentLang)}`;
    
    const officialDef = document.querySelector('.flashcard-back .text-sm.uppercase');
    if (officialDef) officialDef.textContent = t('official_definition', currentLang);
    
    updateFlashcardButtons();
}

export function flipFlashcard() {
    const cardContainer = document.getElementById('flashcard-container');
    if (cardContainer) {
        cardContainer.classList.toggle('flipped');
        flashcardState.flipped = !flashcardState.flipped;
    }
}

// Nova função para recarregar flashcard quando idioma muda
export function reloadCurrentFlashcard() {
    updateFlashcardContent();
}

// Função para atualizar apenas o conteúdo do texto (sem resetar animação)
function updateFlashcardContent() {
    const terms = flashcardState.filteredTerms || glossaryTerms;
    if (!terms || !Array.isArray(terms) || terms.length === 0) return;
    
    const card = terms[flashcardState.index];
    if (!card || !card.term || !card.definition) return;
    
    const currentLang = getCurrentLanguage();
    
    const termEl = document.getElementById('flashcard-term');
    const definitionEl = document.getElementById('flashcard-definition');
    const counterEl = document.getElementById('flashcard-counter');
    
    if (termEl) termEl.textContent = card.term[currentLang];
    if (definitionEl) definitionEl.textContent = card.definition[currentLang];
    if (counterEl) counterEl.textContent = `${flashcardState.index + 1} / ${terms.length}`;
    
    // Update hints
    const frontHint = document.querySelector('.flashcard-front .text-sm.italic');
    if (frontHint) frontHint.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_definition', currentLang)}`;
    
    const backHint = document.querySelector('.flashcard-back .text-sm.italic');
    if (backHint) backHint.innerHTML = `<i class="fa-solid fa-hand-pointer mr-2"></i> ${t('click_to_see_term', currentLang)}`;
    
    const officialDef = document.querySelector('.flashcard-back .text-sm.uppercase');
    if (officialDef) officialDef.textContent = t('official_definition', currentLang);
    
    // Update filter buttons with new language
    renderCertificationFilter();
}

export function nextFlashcard() {
    const terms = flashcardState.filteredTerms || glossaryTerms;
    
    // VALIDAÇÃO: Verifica se terms existe
    if (!terms || !Array.isArray(terms)) {
        console.warn('Termos não disponíveis em nextFlashcard');
        return;
    }
    
    if (flashcardState.index < terms.length - 1) {
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
    const terms = flashcardState.filteredTerms || glossaryTerms;
    
    // VALIDAÇÃO: Verifica se terms existe
    if (!terms || !Array.isArray(terms)) {
        console.warn('Termos não disponíveis em updateFlashcardButtons');
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
        nextBtn.disabled = flashcardState.index === terms.length - 1;
        nextBtn.classList.toggle('opacity-50', flashcardState.index === terms.length - 1);
        nextBtn.classList.toggle('cursor-not-allowed', flashcardState.index === terms.length - 1);
    }
}