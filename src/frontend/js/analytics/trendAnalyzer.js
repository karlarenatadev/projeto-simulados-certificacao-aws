/**
 * @fileoverview Trend Analyzer — Fase 7
 *
 * Analisa a evolução histórica do usuário e determina a tendência (positive/neutral/negative).
 * Também retorna os últimos N scores para plotar o gráfico de evolução no Study Hub.
 *
 * @module analytics/trendAnalyzer
 */

import { createHistoryTimeline } from "../utils/historyTimeline.js";

export class TrendAnalyzer {
  /**
   * Analisa o histórico e retorna a tendência e dados de evolução.
   *
   * @param {object[]} history - Array de resultados do storageManager.getHistory()
   * @returns {'positive'|'neutral'|'negative'}
   */
  analyze(history) {
    const scores = createHistoryTimeline(history)
      .filter((entry) => entry.hasValidScore)
      .map((entry) => entry.score);

    if (scores.length < 2) return "neutral";

    const half = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, half);
    const secondHalf = scores.slice(half);

    const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const diff = avg(secondHalf) - avg(firstHalf);

    if (diff > 3) return "positive";
    if (diff < -3) return "negative";
    return "neutral";
  }

  getRecentDirection(history) {
    const scores = createHistoryTimeline(history)
      .filter((entry) => entry.hasValidScore)
      .map((entry) => entry.score);

    if (scores.length < 2) return "insufficient";

    const delta = scores.at(-1) - scores.at(-2);
    if (delta > 0) return "up";
    if (delta < 0) return "down";
    return "stable";
  }

  /**
   * Retorna os últimos N pontos de dados para o gráfico de evolução.
   * @param {object[]} history
   * @param {number} [n=10] - Quantidade máxima de pontos
   * @returns {{ date: string, score: number }[]}
   */
  getEvolutionPoints(history, n = 10) {
    return createHistoryTimeline(history)
      .filter((entry) => entry.hasValidScore)
      .slice(-n)
      .map((entry) => ({
        date: entry.hasValidTimestamp
          ? new Date(entry.timestamp).toISOString()
          : null,
        score: entry.score,
        passed: !!entry.attempt.passed,
      }));
  }
}
