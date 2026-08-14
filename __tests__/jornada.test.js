import { renderJornadaDashboard } from '../src/frontend/js/modules/jornada.js';
import { storageManager } from '../src/frontend/js/storageManager.js';

describe('Dashboard da Jornada', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <p id="jornada-cert-title"></p>
            <p id="jornada-progress"></p>
            <p id="jornada-accuracy"></p>
            <p id="jornada-questions"></p>
            <p id="jornada-weak-domain"></p>
        `;
    });

    test('usa o mesmo progresso canônico das etapas, mesmo sem histórico de simulados', () => {
        storageManager.saveGamification({ completedStages: ['saa-1', 'saa-2'] }, 'saa-c03');
        storageManager.saveSprintState('saa-c03', { completedStages: ['1'] });

        renderJornadaDashboard('SAA-C03');

        expect(document.getElementById('jornada-progress').textContent).toBe('40%');
        expect(document.getElementById('jornada-cert-title').textContent).toBe('Jornada SAA-C03');
        expect(document.getElementById('jornada-accuracy').textContent).toBe('0%');
    });

    test('mantém a etapa concluída após reload e não usa simulados como progresso', () => {
        storageManager.saveGamification({ completedStages: ['clf-1'] }, 'clf-c02');
        storageManager.saveQuizResult({
            attemptId: 'quiz-perfect',
            certId: 'clf-c02',
            score: 10,
            total: 10,
            percentage: 100,
        });

        renderJornadaDashboard('clf-c02');
        expect(document.getElementById('jornada-progress').textContent).toBe('20%');
        expect(storageManager.getGamification('clf-c02').completedStages).toEqual(['clf-1']);
    });
});
