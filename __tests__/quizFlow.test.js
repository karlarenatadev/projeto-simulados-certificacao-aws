/** @jest-environment jsdom */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "@jest/globals";
import {
  getStreamlinedQuizActionState,
  isLastQuestionInFlow,
  isQuizSelectionComplete,
  shouldAutoSubmitQuizAnswer,
} from "../src/frontend/js/quizFlow.js";

const simulatorHtml = readFileSync(
  new URL("../src/frontend/pages/simulados.html", import.meta.url),
  "utf8",
);
const diagnosticHtml = readFileSync(
  new URL("../src/frontend/pages/diagnostico.html", import.meta.url),
  "utf8",
);
const simulatorDocument = new DOMParser().parseFromString(
  simulatorHtml,
  "text/html",
);

describe("streamlined simulator controls", () => {
  test("removes Cancel, Previous and Confirm only from the simulator quiz bar", () => {
    const screen = simulatorDocument.getElementById("screen-quiz");

    expect(screen.dataset.quizFlow).toBe("streamlined");
    expect(screen.querySelector("#btn-cancel")).toBeNull();
    expect(screen.querySelector("#btn-prev")).toBeNull();
    expect(screen.querySelector("#btn-submit")).toBeNull();
    expect(diagnosticHtml).toContain('id="btn-cancel"');
    expect(diagnosticHtml).toContain('id="btn-submit"');
  });

  test("keeps accessible Next and Finish controls disabled in source markup", () => {
    const next = simulatorDocument.getElementById("btn-next");
    const finish = simulatorDocument.getElementById("btn-finish");
    const feedback = simulatorDocument.getElementById("explanation-box");

    expect(next.disabled).toBe(true);
    expect(next.getAttribute("aria-label")).toBe("Próxima");
    expect(finish.disabled).toBe(true);
    expect(finish.getAttribute("aria-label")).toBe("Finalizar simulado");
    expect(feedback.getAttribute("role")).toBe("status");
    expect(feedback.getAttribute("aria-live")).toBe("polite");
  });

  test.each([
    [0, false, { showNext: true, nextDisabled: true, showFinish: false }],
    [0, true, { showNext: true, nextDisabled: false, showFinish: false }],
    [3, false, { showNext: false, showFinish: true, finishDisabled: true }],
    [3, true, { showNext: false, showFinish: true, finishDisabled: false }],
  ])(
    "selects the only primary action at index %i (answered=%s)",
    (currentIndex, isAnswered, expected) => {
      const isLastQuestion = isLastQuestionInFlow({
        currentIndex,
        totalQuestions: 4,
      });
      expect(
        getStreamlinedQuizActionState({ isLastQuestion, isAnswered }),
      ).toMatchObject(expected);
    },
  );

  test("uses review queue position when the user revisits selected questions", () => {
    expect(
      isLastQuestionInFlow({
        currentIndex: 1,
        totalQuestions: 10,
        reviewQueuePosition: 2,
        reviewQueueLength: 3,
      }),
    ).toBe(true);
  });
});

describe("automatic answer submission gate", () => {
  test("single choice becomes complete as soon as a valid option is selected", () => {
    expect(isQuizSelectionComplete(null, false)).toBe(false);
    expect(isQuizSelectionComplete(0, false)).toBe(true);
  });

  test("multiple choice waits for the exact required option count", () => {
    expect(isQuizSelectionComplete([0], true, 2)).toBe(false);
    expect(isQuizSelectionComplete([0, 2], true, 2)).toBe(true);
  });

  test("does not auto-submit an answered or currently submitting question", () => {
    const base = {
      isStreamlined: true,
      selection: 1,
      isMultiple: false,
      requiredSelections: 1,
    };

    expect(
      shouldAutoSubmitQuizAnswer({
        ...base,
        isAnswered: false,
        isSubmitting: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoSubmitQuizAnswer({
        ...base,
        isAnswered: true,
        isSubmitting: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoSubmitQuizAnswer({
        ...base,
        isAnswered: false,
        isSubmitting: true,
      }),
    ).toBe(false);
  });
});
