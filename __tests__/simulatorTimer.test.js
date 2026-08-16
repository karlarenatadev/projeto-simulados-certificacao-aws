import { readFileSync } from "node:fs";
import { jest } from "@jest/globals";
import {
  clearAllTimers,
  startExamTimer,
  startMissionQuestionTimer,
  updateExamTimerDisplay,
} from "../src/frontend/js/timerManager.js";

describe("simulator exam timer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = `
      <span id="quiz-timer">00:00</span>
      <span id="mission-time-text"></span>
      <div id="mission-time-bar"></div>
    `;
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  test("updates the canonical quiz-timer element immediately", () => {
    const state = { timeRemaining: 112, timerInterval: null, isPaused: false };

    updateExamTimerDisplay(state);

    expect(document.getElementById("quiz-timer").textContent).toBe("01:52");
    expect(document.getElementById("timer-text")).toBeNull();
  });

  test("starts from persisted time, ticks down, and calls timeout once", () => {
    const onTimeUp = jest.fn();
    const state = { timeRemaining: 3, timerInterval: null, isPaused: false };

    startExamTimer(state, onTimeUp);
    expect(document.getElementById("quiz-timer").textContent).toBe("00:03");

    jest.advanceTimersByTime(1000);
    expect(state.timeRemaining).toBe(2);
    expect(document.getElementById("quiz-timer").textContent).toBe("00:02");

    jest.advanceTimersByTime(2000);
    expect(state.timeRemaining).toBe(0);
    expect(document.getElementById("quiz-timer").textContent).toBe("00:00");
    expect(onTimeUp).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  test("pause does not consume exam time", () => {
    const state = { timeRemaining: 10, timerInterval: null, isPaused: true };

    startExamTimer(state, jest.fn());
    jest.advanceTimersByTime(3000);

    expect(state.timeRemaining).toBe(10);
    expect(document.getElementById("quiz-timer").textContent).toBe("00:10");

    state.isPaused = false;
    jest.advanceTimersByTime(1000);
    expect(state.timeRemaining).toBe(9);
  });

  test("clearAllTimers stops both exam and mission intervals", () => {
    const state = {
      timeRemaining: 10,
      qTimeRemaining: 90,
      timerInterval: null,
      qTimerInterval: null,
      currentMode: "mission",
      isPaused: false,
    };
    const examUp = jest.fn();
    const missionUp = jest.fn();

    startExamTimer(state, examUp);
    startMissionQuestionTimer(state, missionUp);
    clearAllTimers(state);
    jest.advanceTimersByTime(2000);

    expect(examUp).not.toHaveBeenCalled();
    expect(missionUp).not.toHaveBeenCalled();
  });

  test("mission timer contract remains independent", () => {
    const state = {
      currentMode: "mission",
      qTimeRemaining: 0,
      qTimerInterval: null,
      isPaused: false,
    };

    startMissionQuestionTimer(state, jest.fn());
    expect(state.qTimeRemaining).toBe(90);
    jest.advanceTimersByTime(1000);
    expect(state.qTimeRemaining).toBe(89);
    expect(document.getElementById("mission-time-text").textContent).toBe("1m 29s");
  });
});

test("simulator question metadata is a compact horizontal structure", () => {
  const html = readFileSync(new URL("../src/frontend/pages/simulados.html", import.meta.url), "utf8");

  expect(html).toContain('class="quiz-question-meta"');
  expect(html).toContain('id="question-category"');
  expect(html).toContain('id="question-difficulty"');
  expect(html).toContain('id="quiz-timer"');
  expect(html).toContain('id="btn-flag"');
  expect(html).toContain('id="current-q-num"');
  expect(html).toContain('id="total-q-num"');
  expect(html).not.toContain('class="a3-card flex items-center gap-4 shadow-sm"');
});
