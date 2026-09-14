import {
  createDiagnosticResultProjection,
  getDiagnosticRecommendationText,
} from "../src/frontend/js/diagnosticResult.js";
import { certificationPaths } from "../src/frontend/js/data.js";

describe("DiagnosticResult projection", () => {
  test("cards and recommendation share the same domain data", () => {
    const info = certificationPaths["aif-c01"];
    const result = {
      certId: "aif-c01",
      percentage: 75,
      domainScores: {
        "fundamentals-ai-ml": { total: 4, correct: 3 },
        "fundamentals-genai": { total: 4, correct: 4 },
        "applications-foundation-models": { total: 4, correct: 3 },
        "guidelines-responsible-ai": { total: 4, correct: 2 },
        "security-compliance-governance": { total: 0, correct: 0 },
      },
    };

    const projection = createDiagnosticResultProjection(result, info);
    expect(projection.domains).toHaveLength(4);
    expect(
      projection.domains.find(
        (domain) => domain.domainId === "guidelines-responsible-ai",
      ),
    ).toMatchObject({
      answered: 4,
      correct: 2,
      percentage: 50,
      isWeak: true,
    });
    expect(getDiagnosticRecommendationText(projection, "en")).toEqual({
      kind: "priority",
      domain: info.domains.find(
        (domain) => domain.id === "guidelines-responsible-ai",
      ).englishName,
    });
  });

  test("does not treat domains without questions as zero percent", () => {
    const projection = createDiagnosticResultProjection(
      {
        certId: "aif-c01",
        domainScores: { "fundamentals-genai": { total: 4, correct: 4 } },
      },
      certificationPaths["aif-c01"],
    );
    expect(projection.domains).toHaveLength(1);
    expect(getDiagnosticRecommendationText(projection)).toMatchObject({
      kind: "insufficient",
    });
  });
});
