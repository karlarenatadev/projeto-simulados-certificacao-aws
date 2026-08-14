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

import { PermissionService } from "./services/permissions.js";
import { logger } from "./utils/logger.js";
import { userManager } from "./userManager.js";
import { AuthService } from "./services/authService.js";
import { initializeUI } from "./i18n/initUI.js";

// 🔹 CONSTANTES 🔹──────────────────────────────────────────────────────────────

const THEME_KEY = "aws_sim_theme";
// ─── DETECÇÃO DE CONTEXTO ─────────────────────────────────────────────────────

/**
 * Retorna true quando a página atual é o SPA principal (index.html).
 *
 * Usado pelo app.js para guardar lógica exclusiva do Hub (showLearningHub,
 * showLoginUI) contra execução inadvertida em páginas independentes como
 * simulados.html, jornada.html, flashcards.html e diagnostico.html.
 *
 * A mesma lógica é usada internamente por _createSidebarItem() para decidir
 * se chama window[action] ou redireciona para index.html.
 *
 * @returns {boolean}
 */
export function isSPAPage() {
  const path = window.location.pathname;
  return (
    path.endsWith("/") ||
    path.endsWith("index.html") ||
    path === "" ||
    // GitHub Pages serve o SPA na raiz do repositório
    /\/projeto-simulados-certificacao-aws\/?$/.test(path)
  );
}

/**
 * Mapa de itens da sidebar por role.
 * Cada entrada: { id, label, icon, href?, action?, roles, conditional?, activePaths? }
 *
 * - roles: quais roles veem este item ('*' = todos)
 * - conditional: função opcional que recebe o user e retorna bool
 * - activePaths: rotas para marcar o item como 'is-active'
 */
