/**
 * Remapeia letras de alternativas citadas em explicações (ex.: "A)", "(D)",
 * "B e C)", "alternativa A") quando as opções são embaralhadas.
 *
 * @param {string} text Explicação original.
 * @param {number[]} newPositionByOldIndex newPositionByOldIndex[i] = nova posição
 *   da opção que estava no índice i antes do embaralhamento.
 * @returns {string}
 */
const LETTERS = "ABCDE";
const SEPARATOR = /(\s*,\s*|\s+(?:e|and|y|ou|or)\s+)/;

function mapLetter(letter, newPositionByOldIndex) {
  const oldIndex = LETTERS.indexOf(letter);
  if (oldIndex < 0 || oldIndex >= newPositionByOldIndex.length) return letter;
  const next = newPositionByOldIndex[oldIndex];
  return Number.isInteger(next) && next >= 0 && next < LETTERS.length
    ? LETTERS[next]
    : letter;
}

function mapLetterGroup(group, newPositionByOldIndex) {
  const parts = group.split(SEPARATOR);
  const letters = parts
    .filter((_, i) => i % 2 === 0)
    .map((l) => mapLetter(l.trim(), newPositionByOldIndex))
    .sort();
  return parts.map((part, i) => (i % 2 === 0 ? letters[i / 2] : part)).join("");
}

export function remapExplanationLetters(text, newPositionByOldIndex) {
  if (typeof text !== "string" || !Array.isArray(newPositionByOldIndex)) {
    return text;
  }
  if (newPositionByOldIndex.every((position, index) => position === index)) {
    return text;
  }

  return (
    text
      // "A)", "A e B)", "A, C e D)" e "(D)"
      .replace(
        /(?<![A-Za-zÀ-ÿ])([A-E](?:(?:\s*,\s*|\s+(?:e|and|y|ou|or)\s+)[A-E])*)(?=\))/g,
        (group) => mapLetterGroup(group, newPositionByOldIndex),
      )
      // "A está incorreta" / "A is incorrect"
      .replace(
        /(?<![A-Za-zÀ-ÿ])([A-E])(?= (?:está incorreta|is incorrect))/g,
        (letter) => mapLetter(letter, newPositionByOldIndex),
      )
      // "alternativa A", "option B", "opção C"
      .replace(
        /\b(alternativa|op[cç][aã]o|option|letra)(\s+)([A-E])\b/gi,
        (_match, word, space, letter) =>
          `${word}${space}${mapLetter(letter, newPositionByOldIndex)}`,
      )
  );
}
