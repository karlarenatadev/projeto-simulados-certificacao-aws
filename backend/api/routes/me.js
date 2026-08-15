import { Router } from 'express';
import {
  getUserModuleState,
  updateUser,
  upsertUserModuleState,
} from '../../database/db.js';
import { requireAuth } from '../middleware/requireRole.js';

const router = Router();
const ALLOWED_MODULES = new Set(['journey', 'sprint', 'flashcards', 'labs', 'diagnostic', 'preferences']);
const ALLOWED_CERTIFICATIONS = new Set(['CLF-C02', 'SAA-C03', 'DVA-C02', 'AIF-C01']);

function normalizeCertification(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (!ALLOWED_CERTIFICATIONS.has(normalized)) {
    const error = new Error(`Unsupported certification: ${value}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function assertModule(module) {
  const normalized = String(module || '').trim().toLowerCase();
  if (!ALLOWED_MODULES.has(normalized)) {
    const error = new Error(`Unsupported user module: ${module}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function profilePayload(user, preferences = {}) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    nickname: user.nickname,
    role: user.role,
    is_active: user.is_active,
    last_login: user.last_login,
    created_at: user.created_at,
    preferences: {
      language: preferences.language || 'pt',
      certification: preferences.certification || 'CLF-C02',
      theme: preferences.theme || 'light',
    },
  };
}

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const preferences = await getUserModuleState(req.user.id, 'preferences');
    res.json({
      success: true,
      data: profilePayload(req.user, preferences?.state_json || {}),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const forbidden = ['id', 'email', 'role', 'is_active'];
    if (forbidden.some((field) => body[field] !== undefined)) {
      return res.status(400).json({
        success: false,
        error: 'Only full_name, nickname and allowed preferences can be changed.',
        status: 400,
      });
    }

    const userUpdates = {};
    if (body.full_name !== undefined) userUpdates.full_name = body.full_name;
    if (body.nickname !== undefined) userUpdates.nickname = body.nickname;
    const updatedUser = Object.keys(userUpdates).length > 0
      ? await updateUser(req.user.id, userUpdates)
      : req.user;

    const current = await getUserModuleState(req.user.id, 'preferences');
    const preferences = {
      ...(current?.state_json || {}),
      ...(body.preferences || {}),
    };
    if (preferences.language && !['pt', 'en'].includes(String(preferences.language).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'language must be pt or en', status: 400 });
    }
    preferences.language = String(preferences.language || 'pt').toLowerCase();
    preferences.certification = normalizeCertification(preferences.certification) || 'CLF-C02';
    if (preferences.theme && !['light', 'dark'].includes(preferences.theme)) {
      return res.status(400).json({ success: false, error: 'theme must be light or dark', status: 400 });
    }
    preferences.theme = preferences.theme || 'light';
    await upsertUserModuleState(req.user.id, 'preferences', null, preferences, current?.version ?? null);

    const savedUser = updatedUser || req.user;
    res.json({ success: true, data: profilePayload(savedUser, preferences) });
  } catch (error) {
    next(error);
  }
});

router.get('/state/:module', requireAuth, async (req, res, next) => {
  try {
    const module = assertModule(req.params.module);
    const certification = normalizeCertification(req.query.certification);
    const state = await getUserModuleState(req.user.id, module, certification);
    res.json({ success: true, data: state || null });
  } catch (error) {
    next(error);
  }
});

router.put('/state/:module', requireAuth, async (req, res, next) => {
  try {
    const module = assertModule(req.params.module);
    const body = req.body || {};
    const certification = normalizeCertification(body.certification);
    if (module !== 'preferences' && !certification) {
      return res.status(400).json({ success: false, error: 'certification is required', status: 400 });
    }
    const state = body.state;
    const saved = await upsertUserModuleState(
      req.user.id,
      module,
      certification,
      state,
      body.version === undefined ? null : body.version,
    );
    res.json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
});

export default router;
