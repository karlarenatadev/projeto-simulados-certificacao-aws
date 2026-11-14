/**
 * Remapeia letras de alternativas citadas em explicações (ex.: "A)", "(D)",
 * "B e C)", "alternativa A", "(opção B)") quando as opções são embaralhadas.
 *
 * A troca é feita em uma única passada: cada letra citada é convertida uma só
 * vez, mesmo quando casa com mais de um formato (ex.: "(opção A)").
 *
 * @param {string} text Explicação original.
 * @param {number[]} newPositionByOldIndex newPositionByOldIndex[i] = nova posição
 *   da opção que estava no índice i antes do embaralhamento.
 * @returns {string}
 */
const LETTERS = "ABCDE";
const SEPARATOR = /(\s*,\s*|\s+(?:e|and|y|ou|or)\s+)/;

const REFERENCE = new RegExp(
  [
    // "alternativa A", "opção B", "option C", "letra D"
    "(\\b(?:[Aa]lternativa|[Oo]p[cç][aã]o|[Oo]ption|[Ll]etra)\\s+)([A-E])\\b",
    // "A)", "A e B)", "A, C e D)", "(D)"
    "(?<![A-Za-zÀ-ÿ])([A-E](?:(?:\\s*,\\s*|\\s+(?:e|and|y|ou|or)\\s+)[A-E])*)(?=\\))",
    // "A está incorreta", "A is incorrect"
    "(?<![A-Za-zÀ-ÿ])([A-E])(?= (?:está incorreta|is incorrect))",
  ].join("|"),
  "g",
);

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

/**
 * Lista, na ordem do texto, as letras de alternativas citadas na explicação.
 * @param {string} text
 * @returns {string[]}
 */
export function extractLetterReferences(text) {
  if (typeof text !== "string") return [];
  return [...text.matchAll(REFERENCE)].flatMap((match) => {
    const raw = match[2] || match[3] || match[4] || "";
    return raw.match(/[A-E]/g) || [];
  });
}

export function remapExplanationLetters(text, newPositionByOldIndex) {
  if (typeof text !== "string" || !Array.isArray(newPositionByOldIndex)) {
    return text;
  }
  if (newPositionByOldIndex.every((position, index) => position === index)) {
    return text;
  }

  return text.replace(
    REFERENCE,
    (match, keyword, keywordLetter, group, incorrectLetter) => {
      if (keywordLetter) {
        return `${keyword}${mapLetter(keywordLetter, newPositionByOldIndex)}`;
      }
      if (group) return mapLetterGroup(group, newPositionByOldIndex);
      if (incorrectLetter) {
        return mapLetter(incorrectLetter, newPositionByOldIndex);
      }
      return match;
    },
  );
}
