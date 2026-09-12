import { storageManager } from "./storageManager.js";
import { getCurrentLanguage } from "./core/languageManager.js";
import { t } from "./i18n/useTranslation.js";

const DEFAULT_DURATION_MINUTES = 15;
const ALLOWED_DURATIONS = [15, 30, 60];

let timer = null;
let durationMinutes = DEFAULT_DURATION_MINUTES; // duração selecionável: 15 / 30 / 60
let timeLeft = durationMinutes * 60;
let isActive = false;

function getPomodoroLabel(key) {
  return t(key, getCurrentLanguage()) || t(key, "pt");
}

export function openPomodoroWidget() {
  const widget = document.getElementById("pomodoro-widget");
  if (!widget) return false;

  widget.classList.remove("hidden");
  widget.setAttribute("aria-hidden", "false");
  updateDisplay();
  updateDurationButtons();
  updateToggleButton();
  document.getElementById("btn-pomodoro-toggle")?.focus();
  return true;
}

export function closePomodoroWidget() {
  const widget = document.getElementById("pomodoro-widget");
  if (!widget) return false;

  widget.classList.add("hidden");
  widget.setAttribute("aria-hidden", "true");
  return true;
}

export function togglePomodoroWidget() {
  const widget = document.getElementById("pomodoro-widget");
  if (!widget) return false;
  return widget.classList.contains("hidden")
    ? openPomodoroWidget()
    : closePomodoroWidget();
}

export function togglePomodoro() {
  const btn = document.getElementById("btn-pomodoro-toggle");
  if (!btn) return false;

  if (!isActive) {
    isActive = true;
    if (timer !== null) clearInterval(timer);
    timer = setInterval(tick, 1000);
  } else {
    pausePomodoro();
  }
  updateToggleButton();
  return isActive;
}

function tick() {
  if (timeLeft <= 0) {
    finishSession();
    return;
  }
  timeLeft--;
  updateDisplay();
}

function finishSession() {
  pausePomodoro();
  // Salva no log de séries temporais que criamos no storageManager
  storageManager.saveFocusSession(durationMinutes, "work");
  alert(getPomodoroLabel("pomodoro_complete"));
  resetPomodoro();
}

function pausePomodoro() {
  isActive = false;
  if (timer !== null) clearInterval(timer);
  timer = null;
  updateToggleButton();
}

function updateToggleButton() {
  const btn = document.getElementById("btn-pomodoro-toggle");
  if (!btn) return;

  const icon = document.createElement("i");
  icon.className = `fa-solid ${isActive ? "fa-pause" : "fa-play"} text-xl`;
  icon.setAttribute("aria-hidden", "true");
  btn.replaceChildren(icon);
  btn.setAttribute(
    "aria-label",
    getPomodoroLabel(isActive ? "pomodoro_pause" : "pomodoro_start"),
  );
  btn.setAttribute("aria-pressed", String(isActive));
}

export function resetPomodoro() {
  pausePomodoro();
  timeLeft = durationMinutes * 60;
  updateDisplay();
}

/**
 * Define a duração do ciclo de foco (15, 30 ou 60 minutos).
 * Pausa o ciclo atual e reinicia o relógio com a nova duração,
 * garantindo que o timer inicie/reinicie com o valor escolhido.
 * @param {number} minutes - Duração desejada em minutos.
 */
export function setPomodoroDuration(minutes) {
  const value = Number(minutes);
  if (!ALLOWED_DURATIONS.includes(value)) return;
  durationMinutes = value;
  pausePomodoro();
  timeLeft = durationMinutes * 60;
  updateDisplay();
  updateDurationButtons();
}

function updateDurationButtons() {
  const buttons = document.querySelectorAll(".pomodoro-duration-btn");
  buttons.forEach((btn) => {
    const value = Number(btn.dataset.pomodoroDuration);
    const isSelected = value === durationMinutes;
    btn.setAttribute("aria-pressed", String(isSelected));
    if (isSelected) {
      btn.classList.add("bg-aws-orange", "text-white");
      btn.classList.remove(
        "bg-gray-100",
        "dark:bg-slate-700",
        "text-gray-600",
        "dark:text-gray-300",
      );
    } else {
      btn.classList.remove("bg-aws-orange", "text-white");
      btn.classList.add(
        "bg-gray-100",
        "dark:bg-slate-700",
        "text-gray-600",
        "dark:text-gray-300",
      );
    }
  });
}

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Atualiza o visor no painel flutuante
  const display = document.getElementById("pomodoro-display");
  if (display) display.textContent = timeStr;

  // Atualiza também o visor no header
  const headerTimer = document.getElementById("header-pomodoro-timer");
  if (headerTimer) headerTimer.textContent = timeStr;
}

// Expondo para o HTML (onclick)
window.togglePomodoroWidget = togglePomodoroWidget;
window.openPomodoroWidget = openPomodoroWidget;
window.closePomodoroWidget = closePomodoroWidget;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;
window.setPomodoroDuration = setPomodoroDuration;
