/**
 * Utility for generating stable, deterministic question IDs.
 */

/**
 * Creates a simple 32-bit integer hash from a string.
 * @param {string} text
 * @returns {string} Base-36 representation of the hash
 */
function hashString(text) {
  if (!text) return "0";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Generates a stable deterministic ID for a question.
 * @param {Object} question The question object
 * @param {string} certId The certification ID (e.g. saa-c03)
 * @returns {string} The stable question ID
 */
export function generateQuestionId(question, certId) {
  if (!question) return "";

  const safeCertId = certId ? certId.toLowerCase().trim() : "unknown";

  // If the question already has an explicit ID from the JSON data, use it
  if (question.id) return `${safeCertId}-${question.id}`;
  if (question.question_id) return `${safeCertId}-${question.question_id}`;
  // If it's already a generated ID from our system
  if (question.questionId && question.questionId.startsWith(safeCertId))
    return question.questionId;

  // Otherwise, generate a deterministic hash based on domain and question text
  const domainPart = question.domain || question.domainId || "";
  const textPart = question.question || question.question_text || "";

  const hash = hashString(`${domainPart}|${textPart}`);

  return `${safeCertId}-${hash}`;
}
