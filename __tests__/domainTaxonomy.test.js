import {
  getDomainTaxonomy,
  normalizeDomain,
} from "../src/frontend/js/domainTaxonomy.js";

describe("Taxonomia canônica de domínios", () => {
  test("normaliza aliases CLF em PT, EN e valor canônico", () => {
    expect(normalizeDomain("clf-c02", "Conceitos de Cloud")).toBe(
      "conceitos-cloud",
    );
    expect(normalizeDomain("clf-c02", "Cloud Concepts")).toBe(
      "conceitos-cloud",
    );
    expect(normalizeDomain("clf-c02", "conceitos-cloud")).toBe(
      "conceitos-cloud",
    );
  });

  test.each([
    ["saa-c03", "Design Secure Architectures", "seguranca-aplicacoes"],
    ["dva-c02", "Development with AWS Services", "desenvolvimento-servicos"],
    ["aif-c01", "Fundamentals of Generative AI", "fundamentals-genai"],
  ])("normaliza domínio EN de %s", (certId, value, expected) => {
    expect(normalizeDomain(certId, value)).toBe(expected);
  });

  test.each([
    ["saa-c03", "Design de Aplicações Seguras", "seguranca-aplicacoes"],
    ["dva-c02", "Segurança", "seguranca-app"],
    ["aif-c01", "Fundamentos de IA Generativa", "fundamentals-genai"],
  ])("normaliza alias PT de %s", (certId, value, expected) => {
    expect(normalizeDomain(certId, value)).toBe(expected);
  });

  test("mantém os cinco domínios oficiais do AIF", () => {
    expect(getDomainTaxonomy("aif-c01")).toHaveLength(5);
    expect(normalizeDomain("aif-c01", "Applications of Foundation Models")).toBe(
      "applications-foundation-models",
    );
    expect(
      normalizeDomain(
        "aif-c01",
        "Security, Compliance, and Governance for AI Solutions",
      ),
    ).toBe("security-compliance-governance");
  });

  test("retorna null para domínio desconhecido", () => {
    expect(normalizeDomain("clf-c02", "dominio-inexistente")).toBeNull();
    expect(normalizeDomain("certificacao-inexistente", "Cloud Concepts")).toBeNull();
  });
});
