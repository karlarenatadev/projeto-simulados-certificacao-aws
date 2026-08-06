import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FaHouse,
  FaPlay,
  FaRoute,
  FaStethoscope,
  FaLayerGroup,
  FaDiagramProject,
  FaBookOpenReader,
  FaBolt,
  FaCalendarCheck,
  FaGear,
  FaUser,
  FaCircleCheck,
} from 'react-icons/fa6';
import { UserContext } from '@/contexts/UserContext';
import '@/styles/components/sidebar.css';

/**
 * Definição de itens da sidebar por role.
 * roles: ['*'] = todos | roles específicos para ADMIN
 */
const NAV_ITEMS = [
  {
    id: 'hub',
    to: '/',
    label: 'Hub',
    icon: FaHouse,
    title: 'Learning Hub — Painel Principal',
    primary: true,
    end: true,
  },
  {
    id: 'simulados',
    to: '/simulados',
    label: 'Simulados',
    icon: FaPlay,
    title: 'Simulados de Certificação',
  },
  {
    id: 'jornada',
    to: '/jornada',
    label: 'Jornada',
    icon: FaRoute,
    title: 'Minha Jornada de Estudos',
  },
  {
    id: 'diagnostico',
    to: '/diagnostico',
    label: 'Raio-X',
    icon: FaStethoscope,
    title: 'Diagnóstico de Conhecimento',
  },
  {
    id: 'flashcards',
    to: '/flashcards',
    label: 'Cards',
    icon: FaLayerGroup,
    title: 'Flashcards de Revisão',
  },
  {
    id: 'cases',
    to: '/cases',
    label: 'Prática',
    icon: FaDiagramProject,
    title: 'Cases Arquiteturais AWS',
  },
  {
    id: 'recursos',
    to: '/recursos',
    label: 'Recursos',
    icon: FaBookOpenReader,
    title: 'Materiais de Estudo',
  },
  {
    id: 'study-now',
    to: '/study-now',
    label: 'Estudar',
    icon: FaBolt,
    title: 'Estudar Agora',
  },
  {
    id: 'sprint',
    to: '/study-sprint',
    label: 'Sprint',
    icon: FaCalendarCheck,
    title: 'Sprint de 14 Dias',
  },
];

const FOOTER_ITEMS = [
  { id: 'profile', to: '/perfil', label: 'Perfil', icon: FaUser, title: 'Meu Perfil' },
  { id: 'settings', to: '/configuracoes', label: 'Config', icon: FaGear, title: 'Configurações' },
];

const ADMIN_ITEMS = [
  {
    id: 'validation',
    to: '/validacao',
    label: 'Validar',
    icon: FaCircleCheck,
    title: 'Validação de Questões',
  },
];

/**
 * Sidebar — navegação lateral fixa do app shell
 *
 * @param {boolean}  isOpen  - sidebar visível?
 */
export function Sidebar({ isOpen }) {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <nav
      id="sidebar"
      className={`sidebar ${isOpen ? '' : 'sidebar--closed'}`}
      aria-label="Menu principal"
      aria-hidden={!isOpen}
    >
      {/* ── Navegação principal ── */}
      <ul className="sidebar__nav" role="list">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.id} {...item} />
        ))}

        {isAdmin &&
          ADMIN_ITEMS.map((item) => (
            <SidebarItem key={item.id} {...item} />
          ))}
      </ul>

      {/* ── Footer: perfil + config ── */}
      <div className="sidebar__footer">
        <hr className="sidebar__divider" aria-hidden="true" />
        <ul role="list" style={{ display: 'contents' }}>
          {FOOTER_ITEMS.map((item) => (
            <SidebarItem key={item.id} {...item} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Item individual da sidebar usando NavLink para active state automático */
function SidebarItem({ to, label, icon: Icon, title, primary = false, end = false }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          [
            'sidebar__item',
            primary && 'sidebar__item--primary',
            isActive && 'sidebar__item--active',
          ]
            .filter(Boolean)
            .join(' ')
        }
        title={title}
        aria-label={title}
      >
        <Icon className="sidebar__item-icon" aria-hidden="true" />
        <span className="sidebar__item-label">{label}</span>
      </NavLink>
    </li>
  );
}
