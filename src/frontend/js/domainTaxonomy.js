import { certificationPaths } from "./data.js";

const EXTRA_ALIASES = {
  "clf-c02": {
    "conceitos-cloud": ["cloud-concepts", "Conceitos de Nuvem"],
    seguranca: ["security-compliance", "security-and-compliance"],
    tecnologia: ["cloud-storage", "cloud-technology-and-services"],
    faturamento: ["billing-cost-management", "billing-and-pricing"],
  },
  "saa-c03": {
    "design-resiliente": ["design-resilient-architectures"],
    "design-performance": ["design-high-performing-architectures"],
    "seguranca-aplicacoes": ["design-secure-architectures"],
    "design-custo": ["design-cost-optimized-architectures"],
  },
  "dva-c02": {
    "desenvolvimento-servicos": ["development", "development-with-aws-services"],
    "seguranca-app": ["security"],
    implementacao: ["deployment"],
    "resolucao-problemas": ["troubleshooting-performance"],
  },
  "aif-c01": {
    "fundamentals-ai-ml": ["aif-ai-ml"],
    "fundamentals-genai": ["aif-gen-ai"],
    "applications-foundation-models": ["aif-foundation-models"],
    "guidelines-responsible-ai": ["aif-responsible-ai"],
    "security-compliance-governance": ["aif-security-compliance", "aif-governance"],
  },
};

function key(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
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
