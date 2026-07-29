/**
 * @fileoverview Learning Analytics Engine — Fase 7
 *
 * Motor central de análise de aprendizado. Lê o histórico e erros do usuário
 * a partir do StorageManager e produz um LearningProfile estruturado.
 *
 * REGRAS:
 * - Não altera dados no localStorage.
 * - Não modifica cálculos existentes do simulador.
 * - Depende de DomainAnalyzer e TrendAnalyzer (separação de responsabilidade).
 *
 * @module analytics/learningAnalytics
 */

import { DomainAnalyzer } from './domainAnalyzer.js';
import { TrendAnalyzer } from './trendAnalyzer.js';

export class LearningAnalytics {
  /**
   * @param {object} storage - Instância do StorageManager (ou objeto mock com mesma interface)
   */
  constructor(storage) {
    if (!storage) throw new Error('[LearningAnalytics] Dependência "storage" é obrigatória.');
    this.storage = storage;
    this.domainAnalyzer = new DomainAnalyzer();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  /**
   * Retorna o perfil completo de aprendizado para uma certificação.
   * Este é o "contrato de dados" central da plataforma.
   *
   * @param {string} certId - Ex: 'saa-c03', 'clf-c02'
   * @returns {LearningProfile}
   */
  getLearningProfile(certId) {
    if (!certId) throw new Error('[LearningAnalytics] certId é obrigatório.');

    const normalizedCertId = certId.toLowerCase();

    // 1. Coleta bruta de dados
    const allHistory = this._safeGet(() => this.storage.getHistory(), []);
    const history = allHistory.filter(
      (item) => item?.certId?.toLowerCase() === normalizedCertId
    );

    const allMistakes = this._safeGet(() => this.storage.getMistakes(), {});
    // getMistakes retorna um store { certId: { questionId: mistakeRecord } }
    const certMistakesStore = allMistakes[normalizedCertId] || allMistakes[certId] || {};
    const mistakes = Object.values(certMistakesStore);

    // 2. Estado vazio — usuário não fez nenhum simulado desta cert ainda
    if (history.length === 0 && mistakes.length === 0) {
      return this._buildEmptyProfile(certId);
    }

    // 3. Processamento
    const domains = this.domainAnalyzer.analyze(history, mistakes);
    const trend = this.trendAnalyzer.analyze(history);
    const overview = this._buildOverview(history, domains, trend);

    const strengths = domains.filter((d) => d.status === 'strong').map((d) => d.name);
    const weakAreas = domains
      .filter((d) => d.status === 'needs_review' || d.status === 'critical')
      .map((d) => d.name);

    /** @type {LearningProfile} */
    return {
      certification: certId,
      overview,
      domains,
      strengths,
      weakAreas,
      nextActions: [], // preenchido pelo RecommendationEngine
    };
  }

  // ---------------------------------------------------------------------------
  // Privados
  // ---------------------------------------------------------------------------

  _buildOverview(history, domains, trend) {
    const examsTaken = history.length;
    const averageScore =
      examsTaken === 0
        ? 0
        : Math.round(
            history.reduce((sum, item) => sum + (item.percentage || 0), 0) / examsTaken
          );

    const readiness = this._calculateReadiness(averageScore, examsTaken, domains, trend);

    return { averageScore, examsTaken, trend, readiness };
  }

  /**
   * AWS Readiness Score — fórmula composta que reflete preparação real.
   * Considera: média, volume de simulados, cobertura de domínios, tendência.
   */
  _calculateReadiness(averageScore, examsTaken, domains, trend) {
    // Base: 80% da média
    let score = averageScore * 0.8;

    // Volume de simulados: bônus progressivo até 5 simulados (máx +10 pts)
    const volumeBonus = Math.min(examsTaken / 5, 1) * 10;
    score += volumeBonus;

    // Tendência crescente: +5pts
    if (trend === 'positive') score += 5;
    else if (trend === 'negative') score -= 5;

    // Penalidade por domínios críticos (< 50%): -3 pts por domínio crítico
    const criticalDomains = domains.filter((d) => d.status === 'critical').length;
    score -= criticalDomains * 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _buildEmptyProfile(certId) {
    return {
      certification: certId,
      overview: { averageScore: 0, examsTaken: 0, trend: 'neutral', readiness: 0 },
      domains: [],
      strengths: [],
      weakAreas: [],
      nextActions: [],
    };
  }

  _safeGet(fn, fallback) {
    try {
      return fn() ?? fallback;
    } catch {
      return fallback;
    }
  }
}

/**
 * @typedef {Object} LearningProfile
 * @property {string} certification
 * @property {{ averageScore: number, examsTaken: number, trend: string, readiness: number }} overview
 * @property {DomainScore[]} domains
 * @property {string[]} strengths
 * @property {string[]} weakAreas
 * @property {Action[]} nextActions
 */

/**
 * @typedef {Object} DomainScore
 * @property {string} name
 * @property {number} score           - 0-100
 * @property {'strong'|'intermediate'|'needs_review'|'critical'} status
 * @property {number} mistakes
 * @property {string} [recommendation]
 */

/**
 * @typedef {Object} Action
 * @property {'practice'|'review'|'theory'|'exam'} type
 * @property {string} title
 * @property {string} [description]
 * @property {string} action
 * @property {string} icon
 * @property {'primary'|'secondary'|'outline'} style
 */
