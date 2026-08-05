/**
 * shell.js — App Shell compartilhado da CloudAcademy A3
 *
 * Responsabilidades:
 *  - Inicializar tema (claro/escuro) em qualquer página
 *  - Inicializar botão de idioma (visual)
 *  - Inicializar botão de instalação PWA
 *  - Injetar o UserMenu no header (avatar, nome, role, dropdown, logout)
 *  - Injetar a Sidebar de navegação com itens dinâmicos por role
 *  - Expor initShell() para uso global via window
 *
 * Uso em páginas que NÃO carregam app.js:
 *   <script type="module" src="./js/shell.js"></script>
 *
 * O app.js importa e chama initShell() após a autenticação, para que o
 * UserMenu e a Sidebar sejam populados com os dados do usuário logado.
 */

import { logger } from "./utils/logger.js";
import { userManager } from "./userManager.js";
import { AuthService } from "./services/authService.js";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const THEME_KEY = "aws_sim_theme";
const LANG_KEY = "aws_sim_lang";

/**
 * Mapa de itens da sidebar por role.
 * Cada entrada: { id, label, icon, href?, action?, roles, conditional? }
 *
 * - roles: quais roles veem este item ('*' = todos)
 * - conditional: função opcional que recebe o user e retorna bool
 */
const SIDEBAR_ITEMS = [
  {
    id: "sidebar-btn-hub",
    label: "Hub",
    icon: "fa-solid fa-house",
    action: "showLearningHub",
    roles: ["*"],
    primary: true,
    title: "Learning Hub — Painel Principal",
  },
  {
    id: "sidebar-btn-quiz",
    label: "Simulação",
    icon: "fa-solid fa-play",
    action: "startQuiz",
    roles: ["*"],
    i18n: "sidebar_start",
    title: "Iniciar Simulação",
  },
  {
    id: "sidebar-btn-journey",
    label: "Jornada",
    icon: "fa-solid fa-route",
    action: "startJornada",
    roles: ["*"],
    i18n: "sidebar_journey",
    title: "Minha Jornada (Trilha)",
  },
  {
    id: "sidebar-btn-diagnostic",
    label: "Raio-X",
    icon: "fa-solid fa-stethoscope",
    action: "startDiagnostic",
    roles: ["*"],
    i18n: "sidebar_diagnostic",
    title: "Raio-X da Nuvem (Diagnóstico)",
  },
  {
    id: "sidebar-btn-flashcards",
    label: "Flashcards",
    icon: "fa-solid fa-layer-group",
    action: "startFlashcards",
    roles: ["*"],
    i18n: "sidebar_flashcards",
    title: "Flashcards (Revisão)",
  },
  {
    id: "sidebar-btn-cases",
    label: "Prática",
    icon: "fa-solid fa-diagram-project",
    href: "./cases.html",
    roles: ["*"],
    i18n: "sidebar_cases",
    title: "Aprenda na Prática",
  },
  {
    id: "sidebar-btn-resources",
    label: "Recursos",
    icon: "fa-solid fa-book-open-reader",
    href: "./resources.html",
    roles: ["*"],
    i18n: "sidebar_resources",
    title: "Recursos de Estudo",
  },
  {
    id: "sidebar-btn-mistakes",
    label: "Erros",
    icon: "fa-solid fa-triangle-exclamation",
    action: "startMistakesQuiz",
    roles: ["*"],
    i18n: "sidebar_mistakes",
    title: "Praticar Questões Erradas",
    danger: true,
    hidden: true, // Oculto por padrão; app.js controla visibilidade
    badge: "sidebar-mistakes-count",
  },
  // ── Itens exclusivos para VALIDATOR e ADMIN ─────────────────────────────
  {
    id: "sidebar-btn-validation",
    label: "Validação",
    icon: "fa-solid fa-circle-check",
    href: "./validation/valid.html",
    roles: ["VALIDATOR", "ADMIN"],
    title: "Painel de Validação de Questões",
  },
  // ── Itens exclusivos para ADMIN ──────────────────────────────────────────
  {
    id: "sidebar-btn-users",
    label: "Usuários",
    icon: "fa-solid fa-users",
    href: "#",
    roles: ["ADMIN"],
    title: "Gerenciar Usuários (em breve)",
  },
  {
    id: "sidebar-btn-metrics",
    label: "Métricas",
    icon: "fa-solid fa-chart-bar",
    href: "#",
    roles: ["ADMIN"],
    title: "Métricas da Plataforma (em breve)",
  },
  {
    id: "sidebar-btn-config",
    label: "Config",
    icon: "fa-solid fa-gear",
    href: "#",
    roles: ["ADMIN"],
    title: "Configurações (em breve)",
  },
  // ── Itens de rodapé (visíveis a todos, posicionados antes do collapse) ──
  {
    id: "sidebar-btn-profile",
    label: "Perfil",
    icon: "fa-solid fa-circle-user",
    href: "./profile.html",
    roles: ["*"],
    title: "Meu Perfil",
    footer: true,
  },
  {
    id: "sidebar-btn-settings",
    label: "Config",
    icon: "fa-solid fa-sliders",
    href: "./settings.html",
    roles: ["*"],
    title: "Configurações",
    footer: true,
  },
];

