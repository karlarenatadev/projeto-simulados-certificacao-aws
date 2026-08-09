import fs from 'fs';

const certId = 'clf-c02';
const data = JSON.parse(fs.readFileSync('public/data/questions/clf-c02.json', 'utf-8'));
const manifest = JSON.parse(fs.readFileSync('public/data/taxonomy/certification-manifest.json', 'utf-8'));
const config = manifest[certId];

const certificationPaths = {
  "clf-c02": {
    domains: [
      { id: "conceitos-cloud", name: "Conceitos de Cloud", englishName: "Cloud Concepts" },
      { id: "seguranca", name: "Segurança e Conformidade", englishName: "Security and Compliance" },
      { id: "tecnologia", name: "Tecnologia", englishName: "Cloud Technology and Services" },
      { id: "faturamento", name: "Faturamento e Preços", englishName: "Billing and Pricing" },
    ]
  }
};

function normalizeCertificationId(id) {
  return id ? id.toLowerCase().trim() : "";
}

function _normalizeQuestion(q) {
    let correctRaw =
      q.correct !== undefined
        ? q.correct
        : q.correct_answer !== undefined
          ? q.correct_answer
          : q.correctAnswer;

    let correctNormalized = correctRaw;
    if (typeof correctRaw === "string") {
      correctNormalized = parseInt(correctRaw, 10);
    } else if (Array.isArray(correctRaw)) {
      correctNormalized = correctRaw.map((ans) =>
        typeof ans === "string" ? parseInt(ans, 10) : ans,
      );
    }

    return {
      id: q.id || q.questionId || "generated-id",
      domain: q.domain || q.domainId || "0",
      difficulty: q.difficulty || "medium",
      question: q.question || q.question_text || "",
      options: q.options || [],
      correct: correctNormalized,
      certId: q.certId
    };
}

let normalized = data.map(q => _normalizeQuestion(q));

let sanitized = normalized.filter((q) => {
  if (!q.id && !q.questionId) { console.log("Missing ID"); return false; }
  if (q.certId && normalizeCertificationId(q.certId) !== normalizeCertificationId(certId)) {
     console.log("Cert ID mismatch"); return false;
  }
  
  const qDomain = q.domain || q.domainId;
  const certPath = certificationPaths[certId];
  
  const isAllowedDomainName = config.allowedDomains.includes(qDomain);
  
  let isAllowedDomainId = false;
  if (certPath && certPath.domains) {
    isAllowedDomainId = certPath.domains.some(d => d.id === qDomain || d.englishName === qDomain);
  }
  
  if (!isAllowedDomainName && !isAllowedDomainId) {
     console.log("Domain blocked:", qDomain); 
     return false;
  }
  
  return true;
});

console.log(`Original: ${data.length}`);
console.log(`Sanitized: ${sanitized.length}`);

// DataRepo Validation
let validated = sanitized.filter((q) => {
    const hasId = q.id !== undefined && q.id !== null;
    const hasText = typeof q.question === "string" && q.question.trim().length > 0;
    const hasOptions = Array.isArray(q.options) && q.options.length > 1;

    const hasCorrectAnswers =
        (typeof q.correct === "number" &&
        q.correct >= 0 &&
        q.correct < q.options.length) ||
        (Array.isArray(q.correct) &&
        q.correct.length > 0 &&
        q.correct.every(
            (idx) =>
            typeof idx === "number" && idx >= 0 && idx < q.options.length,
        ));

    if (!hasId || !hasText || !hasOptions || !hasCorrectAnswers) {
        console.log("Invalid question:", q);
        return false;
    }
    return true;
});

console.log(`Validated: ${validated.length}`);
