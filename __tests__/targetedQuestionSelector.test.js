import { certificationPaths } from "../src/frontend/js/data.js";
import {
  buildTargetedPracticeContext,
  selectTargetedQuestions,
  TARGETED_PRACTICE_QUESTION_COUNT,
} from "../src/frontend/js/targetedQuestionSelector.js";

function makeQuestions(certId, domains, perDomain = 6) {
  return domains.flatMap((domain) =>
    Array.from({ length: perDomain }, (_, index) => ({
      id: `${certId}-${domain.id}-${index}`,
      certId,
      domain: domain.englishName,
      difficulty: index % 3 === 0 ? "easy" : index % 3 === 1 ? "medium" : "hard",
      question: `${certId} ${domain.id} ${index}`,
    })),
  );
}

describe("TargetedQuestionSelector", () => {
  test.each(["clf-c02", "saa-c03", "dva-c02", "aif-c01"])(
    "%s preserva a certificação e seleciona a quantidade centralizada",
    (certId) => {
      const domains = certificationPaths[certId].domains.slice(0, 3);
      const selected = selectTargetedQuestions(
        makeQuestions(certId, domains),
        certId.toUpperCase(),
        domains.slice(0, 2).map((domain) => domain.id),
      );

      expect(selected).toHaveLength(TARGETED_PRACTICE_QUESTION_COUNT);
      expect(selected.every((question) => question.certId === certId)).toBe(true);
      expect(
        selected.every((question) =>
          domains.slice(0, 2).some((domain) => domain.id === question.domainId),
        ),
      ).toBe(true);
    },
  );

  test("distribui questões entre múltiplos weakDomains", () => {
    const certId = "clf-c02";
    const domains = certificationPaths[certId].domains;
    const selected = selectTargetedQuestions(
      makeQuestions(certId, domains),
      certId,
      [domains[0].id, domains[1].id],
      10,
    );
    const counts = selected.reduce((result, question) => {
      result[question.domainId] = (result[question.domainId] || 0) + 1;
      return result;
    }, {});

    expect(counts[domains[0].id]).toBeGreaterThan(0);
    expect(counts[domains[1].id]).toBeGreaterThan(0);
    expect(Math.abs(counts[domains[0].id] - counts[domains[1].id])).toBeLessThanOrEqual(1);
  });

  test("evita IDs usados no diagnóstico quando há alternativas", () => {
    const certId = "saa-c03";
    const domains = certificationPaths[certId].domains;
    const bank = makeQuestions(certId, domains);
    const excluded = bank.slice(0, 4).map((question) => question.id);
    const selected = selectTargetedQuestions(
      bank,
      certId,
      domains.slice(0, 2).map((domain) => domain.id),
      8,
      excluded,
    );

    expect(selected.some((question) => excluded.includes(question.id))).toBe(false);
  });

  test("faz fallback para outro weakDomain e depois para a certificação", () => {
    const certId = "dva-c02";
    const domains = certificationPaths[certId].domains;
    const weakQuestion = makeQuestions(certId, [domains[0]], 1);
    const otherCertQuestion = makeQuestions("clf-c02", certificationPaths["clf-c02"].domains.slice(0, 1), 20);
    const selected = selectTargetedQuestions(
      [...weakQuestion, ...otherCertQuestion],
      certId,
      [domains[0].id, domains[1].id],
      5,
    );

    expect(selected).toHaveLength(1);
    expect(selected.every((question) => question.certId === certId)).toBe(true);
  });

  test("prioriza uma distribuição simples de dificuldade", () => {
    const certId = "aif-c01";
    const domains = certificationPaths[certId].domains.slice(0, 2);
    const selected = selectTargetedQuestions(
      makeQuestions(certId, domains),
      certId,
      domains.map((domain) => domain.id),
      10,
    );

    expect(selected.some((question) => question.difficulty === "medium")).toBe(true);
    expect(selected.some((question) => question.difficulty === "hard")).toBe(true);
  });

  test("cria contexto de prática com origem e IDs normalizados", () => {
    const context = buildTargetedPracticeContext(
      "CLF-C02",
      ["Security and Compliance", "tecnologia"],
      ["question-1", "question-1", "question-2"],
    );

    expect(context).toEqual({
      source: "diagnostic",
      mode: "targeted-practice",
      certificationId: "clf-c02",
      domains: ["seguranca", "tecnologia"],
      weakDomains: ["seguranca", "tecnologia"],
      questionIds: ["question-1", "question-2"],
    });
  });
});
