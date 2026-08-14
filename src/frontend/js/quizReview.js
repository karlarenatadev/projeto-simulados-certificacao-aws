/** Pure helpers for the per-session question review state. */
export function getQuestionId(question, fallbackIndex = null) {
  const value = question?.id ?? question?.questionId ?? question?.uuid;
  return value === undefined || value === null || value === ""
    ? fallbackIndex === null
      ? null
      : String(fallbackIndex)
    : String(value);
}

export function normalizeReviewQuestionIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => id !== null && id !== undefined && id !== "").map(String))];
}

export function toggleReviewQuestion(ids, questionId) {
  const normalized = normalizeReviewQuestionIds(ids);
  const id = String(questionId);
  return normalized.includes(id)
    ? normalized.filter((item) => item !== id)
    : [...normalized, id];
}

export function migrateLegacyReviewFlags(flags, questions) {
  return normalizeReviewQuestionIds(
    (Array.isArray(flags) ? flags : [])
      .map((index) => questions?.[Number(index)])
      .map((question, index) => getQuestionId(question, flags[index]))
      .filter(Boolean),
  );
}

export function getReviewIndexes(reviewIds, questions) {
  const ids = new Set(normalizeReviewQuestionIds(reviewIds));
  return (Array.isArray(questions) ? questions : [])
    .map((question, index) => (ids.has(getQuestionId(question, index)) ? index : -1))
    .filter((index) => index >= 0);
}

export function buildReviewSummary(questions, answers, reviewIds) {
  const total = Array.isArray(questions) ? questions.length : 0;
  const answered = new Set(
    (Array.isArray(answers) ? answers : [])
      .map((answer) => getQuestionId(answer, null))
      .filter(Boolean),
  );
  const reviewIndexes = getReviewIndexes(reviewIds, questions);
  return {
    total,
    answered: Math.min(answered.size, total),
    unanswered: Math.max(total - Math.min(answered.size, total), 0),
    marked: reviewIndexes.length,
  };
}
