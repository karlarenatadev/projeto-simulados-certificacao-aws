import {
  buildDiagnosticStudyNowModel,
  getDiagnosticPriorities,
  renderDiagnosticRecommendations,
} from "../src/frontend/js/recommendations/studyNow.js";

function recommendation(overrides = {}) {
  return {
    source: "diagnostic",
    certificationId: "clf-c02",
    weakDomains: ["conceitos-cloud"],
    priorities: [
      { domainId: "conceitos-cloud", score: 42, priority: "high" },
      { domainId: "seguranca", score: 58, priority: "medium" },
      { domainId: "tecnologia", score: 70, priority: "low" },
      { domainId: "faturamento", score: 80, priority: "low" },
    ],
    recommendations: {
      flashcards: {
        enabled: true,
        context: {
          source: "diagnostic",
          certificationId: "clf-c02",
          weakDomains: ["conceitos-cloud"],
        },
      },
      questions: {
        enabled: true,
        context: {
          source: "diagnostic",
          mode: "targeted-practice",
          certificationId: "clf-c02",
          domains: ["conceitos-cloud"],
          weakDomains: ["conceitos-cloud"],
        },
      },
      labs: {
        enabled: true,
        type: "labs",
        context: {
          source: "diagnostic",
          certificationId: "clf-c02",
          services: ["iam", "s3"],
          strongServices: ["iam"],
          secondaryServices: ["s3"],
        },
      },
      cases: {
        enabled: true,
        type: "cases",
        context: {
          source: "diagnostic",
          certificationId: "clf-c02",
          services: ["iam", "s3"],
          strongServices: ["iam"],
          secondaryServices: ["s3"],
          weakDomains: ["conceitos-cloud"],
          weakTopics: [],
        },
      },
    },
    ...overrides,
  };
}

describe("Study Now — recomendações do Raio-X", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="study-now-recommendations"></div>';
    localStorage.clear();
    sessionStorage.clear();
  });

  test("limita a três prioridades e ordena pelo priority/score do engine", () => {
    const priorities = getDiagnosticPriorities(recommendation());

    expect(priorities).toHaveLength(3);
    expect(priorities.map((item) => item.domainId)).toEqual([
      "conceitos-cloud",
      "seguranca",
      "tecnologia",
    ]);
  });

  test("usa labels humanas da taxonomia em PT", () => {
    const model = buildDiagnosticStudyNowModel(recommendation(), "pt");

    expect(model.priorities[0].label).toBe("Conceitos de Cloud");
    expect(model.priorities[0].label).not.toBe("conceitos-cloud");
  });

  test("usa labels humanas da taxonomia em EN", () => {
    const model = buildDiagnosticStudyNowModel(recommendation(), "en");

    expect(model.priorities[0].label).toBe("Cloud Concepts");
  });

  test("expõe CTAs para Flashcards e targeted-practice", () => {
    renderDiagnosticRecommendations(recommendation());

    expect(
      document.querySelector('[data-diagnostic-action="flashcards"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-diagnostic-action="questions"]'),
    ).not.toBeNull();
  });

  test("expõe CTA único de Labs e preserva todos os serviços no contexto", () => {
    const model = buildDiagnosticStudyNowModel(recommendation(), "pt");

    expect(model.labsContext).toMatchObject({
      certificationId: "clf-c02",
      services: ["iam", "s3"],
    });

    renderDiagnosticRecommendations(recommendation());

    expect(document.querySelectorAll('[data-diagnostic-action="labs"]')).toHaveLength(1);
    expect(document.body.textContent).not.toContain("iam");
    expect(document.body.textContent).not.toContain("s3");
  });

  test("não exibe CTA de Labs sem contexto válido", () => {
    const result = recommendation();
    result.recommendations.labs = { enabled: false };

    expect(buildDiagnosticStudyNowModel(result, "en").labsContext).toBeNull();
    renderDiagnosticRecommendations(result);
    expect(document.querySelector('[data-diagnostic-action="labs"]')).toBeNull();
  });

  test("usa o texto do CTA de Labs em EN", () => {
    localStorage.setItem("language", "en");
    renderDiagnosticRecommendations(recommendation());

    expect(document.querySelector('[data-diagnostic-action="labs"]')?.textContent).toContain(
      "View recommended Labs",
    );
  });

  test("exibe um único CTA de Cases e preserva o contexto", () => {
    const model = buildDiagnosticStudyNowModel(recommendation());

    expect(model.casesContext).toMatchObject({
      certificationId: "clf-c02",
      services: ["iam", "s3"],
    });
    renderDiagnosticRecommendations(recommendation());

    expect(document.querySelectorAll('[data-diagnostic-action="cases"]')).toHaveLength(1);
  });

  test("não exibe CTA de Cases sem recomendação válida", () => {
    const result = recommendation();
    result.recommendations.cases = { enabled: false };

    expect(buildDiagnosticStudyNowModel(result).casesContext).toBeNull();
    renderDiagnosticRecommendations(result);
    expect(document.querySelector('[data-diagnostic-action="cases"]')).toBeNull();
  });

  test("não renderiza recomendação sem diagnóstico válido", () => {
    renderDiagnosticRecommendations(null);
    expect(document.getElementById("study-now-recommendations").innerHTML).toBe("");

    renderDiagnosticRecommendations({ source: "legacy" });
    expect(document.getElementById("study-now-recommendations").innerHTML).toBe("");
  });

  test("não renderiza recomendações quando não há weakDomains", () => {
    expect(
      buildDiagnosticStudyNowModel(recommendation({ weakDomains: [] })),
    ).toBeNull();
  });

  test("mantém AIF parcial limitado às prioridades recebidas", () => {
    const aif = recommendation({
      certificationId: "aif-c01",
      weakDomains: ["fundamentals-genai"],
      priorities: [
        { domainId: "fundamentals-genai", score: 45, priority: "high" },
      ],
    });

    const model = buildDiagnosticStudyNowModel(aif);
    expect(model.priorities).toHaveLength(1);
    expect(model.priorities[0].domainId).toBe("fundamentals-genai");
  });
});
