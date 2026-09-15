import { getDomainDefinition, normalizeDomain } from "./domainTaxonomy.js";

function toTimestamp(value) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

export function getMistakeCertification(record = {}) {
  return String(
    record.certId ||
      record.certification ||
      record.cert ||
      record.certificationId ||
      "",
  )
    .trim()
    .toLowerCase();
}

export function normalizeMistakeRecord(record = {}) {
  const certification = getMistakeCertification(record);
  const domainId = normalizeDomain(
    certification,
    record.domain || record.domainId || "",
  );
  const wrongCount = Math.max(
    1,
    Number(record.wrongCount || record.wrong_count) || 1,
  );
  return {
    ...record,
    questionId: record.questionId || record.id || null,
    certification,
    certId: certification,
    domainId: domainId || null,
    wrongCount,
    resolved: record.resolved === true,
    lastOccurrence:
      record.lastOccurrence ||
      record.lastWrongAt ||
      record.last_wrong_at ||
      null,
    firstOccurrence:
      record.firstOccurrence ||
      record.firstWrongAt ||
      record.first_wrong_at ||
      null,
  };
}

export function projectMistakes(
  records = [],
  {
    certification = "all",
    domain = "all",
    status = "pending",
    language = "pt",
  } = {},
) {
  const normalized = records.map(normalizeMistakeRecord);
  const scoped = normalized.filter((record) => {
    if (
      certification !== "all" &&
      record.certification !== String(certification).toLowerCase()
    )
      return false;
    if (domain !== "all" && record.domainId !== domain) return false;
    return true;
  });
  const filtered = scoped.filter((record) => {
    if (status === "pending" && record.resolved) return false;
    if (status === "resolved" && !record.resolved) return false;
    return true;
  });
  filtered.sort(
    (a, b) =>
      b.wrongCount - a.wrongCount ||
      toTimestamp(b.lastOccurrence) - toTimestamp(a.lastOccurrence),
  );
  const byDomain = new Map();
  for (const record of filtered.filter((item) => !item.resolved)) {
    const key = record.domainId || "unknown";
    const current = byDomain.get(key) || {
      count: 0,
      certification: record.certification,
    };
    current.count += 1;
    byDomain.set(key, current);
  }
  const availableDomains = new Map();
  for (const record of filtered) {
    const key = record.domainId || "unknown";
    if (!availableDomains.has(key))
      availableDomains.set(key, record.certification);
  }
  return {
    records: filtered,
    pending: scoped.filter((record) => !record.resolved).length,
    resolved: scoped.filter((record) => record.resolved).length,
    recurrent: scoped.filter((record) => record.wrongCount > 1).length,
    domains: [...availableDomains.entries()]
      .map(([id, recordCertification]) => {
        const pending = byDomain.get(id);
        const definition = getDomainDefinition(recordCertification, id);
        return {
          id,
          count: pending?.count || 0,
          label: definition?.labelPt || id,
          labelEn: definition?.labelEn || id,
        };
      })
      .sort((a, b) => b.count - a.count),
    language,
  };
}
