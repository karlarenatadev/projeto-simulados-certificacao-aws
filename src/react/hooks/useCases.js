import { useCallback, useEffect, useState } from 'react';
import { fetchCases } from '@/services/casesService';

export function useCases(filters = {}) {
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCases(filters);
      setCases(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters.certification, filters.difficulty]);

  useEffect(() => { load(); }, [load]);

  return { cases, isLoading, error, refetch: load };
}
