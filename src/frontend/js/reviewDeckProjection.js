import { getDomainDefinition, normalizeDomain } from "./domainTaxonomy.js";
import { normalizeCertificationId } from "./utils/certUtils.js";
import { normalizeLegacyReviewQuestion } from "./utils/reviewCard.js";

export function normalizeReviewCard(card = {}, certification) {
  const certId =
    normalizeCertificationId(
      card.certId || card.certification || certification,
    ) ||
    certification ||
    "";
  const domainId =
    normalizeDomain(certId, card.domain || card.domainId || "") || null;
  return {
    ...card,
    question: normalizeLegacyReviewQuestion(card.question || ""),
    certId,
    certification: certId,
    domainId,
    reviewStatus:
      card.reviewStatus === "mastered" || card.reviewStatus === "resolved"
        ? "mastered"
        : "pending",
    reviewCount: Math.max(0, Number(card.reviewCount) || 0),
    lastReviewedAt: card.lastReviewedAt || null,
    masteredAt: card.masteredAt || card.resolvedAt || null,
    source: card.source || "review",
  };
}

export function projectReviewDeck(
  cards = [],
  {
    certification = "all",
    domain = "all",
    status = "pending",
    language = "pt",
  } = {},
) {
  const normalized = cards.map((card) => normalizeReviewCard(card));
  const records = normalized.filter(
    (card) =>
      (certification === "all" ||
        card.certId === normalizeCertificationId(certification)) &&
      (domain === "all" || card.domainId === domain) &&
      (status === "all" ||
        (status === "pending"
          ? card.reviewStatus === "pending"
          : card.reviewStatus === "mastered")),
  );
  const domains = new Map();
  records.forEach((card) => {
    if (card.domainId && !domains.has(card.domainId))
      domains.set(card.domainId, card.certId);
  });
  return {
    records,
    total: normalized.filter(
      (card) =>
        certification === "all" ||
        card.certId === normalizeCertificationId(certification),
    ).length,
    pending: normalized.filter(
      (card) =>
        (certification === "all" ||
          card.certId === normalizeCertificationId(certification)) &&
        card.reviewStatus === "pending",
    ).length,
    mastered: normalized.filter(
      (card) =>
        (certification === "all" ||
          card.certId === normalizeCertificationId(certification)) &&
        card.reviewStatus === "mastered",
    ).length,
    domains: [...domains].map(([id, certId]) => {
      const definition = getDomainDefinition(certId, id);
      return {
        id,
        label:
          language === "en"
            ? definition?.labelEn || id
            : definition?.labelPt || id,
      };
    }),
  };
}
