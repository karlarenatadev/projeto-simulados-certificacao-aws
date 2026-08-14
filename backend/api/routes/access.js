import { Router } from 'express';
import {
  changeUserAccess,
  createValidatorRequest,
  getValidatorCertifications,
  listUsers,
  listValidatorRequests,
  removeValidatorCertification,
  reviewValidatorRequest,
} from '../../database/db.js';
import { requireAuth, requireRole } from '../middleware/requireRole.js';

const router = Router();

function sendError(next, error) {
  if (error.statusCode) return next(error);
  return next(error);
}

router.post('/validator-requests', requireAuth, async (req, res, next) => {
  try {
    const request = await createValidatorRequest(req.user.id, req.body || {});
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return sendError(next, error);
  }
});

router.get('/validator-requests', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const requests = await listValidatorRequests({
      userId: isAdmin ? null : req.user.id,
      status: req.query.status || null,
    });
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    return sendError(next, error);
  }
});

router.patch('/validator-requests/:id/review', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const request = await reviewValidatorRequest(
      req.params.id,
      req.user.id,
      req.body?.status,
      req.body?.review_notes ?? req.body?.reviewNotes,
    );
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    return sendError(next, error);
  }
});

router.get('/validator-certifications/:userId?', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const requestedUserId = req.params.userId || req.user.id;
    if (!isAdmin && requestedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode consultar suas próprias autorizações.', status: 403 });
    }
    const certifications = await getValidatorCertifications(requestedUserId);
    return res.status(200).json({ success: true, data: certifications });
  } catch (error) {
    return sendError(next, error);
  }
});

router.delete('/validator-certifications/:userId/:certificationId', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const certification = await removeValidatorCertification(
      req.user.id,
      req.params.userId,
      req.params.certificationId,
    );
    if (!certification) return res.status(404).json({ error: 'Autorização não encontrada.', status: 404 });
    return res.status(200).json({ success: true, data: certification });
  } catch (error) {
    return sendError(next, error);
  }
});

router.get('/admin/users', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await listUsers({ search: req.query.search, limit: req.query.limit, offset: req.query.offset });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return sendError(next, error);
  }
});

router.patch('/admin/users/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const user = await changeUserAccess(req.user.id, req.params.id, {
      role: req.body?.role,
      is_active: req.body?.is_active,
    });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return sendError(next, error);
  }
});

export default router;
