import { storageManager } from '../storageManager.js';

// Catálogo de Insígnias (Mistura conquistas de performance com conquistas de módulos)
const BADGE_CATALOG = [
    { 
        id: 'perfect', type: 'performance', icon: 'fa-star', color: 'text-yellow-400', bg: 'bg-yellow-500/10',
        title: { pt: '100% Perfeita', en: 'Perfect 100%' }, 
        desc: { pt: 'Gabaritou um simulado inteiro.', en: 'Aced an entire exam simulation.' } 
    },
    { 
        id: 'dedicated', type: 'performance', icon: 'fa-book-open', color: 'text-blue-400', bg: 'bg-blue-500/10',
        title: { pt: 'Dedicada', en: 'Dedicated' }, 
        desc: { pt: 'Completou 10 simulados oficiais.', en: 'Completed 10 official quizzes.' } 
    },
    { 
        id: 'streak', type: 'performance', icon: 'fa-fire', color: 'text-orange-500', bg: 'bg-orange-500/10',
        title: { pt: 'No Foco', en: 'On Fire' }, 
        desc: { pt: 'Aprovada 5 vezes consecutivas.', en: 'Passed 5 times in a row.' } 
    },
    { 
        id: 'clf-1', type: 'stage', icon: 'fa-cloud', color: 'text-sky-400', bg: 'bg-sky-500/10',
        title: { pt: 'Especialista Cloud', en: 'Cloud Specialist' }, 
        desc: { pt: 'Dominou os conceitos Cloud.', en: 'Mastered Cloud concepts.' } 
    },
    { 
        id: 'clf-2', type: 'stage', icon: 'fa-shield-halved', color: 'text-emerald-400', bg: 'bg-emerald-500/10',
        title: { pt: 'Defensora IAM', en: 'IAM Defender' }, 
        desc: { pt: 'Protegeu a infraestrutura.', en: 'Secured the infrastructure.' } 
    },
    { 
        id: 'saa-3', type: 'stage', icon: 'fa-bolt', color: 'text-purple-400', bg: 'bg-purple-500/10',
        title: { pt: 'Alta Performance', en: 'High Performance' }, 
        desc: { pt: 'Arquitetou redes escaláveis.', en: 'Architected scalable networks.' } 
    },
    { 
        id: 'saa-4', type: 'stage', icon: 'fa-piggy-bank', color: 'text-pink-400', bg: 'bg-pink-500/10',
        title: { pt: 'Arquiteta Econômica', en: 'Cost Architect' }, 
        desc: { pt: 'Otimizou os custos AWS.', en: 'Optimized AWS billing.' } 
    },
    { 
        id: 'clf-final', type: 'stage', icon: 'fa-certificate', color: 'text-aws-orange', bg: 'bg-orange-500/10',
        title: { pt: 'Cloud Practitioner', en: 'Cloud Practitioner' }, 
        desc: { pt: 'Pronta para a prova oficial.', en: 'Ready for the official exam.' } 
    }
];

export function renderBadges() {
    const container = document.getElementById('gamificacao-badges-grid');
    if (!container) return;

    // Recupera dados do Storage
    const gamification = storageManager.getGamification() || {};
    const earnedBadges = gamification.badges || [];
    const completedStages = gamification.completedStages || [];
    
    // Identifica o idioma
    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';

    let html = '';

    BADGE_CATALOG.forEach(badge => {
        // Verifica se a insígnia foi conquistada com base no tipo
        const isEarned = badge.type === 'stage' 
            ? completedStages.includes(badge.id) 
            : earnedBadges.includes(badge.id);

        const title = badge.title[currentLang];
        const desc = badge.desc[currentLang];

        // Lógica Visual: Se não ganhou, fica cinza e com opacidade reduzida
        const glassClass = isEarned 
            ? 'badge-glass border-opacity-30' 
            : 'badge-glass opacity-50 grayscale border-opacity-10 cursor-not-allowed';
            
        const iconColor = isEarned ? badge.color : 'text-gray-400';
        const bgClass = isEarned ? badge.bg : 'bg-gray-100 dark:bg-slate-700/30';
        
        // Ícone de cadeado para as não conquistadas
        const lockHtml = isEarned 
            ? '' 
            : `<div class="absolute top-3 right-3 text-gray-400 dark:text-gray-500 text-xs"><i class="fa-solid fa-lock"></i></div>`;

        html += `
            <div class="relative ${glassClass} ${bgClass} p-5 flex flex-col items-center justify-center text-center transition-all h-full min-h-[140px]">
                ${lockHtml}
                <i class="fa-solid ${badge.icon} badge-icon ${iconColor} text-3xl mb-3 transition-transform hover:scale-110"></i>
                <h4 class="font-bold text-sm text-aws-dark dark:text-white mb-1 tracking-wide">${title}</h4>
                <p class="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 leading-tight">${desc}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}