import { logger } from "../utils/logger.js";
import { storageManager } from "../storageManager.js";
import { NotificationService } from "../services/notificationService.js";
import { ModalService } from "../services/modalService.js";

export class SimulatorEngineClient {
  constructor(level, caseId) {
    this.level = level;
    this.caseId = caseId;
    this.currentStage = 1;
    this.caseData = null;
    this.dialogues = [];
    this.services = [];
    this.selectedServices = new Set();
  }

  async init() {
    try {
      await this.loadCaseData();
      await this.loadDialogues();
      await this.loadServices();

      const activeCase = storageManager.loadActiveCase(this.caseId);
      if (activeCase) {
        const resumeAgreed = await ModalService.confirm({
          message: "Você tem um caso prático em andamento. Deseja retomar?",
        });
        if (resumeAgreed) {
          this.currentStage = activeCase.currentStage || 1;
          this.selectedServices = new Set(activeCase.selectedServices || []);
          if (activeCase.evaluation) {
            this.renderEvaluation(activeCase.evaluation);
          }
        } else {
          storageManager.clearActiveCase(this.caseId);
        }
      }

      this.renderBriefing();
      this.renderInterviewOptions();
      this.renderDesignBuilder();
      this.updateStepper(); // Garante o restore visual do stepper
    } catch (err) {
      logger.error("Failed to init simulator", err);
      NotificationService.error("Erro ao carregar simulação: " + err.message);
    }
  }

  async loadCaseData() {
    let response = await fetch('./api/cases?limit=100').catch(() => null);
    if (!response || !response.ok) {
        response = await fetch('./data/cases/architecture_cases.json').catch(() => null);
    }
    const data = await response.json();
    const cases = data.data || data;

    if (this.caseId) {
      this.caseData = cases.find(c => c.id === this.caseId);
    } else {
      this.caseData = cases.find(c => c.difficulty === this.level);
    }
    if (!this.caseData) throw new Error("Caso não encontrado");
    this.caseId = this.caseData.id;
  }

