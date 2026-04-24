/**
 * Motor de Interação e Gamificação AWS
 * Responsável por carregar, renderizar e validar desafios de arrastar e soltar (Ordering).
 */
class InteractiveEngine {
    constructor() {
        // O local no DOM onde o módulo será injetado
        this.containerId = 'interactive-container'; 
        this.currentChallenge = null;
        this.sortableInstance = null;
    }

    // 1. O "Fetch" Isolado (Consumo de Dados)
    async loadChallenge(challengeId = 'lab-001') {
        try {
            // Aponta para o novo bucket de dados que criaste
            const response = await fetch('data/gamificacao/interactive-challenges.json');
            
            if (!response.ok) {
                throw new Error('Falha ao carregar o ficheiro de gamificação da AWS.');
            }

            const data = await response.json();
            
            // Encontra o desafio específico
            this.currentChallenge = data.challenges.find(c => c.id === challengeId);

            if (this.currentChallenge) {
                this.render();
            } else {
                console.error('Desafio arquitetural não encontrado.');
            }
        } catch (error) {
            console.error('Erro na camada de dados:', error);
        }
    }

    // 2. A Renderização Dinâmica no Ecrã
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container #${this.containerId} não existe no DOM.`);
            return;
        }

        // Constrói a interface (UI)
        container.innerHTML = `
            <div class="interactive-header">
                <h3>${this.currentChallenge.title}</h3>
                <p>${this.currentChallenge.scenario}</p>
            </div>
            <ul id="sortable-list" class="sortable-lista-aws"></ul>
            <button id="btn-validate-interactive" class="btn-validate">Validar Arquitetura</button>
            <div id="interactive-feedback"></div>
        `;

        const listElement = document.getElementById('sortable-list');

        // Baralhar os blocos para garantir que o utilizador tem de pensar na ordem
        const shuffledItems = this.shuffleArray([...this.currentChallenge.items]);

        shuffledItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'aws-drag-item'; // Classe que vais estilizar no CSS
            li.dataset.id = item.id;
            // O ícone ☰ serve como "pegador" (handle) para dar feedback visual
            li.innerHTML = `<span class="drag-handle" style="cursor: grab; margin-right: 10px;">☰</span> ${item.text}`;
            listElement.appendChild(li);
        });

        // 3. Inicialização da Biblioteca Física (SortableJS)
        this.sortableInstance = new Sortable(listElement, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            // handle: '.drag-handle' // Opcional: Descomenta se quiseres que o utilizador apenas consiga arrastar ao clicar no ícone ☰
        });

        // Event Listener para o botão de validação
        document.getElementById('btn-validate-interactive')
                .addEventListener('click', () => this.validate());
    }

    // 4. Lógica de Validação de Negócio
    validate() {
        const listItems = document.querySelectorAll('#sortable-list li');
        
        // Extrai a ordem atual que o utilizador deixou no ecrã
        const userOrder = Array.from(listItems).map(li => li.dataset.id);
        const feedbackArea = document.getElementById('interactive-feedback');

        // Compara a ordem do utilizador com o gabarito do JSON
        const isCorrect = JSON.stringify(userOrder) === JSON.stringify(this.currentChallenge.correct_order);

        if (isCorrect) {
            feedbackArea.innerHTML = `
                <div style="color: #2e7d32; margin-top: 15px; font-weight: bold;">
                    ✅ Arquitetura validada com sucesso!
                    <p style="font-weight: normal; font-size: 0.9em; margin-top: 5px;">
                        ${this.currentChallenge.explanation || ''}
                    </p>
                </div>`;
            
            // Congela a lista após o utilizador acertar (evita interações indesejadas)
            this.sortableInstance.option("disabled", true); 
        } else {
            feedbackArea.innerHTML = `
                <div style="color: #d32f2f; margin-top: 15px; font-weight: bold;">
                    ❌ Ordem incorreta. Analisa o fluxo do tráfego ou dos dados e tenta reposicionar os serviços.
                </div>`;
        }
    }

    checkOrder() {
        const userOrder = this.sortableInstance.toArray();
        const feedbackArea = document.getElementById('interactive-feedback');
        const isCorrect = JSON.stringify(userOrder) === JSON.stringify(this.currentChallenge.correct_order);

        if (isCorrect) {
            feedbackArea.innerHTML = `<div class="text-green-600 font-bold">✅ Arquitetura validada! +10 XP</div>`;
            
            // Notificar o sistema de gamificação
            this.awardLabProgress();
            
            this.sortableInstance.option("disabled", true); 
        } else {
            feedbackArea.innerHTML = `<div class="text-red-500 font-bold">❌ Ordem incorreta. Tenta novamente!</div>`;
        }
    }

awardLabProgress() {
    let gamification = storageManager.getGamification();
    if (!gamification.labsCompleted) gamification.labsCompleted = 0;
    
    gamification.labsCompleted++;
    
    // Se completou 5 labs, ganha a badge 'lab_master'
    if (gamification.labsCompleted === 5 && !gamification.badges.includes('lab_master')) {
        gamification.badges.push('lab_master');
        // Aqui podias disparar um brinde ou som de conquista
    }
    
    storageManager.saveGamification(gamification);
}

    // Função auxiliar (Utilitário)
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Instancia a classe globalmente para poderes chamá-la a partir de um botão no teu HTML
const simuladorInterativo = new InteractiveEngine();