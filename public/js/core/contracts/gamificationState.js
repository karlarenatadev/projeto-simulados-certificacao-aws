/** Global per-user snapshot. Event identity is the existing id, never amount/time. */
function invalidState(code) {
  return Object.assign(
    new Error("Gamification state requires reconciliation"),
    {
      code,
      statusCode: 400,
    },
  );
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

// Same reward can be recorded offline on two devices. Retain compatible fields,
// including metadata. Contradictory payloads must not choose a silent winner.
function mergeEvent(a, b) {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (!Object.prototype.hasOwnProperty.call(a, key))
      Object.defineProperty(result, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    else if (
      JSON.stringify(canonical(a[key])) !== JSON.stringify(canonical(value))
    ) {
      if (
        key === "createdAt" &&
        Number.isFinite(Date.parse(a[key])) &&
        Number.isFinite(Date.parse(value))
      ) {
        result[key] = [a[key], value].sort(
          (x, y) => Date.parse(x) - Date.parse(y) || compare(x, y),
        )[0];
      } else {
        throw invalidState("XP_EVENT_CONFLICT");
      }
    }
  }
  return canonical(result);
}

export function mergeXpEvents(local = [], remote = []) {
  if (!Array.isArray(local) || !Array.isArray(remote))
    throw invalidState("XP_EVENTS_INVALID");
  const events = new Map();
  for (const event of [...local, ...remote]) {
    if (
      !object(event) ||
      typeof event.id !== "string" ||
      !event.id.trim() ||
      typeof event.amount !== "number" ||
      !Number.isFinite(event.amount) ||
      event.amount < 0
    ) {
      throw invalidState("XP_EVENT_IDENTITY_OR_AMOUNT_INVALID");
    }
    events.set(
      event.id,
      events.has(event.id)
        ? mergeEvent(events.get(event.id), event)
        : canonical(event),
    );
  }
  return [...events.values()].sort((a, b) => compare(a.id, b.id));
}

export function mergeGamificationState(local = {}, remote = {}) {
  if (!object(local) || !object(remote))
    throw invalidState("GAMIFICATION_STATE_INVALID");
  const baseline = (state) => {
    const value = state.legacyBaselineXp ?? 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      throw invalidState("XP_BASELINE_INVALID");
    return value;
  };
  for (const state of [local, remote]) {
    if (
      state.activityDays !== undefined &&
      (!Array.isArray(state.activityDays) ||
        state.activityDays.some((day) => typeof day !== "string"))
    )
      throw invalidState("ACTIVITY_DAYS_INVALID");
  }
  return {
    ...remote,
    ...local,
    events: mergeXpEvents(local.events ?? [], remote.events ?? []),
    legacyBaselineXp: Math.max(baseline(local), baseline(remote)),
    activityDays: [
      ...new Set([
        ...(local.activityDays || []),
        ...(remote.activityDays || []),
      ]),
    ].sort(),
  };
}
