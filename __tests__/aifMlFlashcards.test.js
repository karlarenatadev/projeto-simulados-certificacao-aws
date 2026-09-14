import { glossaryTerms } from "../src/frontend/js/data.js";

const aifMl = glossaryTerms.filter(
  (card) => card.cert === "aif-c01" && card.domain === "fundamentals-ai-ml",
);

describe("AIF-C01 Machine Learning flashcards", () => {
  test("adds eight bilingual cards to the canonical ML domain", () => {
    expect(aifMl).toHaveLength(18);
    expect(aifMl.every((card) => card.term?.pt && card.term?.en)).toBe(true);
    expect(
      aifMl.every((card) => card.definition?.pt && card.definition?.en),
    ).toBe(true);
  });

  test.each([
    "regressão",
    "classificação",
    "clustering",
    "reinforcement learning",
  ])("contains complementary cards for %s", (concept) => {
    const matches = aifMl.filter((card) =>
      `${card.term.pt} ${card.definition.pt}`.toLowerCase().includes(concept),
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test("keeps stable unique IDs and no duplicate bilingual fronts", () => {
    expect(new Set(aifMl.map((card) => card.id)).size).toBe(aifMl.length);
    expect(new Set(aifMl.map((card) => card.term.pt)).size).toBe(aifMl.length);
    expect(new Set(aifMl.map((card) => card.term.en)).size).toBe(aifMl.length);
  });

  test("does not leak the new cards to other certifications or domains", () => {
    const fronts = new Set(aifMl.map((card) => card.term.pt));
    expect(
      glossaryTerms.filter(
        (card) => card.cert !== "aif-c01" && fronts.has(card.term?.pt),
      ),
    ).toHaveLength(0);
    expect(
      glossaryTerms.filter(
        (card) =>
          card.cert === "aif-c01" &&
          card.domain !== "fundamentals-ai-ml" &&
          fronts.has(card.term?.pt),
      ),
    ).toHaveLength(0);
  });
});
