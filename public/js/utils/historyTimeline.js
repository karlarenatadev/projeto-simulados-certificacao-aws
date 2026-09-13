import { normalizeCertificationId } from "./certUtils.js";

const COMPLETION_DATE_FIELDS = [
  "completedAt",
  "completed_at",
  "date",
  "timestamp",
];

const SCORE_FIELDS = ["percentage", "overallScore", "score"];

function parseTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value > 0 && value < 1e12 ? value * 1000 : value;
  }

  const numericValue = Number(value);
  if (String(value).trim() !== "" && Number.isFinite(numericValue)) {
    return numericValue > 0 && numericValue < 1e12
      ? numericValue * 1000
      : numericValue;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

/**
 * Returns the first valid completion timestamp without fabricating a date.
 */
export function getAttemptTimestamp(attempt) {
  if (!attempt || typeof attempt !== "object") return null;

  for (const field of COMPLETION_DATE_FIELDS) {
    const timestamp = parseTimestamp(attempt[field]);
    if (timestamp !== null) return timestamp;
  }

  return null;
}

/**
 * Normalizes a result percentage while preserving 0 as a valid score.
 */
export function getAttemptScore(attempt) {
  if (!attempt || typeof attempt !== "object") return null;

  for (const field of SCORE_FIELDS) {
    const score = parseScore(attempt[field]);
    if (score === null) continue;

    if (
      field === "score" &&
      parseScore(
        attempt.total ?? attempt.totalQuestions ?? attempt.total_questions,
      )
    ) {
      const total = parseScore(
        attempt.total ?? attempt.totalQuestions ?? attempt.total_questions,
      );
      if (total > 0 && score >= 0 && score <= total) {
        return (score / total) * 100;
      }
    }

    return score;
  }

  return null;
}

export function getAttemptCertificationId(attempt) {
  const source = attempt?.attempt || attempt;
  return normalizeCertificationId(
    source?.certId ?? source?.certificationId ?? source?.certification,
  );
}

export function isHistoryTimelineEntry(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.hasOwn(value, "attempt") &&
    Object.hasOwn(value, "originalIndex") &&
    Object.hasOwn(value, "hasValidTimestamp") &&
    Object.hasOwn(value, "hasValidScore"),
  );
}

/**
 * Creates a stable, certification-scoped projection ordered oldest to newest.
 * Undated records are kept after dated records in their original relative order.
 * The persisted history array is never mutated.
 */
export function createHistoryTimeline(history, { certificationId } = {}) {
  const normalizedCertId = normalizeCertificationId(certificationId);
  const records = Array.isArray(history) ? history : [];

  const timeline = records
    .map((value, index) => {
      if (isHistoryTimelineEntry(value)) return value;

      const timestamp = getAttemptTimestamp(value);
      const score = getAttemptScore(value);
      return {
        attempt: value,
        originalIndex: index,
        timestamp,
        hasValidTimestamp: timestamp !== null,
        score,
        hasValidScore: score !== null && score >= 0 && score <= 100,
      };
    })
    .filter((entry) => {
      // Offline and pre-lifecycle records have no status and remain historical
      // results. An explicit remote started/abandoned state is never a result.
      if (entry.attempt?.status && entry.attempt.status !== "completed") {
        return false;
      }
      if (!normalizedCertId) return true;
      return getAttemptCertificationId(entry) === normalizedCertId;
    });

  return [...timeline].sort((left, right) => {
    if (left.hasValidTimestamp && right.hasValidTimestamp) {
      return (
        left.timestamp - right.timestamp ||
        left.originalIndex - right.originalIndex
      );
    }
    if (left.hasValidTimestamp !== right.hasValidTimestamp) {
      return left.hasValidTimestamp ? -1 : 1;
    }
    return left.originalIndex - right.originalIndex;
  });
}

export function getScoredTimeline(history, options) {
  return createHistoryTimeline(history, options).filter(
    (entry) => entry.hasValidScore,
  );
}
