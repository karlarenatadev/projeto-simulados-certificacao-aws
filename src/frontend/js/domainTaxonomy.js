import { certificationPaths } from "./data.js";

const EXTRA_ALIASES = {
  "clf-c02": {
    "conceitos-cloud": [
      "cloud-concepts",
      "Conceitos de Nuvem",
      "clf-cloud-concepts",
    ],
    seguranca: [
      "security-compliance",
      "security-and-compliance",
      "clf-security-compliance",
    ],
    tecnologia: [
      "cloud-storage",
      "cloud-technology-and-services",
      "clf-cloud-technology",
    ],
    faturamento: [
      "billing-cost-management",
      "billing-and-pricing",
      "clf-billing-pricing",
    ],
  },
  "saa-c03": {
    "design-resiliente": [
      "design-resilient-architectures",
      "saa-design-resilient",
    ],
    "design-performance": [
      "design-high-performing-architectures",
      "saa-design-performance",
    ],
    "seguranca-aplicacoes": [
      "design-secure-architectures",
      "saa-design-secure",
    ],
    "design-custo": ["design-cost-optimized-architectures", "saa-design-cost"],
  },
  "dva-c02": {
    "desenvolvimento-servicos": [
      "development",
      "development-with-aws-services",
      "dva-development",
    ],
    "seguranca-app": ["security", "dva-security"],
    implementacao: ["deployment", "dva-deployment"],
    "resolucao-problemas": [
      "troubleshooting-performance",
      "dva-troubleshooting",
    ],
  },
  "aif-c01": {
    "fundamentals-ai-ml": ["aif-ai-ml"],
    "fundamentals-genai": ["aif-gen-ai"],
    "applications-foundation-models": [
      "aif-foundation-models",
      "aif-applications",
    ],
    "guidelines-responsible-ai": [
      "aif-responsible-ai",
      "aif-security-compliance",
    ],
    "security-compliance-governance": [
      "aif-governance",
      "aif-security-governance",
    ],
  },
};

function key(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDomainTaxonomy(certificationId) {
  const certId = String(certificationId || "").toLocaleLowerCase();
  const aliases = EXTRA_ALIASES[certId] || {};

  return (certificationPaths[certId]?.domains || []).map((domain) => ({
    certificationId: certId,
    domainId: domain.id,
    labelPt: domain.name,
    labelEn: domain.englishName,
    aliases: [
      domain.id,
      domain.name,
      domain.englishName,
      ...(aliases[domain.id] || []),
    ],
  }));
}

export function normalizeDomain(certificationId, value) {
  const normalizedValue = key(value);
  if (!normalizedValue) return null;

  return (
    getDomainTaxonomy(certificationId).find((domain) =>
      domain.aliases.some((alias) => key(alias) === normalizedValue),
    )?.domainId || null
  );
}

export function getDomainDefinition(certificationId, value) {
  const domainId = normalizeDomain(certificationId, value);
  return (
    getDomainTaxonomy(certificationId).find(
      (domain) => domain.domainId === domainId,
    ) || null
  );
}
