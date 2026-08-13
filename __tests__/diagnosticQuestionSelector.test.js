import {
  getDiagnosticDomainDistribution,
  selectDiagnosticQuestions,
} from "../src/frontend/js/diagnosticQuestionSelector.js";
import { certificationPaths } from "../src/frontend/js/data.js";

const makeQuestion = (certId, domain, index) => ({
  id: `${certId}-${domain}-${index}`,
  certId,
  domain,
  difficulty: index % 2 ? "easy" : "medium",
  tags: ["tag"],
  services: [{ service_name: "AWS Service" }],
  question: `Question ${index}`,
});

const makeBank = (certId, domains, perDomain = 8) =>
  domains.flatMap((domain) =>
    Array.from({ length: perDomain }, (_, index) =>
      makeQuestion(certId, domain.englishName, index),
    ),
  );

describe("DiagnosticQuestionSelector", () => {
  test.each(["clf-c02", "saa-c03", "dva-c02"])(
    "%s seleciona 12 questões equilibradas entre quatro domínios",
    (certId) => {
      const domains = certificationPaths[certId].domains.slice(0, 4);
      const selected = selectDiagnosticQuestions(
        makeBank(certId, domains),
        domains,
        { certId, language: "pt", quantity: 12, random: () => 0.5 },
      );

      expect(selected).toHaveLength(12);
      expect(getDiagnosticDomainDistribution(selected)).toEqual(
        Object.fromEntries(domains.map((domain) => [domain.id, 3])),
      );
      expect(selected.every((question) => question.language === "pt")).toBe(
        true,
      );
    },
  );

  test.each(["clf-c02", "saa-c03", "dva-c02", "aif-c01"])(
    "%s seleciona questões em inglês",
    (certId) => {
      const domains = certificationPaths[certId].domains.filter(
        (domain) =>
          domain.id !== "applications-foundation-models" &&
          domain.id !== "security-compliance-governance",
      );
      const selected = selectDiagnosticQuestions(
        makeBank(certId, domains),
        certificationPaths[certId].domains,
        { certId, language: "en", quantity: 12, random: () => 0.5 },
      );

      expect(selected).toHaveLength(12);
      expect(selected.every((question) => question.language === "en")).toBe(
        true,
      );
    },
  );

  test("AIF calcula quatro questões para cada domínio disponível", () => {
    const domains = certificationPaths["aif-c01"].domains.slice(0, 3);
    const selected = selectDiagnosticQuestions(
      makeBank("aif-c01", domains),
      certificationPaths["aif-c01"].domains,
      { certId: "aif-c01", quantity: 12, random: () => 0.5 },
    );

    expect(selected).toHaveLength(12);
    expect(getDiagnosticDomainDistribution(selected)).toEqual(
      Object.fromEntries(domains.map((domain) => [domain.id, 4])),
    );
  });

  test("redistribui quando um domínio possui poucas questões", () => {
    const domains = certificationPaths["clf-c02"].domains;
    const questions = [
      makeQuestion("clf-c02", domains[0].englishName, 0),
      ...makeBank("clf-c02", domains.slice(1), 8),
    ];
    const selected = selectDiagnosticQuestions(questions, domains, {
      certId: "clf-c02",
      quantity: 12,
      random: () => 0.5,
    });

    expect(selected).toHaveLength(12);
    expect(getDiagnosticDomainDistribution(selected)[domains[0].id]).toBe(1);
    expect(new Set(selected.map((question) => question.id)).size).toBe(12);
  });
});
