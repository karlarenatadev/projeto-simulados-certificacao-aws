import {
    SPRINT_MAPS,
    completeSprintDay,
    closeSprintReader,
    getSprintProgress,
    readSprintRecommendation,
} from '../src/frontend/js/gamificacao/sprintManager.js';
import { sprintPillsData } from '../src/frontend/js/sprintData.js';

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

    test('cada dia possui conteúdo detalhado bilíngue', () => {
        for (const days of Object.values(sprintPillsData)) {
            expect(Object.keys(days).map(Number).sort((a, b) => a - b)).toEqual(
                Array.from({ length: 14 }, (_, index) => index + 1),
            );
            for (const day of Object.values(days)) {
                for (const language of ['pt', 'en']) {
                    expect(day[language].title).toBeTruthy();
                    expect(day[language].topic).toBeTruthy();
                    expect(day[language].readTime).toBeTruthy();
                    expect(day[language].content).toBeTruthy();
                    expect(day[language].keyTakeaway).toBeTruthy();
                }
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

    test('normaliza o progresso do Sprint e limita o percentual a 100%', () => {
        localStorage.setItem('aws_sim_sprint_state_clf-c02', JSON.stringify({
            completedStages: ['1', '2', '2', '15', '14'],
        }));

        expect(getSprintProgress('CLF-C02')).toEqual({
            completedStages: [1, 2, 14],
            currentDay: 4,
            percentage: 21,
            completed: false,
        });
    });

    test('aceita recomendação do diagnóstico somente da certificação ativa', () => {
        localStorage.setItem('aws_sim_last_diagnostic_recommendation', JSON.stringify({
            source: 'diagnostic',
            certificationId: 'CLF-C02',
            weakDomains: ['cloud-concepts'],
        }));

        expect(readSprintRecommendation('clf-c02')).not.toBeNull();
        expect(readSprintRecommendation('saa-c03')).toBeNull();
    });
});
