import { storageManager } from '../storageManager.js';

// 1. DICIONÁRIO DE TRILHAS (4 Certificações com suporte Bilingue)
export const TRAILS_BY_CERT = {
    'clf-c02': [
        { id: 'clf-1', title: { pt: 'Conceitos Cloud', en: 'Cloud Concepts' }, icon: 'fa-cloud' },
        { id: 'clf-2', title: { pt: 'Segurança & Compliance', en: 'Security & Compliance' }, icon: 'fa-shield-halved' },
        { id: 'clf-3', title: { pt: 'Tecnologia Cloud', en: 'Cloud Technology' }, icon: 'fa-server' },
        { id: 'clf-4', title: { pt: 'Faturamento e Preços', en: 'Billing and Pricing' }, icon: 'fa-file-invoice-dollar' },
        { id: 'clf-final', title: { pt: 'Simulado Final CLF', en: 'Final Exam CLF' }, icon: 'fa-flag-checkered' }
    ],
    'saa-c03': [
        { id: 'saa-1', title: { pt: 'Arquitetura Segura', en: 'Secure Architecture' }, icon: 'fa-lock' },
        { id: 'saa-2', title: { pt: 'Arquitetura Resiliente', en: 'Resilient Architecture' }, icon: 'fa-network-wired' },
        { id: 'saa-3', title: { pt: 'Alta Performance', en: 'High-Performing' }, icon: 'fa-bolt' },
        { id: 'saa-4', title: { pt: 'Otimização de Custos', en: 'Cost-Optimized' }, icon: 'fa-piggy-bank' },
        { id: 'saa-final', title: { pt: 'Simulado Final SAA', en: 'Final Exam SAA' }, icon: 'fa-flag-checkered' }
    ],
    'aif-c01': [
        { id: 'aif-1', title: { pt: 'Fundamentos de IA/ML', en: 'AI/ML Fundamentals' }, icon: 'fa-brain' },
        { id: 'aif-2', title: { pt: 'Casos de Uso da AWS', en: 'AWS Use Cases' }, icon: 'fa-lightbulb' },
        { id: 'aif-3', title: { pt: 'Segurança em IA', en: 'Security in AI' }, icon: 'fa-user-shield' },
        { id: 'aif-4', title: { pt: 'Uso Responsável', en: 'Responsible AI' }, icon: 'fa-scale-balanced' },
        { id: 'aif-final', title: { pt: 'Simulado Final AIF', en: 'Final Exam AIF' }, icon: 'fa-flag-checkered' }
    ],
    'dva-c02': [
        { id: 'dva-1', title: { pt: 'Desenvolvimento AWS', en: 'AWS Development' }, icon: 'fa-code' },
        { id: 'dva-2', title: { pt: 'Segurança no Código', en: 'Security in Code' }, icon: 'fa-file-code' }, // CORRIGIDO AQUI
        { id: 'dva-3', title: { pt: 'Implantação (CI/CD)', en: 'Deployment (CI/CD)' }, icon: 'fa-rocket' },
        { id: 'dva-4', title: { pt: 'Troubleshooting', en: 'Troubleshooting' }, icon: 'fa-bug' },
        { id: 'dva-final', title: { pt: 'Simulado Final DVA', en: 'Final Exam DVA' }, icon: 'fa-flag-checkered' }
    ]
};

// Nomes oficiais para o título da tela
const CERT_NAMES = {
    'clf-c02': 'Cloud Practitioner',
    'saa-c03': 'Solutions Architect',
    'aif-c01': 'AI Practitioner',
    'dva-c02': 'Developer Associate'
};

