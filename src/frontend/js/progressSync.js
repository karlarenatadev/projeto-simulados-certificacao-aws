/** Pure reconciliation helpers for account-scoped local/remote state. */
import { mergeSprintProgress } from "./sprintProgress.js";

const isoTime = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

function identity(item) {
  const certification = String(
    item?.certId ||
      item?.certification ||
      item?.cert ||
      item?.certificationId ||
      "",
  )
    .trim()
    .toLowerCase();
  const questionId = item?.questionId || item?.id;
  return `${certification}:${questionId || item?.question || ""}`;
}

export function mergeAttempts(local = [], remote = []) {
  const merged = new Map();
  [...local, ...remote].forEach((item) => {
    const key = item?.attemptId || item?.quizId || item?.id;
    if (!key) return;
    const previous = merged.get(key);
    if (!previous) merged.set(key, item);
    else
      merged.set(key, {
        ...previous,
        ...item,
        status:
          previous.status === "completed" || item.status === "completed"
            ? "completed"
            : item.status || previous.status,
      });
  });
  return [...merged.values()];
}

export function mergeMistake(local = {}, remote = {}) {
  const newer =
    isoTime(local.lastWrongAt || local.lastOccurrence) >=
    isoTime(remote.lastWrongAt || remote.lastOccurrence)
      ? local
      : remote;
  const resolvedAt =
    isoTime(local.resolvedAt) >= isoTime(remote.resolvedAt)
      ? local.resolvedAt
      : remote.resolvedAt;
  const lastWrong =
    isoTime(local.lastWrongAt || local.lastOccurrence) >=
    isoTime(remote.lastWrongAt || remote.lastOccurrence)
      ? local
      : remote;
  return {
    ...remote,
    ...local,
    ...newer,
    wrongCount: Math.max(
      Number(local.wrongCount) || 1,
      Number(remote.wrongCount) || 1,
    ),
    firstWrongAt:
      isoTime(local.firstWrongAt || local.firstOccurrence) <=
      isoTime(remote.firstWrongAt || remote.firstOccurrence)
        ? local.firstWrongAt ||
          local.firstOccurrence ||
          remote.firstWrongAt ||
          remote.firstOccurrence
        : remote.firstWrongAt || remote.firstOccurrence,
    lastWrongAt: lastWrong.lastWrongAt || lastWrong.lastOccurrence,
    resolved:
      isoTime(newer.lastWrongAt || newer.lastOccurrence) > isoTime(resolvedAt)
        ? false
        : newer.resolved === true,
    resolvedAt: newer.resolved === true ? newer.resolvedAt : resolvedAt || null,
  };
}

export function mergeMistakes(local = {}, remote = {}) {
  const keys = new Set([
    ...Object.keys(local || {}),
    ...Object.keys(remote || {}),
  ]);
  return [...keys].reduce((result, key) => {
    result[key] =
      local[key] && remote[key]
        ? mergeMistake(local[key], remote[key])
        : local[key] || remote[key];
    return result;
  }, {});
}

export function mergeReviewDeck(local = [], remote = []) {
  const merged = new Map();
  [...remote, ...local].forEach((card) => {
    const key = identity(card);
    if (!key) return;
    const previous = merged.get(key);
    if (!previous) merged.set(key, card);
    else {
      const latest =
        isoTime(card.lastReviewedAt) >= isoTime(previous.lastReviewedAt)
          ? card
          : previous;
      merged.set(key, {
        ...previous,
        ...card,
        ...latest,
        reviewCount: Math.max(
          Number(previous.reviewCount) || 0,
          Number(card.reviewCount) || 0,
        ),
      });
    }
  });
  return [...merged.values()];
}

export function mergeJourneyProgress(local = {}, remote = {}) {
  const result = { ...remote, ...local };
  ["completedStages", "unlockedStages", "completedSteps"].forEach((field) => {
    if (Array.isArray(local[field]) || Array.isArray(remote[field]))
      result[field] = [
        ...new Set([...(remote[field] || []), ...(local[field] || [])]),
      ];
  });
  Object.keys(remote).forEach((key) => {
    if (typeof remote[key] === "number" && typeof local[key] === "number")
      result[key] = Math.max(remote[key], local[key]);
  });
  return result;
}

export function mergeGamificationState(local = {}, remote = {}) {
  const result = { ...remote, ...local };
  result.activityDays = [
    ...new Set([...(remote.activityDays || []), ...(local.activityDays || [])]),
  ].sort();
  return result;
}

export function reconcileModuleState(
  module,
  local,
  remote,
  { localDirty = false } = {},
) {
  if (remote == null)
    return { state: local, outcome: local ? "local-wins" : "unchanged" };
  if (local == null) return { state: remote, outcome: "remote-wins" };
  if (module === "flashcards")
    return {
      state: {
        ...remote,
        deck: mergeReviewDeck(local.deck || [], remote.deck || []),
      },
      outcome: "merged",
    };
  if (module === "mistakes") {
    const localMap = (local.mistakes || []).reduce((map, item) => {
      map[identity(item)] = item;
      return map;
    }, {});
    const remoteMap = (remote.mistakes || []).reduce((map, item) => {
      map[identity(item)] = item;
      return map;
    }, {});
    return {
      state: {
        ...remote,
        mistakes: Object.values(mergeMistakes(localMap, remoteMap)),
      },
      outcome: "merged",
    };
  }
  if (module === "diagnostic")
    return {
      state: {
        ...remote,
        history: mergeAttempts(local.history || [], remote.history || []),
      },
      outcome: "merged",
    };
  if (module === "sprint")
    return { state: mergeSprintProgress(local, remote), outcome: "merged" };
  if (module === "journey" || module === "labs")
    return { state: mergeJourneyProgress(local, remote), outcome: "merged" };
  if (module === "gamification")
    return { state: mergeGamificationState(local, remote), outcome: "merged" };
  return {
    state: localDirty ? local : remote,
    outcome: localDirty ? "local-wins" : "remote-wins",
  };
}
