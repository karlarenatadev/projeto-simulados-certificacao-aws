import { describe, expect, test } from "@jest/globals";
import { projectGamification } from "../src/frontend/js/gamificationProjection.js";

describe("XP projection", () => {
  test("derives one total from legacy baseline plus canonical events", () => {
    expect(
      projectGamification({
        legacyBaselineXp: 500,
        events: [{ id: "a", amount: 10 }],
      }),
    ).toMatchObject({
      totalXp: 510,
      legacyBaselineXp: 500,
    });
  });
});
