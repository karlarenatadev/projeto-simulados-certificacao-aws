import { createContext, useState, useEffect, useContext } from 'react';
import { api } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carrega o profile no boot se tiver ID
  useEffect(() => {
    async function loadUser() {
      const storedId = localStorage.getItem('aws_sim_user_id');
      if (storedId) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Falha ao autenticar token local:', error);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, full_name, nickname) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, full_name, nickname });
      const userData = res.data;
      localStorage.setItem('aws_sim_user_id', userData.id);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aws_sim_user_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
