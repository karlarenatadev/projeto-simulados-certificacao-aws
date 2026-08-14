/**
 * Questions Routes
 * GET    /api/questions          - List questions with filters
 * GET    /api/questions/:id      - Get single question
 * POST   /api/questions          - Create new question
 * PUT    /api/questions/:id      - Update question
 * DELETE /api/questions/:id      - Delete question
 */

import { Router } from 'express';
import {
  getQuestions,
  getQuestionById,
  insertQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestions,
  getPendingQuestions,
  getValidationHistory,
  validateQuestion,
  canUserValidateCertification,
  getValidatorCertifications,
} from '../../database/db.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';

const router = Router();
const VALID_VALIDATION_STATUSES = new Set(['APPROVED', 'REJECTED']);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate question creation/update payload
 */
function validateQuestionPayload(data, isCreation = true) {
  const errors = [];

  if (isCreation) {
    if (!data.certification) errors.push('certification is required');
    if (!data.domain) errors.push('domain is required');
    if (!data.difficulty) errors.push('difficulty is required');
    if (!data.question_text || data.question_text.length < 10) {
      errors.push('question_text is required and must be at least 10 characters');
    }
    if (!Array.isArray(data.options) || data.options.length < 2) {
      errors.push('options must be an array with at least 2 items');
    }
    if (!Array.isArray(data.correct_answer) || data.correct_answer.length < 1) {
      errors.push('correct_answer must be a non-empty array');
    }
    if (!data.explanation) errors.push('explanation is required');
  }

  // Optional validations for updates
  if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
    errors.push('difficulty must be one of: easy, medium, hard');
  }

  if (data.certification) {
    const validCerts = ['CLF-C02', 'SAA-C03', 'SAP-C02', 'DVA-C02', 'SOA-C02', 'DOP-C02', 'ANS-C01', 'DAS-C01', 'MLS-C01', 'SCS-C02', 'PAS-C01', 'AIF-C01'];
    if (!validCerts.includes(data.certification)) {
      errors.push(`certification must be one of: ${validCerts.join(', ')}`);
    }
  }

  return errors;
}

function validateValidationPayload(payload = {}) {
  const errors = [];
  const status = payload.status;
  const rejectionReason = (
    payload.rejection_reason
    || payload.rejectionReason
    || payload.feedback
    || ''
  ).trim();
  const validator = (
    payload.validated_by
    || payload.validator_id
    || payload.validatorId
    || ''
  ).trim();

  if (!VALID_VALIDATION_STATUSES.has(status)) {
    errors.push('status must be one of: APPROVED, REJECTED');
  }

  if (status === 'REJECTED' && rejectionReason.length < 10) {
    errors.push('rejection_reason with at least 10 characters is required when rejecting');
  }

  return {
    errors,
    data: {
      status,
      rejection_reason: status === 'REJECTED' ? rejectionReason : null,
      validated_by: validator || null,
    },
  };
}

// ============================================================================
// GET /api/questions/pending - List questions waiting for validation
// ============================================================================

router.get('/pending', requireRole('VALIDATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    let questions = await getPendingQuestions({ limit, offset });
    if (req.user.role === 'VALIDATOR') {
      const certifications = await getValidatorCertifications(req.user.id);
      questions = [];
      for (const certification of certifications) {
        questions.push(...await getPendingQuestions({
          limit,
          offset,
          certification: certification.certification_id,
        }));
      }
    }

    res.status(200).json({
      success: true,
      data: questions,
      count: questions.length,
      pagination: {
        limit: Number.parseInt(limit, 10) || 50,
        offset: Number.parseInt(offset, 10) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/questions/history - Validation history scoped by role
router.get('/history', requireRole('VALIDATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const history = await getValidationHistory({
      status: req.query.status,
      validatorId: req.user.role === 'ADMIN' ? null : req.user.id,
    });
    res.status(200).json({ success: true, data: history, count: history.length });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/questions/:id/validate - Approve or reject a question
// ============================================================================

router.post('/:id/validate', requireRole('VALIDATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw createHttpError(400, 'Question ID is required');
    }

    const { errors, data } = validateValidationPayload(req.body);

    if (errors.length > 0) {
      throw createHttpError(400, errors.join('; '));
    }

    const existingQuestion = await getQuestionById(id);
    if (!existingQuestion) {
      throw createHttpError(404, `Question with ID ${id} not found`);
    }
    if (!(await canUserValidateCertification(req.user.id, existingQuestion.certification))) {
      throw createHttpError(403, 'Validator is not authorized for this certification');
    }

    const question = await validateQuestion(id, req.user.id, data.status, data.rejection_reason);
    if (!question) {
      throw createHttpError(404, `Question with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/questions - List questions with filters and pagination
// ============================================================================

router.get('/', async (req, res, next) => {
  try {
    const {
      certification,
      domain,
      difficulty,
      limit = 10,
      offset = 0,
      search,
    } = req.query;

    // If search term provided, use search function
    if (search) {
      const results = await searchQuestions(search, parseInt(limit) || 20);
      return res.status(200).json({
        success: true,
        data: results,
        count: results.length,
      });
    }

    // Otherwise, use filtered query
    const questions = await getQuestions({
      certification,
      domain,
      difficulty,
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
    });

    res.status(200).json({
      success: true,
      data: questions,
      count: questions.length,
      pagination: {
        limit: parseInt(limit) || 10,
        offset: parseInt(offset) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/questions/:id - Get single question
// ============================================================================

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
      });
    }

    const question = await getQuestionById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: `Question with ID ${id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/questions - Create new question
// ============================================================================

router.post('/', requireRole('VALIDATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const payload = req.body;

    // Validate payload
    const validationErrors = validateQuestionPayload(payload, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Insert question
    const newQuestion = await insertQuestion(payload);

    if (!newQuestion) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create question',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/questions/:id - Update question
// ============================================================================

router.put('/:id', requireRole('VALIDATOR', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
      });
    }

    // Validate that question exists
    const existingQuestion = await getQuestionById(id);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: `Question with ID ${id} not found`,
      });
    }

    // Validate update payload
    const validationErrors = validateQuestionPayload(updates, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Update question
    const updatedQuestion = await updateQuestion(id, updates);

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/questions/:id - Delete question (soft delete)
// ============================================================================

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Question ID is required',
      });
    }

    // Validate that question exists
    const existingQuestion = await getQuestionById(id);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: `Question with ID ${id} not found`,
      });
    }

    // Delete (soft delete via is_active = FALSE)
    await deleteQuestion(id);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
