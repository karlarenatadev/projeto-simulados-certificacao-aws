/**
 * Testes Unitários para StorageManager
 * Framework: Jest
 */

import { StorageManager } from '../src/frontend/js/storageManager.js';
import { SessionManager } from '../src/frontend/js/core/sessionManager.js';

describe('StorageManager - Persistência de Dados', () => {
    let storage;

    // Antes de CADA teste, limpamos o localStorage do ambiente de testes (JSDOM)
    // e criamos uma nova instância do StorageManager com um prefixo de teste.
    beforeEach(() => {
        localStorage.clear();
        storage = new StorageManager('test_aws_sim_');
        SessionManager.logout();
    });

    test('Deve salvar e carregar o último resultado do quiz corretamente', () => {
        const mockResult = {
            certId: 'clf-c02',
            score: 45,
            total: 65,
            percentage: 69.23,
            passed: false,
            domainScores: { 'cloud-concepts': { total: 15, correct: 10 } },
            weakDomains: ['cloud-concepts'],
            answers: []
        };

        // Salva o resultado
        const saved = storage.saveQuizResult(mockResult);
        expect(saved).toBe(true);

        // Carrega o resultado parcial
        const lastScore = storage.loadLastScore('clf-c02');
        expect(lastScore).not.toBeNull();
        expect(lastScore.score).toBe(45);
        expect(lastScore.percentage).toBe(69.23);
        expect(lastScore.passed).toBe(false);

        // Carrega o resultado completo
        const fullResult = storage.loadLastResult('clf-c02');
        expect(fullResult.certId).toBe('clf-c02');
        // Verifica se a data foi gerada automaticamente pelo método saveQuizResult
        expect(fullResult.date).toBeDefined(); 
    });

    test('Deve adicionar resultados ao histórico mantendo a ordem (mais recente primeiro)', () => {
        storage.saveQuizResult({ certId: 'clf-c02', score: 10 });
        storage.saveQuizResult({ certId: 'saa-c03', score: 20 });

        const history = storage.getHistory();
        
        expect(history.length).toBe(2);
        // O último a ser salvo deve ser o primeiro da lista (unshift)
        expect(history[0].certId).toBe('saa-c03');
        expect(history[1].certId).toBe('clf-c02');
    });

    test('Deve persistir marcações da sessão ativa isoladas por usuário e certificação', () => {
        SessionManager.persist({ user: { id: 'user-a' } });
        storage.saveActiveSession({ certId: 'clf-c02', reviewQuestionIds: ['q1'] });
        SessionManager.persist({ user: { id: 'user-b' } });
        expect(storage.loadActiveSession('clf-c02')).toBeNull();
        SessionManager.persist({ user: { id: 'user-a' } });
        expect(storage.loadActiveSession('clf-c02').reviewQuestionIds).toEqual(['q1']);
        expect(storage.loadActiveSession('saa-c03')).toBeNull();
    });

    test('Deve persistir diagnósticos com desempenho por domínio para comparação temporal', () => {
        storage.saveQuizResult({
            attemptId: 'diagnostic-1',
            certId: 'clf-c02',
            mode: 'diagnostic',
            score: 1,
            total: 2,
            percentage: 50,
            domainScores: {
                security: { total: 2, correct: 1 },
            },
            weakDomains: ['security'],
            date: '2026-06-24T10:00:00.000Z',
        });
        storage.saveQuizResult({
            attemptId: 'diagnostic-2',
            certId: 'clf-c02',
            mode: 'diagnostic',
            score: 2,
            total: 2,
            percentage: 100,
            domainScores: {
                security: { total: 2, correct: 2 },
            },
            weakDomains: [],
            date: '2026-06-25T10:00:00.000Z',
        });
        storage.saveQuizResult({
            attemptId: 'diagnostic-other-cert',
            certId: 'saa-c03',
            mode: 'diagnostic',
            score: 1,
            total: 2,
            percentage: 50,
            domainScores: { architecture: { total: 2, correct: 1 } },
            weakDomains: ['architecture'],
        });

        const diagnostics = storage.getDiagnosticHistory('CLF-C02');

        expect(diagnostics).toHaveLength(2);
        expect(diagnostics.map((result) => result.attemptId)).toEqual([
            'diagnostic-2',
            'diagnostic-1',
        ]);
        expect(diagnostics[0].domainScores).toEqual({
            security: { total: 2, correct: 2 },
        });
        expect(diagnostics[0].weakDomains).toEqual([]);
        expect(diagnostics[1].weakDomains).toEqual(['security']);
    });

    test('Diagnósticos não devem contar como simulados concluídos', () => {
        storage.saveQuizResult({
            attemptId: 'diagnostic-1',
            certId: 'clf-c02',
            mode: 'diagnostic',
            percentage: 80,
            domainScores: { security: { total: 5, correct: 4 } },
            weakDomains: [],
        });

        expect(storage.getCompletedQuizCount('clf-c02')).toBe(0);
        expect(storage.getGamification().totalQuizzes).toBe(0);
    });

    test('Deve ignorar salvamento duplicado da mesma tentativa', () => {
        const result = {
            attemptId: 'attempt-duplicado',
            certId: 'clf-c02',
            score: 9,
            total: 10,
            percentage: 90,
            passed: true,
            domainScores: { compute: { total: 10, correct: 9 } },
            answers: [{ id: 'q1', userSelection: 0, isCorrect: true }],
        };

        expect(storage.saveQuizResult(result)).toBe(true);
        expect(storage.saveQuizResult(result)).toBe(false);

        const history = storage.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0].attemptId).toBe('attempt-duplicado');
    });

    test('Deve calcular progresso por certificacao a partir de sessoes concluidas unicas', () => {
        storage.saveQuizResult({
            attemptId: 'attempt-1',
            certId: 'clf-c02',
            score: 8,
            total: 10,
            percentage: 80,
        });
        storage.saveQuizResult({
            attemptId: 'attempt-1',
            certId: 'clf-c02',
            score: 8,
            total: 10,
            percentage: 80,
        });
        storage.saveQuizResult({
            attemptId: 'attempt-2',
            certId: 'saa-c03',
            score: 7,
            total: 10,
            percentage: 70,
        });

        expect(storage.getProgressFromHistory('clf-c02', 5)).toEqual({
            completedCount: 1,
            percentage: 20,
        });
    });

    test('getGamification deve derivar badges e totais do historico existente', () => {
        storage.saveQuizResult({
            attemptId: 'attempt-perfect',
            certId: 'clf-c02',
            score: 10,
            total: 10,
            percentage: 100,
            date: '2026-06-25T10:00:00.000Z',
        });

        const gamification = storage.getGamification();

        expect(gamification.totalQuizzes).toBe(1);
        expect(gamification.bestScore).toBe(100);
        expect(gamification.currentStreak).toBe(1);
        expect(gamification.badges).toContain('perfect');
    });

    test('recordMistake deve registrar uma questao errada', () => {
        const record = storage.recordMistake(
            {
                id: 'q1',
                domain: 'cloud',
                difficulty: 'easy',
                question: 'Qual servico armazena objetos?',
                options: ['EC2', 'S3'],
                correct: 1,
            },
            0,
            { certId: 'clf-c02', source: 'simulation' },
        );

        expect(record).not.toBeNull();
        expect(record.questionId).toBe('q1');
        expect(record.certification).toBe('clf-c02');
        expect(record.selectedAnswer).toBe(0);
        expect(record.selectedAnswerText).toBe('EC2');
        expect(record.correctAnswer).toBe(1);
        expect(record.correctAnswerText).toBe('S3');
        expect(record.wrongCount).toBe(1);
        expect(storage.getMistakes('clf-c02')).toHaveLength(1);
    });

    test('recordMistake deve atualizar erro repetido sem duplicar', () => {
        const question = {
            id: 'q1',
            domain: 'cloud',
            question: 'Qual servico armazena objetos?',
            options: ['EC2', 'S3'],
            correct: 1,
        };

        storage.recordMistake(question, 0, { certId: 'clf-c02' });
        storage.recordMistake(question, 0, { certId: 'clf-c02' });

        const mistakes = storage.getMistakes('clf-c02');
        expect(mistakes).toHaveLength(1);
        expect(mistakes[0].wrongCount).toBe(2);
    });

    test('recordMistake deve deduplicar questao antiga sem id usando fallback', () => {
        const question = {
            domain: 'cloud',
            question: 'Qual servico armazena objetos?',
            options: ['EC2', 'S3'],
            correct: 1,
        };

        storage.recordMistake(question, 0, { certId: 'clf-c02' });
        storage.recordMistake(question, 0, { certId: 'clf-c02' });

        const mistakes = storage.getMistakes('clf-c02');
        expect(mistakes).toHaveLength(1);
        expect(mistakes[0].questionId).toMatch(/^fallback:/);
        expect(mistakes[0].wrongCount).toBe(2);
    });

    test('getMistakes deve diferenciar certificacoes', () => {
        storage.recordMistake(
            { id: 'q1', domain: 'cloud', question: 'Q1', options: ['A', 'B'], correct: 1 },
            0,
            { certId: 'clf-c02' },
        );
        storage.recordMistake(
            { id: 'q1', domain: 'arch', question: 'Q1', options: ['A', 'B'], correct: 1 },
            0,
            { certId: 'saa-c03' },
        );

        expect(storage.getMistakes('clf-c02')).toHaveLength(1);
        expect(storage.getMistakes('saa-c03')).toHaveLength(1);
        expect(storage.getMistakes()).toHaveLength(2);
    });

    test('removeMistake deve remover erro resolvido', () => {
        const question = {
            id: 'q1',
            domain: 'cloud',
            question: 'Qual servico armazena objetos?',
            options: ['EC2', 'S3'],
            correct: 1,
        };

        storage.recordMistake(question, 0, { certId: 'clf-c02' });
        expect(storage.hasMistakes('clf-c02')).toBe(true);

        const removed = storage.removeMistake(question, 'clf-c02');

        expect(removed).toBe(true);
        expect(storage.getMistakes('clf-c02')).toEqual([]);
        expect(storage.hasMistakes('clf-c02')).toBe(false);
    });

    test('clearMistakes deve manter lista vazia quando nao ha erros', () => {
        expect(storage.getMistakes('clf-c02')).toEqual([]);
        expect(storage.hasMistakes('clf-c02')).toBe(false);

        storage.recordMistake(
            { id: 'q1', domain: 'cloud', question: 'Q1', options: ['A', 'B'], correct: 1 },
            0,
            { certId: 'clf-c02' },
        );

        expect(storage.clearMistakes('clf-c02')).toBe(true);
        expect(storage.getMistakes('clf-c02')).toEqual([]);
    });

    test('removeHistoryItem deve remover apenas uma sessao e preservar as demais', () => {
        storage.saveQuizResult({
            attemptId: 'attempt-1',
            certId: 'clf-c02',
            score: 8,
            total: 10,
            percentage: 80,
            date: '2026-06-24T10:00:00.000Z',
        });
        storage.saveQuizResult({
            attemptId: 'attempt-2',
            certId: 'clf-c02',
            score: 9,
            total: 10,
            percentage: 90,
            date: '2026-06-25T10:00:00.000Z',
        });
        storage.saveQuizResult({
            attemptId: 'attempt-3',
            certId: 'saa-c03',
            score: 7,
            total: 10,
            percentage: 70,
            date: '2026-06-26T10:00:00.000Z',
        });

        const removed = storage.removeHistoryItem(1);
        const history = storage.getHistory();

        expect(removed.attemptId).toBe('attempt-2');
        expect(history).toHaveLength(2);
        expect(history.map((item) => item.attemptId)).toEqual([
            'attempt-3',
            'attempt-1',
        ]);
    });

    test('removeHistoryItem deve lidar com sessao antiga sem attemptId', () => {
        storage.saveHistory([
            {
                certId: 'clf-c02',
                score: 9,
                total: 10,
                percentage: 90,
                date: '2026-06-25T10:00:00.000Z',
            },
            {
                certId: 'clf-c02',
                score: 7,
                total: 10,
                percentage: 70,
                date: '2026-06-24T10:00:00.000Z',
            },
        ]);

        const removed = storage.removeHistoryItem(0);
        const history = storage.getHistory();

        expect(removed.score).toBe(9);
        expect(history).toHaveLength(1);
        expect(history[0].score).toBe(7);
    });

    test('removeHistoryItem deve recalcular progresso, ultimo resultado e gamificacao', () => {
        storage.saveQuizResult({
            attemptId: 'attempt-perfect',
            certId: 'clf-c02',
            score: 10,
            total: 10,
            percentage: 100,
            date: '2026-06-25T10:00:00.000Z',
        });
        storage.saveQuizResult({
            attemptId: 'attempt-regular',
            certId: 'clf-c02',
            score: 8,
            total: 10,
            percentage: 80,
            date: '2026-06-26T10:00:00.000Z',
        });

        expect(storage.getGamification().badges).toContain('perfect');

        storage.removeHistoryItem(1);

        expect(storage.getProgressFromHistory('clf-c02', 5)).toEqual({
            completedCount: 1,
            percentage: 20,
        });
        expect(storage.loadLastResult('clf-c02').attemptId).toBe(
            'attempt-regular',
        );

        const gamification = storage.getGamification();
        expect(gamification.totalQuizzes).toBe(1);
        expect(gamification.bestScore).toBe(80);
        expect(gamification.badges).not.toContain('perfect');
    });

    test('removeHistoryItem deve suportar historico vazio apos remocao', () => {
        storage.saveQuizResult({
            attemptId: 'attempt-only',
            certId: 'clf-c02',
            score: 8,
            total: 10,
            percentage: 80,
            date: '2026-06-25T10:00:00.000Z',
        });

        const removed = storage.removeHistoryItem(0);

        expect(removed.attemptId).toBe('attempt-only');
        expect(storage.getHistory()).toEqual([]);
        expect(storage.loadLastResult('clf-c02')).toBeNull();
        expect(storage.getProgressFromHistory('clf-c02', 5)).toEqual({
            completedCount: 0,
            percentage: 0,
        });
    });

    test('updateGamification deve atualizar streak e conceder badge "perfect" para 100%', () => {
        // Primeiro quiz com 100%
        const gamification = storage.updateGamification(100);

        expect(gamification.totalQuizzes).toBe(1);
        expect(gamification.bestScore).toBe(100);
        expect(gamification.currentStreak).toBe(1);
        expect(gamification.badges).toContain('perfect'); // Ganhou a medalha
    });

    test('updateGamification deve zerar o streak se a nota for menor que 70%', () => {
        storage.updateGamification(80); // Streak = 1
        const failedGamification = storage.updateGamification(50); // Nota ruim!

        expect(failedGamification.currentStreak).toBe(0); // Perdeu o streak
    });

    test('clearAll deve remover APENAS as chaves com o prefixo do simulador', () => {
        // Salvamos algo com o nosso storage
        storage.saveQuizResult({ certId: 'clf-c02', score: 100 });
        
        // Simulamos o usuário salvando algo de OUTRO site/app no mesmo navegador
        localStorage.setItem('outra_chave_qualquer', 'nao-apague-isso');

        // Limpamos tudo do nosso simulador
        storage.clearAll();

        // Verificamos
        const nossoDado = localStorage.getItem('test_aws_sim_last_clf-c02');
        const dadoDoUsuario = localStorage.getItem('outra_chave_qualquer');

        expect(nossoDado).toBeNull(); // Nosso dado foi apagado
        expect(dadoDoUsuario).toBe('nao-apague-isso'); // Dado externo ficou intacto
    });

    test('exportData e importData devem funcionar perfeitamente para backup', () => {
        storage.saveQuizResult({ certId: 'clf-c02', score: 50 });
        
        // Exporta o backup
        const backup = storage.exportData();
        
        // Limpa tudo (simulando mudança de navegador)
        storage.clearAll();
        expect(storage.loadLastResult('clf-c02')).toBeNull();

        // Importa o backup
        const imported = storage.importData(backup);
        expect(imported).toBe(true);

        // Verifica se os dados voltaram
        const restoredResult = storage.loadLastResult('clf-c02');
        expect(restoredResult.score).toBe(50);
    });
});
