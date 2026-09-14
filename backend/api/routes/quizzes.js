/**
 * Quizzes Routes
 * POST   /api/quiz/start         - Start new quiz
 * POST   /api/quiz/:id/answer    - Record answer
 * POST   /api/quiz/:id/finish    - Complete quiz exactly once
 * POST   /api/quiz/:id/abandon   - Explicitly discard an active quiz
 * GET    /api/quiz/:id/results   - Get completed quiz results
 */

import { Router } from "express";
import {
  createQuizWithQuestions,
  getQuizById,
  getQuizQuestions,
  recordAnswer,
  getAnswersByQuiz,
  completeQuiz,
  abandonQuiz,
  getUserModuleState,
} from "../../database/db.js";
import { requireAuth } from "../middleware/requireRole.js";
import { normalizeLanguage } from "../../database/normalizers.js";
import { normalizeDomain } from "../../database/domainTaxonomy.js";

const router = Router();

// ============================================================================
// POST /api/quiz/start - Start new quiz
// ============================================================================

router.post("/start", requireAuth, async (req, res, next) => {
  try {
    const {
      certification,
      num_questions = 10,
      language: requestedLanguage,
      locale,
      difficulty,
      domain,
      topic,
    } = req.body;
    const user_id = req.user.id;

    let language;
    try {
      const preferences = await getUserModuleState(user_id, "preferences");
      language = normalizeLanguage(
        requestedLanguage ||
          locale ||
          preferences?.state_json?.language ||
          "pt",
      );
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: error.message, status: 400 });
    }

    // Validate required fields
    if (!certification) {
      return res.status(400).json({
        success: false,
        message: "certification is required",
      });
    }

    const { quiz, questions } = await createQuizWithQuestions({
      user_id,
      certification,
      language,
      num_questions,
      difficulty: difficulty && difficulty !== "all" ? difficulty : undefined,
      domain: domain || topic,
    });

    res.status(201).json({
      success: true,
      message: "Quiz started successfully",
      data: {
        quiz_id: quiz.id,
        status: quiz.status,
        started_at: quiz.started_at,
        completed_at: quiz.completed_at,
        language,
        questions: questions.map(toPublicQuizQuestion),
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

router.post("/:id/answer", requireAuth, async (req, res, next) => {
  try {
    const { id: quiz_id } = req.params;
    const { question_id, user_answer, time_secs } = req.body;

    // Validate required fields
    if (
      !quiz_id ||
      !question_id ||
      user_answer === undefined ||
      user_answer === null
    ) {
      return res.status(400).json({
        success: false,
        message: "quiz_id, question_id, and user_answer are required",
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
    if (quiz.status !== "started") {
      return res.status(409).json({
        success: false,
        message: `Quiz does not accept answers while status is ${quiz.status}`,
      });
    }

    const answer = await recordAnswer({
      quiz_id,
      user_id: req.user.id,
      question_id,
      user_answer: Array.isArray(user_answer) ? user_answer : [user_answer],
      time_secs: time_secs || 0,
    });

    if (!answer) {
      return res.status(500).json({
        success: false,
        message: "Failed to record answer",
      });
    }

    res.status(200).json({
      success: true,
      message: "Answer recorded successfully",
      data: {
        answer_id: answer.id,
        is_correct: answer.is_correct,
        correct_answer: answer.correct_answer,
        explanation: answer.explanation,
        idempotent: answer.idempotent === true,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/quiz/:id/finish - Complete quiz idempotently
// ============================================================================

router.post("/:id/finish", requireAuth, async (req, res, next) => {
  try {
    const result = await completeQuiz(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: "Quiz completed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// POST /api/quiz/:id/abandon - Explicitly discard an active quiz
// ============================================================================

router.post("/:id/abandon", requireAuth, async (req, res, next) => {
  try {
    const quiz = await abandonQuiz(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      message: "Quiz abandoned successfully",
      data: {
        quiz_id: quiz.id,
        status: quiz.status,
        started_at: quiz.started_at,
        completed_at: quiz.completed_at,
        abandoned_at: quiz.abandoned_at,
        idempotent: quiz.idempotent,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/quiz/:id/results - Get quiz results
// ============================================================================

router.get("/:id/results", requireAuth, async (req, res, next) => {
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
    if (quiz.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "Quiz results are only available after completion",
      });
    }

    // Get all answers
    const answers = await getAnswersByQuiz(quiz_id);

    res.status(200).json({
      success: true,
      data: {
        quiz_id,
        status: quiz.status,
        started_at: quiz.started_at,
        certification: quiz.certification,
        total_questions: quiz.total_questions,
        score: quiz.score,
        correct_answers: answers.filter((a) => a.is_correct).length,
        incorrect_answers: answers.filter((a) => !a.is_correct).length,
        answered_questions: answers.length,
        unanswered_questions: Math.max(
          Number(quiz.total_questions) - answers.length,
          0,
        ),
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

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id: quiz_id } = req.params;

    const quiz = await getQuizById(quiz_id);
    if (!quiz || String(quiz.user_id) !== String(req.user.id)) {
      return res.status(404).json({
        success: false,
        message: `Quiz with ID ${quiz_id} not found`,
      });
    }

    const questions =
      quiz.status === "started"
        ? await getQuizQuestions(quiz_id, req.user.id)
        : [];
    res.status(200).json({
      success: true,
      data: {
        ...quiz,
        resumable: quiz.status === "started" && questions.length > 0,
        questions: questions.map(toPublicQuizQuestion),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

function toPublicQuizQuestion(q) {
  const domain = normalizeDomain(q.certification, q.domain);
  return {
    id: q.id,
    certification: q.certification,
    domain: q.domain,
    domain_id: domain?.id || q.domain,
    difficulty: q.difficulty,
    language: q.language,
    source_question_id: q.source_question_id,
    question_text: q.question_text,
    options: q.options,
    selection_count: Array.isArray(q.correct_answer)
      ? q.correct_answer.length
      : 1,
    reference_url: q.reference_url,
  };
}
