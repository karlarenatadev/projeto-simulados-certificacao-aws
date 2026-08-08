import { logger } from "./utils/logger.js";
/**
 * js/quizEngine.js
 * Motor de lógica pura do Simulado.
 * Zero manipulação de DOM (HTML/CSS) acontece aqui.
 *
 * Now integrates with REST API for question loading.
 *
 * @typedef {import('./types.js').Question} Question
 * @typedef {import('./types.js').Session} Session
 * @typedef {import('./types.js').Result} Result
 */

import apiService from "./services/api.js";
import { createDataRepository } from "./dataRepository.js";
import { storageManager } from "./storageManager.js";
import { generateQuestionId } from "./utils/questionIdentity.js";
import { normalizeCertificationId } from "./utils/certUtils.js";
import { certificationPaths } from "./data.js";

const dataRepo = createDataRepository(storageManager);

const DEFAULT_PERSONALIZED_QUESTION_COUNT = 10;
const WEAK_DOMAIN_THRESHOLD = 60;

export function identifyWeakDomains(
  domainScores,
  domainsConfig = [],
  threshold = WEAK_DOMAIN_THRESHOLD,
) {
  if (!domainScores || typeof domainScores !== "object") return [];

  const domainNames = new Map(
    domainsConfig.map((domain) => [domain.id, domain.name || domain.id]),
  );

  const rankedDomains = Object.entries(domainScores)
    .filter(([, scoreData]) => scoreData && scoreData.total > 0)
    .map(([id, scoreData]) => {
      const percentage = (scoreData.correct / scoreData.total) * 100;
      return {
        id,
        name: domainNames.get(id) || id,
        total: scoreData.total,
        correct: scoreData.correct,
        percentage,
      };
    })
    .sort((a, b) => a.percentage - b.percentage);

  if (rankedDomains.length === 0) return [];

  const weakDomains = rankedDomains.filter(
    (domain) => domain.percentage < threshold,
  );

  return weakDomains.length > 0 ? weakDomains : [rankedDomains[0]];
}

export function buildPersonalizedQuestionSet(
  questions,
  weakDomainIds,
  quantity = DEFAULT_PERSONALIZED_QUESTION_COUNT,
) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const desiredQuantity = Math.max(1, parseInt(quantity, 10) || 1);
  const weakSet = new Set((weakDomainIds || []).map((id) => String(id)));
  const selected = [];
  const selectedQuestions = new Set();

  const addQuestion = (question) => {
    if (!question || selectedQuestions.has(question)) return;
    if (selected.length >= desiredQuantity) return;

    selected.push(question);
    selectedQuestions.add(question);
  };

  questions
    .filter((question) => weakSet.has(String(question.domain).trim()))
    .forEach(addQuestion);

  questions.forEach(addQuestion);

  return selected;
}

export class QuizEngine {
  constructor(passingScore = 70) {
    this.PASSING_SCORE = passingScore;
    this.resetState();
  }

  resetState() {
    this.state = {
      attemptId: null,
      certId: null,
      questions: [],
      currentIndex: 0,
      score: 0,
      answers: [],
      domainScores: {},
      mode: "exam",
      quizId: null, // Backend quiz ID for tracking
    };
  }

  // 1. CARREGAMENTO E FILTRAGEM
  async _sanitizeQuestions(data, certId) {
    try {
      const manifestRes = await fetch(
        "data/taxonomy/certification-manifest.json",
      );
      if (!manifestRes.ok) {
        logger.warn(
          "⚠️ Não foi possível carregar o manifesto. Sanitização ignorada.",
        );
        return dataRepo.validateQuestions(data);
      }
      const manifest = await manifestRes.json();
      const config = manifest[certId];
      if (!config) {
        logger.warn(`⚠️ Certificação ${certId} ausente no manifesto.`);
        return dataRepo.validateQuestions(data);
      }

      let sanitized = data.filter((q) => {
        if (!q.id && !q.questionId) return false;
        if (q.certId && normalizeCertificationId(q.certId) !== normalizeCertificationId(certId)) return false;
        
        const qDomain = q.domain || q.domainId;
        const certPath = certificationPaths[certId];
        
        // Verifica se é um allowedDomain (nome em inglês, ex: "Security and Compliance")
        const isAllowedDomainName = config.allowedDomains.includes(qDomain);
        
        // Verifica se é um ID interno de domínio (ex: "seguranca")
        let isAllowedDomainId = false;
        if (certPath && certPath.domains) {
          isAllowedDomainId = certPath.domains.some(d => d.id === qDomain || d.englishName === qDomain);
        }
        
        if (!isAllowedDomainName && !isAllowedDomainId) return false;

        if (q.validation?.status && q.validation.status !== "validated")
          return false;
        return true;
      });

      // Validar estrutura das propriedades usando dataRepo
      sanitized = dataRepo.validateQuestions(sanitized);

      logger.info(
        `🛡️ Sanitização: ${sanitized.length}/${data.length} questões aprovadas.`,
      );
      return sanitized;
    } catch (e) {
      logger.error("Erro na sanitização:", e);
      return dataRepo.validateQuestions(data);
    }
  }

