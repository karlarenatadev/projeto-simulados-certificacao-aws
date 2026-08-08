import fs from 'fs';

function normalizeCertificationId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

const certIdArg = 'CLF-C02';
const certId = normalizeCertificationId(certIdArg);
const rawData = JSON.parse(fs.readFileSync(`public/data/questions/clf-c02.json`, 'utf8')); // simulating fetch which requires correct casing if local

console.log(`Questions loaded: ${rawData.length}`);

let data = rawData;
// local filters
const filters = { difficulty: 'all', topic: '' };
console.log(`Questions after filters: ${data.length}`);

// Normalize (new logic preserves metadata)
function _normalizeQuestion(q) {
    let correctRaw = q.correct !== undefined ? q.correct : q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer;
    let correctNormalized = correctRaw;
    if (typeof correctRaw === "string") {
      correctNormalized = parseInt(correctRaw, 10);
    } else if (Array.isArray(correctRaw)) {
      correctNormalized = correctRaw.map((ans) => typeof ans === "string" ? parseInt(ans, 10) : ans);
    }
    return {
      ...q,
      id: q.id || q.questionId || "generated",
      domain: q.domain || q.domainId || "0",
      difficulty: q.difficulty || "medium",
      question: q.question || q.question_text || "",
      options: q.options || [],
      correct: correctNormalized,
      explanation: q.explanation || "",
      reference_url: q.reference_url || q.referenceUrl || undefined,
      validated_by: q.validated_by || q.validatedBy || undefined,
    };
}

data = data.map(q => _normalizeQuestion(q));
console.log(`Questions after normalization: ${data.length}`);

// sanitize
const manifest = JSON.parse(fs.readFileSync('public/data/taxonomy/certification-manifest.json', 'utf8'));
const config = manifest[certId];

if (!config) {
    console.log("Config not found!");
} else {
    let sanitized = data.filter((q) => {
        if (!q.id && !q.questionId) return false;
        if (q.certId && normalizeCertificationId(q.certId) !== normalizeCertificationId(certId)) return false;
        if (!config.allowedDomains.includes(q.domain || q.domainId)) return false;
        if (q.validation?.status && q.validation.status !== "validated") return false;
        return true;
    });
    console.log(`Questions after sanitization: ${sanitized.length}`);
    data = sanitized;
}

function validateQuestions(questions) {
  return questions.filter((q) => {
    const hasId = (q.id !== undefined && q.id !== null) || (q.questionId !== undefined && q.questionId !== null);
    const hasText = typeof q.question === "string" && q.question.trim().length > 0;
    const hasOptions = Array.isArray(q.options) && q.options.length > 1;
    const hasCorrectAnswers =
      (typeof q.correct === "number" && q.correct >= 0 && q.correct < q.options.length) ||
      (Array.isArray(q.correct) && q.correct.length > 0 && q.correct.every((idx) => typeof idx === "number" && idx >= 0 && idx < q.options.length));
    
    return hasId && hasText && hasOptions && hasCorrectAnswers;
  });
}

data = validateQuestions(data);
console.log(`Questions after validation: ${data.length}`);
