import { createXpEvent } from "./gamificationPolicy.js";

export { mergeXpEvents } from "./core/contracts/gamificationState.js";

export function awardXpEvent(events = [], input) {
  const event = createXpEvent(input);
  if (!event) return { events: [...events], event: null, added: false };
  const existing = events.find((item) => item?.id === event.id);
  if (existing) return { events: [...events], event: existing, added: false };
  return { events: [...events, event], event, added: true };
}

export function calculateTotalXp(events = [], legacyBaselineXp = 0) {
  return (
    Math.max(0, Number(legacyBaselineXp) || 0) +
    events.reduce(
      (total, event) => total + Math.max(0, Number(event?.amount) || 0),
      0,
    )
  );
}
