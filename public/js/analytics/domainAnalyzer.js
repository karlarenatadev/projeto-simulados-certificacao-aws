/**
 * @fileoverview Domain Analyzer — Fase 7
 *
 * Responsável por agregar e calcular o desempenho por domínio, cruzando
 * o histórico de simulados (domainScores) com os erros mapeados (mistakes).
 *
 * @module analytics/domainAnalyzer
 */

export class DomainAnalyzer {
  /**
   * Analisa histórico e erros, retornando um array de DomainScore
   * ordenado do pior para o melhor (prioridade de revisão).
   *
   * @param {object[]} history  - Array de resultados do storageManager.getHistory()
   * @param {object[]} mistakes - Array de erros do storageManager.getMistakes()[certId]
   * @returns {DomainScore[]}
   */
  analyze(history, mistakes) {
    const aggregates = this._aggregateFromHistory(history);
    this._mergeMistakes(aggregates, mistakes);

    return Object.entries(aggregates)
      .map(([name, data]) => this._buildDomainScore(name, data))
      .sort((a, b) => a.score - b.score); // piores primeiro
  }

  // ---------------------------------------------------------------------------
  // Privados
  // ---------------------------------------------------------------------------

  _aggregateFromHistory(history) {
    const aggregates = {};

    history.forEach((session) => {
      if (!session?.domainScores) return;

      Object.entries(session.domainScores).forEach(([domain, stats]) => {
        if (!aggregates[domain]) {
          aggregates[domain] = { total: 0, correct: 0, mistakesCount: 0 };
        }
        aggregates[domain].total += stats.total || 0;
        aggregates[domain].correct += stats.correct || 0;
      });
    });

    return aggregates;
  }

  _mergeMistakes(aggregates, mistakes) {
    mistakes.forEach((mistake) => {
      const domain = mistake.domain || "Não categorizado";
      if (!aggregates[domain]) {
        aggregates[domain] = { total: 0, correct: 0, mistakesCount: 0 };
      }
      aggregates[domain].mistakesCount += 1;
    });
  }

  _buildDomainScore(name, data) {
    let score;
    if (data.total > 0) {
      score = Math.round((data.correct / data.total) * 100);
    } else {
      // Só temos dados de erros — penaliza proporcionalmente
      score = Math.max(0, 100 - data.mistakesCount * 15);
    }

    const status = this._getStatus(score);
    const recommendation = this._getRecommendation(name, score, status);

    return {
      name,
      score,
      status,
      mistakes: data.mistakesCount,
      recommendation,
    };
  }

  /**
   * @param {number} score
   * @returns {'strong'|'intermediate'|'needs_review'|'critical'}
   */
  _getStatus(score) {
    if (score >= 80) return "strong";
    if (score >= 65) return "intermediate";
    if (score >= 45) return "needs_review";
    return "critical";
  }

  _getRecommendation(domainName, score, status) {
    const recs = {
      critical: `Prioridade máxima: revise os fundamentos de ${domainName}. Acerte ao menos 2-3 questões antes de avançar.`,
      needs_review: `Revise ${domainName} com foco nos erros mais recentes e reforce pontos fracos.`,
      intermediate: `Você está progredindo em ${domainName}. Pratique com questões de nível difícil para consolidar.`,
      strong: `Você domina ${domainName}. Mantenha revisões esporádicas para não regredir.`,
    };
    return recs[status] || "";
  }
}
