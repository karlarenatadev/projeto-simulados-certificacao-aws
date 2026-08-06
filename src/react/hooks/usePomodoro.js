import { useCallback, useEffect, useRef, useState } from 'react';

const MODES = {
  work:       { label: 'Foco',        defaultMinutes: 25 },
  shortBreak: { label: 'Pausa curta', defaultMinutes: 5 },
  longBreak:  { label: 'Pausa longa', defaultMinutes: 15 },
};

/**
 * usePomodoro — timer Pomodoro com estados foco/pausa curta/pausa longa
 *
 * @returns {{ mode, timeLeft, isRunning, sessionCount, toggle, reset, switchMode, MODES }}
 */
export function usePomodoro() {
  const [mode, setMode] = useState('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const intervalRef = useRef(null);

  // Tick
  useEffect(() => {
    if (!isRunning) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          if (mode === 'work') setSessionCount(c => c + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  const toggle = useCallback(() => setIsRunning(r => !r), []);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(MODES[mode].defaultMinutes * 60);
  }, [mode]);

  const switchMode = useCallback((nextMode) => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setMode(nextMode);
    setTimeLeft(MODES[nextMode].defaultMinutes * 60);
  }, []);

  return { mode, timeLeft, isRunning, sessionCount, toggle, reset, switchMode, MODES };
}
