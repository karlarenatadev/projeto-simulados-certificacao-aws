/**
 * @fileoverview Domain Analyzer — Fase 7
 *
 * Responsável por agregar e calcular o desempenho por domínio, cruzando
 * o histórico de simulados (domainScores) com os erros mapeados (mistakes).
 *
 * @module analytics/domainAnalyzer
 */

import { getDomainDefinition, normalizeDomain } from "../domainTaxonomy.js";

export class DomainAnalyzer {
  /**
   * Analisa histórico e erros, retornando um array de DomainScore
   * ordenado do pior para o melhor (prioridade de revisão).
   *
   * @param {object[]} history  - Array de resultados do storageManager.getHistory()
   * @param {object[]} mistakes - Array de erros do storageManager.getMistakes()[certId]
   * @returns {DomainScore[]}
   */
  analyze(history, mistakes, certificationId = null) {
    this.certificationId = certificationId;
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
        const canonicalDomain = this._canonicalDomain(domain);
        if (!aggregates[canonicalDomain]) {
          aggregates[canonicalDomain] = {
            total: 0,
            correct: 0,
            mistakesCount: 0,
          };
        }
        aggregates[canonicalDomain].total += stats.total || 0;
        aggregates[canonicalDomain].correct += stats.correct || 0;
      });
    });

    return aggregates;
  }

  _mergeMistakes(aggregates, mistakes) {
    mistakes.forEach((mistake) => {
      const canonicalDomain = this._canonicalDomain(mistake.domain);
      const domain = mistake.domain || "Não categorizado";
      const aggregateDomain = canonicalDomain || domain;
      if (!aggregates[aggregateDomain]) {
        aggregates[aggregateDomain] = {
          total: 0,
          correct: 0,
          mistakesCount: 0,
        };
      }
      aggregates[aggregateDomain].mistakesCount += 1;
    });
  }

  _buildDomainScore(name, data) {
    const definition = this.certificationId
      ? getDomainDefinition(this.certificationId, name)
      : null;
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
      id: definition?.domainId || name,
      domainId: definition?.domainId || name,
      name: definition?.labelPt || name,
      score,
      status,
      mistakes: data.mistakesCount,
      recommendation,
    };
  }

  _canonicalDomain(value) {
    return this.certificationId
      ? normalizeDomain(this.certificationId, value) || value
      : value;
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
