// js/validation/validationUI.js
// Painel de validação de questões.
// O validador é identificado pelo usuário autenticado via X-User-Id — sem campo de nome manual.
const { ValidationStorage, ValidationAPI } = window;

class ValidationUI {
  constructor() {
    this.currentPendingCount = 0;
    this.selectedQuestionId = null;
    this.currentUser = null;
    this.initElements();
    this.bindEvents();
    this.loadDashboardStats();
    this.init();
  }

  initElements() {
    this.elements = {
      validatorStatus: document.getElementById("validator-status"),
      loginSection: document.getElementById("login-section"),
      loginEmailInput: document.getElementById("login-email"),
      btnLogin: document.getElementById("btn-login"),
      loginError: document.getElementById("login-error"),
      screenMessage: document.getElementById("screen-message"),
      questionsList: document.getElementById("questions-list"),
      statPending: document.getElementById("stat-pending"),
      statApproved: document.getElementById("stat-approved"),
      statRejected: document.getElementById("stat-rejected"),
      modalReject: document.getElementById("modal-reject"),
      rejectionReason: document.getElementById("rejection-reason"),
      btnConfirmReject: document.getElementById("btn-confirm-reject"),
      btnCancelReject: document.getElementById("btn-cancel-reject"),
    };
  }

  bindEvents() {
    this.elements.btnLogin?.addEventListener("click", () => this.doLogin());
    this.elements.loginEmailInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.doLogin();
    });
    this.elements.questionsList?.addEventListener("click", (e) =>
      this.handleQuestionAction(e),
    );
    this.elements.btnCancelReject?.addEventListener("click", () =>
      this.closeRejectModal(),
    );
    this.elements.btnConfirmReject?.addEventListener("click", () =>
      this.confirmRejection(),
    );
  }

  async init() {
    // Tenta restaurar sessão do localStorage
    const userId = localStorage.getItem("aws_sim_user_id");
    const role = localStorage.getItem("aws_sim_user_role");
    const nickname = localStorage.getItem("aws_sim_user_nickname") || localStorage.getItem("aws_sim_user_name");

    if (userId && (role === "VALIDATOR" || role === "ADMIN")) {
      this.currentUser = { id: userId, role, nickname: nickname || "Validador" };
      this.showAuthenticatedState();
      this.loadQuestions();
    } else if (userId) {
      // Usuário autenticado mas sem role de validação
      this.showMessage(
        `Acesso negado. Sua role (${role || "STUDENT"}) não permite validação de questões.`,
        "error",
      );
      if (this.elements.loginSection)
        this.elements.loginSection.classList.remove("hidden");
    } else {
      // Sem sessão — exibe formulário de login
      if (this.elements.loginSection)
        this.elements.loginSection.classList.remove("hidden");
      if (this.elements.questionsList)
        this.elements.questionsList.innerHTML =
          "<p class='loading-msg'>Faça login para acessar o painel de validação.</p>";
    }
  }

  async doLogin() {
    const email = this.elements.loginEmailInput?.value?.trim();
    if (!email) {
      this.showLoginError("Informe seu email corporativo @a3data.");
      return;
    }

    this.elements.btnLogin.disabled = true;
    this.elements.btnLogin.textContent = "Autenticando...";

    try {
      const response = await ValidationAPI.login(email);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Falha no login.");
      }

      const user = response.data;
      const role = user.role?.toUpperCase();

      if (role !== "VALIDATOR" && role !== "ADMIN") {
        this.showLoginError(
          `Acesso negado. Sua role (${role}) não permite validação de questões.`,
        );
        return;
      }

      // Persiste sessão
      localStorage.setItem("aws_sim_user_id", user.id);
      localStorage.setItem("aws_sim_user_role", user.role);
      localStorage.setItem(
        "aws_sim_user_nickname",
        user.nickname || email.split("@")[0],
      );

      this.currentUser = user;
      this.showAuthenticatedState();
      this.loadQuestions();
    } catch (error) {
      this.showLoginError(error.message || "Erro ao autenticar.");
    } finally {
      if (this.elements.btnLogin) {
        this.elements.btnLogin.disabled = false;
        this.elements.btnLogin.textContent = "Entrar";
      }
    }
  }

  showAuthenticatedState() {
    if (this.elements.loginSection)
      this.elements.loginSection.classList.add("hidden");
    if (this.elements.validatorStatus) {
      const display =
        this.currentUser.nickname || this.currentUser.email || "Validador";
      this.elements.validatorStatus.textContent = `Validador: ${display} (${this.currentUser.role})`;
      this.elements.validatorStatus.style.color = "#22c55e";
    }
  }

  showLoginError(msg) {
    if (this.elements.loginError) {
      this.elements.loginError.textContent = msg;
      this.elements.loginError.classList.remove("hidden");
    } else {
      this.showMessage(msg, "error");
    }
  }

  showMessage(message, type = "info") {
    if (!this.elements.screenMessage) return;
    this.elements.screenMessage.textContent = message;
    this.elements.screenMessage.className = `screen-message ${type}`;
  }

  loadDashboardStats() {
    const stats = ValidationStorage.getTodayStats();
    if (this.elements.statApproved)
      this.elements.statApproved.innerText = stats.approved;
    if (this.elements.statRejected)
      this.elements.statRejected.innerText = stats.rejected;
  }

  updatePendingCount(count) {
    this.currentPendingCount = Math.max(0, count);
    if (this.elements.statPending)
      this.elements.statPending.innerText = this.currentPendingCount;
  }

  async loadQuestions() {
    if (!this.elements.questionsList) return;
    this.elements.questionsList.innerHTML =
      "<p class='loading-msg'>Carregando questões pendentes...</p>";

    try {
      const userId = this.currentUser?.id;
      const response = await ValidationAPI.fetchPendingQuestions(userId);
      if (!response.success) throw new Error("Resposta inválida da API.");

      this.renderQuestions(response.data);
      this.updatePendingCount(response.data.length);
      this.showMessage("Questões pendentes carregadas.", "success");
    } catch (error) {
      this.updatePendingCount(0);
      this.elements.questionsList.innerHTML =
        "<p class='loading-msg'>Erro ao carregar questões pendentes.</p>";
      this.showMessage(error.message || "Erro ao carregar questões.", "error");
    }
  }

  renderQuestions(questions) {
    if (!this.elements.questionsList) return;
    if (questions.length === 0) {
      this.elements.questionsList.innerHTML =
        "<p class='loading-msg'>Tudo limpo! Nenhuma questão pendente.</p>";
      return;
    }

    this.elements.questionsList.innerHTML = "";
    questions.forEach((question) => {
      const card = document.createElement("article");
      card.className = "question-card";
      card.id = `card-${question.id}`;
      card.innerHTML = this.buildQuestionCardHTML(question);
      this.elements.questionsList.appendChild(card);
    });
  }

  buildQuestionCardHTML(question) {
    const certification = this.escapeHTML(question.certification || "N/A");
    const domain = this.escapeHTML(question.domain || "Sem domínio");
    const difficulty = this.escapeHTML(question.difficulty || "N/A");
    const status = this.escapeHTML(
      question.validation_status || question.status || "pending",
    );
    const questionText = this.escapeHTML(
      question.question_text || question.text || "",
    );
    const explanation = this.escapeHTML(
      question.explanation || "Sem explicação cadastrada.",
    );
    const correctAnswers = this.getCorrectAnswers(question);
    const optionsHTML = this.buildOptionsHTML(question.options, correctAnswers);

    return `
            <div class="question-header">
                <div class="question-meta">
                    <span class="badge-domain">${domain}</span>
                    <span>${certification}</span>
                    <span>${difficulty}</span>
                    <span class="status-pill ${status}">${status}</span>
                </div>
                <small>ID: ${this.escapeHTML(question.id)}</small>
            </div>
            <p><strong>${questionText}</strong></p>
            <ul class="options-list">${optionsHTML}</ul>
            <div class="explanation-box">
                <strong>Resposta correta:</strong> ${this.escapeHTML(correctAnswers.join(", ") || "N/A")}<br>
                <strong>Explicação:</strong> ${explanation}
            </div>
            <div class="card-actions">
                <button type="button" class="btn-reject" data-action="reject" data-id="${this.escapeHTML(question.id)}">Reprovar</button>
                <button type="button" class="btn-edit" disabled title="Edição em breve">Editar em breve</button>
                <button type="button" class="btn-approve" data-action="approve" data-id="${this.escapeHTML(question.id)}">Aprovar</button>
            </div>
        `;
  }

  buildOptionsHTML(options, correctAnswers) {
    const normalized = Array.isArray(options)
      ? options
      : Object.entries(options || {}).map(([id, text]) => ({ id, text }));

    return normalized
      .map((option) => {
        const id = String(option.id);
        const isCorrect = correctAnswers.includes(id);
        const className = isCorrect ? ' class="correct"' : "";
        return `
                <li${className}>
                    <span class="answer-label">${this.escapeHTML(id)})</span>
                    ${this.escapeHTML(option.text)}
                    ${isCorrect ? " ✓" : ""}
                </li>
            `;
      })
      .join("");
  }

  getCorrectAnswers(question) {
    const raw = question.correct_answer || question.correctAnswer || [];
    return Array.isArray(raw) ? raw.map(String) : [String(raw)];
  }

  handleQuestionAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "approve") this.approveQuestion(id);
    if (action === "reject") this.openRejectModal(id);
  }

  async approveQuestion(id) {
    if (!this.ensureAuth()) return;

    const button = document.querySelector(`#card-${id} .btn-approve`);
    this.setButtonLoading(button, "Processando...");

    const payload = {
      status: "APPROVED",
      validated_by: this.currentUser.nickname || this.currentUser.email,
    };

    try {
      const response = await ValidationAPI.validateQuestion(
        id,
        payload,
        this.currentUser.id,
      );
      if (!response.success) throw new Error("Aprovação não confirmada.");

      this.finishQuestion(id);
      ValidationStorage.incrementApproved();
      this.loadDashboardStats();
      this.showMessage("Questão aprovada.", "success");
    } catch (error) {
      this.showMessage(error.message || "Erro ao aprovar questão.", "error");
      this.restoreButton(button, "Aprovar");
    }
  }

  openRejectModal(id) {
    if (!this.ensureAuth()) return;
    this.selectedQuestionId = id;
    if (this.elements.rejectionReason) this.elements.rejectionReason.value = "";
    this.elements.modalReject?.classList.remove("hidden");
    this.elements.rejectionReason?.focus();
  }

  closeRejectModal() {
    this.selectedQuestionId = null;
    this.elements.modalReject?.classList.add("hidden");
  }

  async confirmRejection() {
    const reason = this.elements.rejectionReason?.value?.trim();
    if (!reason || reason.length < 10) {
      this.showMessage(
        "Informe um motivo com pelo menos 10 caracteres.",
        "error",
      );
      return;
    }

    const id = this.selectedQuestionId;
    if (!id) {
      this.showMessage("Nenhuma questão selecionada.", "error");
      return;
    }

    const payload = {
      status: "REJECTED",
      rejection_reason: reason,
      validated_by: this.currentUser.nickname || this.currentUser.email,
    };

    this.setButtonLoading(this.elements.btnConfirmReject, "Processando...");

    try {
      const response = await ValidationAPI.validateQuestion(
        id,
        payload,
        this.currentUser.id,
      );
      if (!response.success) throw new Error("Reprovação não confirmada.");

      this.closeRejectModal();
      this.finishQuestion(id);
      ValidationStorage.incrementRejected();
      this.loadDashboardStats();
      this.showMessage("Questão reprovada.", "success");
    } catch (error) {
      this.showMessage(error.message || "Erro ao reprovar questão.", "error");
    } finally {
      this.restoreButton(
        this.elements.btnConfirmReject,
        "Confirmar Reprovação",
      );
    }
  }

  finishQuestion(id) {
    this.removeCard(id);
    this.updatePendingCount(this.currentPendingCount - 1);

    if (this.currentPendingCount === 0) {
      setTimeout(() => {
        if (this.elements.questionsList)
          this.elements.questionsList.innerHTML =
            "<p class='loading-msg'>Tudo limpo! Nenhuma questão pendente.</p>";
      }, 320);
    }
  }

  removeCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;
    card.style.opacity = "0";
    card.style.transform = "translateY(8px)";
    setTimeout(() => card.remove(), 300);
  }

  ensureAuth() {
    if (this.currentUser) return true;
    this.showMessage(
      "Faça login com seu email @a3data para realizar validações.",
      "error",
    );
    this.elements.loginEmailInput?.focus();
    return false;
  }

  setButtonLoading(button, label) {
    if (!button) return;
    button.disabled = true;
    button.dataset.originalText = button.innerText;
    button.innerText = label;
  }

  restoreButton(button, fallbackText) {
    if (!button) return;
    button.disabled = false;
    button.innerText = button.dataset.originalText || fallbackText;
    delete button.dataset.originalText;
  }

  escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

window.validationApp = new ValidationUI();
