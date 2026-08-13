/**
 * core/domain/identity/contracts.js
 *
 * Contratos e Interfaces do Domínio de Identidade
 */

/**
 * Interface do Serviço de Autenticação
 * Responsável pelo fluxo de entrada, saída e manutenção da sessão.
 */
export class IAuthService {
  /**
   * Autentica o usuário na plataforma.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Session>}
   */
  async login(_email, _password) {
    throw new Error("Not implemented");
  }

  /**
   * Finaliza a sessão do usuário.
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error("Not implemented");
  }

  /**
   * Retorna o usuário logado atualmente.
   * @returns {User|null}
   */
  getCurrentUser() {
    throw new Error("Not implemented");
  }

  /**
   * Retorna as matrículas ativas do usuário atual.
   * @returns {Promise<Enrollment[]>}
   */
  async getEnrollments() {
    throw new Error("Not implemented");
  }
}

/**
 * Interface do Serviço de Autorização
 * Responsável por validar os limites de acesso combinando Role e Scope.
 */
export class IAuthorizationService {
  /**
   * Verifica se o usuário atual possui uma permissão, considerando o escopo.
   * Exemplo: hasPermission('edit_explanation', 'CLF-C02')
   * @param {string} permissionId
   * @param {string} [scopeId] - Opcional. O ID do escopo (ex: Certification ID)
   * @returns {boolean}
   */
  hasPermission(_permissionId, _scopeId) {
    throw new Error("Not implemented");
  }

  /**
   * Verifica se o usuário possui um escopo de atuação (útil para Specialists).
   * @param {string} scopeId
   * @returns {boolean}
   */
  hasScope(_scopeId) {
    throw new Error("Not implemented");
  }

  /**
   * Obtém a lista completa de permissões efetivas do usuário para um escopo.
   * @param {string} [scopeId]
   * @returns {Permission[]}
   */
  getEffectivePermissions(_scopeId) {
    throw new Error("Not implemented");
  }
}
