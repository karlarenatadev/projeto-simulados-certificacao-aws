import fs from "node:fs";
import {
  filterExamTips,
  normalizeExamTips,
  buildExamTipsRecommendation,
  getExamTipsViewState,
} from "../src/frontend/js/recommendations/examTips.js";

const dataset = JSON.parse(
  fs.readFileSync(new URL("../data/exam-tips.json", import.meta.url), "utf8"),
);

describe("exam tips dataset and filters", () => {
  test("normalizes the bilingual dataset with unique IDs and valid types", () => {
    const tips = normalizeExamTips(dataset);
    expect(tips).toHaveLength(143);
    expect(new Set(tips.map((tip) => tip.id)).size).toBe(tips.length);
    expect(new Set(tips.map((tip) => tip.type)).size).toBe(4);
    expect(
      tips.every(
        (tip) =>
          tip.title.pt &&
          tip.title.en &&
          tip.description.pt &&
          tip.description.en,
      ),
    ).toBe(true);
  });

  test.each([
    [{ certificationId: "" }, 143],
    [{ certificationId: "CLF-C02" }, 30],
    [{ certificationId: "SAA-C03" }, 38],
    [{ certificationId: "DVA-C02" }, 36],
    [{ certificationId: "AIF-C01" }, 39],
    [{ certificationId: "SAA-C03", query: "CloudTrail" }, 0],
    [{ certificationId: "AIF-C01", query: "Bedrock" }, 20],
    [{ certificationId: "DVA-C02", query: "DynamoDB" }, 6],
    [{ certificationId: "CLF-C02", domain: "seguranca" }, 15],
    [{ certificationId: "CLF-C02", type: "comparison" }, 13],
    [{ certificationId: "CLF-C02", query: "CloudTrail" }, 3],
    [{ certificationId: "CLF-C02", query: "Hadoop" }, 2],
    [{ certificationId: "CLF-C02", query: "inexistente" }, 0],
  ])("filters with %j", (filters, expected) => {
    expect(filterExamTips(dataset, filters)).toHaveLength(expected);
  });

  test("never shows empty state and card grid at the same time", () => {
    expect(getExamTipsViewState([])).toEqual({
      count: 0,
      showEmpty: true,
      showGrid: false,
    });
    expect(
      getExamTipsViewState(
        filterExamTips(dataset, { certificationId: "SAA-C03" }),
      ),
    ).toEqual({ count: 38, showEmpty: false, showGrid: true });
  });

  test("keeps diagnostic signals in a compatible exam-tips recommendation", () => {
    expect(
      buildExamTipsRecommendation({
        certificationId: "CLF-C02",
        weakDomains: ["seguranca"],
        weakServices: [{ id: "iam" }],
        weakTopics: [{ id: "authentication" }],
      }),
    ).toMatchObject({
      enabled: true,
      type: "exam-tips",
      context: {
        source: "diagnostic",
        certificationId: "CLF-C02",
        weakDomains: ["seguranca"],
      },
    });
  });
});
