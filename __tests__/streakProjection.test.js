import { describe, expect, test } from "@jest/globals";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getActivityDay,
  getStreakState,
  normalizeActivityDays,
} from "../src/frontend/js/streakProjection.js";

describe("streak projection", () => {
  test("deduplicates and calculates calendar-day streaks", () => {
    expect(
      normalizeActivityDays([
        "2026-09-12",
        "2026-09-10",
        "2026-09-10",
        "2026-09-11",
      ]),
    ).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    expect(
      calculateCurrentStreak(
        ["2026-09-10", "2026-09-11", "2026-09-12"],
        "2026-09-12",
      ),
    ).toBe(3);
    expect(
      calculateLongestStreak(["2026-09-10", "2026-09-11", "2026-09-13"]),
    ).toBe(2);
  });

  test("keeps yesterday current and breaks after a missing day", () => {
    const days = ["2026-09-10", "2026-09-11"];
    expect(calculateCurrentStreak(days, "2026-09-12")).toBe(2);
    expect(calculateCurrentStreak(days, "2026-09-13")).toBe(0);
  });

  test("handles month, year, leap-year and timezone calendar boundaries", () => {
    expect(calculateLongestStreak(["2026-08-31", "2026-09-01"])).toBe(2);
    expect(calculateLongestStreak(["2025-12-31", "2026-01-01"])).toBe(2);
    expect(
      calculateLongestStreak(["2024-02-28", "2024-02-29", "2024-03-01"]),
    ).toBe(3);
    expect(getActivityDay("2026-09-14T00:30:00Z", "America/Sao_Paulo")).toBe(
      "2026-09-13",
    );
  });

  test("ignores invalid/future days and preserves legacy fallback", () => {
    expect(
      calculateCurrentStreak([null, "", "invalid", "2026-09-20"], "2026-09-14"),
    ).toBe(0);
    expect(
      getStreakState({ legacyCurrentStreak: 4, legacyLongestStreak: 6 }),
    ).toMatchObject({
      currentStreak: 4,
      longestStreak: 6,
    });
  });
});
