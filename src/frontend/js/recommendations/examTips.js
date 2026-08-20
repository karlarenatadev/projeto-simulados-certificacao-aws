import { getDomainDefinition, normalizeDomain } from "../domainTaxonomy.js";
import { normalizeCertificationId } from "../utils/certUtils.js";

export const EXAM_TIP_TYPES = Object.freeze({
  KEYWORD: "keyword",
  COMPARISON: "comparison",
  TRAP: "trap",
  MENTAL_SHORTCUT: "mental-shortcut",
});

export function normalizeExamTip(tip) {
  if (!tip || typeof tip !== "object") return null;
  const certifications = (tip.certifications || [])
    .map(normalizeCertificationId)
    .filter(Boolean)
    .map((value) => value.toUpperCase());
  const certificationId = certifications[0];
  const domain = certificationId
    ? normalizeDomain(certificationId, tip.domain)
    : null;
  return {
    ...tip,
    certifications,
    certificationId,
    domain,
    services: Array.isArray(tip.services) ? tip.services : [],
    keywords: Array.isArray(tip.keywords) ? tip.keywords : [],
    tags: Array.isArray(tip.tags) ? tip.tags : [],
  };
}

export function normalizeExamTips(dataset) {
  const tips = Array.isArray(dataset) ? dataset : dataset?.tips;
  return Array.isArray(tips) ? tips.map(normalizeExamTip).filter(Boolean) : [];
}

function flattenSearchable(value) {
  if (Array.isArray(value)) return value.flatMap(flattenSearchable);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(flattenSearchable);
  return value == null ? [] : [String(value)];
}

export function filterExamTips(tips, filters = {}) {
  const query = String(filters.query || "")
    .trim()
    .toLocaleLowerCase();
  const cert = filters.certificationId
    ? normalizeCertificationId(filters.certificationId)?.toUpperCase()
    : "";
  const domain = cert
    ? normalizeDomain(cert, filters.domain)
    : filters.domain || "";
  const type = filters.type || "";

  return normalizeExamTips(tips).filter((tip) => {
    if (cert && !tip.certifications.includes(cert)) return false;
    if (domain && tip.domain !== domain) return false;
    if (type && tip.type !== type) return false;
    if (!query) return true;
    const localized = [
      tip.title,
      tip.thinkFirst,
      tip.description,
      tip.comparison,
    ].flatMap(flattenSearchable);
    const searchable = [
      ...localized,
      ...tip.keywords,
      ...tip.services,
      ...tip.tags,
      ...(tip.dontConfuseWith || []),
      getDomainDefinition(tip.certificationId, tip.domain)?.labelPt,
      getDomainDefinition(tip.certificationId, tip.domain)?.labelEn,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(query);
  });
}

export function getExamTipsViewState(filteredTips) {
  const count = Array.isArray(filteredTips) ? filteredTips.length : 0;
  return { count, showEmpty: count === 0, showGrid: count > 0 };
}

export function buildExamTipsRecommendation(context = {}) {
  const certificationId = normalizeCertificationId(
    context.certificationId,
  )?.toUpperCase();
  const weakDomains = (context.weakDomains || [])
    .map((domain) => normalizeDomain(certificationId, domain))
    .filter(Boolean);
  const weakServices = Array.isArray(context.weakServices)
    ? context.weakServices
    : [];
  const weakTopics = Array.isArray(context.weakTopics)
    ? context.weakTopics
    : [];
  return {
    enabled:
      weakDomains.length > 0 ||
      weakServices.length > 0 ||
      weakTopics.length > 0,
    type: "exam-tips",
    context: {
      source: context.source || "diagnostic",
      certificationId,
      weakDomains: [...new Set(weakDomains)],
      weakServices,
      weakTopics,
    },
  };
}
