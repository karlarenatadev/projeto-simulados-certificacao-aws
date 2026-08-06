import { createContext, useCallback, useEffect, useState, useContext } from 'react';
import { api } from '@/services/api';

const SESSION_KEY = 'aws_sim_user_id'; // Mudamos a chave para guardar apenas o user ID

export const UserContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lê a sessão do storage na montagem e valida com o backend
  useEffect(() => {
    async function loadUser() {
      try {
        const storedId = localStorage.getItem(SESSION_KEY);
        if (storedId) {
          // O api.js injeta automaticamente o X-User-Id a partir do localStorage
          const res = await api.get('/auth/me');
          setUser(res.data);
        }
      } catch (err) {
        console.error('Sessão inválida:', err);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = useCallback(async (email, full_name, nickname) => {
    try {
      const res = await api.post('/auth/login', { email, full_name, nickname });
      const userData = res.data;
      localStorage.setItem(SESSION_KEY, userData.id);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
      setUser(updated); // Backend profile update not implemented yet, just local
    },
    [user],
  );

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useAuth must be inside UserProvider");
  return { ...context, isAuthenticated: !!context.user };
}
