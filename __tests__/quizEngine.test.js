/**
 * Testes Unitários para QuizEngine
 * Framework: Jest
 */

import {
    buildPersonalizedQuestionSet,
    DIAGNOSTIC_WEAK_DOMAIN_THRESHOLD,
    identifyWeakDomains,
    QuizEngine,
} from '../src/frontend/js/quizEngine.js';

describe('QuizEngine - Testes Base', () => {
    let engine;

    beforeEach(() => {
        engine = new QuizEngine(70);
    });

    test('submitAnswer deve retornar true para resposta correta (escolha única)', () => {
        // Mock de questões simples
        const mockQuestions = [
            {
                question: "Qual serviço AWS é usado para armazenamento de objetos?",
                options: ["EC2", "S3", "RDS", "Lambda"],
                correct: 1, // S3
                domain: "storage",
                difficulty: "easy",
                explanation: "Amazon S3 é o serviço de armazenamento de objetos da AWS"
            }
        ];

        // Injeta as questões mockadas diretamente no estado
        engine.state.questions = mockQuestions;
        engine.state.certId = 'test-cert';
        engine.state.domainScores = { storage: { total: 0, correct: 0 } };

        // Submete a resposta correta (índice 1 = "S3")
        const result = engine.submitAnswer(1);

        expect(result.isCorrect).toBe(true);
        expect(engine.state.score).toBe(1);
        expect(engine.state.domainScores.storage.correct).toBe(1);
    });

    test('submitAnswer deve retornar false para resposta incorreta (escolha única)', () => {
        // Mock de questões simples
        const mockQuestions = [
            {
                question: "Qual serviço AWS é usado para computação serverless?",
                options: ["EC2", "S3", "RDS", "Lambda"],
                correct: 3, // Lambda
                domain: "compute",
                difficulty: "medium",
                explanation: "AWS Lambda é o serviço de computação serverless"
            }
        ];

        // Injeta as questões mockadas
        engine.state.questions = mockQuestions;
        engine.state.certId = 'test-cert';
        engine.state.domainScores = { compute: { total: 0, correct: 0 } };

        // Submete uma resposta errada (índice 0 = "EC2")
        const result = engine.submitAnswer(0);

        expect(result.isCorrect).toBe(false);
        expect(result.correctIndex).toBe(3);
        expect(engine.state.score).toBe(0);
        expect(engine.state.domainScores.compute.correct).toBe(0);
        expect(engine.state.domainScores.compute.total).toBe(1);
    });

    test('permite revisar e substituir a resposta sem duplicar a questão', () => {
        engine.state.questions = [{
            id: 'q1',
            options: ['A', 'B'],
            correct: 1,
            domain: 'compute',
            explanation: 'explicação'
        }];
        engine.state.certId = 'test-cert';
        engine.state.domainScores = { compute: { total: 0, correct: 0 } };

        engine.submitAnswer(0);
        expect(engine.state.score).toBe(0);
        engine.submitAnswer(1);

        expect(engine.state.score).toBe(1);
        expect(engine.state.answers).toHaveLength(1);
        expect(engine.state.answers[0].userSelection).toBe(1);
        expect(engine.state.domainScores.compute).toEqual({ total: 1, correct: 1 });
    });

    test('resultado do diagnóstico expõe score geral e resultado por domínio', () => {
        const diagnosticEngine = new QuizEngine(70);
        diagnosticEngine.state.mode = 'diagnostic';
        diagnosticEngine.state.certId = 'clf-c02';
        diagnosticEngine.state.questions = Array.from({ length: 12 }, () => ({}));
        diagnosticEngine.state.score = 9;
        diagnosticEngine.state.domainScores = {
            cloud: { total: 3, correct: 2 },
            security: { total: 3, correct: 1 },
            technology: { total: 3, correct: 3 },
            billing: { total: 3, correct: 3 },
        };

        const result = diagnosticEngine.getFinalResults();

        expect(result).toMatchObject({
            certification: 'clf-c02',
            totalQuestions: 12,
            correctAnswers: 9,
            overallScore: 75,
            weakDomains: ['security'],
            strongDomains: ['cloud', 'technology', 'billing'],
        });
        expect(result.domainResults).toHaveLength(4);
        expect(result.domainResults.find((domain) => domain.id === 'cloud')).toMatchObject({
            domainId: 'cloud',
            totalQuestions: 3,
            correctAnswers: 2,
            isWeak: false,
            isStrong: true,
        });
    });

    test('o limiar de domínio fraco é único e inclusivo no limite', () => {
        expect(DIAGNOSTIC_WEAK_DOMAIN_THRESHOLD).toBe(60);

        const diagnosticEngine = new QuizEngine(70);
        diagnosticEngine.state.mode = 'diagnostic';
        diagnosticEngine.state.questions = [{}, {}];
        diagnosticEngine.state.domainScores = {
            weak: { total: 5, correct: 2 },
            boundary: { total: 5, correct: 3 },
        };

        const result = diagnosticEngine.getFinalResults();

        expect(result.weakDomains).toEqual(['weak']);
        expect(result.strongDomains).toEqual(['boundary']);
    });
});

