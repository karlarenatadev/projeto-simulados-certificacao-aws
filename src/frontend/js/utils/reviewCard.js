const LEGACY_QUESTION_OPEN =
  '<span class="text-base font-normal leading-relaxed block">';
const LEGACY_QUESTION_CLOSE = "</span>";

/** Remove only the exact presentation wrapper emitted by the old review deck. */
export function normalizeLegacyReviewQuestion(value) {
  if (typeof value !== "string") return value;
  if (
    value.startsWith(LEGACY_QUESTION_OPEN) &&
    value.endsWith(LEGACY_QUESTION_CLOSE)
  ) {
    return value.slice(
      LEGACY_QUESTION_OPEN.length,
      -LEGACY_QUESTION_CLOSE.length,
    );
  }
  return value;
}

export function createReviewDeckTerm(question, language = "pt") {
  const options = Array.isArray(question.options) ? question.options : [];
  const correct = question.correct ?? question.correctAnswer;
  const answer = Array.isArray(correct)
    ? correct
        .map((index) => options[index])
        .filter(Boolean)
        .join("\n• ")
    : options[correct] || "";
  const explanation = question.explanation || "";
  const answerLabel = language === "en" ? "Answer" : "Resposta";
  const explanationLabel = language === "en" ? "Explanation" : "Explicação";

  return {
    cert: question.certId || question.certification,
    domain: "review-deck",
    questionId: question.questionId,
    term: normalizeLegacyReviewQuestion(question.question || ""),
    definition: `${answerLabel}:\n• ${answer}\n\n${explanationLabel}:\n${explanation}`,
  };
}
