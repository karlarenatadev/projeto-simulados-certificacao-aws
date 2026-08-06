/**
 * quizEngine — motor de quiz puro
 * Zero manipulação de DOM. Toda lógica de estado do simulado fica aqui.
 */

/** Embaralha array usando Fisher-Yates */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Seleciona N questões aleatórias de um array */
export function pickRandom(questions, count) {
  return shuffle(questions).slice(0, Math.min(count, questions.length));
}

/** Calcula score final de uma sessão */
export function calculateScore(answers) {
  if (!answers.length) return { correct: 0, total: 0, percentage: 0 };
  const correct = answers.filter(a => a.isCorrect).length;
  return { correct, total: answers.length, percentage: Math.round((correct / answers.length) * 100) };
}

/** Agrupa resultados por domínio */
export function scoreByDomain(answers) {
  const domains = {};
  answers.forEach(({ domain, isCorrect }) => {
    if (!domain) return;
    if (!domains[domain]) domains[domain] = { correct: 0, total: 0 };
    domains[domain].total++;
    if (isCorrect) domains[domain].correct++;
  });
  return Object.entries(domains).map(([name, stats]) => ({
    name,
    ...stats,
    percentage: Math.round((stats.correct / stats.total) * 100),
  }));
}

/** Verifica se passou (nota mínima 72%) */
export function hasPassed(percentage, passingScore = 72) {
  return percentage >= passingScore;
}

export const CERTIFICATIONS = [
  { id: 'clf-c02', label: 'AWS Cloud Practitioner (CLF-C02)', passingScore: 72, domains: ['Conceitos Cloud','Segurança','Tecnologia','Faturamento'] },
  { id: 'saa-c03', label: 'AWS Solutions Architect (SAA-C03)', passingScore: 72, domains: ['Design Resiliente','Rede','Armazenamento','Design de Alto Desempenho','Custo'] },
  { id: 'aif-c01', label: 'AWS AI Practitioner (AIF-C01)', passingScore: 70, domains: ['Fundamentos IA/ML','Serviços IA AWS','Governança IA','Segurança IA'] },
  { id: 'dva-c02', label: 'AWS Developer Associate (DVA-C02)', passingScore: 72, domains: ['Desenvolvimento','Segurança','Deploy','Otimização'] },
];

export const QUIZ_MODES = [
  { id: 'exam',   label: 'Modo Prova',   description: 'Sem gabarito durante o simulado' },
  { id: 'review', label: 'Modo Revisão', description: 'Gabarito imediato após cada resposta' },
];

export const QUESTION_COUNTS = [5, 10, 15, 20, 30, 65];
