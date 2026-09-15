import { describe, expect, test } from "@jest/globals";
import {
  createXpEvent,
  createXpEventId,
  getXpPolicy,
} from "../src/frontend/js/gamificationPolicy.js";

describe("canonical XP policy", () => {
  test("uses stable event identity and existing lab reward", () => {
    expect(getXpPolicy("interactive_lab_completed")).toEqual({
      amount: 10,
      repeatable: false,
    });
    expect(createXpEventId("interactive_lab_completed", "lab-1")).toBe(
      "interactive_lab_completed:lab-1",
    );
    expect(
      createXpEvent({
        eventType: "interactive_lab_completed",
        sourceId: "lab-1",
        certification: "AIF-C01",
      }),
    ).toMatchObject({
      id: "interactive_lab_completed:lab-1",
      amount: 10,
      certification: "aif-c01",
    });
  });

  test("rejects unknown or incomplete rewards", () => {
    expect(createXpEvent({ eventType: "unknown", sourceId: "x" })).toBeNull();
    expect(
      createXpEvent({ eventType: "interactive_lab_completed" }),
    ).toBeNull();
  });
});