// ─── TEMA ─────────────────────────────────────────────────────────────────────

/**
 * Aplica o tema salvo (claro/escuro) ao documento.
 */
export function initThemeShell() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
  _syncThemeIcon(theme === "dark");
}

/**
 * Alterna entre tema claro e escuro, persiste a escolha e atualiza o ícone.
 */
export function toggleDarkModeShell() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  _syncThemeIcon(isDark);
}

function _syncThemeIcon(isDark) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;
  icon.className = isDark
    ? "fa-solid fa-sun text-base md:text-xl"
    : "fa-solid fa-moon text-base md:text-xl";
}

// ─── IDIOMA ───────────────────────────────────────────────────────────────────

/**
 * Atualiza o visual do botão de idioma conforme o valor salvo.
 */
export function syncLanguageButtonShell() {
  const lang = localStorage.getItem(LANG_KEY) || "pt";
  const btn = document.getElementById("btn-language");
  if (!btn) return;
  btn.innerHTML =
    lang === "pt"
      ? '<span class="text-[10px] md:text-xs font-bold">🇧🇷 <span class="hidden sm:inline">PT-BR</span></span>'
      : '<span class="text-[10px] md:text-xs font-bold">🇺🇸 <span class="hidden sm:inline">EN-US</span></span>';
}

// ─── PWA INSTALL ─────────────────────────────────────────────────────────────

let _deferredInstallPrompt = null;

export function initPWAInstallShell() {
  const btn = document.getElementById("install-app");
  if (!btn) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    btn.classList.remove("hidden");
  });

  btn.addEventListener("click", async () => {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    await _deferredInstallPrompt.userChoice;
    _deferredInstallPrompt = null;
    btn.classList.add("hidden");
  });

  window.addEventListener("appinstalled", () => {
    btn.classList.add("hidden");
    _deferredInstallPrompt = null;
  });
}

// ─── USER MENU ────────────────────────────────────────────────────────────────

/**
 * Injeta o componente UserMenu no container #user-menu-container do header.
 * Se o container não existir, o menu não é renderizado.
 *
 * @param {{ id, email, nickname, role, full_name } | null} user
 */
export function renderUserMenu(user) {
  const container = document.getElementById("user-menu-container");
  if (!container) return;

  if (!user) {
    container.innerHTML = "";
    return;
  }

  const displayName =
    user.nickname || user.full_name || user.email || "Usuário";
  const initial = displayName.charAt(0).toUpperCase();
  const role = (user.role || "STUDENT").toUpperCase();
  const roleLabel = _roleLabel(role);
  const roleClass = _roleClass(role);

  container.innerHTML = `
    <div class="a3-user-menu" id="user-menu-btn" aria-haspopup="true" aria-expanded="false" role="button" tabindex="0" aria-label="Menu do usuário">
      <div class="a3-avatar" aria-hidden="true">${initial}</div>
      <div class="a3-user-info">
        <span class="a3-user-name" title="${displayName}">${displayName}</span>
        <span class="a3-user-role ${roleClass}">${roleLabel}</span>
      </div>
      <i class="fa-solid fa-chevron-down a3-user-chevron" aria-hidden="true"></i>
    </div>

    <div class="a3-user-dropdown" id="user-dropdown" role="menu" aria-hidden="true">
      <div class="a3-dropdown-header">
        <div class="a3-avatar a3-avatar-lg" aria-hidden="true">${initial}</div>
        <div>
          <p class="a3-dropdown-name">${displayName}</p>
          <p class="a3-dropdown-email">${user.email || ""}</p>
        </div>
      </div>
      <div class="a3-dropdown-divider"></div>
      <button class="a3-dropdown-item" role="menuitem" id="user-menu-profile">
        <i class="fa-solid fa-user" aria-hidden="true"></i>
        <span>Meu Perfil</span>
      </button>
      <button class="a3-dropdown-item" role="menuitem" id="user-menu-settings">
        <i class="fa-solid fa-gear" aria-hidden="true"></i>
        <span>Configurações</span>
      </button>
      <div class="a3-dropdown-divider"></div>
      <button class="a3-dropdown-item a3-dropdown-item-danger" role="menuitem" id="user-menu-logout">
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        <span>Sair</span>
      </button>
    </div>
  `;

  _bindUserMenuEvents();
}

