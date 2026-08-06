/**
 * core/storage.js — Storage facade
 *
 * Ponto único de entrada para persistência local da plataforma.
 * Re-exporta o storageManager de storageManager.js.
 *
 * O storageManager centraliza todo acesso ao localStorage com:
 *   - Prefixo consistente: 'aws_sim_'
 *   - Chaves dinâmicas por certificação: 'aws_sim_active_session_{certId}'
 *   - Gestão de histórico, erros, gamificação, sprint e flashcards
 *
 * Uso:
 *   import { storageManager } from './js/core/storage.js';
 *   const history = storageManager.getHistory();
 *
 * Chaves gerenciadas (prefixo aws_sim_):
 *   history, mistakes, gamification, focus_log
 *   active_session_{certId}, sprint_state_{certId},
 *   last_{certId}, {certId}_review_deck
 *
 * @module core/storage
 */

export { storageManager, StorageManager } from '../storageManager.js';
