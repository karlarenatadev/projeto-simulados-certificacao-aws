import { storageManager } from '../storageManager.js';

// Catálogo de Insígnias (Mistura conquistas de performance com conquistas de módulos)
const BADGE_CATALOG = [
    // ==========================================
    // PERFORMANCE GLOBAL (Independente da Certificação)
    // ==========================================
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
        id: 'speed', type: 'performance', icon: 'fa-stopwatch', color: 'text-rose-400', bg: 'bg-rose-500/10',
        title: { pt: 'The Flash', en: 'Speed Demon' }, 
        desc: { pt: 'Terminou um simulado na metade do tempo.', en: 'Finished a quiz in half the time.' } 
    },

    // ==========================================
    // AWS CLOUD PRACTITIONER (CLF-C02)
    // ==========================================
    { 
        id: 'clf-1', type: 'stage', cert: 'clf-c02', icon: 'fa-cloud', color: 'text-sky-400', bg: 'bg-sky-500/10',
        title: { pt: 'Especialista Cloud', en: 'Cloud Specialist' }, 
        desc: { pt: 'Dominou os conceitos globais.', en: 'Mastered global concepts.' } 
    },
    { 
        id: 'clf-2', type: 'stage', cert: 'clf-c02', icon: 'fa-shield-halved', color: 'text-emerald-400', bg: 'bg-emerald-500/10',
        title: { pt: 'Defensora IAM', en: 'IAM Defender' }, 
        desc: { pt: 'Dominou Segurança e Compliance.', en: 'Mastered Security & Compliance.' } 
    },
    { 
        id: 'clf-3', type: 'stage', cert: 'clf-c02', icon: 'fa-microchip', color: 'text-indigo-400', bg: 'bg-indigo-500/10',
        title: { pt: 'Tech Guru', en: 'Tech Guru' }, 
        desc: { pt: 'Dominou os serviços principais.', en: 'Mastered core services.' } 
    },
    { 
        id: 'clf-final', type: 'stage', cert: 'clf-c02', icon: 'fa-certificate', color: 'text-aws-orange', bg: 'bg-orange-500/10',
        title: { pt: 'Cloud Practitioner', en: 'Cloud Practitioner' }, 
        desc: { pt: 'Pronta para a prova oficial.', en: 'Ready for the official exam.' } 
    },

    // ==========================================
    //  AWS SOLUTIONS ARCHITECT (SAA-C03)
    // ==========================================
    { 
        id: 'saa-1', type: 'stage', cert: 'saa-c03', icon: 'fa-lock', color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        title: { pt: 'Arquiteta Segura', en: 'Secure Architect' }, 
        desc: { pt: 'Desenhou arquiteturas seguras.', en: 'Designed secure architectures.' } 
    },
    { 
        id: 'saa-2', type: 'stage', cert: 'saa-c03', icon: 'fa-network-wired', color: 'text-cyan-400', bg: 'bg-cyan-500/10',
        title: { pt: 'Alta Disponibilidade', en: 'Highly Available' }, 
        desc: { pt: 'Criou sistemas resilientes.', en: 'Created resilient systems.' } 
    },
    { 
        id: 'saa-3', type: 'stage', cert: 'saa-c03', icon: 'fa-bolt', color: 'text-purple-400', bg: 'bg-purple-500/10',
        title: { pt: 'Alta Performance', en: 'High Performance' }, 
        desc: { pt: 'Arquitetou redes escaláveis.', en: 'Architected scalable networks.' } 
    },
    { 
        id: 'saa-4', type: 'stage', cert: 'saa-c03', icon: 'fa-piggy-bank', color: 'text-pink-400', bg: 'bg-pink-500/10',
        title: { pt: 'Arquiteta Econômica', en: 'Cost Architect' }, 
        desc: { pt: 'Otimizou os custos AWS.', en: 'Optimized AWS billing.' } 
    },
    { 
        id: 'saa-final', type: 'stage', cert: 'saa-c03', icon: 'fa-certificate', color: 'text-aws-orange', bg: 'bg-orange-500/10',
        title: { pt: 'Solutions Architect', en: 'Solutions Architect' }, 
        desc: { pt: 'Atingiu o nível Associate.', en: 'Reached Associate level.' } 
    },

    // ==========================================
    // AWS DEVELOPER (DVA-C02)
    // ==========================================
    { 
        id: 'dva-1', type: 'stage', cert: 'dva-c02', icon: 'fa-code', color: 'text-blue-500', bg: 'bg-blue-500/10',
        title: { pt: 'Mestra do Código', en: 'Code Master' }, 
        desc: { pt: 'Dominou desenvolvimento na AWS.', en: 'Mastered AWS development.' } 
    },
    { 
        id: 'dva-2', type: 'stage', cert: 'dva-c02', icon: 'fa-infinity', color: 'text-teal-400', bg: 'bg-teal-500/10',
        title: { pt: 'Engenheira CI/CD', en: 'CI/CD Engineer' }, 
        desc: { pt: 'Especialista em deploy automatizado.', en: 'Automated deployment expert.' } 
    },
    { 
        id: 'dva-3', type: 'stage', cert: 'dva-c02', icon: 'fa-server', color: 'text-violet-400', bg: 'bg-violet-500/10', // Ícone cortado para serverless
        title: { pt: 'Especialista Serverless', en: 'Serverless Pro' }, 
        desc: { pt: 'Dominou Lambda e API Gateway.', en: 'Mastered Lambda & API Gateway.' } 
    },
    { 
        id: 'dva-final', type: 'stage', cert: 'dva-c02', icon: 'fa-certificate', color: 'text-aws-orange', bg: 'bg-orange-500/10',
        title: { pt: 'AWS Developer', en: 'AWS Developer' }, 
        desc: { pt: 'Pronta para criar na nuvem.', en: 'Ready to build in the cloud.' } 
    },

    // ==========================================
    // AWS AI PRACTITIONER (AIF-C01)
    // ==========================================
    { 
        id: 'aif-1', type: 'stage', cert: 'aif-c01', icon: 'fa-brain', color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10',
        title: { pt: 'Visionária de IA', en: 'AI Visionary' }, 
        desc: { pt: 'Fundamentos de IA e ML.', en: 'AI and ML fundamentals.' } 
    },
    { 
        id: 'aif-2', type: 'stage', cert: 'aif-c01', icon: 'fa-robot', color: 'text-blue-400', bg: 'bg-blue-500/10',
        title: { pt: 'Especialista SageMaker', en: 'SageMaker Pro' }, 
        desc: { pt: 'Treinou e fez deploy de modelos.', en: 'Trained and deployed models.' } 
    },
    { 
        id: 'aif-final', type: 'stage', cert: 'aif-c01', icon: 'fa-certificate', color: 'text-aws-orange', bg: 'bg-orange-500/10',
        title: { pt: 'AI Practitioner', en: 'AI Practitioner' }, 
        desc: { pt: 'Certificada em Inteligência Artificial.', en: 'Certified in Artificial Intelligence.' } 
    }
];

