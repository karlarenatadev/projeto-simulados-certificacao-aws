/**
 * js/quizEngine.js
 * Motor de lógica pura do Simulado. 
 * Zero manipulação de DOM (HTML/CSS) acontece aqui.
 */

export class QuizEngine {
    constructor(passingScore = 70) {
        this.PASSING_SCORE = passingScore;
        this.resetState();
    }

    resetState() {
        this.state = {
            certId: null,
            questions: [],
            currentIndex: 0,
            score: 0,
            answers: [],
            domainScores: {},
            mode: 'exam'
        };
    }

    // 1. CARREGAMENTO E FILTRAGEM
    async loadQuestions(certId, domainsConfig, filters, language = 'pt') {
        this.resetState();
        this.state.certId = certId;
        this.state.mode = filters.mode || 'exam';

        try {
            const fileSuffix = language === 'en' ? '-en' : '';
            const response = await fetch(`data/${certId}${fileSuffix}.json`);
            if (!response.ok) throw new Error('Arquivo de questões não encontrado.');
            
            let data = await response.json();

            // Aplica os filtros (Dificuldade e Tópico)
            if (filters.difficulty !== 'all') {
                data = data.filter(q => q.difficulty === filters.difficulty);
            }
            if (filters.topic) {
                data = data.filter(q => q.domain === filters.topic);
            }

            if (data.length === 0) throw new Error('Nenhuma questão encontrada com esses filtros.');

            // Embaralha as questões e as alternativas
            this.state.questions = this._shuffleArray(data)
                .slice(0, Math.min(filters.quantity, data.length))
                .map(q => this._shuffleOptions(q));

            // Inicializa o placar de domínios
            domainsConfig.forEach(d => {
                this.state.domainScores[d.id] = { total: 0, correct: 0 };
            });

            return { success: true, totalQuestions: this.state.questions.length };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // 2. NAVEGAÇÃO
    getCurrentQuestion() {
        return this.state.questions[this.state.currentIndex];
    }

    getProgress() {
        return {
            current: this.state.currentIndex + 1,
            total: this.state.questions.length,
            percentage: ((this.state.currentIndex + 1) / this.state.questions.length) * 100
        };
    }

    nextQuestion() {
        if (this.state.currentIndex < this.state.questions.length - 1) {
            this.state.currentIndex++;
            return true;
        }
        return false;
    }

    // 3. AVALIAÇÃO
    submitAnswer(selectedIndex) {
        const q = this.getCurrentQuestion();
        const isCorrect = selectedIndex === q.correct;
        
        // Salva histórico
        this.state.answers.push({ ...q, userSelection: selectedIndex, isCorrect });
        
        // Atualiza pontuação global
        if (isCorrect) this.state.score++;

        // Atualiza pontuação do domínio
        if (this.state.domainScores[q.domain]) {
            this.state.domainScores[q.domain].total++;
            if (isCorrect) this.state.domainScores[q.domain].correct++;
        }

        return {
            isCorrect,
            correctIndex: q.correct,
            explanation: q.explanation,
            referenceUrl: q.reference_url,
            isFinished: this.state.currentIndex === this.state.questions.length - 1
        };
    }

    // 4. RESULTADOS FINAIS
    getFinalResults() {
        const total = this.state.questions.length;
        const percentage = (this.state.score / total) * 100;
        
        // Calcula todos os domínios fracos (accuracy < 70%)
        const weakDomains = [];

        for (const [domainId, scoreData] of Object.entries(this.state.domainScores)) {
            if (scoreData.total > 0) {
                const domainPct = (scoreData.correct / scoreData.total) * 100;
                if (domainPct < 70) {
                    weakDomains.push(domainId);
                }
            }
        }

        return {
            certId: this.state.certId,
            score: this.state.score,
            total: total,
            percentage: percentage,
            passed: percentage >= this.PASSING_SCORE,
            domainScores: this.state.domainScores,
            weakDomains: weakDomains,
            answers: this.state.answers
        };
    }

    // --- FUNÇÕES PRIVADAS DE UTILIDADE ---
    _shuffleArray(arr) { 
        return [...arr].sort(() => Math.random() - 0.5); 
    }

    _shuffleOptions(q) {
        let opts = q.options.map((t, i) => ({ t, isCorrect: i === q.correct }));
        opts = this._shuffleArray(opts);
        return { 
            ...q, 
            options: opts.map(o => o.t), 
            correct: opts.findIndex(o => o.isCorrect) 
        };
    }
}