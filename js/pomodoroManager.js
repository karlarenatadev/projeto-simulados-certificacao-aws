import { storageManager } from './storageManager.js';

let timer = null;
let timeLeft = 15 * 60; // 15 minutos (foco na sua Sprint)
let isActive = false;

export function togglePomodoroWidget() {
    const widget = document.getElementById('pomodoro-widget');
    widget.classList.toggle('hidden');
}

export function togglePomodoro() {
    const btn = document.getElementById('btn-pomodoro-toggle');
    if (!isActive) {
        isActive = true;
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        timer = setInterval(tick, 1000);
    } else {
        pausePomodoro();
    }
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
    storageManager.saveFocusSession(15, 'work'); 
    alert("Ciclo de Foco Concluído! Que tal uma pausa de 3 minutos?");
    resetPomodoro();
}

function pausePomodoro() {
    isActive = false;
    clearInterval(timer);
    document.getElementById('btn-pomodoro-toggle').innerHTML = '<i class="fa-solid fa-play"></i>';
}

export function resetPomodoro() {
    pausePomodoro();
    timeLeft = 15 * 60;
    updateDisplay();
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Atualiza o visor no painel flutuante
    const display = document.getElementById('pomodoro-display');
    if (display) display.innerText = timeStr;
    
    // Atualiza também o visor no header
    const headerTimer = document.getElementById('header-pomodoro-timer');
    if (headerTimer) headerTimer.innerText = timeStr;
}

// Expondo para o HTML (onclick)
window.togglePomodoroWidget = togglePomodoroWidget;
window.togglePomodoro = togglePomodoro;
window.resetPomodoro = resetPomodoro;