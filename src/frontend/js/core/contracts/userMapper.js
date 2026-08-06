import { PermissionService } from "../../services/permissions.js";

/**
 * UserMapper
 * 
 * Responsável por receber dados impuros (do Backend ou legado) e
 * convertê-los estritamente para o contrato `User` oficial da CloudAcademy.
 * Nenhuma entidade externa deve ler `full_name`, `nickname` ou `created_at`
 * diretamente do objeto resultante.
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {"student"|"validator"|"admin"} role
 * @property {string} language
 * @property {string} certification
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

export class UserMapper {
  /**
   * Converte o DTO do Backend ou objeto local para o Contrato User.
   * 
   * @param {Object} rawData - Dados brutos do usuário.
   * @returns {User} - Objeto normalizado.
   */
  static fromDTO(rawData) {
    if (!rawData) return null;

    // Resolve o Nome (priorizando 'name' já definido, seguido por 'full_name', 'nickname', ou email)
    let finalName = rawData.name || rawData.full_name || rawData.nickname || "";
    if (!finalName && rawData.email) {
      finalName = String(rawData.email).split("@")[0];
    }

    return {
      id: String(rawData.id || ""),
      name: finalName,
      email: String(rawData.email || "").toLowerCase(),
      role: PermissionService.normalizeRole(rawData.role),
      language: rawData.language || "pt",
      certification: rawData.certification || "clf-c02",
      createdAt: rawData.createdAt || rawData.created_at || null,
      updatedAt: rawData.updatedAt || rawData.last_login || null
    };
  }
}
