/** @jest-environment jsdom */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import {
  closePomodoroWidget,
  openPomodoroWidget,
  resetPomodoro,
  setPomodoroDuration,
  togglePomodoro,
} from "../src/frontend/js/pomodoroManager.js";

function renderPomodoro() {
  document.body.innerHTML = `
    <div id="pomodoro-widget" class="hidden" aria-hidden="true">
      <div id="pomodoro-display">15:00</div>
      <button id="btn-pomodoro-toggle" type="button"></button>
      <button class="pomodoro-duration-btn" data-pomodoro-duration="15"></button>
      <button class="pomodoro-duration-btn" data-pomodoro-duration="30"></button>
      <button class="pomodoro-duration-btn" data-pomodoro-duration="60"></button>
    </div>
    <span id="header-pomodoro-timer">15:00</span>
  `;
}

describe("shared Pomodoro widget", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    renderPomodoro();
    setPomodoroDuration(15);
    closePomodoroWidget();
  });

  afterEach(() => {
    resetPomodoro();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("opens and closes the existing widget explicitly", () => {
    expect(openPomodoroWidget()).toBe(true);
    expect(document.getElementById("pomodoro-widget").classList).not.toContain(
      "hidden",
    );
    expect(
      document.getElementById("pomodoro-widget").getAttribute("aria-hidden"),
    ).toBe("false");

    expect(closePomodoroWidget()).toBe(true);
    expect(document.getElementById("pomodoro-widget").classList).toContain(
      "hidden",
    );
  });

  test("starts, pauses, resumes and resets without duplicate intervals", () => {
    openPomodoroWidget();
    expect(togglePomodoro()).toBe(true);
    expect(jest.getTimerCount()).toBe(1);
    expect(
      document
        .getElementById("btn-pomodoro-toggle")
        .getAttribute("aria-pressed"),
    ).toBe("true");

    openPomodoroWidget();
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1_000);
    expect(document.getElementById("pomodoro-display").textContent).toBe(
      "14:59",
    );

    expect(togglePomodoro()).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(2_000);
    expect(document.getElementById("pomodoro-display").textContent).toBe(
      "14:59",
    );

    expect(togglePomodoro()).toBe(true);
    expect(jest.getTimerCount()).toBe(1);
    resetPomodoro();
    expect(jest.getTimerCount()).toBe(0);
    expect(document.getElementById("pomodoro-display").textContent).toBe(
      "15:00",
    );
  });

  test("updates the accessible start and pause labels in English", () => {
    localStorage.setItem("language", "en");
    openPomodoroWidget();
    expect(
      document.getElementById("btn-pomodoro-toggle").getAttribute("aria-label"),
    ).toBe("Start Pomodoro");

    togglePomodoro();
    expect(
      document.getElementById("btn-pomodoro-toggle").getAttribute("aria-label"),
    ).toBe("Pause Pomodoro");
  });
});
