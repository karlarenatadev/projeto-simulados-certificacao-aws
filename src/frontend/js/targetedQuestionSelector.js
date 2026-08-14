import { normalizeDomain } from "./domainTaxonomy.js";
import { normalizeCertificationId } from "./utils/certUtils.js";

export const TARGETED_PRACTICE_QUESTION_COUNT = 10;

const DIFFICULTY_ORDER = {
  medium: 0,
  hard: 1,
  easy: 2,
};

function canonicalDomain(certificationId, question) {
  return normalizeDomain(
    certificationId,
    question.domain || question.domainId || question.domain_id,
  );
}

function sortCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const leftDifficulty = DIFFICULTY_ORDER[left.difficulty] ?? 3;
    const rightDifficulty = DIFFICULTY_ORDER[right.difficulty] ?? 3;
    return leftDifficulty - rightDifficulty;
  });
}

function selectBalanced(candidates, domains, quantity) {
  const groups = new Map(
    domains.map((domainId) => [
      domainId,
      sortCandidates(
        candidates.filter((question) => question.canonicalDomain === domainId),
      ),
    ]),
  );
  const selected = [];

  while (selected.length < quantity) {
    const available = [...groups.entries()]
      .filter(([, questions]) => questions.length > 0)
      .sort((left, right) => {
        const selectedLeft = selected.filter(
          (question) => question.canonicalDomain === left[0],
        ).length;
        const selectedRight = selected.filter(
          (question) => question.canonicalDomain === right[0],
        ).length;
        if (selectedLeft !== selectedRight) return selectedLeft - selectedRight;
        return right[1].length - left[1].length;
      });

    if (available.length === 0) break;
    selected.push(available[0][1].shift());
  }

  return selected;
}

/**
 * Seleciona questões direcionadas sem misturar certificações.
 * A ordem de fallback é: weakDomains sem repetição, certificação sem
 * repetição e, somente depois, certificação completa.
 */
export function selectTargetedQuestions(
  questions,
  certificationId,
  weakDomains,
  quantity = TARGETED_PRACTICE_QUESTION_COUNT,
  excludedQuestionIds = [],
) {
  const certId = normalizeCertificationId(certificationId);
  const requestedQuantity = Math.max(1, Number(quantity) || 1);
  const weakDomainIds = [
    ...new Set(
      (weakDomains || [])
        .map((domain) =>
          typeof domain === "string" ? domain : domain?.domainId || domain?.id,
        )
        .map((domain) => normalizeDomain(certId, domain))
        .filter(Boolean),
    ),
  ];
  const excluded = new Set(excludedQuestionIds || []);
  const eligible = (questions || [])
    .filter(
      (question) =>
        !question.certId || normalizeCertificationId(question.certId) === certId,
    )
    .map((question) => ({
      ...question,
      canonicalDomain: canonicalDomain(certId, question),
    }))
    .filter((question) => question.canonicalDomain);

  const weakCandidates = eligible.filter((question) =>
    weakDomainIds.includes(question.canonicalDomain),
  );
  const weakWithoutExcluded = weakCandidates.filter(
    (question) => !excluded.has(question.id || question.questionId),
  );
  const certWithoutExcluded = eligible.filter(
    (question) => !excluded.has(question.id || question.questionId),
  );

  let selected = selectBalanced(
    weakWithoutExcluded,
    weakDomainIds,
    requestedQuantity,
  );

  if (selected.length < requestedQuantity) {
    selected = [
      ...selected,
      ...selectBalanced(
        certWithoutExcluded.filter(
          (question) => !selected.includes(question),
        ),
        [...new Set(certWithoutExcluded.map((question) => question.canonicalDomain))],
        requestedQuantity - selected.length,
      ),
    ];
  }

  if (selected.length < requestedQuantity) {
    selected = [
      ...selected,
      ...selectBalanced(
        eligible.filter((question) => !selected.includes(question)),
        [...new Set(eligible.map((question) => question.canonicalDomain))],
        requestedQuantity - selected.length,
      ),
    ];
  }

  return selected.slice(0, requestedQuantity).map(({ canonicalDomain: domainId, ...question }) => ({
    ...question,
    domainId,
  }));
}

export function buildTargetedPracticeContext(
  certificationId,
  weakDomains,
  questionIds = [],
) {
  const certId = normalizeCertificationId(certificationId);
  const domains = [
    ...new Set(
      (weakDomains || [])
        .map((domain) =>
          typeof domain === "string" ? domain : domain?.domainId || domain?.id,
        )
        .map((domain) => normalizeDomain(certId, domain))
        .filter(Boolean),
    ),
  ];

  return {
    source: "diagnostic",
    mode: "targeted-practice",
    certificationId: certId,
    domains,
    weakDomains: domains,
    questionIds: [...new Set(questionIds.filter(Boolean))],
  };
}
