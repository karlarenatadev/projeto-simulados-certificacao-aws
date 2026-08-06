import { createContext, useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aws_sim_theme';
const THEMES = { LIGHT: 'light', DARK: 'dark' };

/**
 * ThemeContext — gerencia tema claro/escuro da aplicação
 *
 * Persiste em localStorage com chave 'aws_sim_theme' (compatível com vanilla).
 * Aplica o tema via atributo data-theme="dark" no <html>.
 */
export const ThemeContext = createContext({
  theme: THEMES.LIGHT,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? THEMES.LIGHT;
    } catch {
      return THEMES.LIGHT;
    }
  });

  // Aplica o tema no <html> e persiste
  const applyTheme = useCallback((nextTheme) => {
    const html = document.documentElement;
    if (nextTheme === THEMES.DARK) {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark'); // mantém compatibilidade com classes dark: do vanilla
    } else {
      html.removeAttribute('data-theme');
      html.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // localStorage indisponível (ex: incógnito com bloqueio)
    }
  }, []);

  // Aplica na montagem inicial
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (next) => {
      const normalized = next === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
      setThemeState(normalized);
      applyTheme(normalized);
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
