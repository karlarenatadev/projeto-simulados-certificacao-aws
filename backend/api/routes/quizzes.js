/**
 * Quizzes Routes
 * POST   /api/quiz/start         - Start new quiz
 * POST   /api/quiz/:id/answer    - Record answer
 * GET    /api/quiz/:id/results   - Get quiz results
 */

import { Router } from 'express';
import {
  getQuestions,
  getQuestionById,
  createQuizHistory,
  getQuizById,
  recordAnswer,
  getAnswersByQuiz,
  calculateQuizStats,
} from '../../database/db.js';
import { requireAuth } from '../middleware/requireRole.js';

const router = Router();

// ============================================================================
// POST /api/quiz/start - Start new quiz
// ============================================================================

router.post('/start', requireAuth, async (req, res, next) => {
  try {
    const { certification, num_questions = 10 } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!certification) {
      return res.status(400).json({
        success: false,
        message: 'certification is required',
      });
    }

    // Fetch questions for the quiz
    const questions = await getQuestions({
      certification,
      limit: num_questions,
      offset: 0,
    });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No questions found for certification: ${certification}`,
      });
    }

    // Create quiz history record
    const quiz = await createQuizHistory({
      user_id,
      certification,
      score: 0,
      total_questions: questions.length,
      percentage: 0,
      time_spent_secs: 0,
      domain_scores: {},
      weak_domains: [],
    });

    if (!quiz) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create quiz',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Quiz started successfully',
      data: {
        quiz_id: quiz.id,
        questions: questions.map(q => ({
          id: q.id,
          certification: q.certification,
          domain: q.domain,
          difficulty: q.difficulty,
          question_text: q.question_text,
          options: q.options,
          reference_url: q.reference_url
        })),
        total_questions: questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/quiz/:id/answer - Record answer
// ============================================================================

router.post('/:id/answer', requireAuth, async (req, res, next) => {
  try {
    const { id: quiz_id } = req.params;
    const { question_id, user_answer, time_secs } = req.body;

    // Validate required fields
    if (!quiz_id || !question_id || user_answer === undefined || user_answer === null) {
      return res.status(400).json({
        success: false,
        message: 'quiz_id, question_id, and user_answer are required',
      });
    }

    // Verify quiz existence and ownership before accepting an answer.
    const quiz = await getQuizById(quiz_id);
    if (!quiz || String(quiz.user_id) !== String(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: `Quiz with ID ${quiz_id} not found`,
      });
    }

    const question = await getQuestionById(question_id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: `Question with ID ${question_id} not found`,
      });
    }

    const answer = await recordAnswer({
      quiz_id,
      question_id,
      user_answer: Array.isArray(user_answer) ? user_answer : [user_answer],
      time_secs: time_secs || 0,
    });

    if (!answer) {
      return res.status(500).json({
        success: false,
        message: 'Failed to record answer',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Answer recorded successfully',
      data: {
        answer_id: answer.id,
        // Don't send full answer back, just confirmation
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/quiz/:id/results - Get quiz results
// ============================================================================

router.get('/:id/results', requireAuth, async (req, res, next) => {
  try {
    const { id: quiz_id } = req.params;

    // Verify quiz exists
    const quiz = await getQuizById(quiz_id);
    if (!quiz || String(quiz.user_id) !== String(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: `Quiz with ID ${quiz_id} not found`,
      });
    }

    // Get all answers
    const answers = await getAnswersByQuiz(quiz_id);

    // Calculate statistics
    const stats = await calculateQuizStats(quiz_id);

    res.status(200).json({
      success: true,
      data: {
        quiz_id,
        certification: quiz.certification,
        total_questions: quiz.total_questions,
        score: quiz.score,
        correct_answers: answers.filter(a => a.is_correct).length,
        incorrect_answers: answers.filter(a => !a.is_correct).length,
        percentage: parseFloat(quiz.percentage),
        time_spent_secs: quiz.time_spent_secs,
        completed_at: quiz.completed_at,
        domain_scores: quiz.domain_scores || {},
        weak_domains: quiz.weak_domains || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/quiz/:id - Get quiz details (alias for results)
// ============================================================================

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id: quiz_id } = req.params;

    const quiz = await getQuizById(quiz_id);
    if (!quiz || String(quiz.user_id) !== String(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: `Quiz with ID ${quiz_id} not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
