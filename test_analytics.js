import { storageManager } from "./src/frontend/js/storageManager.js";
import { LearningAnalytics } from "./src/frontend/js/analytics/learningAnalytics.js";
import { RecommendationEngine } from "./src/frontend/js/recommendations/recommendationEngine.js";

// Mock localStorage for node environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value.toString(); },
  removeItem(key) { delete this.store[key]; }
};

const mockHistory = [
  // 20 questões IAM, 10 acertos (50%)
  {
    certId: "saa-c03",
    date: new Date().toISOString(),
    totalQuestions: 20,
    correctAnswers: 10,
    percentage: 50,
    domainScores: {
      "security": { total: 20, correct: 10, percentage: 50 }
    }
  },
  // 30 questões S3, 27 acertos (90%)
  {
    certId: "saa-c03",
    date: new Date().toISOString(),
    totalQuestions: 30,
    correctAnswers: 27,
    percentage: 90,
    domainScores: {
      "storage": { total: 30, correct: 27, percentage: 90 }
    }
  }
];

// Set local_test_student
global.localStorage.setItem("aws_sim_userId", "local_test_student");
global.localStorage.setItem("aws_sim_history", JSON.stringify(mockHistory));
global.localStorage.setItem("aws_sim_mistakes", JSON.stringify({})); // empty mistakes for this test

const analytics = new LearningAnalytics(storageManager);
const profile = analytics.getLearningProfile("saa-c03");

console.log("=== Learning Profile ===");
console.log(JSON.stringify(profile.domains, null, 2));

const engine = new RecommendationEngine();
const plan = engine.generateStudyPlan(profile);

console.log("=== Generated Actions ===");
console.log(JSON.stringify(plan.nextActions, null, 2));
