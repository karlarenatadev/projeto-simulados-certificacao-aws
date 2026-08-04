import { jest } from "@jest/globals";
import { userManager } from "../src/frontend/js/userManager.js";
import { quizManager } from "../src/frontend/js/quizManager.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("modo local — compatibilidade offline (Task 4.4)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    localStorage.clear();
    quizManager.currentQuizId = null;
    quizManager.currentUserId = null;
    quizManager.isAPIAvailable = false;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Critério 1: App funciona completamente sem backend disponível
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Critério 1 — app funciona sem backend", () => {
    test("userManager cria usuário local quando API está indisponível", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const user = await userManager.getOrCreateUser();

      expect(user.id).toMatch(/^local_/);
      expect(localStorage.getItem("aws_sim_user_id")).toMatch(/^local_/);
    });

    test("quizManager.initialize() seta isAPIAvailable = false quando API cai", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      await quizManager.initialize("local_user_1");

      expect(quizManager.isAPIAvailable).toBe(false);
    });

    test("quizManager.startQuiz() cria quiz local quando API indisponível", async () => {
      quizManager.currentUserId = "local_user_1";
      quizManager.isAPIAvailable = false;

      const result = await quizManager.startQuiz("clf-c02", 10);

      expect(result.quizId).toMatch(/^local_quiz_/);
      expect(result.fromAPI).toBe(false);
      expect(quizManager.currentQuizId).toMatch(/^local_quiz_/);
    });

    test("quizManager.recordAnswer() salva localmente sem chamar a API quando offline", async () => {
      quizManager.currentQuizId = "local_quiz_xyz";
      quizManager.isAPIAvailable = false;

      const result = await quizManager.recordAnswer({
        question_id: "q1",
        user_answer: 2,
        is_correct: true,
        time_secs: 15,
      });

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();

      const saved = JSON.parse(
        localStorage.getItem("aws_sim_ans_local_quiz_xyz_q1") || "null"
      );
      expect(saved).not.toBeNull();
      expect(saved.synced).toBe(false);
      expect(saved.question_id).toBe("q1");
    });

    test("quizManager.getQuizResults() calcula resultado de localStorage quando offline", async () => {
      quizManager.currentQuizId = "local_quiz_xyz";
      quizManager.isAPIAvailable = false;

      const answers = [
        { question_id: "q1", is_correct: true, time_secs: 10, synced: false },
        { question_id: "q2", is_correct: true, time_secs: 8, synced: false },
        { question_id: "q3", is_correct: false, time_secs: 12, synced: false },
      ];
      for (const a of answers) {
          localStorage.setItem(`aws_sim_ans_local_quiz_xyz_${a.question_id}`, JSON.stringify(a));
      }

      const results = await quizManager.getQuizResults();

      expect(results).not.toBeNull();
      expect(results.total_questions).toBe(3);
      expect(results.correct_answers).toBe(2);
      expect(results.percentage).toBeCloseTo(66.67, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Critério 2: Dados locais migram/sincronizam quando backend volta
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Critério 2 — sincronização quando backend volta", () => {
    test("userManager substitui local_* por ID do backend quando API fica disponível", async () => {
      localStorage.setItem("aws_sim_user_id", "local_abc123");
      localStorage.setItem("aws_sim_user_name", "AnonymousLocal");

      global.fetch
        .mockResolvedValueOnce(
          jsonResponse({ success: true, message: "API is healthy" }),
        ) // isAvailable → GET /api/health
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            data: { id: "backend-uuid-1", anonymous_name: "CloudNinja#42" },
          }),
        ); // createUser → POST /api/users

      const user = await userManager.getOrCreateUser();

      expect(user.id).toBe("backend-uuid-1");
      expect(user.anonymous_name).toBe("CloudNinja#42");
      expect(localStorage.getItem("aws_sim_user_id")).toBe("backend-uuid-1");
      expect(localStorage.getItem("aws_sim_user_name")).toBe("CloudNinja#42");
    });

    test("userManager mantém local_* quando API continua indisponível", async () => {
      localStorage.setItem("aws_sim_user_id", "local_abc123");
      localStorage.setItem("aws_sim_user_name", "AnonymousLocal");

      global.fetch.mockRejectedValue(new Error("Network error"));

      const user = await userManager.getOrCreateUser();

      expect(user.id).toBe("local_abc123");
      expect(localStorage.getItem("aws_sim_user_id")).toBe("local_abc123");
    });

    test("quizManager.recordAnswer() marca synced: true após envio bem-sucedido à API", async () => {
      quizManager.currentQuizId = "backend-quiz-abc";
      quizManager.isAPIAvailable = true;

      global.fetch.mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { id: "answer-1", is_correct: true },
        }),
      );

      await quizManager.recordAnswer({
        question_id: "q1",
        user_answer: 0,
        is_correct: true,
        time_secs: 10,
      });

      const saved = JSON.parse(
        localStorage.getItem("aws_sim_ans_backend-quiz-abc_q1") || "{}"
      );
      expect(saved.synced).toBe(true);
      expect(saved.syncedAt).not.toBeUndefined();
    });

    test("quizManager.recordAnswer() mantém synced: false quando API falha", async () => {
      quizManager.currentQuizId = "backend-quiz-abc";
      quizManager.isAPIAvailable = true;

      global.fetch.mockRejectedValue(new Error("Network error"));

      await quizManager.recordAnswer({
        question_id: "q1",
        user_answer: 0,
        is_correct: true,
        time_secs: 10,
      });

      const saved = JSON.parse(
        localStorage.getItem("aws_sim_ans_backend-quiz-abc_q1") || "{}"
      );
      expect(saved.synced).toBeFalsy();
      expect(saved.syncedAt).toBeNull();
    });
  });
});
