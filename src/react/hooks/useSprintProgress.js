import { useCallback, useEffect, useState } from 'react';
import { storageGet, storageSet } from '@/services/storageService';

const SPRINT_KEY = 'sprint_progress';

/**
 * useSprintProgress — gerencia quais dias do sprint foram concluídos
 * Persiste em localStorage com chave aws_sim_sprint_progress
 *
 * @param {string} certId — certificação selecionada
 * @returns {{ completedDays, toggleDay, resetSprint, percentComplete }}
 */
export function useSprintProgress(certId) {
  const [completedDays, setCompletedDays] = useState(() => {
    const saved = storageGet(SPRINT_KEY);
    return saved?.[certId] ?? [];
  });

  useEffect(() => {
    const saved = storageGet(SPRINT_KEY);
    setCompletedDays(saved?.[certId] ?? []);
  }, [certId]);

  const toggleDay = useCallback((day) => {
    setCompletedDays(prev => {
      const next = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      const all = storageGet(SPRINT_KEY) ?? {};
      storageSet(SPRINT_KEY, { ...all, [certId]: next });
      return next;
    });
  }, [certId]);

  const resetSprint = useCallback(() => {
    setCompletedDays([]);
    const all = storageGet(SPRINT_KEY) ?? {};
    storageSet(SPRINT_KEY, { ...all, [certId]: [] });
  }, [certId]);

  const percentComplete = completedDays.length > 0
    ? Math.round((completedDays.length / 14) * 100)
    : 0;

  return { completedDays, toggleDay, resetSprint, percentComplete };
}
