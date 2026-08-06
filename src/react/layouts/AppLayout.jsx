import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/navigation/Header';
import { Sidebar } from '@/components/navigation/Sidebar';
import '@/styles/components/layout-dashboard.css';

/**
 * AppLayout — shell React principal
 *
 * Todas as páginas da aplicação são renderizadas dentro deste layout
 * através do <Outlet /> do React Router.
 *
 * Gerencia:
 *  - estado aberto/fechado da sidebar
 *  - passagem de props para Header e Sidebar
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className={`layout ${sidebarOpen ? 'layout--with-sidebar' : 'layout--sidebar-closed'}`}>
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      <Sidebar isOpen={sidebarOpen} currentPath={location.pathname} />

      <main
        className={`layout__content ${sidebarOpen ? '' : 'layout__content--no-sidebar'}`}
        id="main-content"
      >
        <Outlet />
      </main>
    </div>
  );
}
