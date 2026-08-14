import {
  rankRecommendedCases,
  readCasesRecommendation,
} from "../src/frontend/js/cases/caseManager.js";
import { RecommendationEngine } from "../src/frontend/js/recommendations/recommendationEngine.js";

const cases = [
  {
    id: "case-s3",
    certification: "CLF-C02",
    certifications: ["CLF-C02"],
    services: [{ service_slug: "amazon-s3", service_name: "Amazon S3" }],
  },
  {
    id: "case-iam-strong",
    certification: "CLF-C02",
    certifications: ["CLF-C02"],
    services: [{ service_slug: "iam", service_name: "AWS IAM" }],
  },
  {
    id: "case-iam-secondary",
    certification: "CLF-C02",
    certifications: ["CLF-C02"],
    services: [{ service_slug: "aws-kms", service_name: "AWS KMS" }],
  },
  {
    id: "case-other-cert",
    certification: "SAA-C03",
    certifications: ["SAA-C03"],
    services: [{ service_slug: "iam", service_name: "AWS IAM" }],
  },
];

describe("RecommendationEngine → Cases", () => {
  test("prioriza serviço strong, mantém certificação e limita a três", () => {
    const result = rankRecommendedCases(cases, {
      certificationId: "clf-c02",
      services: ["iam", "s3", "kms"],
      strongServices: ["iam"],
      weakDomains: ["seguranca"],
    });

    expect(result.fallback).toBe(false);
    expect(result.cases.map((item) => item.id)).toEqual([
      "case-iam-strong",
      "case-iam-secondary",
      "case-s3",
    ]);
    expect(result.cases.every((item) => item.certification === "CLF-C02")).toBe(true);
    expect(result.cases).toHaveLength(3);
  });

  test("suporta múltiplos serviços e nunca mistura certificações", () => {
    const result = rankRecommendedCases(cases, {
      certificationId: "SAA-C03",
      services: ["iam", "s3"],
      strongServices: ["iam"],
      weakDomains: [],
    });

    expect(result.cases.map((item) => item.id)).toEqual(["case-other-cert"]);
  });

  test("faz fallback somente para a mesma certificação", () => {
    const result = rankRecommendedCases(cases, {
      certificationId: "CLF-C02",
      services: ["cloudtrail"],
      strongServices: ["cloudtrail"],
      weakDomains: ["seguranca"],
    });

    expect(result.fallback).toBe(true);
    expect(result.cases.map((item) => item.id)).toEqual([
      "case-s3",
      "case-iam-strong",
      "case-iam-secondary",
    ]);
    expect(result.cases.some((item) => item.id === "case-other-cert")).toBe(false);
  });

  test("ignora contexto ausente ou inválido", () => {
    expect(rankRecommendedCases(cases, null)).toEqual({ cases: [], fallback: false });
    expect(readCasesRecommendation({ getItem: () => null })).toBeNull();
    expect(
      readCasesRecommendation({
        getItem: () => JSON.stringify({ source: "diagnostic", recommendations: {} }),
      }),
    ).toBeNull();
  });

  test("RecommendationEngine expõe Cases sem mover a seleção para o engine", () => {
    const result = new RecommendationEngine().generateDiagnosticRecommendations({
      certificationId: "CLF-C02",
      overallScore: 50,
      domainResults: [{ domainId: "conceitos-cloud", score: 40 }],
      weakDomains: ["conceitos-cloud"],
      strongDomains: [],
      weakServices: [{ id: "iam", occurrences: 2, evidence: "strong" }],
      weakTopics: [{ id: "least-privilege", occurrences: 2, evidence: "strong" }],
    });

    expect(result.recommendations.cases).toMatchObject({
      enabled: true,
      type: "cases",
      context: {
        source: "diagnostic",
        certificationId: "clf-c02",
        services: ["iam"],
        strongServices: ["iam"],
        weakDomains: ["conceitos-cloud"],
        weakTopics: [
          { id: "least-privilege", occurrences: 2, evidence: "strong" },
        ],
      },
    });
  });
});
