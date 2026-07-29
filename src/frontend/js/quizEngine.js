/**
 * js/quizEngine.js
 * Motor de lógica pura do Simulado.
 * Zero manipulação de DOM (HTML/CSS) acontece aqui.
 *
 * Now integrates with REST API for question loading.
 */

import apiService from "../services/api.js";

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
      const manifestRes = await fetch("data/certification-manifest.json");
      if (!manifestRes.ok) {
        console.warn("⚠️ Não foi possível carregar o manifesto. Sanitização ignorada.");
        return data;
      }
      const manifest = await manifestRes.json();
      const config = manifest[certId];
      if (!config) {
        console.warn(`⚠️ Certificação ${certId} ausente no manifesto.`);
        return data;
      }
      
      const sanitized = data.filter(q => {
        if (!q.questionId) return false;
        if (q.certId !== certId) return false;
        if (!config.allowedDomains.includes(q.domain)) return false;
        if (q.validation?.status !== 'validated') return false;
        return true;
      });

      console.log(`🛡️ Sanitização: ${sanitized.length}/${data.length} questões aprovadas.`);
      return sanitized;
    } catch (e) {
      console.error("Erro na sanitização:", e);
      return data;
    }
  }

  async loadQuestions(certId, domainsConfig, filters, language = "pt") {
    this.resetState();
    this.state.attemptId = this._generateAttemptId();
    this.state.certId = certId;
    this.state.mode = filters.mode || "exam";

    try {
      // Try loading from API first
      let data = null;

      try {
        const response = await apiService.loadQuestions({
          certification: certId,
          difficulty:
            filters.difficulty !== "all" ? filters.difficulty : undefined,
          domain: filters.topic || undefined,
          limit: filters.quantity,
        });

        if (response.success && response.data && response.data.length > 0) {
          data = response.data;
          console.log(`✓ Loaded ${data.length} questions from API`);
        }
      } catch (apiError) {
        console.warn("API request failed, falling back to JSON:", apiError);
        // Continue to fallback
      }

      // Fallback to JSON if API fails
      if (!data || data.length === 0) {
        const fileSuffix = language === "en" ? "-en" : "";
        const response = await fetch(`data/${certId}${fileSuffix}.json`);
        if (!response.ok)
          throw new Error("Arquivo de questões não encontrado.");

        data = await response.json();
        console.log(`✓ Loaded ${data.length} questions from JSON file`);
      }

      // Apply filters only if from JSON (API already filters)
      if (filters.difficulty !== "all") {
        data = data.filter((q) => q.difficulty === filters.difficulty);
      }
      if (filters.topic) {
        data = data.filter((q) => q.domain === filters.topic);
      }

      if (data.length === 0)
        throw new Error("Nenhuma questão encontrada com esses filtros.");

      // Aplica a sanitização do manifesto (Blindagem)
      data = await this._sanitizeQuestions(data, certId);
      if (data.length === 0)
        throw new Error("Nenhuma questão válida restou após a sanitização.");

      // Normalize question structure to match internal format
      // API may return different field names, so we map them
      data = data.map((q) => this._normalizeQuestion(q));

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
    this.state.certId = certId;
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
          console.log(
            `✓ Loaded ${data.length} questions from API for personalized quiz`,
          );
        }
      } catch (apiError) {
        console.warn(
          "API request failed for personalized quiz, falling back to JSON:",
          apiError,
        );
      }

      if (!data || data.length === 0) {
        const fileSuffix = language === "en" ? "-en" : "";
        let response = await fetch(`data/${certId}${fileSuffix}.json`);

        if (!response.ok && language === "en") {
          response = await fetch(`data/${certId}.json`);
        }

        if (!response.ok)
          throw new Error("Arquivo de questões não encontrado.");

        data = await response.json();
        console.log(
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
    this.state.certId = certId;
    this.state.mode = "diagnostic"; // Isola o estado do simulado real

    try {
      let data = null;

      // Try API first
      try {
        const response = await apiService.loadQuestions({
          certification: certId,
          search: "diagnostic", // Attempt to filter for diagnostic questions
          limit: 50,
        });

        if (response.success && response.data && response.data.length > 0) {
          data = response.data;
          console.log(`✓ Loaded ${data.length} diagnostic questions from API`);
        }
      } catch (apiError) {
        console.warn(
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
          console.warn(
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
        console.log(
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
      console.error("Erro no QuizEngine (Nivelamento):", error);
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
    this.state.certId = certId;
    this.state.mode = mode;

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

  // --- FUNÇÕES PRIVADAS DE UTILIDADE ---
  /**
   * Normalizes question from API or JSON to internal format
   * Handles field name differences between data sources
   * @private
   * @param {object} q - Question object from API or JSON
   * @returns {object} Normalized question
   */
  _normalizeQuestion(q) {
    return {
      id: q.id || q.question_id || undefined,
      domain: q.domain || q.domainId || "0",
      difficulty: q.difficulty || "medium",
      question: q.question || q.question_text || "",
      options: q.options || [],
      correct: q.correct || q.correct_answer || q.correctAnswer || 0,
      explanation: q.explanation || "",
      reference_url: q.reference_url || q.referenceUrl || undefined,
      validated_by: q.validated_by || q.validatedBy || undefined,
      // Keep original fields as fallback
      ...q,
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
