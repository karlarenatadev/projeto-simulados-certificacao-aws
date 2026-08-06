import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';

/**
 * useTheme — acesso simplificado ao ThemeContext
 *
 * Elimina boilerplate de `useContext(ThemeContext)` nos componentes.
 * Deve ser usado dentro de ThemeProvider.
 *
 * @returns {{ theme: 'light'|'dark', toggleTheme: function, setTheme: function }}
 *
 * @example
 * const { theme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }

  return context;
}
