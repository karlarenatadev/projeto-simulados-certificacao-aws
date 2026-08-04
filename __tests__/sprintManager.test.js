import { SPRINT_MAPS, completeSprintDay, closeSprintReader } from '../src/frontend/js/gamificacao/sprintManager.js';

describe('sprintManager', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
    });

    test('SPRINT_MAPS tem dados para todas as 4 certificações', () => {
        expect(Object.keys(SPRINT_MAPS)).toEqual(['clf-c02', 'saa-c03', 'aif-c01', 'dva-c02']);
    });

    test('cada certificação tem exatamente 14 dias', () => {
        for (const [cert, map] of Object.entries(SPRINT_MAPS)) {
            expect(Object.keys(map).length).toBe(14);
        }
    });

    test('cada dia tem labels pt e en', () => {
        for (const [cert, map] of Object.entries(SPRINT_MAPS)) {
            for (const [day, labels] of Object.entries(map)) {
                expect(labels.pt).toBeDefined();
                expect(labels.en).toBeDefined();
            }
        }
    });

    test('completeSprintDay salva progresso no localStorage', () => {
        completeSprintDay(3, 'clf-c02', 'pt', () => {});
        const savedStr = localStorage.getItem('aws_sim_sprint_state_clf-c02');
        expect(savedStr).not.toBeNull();
        const saved = JSON.parse(savedStr);
        expect(saved.completedStages).toContain("3");
        expect(saved.lastCompletedDate).toBe(new Date().toDateString());
    });

    test('closeSprintReader remove overlay do DOM', () => {
        const overlay = document.createElement('div');
        overlay.id = 'sprint-reader-overlay';
        document.body.appendChild(overlay);

        closeSprintReader();
        expect(document.getElementById('sprint-reader-overlay')).toBeNull();
    });
});