  async loadDialogues() {
    const res = await fetch(`/api/cases/${this.caseId}/dialogues`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.success) {
        this.dialogues = data.data;
        return;
      }
    }
    // Fallback: build dialogues from the JSON's questions
    if (this.caseData.questions) {
      this.dialogues = this.caseData.questions.map(q => ({
        question: q.question_text,
        answer: q.explanation || "Sem explicação detalhada disponível.",
        hints: q.options.map(o => o.text)
      }));
    } else {
      this.dialogues = [];
    }
  }

  async loadServices() {
    const res = await fetch("/api/services").catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.success) {
        this.services = data.data;
        return;
      }
    }
    // Fallback: just use the services listed in the case itself
    // In a real app we'd load all AWS services as distractors
    this.services = this.caseData.services || [];
  }

  saveState(evaluation = null) {
    storageManager.saveActiveCase(this.caseId, {
      currentStage: this.currentStage,
      selectedServices: Array.from(this.selectedServices),
      evaluation,
    });
  }

  setStage(stageNum) {
    this.currentStage = stageNum;
    this.updateStepper();

    document.querySelectorAll(".stage-content").forEach((el) => {
      el.classList.add("hidden");
    });
    document.getElementById(`stage-${stageNum}`).classList.remove("hidden");
    this.saveState();
  }

  updateStepper() {
    document.querySelectorAll(".stepper .step").forEach((el) => {
      el.classList.remove("active");
    });
    const currStep = document.getElementById(`step-${this.currentStage}`);
    if (currStep) currStep.classList.add("active");
  }

  renderBriefing() {
    const container = document.getElementById("briefingContent");
    container.innerHTML = `
            <h2>${this.caseData.title}</h2>
            <p><strong>Objetivo:</strong> ${this.caseData.objective}</p>
            <p><strong>Cenário:</strong> ${this.caseData.scenario}</p>
            ${
              this.caseData.constraints
                ? `
            <h4>Restrições</h4>
            <ul>
                ${this.caseData.constraints
                  .map((c) => `<li>${c}</li>`)
                  .join("")}
            </ul>
            `
                : ""
            }
        `;
  }

  renderInterviewOptions() {
    const optionsContainer = document.getElementById("chatOptions");
    optionsContainer.innerHTML = "";

    if (this.dialogues.length === 0) {
      optionsContainer.innerHTML =
        "<p>Nenhuma pergunta adicional disponível.</p>";
      return;
    }

    this.dialogues.forEach((dialogue) => {
      const btn = document.createElement("button");
      btn.className = "chat-option-btn";
      btn.textContent = dialogue.question;
      btn.onclick = () => this.askQuestion(dialogue, btn);
      optionsContainer.appendChild(btn);
    });
  }

  askQuestion(dialogue, btnEl) {
    btnEl.disabled = true;
    btnEl.style.opacity = "0.5";

    const history = document.getElementById("chatHistory");

    // Add user question
    const qDiv = document.createElement("div");
    qDiv.className = "chat-msg chat-user";
    qDiv.textContent = dialogue.question;
    history.appendChild(qDiv);

    // Simulate thinking
    setTimeout(() => {
      const aDiv = document.createElement("div");
      aDiv.className = "chat-msg chat-client";
      aDiv.innerHTML = dialogue.answer.replace(/\n/g, "<br>");

      if (dialogue.hints && dialogue.hints.length > 0) {
        aDiv.innerHTML += `<br><br><small style="color:var(--primary-color)">💡 Dica: ${dialogue.hints.join(", ")}</small>`;
      }

      history.appendChild(aDiv);
      history.scrollTop = history.scrollHeight;
    }, 800);
  }

  renderDesignBuilder() {
    const container = document.getElementById("designBuilder");
    container.innerHTML = "";

    // Group services by category
    const grouped = this.services.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {});

    for (const [category, services] of Object.entries(grouped)) {
      const catDiv = document.createElement("div");
      catDiv.className = "service-category";

      const title = document.createElement("h3");
      title.textContent = category;
      catDiv.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "service-grid";

      services.forEach((s) => {
        const id = s.id || s.slug || s.service_slug;
        const card = document.createElement("div");
        card.className = "service-card";
        if (this.selectedServices.has(id)) {
            card.classList.add("selected");
        }
        card.onclick = () => {
          if (this.selectedServices.has(id)) {
            this.selectedServices.delete(id);
            card.classList.remove("selected");
          } else {
            this.selectedServices.add(id);
            card.classList.add("selected");
          }
          this.saveState();
        };

        card.innerHTML = `
                    <div>
                        <strong>${s.name || s.service_name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary)">${s.short_desc || s.category}</div>
                    </div>
                `;
        grid.appendChild(card);
      });

      catDiv.appendChild(grid);
      container.appendChild(catDiv);
    }
  }

  async submitDesign() {
    if (this.selectedServices.size === 0) {
      NotificationService.error(
        "Selecione pelo menos um serviço para a sua arquitetura.",
      );
      return;
    }

    try {
      const res = await fetch(`/api/cases/${this.caseId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_service_ids: Array.from(this.selectedServices),
        }),
      }).catch(() => null);
      
      if (res && res.ok) {
          const data = await res.json();
          if (data.success) {
            this.renderEvaluation(data.data);
            this.saveState(data.data);
            return;
          }
      }

      // Local Fallback Evaluation
      const expected = this.caseData.services.map(s => s.id || s.slug || s.service_slug);
      const selected = Array.from(this.selectedServices);
      const correct = selected.filter(s => expected.includes(s));
      const score = expected.length > 0 ? Math.round((correct.length / expected.length) * 100) : 100;
      const passed = score >= 80;

      const evalData = {
        score,
        passed,
        feedback: passed ? "Parabéns, sua arquitetura está bem aderente aos requisitos do caso!" : "Atenção: faltaram alguns serviços cruciais para atingir todos os requisitos. Revise o gabarito.",
        missing_services: expected.filter(e => !selected.includes(e)),
        extra_services: selected.filter(s => !expected.includes(s))
      };

      this.renderEvaluation(evalData);
      this.saveState(evalData);

    } catch (err) {
      logger.error("Failed to submit design", err);
      NotificationService.error("Erro ao avaliar a arquitetura.");
    }
  }

  renderEvaluation(data) {
    const container = document.getElementById("evaluationResult");
    container.classList.remove("hidden");

    let html = `
            <h3 class="${data.passed ? "text-green-600" : "text-red-600"}">
                Avaliação: ${data.score}% - ${data.passed ? "Aprovado" : "Revisar"}
            </h3>
            <p style="margin: 1rem 0">${data.feedback}</p>
        `;

    if (data.missing_services && data.missing_services.length > 0) {
      html += `
                <div class="feedback-alert warning">
                    <strong>Faltou incluir:</strong> ${data.missing_services.join(", ")}
                </div>
            `;
    }

    if (data.extra_services && data.extra_services.length > 0) {
      html += `
                <div class="feedback-alert info">
                    <strong>Incluído a mais (Avalie se é necessário):</strong> ${data.extra_services.join(", ")}
                </div>
            `;
    }

    // Always show the reference graph if available
    if (this.caseData.architecture_graph && this.caseData.architecture_graph.type === 'mermaid') {
       html += `
           <div style="margin-top:2rem">
               <h4>Gabarito de Arquitetura</h4>
               <div class="mermaid" style="background:#f0f2f5; padding:1rem; border-radius:8px;">
                   ${this.caseData.architecture_graph.content}
               </div>
           </div>
       `;
    }

    container.innerHTML = html;
    
    // Tell mermaid to re-render if loaded
    if (window.mermaid) {
        window.mermaid.init(undefined, container.querySelectorAll('.mermaid'));
    }
  }
}