function _roleLabel(role) {
  const labels = {
    STUDENT: "Estudante",
    VALIDATOR: "Validador",
    ADMIN: "Admin",
  };
  return labels[role] || role;
}

function _roleClass(role) {
  const classes = {
    STUDENT: "a3-role-student",
    VALIDATOR: "a3-role-validator",
    ADMIN: "a3-role-admin",
  };
  return classes[role] || "a3-role-student";
}

function _bindUserMenuEvents() {
  const btn = document.getElementById("user-menu-btn");
  const dropdown = document.getElementById("user-dropdown");
  const logoutBtn = document.getElementById("user-menu-logout");

  if (!btn || !dropdown) return;

  // Toggle dropdown
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
    dropdown.setAttribute("aria-hidden", String(!isOpen));
  });

  // Fechar ao clicar fora
  document.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
    }
  });

  // Fechar com Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dropdown.classList.contains("is-open")) {
      dropdown.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
      btn.focus();
    }
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await AuthService.logout();
      } catch (err) {
        logger.warn("[Shell] Erro no logout:", err);
      } finally {
        window.location.reload();
      }
    });
  }

  // Perfil — navega para profile.html
  const profileBtn = document.getElementById("user-menu-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      dropdown.classList.remove("is-open");
      window.location.href = "./profile.html";
    });
  }

  // Configurações — navega para settings.html
  const settingsBtn = document.getElementById("user-menu-settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      dropdown.classList.remove("is-open");
      window.location.href = "./settings.html";
    });
  }
}

// ─── SIDEBAR DINÂMICA ─────────────────────────────────────────────────────────

/**
 * Constrói e injeta a sidebar de navegação no elemento #left-sidebar.
 * Os itens visíveis dependem do role do usuário.
 * Se a sidebar não existir no DOM, a função não faz nada.
 *
 * @param {{ role?: string } | null} user
 */
export function buildSidebar(user) {
  const sidebar = document.getElementById("left-sidebar");
  if (!sidebar) return;

  const role = (user?.role || "STUDENT").toUpperCase();
  const isAdmin = role === "ADMIN";

  // Separa itens normais dos itens de rodapé
  const allVisible = SIDEBAR_ITEMS.filter((item) => {
    if (item.roles.includes("*")) return true;
    if (item.roles.includes(role)) return true;
    if (isAdmin) return true;
    return false;
  });

  const mainItems = allVisible.filter((item) => !item.footer);
  const footerItems = allVisible.filter((item) => item.footer);

  const navEl = sidebar.querySelector(".left-sidebar-nav");
  if (!navEl) return;

  navEl.innerHTML = "";

  // Renderiza itens principais
  for (const item of mainItems) {
    const el = _createSidebarItem(item);
    navEl.appendChild(el);
  }

  // Injeta o footer com divisor + itens de perfil/config + botão de recolher
  if (!sidebar.querySelector(".left-sidebar-footer")) {
    const footer = document.createElement("div");
    footer.className = "left-sidebar-footer";

    // Divisor e itens de footer (Perfil / Config)
    if (footerItems.length > 0) {
      const divider = document.createElement("div");
      divider.className = "left-sidebar-divider";
      divider.setAttribute("aria-hidden", "true");
      footer.appendChild(divider);

      for (const item of footerItems) {
        const el = _createSidebarItem(item);
        footer.appendChild(el);
      }
    }

    // Divisor antes do botão collapse
    const divider2 = document.createElement("div");
    divider2.className = "left-sidebar-divider";
    divider2.setAttribute("aria-hidden", "true");
    footer.appendChild(divider2);

    // Botão de recolher/expandir
    const collapseBtn = document.createElement("button");
    collapseBtn.id = "sidebar-collapse-btn";
    collapseBtn.className = "sidebar-collapse-btn";
    collapseBtn.title = "Recolher menu lateral";
    collapseBtn.setAttribute("aria-label", "Recolher menu lateral");
    collapseBtn.setAttribute("aria-expanded", "true");
    collapseBtn.innerHTML = `
      <i class="fa-solid fa-angles-left sidebar-collapse-icon" aria-hidden="true"></i>
      <span class="sidebar-collapse-label">Recolher</span>
    `;
    collapseBtn.addEventListener("click", () => {
      const isClosed = document.body.classList.toggle("sidebar-closed");
      localStorage.setItem("sidebar_closed", String(isClosed));
      _syncSidebarToggleState(isClosed);
    });
    footer.appendChild(collapseBtn);

    sidebar.appendChild(footer);
  }

  // Sincroniza o estado visual após construir a sidebar
  const isClosed = localStorage.getItem("sidebar_closed") === "true";
  _syncSidebarToggleState(isClosed);
}

