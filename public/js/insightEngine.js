/**
 * insightEngine.js - Gera insights inteligentes baseados no histórico de simulados
 */

import { TrendAnalyzer } from "./analytics/trendAnalyzer.js";
import { createHistoryTimeline } from "./utils/historyTimeline.js";

/**
 * Analisa o histórico e retorna um insight personalizado.
 * @param {Array} history - Histórico bruto ou timeline canônica
 * @param {string} language - 'pt' ou 'en'
 * @param {Function} t - Função de tradução
 * @returns {object} { icon, iconColor, title, titleColor, message, action, actionColor }
 */
export function generateSmartInsight(history, language, t) {
  const timeline = createHistoryTimeline(history).filter(
    (entry) => entry.hasValidScore,
  );

  if (timeline.length === 0) {
    return {
      icon: "fa-solid fa-rocket",
      iconColor: "text-blue-500",
      title:
        language === "en" ? "Start your journey! 🚀" : "Comece sua jornada! 🚀",
      titleColor: "text-blue-600 dark:text-blue-400",
      message:
        language === "en"
          ? "Complete your first quiz to receive personalized insights."
          : "Faça seu primeiro simulado para receber insights personalizados.",
      action:
        language === "en"
          ? "💡 Tip: Start with Review mode to get familiar"
          : "💡 Dica: Comece pelo modo Revisão para se familiarizar",
      actionColor: "text-blue-600 dark:text-blue-400",
    };
  }

  const trendAnalyzer = new TrendAnalyzer();
  const trend = trendAnalyzer.analyze(timeline);
  const recentDirection = trendAnalyzer.getRecentDirection(timeline);
  const newestFirst = [...timeline].reverse();
  const avgScore = timeline.at(-1).score;
  const isNearPassing = avgScore >= 65 && avgScore < 70;

  const today = new Date();
  const testsToday = timeline.filter(
    (entry) =>
      entry.hasValidTimestamp &&
      new Date(entry.timestamp).toDateString() === today.toDateString(),
  ).length;

  let passingStreak = 0;
  for (let i = 0; i < newestFirst.length; i++) {
    if (newestFirst[i].score >= 70) passingStreak++;
    else break;
  }

  if (testsToday >= 4) {
    return {
      icon: "fa-solid fa-battery-quarter",
      iconColor: "text-red-500",
      title: t("burnout_warning", language),
      titleColor: "text-red-600 dark:text-red-400",
      message: t("tests_today", language, { count: testsToday }),
      action: t("breaks_improve_retention", language),
      actionColor: "text-blue-600 dark:text-blue-400",
    };
  }
  if (timeline.length === 1) {
    return {
      icon: "fa-solid fa-chart-line",
      iconColor: "text-blue-500",
      title: t("trend_insufficient", language),
      titleColor: "text-blue-600 dark:text-blue-400",
      message: t("trend_insufficient_message", language, {
        score: avgScore.toFixed(0),
      }),
      action: t("trend_insufficient_action", language),
      actionColor: "text-blue-600 dark:text-blue-400",
    };
  }
  if (passingStreak >= 3 && avgScore >= 80) {
    return {
      icon: "fa-solid fa-trophy",
      iconColor: "text-yellow-500",
      title: t("dominating", language),
      titleColor: "text-green-600 dark:text-green-400",
      message: t("consecutive_passes", language, {
        count: passingStreak,
        avg: avgScore.toFixed(0),
      }),
      action: t("schedule_exam", language),
      actionColor: "text-green-600 dark:text-green-400",
    };
  }
  if (trend === "negative") {
    return {
      icon: "fa-solid fa-chart-line-down",
      iconColor: "text-orange-500",
      title: t("performance_decline", language),
      titleColor: "text-orange-600 dark:text-orange-400",
      message: t("scores_declining", language),
      action: t("suggestion_break", language),
      actionColor: "text-orange-600 dark:text-orange-400",
    };
  }
  if (recentDirection === "down") {
    return {
      icon: "fa-solid fa-chart-line",
      iconColor: "text-orange-500",
      title: t("recent_dip", language),
      titleColor: "text-orange-600 dark:text-orange-400",
      message: t("recent_dip_message", language, {
        score: avgScore.toFixed(0),
      }),
      action: t("recent_dip_action", language),
      actionColor: "text-orange-600 dark:text-orange-400",
    };
  }
  if (trend === "positive" && avgScore >= 60) {
    return {
      icon: "fa-solid fa-chart-line",
      iconColor: "text-green-500",
      title: t("consistent_evolution", language),
      titleColor: "text-green-600 dark:text-green-400",
      message: t("score_improving", language, { avg: avgScore.toFixed(0) }),
      action: t("keep_practicing", language),
      actionColor: "text-blue-600 dark:text-blue-400",
    };
  }
  if (isNearPassing) {
    return {
      icon: "fa-solid fa-bullseye",
      iconColor: "text-blue-500",
      title: t("almost_there", language),
      titleColor: "text-blue-600 dark:text-blue-400",
      message: t("points_to_pass", language, {
        points: (70 - avgScore).toFixed(0),
      }),
      action: t("few_more_quizzes", language),
      actionColor: "text-blue-600 dark:text-blue-400",
    };
  }
  if (avgScore < 70) {
    return {
      icon: "fa-solid fa-book-open",
      iconColor: "text-orange-500",
      title: t("study_focus_needed", language),
      titleColor: "text-orange-600 dark:text-orange-400",
      message: t("current_score", language, { score: avgScore.toFixed(0) }),
      action: t("study_aws_docs", language),
      actionColor: "text-orange-600 dark:text-orange-400",
    };
  }

  const plural =
    timeline.length > 1
      ? t("quiz_plural", language)
      : t("quiz_singular", language);
  return {
    icon: "fa-solid fa-rocket",
    iconColor: "text-blue-500",
    title: t("keep_practicing_general", language),
    titleColor: "text-blue-600 dark:text-blue-400",
    message: t("quizzes_completed", language, {
      count: timeline.length,
      plural,
    }),
    action: t("practice_makes_perfect", language),
    actionColor: "text-blue-600 dark:text-blue-400",
  };
}
