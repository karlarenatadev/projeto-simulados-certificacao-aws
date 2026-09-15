import {
  getMistakeCertification,
  normalizeMistakeRecord,
  projectMistakes,
} from "../src/frontend/js/mistakesProjection.js";

const records = [
  {
    questionId: "q1",
    certId: "clf-c02",
    domain: "billing-and-pricing",
    wrongCount: 2,
    resolved: false,
    lastWrongAt: "2026-01-01",
  },
  {
    questionId: "q2",
    certId: "clf-c02",
    domain: "billing-and-pricing",
    wrongCount: 1,
    resolved: true,
    resolvedAt: "2026-01-02",
  },
  {
    questionId: "q3",
    certId: "aif-c01",
    domain: "security-compliance-governance",
    wrongCount: 3,
    resolved: false,
    lastWrongAt: "2026-01-03",
  },
];

describe("mistakes projection", () => {
  test("aggregates pending, resolved and recurrent records", () => {
    const projection = projectMistakes(records, { status: "all" });
    expect(projection.pending).toBe(2);
    expect(projection.resolved).toBe(1);
    expect(projection.recurrent).toBe(2);
    expect(projection.records[0].questionId).toBe("q3");
  });

  test("filters certification, domain and status without losing history", () => {
    expect(
      projectMistakes(records, { certification: "aif-c01" }).records.map(
        (r) => r.questionId,
      ),
    ).toEqual(["q3"]);
    expect(
      projectMistakes(records, {
        certification: "clf-c02",
        status: "resolved",
      }).records.map((r) => r.questionId),
    ).toEqual(["q2"]);
  });

  test("normalizes legacy certification aliases to one canonical certId", () => {
    const aliases = ["cert", "certification", "certId", "certificationId"];
    aliases.forEach((field) => {
      expect(getMistakeCertification({ [field]: "AIF-C01" })).toBe("aif-c01");
      expect(normalizeMistakeRecord({ [field]: "AIF-C01" }).certId).toBe(
        "aif-c01",
      );
    });
    const projection = projectMistakes(
      [
        { questionId: "a", cert: "aif-c01", question: "A" },
        { questionId: "b", certification: "AIF-C01", question: "B" },
        { questionId: "c", certId: "aif-c01", question: "C" },
        { questionId: "d", certification: "clf-c02", question: "D" },
      ],
      { certification: "aif-c01" },
    );
    expect(projection.records.map((record) => record.certId)).toEqual([
      "aif-c01",
      "aif-c01",
      "aif-c01",
    ]);
  });
});
