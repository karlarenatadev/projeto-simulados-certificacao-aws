import {
    TRAILS_BY_CERT,
    getTrailState,
    readJourneyRecommendation,
    renderJourneyRecommendation,
} from '../src/frontend/js/gamificacao/trailManager.js';

describe('trailManager e integração da Jornada', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '<div id="jornada-recommendation"></div>';
    });

    test.each(['clf-c02', 'saa-c03', 'dva-c02', 'aif-c01'])('mantém cinco etapas para %s', (certId) => {
        expect(TRAILS_BY_CERT[certId]).toHaveLength(5);
        expect(TRAILS_BY_CERT[certId].every((stage) => stage.title.pt && stage.title.en)).toBe(true);
    });

    test('isola o estado da Jornada por certificação', () => {
        localStorage.setItem('aws_sim_gamification_clf-c02', JSON.stringify({
            completedStages: ['clf-1'],
            unlockedStages: ['clf-1', 'clf-2'],
        }));

        expect(getTrailState('CLF-C02')).toMatchObject({
            certificationId: 'clf-c02',
            completedStages: ['clf-1'],
            percentage: 20,
        });
        expect(getTrailState('saa-c03').completedStages).toEqual([]);
    });

    test('renderiza recomendação do diagnóstico e estado ativo do Sprint', () => {
        localStorage.setItem('aws_sim_last_diagnostic_recommendation', JSON.stringify({
            source: 'diagnostic',
            certificationId: 'clf-c02',
            recommendations: {
                flashcards: { domainIds: ['cloud-concepts'] },
                questions: { domains: ['cloud-concepts'] },
                labs: { services: ['iam'] },
            },
        }));
        localStorage.setItem('aws_sim_sprint_state_clf-c02', JSON.stringify({
            completedStages: ['1', '2'],
        }));

        renderJourneyRecommendation('CLF-C02', 'en');

        expect(document.querySelector('[data-testid="journey-recommendation"]')).not.toBeNull();
        expect(document.querySelector('[data-testid="journey-sprint-status"]')).not.toBeNull();
        expect(document.body.textContent).toContain('Review flashcards');
        expect(document.body.textContent).toContain('Continue Sprint — Day 3/14');
        expect(document.querySelector('[data-recommendation-action="labs"]')).not.toBeNull();
    });

    test('ignora recomendação inválida ou de outra certificação', () => {
        localStorage.setItem('aws_sim_last_diagnostic_recommendation', '{invalid');
        expect(readJourneyRecommendation('clf-c02')).toBeNull();

        localStorage.setItem('aws_sim_last_diagnostic_recommendation', JSON.stringify({
            source: 'diagnostic', certificationId: 'saa-c03',
        }));
        expect(readJourneyRecommendation('clf-c02')).toBeNull();
        renderJourneyRecommendation('clf-c02');
        expect(document.getElementById('jornada-recommendation').innerHTML).toBe('');
    });
});
