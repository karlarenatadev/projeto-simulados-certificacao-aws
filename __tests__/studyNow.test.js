import { jest } from "@jest/globals";
import {
  buildDiagnosticStudyNowModel,
  getDiagnosticPriorities,
  refreshStudyNow,
  renderDiagnosticRecommendations,
  renderStudyNowState,
  selectStudyNowRecommendation,
  STUDY_NOW_STATES,
} from "../src/frontend/js/recommendations/studyNow.js";
import { SessionManager } from "../src/frontend/js/core/sessionManager.js";

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

    expect(
      document.querySelectorAll('[data-diagnostic-action="labs"]'),
    ).toHaveLength(1);
    expect(document.body.textContent).not.toContain("iam");
    expect(document.body.textContent).not.toContain("s3");
  });

  test("não exibe CTA de Labs sem contexto válido", () => {
    const result = recommendation();
    result.recommendations.labs = { enabled: false };

    expect(buildDiagnosticStudyNowModel(result, "en").labsContext).toBeNull();
    renderDiagnosticRecommendations(result);
    expect(
      document.querySelector('[data-diagnostic-action="labs"]'),
    ).toBeNull();
  });

  test("usa o texto do CTA de Labs em EN", () => {
    localStorage.setItem("language", "en");
    renderDiagnosticRecommendations(recommendation());

    expect(
      document.querySelector('[data-diagnostic-action="labs"]')?.textContent,
    ).toContain("View recommended Labs");
  });

  test("usa o idioma oficial da sessão antes das chaves legadas", () => {
    SessionManager.persist({
      user: {
        id: "study-now-user",
        email: "user@a3data.com.br",
        language: "en",
        role: "STUDENT",
        certification: "clf-c02",
      },
    });
    localStorage.setItem("language", "pt");
    localStorage.setItem("aws_sim_lang", "pt");

    renderDiagnosticRecommendations(recommendation());

    expect(
      document.querySelector('[data-diagnostic-action="labs"]')?.textContent,
    ).toContain("View recommended Labs");
  });

  test("exibe um único CTA de Cases e preserva o contexto", () => {
    const model = buildDiagnosticStudyNowModel(recommendation());

    expect(model.casesContext).toMatchObject({
      certificationId: "clf-c02",
      services: ["iam", "s3"],
    });
    renderDiagnosticRecommendations(recommendation());

    expect(
      document.querySelectorAll('[data-diagnostic-action="cases"]'),
    ).toHaveLength(1);
  });

  test("não exibe CTA de Cases sem recomendação válida", () => {
    const result = recommendation();
    result.recommendations.cases = { enabled: false };

    expect(buildDiagnosticStudyNowModel(result).casesContext).toBeNull();
    renderDiagnosticRecommendations(result);
    expect(
      document.querySelector('[data-diagnostic-action="cases"]'),
    ).toBeNull();
  });

  test("não renderiza recomendação sem diagnóstico válido", () => {
    renderDiagnosticRecommendations(null);
    expect(document.getElementById("study-now-recommendations").innerHTML).toBe(
      "",
    );

    renderDiagnosticRecommendations({ source: "legacy" });
    expect(document.getElementById("study-now-recommendations").innerHTML).toBe(
      "",
    );
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

function learningProfile(overrides = {}) {
  return {
    certification: "clf-c02",
    overview: {
      examsTaken: 2,
      readiness: 50,
      trend: "neutral",
      recentDirection: "stable",
    },
    domains: [],
    weakAreas: [],
    nextActions: [],
    ...overrides,
  };
}

describe("Study Now — recomendação compacta da home", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="study-now-compact"></div>';
    localStorage.clear();
    sessionStorage.clear();
  });

  test("transita de loading para ready no container compacto atual", async () => {
    renderStudyNowState(STUDY_NOW_STATES.LOADING, {}, "pt");
    expect(document.getElementById("study-now-compact").dataset.state).toBe(
      "loading",
    );

    const profile = learningProfile({
      overview: {
        examsTaken: 0,
        readiness: 0,
        trend: "neutral",
        recentDirection: "insufficient",
      },
    });
    const result = await refreshStudyNow({
      projection: { certificationId: "clf-c02", profile },
      storage: {
        getMistakes: () => [],
        getSprintState: () => ({ completedStages: [] }),
        getReviewStats: () => ({ pending: 0 }),
      },
      engine: { generateStudyPlan: (value) => value },
      language: "pt",
    });

    expect(result.state).toBe(STUDY_NOW_STATES.READY);
    expect(document.getElementById("study-now-compact").dataset.state).toBe(
      "ready",
    );
    expect(document.body.textContent).toContain("Faça seu primeiro simulado");
    expect(document.querySelector("#study-now-compact a")?.href).toContain(
      "simulados.html?cert=clf-c02",
    );
  });

  test("renderiza estado empty explicitamente", () => {
    renderStudyNowState(STUDY_NOW_STATES.EMPTY, {}, "en");

    expect(document.getElementById("study-now-compact").dataset.state).toBe(
      "empty",
    );
    expect(document.body.textContent).toContain("No recommendation");
  });

  test("prioriza sprint ativa e incompleta", () => {
    const result = selectStudyNowRecommendation({
      profile: learningProfile(),
      sprintState: { completedStages: ["1", "2"] },
      mistakes: [{ id: "q1" }],
      reviewStats: { pending: 3 },
    });

    expect(result).toMatchObject({
      kind: "sprint",
      titleVariables: { day: 3 },
      route: "study-sprint.html",
    });
  });

  test("prioriza erros pendentes sem criar link para erros.html", () => {
    const result = selectStudyNowRecommendation({
      profile: learningProfile(),
      sprintState: { completedStages: [] },
      mistakes: [{ id: "q1" }],
      reviewStats: { pending: 3 },
    });

    expect(result).toMatchObject({ kind: "mistakes" });
    expect(result.route).toBeUndefined();
  });

  test("recomenda deck pendente quando não há sprint ou erros", () => {
    expect(
      selectStudyNowRecommendation({
        profile: learningProfile(),
        sprintState: { completedStages: [] },
        mistakes: [],
        reviewStats: { pending: 2 },
      }),
    ).toMatchObject({ kind: "review-deck", route: "flashcards.html" });
  });

  test("recomenda o domínio crítico pelo fluxo de prática real", () => {
    const result = selectStudyNowRecommendation({
      profile: learningProfile({
        domains: [{ name: "security", score: 35, status: "critical" }],
      }),
      sprintState: { completedStages: [] },
      mistakes: [],
      reviewStats: { pending: 0 },
      studyPlan: {
        nextActions: [
          {
            type: "practice",
            route: "./simulados.html?mode=focus&domain=security&cert=clf-c02",
          },
        ],
      },
    });

    expect(result).toMatchObject({
      kind: "critical-domain",
      route: "./simulados.html?mode=focus&domain=security&cert=clf-c02",
    });
  });

  test("recomenda revisão quando o desempenho recente cai", () => {
    const result = selectStudyNowRecommendation({
      profile: learningProfile({
        overview: {
          examsTaken: 3,
          readiness: 60,
          trend: "positive",
          recentDirection: "down",
        },
      }),
      sprintState: { completedStages: [] },
      mistakes: [],
      reviewStats: { pending: 0 },
    });

    expect(result).toMatchObject({ kind: "declining" });
  });

  test("usa novo simulado como fallback determinístico", () => {
    expect(
      selectStudyNowRecommendation({
        profile: learningProfile(),
        sprintState: { completedStages: [] },
        mistakes: [],
        reviewStats: { pending: 0 },
      }),
    ).toMatchObject({
      kind: "new-quiz",
      route: "simulados.html?cert=clf-c02",
    });
  });

  test("termina em estado de erro controlado quando a projeção falha", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const result = await refreshStudyNow({
        certificationId: "clf-c02",
        storage: {},
        analytics: {
          getLearningProfile: () => {
            throw new Error("storage unavailable");
          },
        },
        engine: { generateStudyPlan: (value) => value },
        language: "en",
      });

      expect(result.state).toBe(STUDY_NOW_STATES.ERROR);
      expect(document.getElementById("study-now-compact").dataset.state).toBe(
        "error",
      );
      expect(document.body.textContent).toContain("could not calculate");
    } finally {
      consoleError.mockRestore();
    }
  });
});
