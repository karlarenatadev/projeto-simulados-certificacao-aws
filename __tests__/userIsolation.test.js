import { SessionManager } from "../src/frontend/js/core/sessionManager.js";
import { storageManager } from "../src/frontend/js/storageManager.js";
import { getCertificationProgress } from "../src/frontend/js/gamificacao/trailManager.js";
import { quizManager } from "../src/frontend/js/quizManager.js";

function loginAs(id, certification = "clf-c02") {
  SessionManager.persist({
    user: {
      id,
      email: `${id}@a3data.com.br`,
      name: id,
      role: "student",
      language: "pt",
      certification,
    },
  });
}

describe("isolamento de persistência por usuário", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("gera namespaces diferentes para usuários e mantém guest separado", () => {
    expect(storageManager.getStorageContext()).toBe("guest");
    const guestKey = storageManager.getUserScopedKey("history");

    loginAs("student-a");
    const keyA = storageManager.getUserScopedKey("history");
    loginAs("student-b");
    const keyB = storageManager.getUserScopedKey("history");

    expect(new Set([guestKey, keyA, keyB]).size).toBe(3);
  });

  test("histórico, diagnóstico e recomendações não atravessam usuários", () => {
    loginAs("student-a");
    storageManager.saveQuizResult({
      certId: "clf-c02",
      score: 8,
      total: 10,
      percentage: 80,
      mode: "diagnostic",
    });
    storageManager.setUserData("last_diagnostic_recommendation", "A");

    loginAs("student-b");
    expect(storageManager.getHistory()).toEqual([]);
    expect(storageManager.getUserData("last_diagnostic_recommendation")).toBeNull();

    SessionManager.logout();
    loginAs("student-a");
    expect(storageManager.getHistory()).toHaveLength(1);
    expect(storageManager.getUserData("last_diagnostic_recommendation")).toBe("A");
  });

  test("Jornada separa certificações do mesmo usuário", () => {
    loginAs("student-a");
    storageManager.saveGamification({ completedStages: ["clf-1"] }, "clf-c02");
    storageManager.saveGamification({ completedStages: ["saa-1", "saa-2"] }, "saa-c03");
    storageManager.saveGamification({ completedStages: ["dva-1"] }, "dva-c02");
    storageManager.saveGamification({ completedStages: ["aif-1", "aif-2"] }, "aif-c01");

    expect(getCertificationProgress("clf-c02").percentage).toBe(20);
    expect(getCertificationProgress("saa-c03").percentage).toBe(40);
    expect(getCertificationProgress("dva-c02").percentage).toBe(20);
    expect(getCertificationProgress("aif-c01").percentage).toBe(40);
  });

  test("Sprint, Flashcards, Labs, Cases, badges e foco usam o usuário atual", () => {
    loginAs("student-a");
    storageManager.saveSprintState("clf-c02", { completedStages: ["1"] });
    storageManager.setUserData("clf-c02_review_deck", JSON.stringify([{ id: "q-a" }]));
    storageManager.setUserData("completed_labs", JSON.stringify(["lab-a"]));
    storageManager.setUserData("cases:completed", JSON.stringify(["case-a"]));
    storageManager.saveGamification({ badges: ["badge-a"], completedStages: [] }, "clf-c02");
    storageManager.saveFocusSession(25);

    loginAs("student-b");
    expect(storageManager.getSprintState("clf-c02").completedStages).toEqual([]);
    expect(storageManager.getUserData("clf-c02_review_deck")).toBeNull();
    expect(storageManager.getUserData("completed_labs")).toBeNull();
    expect(storageManager.getUserData("cases:completed")).toBeNull();
    expect(storageManager.getGamification("clf-c02").badges).toEqual([]);
    expect(storageManager.getFocusHistory()).toEqual([]);
  });

  test("respostas locais e contexto transitório ficam no namespace do usuário", () => {
    loginAs("student-a");
    quizManager.currentQuizId = "local_shared_quiz";
    quizManager._saveAnswerLocally({
      question_id: "q1",
      user_answer: 0,
      is_correct: true,
    });
    sessionStorage.setItem(
      storageManager.getUserScopedKey("diagnostic_context"),
      "A",
    );

    loginAs("student-b");
    quizManager.currentQuizId = "local_shared_quiz";
    expect(quizManager._getLocalResults()).toBeNull();
    expect(
      sessionStorage.getItem(storageManager.getUserScopedKey("diagnostic_context")),
    ).toBeNull();
  });

  test("logout não apaga o namespace persistente do proprietário", () => {
    loginAs("student-a");
    storageManager.saveQuizResult({
      certId: "clf-c02",
      score: 10,
      total: 10,
      percentage: 100,
    });
    const userKey = storageManager.getUserScopedKey("history");

    SessionManager.logout();

    expect(localStorage.getItem(userKey)).not.toBeNull();
    expect(localStorage.getItem("cloudacademy_session")).toBeNull();
  });
});
