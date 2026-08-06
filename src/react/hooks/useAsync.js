import { useCallback, useEffect, useReducer } from 'react';

/**
 * Estado inicial e reducer para operações assíncronas.
 */
const initialState = { data: null, isLoading: false, error: null };

function asyncReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SUCCESS':
      return { data: action.payload, isLoading: false, error: null };
    case 'ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/**
 * useAsync — gerencia o ciclo de vida de uma operação assíncrona
 *
 * @param {function} asyncFn  - função async a executar
 * @param {boolean}  immediate - executa na montagem se true (default: true)
 * @param {Array}    deps      - dependências que disparam re-execução
 *
 * @returns {{ data, isLoading, error, execute, reset }}
 *
 * @example
 * const { data, isLoading, error } = useAsync(() => fetchQuestions(), true, []);
 */
export function useAsync(asyncFn, immediate = true, deps = []) {
  const [state, dispatch] = useReducer(asyncReducer, initialState);

  const execute = useCallback(
    async (...args) => {
      dispatch({ type: 'LOADING' });
      try {
        const result = await asyncFn(...args);
        dispatch({ type: 'SUCCESS', payload: result });
        return result;
      } catch (err) {
        dispatch({ type: 'ERROR', payload: err });
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn, ...deps],
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return { ...state, execute, reset };
}
