/**
 * StorageManager - Gerencia toda a persistência de dados do simulador
 * Encapsula lógica de localStorage para facilitar manutenção e testes
 * 
 * @module storageManager
 * @author AWS Exam Simulator Team
 */

/**
 * Classe responsável por gerenciar todas as operações de persistência
 * usando localStorage como backend de armazenamento.
 */
export class StorageManager {
  /**
   * Cria uma nova instância do StorageManager
   * @param {string} storageKeyPrefix - Prefixo para todas as chaves do localStorage (default: 'aws_sim_')
   */
  constructor(storageKeyPrefix = 'aws_sim_') {
    this.prefix = storageKeyPrefix;
  }

  /**
   * Gera chave completa com prefixo
   * @private
   * @param {string} suffix - Sufixo da chave
   * @returns {string} Chave completa com prefixo
   */
  _getKey(suffix) {
    return `${this.prefix}${suffix}`;
  }

  /**
   * Salva resultado do quiz (último resultado + histórico)
   * @param {Object} result - Objeto com certId, score, total, percentage, passed, domainScores, weakDomains, answers
   * @param {string} result.certId - ID da certificação (ex: 'aif-c01')
   * @param {number} result.score - Pontuação obtida
   * @param {number} result.total - Total de questões
   * @param {number} result.percentage - Percentual de acerto
   * @param {boolean} result.passed - Se passou no exame
   * @param {Object} result.domainScores - Pontuação por domínio
   * @param {string[]} result.weakDomains - Array de domínios fracos
   * @param {Array} result.answers - Array com todas as respostas
   * @returns {boolean} True se salvou com sucesso, False caso contrário
   * 
   * @example
   * storageManager.saveQuizResult({
   *   certId: 'clf-c02',
   *   score: 45,
   *   total: 65,
   *   percentage: 69.23,
   *   passed: false,
   *   domainScores: { 'conceitos-cloud': { total: 15, correct: 10 } },
   *   weakDomains: ['conceitos-cloud'],
   *   answers: [...]
   * });
   */
  saveQuizResult(result) {
    try {
      // Adiciona timestamp se não existir
      const resultWithDate = {
        ...result,
        date: result.date || new Date().toISOString()
      };

      // Salva como último resultado da certificação
      const lastKey = this._getKey(`last_${result.certId}`);
      localStorage.setItem(lastKey, JSON.stringify(resultWithDate));

      // Adiciona ao histórico
      const history = this.getHistory();
      history.unshift(resultWithDate);

      // Limita histórico a 50 entradas
      if (history.length > 50) {
        history.length = 50;
      }

      this.saveHistory(history);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar resultado do quiz:', error);
      return false;
    }
  }

  /**
   * Carrega último score de uma certificação
   * @param {string} certId - ID da certificação (ex: 'aif-c01')
   * @returns {Object|null} Objeto com score, percentage e passed, ou null se não existir
   * 
   * @example
   * const lastScore = storageManager.loadLastScore('clf-c02');
   * // Retorna: { score: 45, percentage: 69.23, passed: false }
   */
  loadLastScore(certId) {
    try {
      const lastKey = this._getKey(`last_${certId}`);
      const data = localStorage.getItem(lastKey);
      
      if (!data) return null;
      
      const result = JSON.parse(data);
      return {
        score: result.score,
        percentage: result.percentage,
        passed: result.passed
      };
    } catch (error) {
      console.error('Erro ao carregar último score:', error);
      return null;
    }
  }

