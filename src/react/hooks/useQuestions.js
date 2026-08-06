import { useCallback, useMemo } from 'react';
import { useAsync } from './useAsync.js';
import {
  fetchQuestions,
  fetchFilteredQuestions,
  getLocalProgress,
  saveQuestionResult,
} from '@/services/questionService.js';

/**
 * useQuestions — hook para buscar e filtrar questões
 *
 * @param {{ certification?: string, domain?: string, limit?: number }} filters
 * @returns {{ questions, isLoading, error, refetch }}
 *
 * @example
 * const { questions, isLoading } = useQuestions({ certification: 'CLF-C02' });
 */
export function useQuestions(filters = {}) {
  const { certification, domain, limit } = filters;

  const fetcher = useCallback(
    () =>
      certification || domain || limit
        ? fetchFilteredQuestions({ certification, domain, limit })
        : fetchQuestions(),
    [certification, domain, limit],
  );

  const { data, isLoading, error, execute } = useAsync(fetcher, true, [
    certification,
    domain,
    limit,
  ]);

  const questions = useMemo(() => data ?? [], [data]);

  return {
    questions,
    isLoading,
    error,
    refetch: execute,
  };
}

/**
 * useProgress — hook para ler e escrever o progresso local do usuário
 *
 * @returns {{ progress, recordAnswer }}
 *
 * @example
 * const { progress, recordAnswer } = useProgress();
 * recordAnswer(questionId, true);
 */
export function useProgress() {
  const progress = useMemo(() => getLocalProgress(), []);

  const recordAnswer = useCallback((questionId, isCorrect) => {
    return saveQuestionResult(questionId, isCorrect);
  }, []);

  return { progress, recordAnswer };
}
