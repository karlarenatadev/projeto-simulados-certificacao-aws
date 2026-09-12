import { TrendAnalyzer } from "../src/frontend/js/analytics/trendAnalyzer.js";

const attempt = (percentage, day) => ({
  certId: "clf-c02",
  percentage,
  date: `2026-09-${String(day).padStart(2, "0")}`,
});

describe("TrendAnalyzer", () => {
  const analyzer = new TrendAnalyzer();

  test("detecta crescimento em ordem cronológica", () => {
    expect(
      analyzer.analyze([attempt(80, 3), attempt(70, 2), attempt(50, 1)]),
    ).toBe("positive");
  });

  test("detecta queda em ordem cronológica", () => {
    expect(
      analyzer.analyze([attempt(60, 3), attempt(80, 2), attempt(90, 1)]),
    ).toBe("negative");
  });

  test("separa tendência geral positiva de uma pequena queda recente", () => {
    const history = [attempt(75, 3), attempt(80, 2), attempt(60, 1)];

    expect(analyzer.analyze(history)).toBe("positive");
    expect(analyzer.getRecentDirection(history)).toBe("down");
  });

  test("uma tentativa é insuficiente", () => {
    expect(analyzer.analyze([attempt(80, 1)])).toBe("neutral");
    expect(analyzer.getRecentDirection([attempt(80, 1)])).toBe("insufficient");
  });

  test("inclui nota zero na análise", () => {
    const history = [
      attempt(50, 4),
      attempt(100, 3),
      attempt(0, 2),
      attempt(100, 1),
    ];

    expect(analyzer.analyze(history)).toBe("positive");
    expect(
      analyzer.getEvolutionPoints(history).map((point) => point.score),
    ).toEqual([100, 0, 100, 50]);
  });

  test("não inventa data para ponto sem timestamp válido", () => {
    expect(analyzer.getEvolutionPoints([{ percentage: 0 }])).toEqual([
      { date: null, score: 0, passed: false },
    ]);
  });
});
