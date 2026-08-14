/**
 * PermissionService - CloudAcademy A3
 * 
 * Centraliza as regras de acesso da plataforma, substituindo verificações
 * espalhadas pela aplicação (ex: `user.role === "admin"`).
 * 
 * @module services/permissions
 */

export const Roles = {
  STUDENT: "student",
  VALIDATOR: "validator",
  ADMIN: "admin"
};

/**
 * Mapeamento numérico para permitir comparação de hierarquia de roles.
 * Quanto maior o número, mais privilégios.
 */
const RoleWeights = {
  [Roles.STUDENT]: 10,
  [Roles.VALIDATOR]: 50,
  [Roles.ADMIN]: 100
};

export class PermissionService {
  /**
   * Normaliza uma string de role para o contrato estrito.
   * Remove espaços, converte para minúsculas e mapeia aliases.
   * @param {string} rawRole 
   * @returns {string} - student | validator | admin
   */
  static normalizeRole(rawRole) {
    if (!rawRole) return Roles.STUDENT;
    const clean = String(rawRole).trim().toLowerCase();
    if (clean === Roles.ADMIN || clean === "role_admin") return Roles.ADMIN;
    if (clean === Roles.VALIDATOR) return Roles.VALIDATOR;
    return Roles.STUDENT; // Fallback seguro
  }

  /**
   * Compara duas roles.
   * @param {string} roleA 
   * @param {string} roleB 
   * @returns {number} Positivo se roleA > roleB, negativo se roleA < roleB, 0 se iguais.
   */
  static compareRoles(roleA, roleB) {
    const weightA = RoleWeights[this.normalizeRole(roleA)] || 0;
    const weightB = RoleWeights[this.normalizeRole(roleB)] || 0;
    return weightA - weightB;
  }

  /**
   * Retorna a role mais alta de um array.
   * @param {string[]} roles 
   * @returns {string}
   */
  static getHighestRole(roles) {
    if (!roles || roles.length === 0) return Roles.STUDENT;
    return roles.map(r => this.normalizeRole(r)).reduce((highest, current) => {
      return this.compareRoles(current, highest) > 0 ? current : highest;
    }, Roles.STUDENT);
  }

  /**
   * Valida se o usuário possui o nível de permissão requisitado.
   * A hierarquia baseia-se nos RoleWeights.
   *
   * @param {object} user - Objeto do usuário (deve conter `.role`)
   * @param {string} requiredRole - Nível mínimo exigido
   * @returns {boolean}
   */
  static hasAccess(user, requiredRole) {
    if (!user || !user.role) return false;
    const userRole = this.normalizeRole(user.role);
    const required = this.normalizeRole(requiredRole);
    return this.compareRoles(userRole, required) >= 0;
  }

  // ── Helpers Diretos de Role ──────────────────────────────────────────────

  static isStudent(user) {
    return user && this.normalizeRole(user.role) === Roles.STUDENT;
  }

  static isValidator(user) {
    return user && this.normalizeRole(user.role) === Roles.VALIDATOR;
  }

  static isAdmin(user) {
    return user && this.normalizeRole(user.role) === Roles.ADMIN;
  }

  // ── Helpers RBAC de Negócio ─────────────────────────────────────────────

  /**
   * Quem pode aprovar ou revisar conteúdo e questões.
   */
  static canManageQuestions(user) {
    return this.hasAccess(user, Roles.VALIDATOR);
  }

  /**
   * O antigo `canValidate` agora mapeia para `canManageQuestions`.
   */
  static canValidate(user) {
    return this.canManageQuestions(user);
  }

  static canAccessValidation(user) {
    return this.canManageQuestions(user);
  }

  static canValidateQuestions(user) {
    return this.canManageQuestions(user);
  }

  /**
   * Quem pode gerenciar contas, aprovar cadastros de validadores, etc.
   */
  static canManageUsers(user) {
    return this.hasAccess(user, Roles.ADMIN);
  }

  /**
   * Quem possui controle global das configurações da plataforma (Analytics global, config, etc).
   */
  static canManagePlatform(user) {
    return this.hasAccess(user, Roles.ADMIN);
  }
}
