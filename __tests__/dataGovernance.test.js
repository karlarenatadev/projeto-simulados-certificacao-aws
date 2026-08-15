import {
  validateCases,
  validateFlashcards,
  validateLabs,
  validateQuestion,
  validateRuntimeTaxonomy,
  validateTaxonomy,
} from '../scripts/validation/validate_data_consistency.mjs';
import { glossaryTerms } from '../src/frontend/js/data.js';

function createReport() {
  return { issues: [], counts: {} };
}

function createContext() {
  return {
    domainAliases: new Map([
      ['CLF-C02:cloud-concepts', ['clf-cloud-concepts']],
      ['SAA-C03:design-resilient-architectures', ['saa-design-resilient']],
    ]),
    serviceAliases: new Map([
      ['amazon-s3', ['amazon-s3']],
      ['s3', ['amazon-s3']],
    ]),
    servicesById: new Map([['amazon-s3', { service_id: 'amazon-s3' }]]),
  };
}

const validQuestion = {
  questionId: 'fixture-1',
  certId: 'CLF-C02',
  question: 'Which service stores objects?',
  options: ['Amazon S3', 'Amazon EC2'],
  correct: 0,
  domain: 'cloud-concepts',
  difficulty: 'easy',
  services: [{ service_id: 'amazon-s3', service_name: 'Amazon S3', service_slug: 's3' }],
};

describe('dataset governance validators', () => {
  test('accepts a question using the current schema and a valid taxonomy alias', () => {
    const report = createReport();

    validateQuestion(validQuestion, createContext(), report);

    expect(report.issues).toHaveLength(0);
  });

  test('reports invalid question structure, certification, domain and answer index', () => {
    const report = createReport();

    validateQuestion(
      {
        ...validQuestion,
        certId: 'UNKNOWN',
        options: ['Only option'],
        correct: 2,
        domain: 'unknown-domain',
      },
      createContext(),
      report,
    );

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['QUESTION_CERTIFICATION', 'QUESTION_OPTIONS', 'QUESTION_CORRECT_ANSWER']),
    );
  });

  test('reports invalid lab fields and unsupported certification', () => {
    const report = createReport();

    validateLabs(
      [{ id: 'lab-1', title: 'Lab', certification: 'UNKNOWN', service: 'unknown', difficulty: 'expert', duration: 30, provider: 'AWS', externalUrl: 'javascript:alert(1)' }],
      createContext(),
      report,
    );

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['LAB_CERTIFICATION', 'LAB_DIFFICULTY', 'LAB_URL', 'UNKNOWN_SERVICE']),
    );
  });

  test('reports invalid case structure and unsupported service', () => {
    const report = createReport();

    validateCases(
      [{ id: 'case-1', slug: 'case-1', objective: 'Objective', scenario: 'Scenario', certifications: ['BAD'], services: [{ name: 'unknown' }] }],
      createContext(),
      report,
    );

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['CASE_CERTIFICATION', 'UNKNOWN_SERVICE', 'CASE_ARCHITECTURE', 'CASE_EN_CONTENT']),
    );
  });

  test('detects conflicting taxonomy aliases', () => {
    const report = createReport();

    validateTaxonomy(
      {
        certification_domains: [
          { certification: 'CLF-C02', domain_id: 'domain-a', official_name: 'Shared', aliases: [] },
          { certification: 'CLF-C02', domain_id: 'domain-b', official_name: 'Other', aliases: ['Shared'] },
        ],
        services: [],
      },
      report,
    );

    expect(report.issues.map(({ code }) => code)).toContain('CONFLICTING_DOMAIN_ALIAS');
  });

  test('reports drift between runtime and canonical taxonomy counts', () => {
    const report = createReport();

    validateRuntimeTaxonomy(
      {
        'clf-c02': { domains: [{ id: 'one', name: 'Um', englishName: 'One' }] },
        'saa-c03': { domains: [] },
        'dva-c02': { domains: [] },
        'aif-c01': { domains: [] },
      },
      {
        certification_domains: [
          { certification: 'CLF-C02', domain_id: 'clf-one' },
          { certification: 'CLF-C02', domain_id: 'clf-two' },
        ],
      },
      report,
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_TAXONOMY_COUNT_DRIFT' })]),
    );
  });

  test('accepts bilingual flashcards and reports content gaps separately', () => {
    const report = createReport();

    validateFlashcards(
      [
        {
          id: 'card-1',
          cert: 'CLF-C02',
          domain: 'cloud-concepts',
          term: { pt: 'Termo', en: 'Term' },
          definition: { pt: 'Definição', en: 'Definition' },
        },
        {
          id: 'card-2',
          cert: 'CLF-C02',
          domain: 'cloud-concepts',
          term: { pt: 'Somente PT' },
          definition: { pt: 'Definição' },
        },
      ],
      createContext(),
      report,
    );

    expect(report.issues).toEqual([
      expect.objectContaining({ severity: 'CONTENT_GAP', code: 'FLASHCARD_BILINGUAL_CONTENT' }),
    ]);
  });

  test('keeps the minimum bilingual flashcard coverage by canonical domain', () => {
    const minimums = {
      'dva-c02': 4,
      'aif-c01': 5,
    };

    for (const [certification, domainCount] of Object.entries(minimums)) {
      const cards = glossaryTerms.filter((card) => card.cert === certification);
      const counts = new Map();
      for (const card of cards) counts.set(card.domain, (counts.get(card.domain) || 0) + 1);

      expect(counts.size).toBe(domainCount);
      for (const count of counts.values()) expect(count).toBeGreaterThanOrEqual(3);
      for (const card of cards) {
        expect(card.term?.pt).toBeTruthy();
        expect(card.term?.en).toBeTruthy();
        expect(card.definition?.pt).toBeTruthy();
        expect(card.definition?.en).toBeTruthy();
      }
    }
  });
});
