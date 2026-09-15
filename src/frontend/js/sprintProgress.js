/**
 * Pure projection and merge helpers for the 14-day study Sprint.
 * User progress is kept separate from the editorial Sprint definition.
 */

export const SPRINT_TOTAL_DAYS = 14;

function toDay(value) {
  const day = Number.parseInt(value, 10);
  return Number.isInteger(day) && day >= 1 && day <= SPRINT_TOTAL_DAYS
    ? day
    : null;
}

export function normalizeCompletedDays(value) {
  const days = Array.isArray(value) ? value : [];
  return [...new Set(days.map(toDay).filter(Boolean))].sort((a, b) => a - b);
}

/**
 * Normalizes legacy state without writing it back. A legacy currentDay is
 * interpreted as the next day only when no completed-day list exists.
 */
export function normalizeSprintProgress(state = {}) {
  const source = state && typeof state === "object" ? state : {};
  let completedDays = normalizeCompletedDays(source.completedStages);
  if (!completedDays.length && Number.isInteger(Number(source.currentDay))) {
    const currentDay = Number(source.currentDay);
    if (currentDay > 1 && currentDay <= SPRINT_TOTAL_DAYS) {
      completedDays = Array.from({ length: currentDay - 1 }, (_, i) => i + 1);
    }
  }

  const completedSet = new Set(completedDays);
  const nextAvailableDay = getNextAvailableDay({
    completedStages: completedDays,
  });
  const unlockedStages = [
    ...completedDays,
    ...(nextAvailableDay ? [nextAvailableDay] : []),
  ]
    .filter((day, index, list) => list.indexOf(day) === index)
    .sort((a, b) => a - b)
    .map(String);

  return {
    ...source,
    completedStages: completedDays.map(String),
    unlockedStages,
    currentDay: nextAvailableDay || SPRINT_TOTAL_DAYS,
    completed: completedSet.size === SPRINT_TOTAL_DAYS,
  };
}

export function getCompletedCount(state = {}) {
  return normalizeCompletedDays(state.completedStages).length;
}

export function getNextAvailableDay(state = {}) {
  const completed = new Set(normalizeCompletedDays(state.completedStages));
  for (let day = 1; day <= SPRINT_TOTAL_DAYS; day += 1) {
    if (!completed.has(day)) return day;
  }
  return null;
}

export function getDayStatus(day, state = {}) {
  const normalizedDay = toDay(day);
  if (!normalizedDay) return "locked";
  const completed = new Set(normalizeCompletedDays(state.completedStages));
  if (completed.has(normalizedDay)) return "completed";
  return normalizedDay === getNextAvailableDay(state) ? "available" : "locked";
}

export function calculateSprintProgress(state = {}) {
  const completed = getCompletedCount(state);
  const nextAvailableDay = getNextAvailableDay(state);
  return {
    completed,
    completedStages: normalizeCompletedDays(state.completedStages),
    total: SPRINT_TOTAL_DAYS,
    currentDay: nextAvailableDay || SPRINT_TOTAL_DAYS,
    nextAvailableDay,
    percentage: Math.round((completed / SPRINT_TOTAL_DAYS) * 100),
    completedSprint: completed === SPRINT_TOTAL_DAYS,
  };
}

/** Merge history by day, then derive availability from the canonical sequence. */
export function mergeSprintProgress(local = {}, remote = {}) {
  const normalizedLocal = normalizeSprintProgress(local);
  const normalizedRemote = normalizeSprintProgress(remote);
  const merged = {
    ...normalizedRemote,
    ...normalizedLocal,
    completedStages: normalizeCompletedDays([
      ...(normalizedRemote.completedStages || []),
      ...(normalizedLocal.completedStages || []),
    ]).map(String),
  };
  return normalizeSprintProgress(merged);
}