  async loadQuestions(certId, domainsConfig, filters, language = "pt", preloadedQuestions = null) {
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = normalizeCertificationId(certId);
    this.state.mode = filters.mode || "exam";

    try {
      let data = null;
      let source = null;

      if (preloadedQuestions && preloadedQuestions.length > 0) {
        data = preloadedQuestions;
        source = "api";
        logger.info(`✓ Loaded ${data.length} preloaded questions from QuizManager (API)`);
      } else {
        // Fallback para arquivo local JSON caso o QuizManager não tenha conseguido fornecer
        const fileSuffix = language === "en" ? "-en" : "";
        const response = await fetch(
          `data/questions/${certId}${fileSuffix}.json`,
        );
        if (!response.ok)
          throw new Error("Arquivo de questões não encontrado.");

        data = await response.json();
        source = "local";
        logger.info(`✓ Loaded ${data.length} questions from JSON file fallback (Local)`);
      }

      // Aplica filtros locais (dificuldade/tópico) SOMENTE se os dados vieram do JSON
      // Se vieram da API, não deve ser filtrado (API já mandou as N questões corretas)
      if (source === "local") {
        if (filters.difficulty !== "all") {
          data = data.filter((q) => q.difficulty === filters.difficulty);
        }
        if (filters.topic) {
          const domainObj = domainsConfig.find((d) => d.id === filters.topic);
          const englishTopic = domainObj ? domainObj.englishName : filters.topic;
          data = data.filter((q) => q.domain === filters.topic || q.domain === englishTopic);
        }
      }

      if (data.length === 0)
        throw new Error("Nenhuma questão encontrada com esses filtros.");

      // Normalize question structure to match internal format FIRST
      // API may return different field names, so we map them
      data = data.map((q) => this._normalizeQuestion(q));

      // Aplica a sanitização do manifesto (Blindagem)
      data = await this._sanitizeQuestions(data, certId);
      if (data.length === 0)
        throw new Error("Nenhuma questão válida restou após a sanitização.");

      // Embaralha as questões e as alternativas
      this.state.questions = this._shuffleArray(data)
        .slice(0, Math.min(filters.quantity, data.length))
        .map((q) => this._shuffleOptions(q));

      // Inicializa o placar de domínios
      domainsConfig.forEach((d) => {
        this.state.domainScores[d.id] = { total: 0, correct: 0 };
      });

      return { success: true, totalQuestions: this.state.questions.length };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async loadPersonalizedQuestions(
    certId,
    domainsConfig,
    weakDomainIds,
    quantity = DEFAULT_PERSONALIZED_QUESTION_COUNT,
    language = "pt",
  ) {
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = normalizeCertificationId(certId);
    this.state.mode = "review";

    try {
      let data = null;

      try {
        const response = await apiService.loadQuestions({
          certification: certId,
          limit: 200,
        });

        if (response.success && response.data && response.data.length > 0) {
          data = response.data;
          logger.info(
            `✓ Loaded ${data.length} questions from API for personalized quiz`,
          );
        }
      } catch (apiError) {
        logger.warn(
          "API request failed for personalized quiz, falling back to JSON:",
          apiError,
        );
      }

      if (!data || data.length === 0) {
        const fileSuffix = language === "en" ? "-en" : "";
        let response = await fetch(
          `data/questions/${certId}${fileSuffix}.json`,
        );

        if (!response.ok && language === "en") {
          response = await fetch(`data/questions/${certId}.json`);
        }

        if (!response.ok)
          throw new Error("Arquivo de questões não encontrado.");

        data = await response.json();
        logger.info(
          `✓ Loaded ${data.length} questions from JSON for personalized quiz`,
        );
      }

      data = await this._sanitizeQuestions(data, certId);

      data = data.map((q) => this._normalizeQuestion(q));

      const selectedQuestions = buildPersonalizedQuestionSet(
        this._shuffleArray(data),
        weakDomainIds,
        quantity,
      );

      if (selectedQuestions.length === 0) {
        throw new Error("Nenhuma questão disponível para este simulado.");
      }

      this.state.questions = selectedQuestions.map((q) =>
        this._shuffleOptions(q),
      );

      domainsConfig.forEach((d) => {
        this.state.domainScores[d.id] = { total: 0, correct: 0 };
      });

      return { success: true, totalQuestions: this.state.questions.length };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // 1.5 CARREGAMENTO DO DIAGNÓSTICO DE NIVELAMENTO
  async loadDiagnostic(certId, domainsConfig, language = "pt") {
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = normalizeCertificationId(certId);
    this.state.mode = "diagnostic"; // Isola o estado do simulado real

    try {
      let data = null;

      // Try API first
      try {
        const response = await apiService.loadQuestions({
          certification: certId,
          search: "diagnostic", // Attempt to filter for diagnostic questions
          limit: 50,
          locale: language
        });

        if (response.success && response.data && response.data.length > 0) {
          data = response.data;
          logger.info(`✓ Loaded ${data.length} diagnostic questions from API`);
        }
      } catch (apiError) {
        logger.warn(
          "API request failed for diagnostic, falling back to JSON:",
          apiError,
        );
      }

      // Fallback to JSON
      if (!data || data.length === 0) {
        const fileSuffix = language === "en" ? "-en" : "";
        let filePath = `data/nivelamento/diagnostic-${certId}${fileSuffix}.json`;

        let response = await fetch(filePath);

        // FALLBACK: Se falhar ao buscar o ficheiro em EN, tenta buscar o padrão (PT)
        if (!response.ok && language === "en") {
          logger.warn(
            `Diagnóstico EN não encontrado para ${certId}. Tentando versão PT...`,
          );
          filePath = `data/nivelamento/diagnostic-${certId}.json`;
          response = await fetch(filePath);
        }

        if (!response.ok)
          throw new Error(
            `Arquivo de diagnóstico não encontrado para ${certId}.`,
          );

        data = await response.json();
        logger.info(
          `✓ Loaded ${data.length} diagnostic questions from JSON file`,
        );
      }

      // Normalize and prepare questions
      data = data.map((q) => this._normalizeQuestion(q));

      // Embaralha as questões conceituais e suas opções
      this.state.questions = this._shuffleArray(data).map((q) =>
        this._shuffleOptions(q),
      );

      // Inicializa o placar para o radar chart funcionar perfeitamente
      domainsConfig.forEach((d) => {
        this.state.domainScores[d.id] = { total: 0, correct: 0 };
      });

      return { success: true, totalQuestions: this.state.questions.length };
    } catch (error) {
      logger.error("Erro no QuizEngine (Nivelamento):", error);
      return { success: false, message: error.message };
    }
  }

  // 2. NAVEGAÇÃO
  getCurrentQuestion() {
    return this.state.questions[this.state.currentIndex];
  }

  getProgress() {
    return {
      current: this.state.currentIndex + 1,
      total: this.state.questions.length,
      percentage:
        ((this.state.currentIndex + 1) / this.state.questions.length) * 100,
    };
  }

  nextQuestion() {
    if (this.state.currentIndex < this.state.questions.length - 1) {
      this.state.currentIndex++;
      return true;
    }
    return false;
  }

  // 3. AVALIAÇÃO
  submitAnswer(selectedIndex) {
    const q = this.getCurrentQuestion();

    let isCorrect;
    if (Array.isArray(q.correct)) {
      const userSorted = Array.isArray(selectedIndex)
        ? [...selectedIndex].sort()
        : [];
      const correctSorted = [...q.correct].sort();
      isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
    } else {
      isCorrect = selectedIndex === q.correct;
    }

    this.state.answers.push({ ...q, userSelection: selectedIndex, isCorrect });
    if (isCorrect) this.state.score++;

    // --- CORREÇÃO DE BUG DO GRÁFICO (Normalização de Domínios) ---
    let qDomain = String(q.domain).trim();

    // 1. Tenta o match exato
    if (this.state.domainScores[qDomain]) {
      this.state.domainScores[qDomain].total++;
      if (isCorrect) this.state.domainScores[qDomain].correct++;
    } else {
      // 2. Tenta match flexível (ex: "1" no JSON bate com "1.0" no config)
      const matchedKey = Object.keys(this.state.domainScores).find(
        (key) =>
          parseFloat(key) === parseFloat(qDomain) || key.includes(qDomain),
      );

      if (matchedKey) {
        this.state.domainScores[matchedKey].total++;
        if (isCorrect) this.state.domainScores[matchedKey].correct++;
      } else {
        // 3. Se for um domínio totalmente desconhecido, cria dinamicamente
        this.state.domainScores[qDomain] = {
          total: 1,
          correct: isCorrect ? 1 : 0,
        };
      }
    }

    return {
      isCorrect,
      correctIndex: q.correct,
      explanation: q.explanation,
      referenceUrl: q.reference_url,
      isFinished: this.state.currentIndex === this.state.questions.length - 1,
    };
  }
  // 4. RESULTADOS FINAIS
  getFinalResults() {
    const total = this.state.questions.length;
    const percentage = (this.state.score / total) * 100;

    // Calcula todos os domínios fracos (accuracy < 70%)
    const weakDomains = [];

    for (const [domainId, scoreData] of Object.entries(
      this.state.domainScores,
    )) {
      if (scoreData.total > 0) {
        const domainPct = (scoreData.correct / scoreData.total) * 100;
        if (domainPct < 70) {
          weakDomains.push(domainId);
        }
      }
    }

    return {
      attemptId: this.state.attemptId,
      quizId: this.state.quizId,
      certId: this.state.certId,
      score: this.state.score,
      total: total,
      percentage: percentage,
      passed: percentage >= this.PASSING_SCORE,
      domainScores: this.state.domainScores,
      weakDomains: weakDomains,
      answers: this.state.answers,
    };
  }

  /**
   * Carrega questões diretamente de uma lista pré-montada (ex: revisão de erros).
   *
   * @param {object[]} questions - Lista de questões já resolvida
   * @param {string} certId - ID da certificação (ex: 'clf-c02')
   * @param {object[]} domainsConfig - Config de domínios da certificação
   * @param {string} [mode='mistakes-review'] - Modo do quiz
   * @returns {{ success: boolean, totalQuestions?: number, message?: string }}
   */
  loadFromMistakes(questions, certId, domainsConfig, mode = "mistakes-review") {
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = normalizeCertificationId(certId);
    this.state.mode = mode;
    this.state.isReviewMode = mode === "mistakes-review";

    if (!questions || questions.length === 0) {
      return { success: false, message: "no_mistakes" };
    }

    // Normaliza cada questão do mistakes store para o formato interno do engine.
    const normalized = questions.map((q) => {
      const base = this._normalizeQuestion({
        ...q,
        correct:
          q.correct !== undefined
            ? q.correct
            : q.correctAnswer !== undefined
              ? q.correctAnswer
              : 0,
      });

      if (!base.id && q.questionId) {
        base.id = q.questionId;
      }
      return base;
    });

    // Embaralha a ordem das questões mas não embaralha as opções
    this.state.questions = this._shuffleArray(normalized);

    // Inicializa o placar de domínios
    domainsConfig.forEach((d) => {
      this.state.domainScores[d.id] = { total: 0, correct: 0 };
    });

    return { success: true, totalQuestions: this.state.questions.length };
  }

  /**
   * Carrega questões para revisão de erros baseado nos domínios que o usuário
   * errou, selecionando questões aleatórias do banco — não as questões exatas
   * que foram erradas. Isso evita que o usuário decore respostas específicas.
   *
   * Para cada domínio errado, seleciona até `questionsPerDomain` questões do
   * banco, priorizando questões que o usuário nunca viu (não estão no histórico
   * de erros). Se não houver suficientes questões novas, usa questões do domínio
   * que foram erradas antes.
   *
   * @param {object[]} mistakes - Registros de erros do storageManager.getMistakes()
   * @param {string} certId - ID da certificação (ex: 'clf-c02')
   * @param {object[]} domainsConfig - Config de domínios da certificação
   * @param {object[]} allQuestions - Banco completo de questões da certificação
   * @param {number} [questionsPerDomain=3] - Questões por domínio errado
   * @param {string} [mode='mistakes-review'] - Modo do quiz
   * @returns {{ success: boolean, totalQuestions?: number, message?: string }}
   */
  loadMistakesByDomain(
    mistakes,
    certId,
    domainsConfig,
    allQuestions,
    questionsPerDomain = 3,
    mode = "mistakes-review",
  ) {
    certId = normalizeCertificationId(certId);
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = certId;
    this.state.mode = mode;

    if (!mistakes || mistakes.length === 0) {
      return { success: false, message: "no_mistakes" };
    }

    if (!allQuestions || allQuestions.length === 0) {
      // Fallback para o método original se não houver banco de questões
      return this.loadFromMistakes(mistakes, certId, domainsConfig, mode);
    }

    // Coleta os domínios únicos errados, preservando a ordem mais recente
    const domainsErrados = [
      ...new Set(mistakes.filter((m) => m.domain).map((m) => m.domain)),
    ];

    if (domainsErrados.length === 0) {
      return this.loadFromMistakes(mistakes, certId, domainsConfig, mode);
    }

    // IDs das questões que o usuário já errou (para priorizar questões novas)
    const idsJaErrados = new Set(
      mistakes.map((m) => m.questionId).filter(Boolean),
    );

    const questoesSelecionadas = [];

    for (const domain of domainsErrados) {
      // Todas as questões do banco neste domínio
      const questoesDoDominio = allQuestions.filter(
        (q) => (q.domain || q.domainId) === domain,
      );

      if (questoesDoDominio.length === 0) continue;

      // Separa em novas (nunca erradas) e conhecidas (já erradas antes)
      const novas = questoesDoDominio.filter(
        (q) => !idsJaErrados.has(q.id) && !idsJaErrados.has(q.question_id),
      );
      const conhecidas = questoesDoDominio.filter(
        (q) => idsJaErrados.has(q.id) || idsJaErrados.has(q.question_id),
      );

      // Embaralha ambos os grupos e une: novas primeiro, conhecidas como fallback
      const pool = [
        ...this._shuffleArray(novas),
        ...this._shuffleArray(conhecidas),
      ];

      // Pega até questionsPerDomain questões deste domínio
      questoesSelecionadas.push(...pool.slice(0, questionsPerDomain));
    }

    if (questoesSelecionadas.length === 0) {
      return this.loadFromMistakes(mistakes, certId, domainsConfig, mode);
    }

    // Normaliza e embaralha as opções de cada questão selecionada
    this.state.questions = this._shuffleArray(
      questoesSelecionadas.map((q) =>
        this._shuffleOptions(this._normalizeQuestion(q)),
      ),
    );

    // Inicializa o placar de domínios
    domainsConfig.forEach((d) => {
      this.state.domainScores[d.id] = { total: 0, correct: 0 };
    });

    return { success: true, totalQuestions: this.state.questions.length };
  }

  // --- FUNÇÕES PRIVADAS DE UTILIDADE ---
  /**
   * Normalizes question from API or JSON to internal format
   * Handles field name differences between data sources
   * @private
   * @param {object} q - Question object from API or JSON
   * @returns {object} Normalized question
   */
  _normalizeQuestion(q) {
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
      ...q, // Preserve all original metadata for sanitization/validation
      id:
        q.id ||
        q.questionId ||
        generateQuestionId(q.question || q.question_text),
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

  _generateAttemptId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `attempt_${timestamp}_${random}`;
  }

  /**
   * Embaralha um array usando o algoritmo Fisher-Yates (Knuth shuffle).
   *
   * Este método garante uma distribuição uniforme verdadeira, ao contrário
   * do padrão .sort(() => Math.random() - 0.5), que cria viés significativo
   * no motor V8 do Chrome/Node.js.
   *
   * Complexidade: O(n) tempo, O(n) espaço (devido à cópia do array).
   *
   * @private
   * @param {Array} arr - Array a embaralhar
   * @returns {Array} Novo array embaralhado (não modifica o original)
   *
   * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
   * @see https://v8.dev/blog/array-sort (explicação do viés do .sort())
   */
  _shuffleArray(arr) {
    const shuffled = [...arr]; // Cria cópia para não mutar o original

    // Fisher-Yates: percorre de trás para frente, trocando cada elemento
    // com um elemento aleatório da porção ainda não embaralhada
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  _shuffleOptions(q) {
    const isMulti = Array.isArray(q.correct);

    // Mapeia as opções mantendo a referência se estão corretas
    let opts = q.options.map((t, i) => ({
      t,
      isCorrect: isMulti ? q.correct.includes(i) : i === q.correct,
    }));

    // Embaralha
    opts = this._shuffleArray(opts);

    // Reconstrói a propriedade 'correct' com os novos índices
    return {
      ...q,
      options: opts.map((o) => o.t),
      correct: isMulti
        ? opts
            .map((o, index) => (o.isCorrect ? index : -1))
            .filter((idx) => idx !== -1)
        : opts.findIndex((o) => o.isCorrect),
    };
  }
}
