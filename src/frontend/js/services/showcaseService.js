/**
 * showcaseService.js
 * Serviço responsável por injetar dados "mockados" ricos para demonstrações.
 * Ele consome as funções do storageManager ou dataRepository, mas gera os dados.
 */

import { storageManager } from "../storageManager.js";
import { AuthService } from "./authService.js";
import { logger, recordMetric } from "../utils/logger.js";
import { SPRINT_MAPS } from "../gamificacao/sprintManager.js";
import { certificationPaths } from "../data.js";

export const ShowcaseService = {
  /**
   * Inicia o modo showcase de acordo com a persona e certificação alvo.
   * @param {'new' | 'intermediate' | 'advanced'} persona 
   * @param {string} certId 
   */
  async initDemo(persona = 'advanced', certId = 'clf-c02') {
    logger.info(`[ShowcaseService] Initializing demo data for persona: ${persona}, cert: ${certId}`);
    
    // 1. Limpar ambiente
    storageManager.clearAll();

    // 2. Mock do Usuário (Fundação Auth)
    AuthService.setMockUser({
      id: `demo_${persona}_001`,
      name: persona === 'new' ? 'Novo Aluno' : persona === 'advanced' ? 'AWS Master' : 'Estudante AWS',
      email: `demo_${persona}@a3data.com`,
      role: 'student',
      permissions: ['start_quiz', 'view_dashboard'],
      createdAt: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 dias atrás
      isShowcase: true
    });

    // 3. Injetar histórico baseado na persona
    const history = [];
    let completedQuizzes = 0;
    
    if (persona === 'intermediate' || persona === 'advanced') {
      const count = persona === 'advanced' ? 15 : 4;
      completedQuizzes = count;
      let baseScore = 40;
      
      for (let i = 0; i < count; i++) {
        const timeAgo = (count - i) * 24 * 60 * 60 * 1000;
        baseScore += Math.random() * 8;
        if (baseScore > 98) baseScore = 98;
        
        history.push({
          certId,
          score: Math.round(baseScore),
          totalQuestions: 65,
          correctCount: Math.round((baseScore / 100) * 65),
          completedAt: Date.now() - timeAgo,
          mode: 'exam',
          passed: baseScore >= 70,
          domainScores: this._generateMockDomainScores(certId, baseScore)
        });
      }
      
      history.forEach(h => storageManager.saveQuizResult(h));
    }

    // 4. Injetar Gamificação
    if (persona === 'advanced') {
      storageManager.saveGamification({
        level: 5,
        xp: 4500,
        badges: ['first_quiz', 'streak_7', 'score_90', 'domain_master']
      });
    } else if (persona === 'intermediate') {
      storageManager.saveGamification({
        level: 2,
        xp: 1200,
        badges: ['first_quiz']
      });
    }

    // 5. Injetar Sprint
    const sprintMap = SPRINT_MAPS[certId] || {};
    const totalDays = Object.keys(sprintMap).length || 14;
    
    let completedDays = [];
    if (persona === 'intermediate') completedDays = ['1', '2', '3'];
    if (persona === 'advanced') {
      for(let i = 1; i <= 10; i++) completedDays.push(i.toString());
    }
    
    storageManager.saveSprintState(certId, {
      userId: AuthService.getCurrentUser().id,
      activePathId: certId,
      completedStages: completedDays,
      unlockedStages: [(completedDays.length + 1).toString()],
      currentGoalId: 'goal_1',
      streakDays: completedDays.length,
      lastCompletedDate: persona === 'advanced' ? new Date().toDateString() : null
    });

    recordMetric('showcase_loaded', 1, { persona });
    logger.info('[ShowcaseService] Injection complete.');
  },

  _generateMockDomainScores(certId, overallScore) {
    const cert = certificationPaths[certId];
    if (!cert || !cert.domains) return {};
    
    const result = {};
    cert.domains.forEach(d => {
      // Cria uma variância: se overallScore é 80, alguns domínios têm 90, outros 60
      const variance = (Math.random() - 0.3) * 30; 
      let dScore = overallScore + variance;
      if (dScore > 100) dScore = 100;
      if (dScore < 0) dScore = 0;
      
      const total = 10;
      const correct = Math.round((dScore / 100) * total);
      result[d.id] = { total, correct };
    });
    return result;
  }
};
