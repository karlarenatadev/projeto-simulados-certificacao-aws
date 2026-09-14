import fs from "node:fs";
import {
  createDiagnosticResultProjection,
  getDiagnosticRecommendationText,
} from "../src/frontend/js/diagnosticResult.js";
import { certificationPaths } from "../src/frontend/js/data.js";

const expectedDomains = new Set(
  certificationPaths["aif-c01"].domains.map((domain) => domain.id),
);

describe("AIF diagnostic coverage", () => {
  test.each([
    "data/nivelamento/diagnostic-aif-c01.json",
    "data/nivelamento/diagnostic-aif-c01-en.json",
  ])("%s covers all five domains with PT/EN-compatible records", (file) => {
    const questions = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((question) => question.domain_id))).toEqual(
      expectedDomains,
    );
    expect(
      questions.every(
        (question) =>
          question.options.length >= 2 && Number.isInteger(question.correct),
      ),
    ).toBe(true);
  });

  test("projection includes new domains and recommendation prioritizes the weakest", () => {
    const result = {
      certId: "aif-c01",
      domainScores: {
        "fundamentals-ai-ml": { total: 4, correct: 3 },
        "fundamentals-genai": { total: 4, correct: 4 },
        "applications-foundation-models": { total: 4, correct: 2 },
        "guidelines-responsible-ai": { total: 4, correct: 3 },
        "security-compliance-governance": { total: 4, correct: 1 },
      },
    };
    const projection = createDiagnosticResultProjection(
      result,
      certificationPaths["aif-c01"],
    );
    expect(projection.domains).toHaveLength(5);
    expect(getDiagnosticRecommendationText(projection, "en")).toMatchObject({
      kind: "priority",
      domain: "Security, Compliance, and Governance for AI Solutions",
    });
  });
});
