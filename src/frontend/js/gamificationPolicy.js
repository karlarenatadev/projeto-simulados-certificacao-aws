/** Canonical XP policy. Existing mechanics are intentionally unchanged. */
export const XP_POLICY = Object.freeze({
  interactive_lab_completed: Object.freeze({ amount: 10, repeatable: false }),
});

export function getXpPolicy(eventType) {
  return XP_POLICY[String(eventType || "").trim()] || null;
}

export function createXpEventId(eventType, sourceId) {
  const type = String(eventType || "").trim();
  const source = String(sourceId || "").trim();
  if (!type || !source) return null;
  return `${type}:${source}`;
}

export function createXpEvent({
  eventType,
  sourceId,
  certification = null,
  createdAt,
} = {}) {
  const policy = getXpPolicy(eventType);
  const id = createXpEventId(eventType, sourceId);
  if (!policy || !id) return null;
  return {
    id,
    eventType: String(eventType).trim(),
    sourceId: String(sourceId).trim(),
    certification: certification ? String(certification).toLowerCase() : null,
    amount: policy.amount,
    createdAt: createdAt || new Date().toISOString(),
  };
}
