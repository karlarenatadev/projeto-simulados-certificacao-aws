import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { SimulatorEngineClient } from "../src/frontend/js/simulator/engine.js";

const hubHtml = readFileSync("src/frontend/pages/simulator-hub.html", "utf8");
const jornadaHtml = readFileSync("src/frontend/pages/jornada.html", "utf8");

describe("fluxos do simulador", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="simulatorStatus"></div>
      <div class="stepper">
        <div class="step" id="step-1"></div>
        <div class="step" id="step-2"></div>
        <div class="step" id="step-3"></div>
        <div class="step" id="step-4"></div>
      </div>
      <div class="stage-panel" id="panel-1"></div>
      <div class="stage-panel" id="panel-2"></div>
      <div class="stage-panel" id="panel-3"></div>
      <div class="stage-panel" id="panel-4"></div>
      <div id="evaluationContent"></div>
    `;
    localStorage.clear();
  });

  test("hub aceita resposta API em array e envelope data", () => {
    expect(hubHtml).toContain("Array.isArray(result) ? result : result?.data");
    expect(hubHtml).toContain("./data/cases/architecture_cases.json");
  });

  test("carrega fallback local quando a API está indisponível", async () => {
    const cases = [{ id: "case-1", difficulty: "beginner", services: [] }];
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => cases });

    const engine = new SimulatorEngineClient("beginner", null);
    await engine.loadCaseData();

    expect(engine.caseData.id).toBe("case-1");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("navegação de etapas usa os painéis existentes", () => {
    const engine = new SimulatorEngineClient("beginner", "case-1");
    engine.nextStage();

    expect(engine.currentStage).toBe(2);
    expect(document.getElementById("panel-2").classList.contains("active")).toBe(
      true,
    );

    engine.prevStage();
    expect(engine.currentStage).toBe(1);
    expect(document.getElementById("panel-1").classList.contains("active")).toBe(
      true,
    );
  });

  test("renderiza avaliação sem depender de elemento inexistente", () => {
    const engine = new SimulatorEngineClient("beginner", "case-1");
    engine.caseData = { architecture_graph: null };

    expect(() =>
      engine.renderEvaluation({ score: 80, passed: true, feedback: "ok" }),
    ).not.toThrow();
    expect(document.getElementById("evaluationContent").textContent).toContain(
      "80%",
    );
  });

  test("authGuard interrompe a inicialização da Jornada quando falha", () => {
    expect(jornadaHtml).toContain("const session = authGuard();");
    expect(jornadaHtml).toContain("if (!session) return;");
  });
});
