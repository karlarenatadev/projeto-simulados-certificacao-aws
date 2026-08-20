import { normalizeDomain } from "./domainTaxonomy.js";

/**
 * Seleciona uma amostra equilibrada para o diagnóstico a partir do banco
 * principal. A seleção é pura para poder ser testada sem DOM, fetch ou API.
 */

function shuffle(items, random = Math.random) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function allocateQuotas(groups, requestedQuantity) {
  const quotas = new Map(groups.map((group) => [group.id, 0]));
  const availableQuestions = groups.reduce(
    (total, group) => total + group.questions.length,
    0,
  );
  const quantity = Math.min(Math.max(0, requestedQuantity), availableQuestions);
  let assigned = 0;

  if (quantity >= groups.length) {
    groups.forEach((group) => {
      if (group.questions.length > 0) {
        quotas.set(group.id, 1);
        assigned += 1;
      }
    });
  }

  for (let index = assigned; index < quantity; index += 1) {
    const available = groups
      .filter((group) => quotas.get(group.id) < group.questions.length)
      .sort((left, right) => {
        const leftQuota = quotas.get(left.id);
        const rightQuota = quotas.get(right.id);
        if (leftQuota !== rightQuota) return leftQuota - rightQuota;
        const leftRemaining = left.questions.length - quotas.get(left.id);
        const rightRemaining = right.questions.length - quotas.get(right.id);
        return rightRemaining - leftRemaining;
      });

    if (available.length === 0) break;
    quotas.set(available[0].id, quotas.get(available[0].id) + 1);
  }

  return quotas;
}

/**
 * @param {object[]} questions Banco principal de uma certificação/idioma.
 * @param {object[]} domainsConfig Domínios oficiais da certificação.
 * @param {object} options Opções da amostra.
 * @returns {object[]} Questões selecionadas e com domínio canônico.
 */
export function selectDiagnosticQuestions(
  questions,
  domainsConfig,
  { certId, language = "pt", quantity = 12, random = Math.random } = {},
) {
  if (!Array.isArray(questions) || !Array.isArray(domainsConfig)) return [];

  const groups = domainsConfig
    .map((domain) => ({
      id: domain.id,
      questions: questions
        .filter((question) => {
          if (certId && question.certId && question.certId !== certId) {
            return false;
          }

          return (
            normalizeDomain(
              certId,
              question.domain || question.domainId || question.domain_id,
            ) === domain.id
          );
        })
        .map((question) => ({
          ...question,
          domain: domain.id,
          language,
        })),
    }))
    .filter((group) => group.questions.length > 0);

  const quotas = allocateQuotas(groups, quantity);

  return groups.flatMap((group) =>
    shuffle(group.questions, random).slice(0, quotas.get(group.id)),
  );
}

export function getDiagnosticDomainDistribution(questions) {
  return questions.reduce((distribution, question) => {
    distribution[question.domain] = (distribution[question.domain] || 0) + 1;
    return distribution;
  }, {});
}
