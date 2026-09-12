import { generateSmartInsight } from "../src/frontend/js/insightEngine.js";

const mockT = (key, _lang, params) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
};

describe("insightEngine - generateSmartInsight", () => {
  test("retorna insight de início quando histórico está vazio", () => {
    const result = generateSmartInsight([], "pt", mockT);
    expect(result.icon).toBe("fa-solid fa-rocket");
    expect(result.title).toContain("Comece sua jornada");
  });

  test("retorna insight de início para null", () => {
    const result = generateSmartInsight(null, "en", mockT);
    expect(result.title).toContain("Start your journey");
  });

  test("detecta burnout quando há 4+ testes no dia", () => {
    const today = new Date().toISOString();
    const history = Array(5).fill({ percentage: 80, date: today });
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("burnout_warning");
    expect(result.iconColor).toBe("text-red-500");
  });

  test("detecta domínio quando streak >= 3 e score >= 80", () => {
    const history = [
      { percentage: 85, date: "2026-01-03" },
      { percentage: 82, date: "2026-01-02" },
      { percentage: 90, date: "2026-01-01" },
    ];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("dominating");
    expect(result.iconColor).toBe("text-yellow-500");
  });

  test("considera uma tentativa insuficiente para tendência", () => {
    const history = [{ percentage: 67, date: "2025-01-01" }];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("trend_insufficient");
  });

  test("detecta evolução em uma entrada originalmente DESC", () => {
    const history = [
      { percentage: 80, date: "2026-01-03" },
      { percentage: 70, date: "2026-01-02" },
      { percentage: 50, date: "2026-01-01" },
    ];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("consistent_evolution");
  });

  test("detecta queda pela cronologia real", () => {
    const history = [
      { percentage: 60, date: "2026-01-03" },
      { percentage: 80, date: "2026-01-02" },
      { percentage: 90, date: "2026-01-01" },
    ];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("performance_decline");
  });

  test("distingue uma pequena queda recente da tendência geral", () => {
    const history = [
      { percentage: 75, date: "2026-01-03" },
      { percentage: 80, date: "2026-01-02" },
      { percentage: 60, date: "2026-01-01" },
    ];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("recent_dip");
  });

  test("inclui nota zero no insight de tendência", () => {
    const history = [
      { percentage: 50, date: "2026-01-04" },
      { percentage: 100, date: "2026-01-03" },
      { percentage: 0, date: "2026-01-02" },
      { percentage: 100, date: "2026-01-01" },
    ];
    const result = generateSmartInsight(history, "pt", mockT);
    expect(result.title).toBe("recent_dip");
  });
});
