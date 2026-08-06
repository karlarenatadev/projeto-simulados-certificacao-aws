import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/UserContext';

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <span className="page-loader__icon">☁️</span>
        <span>Validando sessão...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
