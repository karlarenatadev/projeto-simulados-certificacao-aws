import {
  filterTermsByCertification,
  filterTermsByDiagnosticContext,
  getDiagnosticContextViewModel,
  parseDiagnosticContext,
} from "../src/frontend/js/flashcards.js";

const cards = [
  { cert: "clf-c02", domain: "conceitos-cloud", id: "clf-cloud" },
  { cert: "clf-c02", domain: "Security and Compliance", id: "clf-security" },
  { cert: "clf-c02", domain: "tecnologia", id: "clf-technology" },
  { cert: "saa-c03", domain: "seguranca-aplicacoes", id: "saa-security" },
  { cert: "dva-c02", domain: "desenvolvimento-servicos", id: "dva-development" },
  { cert: "aif-c01", domain: "fundamentals-ai-ml", id: "aif-ai" },
  { cert: "saa-c03", domain: "design-custo", id: "saa-cost" },
];

describe("Diagnóstico → Flashcards", () => {
  test.each([
    ["clf-c02", "Security and Compliance", "seguranca", "clf-security"],
    ["saa-c03", "Design Secure Architectures", "seguranca-aplicacoes", "saa-security"],
    ["dva-c02", "Development with AWS Services", "desenvolvimento-servicos", "dva-development"],
    ["aif-c01", "Fundamentals of AI and ML", "fundamentals-ai-ml", "aif-ai"],
  ])(
    "%s preserva a certificação e normaliza o domínio para os cards",
    (certificationId, sourceDomain, canonicalDomain, cardId) => {
      const context = parseDiagnosticContext({
        source: "diagnostic",
        certificationId: certificationId.toUpperCase(),
        weakDomains: [sourceDomain],
      });

      const result = filterTermsByDiagnosticContext(cards, context);

      expect(context).toEqual({
        source: "diagnostic",
        certificationId,
        weakDomains: [canonicalDomain],
      });
      expect(result.map((card) => card.id)).toEqual([cardId]);
      expect(result.every((card) => card.cert === certificationId)).toBe(true);
    },
  );

  test("suporta múltiplos weakDomains sem misturar certificações", () => {
    const context = parseDiagnosticContext({
      source: "diagnostic",
      certificationId: "clf-c02",
      weakDomains: ["seguranca", "tecnologia"],
    });

    const result = filterTermsByDiagnosticContext(cards, context);

    expect(result.map((card) => card.id)).toEqual([
      "clf-security",
      "clf-technology",
    ]);
  });

  test("aceita contexto legado com objetos que possuem domainId ou id", () => {
    const context = parseDiagnosticContext({
      source: "diagnostic",
      certificationId: "CLF-C02",
      weakDomains: [
        { domainId: "seguranca" },
        { id: "Cloud Concepts" },
      ],
    });

    expect(context.weakDomains).toEqual(["seguranca", "conceitos-cloud"]);
  });

  test("retorna contexto nulo para ausência ou formato inválido", () => {
    expect(parseDiagnosticContext(null)).toBeNull();
    expect(parseDiagnosticContext("not-json")).toBeNull();
    expect(
      parseDiagnosticContext({
        source: "manual",
        certificationId: "clf-c02",
        weakDomains: ["seguranca"],
      }),
    ).toBeNull();
    expect(
      parseDiagnosticContext({
        source: "diagnostic",
        certificationId: "clf-c02",
        weakDomains: ["unknown-domain"],
      }),
    ).toBeNull();
  });

  test("mantém fallback restrito à certificação quando não há correspondência", () => {
    const context = parseDiagnosticContext({
      source: "diagnostic",
      certificationId: "CLF-C02",
      weakDomains: ["faturamento"],
    });
    const matching = filterTermsByDiagnosticContext(
      [{ cert: "clf-c02", domain: "domain-without-match", id: "legacy" }],
      context,
    );
    const fallback = filterTermsByCertification(cards, context.certificationId);

    expect(matching).toEqual([]);
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.every((card) => card.cert === "clf-c02")).toBe(true);
    expect(fallback.some((card) => card.cert === "saa-c03")).toBe(false);
  });

  test("filtro manual continua normalizando domínio sem contexto diagnóstico", () => {
    const result = filterTermsByCertification(cards, "SAA-C03").filter(
      (card) => card.domain === "seguranca-aplicacoes",
    );

    expect(result.map((card) => card.id)).toEqual(["saa-security"]);
    expect(filterTermsByDiagnosticContext(cards, null)).toEqual([]);
  });

  test("gera contexto visual em PT e EN usando labels da taxonomia", () => {
    const context = parseDiagnosticContext({
      source: "diagnostic",
      certificationId: "clf-c02",
      weakDomains: ["seguranca", "tecnologia"],
    });

    const pt = getDiagnosticContextViewModel(context, 8, false, "pt");
    const en = getDiagnosticContextViewModel(context, 8, true, "en");

    expect(pt.labels).toEqual([
      "Segurança e Conformidade",
      "Tecnologia",
    ]);
    expect(pt.count).toContain("8");
    expect(pt.fallback).toBe("");
    expect(en.labels).toEqual([
      "Security and Compliance",
      "Cloud Technology and Services",
    ]);
    expect(en.count).toContain("8");
    expect(en.fallback).toContain("not enough");
  });
});
