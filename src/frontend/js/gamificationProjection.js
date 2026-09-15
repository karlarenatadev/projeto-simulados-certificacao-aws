import { calculateTotalXp } from "./gamificationService.js";

export function projectGamification({
  events = [],
  legacyBaselineXp = 0,
} = {}) {
  const totalXp = calculateTotalXp(events, legacyBaselineXp);
  return {
    totalXp,
    events,
    legacyBaselineXp: Math.max(0, Number(legacyBaselineXp) || 0),
  };
}
