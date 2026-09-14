import { DomainAnalyzer } from "../src/frontend/js/analytics/domainAnalyzer.js";

describe("DomainAnalyzer canonical aggregation", () => {
  test("agrega aliases historicos sob a mesma identidade", () => {
    const analyzer = new DomainAnalyzer();
    const result = analyzer.analyze(
      [
        { domainScores: { seguranca: { total: 2, correct: 1 } } },
        {
          domainScores: { "Security and Compliance": { total: 2, correct: 2 } },
        },
      ],
      [{ domain: "security-compliance", isCorrect: false }],
      "clf-c02",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "seguranca",
      domainId: "seguranca",
      score: 75,
      mistakes: 1,
    });
  });
});
