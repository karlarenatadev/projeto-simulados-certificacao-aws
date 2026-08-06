/**
 * core/theme.js — Theme facade
 *
 * Ponto único de entrada para controle de tema (claro/escuro) e idioma.
 * Re-exporta as funções de tema do shell.js.
 *
 * Responsabilidades:
 *   - Inicializar o tema na carga da página
 *   - Alternar entre claro e escuro
 *   - Sincronizar o botão de idioma
 *
 * Uso:
 *   import { initThemeShell, toggleDarkModeShell, syncLanguageButtonShell }
 *     from './js/core/theme.js';
 *
 * Estado persistido:
 *   localStorage: aws_sim_theme ('light' | 'dark')
 *   localStorage: aws_sim_lang  ('pt' | 'en')
 *
 * @module core/theme
 */

export {
  initThemeShell,
  toggleDarkModeShell,
  syncLanguageButtonShell,
} from '../shell.js';
