import { executeQuery } from '../../database/db.js';

/**
 * Simulator Engine - Responsible for scoring architectures against
 * AWS Well-Architected Framework based on case criteria.
 */
export class SimulatorEngine {
  /**
   * Evaluate a set of selected service IDs against a case's criteria
   * @param {string} caseId
   * @param {string[]} selectedServiceIds
   * @returns {Promise<Object>} Evaluation results
   */
  static async evaluateArchitecture(caseId, selectedServiceIds) {
    if (!caseId) throw new Error('caseId is required');
    if (!Array.isArray(selectedServiceIds)) throw new Error('selectedServiceIds must be an array');

    // Fetch all criteria for this case
    const criteriaRows = await executeQuery(`
      SELECT cec.*, s.name as service_name, s.slug as service_slug
      FROM case_evaluation_criteria cec
      JOIN aws_services s ON s.id = cec.service_id
      WHERE cec.case_id = $1
    `, [caseId]);

    const evaluation = {
      score: 0,
      pillars: {
        security: { score: 0, max: 0, feedback: [] },
        reliability: { score: 0, max: 0, feedback: [] },
        performance: { score: 0, max: 0, feedback: [] },
        cost: { score: 0, max: 0, feedback: [] },
        operational: { score: 0, max: 0, feedback: [] }
      },
      missingCritical: [], // services that were required but missed
      badChoices: []       // services that penalize the score
    };

    // Calculate max possible score per pillar
    for (const crit of criteriaRows) {
      if (crit.score_impact > 0 && evaluation.pillars[crit.pillar]) {
        evaluation.pillars[crit.pillar].max += crit.score_impact;
      }
    }

    // Evaluate user selections
    for (const crit of criteriaRows) {
      const isSelected = selectedServiceIds.includes(crit.service_id);
      
      if (isSelected) {
        // Apply impact (can be positive or negative)
        if (evaluation.pillars[crit.pillar]) {
          evaluation.pillars[crit.pillar].score += crit.score_impact;
          evaluation.pillars[crit.pillar].feedback.push({
            service: crit.service_name,
            impact: crit.score_impact,
            message: crit.feedback_msg
          });
        }
        
        evaluation.score += crit.score_impact;
        
        if (crit.score_impact < 0) {
          evaluation.badChoices.push(crit.service_name);
        }
      } else {
        // If they missed a positive criteria, log it as missing
        if (crit.score_impact > 0) {
          evaluation.missingCritical.push(crit.service_name);
          if (evaluation.pillars[crit.pillar]) {
            evaluation.pillars[crit.pillar].feedback.push({
              service: crit.service_name,
              impact: 0, // missed opportunity
              message: `Missed: ${crit.feedback_msg}`
            });
          }
        }
      }
    }

    // Normalize pillar scores to percentages (0-100)
    for (const key of Object.keys(evaluation.pillars)) {
      const p = evaluation.pillars[key];
      if (p.max > 0) {
        p.percentage = Math.max(0, Math.min(100, Math.round((p.score / p.max) * 100)));
      } else {
        p.percentage = 100; // If no criteria for this pillar, default to 100%
      }
    }

    // Global percentage
    const totalMax = Object.values(evaluation.pillars).reduce((acc, p) => acc + p.max, 0);
    evaluation.finalPercentage = totalMax > 0 ? Math.max(0, Math.min(100, Math.round((evaluation.score / totalMax) * 100))) : 100;

    return evaluation;
  }
}