const SIDEBAR_ITEMS = [
  {
    id: "sidebar-btn-hub",
    label: "Home",
    icon: "fa-solid fa-house",
    action: "showLearningHub",
    href: "./index.html",
    activePaths: ["/index.html", "/"],
    roles: ["*"],
    primary: true,
    title: "Learning Hub — Painel Principal",
  },
  {
    id: "sidebar-btn-quiz",
    label: "Simulados",
    icon: "fa-solid fa-play",
    href: "./simulados.html",
    activePaths: [
      "/simulados.html",
      "/simulator-room.html",
      "/study-now.html",
      "/study-sprint.html"
    ],
    roles: ["*"],
    i18n: "sidebar_start",
    title: "Simulados",
  },
  {
    id: "sidebar-btn-journey",
    label: "Jornada",
    icon: "fa-solid fa-route",
    href: "./jornada.html",
    activePaths: [
      "/jornada.html",
      "/study-sprint.html"
    ],
    roles: ["*"],
    i18n: "sidebar_journey",
    title: "Minha Jornada",
  },
  {
    id: "sidebar-btn-diagnostic",
    label: "Raio-X",
    icon: "fa-solid fa-stethoscope",
    href: "./diagnostico.html",
    activePaths: ["/diagnostico.html"],
    roles: ["*"],
    i18n: "sidebar_diagnostic",
    title: "Raio-X da Nuvem",
  },
  {
    id: "sidebar-btn-flashcards",
    label: "Flashcards",
    icon: "fa-solid fa-layer-group",
    href: "./flashcards.html",
    activePaths: ["/flashcards.html"],
    roles: ["*"],
    i18n: "sidebar_flashcards",
    title: "Flashcards",
  },
  {
    id: "sidebar-btn-cases",
    label: "Prática",
    icon: "fa-solid fa-diagram-project",
    href: "./cases.html",
    activePaths: [
      "/cases.html",
      "/case-view.html"
    ],
    roles: ["*"],
    i18n: "sidebar_cases",
    title: "Aprenda na Prática",
  },
    {
      id: "sidebar-btn-labs",
      label: "Labs",
      icon: "fa-solid fa-flask",
      href: "./laboratorios.html",
      activePaths: ["/laboratorios.html"],
      roles: ["*"],
      title: "Laboratórios AWS"
    },
  {
    id: "sidebar-btn-resources",
    label: "Recursos",
    icon: "fa-solid fa-book-open-reader",
    href: "./resources.html",
    activePaths: ["/resources.html"],
    roles: ["*"],
    i18n: "sidebar_resources",
    title: "Recursos de Estudo",
  },
  {
    id: "sidebar-btn-sprint",
    label: "Sprint",
    icon: "fa-solid fa-stopwatch",
    href: "./study-sprint.html",
    activePaths: ["/study-sprint.html"],
    roles: ["*"],
    title: "Sprint de Estudos",
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
    activePaths: ["/validation/valid.html"],
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
    activePaths: ["/profile.html"],
    roles: ["*"],
    title: "Meu Perfil",
    footer: true,
  },
  {
    id: "sidebar-btn-settings",
    label: "Config",
    icon: "fa-solid fa-sliders",
    href: "./settings.html",
    activePaths: ["/settings.html"],
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

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn && !themeBtn.dataset.themeBound) {
    themeBtn.addEventListener("click", toggleDarkModeShell);
    themeBtn.dataset.themeBound = "true";
  }
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
  const lang = AuthService.getCurrentUser()?.language || "pt";
  const btn = document.getElementById("btn-language");
  
  // Applica tradução para páginas que não carregam app.js diretamente
  try {
    initializeUI(lang);
  } catch(e) {
    logger.error("Erro na tradução em shell.js:", e);
  }

  if (!btn) return;
  btn.innerHTML =
    lang === "pt"
      ? '<span class="text-[10px] md:text-xs font-bold">🇧🇷 <span class="hidden sm:inline">PT-BR</span></span>'
      : '<span class="text-[10px] md:text-xs font-bold">🇺🇸 <span class="hidden sm:inline">EN-US</span></span>';

  if (!btn.dataset.boundLangToggle) {
    btn.dataset.boundLangToggle = "true";
    btn.addEventListener("click", () => {
        if (window.toggleLanguage) {
            // Se o app.js carregou, o botão já tem um onClick bindado para `toggleLanguage` global (em app.js).
            // Apenas ignore aqui para evitar concorrência se ele gerenciar estado lá.
            // Mas o app.js usa bindClick que remove eventListeners? Na verdade o app.js só chama toggleLanguage no onClick inline ou addEventListener.
            // O app.js também chama syncLanguageButtonShell(). 
            return;
        }
        
        // Comportamento standalone para cases.html, laboratorios.html, etc.
        const user = AuthService.getCurrentUser();
        if (user) {
            user.language = user.language === "pt" ? "en" : "pt";
            AuthService.setCurrentUser(user);
            userManager.updatePreferences({ language: user.language });
            window.location.reload();
        }
    });
  }
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

  // Separa itens normais dos itens de rodapé
  const allVisible = SIDEBAR_ITEMS.filter((item) => {
    if (item.roles.includes("*")) return true;

    for (const requiredRole of item.roles) {
      const allowed = item.id === "sidebar-btn-validation"
        ? PermissionService.canAccessValidation(user)
        : PermissionService.hasAccess(user, requiredRole.toLowerCase());
      if (allowed) {
        return true;
      }
    }

    return false;
  });

  const mainItems = allVisible.filter((item) => !item.footer);
  const footerItems = allVisible.filter((item) => item.footer);

  // 1. Renderiza os itens de navegação principais
  const navEl = sidebar.querySelector(".left-sidebar-nav");
  if (navEl) {
    navEl.innerHTML = "";
    for (const item of mainItems) {
      const el = _createSidebarItem(item);
      navEl.appendChild(el);
    }
  }

  // 2. Resolve o container do footer (Cria dinamicamente se o HTML não tiver)
  let footerEl = sidebar.querySelector(".left-sidebar-footer");
  if (!footerEl) {
    footerEl = document.createElement("div");
    footerEl.className = "left-sidebar-footer";
    sidebar.appendChild(footerEl);
  }

  // 3. Limpa e preenche o footer
  footerEl.innerHTML = "";

  if (footerItems.length > 0) {
    const divider = document.createElement("div");
    divider.className = "left-sidebar-divider";
    divider.setAttribute("aria-hidden", "true");
    footerEl.appendChild(divider);

    for (const item of footerItems) {
      const el = _createSidebarItem(item);
      footerEl.appendChild(el);
    }
  }

  // Divisor antes do botão collapse
  const divider2 = document.createElement("div");
  divider2.className = "left-sidebar-divider";
  divider2.setAttribute("aria-hidden", "true");
  footerEl.appendChild(divider2);

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
  footerEl.appendChild(collapseBtn);

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
      // Usa isSPAPage() exportada para determinar se estamos no SPA principal.
      // Em páginas secundárias (simulados.html, cases.html, etc.) as funções
      // do app.js não existem no window — redireciona para o Hub em vez de
      // tentar chamá-las silenciosamente.
      const fn = window[item.action];
      if (isSPAPage() && typeof fn === "function") {
        fn();
      } else {
        // Em página secundária: volta para o Hub (index.html)
        window.location.href = "./index.html";
      }
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
  // Padrão: sidebar ABERTA. Só fecha se o usuário explicitamente escolheu fechar.
  // 'null' = primeira visita = aberta. 'true' = usuário fechou. 'false' = usuário abriu.
  const saved = localStorage.getItem("sidebar_closed");
  const isClosed = saved === "true";

  if (isClosed) {
    document.body.classList.add("sidebar-closed");
    _syncSidebarToggleState(true);
  } else {
    // Garante que a classe não está presente por algum estado residual
    document.body.classList.remove("sidebar-closed");
    _syncSidebarToggleState(false);
  }

  /**
   * Retorna true se a viewport atual é mobile (≤640px).
   * Usado para alternar entre o comportamento desktop (sidebar-closed)
   * e o behavior mobile (drawer via sidebar-open).
   */
  function _isMobile() {
    return window.matchMedia("(max-width: 640px)").matches;
  }

  /**
   * Abre o drawer mobile: adiciona sidebar-open ao body.
   * No mobile, o estado NÃO é persistido — o drawer fecha ao navegar.
   */
  function _openMobileDrawer() {
    document.body.classList.add("sidebar-open");
    const headerBtn = document.getElementById("cloud-sidebar-toggle");
    if (headerBtn) {
      headerBtn.setAttribute("aria-expanded", "true");
      headerBtn.title = "Fechar menu lateral";
    }
  }

  /**
   * Fecha o drawer mobile: remove sidebar-open do body.
   */
  function _closeMobileDrawer() {
    document.body.classList.remove("sidebar-open");
    const headerBtn = document.getElementById("cloud-sidebar-toggle");
    if (headerBtn) {
      headerBtn.setAttribute("aria-expanded", "false");
      headerBtn.title = "Abrir menu lateral";
    }
  }

  // Botão no header (cloud-sidebar-toggle)
  const headerBtn = document.getElementById("cloud-sidebar-toggle");
  if (headerBtn) {
    headerBtn.addEventListener("click", () => {
      if (_isMobile()) {
        // Mobile: toggle do drawer
        const isOpen = document.body.classList.contains("sidebar-open");
        if (isOpen) {
          _closeMobileDrawer();
        } else {
          _openMobileDrawer();
        }
      } else {
        // Desktop: comportamento original (sidebar-closed + persistência)
        const nowClosed = document.body.classList.toggle("sidebar-closed");
        localStorage.setItem("sidebar_closed", String(nowClosed));
        _syncSidebarToggleState(nowClosed);
      }
    });
  }

  // Fechar drawer mobile ao clicar no overlay (::after do body)
  // O overlay é o body.sidebar-open::after — detectamos clique fora da sidebar
  document.addEventListener("click", (e) => {
    if (!_isMobile()) return;
    if (!document.body.classList.contains("sidebar-open")) return;
    const sidebar = document.getElementById("left-sidebar");
    const headerToggle = document.getElementById("cloud-sidebar-toggle");
    // Se clicou fora da sidebar e fora do botão toggle, fecha o drawer
    if (
      sidebar &&
      !sidebar.contains(e.target) &&
      headerToggle &&
      !headerToggle.contains(e.target)
    ) {
      _closeMobileDrawer();
    }
  });

  // Botão no rodapé da sidebar (sidebar-collapse-btn)
  // Nota: buildSidebar() cria este botão dinamicamente — bindamos aqui via delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#sidebar-collapse-btn");
    if (!btn) return;
    if (_isMobile()) {
      _closeMobileDrawer();
      return;
    }
    const nowClosed = document.body.classList.toggle("sidebar-closed");
    localStorage.setItem("sidebar_closed", String(nowClosed));
    _syncSidebarToggleState(nowClosed);
  });
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

  // Marcar item ativo baseado na URL atual usando a configuração activePaths do SIDEBAR_ITEMS
  const currentPath = window.location.pathname;
  const activeItem = SIDEBAR_ITEMS.find((item) =>
    item.activePaths?.some((path) => currentPath.endsWith(path))
  );

  if (activeItem) {
    const activeEl = document.getElementById(activeItem.id);
    if (activeEl) {
      activeEl.classList.add("is-active");
    }
  }
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
