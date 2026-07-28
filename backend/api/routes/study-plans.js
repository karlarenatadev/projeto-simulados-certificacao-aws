import { Router } from 'express';
import { 
  createStudyPlan, 
  getActiveStudyPlan, 
  markStudyPlanDayCompleted, 
  getWeakDomains, 
  executeQuery 
} from '../../database/db.js';

const router = Router();

// ============================================================================
// POST /api/study-plans/generate - Generate 14-day study plan
// ============================================================================
router.post('/generate', async (req, res, next) => {
  try {
    const { user_id, certification } = req.body;
    
    if (!user_id || !certification) {
      return res.status(400).json({ success: false, message: 'user_id and certification are required' });
    }
    
    // Buscar domínios fracos do usuário
    const weakDomainsResult = await getWeakDomains(user_id, 70) || [];
    const weakDomainSlugs = weakDomainsResult.map(d => d.domain);
    
    // Buscar todos os domínios da certificação
    const domainsData = await executeQuery('SELECT slug, name FROM domains WHERE certification = $1', [certification]);
    const allDomains = domainsData.map(d => d.slug);
    
    // Gerar os 14 dias
    const planData = [];
    for (let i = 1; i <= 14; i++) {
        let topic = "Geral";
        let action = "quiz";
        
        if (i <= 5 && weakDomainSlugs.length > 0) {
            // Foca nas fraquezas nos primeiros dias
            topic = weakDomainSlugs[(i - 1) % weakDomainSlugs.length];
        } else if (i > 5 && i <= 8) {
            // Cobre os outros domínios
            topic = allDomains[(i - 1) % allDomains.length] || "Geral";
        } else if (i === 9 || i === 10) {
            // Prática de arquitetura
            action = "case";
            topic = "Casos Práticos (Cases 2.0)";
        } else if (i >= 11 && i <= 13) {
            // Revisão final
            topic = "Revisão Geral Mista";
        } else if (i === 14) {
            action = "final_exam";
            topic = "Simulado Oficial Cronometrado";
        }
        
        planData.push({
            day: i,
            topic: topic,
            action: action,
            title: `Dia ${i}: ${topic}`
        });
    }
    
    const newPlan = await createStudyPlan(user_id, certification, planData);
    
    res.status(201).json({ success: true, data: newPlan });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/study-plans/:userId/active/:certification - Get active plan
// ============================================================================
router.get('/:userId/active/:certification', async (req, res, next) => {
  try {
    const { userId, certification } = req.params;
    const plan = await getActiveStudyPlan(userId, certification);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'No active study plan found.' });
    }
    
    res.status(200).json({ success: true, data: plan });
  } catch(error) {
    next(error);
  }
});

// ============================================================================
// POST /api/study-plans/:planId/complete-day - Complete a day
// ============================================================================
router.post('/:planId/complete-day', async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { day } = req.body;
    
    if (!day) return res.status(400).json({ success: false, message: 'day is required' });
    
    const updated = await markStudyPlanDayCompleted(planId, day);
    
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Failed to update plan. Make sure it is the current day.' });
    }
    
    res.status(200).json({ success: true, data: updated });
  } catch(error) {
    next(error);
  }
});

export default router;
