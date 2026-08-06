import { FaBolt, FaPlay, FaPause, FaRotateLeft, FaFireFlameCurved } from 'react-icons/fa6';
import { usePomodoro } from '@/hooks/usePomodoro';
import './study-now.css';

export default function StudyNow() {
  const { mode, timeLeft, isRunning, sessionCount, toggle, reset, switchMode, MODES } = usePomodoro();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="study-now">
      <div className="study-now__header">
        <h1 className="study-now__title">
          <FaBolt style={{ color: 'var(--color-warning)' }} />
          Estudar Agora
        </h1>
        <p className="study-now__subtitle">Sessão de estudo focada utilizando técnica Pomodoro</p>
      </div>

      <div className="pomodoro-container">
        <div className="pomodoro-modes">
          {Object.entries(MODES).map(([key, config]) => (
            <button
              key={key}
              className={`pomodoro-mode-btn ${mode === key ? 'pomodoro-mode-btn--active' : ''}`}
              onClick={() => switchMode(key)}
            >
              {config.label}
            </button>
          ))}
        </div>

        <div className="pomodoro-timer">
          {timeString}
        </div>

        <div className="pomodoro-controls">
          <button 
            className="pomodoro-control-btn pomodoro-control-btn--play" 
            onClick={toggle}
          >
            {isRunning ? <FaPause /> : <FaPlay />}
            {isRunning ? 'Pausar' : 'Iniciar'}
          </button>
          <button 
            className="pomodoro-control-btn pomodoro-control-btn--reset" 
            onClick={reset}
            title="Reiniciar Timer"
          >
            <FaRotateLeft />
          </button>
        </div>

        <div className="pomodoro-stats">
          <div className="pomodoro-stat-item">
            <FaFireFlameCurved style={{ color: 'var(--color-danger)' }} />
            <span>Sessões concluídas: <span className="pomodoro-stat-value">{sessionCount}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