export function renderBadges() {
    const container = document.getElementById('gamificacao-badges-grid');
    if (!container) return;

    const gamification = storageManager.getGamification() || {};
    const earnedBadges = gamification.badges || [];
    const completedStages = gamification.completedStages || [];
    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';
    
    // Pegar a certificação que está ativa no momento
    const currentCert = localStorage.getItem('aws_sim_cert') || 'clf-c02';

    // Filtrar: Insígnias globais (performance) OU da certificação selecionada
    const badgesToShow = BADGE_CATALOG.filter(badge => {
        return badge.type === 'performance' || badge.cert === currentCert;
    });

    container.innerHTML = badgesToShow.map(badge => {
        const isEarned = badge.type === 'stage' 
            ? completedStages.includes(badge.id) 
            : earnedBadges.includes(badge.id);

        const glassClass = isEarned ? 'badge-glass' : 'badge-glass opacity-40 grayscale cursor-not-allowed';
        const iconColor = isEarned ? badge.color : 'text-gray-400';
        
        return `
            <div class="relative ${glassClass} ${isEarned ? badge.bg : 'bg-gray-100/10'} p-4 flex flex-col items-center text-center transition-all duration-300">
                ${!isEarned ? '<div class="absolute top-2 right-2 text-[10px]"><i class="fa-solid fa-lock"></i></div>' : ''}
                <i class="fa-solid ${badge.icon} ${iconColor} text-2xl mb-2"></i>
                <h4 class="font-bold text-xs dark:text-white">${badge.title[currentLang]}</h4>
                <p class="text-[9px] text-gray-500 dark:text-gray-400 mt-1">${badge.desc[currentLang]}</p>
            </div>
        `;
    }).join('');
}