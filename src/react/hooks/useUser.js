import { useContext } from 'react';
import { UserContext } from '@/contexts/UserContext';

/**
 * useUser — acesso simplificado ao UserContext
 *
 * Elimina boilerplate de `useContext(UserContext)` nos componentes.
 * Deve ser usado dentro de UserProvider.
 *
 * @returns {{ user, isLoading, login, logout, updateUser }}
 *
 * @example
 * const { user, logout } = useUser();
 */
export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser deve ser usado dentro de UserProvider');
  }

  return context;
}
