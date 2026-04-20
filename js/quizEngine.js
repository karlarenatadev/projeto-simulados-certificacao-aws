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

    // 1.5 CARREGAMENTO DO DIAGNÓSTICO DE NIVELAMENTO
    async loadDiagnostic(certId, domainsConfig, language = 'pt') {
        this.resetState();
        this.state.certId = certId;
        this.state.mode = 'diagnostic'; // Isola o estado do simulado real

        try {
            // Busca o arquivo isolado focado em conceitos
            const fileSuffix = language === 'en' ? '-en' : '';

            const response = await fetch(`data/nivelamento/diagnostic-${certId}${fileSuffix}.json`);
            
            if (!response.ok) throw new Error('Arquivo de diagnóstico não encontrado.');
            
            let data = await response.json();

            // Embaralha as questões conceituais e suas opções
            this.state.questions = this._shuffleArray(data).map(q => this._shuffleOptions(q));

            // Inicializa o placar para o radar chart funcionar perfeitamente
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
        
        let isCorrect;
        if (Array.isArray(q.correct)) {
            const userSorted = Array.isArray(selectedIndex) ? [...selectedIndex].sort() : [];
            const correctSorted = [...q.correct].sort();
            isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
        } else {
            isCorrect = selectedIndex === q.correct;
        }
        
        this.state.answers.push({ ...q, userSelection: selectedIndex, isCorrect });
        if (isCorrect) this.state.score++;

        // --- CORREÇÃO DE BUG DO GRÁFICO (Normalização de Domínios) ---
        let qDomain = String(q.domain).trim();
        
        // 1. Tenta o match exato
        if (this.state.domainScores[qDomain]) {
            this.state.domainScores[qDomain].total++;
            if (isCorrect) this.state.domainScores[qDomain].correct++;
        } else {
            // 2. Tenta match flexível (ex: "1" no JSON bate com "1.0" no config)
            const matchedKey = Object.keys(this.state.domainScores).find(key => 
                parseFloat(key) === parseFloat(qDomain) || key.includes(qDomain)
            );
            
            if (matchedKey) {
                this.state.domainScores[matchedKey].total++;
                if (isCorrect) this.state.domainScores[matchedKey].correct++;
            } else {
                // 3. Se for um domínio totalmente desconhecido, cria dinamicamente
                this.state.domainScores[qDomain] = { total: 1, correct: isCorrect ? 1 : 0 };
            }
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
            const isMulti = Array.isArray(q.correct);
            
            // Mapeia as opções mantendo a referência se estão corretas
            let opts = q.options.map((t, i) => ({ 
                t, 
                isCorrect: isMulti ? q.correct.includes(i) : i === q.correct 
            }));
            
            // Embaralha
            opts = this._shuffleArray(opts);
            
            // Reconstrói a propriedade 'correct' com os novos índices
            return { 
                ...q, 
                options: opts.map(o => o.t), 
                correct: isMulti 
                    ? opts.map((o, index) => o.isCorrect ? index : -1).filter(idx => idx !== -1)
                    : opts.findIndex(o => o.isCorrect) 
            };
        }
}