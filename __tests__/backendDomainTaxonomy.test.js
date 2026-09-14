import {
  getDomainTaxonomy,
  normalizeDomain,
  normalizeDifficulty,
} from "../backend/database/domainTaxonomy.js";

describe("backend domain taxonomy contract", () => {
  test.each([
    ["CLF-C02", "Security and Compliance", "seguranca"],
    ["SAA-C03", "saa-design-resilient", "design-resiliente"],
    ["DVA-C02", "Segurança", "seguranca-app"],
    ["AIF-C01", "Fundamentals of Generative AI", "fundamentals-genai"],
  ])(
    "resolves %s aliases to one runtime identity",
    (certification, value, expected) => {
      expect(normalizeDomain(certification, value)?.id).toBe(expected);
    },
  );

  test("returns the stored official name as the query representation", () => {
    expect(normalizeDomain("CLF-C02", "seguranca")).toMatchObject({
      id: "seguranca",
      canonicalId: "clf-security-compliance",
      officialName: "Security and Compliance",
    });
  });

  test("does not resolve a domain across certifications", () => {
    expect(
      normalizeDomain("CLF-C02", "Design Secure Architectures"),
    ).toBeNull();
  });

  test("exposes all active certification domains", () => {
    expect(getDomainTaxonomy("CLF-C02")).toHaveLength(4);
    expect(getDomainTaxonomy("SAA-C03")).toHaveLength(4);
    expect(getDomainTaxonomy("DVA-C02")).toHaveLength(4);
    expect(getDomainTaxonomy("AIF-C01")).toHaveLength(5);
  });

  test("normalizes only the established difficulty enum", () => {
    expect(normalizeDifficulty("EASY")).toBe("easy");
    expect(normalizeDifficulty("beginner")).toBeNull();
  });
});
