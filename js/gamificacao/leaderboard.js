import { storageManager } from '../storageManager.js';

export function renderGuildDashboard() {
    const list = document.getElementById('guild-leaderboard');
    if (!list) return;

    const currentLang = localStorage.getItem('aws_sim_lang') || 'pt';

    // LIMPEZA E GERAÇÃO DE IDENTIDADE SE SEGURA
    let myUsername = localStorage.getItem('aws_sim_username');
    
    // Verifica se está vazio, null ou se é a string literal "undefined"
    if (!myUsername || myUsername === 'undefined' || myUsername === 'null') {
        const adjetivos = ['Cloud', 'Lambda', 'Elastic', 'Cyber', 'Data', 'Tech', 'Nexus'];
        const substantivos = ['Ninja', 'Architect', 'Guru', 'Scout', 'Dev', 'Analyst', 'Engineer'];
        
        const randAdj = adjetivos[Math.floor(Math.random() * adjetivos.length)];
        const randSub = substantivos[Math.floor(Math.random() * substantivos.length)];
        const randNum = Math.floor(Math.random() * 999);
        
        myUsername = `${randAdj}_${randSub}_${randNum}`;
        localStorage.setItem('aws_sim_username', myUsername);
    }

    // EXTRAÇÃO DE DADOS REAIS DO USUÁRIO
    const gamificationData = storageManager.getGamification();
    const myBestScore = gamificationData?.bestScore || 0;

    // MOCK DA BASE DE DADOS DA GUILDA
    const rankData = [
        { name: 'Lambda_Architect_802', score: 98 },
        { name: 'Cloud_Guru_411', score: 95 },
        { name: myUsername, score: myBestScore },
        { name: 'Elastic_Ninja_109', score: 72 },
        { name: 'Cyber_Scout_99', score: 68 },
        { name: 'Data_Engineer_404', score: 88 },
        { name: 'Nexus_Dev_777', score: 85 }
    ];

    rankData.sort((a, b) => b.score - a.score);
    const top5 = rankData.slice(0, 5);

    // CÁLCULO DE MÉTRICAS GLOBAIS
    const totalQuestionsEl = document.getElementById('guild-total-questions');
    const weeklyAvgEl = document.getElementById('guild-weekly-avg');
    
    if (totalQuestionsEl) {
        const baseVolume = 1240;
        totalQuestionsEl.textContent = (baseVolume + (gamificationData?.totalQuizzes || 0) * 10).toLocaleString('pt-BR');
    }
    
    if (weeklyAvgEl) {
        const currentAvg = top5.reduce((acc, curr) => acc + curr.score, 0) / top5.length;
        weeklyAvgEl.textContent = `${Math.round(currentAvg)}%`;
    }

    // RENDERIZAÇÃO DA UI
    list.innerHTML = top5.map((user, index) => {
        const isMe = user.name === myUsername;
        
        const bgClass = isMe 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 shadow-sm' 
            : 'border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/50';
            
        const nameClass = isMe 
            ? 'font-bold aws-text-dark dark:text-white' 
            : 'font-medium text-gray-600 dark:text-gray-300';
            
        const positionColor = index === 0 ? 'text-yellow-500' : 
                              index === 1 ? 'text-gray-400' : 
                              index === 2 ? 'text-orange-400' : 'text-gray-500';
        
        // Tradução dinâmica da tag "Você" / "You"
        const badgeText = currentLang === 'en' ? 'You' : 'Você';
        const youBadge = isMe ? `<span class="text-[9px] uppercase tracking-wider bg-aws-orange text-white px-2 py-0.5 rounded-full ml-1">${badgeText}</span>` : '';
        
        return `
            <li class="flex justify-between items-center p-3 rounded-lg transition-all duration-200 ${bgClass}">
                <span class="${nameClass} text-sm flex items-center gap-2">
                    <span class="font-bold ${positionColor} w-5 inline-block text-center">#${index + 1}</span> 
                    ${user.name} 
                    ${youBadge}
                </span>
                <span class="font-mono font-bold text-aws-orange">${user.score}%</span>
            </li>
        `;
    }).join('');
}

/**
 * Gera um nome de usuário anônimo e divertido para o ranking.
 * @returns {string} Ex: "CloudNinja_84"
 */
export function generateAnonymousUsername() {
    const prefixes = ['Cloud', 'Data', 'Cyber', 'Tech', 'Byte', 'Code', 'Aws', 'Dev'];
    const suffixes = ['Ninja', 'Jedi', 'Panda', 'Guru', 'Hacker', 'Ranger', 'Wizard', 'Titan'];
    
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomNumber = Math.floor(Math.random() * 90) + 10; // Número entre 10 e 99

    return `${randomPrefix}${randomSuffix}_${randomNumber}`;
}

// Exemplo de integração com o LocalStorage (até termos o DynamoDB)
export function getOrCreateUsername() {
    let username = localStorage.getItem('aws_sim_username');
    if (!username) {
        username = generateAnonymousUsername();
        localStorage.setItem('aws_sim_username', username);
    }
    return username;
}