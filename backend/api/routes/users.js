/**
 * Users Routes
 * POST   /api/users              - Create user
 * GET    /api/users/:id/stats    - Get user statistics
 * GET    /api/leaderboard        - Get leaderboard
 */

import { Router } from 'express';
import {
  createUser,
  getUserById,
  getUserStats,
  getWeakDomains,
  getGamification,
} from '../../database/db.js';
import { requireAuth } from '../middleware/requireRole.js';

const router = Router();

// ============================================================================
// HELPER: Generate random anonymous name
// ============================================================================

function generateAnonymousName() {
  const adjectives = ['Cloud', 'Sky', 'Digital', 'Quantum', 'Cyber', 'Network', 'Data', 'Secure'];
  const nouns = ['Ninja', 'Wizard', 'Architect', 'Engineer', 'Master', 'Guardian', 'Champion', 'Leader'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 10000);
  
  return `${adjective}${noun}#${number}`;
}

// ============================================================================
// POST /api/users - Create user
// ============================================================================

router.post('/', async (req, res, next) => {
  try {
    const { anonymous_name } = req.body;

    // Generate name if not provided
    const name = anonymous_name || generateAnonymousName();

    // Validate name length
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'anonymous_name must be at most 100 characters',
      });
    }

    // Create user
    const user = await createUser(name);

    if (!user) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
      });
    }

    // Also initialize gamification
    await getGamification(user.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        anonymous_name: user.anonymous_name,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/users/:id/stats - Get user statistics
// ============================================================================

router.get('/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const { id: user_id } = req.params;
    if (req.user.role !== 'ADMIN' && req.user.id !== user_id) {
      return res.status(403).json({ success: false, error: 'Você só pode consultar suas próprias estatísticas.', status: 403 });
    }

    // Verify user exists
    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${user_id} not found`,
      });
    }

    // Get user stats from view
    const stats = await getUserStats(user_id);

    if (!stats) {
      // If no stats yet, return empty stats
      return res.status(200).json({
        success: true,
        data: {
          user_id,
          anonymous_name: user.anonymous_name,
          total_quizzes: 0,
          avg_score: 0,
          best_score: 0,
          total_time_secs: 0,
          certifications_practiced: 0,
          total_focus_minutes: 0,
        },
      });
    }

    // Get gamification data
    const gamification = await getGamification(user_id);

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        xp_points: gamification?.xp_points || 0,
        badges: gamification?.badges || [],
        current_streak: gamification?.current_streak || 0,
        longest_streak: gamification?.longest_streak || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/users/:id/weak-domains - Get weak domains for user
// ============================================================================

router.get('/:id/weak-domains', requireAuth, async (req, res, next) => {
  try {
    const { id: user_id } = req.params;
    if (req.user.role !== 'ADMIN' && req.user.id !== user_id) {
      return res.status(403).json({ success: false, error: 'Você só pode consultar seus próprios domínios.', status: 403 });
    }
    const { threshold = 70 } = req.query;

    // Verify user exists
    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${user_id} not found`,
      });
    }

    const weakDomains = await getWeakDomains(user_id, parseInt(threshold));

    res.status(200).json({
      success: true,
      data: {
        user_id,
        threshold: parseInt(threshold),
        weak_domains: weakDomains,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/leaderboard - Get leaderboard
// NOTE: This route is handled by server.js directly as a separate route
// to avoid conflicts with the /:id routing pattern
// ============================================================================

// This route is no longer needed here - handled in server.js

export default router;
