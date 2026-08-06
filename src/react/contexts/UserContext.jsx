import { createContext, useCallback, useEffect, useState } from 'react';

const SESSION_KEY = 'aws_sim_session';

/**
 * UserContext — gerencia sessão e dados do usuário logado
 *
 * Mantém compatibilidade com SessionManager do vanilla JS:
 * persiste sessão em localStorage com chave 'aws_sim_session'.
 *
 * Expõe:
 *   user         — objeto do usuário (ou null)
 *   isLoading    — aguardando leitura do storage
 *   login(user)  — salva a sessão
 *   logout()     — limpa a sessão
 *   updateUser() — atualiza campos do usuário sem novo login
 */
export const UserContext = createContext({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lê a sessão do storage na montagem
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        setUser(session?.user ?? null);
      }
    } catch {
      // sessão corrompida — ignora
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((userData) => {
    const session = {
      user: userData,
      loginAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // storage cheio — continua sem persistir
    }
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignora
    }
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (partial) => {
      if (!user) return;
      const updated = { ...user, ...partial };
      login(updated);
    },
    [user, login],
  );

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}
