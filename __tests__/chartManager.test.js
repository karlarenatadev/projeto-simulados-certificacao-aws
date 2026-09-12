import { jest } from "@jest/globals";
import { renderPerformanceLineChart } from "../src/frontend/js/chartManager.js";

describe("renderPerformanceLineChart", () => {
  let context;

  beforeEach(() => {
    document.documentElement.lang = "pt-BR";
    document.body.innerHTML = '<canvas id="performanceLineChart"></canvas>';
    context = {
      clearRect: jest.fn(),
      fillText: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    };
    HTMLCanvasElement.prototype.getContext = jest.fn(() => context);
    globalThis.Chart = jest.fn((_canvas, config) => ({
      config,
      destroy: jest.fn(),
    }));
    window.performanceLineChartInstance = null;
  });

  afterEach(() => {
    delete globalThis.Chart;
    window.performanceLineChartInstance = null;
  });

  test("gera labels e pontos na cronologia real", () => {
    renderPerformanceLineChart(
      [
        { certId: "clf-c02", percentage: 82, completed_at: "2026-09-07" },
        { certId: "clf-c02", percentage: 45, date: "2026-09-02" },
        { certId: "clf-c02", percentage: 70, completedAt: "2026-09-04" },
      ],
      "geral",
      "clf-c02",
    );

    const config = globalThis.Chart.mock.calls[0][1];
    expect(config.data.labels).toEqual([
      "Simulado 1",
      "Simulado 2",
      "Simulado 3",
    ]);
    expect(config.data.datasets[0].data).toEqual([45, 70, 82]);
  });

  test("preserva nota zero e isola a certificação ativa", () => {
    renderPerformanceLineChart(
      [
        { certId: "saa-c03", percentage: 99, date: "2026-09-01" },
        { certId: "clf-c02", percentage: 50, date: "2026-09-03" },
        { certId: "clf-c02", percentage: 0, date: "2026-09-02" },
      ],
      "geral",
      "CLF-C02",
    );

    const config = globalThis.Chart.mock.calls[0][1];
    expect(config.data.datasets[0].data).toEqual([0, 50]);
    expect(config.data.labels).toEqual(["Simulado 1", "Simulado 2"]);
  });

  test("expõe a data real no tooltip quando disponível", () => {
    renderPerformanceLineChart(
      [{ certId: "clf-c02", percentage: 82, date: "2026-09-07T12:00:00Z" }],
      "geral",
      "clf-c02",
    );

    const callbacks =
      globalThis.Chart.mock.calls[0][1].options.plugins.tooltip.callbacks;
    expect(callbacks.label({ parsed: { y: 82 } })).toBe("Nota: 82%");
    expect(callbacks.afterLabel({ dataIndex: 0 })).toMatch(/07\/09\/2026/);
  });
});
