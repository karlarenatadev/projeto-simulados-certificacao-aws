import {
  createHistoryTimeline,
  getAttemptScore,
  getAttemptTimestamp,
} from "../src/frontend/js/utils/historyTimeline.js";

const scores = (timeline) => timeline.map((entry) => entry.score);

describe("historyTimeline", () => {
  test("ordena a timeline DESC de entrada do mais antigo para o mais recente", () => {
    const history = [
      { id: "d", certId: "clf-c02", percentage: 50, date: "2026-09-04" },
      { id: "c", certId: "clf-c02", percentage: 100, date: "2026-09-03" },
      { id: "b", certId: "clf-c02", percentage: 0, date: "2026-09-02" },
      { id: "a", certId: "clf-c02", percentage: 100, date: "2026-09-01" },
    ];

    expect(scores(createHistoryTimeline(history))).toEqual([100, 0, 100, 50]);
    expect(history.map((attempt) => attempt.id)).toEqual(["d", "c", "b", "a"]);
  });

  test("preserva uma entrada que já está ASC", () => {
    const history = [
      { id: "a", percentage: 45, date: "2026-09-01" },
      { id: "b", percentage: 70, date: "2026-09-02" },
      { id: "c", percentage: 82, date: "2026-09-03" },
    ];

    expect(
      createHistoryTimeline(history).map((entry) => entry.attempt.id),
    ).toEqual(["a", "b", "c"]);
  });

  test("mantém estabilidade em timestamps iguais", () => {
    const history = [
      { id: "first", percentage: 10, date: "2026-09-01" },
      { id: "second", percentage: 20, completedAt: "2026-09-01" },
    ];

    expect(
      createHistoryTimeline(history).map((entry) => entry.attempt.id),
    ).toEqual(["first", "second"]);
  });

  test("prioriza campos de conclusão e aceita os formatos históricos", () => {
    const timeline = createHistoryTimeline([
      { id: "timestamp", percentage: 40, timestamp: "2026-09-04" },
      { id: "date", percentage: 30, date: "2026-09-03" },
      { id: "snake", percentage: 20, completed_at: "2026-09-02" },
      {
        id: "camel",
        percentage: 10,
        completedAt: "2026-09-01",
        date: "2026-12-01",
      },
    ]);

    expect(timeline.map((entry) => entry.attempt.id)).toEqual([
      "camel",
      "snake",
      "date",
      "timestamp",
    ]);
    expect(
      getAttemptTimestamp({ completedAt: "invalid", date: "2026-09-05" }),
    ).toBe(Date.parse("2026-09-05"));
  });

  test("mantém registros sem data estáveis e não fabrica timestamp", () => {
    const timeline = createHistoryTimeline([
      { id: "undated-a", percentage: 10, date: "invalid" },
      { id: "dated", percentage: 20, date: "2026-09-01" },
      { id: "undated-b", percentage: 30 },
    ]);

    expect(timeline.map((entry) => entry.attempt.id)).toEqual([
      "dated",
      "undated-a",
      "undated-b",
    ]);
    expect(timeline.slice(1).every((entry) => entry.timestamp === null)).toBe(
      true,
    );
  });

  test("diferencia score zero de score ausente", () => {
    const timeline = createHistoryTimeline([
      { id: "zero", percentage: 0, date: "2026-09-01" },
      { id: "missing", date: "2026-09-02" },
    ]);

    expect(timeline[0]).toMatchObject({ score: 0, hasValidScore: true });
    expect(timeline[1]).toMatchObject({ score: null, hasValidScore: false });
    expect(getAttemptScore({ score: 0, total: 10 })).toBe(0);
  });

  test("filtra certificações sem misturar aliases de campo", () => {
    const timeline = createHistoryTimeline(
      [
        { certification: "CLF-C02", percentage: 50, date: "2026-09-01" },
        { certificationId: "saa-c03", percentage: 99, date: "2026-09-02" },
      ],
      { certificationId: "clf-c02" },
    );

    expect(scores(timeline)).toEqual([50]);
  });
});
