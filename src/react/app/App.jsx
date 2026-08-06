import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { ToastProvider } from '@/components/feedback/Toast';
import { router } from '@/app/routes';

/**
 * App — raiz da aplicação React
 *
 * Ordem dos providers:
 *   ThemeProvider  → aplica tema antes da renderização
 *   UserProvider   → disponibiliza dados do usuário para toda a árvore
 *   ToastProvider  → habilita notificações toast em qualquer componente
 *   RouterProvider → rotas e navegação
 */
export function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
