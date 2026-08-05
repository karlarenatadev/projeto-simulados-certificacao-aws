/**
 * Cases Routes — Practice Domain
 *
 * GET  /api/cases            - List cases (filter: certification, difficulty, limit, offset)
 * GET  /api/cases/:idOrSlug  - Get single case with services + questions
 * GET  /api/services         - List AWS service catalog (filter: category)
 * POST /api/cases/:id/complete - Mark case as completed for authenticated user
 */

import { Router } from 'express';
import {
  getCases,
  getCaseById,
  getAwsServices,
  markCaseCompleted,
  executeQuery
} from '../../database/db.js';
import { SimulatorEngine } from '../services/simulatorEngine.js';
import { requireAuth } from '../middleware/requireRole.js';

const router = Router();

const VALID_DIFFICULTIES = new Set([
  'beginner', 'intermediate', 'advanced',
  'level_1_clf', 'level_2_saa', 'level_3_dva', 'level_4_sys',
  'level_5_sec', 'level_6_data', 'level_7_ai', 'level_8_adv',
  'investigative'
]);
const VALID_CERTIFICATIONS = new Set([
  'CLF-C02', 'SAA-C03', 'SAP-C02', 'DVA-C02',
  'SOA-C02', 'DOP-C02', 'ANS-C01', 'DAS-C01',
  'MLS-C01', 'SCS-C02', 'PAS-C01', 'AIF-C01',
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ============================================================================
// GET /api/cases — List cases
// ============================================================================

router.get('/', async (req, res, next) => {
  try {
    const { certification, difficulty, limit = 20, offset = 0 } = req.query;

    if (certification && !VALID_CERTIFICATIONS.has(certification.toUpperCase())) {
      throw createHttpError(400, `Invalid certification: ${certification}`);
    }

    if (difficulty && !VALID_DIFFICULTIES.has(difficulty)) {
      throw createHttpError(400, `difficulty must be one of: ${[...VALID_DIFFICULTIES].join(', ')}`);
    }

    const cases = await getCases({
      certification: certification ? certification.toUpperCase() : undefined,
      difficulty,
      limit: Number.parseInt(limit, 10) || 20,
      offset: Number.parseInt(offset, 10) || 0,
    });

    res.status(200).json({
      success: true,
      data: cases,
      count: cases.length,
      pagination: {
        limit: Number.parseInt(limit, 10) || 20,
        offset: Number.parseInt(offset, 10) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/cases/:idOrSlug — Get single case
// ============================================================================

router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    if (!idOrSlug) {
      throw createHttpError(400, 'Case ID or slug is required');
    }

    const caseData = await getCaseById(idOrSlug);

    if (!caseData) {
      throw createHttpError(404, `Case not found: ${idOrSlug}`);
    }

    res.status(200).json({
      success: true,
      data: caseData,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/cases/:id/complete — Mark case as completed
// ============================================================================

router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!id) {
      throw createHttpError(400, 'Case ID is required');
    }

    if (!user_id) {
      throw createHttpError(400, 'user_id is required in request body');
    }

    const caseData = await getCaseById(id);
    if (!caseData) {
      throw createHttpError(404, `Case not found: ${id}`);
    }

    const progress = await markCaseCompleted(user_id, caseData.id);

    res.status(200).json({
      success: true,
      message: 'Case marked as completed',
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/cases/:id/dialogues — Get case interview dialogues
// ============================================================================

router.get('/:id/dialogues', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw createHttpError(400, 'Case ID is required');

    const rows = await executeQuery('SELECT * FROM case_dialogues WHERE case_id = $1 ORDER BY sort_order ASC', [id]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/cases/:id/events — Get case unexpected events
// ============================================================================

router.get('/:id/events', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw createHttpError(400, 'Case ID is required');

    const rows = await executeQuery('SELECT * FROM case_events WHERE case_id = $1 ORDER BY sort_order ASC', [id]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/cases/:id/evaluate — Evaluate architecture
// ============================================================================

router.post('/:id/evaluate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selected_service_ids } = req.body;

    if (!id) throw createHttpError(400, 'Case ID is required');
    if (!Array.isArray(selected_service_ids)) {
      throw createHttpError(400, 'selected_service_ids must be an array of UUIDs');
    }

    const evaluation = await SimulatorEngine.evaluateArchitecture(id, selected_service_ids);

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/services — List AWS service catalog
// ============================================================================

export const servicesRouter = Router();

servicesRouter.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const services = await getAwsServices({ category });

    res.status(200).json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
