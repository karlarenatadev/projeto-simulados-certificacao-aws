import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaCloud,
  FaMoon,
  FaSun,
  FaStopwatch,
  FaGlobe,
} from 'react-icons/fa6';
import { ThemeContext } from '@/contexts/ThemeContext';
import { UserContext } from '@/contexts/UserContext';
import '@/styles/components/header.css';

/**
 * Header — barra superior fixa do app shell
 *
 * @param {boolean}  sidebarOpen   - estado atual da sidebar
 * @param {function} onToggleSide  - callback para abrir/fechar sidebar
 */
export function Header({ sidebarOpen, onToggleSidebar }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="header" role="banner">
      {/* ── Esquerda: toggle + brand ── */}
      <div className="header__left">
        <button
          className="header__sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {sidebarOpen ? (
            <FaCloud className="header__sidebar-toggle-icon" aria-hidden="true" />
          ) : (
            <FaBars className="header__sidebar-toggle-icon" aria-hidden="true" />
          )}
        </button>

        <button
          className="header__brand"
          onClick={() => navigate('/')}
          aria-label="Ir para o Dashboard"
        >
          <h1 className="header__brand-title">Cloud Academy A3</h1>
          <p className="header__brand-subtitle">Sua jornada para certificações AWS</p>
        </button>
      </div>

      {/* ── Direita: ações ── */}
      <div className="header__actions" role="toolbar" aria-label="Ações do cabeçalho">
        {/* Idioma */}
        <button
          className="header__action-btn"
          aria-label="Alternar idioma"
          title="Alternar idioma (PT/EN)"
        >
          <FaGlobe aria-hidden="true" />
          <span className="header__action-label">PT-BR</span>
        </button>

        {/* Tema */}
        <button
          className="header__action-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {theme === 'dark' ? (
            <FaSun aria-hidden="true" />
          ) : (
            <FaMoon aria-hidden="true" />
          )}
        </button>

        {/* Pomodoro */}
        <button
          className="header__action-btn header__action-btn--pomodoro"
          aria-label="Abrir Pomodoro"
          title="Timer Pomodoro"
        >
          <FaStopwatch aria-hidden="true" />
          <span className="header__action-label" aria-live="polite">
            25:00
          </span>
        </button>

        {/* Avatar do usuário */}
        {user && (
          <button
            className="header__user-trigger"
            aria-label={`Menu do usuário - ${user.full_name || user.email}`}
            title="Sair (Logout)"
            onClick={() => {
              if(window.confirm('Deseja realmente sair?')) {
                logout();
              }
            }}
          >
            <span className="header__avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="header__user-name">
              {user.nickname || user.full_name?.split(' ')[0]}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
