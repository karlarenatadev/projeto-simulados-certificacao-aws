import { describe, expect, test } from "@jest/globals";
import {
  awardXpEvent,
  calculateTotalXp,
  mergeXpEvents,
} from "../src/frontend/js/gamificationService.js";

describe("XP event service", () => {
  test("is idempotent for the same event and preserves distinct events", () => {
    const first = awardXpEvent([], {
      eventType: "interactive_lab_completed",
      sourceId: "lab-1",
    });
    const replay = awardXpEvent(first.events, {
      eventType: "interactive_lab_completed",
      sourceId: "lab-1",
    });
    const second = awardXpEvent(replay.events, {
      eventType: "interactive_lab_completed",
      sourceId: "lab-2",
    });
    expect(first.added).toBe(true);
    expect(replay.added).toBe(false);
    expect(second.events).toHaveLength(2);
    expect(calculateTotalXp(second.events)).toBe(20);
  });

  test("unions local and remote events without double counting", () => {
    const event = { id: "interactive_lab_completed:lab-1", amount: 10 };
    expect(mergeXpEvents([event], [event])).toEqual([event]);
    expect(calculateTotalXp([event], 500)).toBe(510);
  });
});
