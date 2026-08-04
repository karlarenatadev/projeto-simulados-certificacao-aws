/**
 * modalService.js
 * Serviço central para interações modais (Confirm, Prompt, Loading).
 * Desacoplado da UI: emite eventos para a camada de renderização, aguardando
 * a resolução via um Callback injetado no evento.
 */

export const ModalService = {
  /**
   * Pede uma confirmação (Sim/Não) ao usuário
   * @param {Object} options 
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText="Confirmar"]
   * @param {string} [options.cancelText="Cancelar"]
   * @returns {Promise<boolean>}
   */
  confirm(options) {
    return new Promise((resolve) => {
      const event = new CustomEvent('app:modal', {
        detail: {
          type: 'confirm',
          payload: options,
          onResult: (result) => resolve(result === true)
        }
      });
      window.dispatchEvent(event);
    });
  },

  /**
   * Pede uma entrada de texto ao usuário
   * @param {Object} options 
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.defaultValue=""]
   * @returns {Promise<string|null>}
   */
  prompt(options) {
    return new Promise((resolve) => {
      const event = new CustomEvent('app:modal', {
        detail: {
          type: 'prompt',
          payload: options,
          onResult: (result) => resolve(result) // result é string ou null se cancelar
        }
      });
      window.dispatchEvent(event);
    });
  },

  /**
   * Exibe um modal de carregamento que bloqueia a tela
   * @param {string} message 
   * @returns {Function} Função para fechar o loading
   */
  showLoading(message = "Carregando...") {
    const id = Date.now().toString();
    const event = new CustomEvent('app:modal', {
      detail: {
        type: 'loading',
        payload: { id, message }
      }
    });
    window.dispatchEvent(event);

    return () => {
      window.dispatchEvent(new CustomEvent('app:modal:close', { detail: { id } }));
    };
  }
};
