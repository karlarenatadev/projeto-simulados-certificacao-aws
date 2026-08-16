import { jest } from "@jest/globals";
import {
  filterLabs,
  loadLabsCatalog,
  readLabsRecommendation,
  resolveLabsCatalogUrl,
  selectRecommendedLabs,
} from "../src/frontend/js/modules/laboratorios.js";
import { RecommendationEngine } from "../src/frontend/js/recommendations/recommendationEngine.js";
import { normalizeServiceId } from "../src/frontend/js/utils/serviceIdentity.js";

const catalog = [
  { id: "iam-saa", certification: "SAA-C03", service: "AWS IAM", difficulty: "intermediate", active: true },
  { id: "s3-clf", certification: "CLF-C02", service: "Amazon S3", difficulty: "beginner", active: true },
  { id: "iam-clf", certification: "CLF-C02", service: "AWS IAM", difficulty: "beginner", active: true },
  { id: "iam-inactive", certification: "CLF-C02", service: "AWS IAM", difficulty: "advanced", active: false },
];

describe("Labs deploy/runtime", () => {
  test("resolve o catálogo relativamente à página, inclusive em project Pages", () => {
    expect(resolveLabsCatalogUrl("http://localhost:8080/laboratorios.html")).toBe(
      "http://localhost:8080/data/labs/labs.json",
    );
    expect(
      resolveLabsCatalogUrl(
        "https://example.github.io/projeto-simulados-certificacao-aws/laboratorios.html",
      ),
    ).toBe(
      "https://example.github.io/projeto-simulados-certificacao-aws/data/labs/labs.json",
    );
  });

  test("trata HTTP non-OK como erro e não tenta caminho alternativo silencioso", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
    await expect(
      loadLabsCatalog(fetchMock, "https://example.github.io/repo/laboratorios.html"),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.github.io/repo/data/labs/labs.json",
    );
  });

  test("normaliza o filtro de certificação do catálogo", () => {
    expect(filterLabs(catalog, { certification: "saa-c03" }).map((lab) => lab.id)).toEqual([
      "iam-saa",
    ]);
  });
});

describe("RecommendationEngine → Labs", () => {
  test("normaliza serviços humanos e aliases mínimos", () => {
    expect(normalizeServiceId("AWS IAM")).toBe("iam");
    expect(normalizeServiceId("IAM")).toBe("iam");
    expect(normalizeServiceId("Amazon S3")).toBe("s3");
  });

  test("preserva certificação e prioriza serviço strong", () => {
    const result = selectRecommendedLabs(catalog, {
      certificationId: "clf-c02",
      services: ["iam", "s3"],
      strongServices: ["iam"],
    });

    expect(result.fallback).toBe(false);
    expect(result.labs.map((lab) => lab.id)).toEqual(["iam-clf", "s3-clf"]);
    expect(result.labs.every((lab) => lab.certification === "CLF-C02")).toBe(true);
  });

  test("suporta vários serviços e nunca mistura certificações", () => {
    const result = selectRecommendedLabs(catalog, {
      certificationId: "SAA-C03",
      services: ["iam", "s3"],
      strongServices: [],
    });

    expect(result.labs.map((lab) => lab.id)).toEqual(["iam-saa"]);
    expect(result.labs[0].certification).toBe("SAA-C03");
  });

  test("faz fallback para Labs disponíveis da mesma certificação", () => {
    const result = selectRecommendedLabs(catalog, {
      certificationId: "CLF-C02",
      services: ["kms"],
      strongServices: ["kms"],
    });

    expect(result.fallback).toBe(true);
    expect(result.labs.map((lab) => lab.id)).toEqual(["s3-clf", "iam-clf"]);
  });

  test("não cria recomendação sem diagnóstico válido", () => {
    expect(readLabsRecommendation({ getItem: () => null })).toBeNull();
    expect(readLabsRecommendation({ getItem: () => JSON.stringify({ source: "legacy" }) })).toBeNull();
  });

  test("RecommendationEngine fornece contexto de Labs sem selecionar conteúdo", () => {
    const result = new RecommendationEngine().generateDiagnosticRecommendations({
      certificationId: "CLF-C02",
      overallScore: 50,
      domainResults: [{ domainId: "conceitos-cloud", score: 40 }],
      weakDomains: ["conceitos-cloud"],
      strongDomains: [],
      weakServices: [
        { id: "iam", occurrences: 2, evidence: "strong" },
        { id: "s3", occurrences: 1, evidence: "secondary" },
      ],
      weakTopics: [],
    });

    expect(result.recommendations.labs).toMatchObject({
      enabled: true,
      type: "labs",
      context: {
        source: "diagnostic",
        certificationId: "clf-c02",
        services: ["iam", "s3"],
        strongServices: ["iam"],
        secondaryServices: ["s3"],
      },
    });
  });
});