function _createSidebarItem(item) {
  const tag = item.href ? "a" : "button";
  const el = document.createElement(tag);

  el.id = item.id;
  el.title = item.title || item.label;
  el.setAttribute("aria-label", item.title || item.label);

  let classes = "left-sidebar-item";
  if (item.primary) classes += " left-sidebar-item-primary";
  if (item.danger) classes += " left-sidebar-item-danger";
  if (item.hidden) classes += " hidden";
  el.className = classes;

  if (item.href) {
    el.href = item.href;
  }

  if (item.action) {
    el.addEventListener("click", () => {
      const fn = window[item.action];
      if (typeof fn === "function") fn();
    });
  }

  // Ícone
  const icon = document.createElement("i");
  icon.className = `${item.icon} left-sidebar-item-icon`;
  icon.setAttribute("aria-hidden", "true");
  el.appendChild(icon);

  // Label
  const label = document.createElement("span");
  label.className = "left-sidebar-item-label";
  if (item.i18n) label.setAttribute("data-i18n", item.i18n);
  label.textContent = item.label;
  el.appendChild(label);

  // Badge opcional
  if (item.badge) {
    const badge = document.createElement("span");
    badge.id = item.badge;
    badge.className = "left-sidebar-badge";
    badge.textContent = "0";
    el.appendChild(badge);
  }

  return el;
}

// ─── TOGGLE SIDEBAR ───────────────────────────────────────────────────────────

/**
 * Sincroniza o estado visual de ambos os botões de toggle da sidebar.
 * Chave unificada no localStorage: 'sidebar_closed'
 */
function _syncSidebarToggleState(isClosed) {
  const headerBtn = document.getElementById("cloud-sidebar-toggle");
  const collapseBtn = document.getElementById("sidebar-collapse-btn");

  if (headerBtn) {
    headerBtn.setAttribute("aria-expanded", String(!isClosed));
    headerBtn.title = isClosed
      ? "Mostrar menu lateral"
      : "Esconder menu lateral";
    const cloudIcon = document.getElementById("cloud-logo-icon");
    if (cloudIcon) cloudIcon.style.opacity = isClosed ? "0.6" : "1";
  }

  if (collapseBtn) {
    collapseBtn.setAttribute("aria-expanded", String(!isClosed));
    collapseBtn.title = isClosed
      ? "Expandir menu lateral"
      : "Recolher menu lateral";
    const collapseIcon = collapseBtn.querySelector(".sidebar-collapse-icon");
    if (collapseIcon) {
      collapseIcon.style.transform = isClosed
        ? "rotate(180deg)"
        : "rotate(0deg)";
    }
    const collapseLabel = collapseBtn.querySelector(".sidebar-collapse-label");
    if (collapseLabel) {
      collapseLabel.textContent = isClosed ? "Expandir" : "Recolher";
    }
  }
}

export function initLeftSidebarToggleShell() {
  // Restaura estado salvo antes de vincular eventos
  const saved = localStorage.getItem("sidebar_closed");
  if (saved === "true") {
    document.body.classList.add("sidebar-closed");
    _syncSidebarToggleState(true);
  }

  // Botão no header (cloud-sidebar-toggle)
  const headerBtn = document.getElementById("cloud-sidebar-toggle");
  if (headerBtn) {
    headerBtn.addEventListener("click", () => {
      const isClosed = document.body.classList.toggle("sidebar-closed");
      localStorage.setItem("sidebar_closed", String(isClosed));
      _syncSidebarToggleState(isClosed);
    });
  }

  // Botão no rodapé da sidebar (sidebar-collapse-btn)
  const collapseBtn = document.getElementById("sidebar-collapse-btn");
  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      const isClosed = document.body.classList.toggle("sidebar-closed");
      localStorage.setItem("sidebar_closed", String(isClosed));
      _syncSidebarToggleState(isClosed);
    });
  }
}

// ─── INICIALIZAÇÃO PRINCIPAL DO SHELL ─────────────────────────────────────────

/**
 * Inicializa o App Shell completo.
 * Chamado pelo app.js após a autenticação bem-sucedida.
 * Também pode ser chamado por páginas externas que carregam shell.js diretamente.
 *
 * @param {{ id, email, nickname, role, full_name } | null} user
 */
export async function initShell(user) {
  initThemeShell();
  syncLanguageButtonShell();
  initPWAInstallShell();
  initLeftSidebarToggleShell();

  // Se o user não foi passado, tenta restaurar da sessão
  const resolvedUser = user || (await _tryRestoreSession());

  renderUserMenu(resolvedUser);
  buildSidebar(resolvedUser);
}

async function _tryRestoreSession() {
  try {
    return await AuthService.restoreSession();
  } catch {
    return null;
  }
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

window.initShell = initShell;
window.buildSidebar = buildSidebar;
window.renderUserMenu = renderUserMenu;
window.toggleDarkModeShell = toggleDarkModeShell;
window.syncLanguageButtonShell = syncLanguageButtonShell;
