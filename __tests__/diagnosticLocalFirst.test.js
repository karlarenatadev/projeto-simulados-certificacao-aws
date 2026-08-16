import { jest } from '@jest/globals';
import { QuizEngine } from '../src/frontend/js/quizEngine.js';

const domains = [
  { id: 'conceitos-cloud' },
  { id: 'seguranca' },
  { id: 'tecnologia' },
  { id: 'faturamento' },
];

function diagnosticFixture() {
  return domains.flatMap((domain) =>
    Array.from({ length: 3 }, (_, index) => ({
      id: `${domain.id}-${index}`,
      domain: domain.id,
      question_text: `Question ${domain.id} ${index}`,
      options: ['A', 'B', 'C'],
      correct_answer: 0,
    })),
  );
}

describe('diagnostic local-first loading', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('loads the principal local bank without requiring an API helper', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => diagnosticFixture(),
    });

    const engine = new QuizEngine(70);
    const result = await engine.loadDiagnostic('clf-c02', domains, 'pt');

    expect(result.success).toBe(true);
    expect(engine.state.questions).toHaveLength(12);
    expect(global.fetch).toHaveBeenCalledWith('data/questions/clf-c02.json');
  });

  test('resolves the English asset without silently falling back to PT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => diagnosticFixture(),
    });

    const engine = new QuizEngine(70);
    const result = await engine.loadDiagnostic('clf-c02', domains, 'en');

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('data/questions/clf-c02-en.json');
  });
});
