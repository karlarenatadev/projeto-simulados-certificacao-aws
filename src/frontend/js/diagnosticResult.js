import { getDomainDefinition, normalizeDomain } from "./domainTaxonomy.js";

/** Builds the single projection consumed by diagnostic cards and recommendations. */
export function createDiagnosticResultProjection(
  result,
  certificationInfo,
  weakThreshold = 70,
) {
  const certification = result?.certId || result?.certificationId;
  const configuredDomains = Array.isArray(certificationInfo?.domains)
    ? certificationInfo.domains
    : [];
  const scores =
    result?.domainScores && typeof result.domainScores === "object"
      ? result.domainScores
      : {};

  const domains = configuredDomains
    .map((configured) => {
      const domainId =
        normalizeDomain(certification, configured.id) || configured.id;
      const score = scores[configured.id] || scores[domainId];
      const answered = Number(score?.total) || 0;
      const correct = Number(score?.correct) || 0;
      if (!answered) return null;
      const percentage = (correct / answered) * 100;
      const definition = getDomainDefinition(certification, domainId);
      return {
        domainId,
        label: definition?.labelPt || configured.name || domainId,
        labelEn: definition?.labelEn || configured.englishName || domainId,
        answered,
        correct,
        percentage,
        score: percentage,
        isWeak: percentage < weakThreshold,
        isStrong: percentage >= weakThreshold,
      };
    })
    .filter(Boolean);

  return {
    certification,
    domains,
    overall: {
      answered: domains.reduce((sum, domain) => sum + domain.answered, 0),
      correct: domains.reduce((sum, domain) => sum + domain.correct, 0),
      percentage: result?.percentage ?? result?.overallScore ?? 0,
    },
  };
}

export function getDiagnosticRecommendationText(projection, language = "pt") {
  const domains = Array.isArray(projection?.domains) ? projection.domains : [];
  if (domains.length <= 1) return { kind: "insufficient", domain: null };
  const weakest = [...domains].sort((a, b) => a.percentage - b.percentage)[0];
  return weakest.isWeak
    ? {
        kind: "priority",
        domain: language === "en" ? weakest.labelEn : weakest.label,
      }
    : { kind: "good", domain: null };
}