  /**
   * Carrega último resultado completo de uma certificação
   * @param {string} certId - ID da certificação
   * @returns {Object|null} Resultado completo ou null
   * 
   * @example
   * const lastResult = storageManager.loadLastResult('clf-c02');
   * // Retorna objeto completo com todos os campos
   */
  loadLastResult(certId) {
    try {
      const lastKey = this._getKey(`last_${certId}`);
      const data = localStorage.getItem(lastKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar último resultado:', error);
      return null;
    }
  }

  /**
   * Carrega histórico completo de todos os quizzes
   * @returns {Array} Array de resultados históricos (ordenado do mais recente para o mais antigo)
   * 
   * @example
   * const history = storageManager.getHistory();
   * // Retorna: [{certId: 'clf-c02', score: 45, ...}, ...]
   */
  getHistory() {
    try {
      const historyKey = this._getKey('history');
      const data = localStorage.getItem(historyKey);
      
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      
      // VALIDAÇÃO CRÍTICA: Garante que sempre retorna um Array válido
      if (!Array.isArray(parsed)) {
        console.warn('Histórico corrompido detectado (não é array). Limpando cache...');
        this.clearHistory();
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Erro ao carregar histórico (JSON inválido). Limpando cache...', error);
      // Se o JSON está corrompido, limpa silenciosamente
      this.clearHistory();
      return [];
    }
  }

  /**
   * Salva histórico completo
   * @param {Array} history - Array de resultados
   * @returns {boolean} True se salvou com sucesso, False caso contrário
   */
  saveHistory(history) {
    try {
      const historyKey = this._getKey('history');
      localStorage.setItem(historyKey, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
      return false;
    }
  }

  /**
   * Limpa todo o histórico
   * @returns {boolean} True se limpou com sucesso, False caso contrário
   */
  clearHistory() {
    try {
      const historyKey = this._getKey('history');
      localStorage.removeItem(historyKey);
      return true;
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      return false;
    }
  }

  /**
   * Carrega dados de gamificação (badges, streaks, etc.)
   * @returns {Object} Objeto com totalQuizzes, bestScore, currentStreak, badges
   * 
   * @example
   * const gamification = storageManager.getGamification();
   * // Retorna: { totalQuizzes: 10, bestScore: 85, currentStreak: 3, badges: ['perfect'] }
   */
  getGamification() {
    try {
      const gamificationKey = this._getKey('gamification');
      const data = localStorage.getItem(gamificationKey);
      
      if (!data) {
        return {
          totalQuizzes: 0,
          bestScore: 0,
          currentStreak: 0,
          lastDate: '',
          badges: []
        };
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar gamificação:', error);
      return {
        totalQuizzes: 0,
        bestScore: 0,
        currentStreak: 0,
        lastDate: '',
        badges: []
      };
    }
  }

  /**
   * Atualiza dados de gamificação com base no resultado do quiz
   * @param {number} percentage - Percentual de acerto do quiz
   * @returns {Object|null} Objeto de gamificação atualizado ou null em caso de erro
   * 
   * @example
   * const gamification = storageManager.updateGamification(85);
   * // Retorna objeto atualizado com novos badges e estatísticas
   */
  updateGamification(percentage) {
    try {
      const gamification = this.getGamification();
      const today = new Date().toISOString().split('T')[0];
      
      gamification.totalQuizzes += 1;
      
      if (percentage > gamification.bestScore) {
        gamification.bestScore = percentage;
      }
      
      // Atualiza streak
      if (percentage >= 70) {
        if (gamification.lastDate !== today) {
          gamification.currentStreak += 1;
          gamification.lastDate = today;
        }
      } else {
        gamification.currentStreak = 0;
      }
      
      // Adiciona badges baseado em conquistas
      if (percentage === 100 && !gamification.badges.includes('perfect')) {
        gamification.badges.push('perfect');
      }
      
      if (gamification.totalQuizzes >= 10 && !gamification.badges.includes('dedicated')) {
        gamification.badges.push('dedicated');
      }
      
      if (gamification.currentStreak >= 5 && !gamification.badges.includes('streak')) {
        gamification.badges.push('streak');
      }
      
      const gamificationKey = this._getKey('gamification');
      localStorage.setItem(gamificationKey, JSON.stringify(gamification));
      
      return gamification;
    } catch (error) {
      console.error('Erro ao atualizar gamificação:', error);
      return null;
    }
  }

  /**
   * Salva uma sessão de foco concluída no log de séries temporais
   * @param {number} minutes - Quantidade de minutos focados
   * @param {string} type - Tipo da sessão ('work', 'shortBreak', 'longBreak')
   */
  saveFocusSession(minutes, type = 'work') {
    try {
      const key = this._getKey('focus_log'); // Gera a chave 'aws_sim_focus_log'
      const history = this.getFocusHistory();
      
      const newEntry = {
        date: new Date().toISOString().split('T')[0], // Formato 'YYYY-MM-DD'
        timestamp: new Date().toISOString(),
        minutes: minutes,
        type: type
      };

      history.push(newEntry);
      localStorage.setItem(key, JSON.stringify(history));
      return true;
    } catch (error) {
      console.error('Erro ao salvar sessão de foco:', error);
      return false;
    }
  }

  /**
   * Recupera todo o histórico de logs de foco
   * @returns {Array} Lista de sessões de foco
   */
  getFocusHistory() {
    try {
      const key = this._getKey('focus_log');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar histórico de foco:', error);
      return [];
    }
  }

  /**
   * Calcula o total de minutos focados (Útil para o seu perfil analítico)
   * @returns {number} Total de minutos
   */
  getTotalFocusMinutes() {
    const history = this.getFocusHistory();
    return history
      .filter(session => session.type === 'work')
      .reduce((total, session) => total + session.minutes, 0);
  }

  /**
   * Limpa apenas o histórico de foco
   */
  clearFocusHistory() {
    try {
      localStorage.removeItem(this._getKey('focus_log'));
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Limpa todos os dados do simulador
   * @returns {boolean} True se limpou com sucesso, False caso contrário
   * 
   * @example
   * storageManager.clearAll();
   * // Remove todos os dados com prefixo 'aws_sim_'
   */
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Erro ao limpar todos os dados:', error);
      return false;
    }
  }

  /**
   * Exporta todos os dados para backup
   * @returns {Object} Objeto com todos os dados
   * 
   * @example
   * const backup = storageManager.exportData();
   * const json = JSON.stringify(backup);
   * // Salvar json em arquivo para backup
   */
  exportData() {
    try {
      const data = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          data[key] = localStorage.getItem(key);
        }
      });
      
      return data;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      return {};
    }
  }

  /**
   * Importa dados de backup
   * @param {Object} data - Objeto com dados para importar
   * @returns {boolean} True se importou com sucesso, False caso contrário
   * 
   * @example
   * const backup = { 'aws_sim_history': '[...]', ... };
   * storageManager.importData(backup);
   */
  importData(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith(this.prefix)) {
          localStorage.setItem(key, value);
        }
      });
      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }
}

// Exporta instância singleton para uso no app
export const storageManager = new StorageManager('aws_sim_');
