import { RecommendationEngine } from "../src/frontend/js/recommendations/recommendationEngine.js";
import { certificationPaths } from "../src/frontend/js/data.js";

function diagnosticResult(certificationId, weakDomains) {
  const domains = certificationPaths[certificationId].domains;
  return {
    certificationId: certificationId.toUpperCase(),
    overallScore: 58,
    weakDomains,
    strongDomains: domains.slice(1).map((domain) => domain.id),
    domainResults: domains.map((domain, index) => ({
      domainId: domain.id,
      score: index === 0 ? 42 : 80,
      isWeak: index === 0,
      isStrong: index !== 0,
    })),
    answers: [{ id: `${certificationId}-diagnostic-1` }],
  };
}

describe("RecommendationEngine — DiagnosticResult", () => {
  const engine = new RecommendationEngine();

  test.each(["clf-c02", "saa-c03", "dva-c02", "aif-c01"])(
    "%s gera recomendações para Flashcards e targeted-practice",
    (certificationId) => {
      const domainId = certificationPaths[certificationId].domains[0].id;
      const result = engine.generateDiagnosticRecommendations(
        diagnosticResult(certificationId, [domainId]),
      );

      expect(result).toMatchObject({
        source: "diagnostic",
        certificationId,
        overallScore: 58,
        weakDomains: [domainId],
      });
      expect(result.priorities[0]).toMatchObject({
        domainId,
        score: 42,
        priority: "high",
      });
      expect(result.recommendations.flashcards).toMatchObject({
        enabled: true,
        type: "flashcards",
        context: { certificationId, weakDomains: [domainId] },
      });
      expect(result.recommendations.questions).toMatchObject({
        enabled: true,
        type: "targeted-practice",
        context: {
          mode: "targeted-practice",
          certificationId,
          domains: [domainId],
        },
      });
    },
  );

  test("suporta múltiplos weakDomains sem duplicar o contexto", () => {
    const domains = certificationPaths["clf-c02"].domains.slice(0, 2);
    const result = engine.generateDiagnosticRecommendations(
      diagnosticResult("clf-c02", domains.map((domain) => domain.englishName)),
    );

    expect(result.weakDomains).toEqual(
      domains.map((domain) => domain.id),
    );
    expect(result.recommendations.questions.context.domains).toEqual(
      domains.map((domain) => domain.id),
    );
  });

  test("trata AIF parcial sem inventar domínio ou conteúdo", () => {
    const result = engine.generateDiagnosticRecommendations(
      diagnosticResult("aif-c01", ["fundamentals-genai"]),
    );

    expect(result.weakDomains).toEqual(["fundamentals-genai"]);
    expect(result.priorities.some((item) => item.domainId === "applications-foundation-models")).toBe(true);
    expect(result.recommendations.flashcards.context.weakDomains).toEqual([
      "fundamentals-genai",
    ]);
  });

  test("não depende de diagnóstico para preservar Study Now", () => {
    const profile = {
      certification: "clf-c02",
      domains: [],
      weakAreas: [],
      overview: { readiness: 0 },
    };

    const result = engine.generateStudyPlan(profile);

    expect(result.nextActions[0].type).toBe("empty_state");
    expect(result.nextActions[0].route).toContain("simulados.html");
  });

  test("retorna null para resultado inválido", () => {
    expect(engine.generateDiagnosticRecommendations(null)).toBeNull();
    expect(
      engine.generateDiagnosticRecommendations({ certificationId: "clf-c02" }),
    ).toBeNull();
  });

  test("mantém recomendações desativadas quando não há weakDomains", () => {
    const result = engine.generateDiagnosticRecommendations({
      ...diagnosticResult("saa-c03", []),
      weakDomains: [],
    });

    expect(result.priorities.every((item) => item.priority === "low")).toBe(true);
    expect(result.recommendations.flashcards.enabled).toBe(false);
    expect(result.recommendations.questions.enabled).toBe(false);
  });
});
