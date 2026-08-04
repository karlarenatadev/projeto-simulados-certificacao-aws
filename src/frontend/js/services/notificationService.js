/**
 * notificationService.js
 * Serviço central de notificações (Toasts/Alertas não intrusivos).
 * Desacoplado da UI: apenas emite eventos que uma camada de renderização escutará.
 * Preparação para o React (onde esse serviço será consumido via Hooks ou Context).
 */

export const NotificationService = {
  /**
   * Dispara uma notificação de sucesso
   * @param {string} message
   */
  success(message) {
    this._emit("success", message);
  },

  /**
   * Dispara uma notificação de erro
   * @param {string} message
   */
  error(message) {
    this._emit("error", message);
  },

  /**
   * Dispara uma notificação informativa
   * @param {string} message
   */
  info(message) {
    this._emit("info", message);
  },

  /**
   * Emissor de evento nativo
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  _emit(type, message) {
    const event = new CustomEvent("app:notification", {
      detail: { type, message, timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  },
};
