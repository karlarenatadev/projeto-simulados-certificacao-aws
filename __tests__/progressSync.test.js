import { describe, expect, test } from "@jest/globals";
import {
  mergeAttempts,
  mergeMistake,
  mergeReviewDeck,
  mergeJourneyProgress,
  reconcileModuleState,
} from "../src/frontend/js/progressSync.js";

describe("progress reconciliation", () => {
  test("unions history and completes the same attempt monotonically", () => {
    expect(
      mergeAttempts(
        [{ attemptId: "a" }, { attemptId: "b" }],
        [{ attemptId: "a", status: "completed" }, { attemptId: "c" }],
      ),
    ).toHaveLength(3);
    expect(
      mergeAttempts(
        [{ attemptId: "a", status: "started" }],
        [{ attemptId: "a", status: "completed" }],
      )[0].status,
    ).toBe("completed");
  });

  test("merges mistakes without decreasing count and reopens on newer wrong answer", () => {
    const result = mergeMistake(
      { wrongCount: 2, lastWrongAt: "2026-01-02T11:00:00Z", resolved: false },
      { wrongCount: 4, resolved: true, resolvedAt: "2026-01-02T10:00:00Z" },
    );
    expect(result.wrongCount).toBe(4);
    expect(result.resolved).toBe(false);
  });

  test("deduplicates the same question by certification across legacy aliases", () => {
    const result = reconcileModuleState(
      "mistakes",
      {
        mistakes: [{ questionId: "q", cert: "AIF-C01", wrongCount: 1 }],
      },
      {
        mistakes: [
          { questionId: "q", certification: "aif-c01", wrongCount: 3 },
        ],
      },
    );
    expect(result.state.mistakes).toHaveLength(1);
    expect(result.state.mistakes[0].wrongCount).toBe(3);
  });

  test("uses latest review status and preserves maximum review count", () => {
    const merged = mergeReviewDeck(
      [
        {
          questionId: "q",
          reviewStatus: "pending",
          reviewCount: 3,
          lastReviewedAt: "2026-01-02T12:00:00Z",
        },
      ],
      [
        {
          questionId: "q",
          reviewStatus: "mastered",
          reviewCount: 1,
          lastReviewedAt: "2026-01-01T12:00:00Z",
        },
      ],
    );
    expect(merged[0]).toMatchObject({
      reviewStatus: "pending",
      reviewCount: 3,
    });
  });

  test("journey progress is monotonic and sync is idempotent", () => {
    const merged = mergeJourneyProgress(
      { completedStages: ["1"], currentDay: 2 },
      { completedStages: ["2"], currentDay: 1 },
    );
    expect(merged.completedStages).toEqual(["2", "1"]);
    expect(reconcileModuleState("journey", merged, merged).state).toEqual(
      merged,
    );
  });

  test("sprint sync unions completed days and derives the next day", () => {
    const result = reconcileModuleState(
      "sprint",
      { completedStages: ["1", "2"] },
      { completedStages: ["1", "3"] },
    );
    expect(result.state.completedStages).toEqual(["1", "2", "3"]);
    expect(result.state.currentDay).toBe(4);
    expect(result.state.unlockedStages).toContain("4");
  });
});
