/**
 * @fileoverview Trend Analyzer — Fase 7
 *
 * Analisa a evolução histórica do usuário e determina a tendência (positive/neutral/negative).
 * Também retorna os últimos N scores para plotar o gráfico de evolução no Study Hub.
 *
 * @module analytics/trendAnalyzer
 */

export class TrendAnalyzer {
  /**
   * Analisa o histórico e retorna a tendência e dados de evolução.
   *
   * @param {object[]} history - Array de resultados do storageManager.getHistory()
   * @returns {'positive'|'neutral'|'negative'}
   */
  analyze(history) {
    if (!history || history.length < 2) return 'neutral';

    const scores = history
      .map((item) => item.percentage || 0)
      .filter((p) => p > 0);

    if (scores.length < 2) return 'neutral';

    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half);
    const secondHalf = scores.slice(half);

    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const diff = avg(secondHalf) - avg(firstHalf);

    if (diff > 3) return 'positive';
    if (diff < -3) return 'negative';
    return 'neutral';
  }

  /**
   * Retorna os últimos N pontos de dados para o gráfico de evolução.
   * @param {object[]} history
   * @param {number} [n=10] - Quantidade máxima de pontos
   * @returns {{ date: string, score: number }[]}
   */
  getEvolutionPoints(history, n = 10) {
    if (!history || history.length === 0) return [];

    return history
      .slice(-n)
      .map((item) => ({
        date: item.date || new Date().toISOString(),
        score: item.percentage || 0,
        passed: !!item.passed,
      }));
  }
}