describe('QuizEngine - Diagnóstico Personalizado', () => {
    test('prática direcionada mantém o domínio canônico no placar', () => {
        const targetedEngine = new QuizEngine(70);
        targetedEngine.state.mode = 'targeted-practice';
        targetedEngine.state.certId = 'clf-c02';
        targetedEngine.state.questions = [
            {
                id: 'targeted-1',
                domain: 'Security and Compliance',
                options: ['A', 'B'],
                correct: 0,
            },
        ];
        targetedEngine.state.domainScores = {
            seguranca: { total: 0, correct: 0 },
        };

        targetedEngine.submitAnswer(0);

        expect(targetedEngine.state.domainScores).toEqual({
            seguranca: { total: 1, correct: 1 },
        });
        expect(targetedEngine.getFinalResults().domainResults[0]).toMatchObject({
            domainId: 'seguranca',
            correctAnswers: 1,
        });
    });

    const domainsConfig = [
        { id: 'storage', name: 'Storage' },
        { id: 'compute', name: 'Compute' },
        { id: 'security', name: 'Security' },
    ];

    test('identifyWeakDomains identifica domínios abaixo de 60%', () => {
        const result = identifyWeakDomains(
            {
                storage: { total: 5, correct: 2 },
                compute: { total: 5, correct: 4 },
            },
            domainsConfig,
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: 'storage',
            name: 'Storage',
            total: 5,
            correct: 2,
        });
        expect(result[0].percentage).toBe(40);
    });

    test('identifyWeakDomains usa o menor percentual quando nenhum domínio está abaixo de 60%', () => {
        const result = identifyWeakDomains(
            {
                storage: { total: 5, correct: 4 },
                compute: { total: 5, correct: 5 },
            },
            domainsConfig,
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('storage');
        expect(result[0].percentage).toBe(80);
    });

    test('identifyWeakDomains ordena os domínios fracos do pior para o melhor desempenho', () => {
        const result = identifyWeakDomains(
            {
                storage: { total: 5, correct: 2 },
                compute: { total: 5, correct: 1 },
                security: { total: 5, correct: 3 },
            },
            domainsConfig,
        );

        expect(result.map((domain) => domain.id)).toEqual([
            'compute',
            'storage',
        ]);
    });

    test('identifyWeakDomains retorna vazio quando domainScores não tem respostas', () => {
        expect(identifyWeakDomains({}, domainsConfig)).toEqual([]);
        expect(
            identifyWeakDomains(
                {
                    storage: { total: 0, correct: 0 },
                },
                domainsConfig,
            ),
        ).toEqual([]);
    });

    test('buildPersonalizedQuestionSet prioriza domínios fracos e completa com questões gerais', () => {
        const questions = [
            { id: 'q1', domain: 'storage' },
            { id: 'q2', domain: 'compute' },
            { id: 'q3', domain: 'security' },
            { id: 'q4', domain: 'compute' },
        ];

        const result = buildPersonalizedQuestionSet(questions, ['storage'], 3);

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('q1');
        expect(result.map((question) => question.id)).toEqual([
            'q1',
            'q2',
            'q3',
        ]);
    });
});
