import { glossaryTerms, certificationPaths } from './data.js';
import { t } from './i18n/useTranslation.js';

function getCurrentLanguage() {
    return localStorage.getItem('aws_sim_lang') || 'pt';
}

// ESTADO CENTRALIZADO DOS FLASHCARDS
let flashcardState = {
    index: 0,
    flipped: false,
    filteredTerms: [],
    currentDomainFilter: 'all'
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
export function startFlashcards(showScreenFn) {
    if (!glossaryTerms || glossaryTerms.length === 0) {
        alert(t('no_terms_available', getCurrentLanguage()) || "Nenhum termo disponível.");
        return;
    }
    
    if (typeof showScreenFn === 'function') {
        showScreenFn('flashcards');
    }

    const categorySelect = document.getElementById('flashcard-category');
    if (categorySelect && !categorySelect.dataset.listenerAdded) {
        categorySelect.addEventListener('change', filterFlashcards);
        categorySelect.dataset.listenerAdded = 'true';
    }

    setupFlashcardListeners();
    filterFlashcards();
}

// ==========================================
// MOTOR DE FILTRAGEM (Certificação + Domínio)
// ==========================================
export function filterFlashcards() {
    const certSelect = document.getElementById('certification-select');
    const categorySelect = document.getElementById('flashcard-category');
    
    const selectedCert = certSelect ? certSelect.value : 'clf-c02';
    const selectedDomain = categorySelect ? categorySelect.value : 'all';

    // --- NOVO: Atualiza a Badge visual no topo da tela ---
    const certBadge = document.getElementById('flashcards-cert-badge');
    if (certBadge) {
        certBadge.textContent = selectedCert.toUpperCase();
    }

    flashcardState.currentDomainFilter = selectedDomain;

    flashcardState.filteredTerms = glossaryTerms.filter(card => {
        const matchCert = card.cert === 'all' || card.cert === selectedCert;
        const matchDomain = selectedDomain === 'all' || card.domain === selectedDomain;
        return matchCert && matchDomain;
    });

    flashcardState.filteredTerms.sort(() => Math.random() - 0.5);

    flashcardState.index = 0;
    flashcardState.flipped = false;

    if (flashcardState.filteredTerms.length === 0) {
        const errorMsg = getCurrentLanguage() === 'en' 
            ? "No cards found for this category." 
            : "Nenhum cartão encontrado para esta categoria.";
        alert(errorMsg);
        
        if (categorySelect) {
            categorySelect.value = 'all';
            filterFlashcards(); 
        }
        return;
    }

    renderCurrentFlashcard();
}

// ==========================================
// RENDERIZAÇÃO DO CARD NA TELA
// ==========================================
export function renderCurrentFlashcard() {
    const terms = flashcardState.filteredTerms;
    if (terms.length === 0) return;

    const card = terms[flashcardState.index];
    const currentLang = getCurrentLanguage();

    const termEl = document.getElementById('flashcard-term');
    const defEl = document.getElementById('flashcard-definition');
    const badgeEl = document.getElementById('flashcard-domain-badge');

    if (termEl) termEl.textContent = card.term[currentLang];
    if (defEl) defEl.textContent = card.definition[currentLang];

    if (badgeEl) {
        const certId = card.cert === 'all' ? (document.getElementById('certification-select')?.value || 'clf-c02') : card.cert;
        const certInfo = certificationPaths[certId];
        const domainObj = certInfo?.domains.find(d => d.id === card.domain);
        
        badgeEl.textContent = domainObj ? domainObj.name : (currentLang === 'en' ? 'General Term' : 'Termo Geral');
    }

    const container = document.getElementById('flashcard-container');
    if (container) {
        if (flashcardState.flipped) {
            container.classList.add('flipped');
        } else {
            container.classList.remove('flipped');
        }
    }

    updateCounterAndButtons();
}

// ==========================================
// NAVEGAÇÃO E INTERAÇÃO
// ==========================================
export function flipFlashcard() {
    const cardContainer = document.getElementById('flashcard-container');
    if (cardContainer) {
        cardContainer.classList.toggle('flipped');
        flashcardState.flipped = !flashcardState.flipped;
    }
}

export function nextFlashcard() {
    if (flashcardState.index < flashcardState.filteredTerms.length - 1) {
        flashcardState.index++;
        flashcardState.flipped = false;
        renderCurrentFlashcard();
    }
}

export function prevFlashcard() {
    if (flashcardState.index > 0) {
        flashcardState.index--;
        flashcardState.flipped = false;
        renderCurrentFlashcard();
    }
}

function updateCounterAndButtons() {
    const total = flashcardState.filteredTerms.length;
    
    const counterEl = document.getElementById('flashcard-counter');
    if (counterEl) {
        counterEl.textContent = `${flashcardState.index + 1} / ${total}`;
    }

    const prevBtn = document.getElementById('btn-prev-flashcard');
    const nextBtn = document.getElementById('btn-next-flashcard');

    if (prevBtn) {
        const isFirst = flashcardState.index === 0;
        prevBtn.disabled = isFirst;
        prevBtn.classList.toggle('opacity-50', isFirst);
        prevBtn.classList.toggle('cursor-not-allowed', isFirst);
    }

    if (nextBtn) {
        const isLast = flashcardState.index === total - 1;
        nextBtn.disabled = isLast;
        nextBtn.classList.toggle('opacity-50', isLast);
        nextBtn.classList.toggle('cursor-not-allowed', isLast);
    }
}

export function reloadCurrentFlashcard() {
    renderCurrentFlashcard();
}

export function filterFlashcardsByCert() {
    // Função fantasma. O app.js tenta importar isso na linha 352 e usar na 678.
    // Manter isso aqui impede que todo o simulador quebre.
    console.log("Filtro legado acionado. Agora a filtragem é automatizada pelo dropdown.");
}

// ==========================================
// CONEXÃO DOS BOTÕES (EVENT LISTENERS)
// ==========================================
function setupFlashcardListeners() {
    const nextBtn = document.getElementById('btn-next-flashcard');
    const prevBtn = document.getElementById('btn-prev-flashcard');
    const homeBtn = document.getElementById('btn-flashcards-home');

    if (nextBtn && !nextBtn.dataset.bound) {
        nextBtn.addEventListener('click', nextFlashcard);
        nextBtn.dataset.bound = 'true'; 
    }
    
    if (prevBtn && !prevBtn.dataset.bound) {
        prevBtn.addEventListener('click', prevFlashcard);
        prevBtn.dataset.bound = 'true';
    }

    // 🚨 ATENÇÃO: O bloco de código que ouvia o 'cardContainer' foi removido daqui!
    // O seu arquivo app.js (na linha 110) já faz isso de forma perfeita, incluindo atalhos de teclado!

    if (homeBtn && !homeBtn.dataset.bound) {
        homeBtn.addEventListener('click', () => {
            if (typeof window.goHome === 'function') {
                window.goHome();
            } else {
                document.getElementById('screen-flashcards').classList.add('hidden');
                const startScreen = document.getElementById('screen-start');
                if(startScreen) startScreen.classList.remove('hidden');
            }
        });
        homeBtn.dataset.bound = 'true';
    }
}

// ==========================================
// EXPORTAÇÃO PARA ANKI
// ==========================================
export function exportToAnki() {
    const terms = flashcardState.filteredTerms;
    if (terms.length === 0) {
        alert("Não há flashcards filtrados para exportar.");
        return;
    }

    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';
    
    // Cabeçalho e conteúdo do CSV (Termo;Definição;Tags)
    // Ponto e vírgula como delimitador para evitar conflitos com vírgulas nas definições
    let csvContent = "Termo;Definicao;Tags\n";

    terms.forEach(card => {
        const term = card.term[currentLang].replace(/;/g, ','); // Limpeza de ponto e vírgula
        const definition = card.definition[currentLang].replace(/;/g, ',');
        const tags = `AWS,${card.cert},${card.domain.replace(/\s+/g, '_')}`;
        
        csvContent += `"${term}";"${definition}";"${tags}"\n`;
    });

    // Gera o arquivo para download
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Anki_AWS_Deck_${flashcardState.currentDomainFilter}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Expõe globalmente para o botão do HTML
window.exportToAnki = exportToAnki;