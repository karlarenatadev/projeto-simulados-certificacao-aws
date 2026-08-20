import { getCurrentLanguage } from "../../js/core/languageManager.js";
import { t } from "../../js/i18n/useTranslation.js";
import { AuthService } from "../../js/services/authService.js";
import { initShell } from "../../js/shell.js";

const VALIDATION_ROLES = new Set(["VALIDATOR", "ADMIN"]);
const tr = (key, variables) => t(key, getCurrentLanguage(), variables);

function createTextElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = String(value ?? "");
  return element;
}

export function renderValidationQuestion(question, labels) {
  const article = document.createElement("article");
  article.className = "question-card";
  article.dataset.questionId = String(question.id ?? "");

  const heading = document.createElement("h3");
  heading.append(
    document.createTextNode(
      `${String(question.certification ?? "")} — ${String(question.domain ?? "")}`,
    ),
  );

  const prompt = createTextElement("p", "", question.question_text ?? "");
  const optionsList = document.createElement("ol");
  for (const option of question.options || []) {
    const item = document.createElement("li");
    const optionId = createTextElement("strong", "", option?.id ?? "");
    item.append(
      optionId,
      document.createTextNode(` ${option?.text ?? option ?? ""}`),
    );
    optionsList.appendChild(item);
  }

  const approveButton = createTextElement(
    "button",
    "btn-primary",
    labels.approve,
  );
  approveButton.type = "button";
  approveButton.dataset.action = "approve";
  approveButton.dataset.id = String(question.id ?? "");

  const rejectButton = createTextElement("button", "btn-danger", labels.reject);
  rejectButton.type = "button";
  rejectButton.dataset.action = "reject";
  rejectButton.dataset.id = String(question.id ?? "");

  article.append(heading, prompt, optionsList, approveButton, rejectButton);
  return article;
}

class ValidationUI {
  constructor() {
    this.user = null;
    this.selectedQuestionId = null;
    this.elements = Object.fromEntries(
      [
        "validator-status",
        "screen-message",
        "questions-list",
        "stat-pending",
        "stat-approved",
        "stat-rejected",
        "modal-reject",
        "rejection-reason",
        "btn-confirm-reject",
        "btn-cancel-reject",
      ].map((id) => [id, document.getElementById(id)]),
    );
    this.bindEvents();
    this.restoreOfficialSession();
  }

  async restoreOfficialSession() {
    try {
      const user = await AuthService.restoreSession();
      if (!user) {
        this.showMessage(tr("validation_session_required"), "error");
        return;
      }
      initShell(user);
      this.setUser(user);
    } catch (error) {
      this.showMessage(error.message || tr("common_api_error"), "error");
    }
  }

  setUser(user) {
    this.user = user;
    const role = String(user.role || "").toUpperCase();
    if (!VALIDATION_ROLES.has(role)) {
      this.showMessage(
        tr("validation_role_denied", { role: role || "STUDENT" }),
        "error",
      );
      return;
    }
    this.elements["validator-status"].textContent =
      `${tr("validation_authenticated_as")} ${user.name || user.email} (${role})`;
    this.loadQuestions();
    this.loadStats();
  }

  bindEvents() {
    this.elements["questions-list"]?.addEventListener("click", (event) =>
      this.handleAction(event),
    );
    this.elements["btn-cancel-reject"]?.addEventListener("click", () =>
      this.closeReject(),
    );
    this.elements["btn-confirm-reject"]?.addEventListener("click", () =>
      this.reject(),
    );
  }

  async loadQuestions() {
    try {
      const response = await window.ValidationAPI.fetchPendingQuestions();
      const questions = response.data || [];
      this.elements["stat-pending"].textContent = String(questions.length);
      const list = this.elements["questions-list"];
      if (!questions.length) {
        list.replaceChildren(
          createTextElement("p", "loading-msg", tr("admin_validation_empty")),
        );
        return;
      }
      const labels = {
        approve: tr("admin_validation_approve"),
        reject: tr("admin_validation_reject"),
      };
      list.replaceChildren(
        ...questions.map((question) =>
          renderValidationQuestion(question, labels),
        ),
      );
    } catch (error) {
      this.showMessage(
        error.status === 401 || error.status === 403
          ? tr("common_unauthorized")
          : tr("validation_api_required"),
        "error",
      );
    }
  }

  async loadStats() {
    try {
      const [approved, rejected] = await Promise.all([
        window.ValidationAPI.fetchValidationHistory("APPROVED"),
        window.ValidationAPI.fetchValidationHistory("REJECTED"),
      ]);
      this.elements["stat-approved"].textContent = String(
        (approved.data || []).length,
      );
      this.elements["stat-rejected"].textContent = String(
        (rejected.data || []).length,
      );
    } catch {
      this.elements["stat-approved"].textContent = "0";
      this.elements["stat-rejected"].textContent = "0";
    }
  }

  handleAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    this.selectedQuestionId = button.dataset.id;
    if (button.dataset.action === "approve") this.validate("APPROVED");
    else this.elements["modal-reject"]?.classList.remove("hidden");
  }

  async validate(status, rejectionReason = null) {
    try {
      await window.ValidationAPI.validateQuestion(this.selectedQuestionId, {
        status,
        rejection_reason: rejectionReason,
      });
      this.closeReject();
      await Promise.all([this.loadQuestions(), this.loadStats()]);
    } catch (error) {
      this.showMessage(
        error.status === 401 || error.status === 403
          ? tr("common_unauthorized")
          : error.message || tr("common_api_error"),
        "error",
      );
    }
  }

  reject() {
    const reason = this.elements["rejection-reason"]?.value?.trim();
    if (!reason || reason.length < 10) {
      this.showMessage(tr("validation_rejection_min"), "error");
      return;
    }
    this.validate("REJECTED", reason);
  }

  closeReject() {
    this.elements["modal-reject"]?.classList.add("hidden");
  }

  showMessage(message, type = "info") {
    const element = this.elements["screen-message"];
    if (!element) return;
    element.textContent = message;
    element.className = `screen-message ${type}`;
  }
}

window.validationApp = new ValidationUI();
