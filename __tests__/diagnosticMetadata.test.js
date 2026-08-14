import {
  buildWeakMetadataSignals,
  QuizEngine,
} from "../src/frontend/js/quizEngine.js";
import { RecommendationEngine } from "../src/frontend/js/recommendations/recommendationEngine.js";

describe("Diagnóstico — sinais de serviços e tópicos", () => {
  test("considera apenas erros e evidencia recorrência", () => {
    const result = buildWeakMetadataSignals([
      {
        isCorrect: false,
        services: [
          { service_slug: "Amazon-IAM", service_name: "IAM" },
          "Amazon-IAM",
        ],
        tags: ["least privilege", "IAM"],
      },
      {
        isCorrect: false,
        services: [
          { service_id: "amazon-iam" },
          { service_slug: "amazon-s3" },
        ],
        tags: ["least-privilege", "storage"],
      },
      {
        isCorrect: true,
        services: [{ service_slug: "amazon-iam" }],
        tags: ["least-privilege"],
      },
    ]);

    expect(result.weakServices).toEqual([
      { id: "amazon-iam", occurrences: 2, evidence: "strong" },
      { id: "amazon-s3", occurrences: 1, evidence: "secondary" },
    ]);
    expect(result.weakTopics).toEqual([
      { id: "least-privilege", occurrences: 2, evidence: "strong" },
      { id: "iam", occurrences: 1, evidence: "secondary" },
      { id: "storage", occurrences: 1, evidence: "secondary" },
    ]);
  });

  test("ignora metadados ausentes", () => {
    expect(buildWeakMetadataSignals([{ isCorrect: false }])).toEqual({
      weakServices: [],
      weakTopics: [],
    });
  });

  test("o resultado anterior continua válido e o engine expõe os novos sinais", () => {
    const engine = new QuizEngine();
    engine.state.mode = "diagnostic";
    engine.state.certId = "clf-c02";
    engine.state.questions = [
      {
        id: "q1",
        domain: "Cloud Concepts",
        services: [{ service_slug: "amazon-iam" }],
        tags: ["least privilege"],
        correct: 0,
      },
    ];
    engine.state.domainScores = {
      "conceitos-cloud": { total: 1, correct: 0 },
    };
    engine.state.answers = [
      {
        id: "q1",
        isCorrect: false,
        services: [{ service_slug: "amazon-iam" }],
        tags: ["least privilege"],
      },
    ];

    const diagnosticResult = engine.getFinalResults();
    const recommendation = new RecommendationEngine().generateDiagnosticRecommendations({
      ...diagnosticResult,
      domainResults: [
        { domainId: "conceitos-cloud", score: 0 },
      ],
    });

    expect(diagnosticResult).toMatchObject({
      weakServices: [
        { id: "amazon-iam", occurrences: 1, evidence: "secondary" },
      ],
      weakTopics: [
        { id: "least-privilege", occurrences: 1, evidence: "secondary" },
      ],
    });
    expect(recommendation.weakServices[0].id).toBe("amazon-iam");
    expect(recommendation.weakTopics[0].id).toBe("least-privilege");
    expect(recommendation.recommendations.flashcards.enabled).toBe(true);
    expect(recommendation.recommendations.questions.enabled).toBe(true);
  });

  test.each(["clf-c02", "saa-c03", "dva-c02", "aif-c01"])(
    "%s aceita sinais de metadados sem alterar os contextos existentes",
    (certificationId) => {
      const result = new RecommendationEngine().generateDiagnosticRecommendations({
        certificationId,
        overallScore: 50,
        domainResults: [{ domainId: "unknown", score: 50 }],
        weakServices: [{ id: "amazon-iam", occurrences: 2 }],
        weakTopics: [{ id: "least-privilege", occurrences: 2 }],
        weakDomains: [],
        strongDomains: [],
      });

      expect(result).toMatchObject({
        certificationId,
        weakServices: [{ id: "amazon-iam", occurrences: 2 }],
        weakTopics: [{ id: "least-privilege", occurrences: 2 }],
      });
      expect(result.recommendations.flashcards.enabled).toBe(false);
      expect(result.recommendations.questions.enabled).toBe(false);
    },
  );
});
