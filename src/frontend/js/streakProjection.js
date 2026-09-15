const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asCalendarDate(day) {
  if (!DAY_PATTERN.test(day)) return null;
  const date = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getActivityDay(timestamp = new Date(), timezone) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const timeZone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function normalizeActivityDays(days = []) {
  return [
    ...new Set(
      (Array.isArray(days) ? days : []).filter((day) => asCalendarDate(day)),
    ),
  ].sort();
}

function previousDay(day) {
  const date = asCalendarDate(day);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function calculateCurrentStreak(activityDays = [], referenceDay) {
  const days = normalizeActivityDays(activityDays);
  const reference = referenceDay || getActivityDay();
  if (!asCalendarDate(reference)) return 0;
  const latest = days.filter((day) => day <= reference).at(-1);
  if (!latest) return 0;
  if (latest !== reference && latest !== previousDay(reference)) return 0;
  const daySet = new Set(days);
  let streak = 0;
  let cursor = latest;
  while (cursor && daySet.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function calculateLongestStreak(activityDays = []) {
  const days = normalizeActivityDays(activityDays);
  let longest = 0;
  let current = 0;
  let previous = null;
  days.forEach((day) => {
    if (previous && day === getNextDay(previous)) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
    previous = day;
  });
  return longest;
}

function getNextDay(day) {
  const date = asCalendarDate(day);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function getStreakState(
  { activityDays = [], legacyCurrentStreak = 0, legacyLongestStreak = 0 } = {},
  referenceDay,
) {
  const days = normalizeActivityDays(activityDays);
  if (days.length === 0) {
    return {
      activityDays: [],
      currentStreak: Math.max(0, Number(legacyCurrentStreak) || 0),
      longestStreak: Math.max(
        Number(legacyCurrentStreak) || 0,
        Number(legacyLongestStreak) || 0,
      ),
    };
  }
  return {
    activityDays: days,
    currentStreak: calculateCurrentStreak(days, referenceDay),
    longestStreak: calculateLongestStreak(days),
  };
}
