/**
 * core/auth.js — Auth facade
 *
 * Ponto único de entrada para autenticação na plataforma.
 * Re-exporta o AuthService de services/authService.js.
 *
 * Uso nas páginas independentes:
 *   import { AuthService } from './js/core/auth.js';
 *   const user = await AuthService.restoreSession();
 *
 * Uso no app shell (shell.js já importa diretamente do authService):
 *   import { AuthService } from './core/auth.js';
 *
 * @module core/auth
 */

export { AuthService } from "../services/authService.js";
