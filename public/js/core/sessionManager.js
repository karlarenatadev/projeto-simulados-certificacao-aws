import { UserMapper } from "./contracts/userMapper.js";

/**
 * SessionManager
 * 
 * Responsável por persistir e recuperar o estado da Sessão.
 * Implementa cache local e migração de dados legados via soft-delete.
 */

const SESSION_KEY = "cloudacademy_session";
const SESSION_SCHEMA_VERSION = 1;

export class SessionManager {
  /**
   * Tenta restaurar a Sessão. Se não encontrar a nova chave,
   * aciona a migração de chaves antigas.
   * 
   * @returns {Object|null} Objeto Session ou null
   */
  static restore() {
    let sessionRaw = localStorage.getItem(SESSION_KEY);
    
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        if (this.isExpired(session)) {
          this.logout();
          return null;
        }
        this.touch(); // Atualiza a atividade
        return session;
      } catch (err) {
        console.warn("Falha ao parsear cloudacademy_session:", err);
        return null;
      }
    }

    // Se não encontrou a sessão oficial, tenta migrar o legado
    return this.migrate();
  }

  /**
   * Persiste uma sessão válida.
   * 
   * @param {Object} session - Objeto no formato Session
   */
  static persist(session) {
    if (!session || !session.user) return;
    
    // Assegura campos de sessão
    const safeSession = {
      ...session,
      version: SESSION_SCHEMA_VERSION,
      lastActivity: new Date().toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(safeSession));
  }

  /**
   * Atualiza as informações do usuário atual na sessão salva.
   * @param {Object} userUpdates - Propriedades para dar merge em session.user
   */
  static update(userUpdates) {
    const session = this.restore();
    if (!session) return;
    
    session.user = { ...session.user, ...userUpdates };
    this.persist(session);
  }

  /**
   * Atualiza o timestamp de última atividade.
   */
  static touch() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    
    try {
      const session = JSON.parse(raw);
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      // Ignora erros no touch
    }
  }

  /**
   * Limpa a sessão oficial atual.
   * (Não limpa as chaves legadas se elas estiverem em fase de soft-delete, 
   * mas o restore() garantirá que sem a cloudacademy_user principal ele não migrará fantasma)
   */
  static logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("cloudacademy_user"); // Destrói o legado que servia de âncora
  }

  /**
   * Verifica se a sessão expirou por inatividade ou timeout absoluto.
   * @param {Object} session 
   * @returns {boolean}
   */
  static isExpired(session) {
    // Para a Sprint 0.1, assumimos que sessões offline locais não expiram de forma dura,
    // apenas quando deslogadas. Expiração dura poderá ser atrelada ao token depois.
    return false;
  }

  /**
   * Migração das chaves legadas (Sprint 0.1)
   * 
   * @returns {Object|null} Sessão migrada ou null se não havia usuário
   */
  static migrate() {
    const legacyUserRaw = localStorage.getItem("cloudacademy_user");
    if (!legacyUserRaw) return null;

    try {
      const legacyUser = JSON.parse(legacyUserRaw);
      
      // Resgata configurações perdidas no localStorage
      const legacyLang = localStorage.getItem("language") || localStorage.getItem("aws_sim_lang") || "pt";
      const legacyCert = localStorage.getItem("activeCertification") || localStorage.getItem("aws_sim_cert") || "clf-c02";

      // Adiciona ao payload para o Mapper
      legacyUser.language = legacyLang;
      legacyUser.certification = legacyCert;

      const mappedUser = UserMapper.fromDTO(legacyUser);

      const session = {
        user: mappedUser,
        authenticationMode: mappedUser.provider === "backend" ? "online" : "offline",
        provider: mappedUser.provider || "local", // Fallback
        version: SESSION_SCHEMA_VERSION,
        migrationVersion: 1 // Flag de soft-delete para auditoria futura
      };

      this.persist(session);

      // Limpeza das chaves de preferências migradas (Expurgo FASE 2)
      localStorage.removeItem("language");
      localStorage.removeItem("aws_sim_lang");
      localStorage.removeItem("activeCertification");
      localStorage.removeItem("aws_sim_cert");

      // Soft-Delete: Manteremos as chaves antigas de usuário por enquanto (fallback de auditoria).
      console.info("Migração para cloudacademy_session concluída. Chaves de UI legadas expurgadas.");

      return session;
    } catch (err) {
      console.warn("Erro durante a migração da sessão legada:", err);
      return null;
    }
  }
}
