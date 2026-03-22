/**
 * Testes Unitários para QuizEngine
 * Framework: Jest
 */

import { QuizEngine } from '../js/quizEngine.js';

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
});
