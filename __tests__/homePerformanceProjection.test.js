import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import {
  createHomePerformanceProjection,
  getReadinessViewModel,
} from "../src/frontend/js/analytics/homePerformanceProjection.js";

function createStorage(history = [], mistakesByCert = {}) {
  return {
    getHistory: () => history,
    getMistakes: (certId) => mistakesByCert[certId] || [],
  };
}

const result = (certId, percentage, date, domainScore = percentage) => ({
  certId,
  percentage,
  date,
  domainScores: {
    security: { total: 100, correct: domainScore },
  },
});

describe("homePerformanceProjection", () => {
  test("mantém 0% e Não iniciada quando não há tentativa", () => {
    const projection = createHomePerformanceProjection(
      createStorage(),
      "clf-c02",
    );
    const view = getReadinessViewModel(projection.profile, "pt");

    expect(projection.profile.overview).toMatchObject({
      examsTaken: 0,
      readiness: 0,
    });
    expect(view).toMatchObject({
      readiness: 0,
      statusKey: "readiness_not_started",
    });
  });

  test("primeira tentativa válida tira a prontidão do estado não iniciado", () => {
    const projection = createHomePerformanceProjection(
      createStorage([result("clf-c02", 0, "2026-09-01", 0)]),
      "clf-c02",
    );
    const view = getReadinessViewModel(projection.profile);

    expect(projection.profile.overview.examsTaken).toBe(1);
    expect(view.statusKey).toBe("readiness_in_progress");
  });

  test("usa a fórmula existente com média, volume, tendência e domínio crítico", () => {
    const projection = createHomePerformanceProjection(
      createStorage([
        result("clf-c02", 80, "2026-09-03", 80),
        result("clf-c02", 70, "2026-09-02", 70),
        result("clf-c02", 50, "2026-09-01", 50),
      ]),
      "clf-c02",
    );

    // média 67 * 0,8 + bônus de volume 6 + tendência positiva 5
    expect(projection.profile.overview).toMatchObject({
      averageScore: 67,
      examsTaken: 3,
      trend: "positive",
      readiness: 65,
    });
  });

  test("recalcula após uma nova tentativa sem depender da Jornada", () => {
    const history = [result("clf-c02", 50, "2026-09-01", 50)];
    const storage = createStorage(history);
    const before = createHomePerformanceProjection(storage, "clf-c02");
    history.unshift(result("clf-c02", 90, "2026-09-02", 90));
    const after = createHomePerformanceProjection(storage, "clf-c02");

    expect(after.profile.overview.examsTaken).toBe(2);
    expect(after.profile.overview.readiness).toBeGreaterThan(
      before.profile.overview.readiness,
    );
  });

  test("isola CLF-C02 de SAA-C03", () => {
    const storage = createStorage([
      result("saa-c03", 100, "2026-09-02", 100),
      result("clf-c02", 40, "2026-09-01", 40),
    ]);
    const clf = createHomePerformanceProjection(storage, "clf-c02");
    const saa = createHomePerformanceProjection(storage, "saa-c03");

    expect(clf.timeline.map((entry) => entry.score)).toEqual([40]);
    expect(saa.timeline.map((entry) => entry.score)).toEqual([100]);
    expect(saa.profile.overview.readiness).toBeGreaterThan(
      clf.profile.overview.readiness,
    );
  });

  test("consulta erros já filtrados pela certificação", () => {
    const getMistakes = jest.fn(() => []);
    createHomePerformanceProjection(
      { getHistory: () => [], getMistakes },
      "CLF-C02",
    );

    expect(getMistakes).toHaveBeenCalledWith("clf-c02");
  });

  test("a UI de readiness não usa o progresso da Jornada", () => {
    const appSource = readFileSync(
      new URL("../src/frontend/js/app.js", import.meta.url),
      "utf8",
    );
    const start = appSource.indexOf("function updateSidebarProgress");
    const end = appSource.indexOf("// EXPOSIÇÃO GLOBAL", start);
    const readinessBlock = appSource.slice(start, end);

    expect(readinessBlock).toContain("getReadinessViewModel");
    expect(readinessBlock).not.toContain("getCertificationProgress");
  });
});