export function renderTrail() {
    const container = document.getElementById('trail-render-area');
    const certSelect = document.getElementById('certification-select');
    
    if (!container) return;

    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';
    
    // Tratamento rigoroso do ID para não quebrar a busca
    const currentCertId = certSelect && certSelect.value ? certSelect.value.toLowerCase().trim() : 'clf-c02';
    const activeTrail = TRAILS_BY_CERT[currentCertId] || TRAILS_BY_CERT['clf-c02'];

    const tituloJornada = document.querySelector('#screen-jornada h2');
    if (tituloJornada) {
        const titleText = currentLang === 'en' ? 'Journey' : 'Jornada';
        // Fallback seguro caso o nome não seja encontrado
        const certName = CERT_NAMES[currentCertId] || 'Cloud Practitioner'; 
        tituloJornada.innerHTML = `<i class="fa-solid fa-map-location-dot text-aws-orange mr-2"></i> ${titleText} ${certName}`;
    }

    let gamification = storageManager.getGamification();
    const firstStageId = activeTrail[0].id;
    
    if (!gamification.unlockedStages) {
        gamification.unlockedStages = [firstStageId];
        gamification.completedStages = [];
    } else if (!gamification.unlockedStages.includes(firstStageId) && gamification.unlockedStages.length === 0) {
        gamification.unlockedStages.push(firstStageId);
    }

    let html = '';
    
    activeTrail.forEach((stage, index) => {
        const isCompleted = gamification.completedStages.includes(stage.id);
        const isUnlocked = gamification.unlockedStages.includes(stage.id);
        const isActive = isUnlocked && !isCompleted;

        let stateClass = 'locked';
        let iconHtml = `<i class="fa-solid fa-lock"></i>`;

        const isBoss = stage.id.includes('final');

        if (isCompleted) {
            stateClass = `completed ${isBoss ? 'boss-node' : ''}`;
            iconHtml = `<i class="fa-solid fa-check"></i>`;
        } else if (isActive) {
            stateClass = `active ${isBoss ? 'boss-node' : ''}`;
            iconHtml = isBoss ? `<i class="fa-solid fa-crown"></i>` : `<i class="fa-solid ${stage.icon}"></i>`;
        } else if (isBoss) {
            stateClass += ' boss-node'; // Aplica o estilo mesmo quando travado
        }

        // Prevenção extra de 'undefined' no título dos nós
        const stageTitle = (stage.title && stage.title[currentLang]) ? stage.title[currentLang] : 'Módulo AWS';

        let clickAction = '';
        if (isUnlocked) {
            // Removemos espaços e caracteres especiais que podem quebrar o clique HTML
            const safeTitle = stageTitle.replace(/[^a-zA-Z0-9 ]/g, ""); 
            clickAction = `onclick="startTrailMission('${stage.id}', '${safeTitle}')"`;
        }

        html += `
            <div class="trail-node-wrapper ${isUnlocked ? 'unlock-animation' : ''}" style="animation-delay: ${index * 0.1}s">
                <div class="trail-node ${stateClass}" title="${stageTitle}" ${clickAction}>
                    ${iconHtml}
                </div>
                <div class="trail-node-title">${stageTitle}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

export function unlockNextModule(currentLevelId) {
    let gamification = storageManager.getGamification();
    const certSelect = document.getElementById('certification-select');
    const currentCertId = certSelect ? certSelect.value : 'clf-c02';
    const activeTrail = TRAILS_BY_CERT[currentCertId] || TRAILS_BY_CERT['clf-c02'];
    
    if (!gamification.completedStages) gamification.completedStages = [];
    if (!gamification.unlockedStages) gamification.unlockedStages = [activeTrail[0].id];

    if (!gamification.completedStages.includes(currentLevelId)) {
        gamification.completedStages.push(currentLevelId);
    }
    
    const currentIndex = activeTrail.findIndex(s => s.id === currentLevelId);
    if (currentIndex >= 0 && currentIndex < activeTrail.length - 1) {
        const nextLevelId = activeTrail[currentIndex + 1].id;
        if (!gamification.unlockedStages.includes(nextLevelId)) {
            gamification.unlockedStages.push(nextLevelId);
        }
    }
    
    const storageKey = storageManager._getKey ? storageManager._getKey('gamification') : 'aws_sim_gamification';
    localStorage.setItem(storageKey, JSON.stringify(gamification));
    
    renderTrail(); 
}

window.unlockNextModule = unlockNextModule;