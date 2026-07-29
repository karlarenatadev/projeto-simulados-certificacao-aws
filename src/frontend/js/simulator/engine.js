import { logger } from "../utils/logger.js";
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
      this.renderBriefing();
      this.renderInterviewOptions();
      this.renderDesignBuilder();
    } catch (err) {
      logger.error("Failed to init simulator", err);
      alert("Erro ao carregar simulação: " + err.message);
    }
  }

  async loadCaseData() {
    // If we only have level, fetch the first available case for that level
    let url = this.caseId
      ? `/api/cases/${this.caseId}`
      : `/api/cases?difficulty=${this.level}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || (Array.isArray(data.data) && data.data.length === 0)) {
      throw new Error("Nenhum caso encontrado para este nível.");
    }

    this.caseData = Array.isArray(data.data) ? data.data[0] : data.data;
    this.caseId = this.caseData.id;
  }

  async loadDialogues() {
    const res = await fetch(`/api/cases/${this.caseId}/dialogues`);
    const data = await res.json();
    if (data.success) {
      this.dialogues = data.data;
    }
  }

  async loadServices() {
    const res = await fetch("/api/services");
    const data = await res.json();
    if (data.success) {
      this.services = data.data;
    }
  }

  renderBriefing() {
    const content = document.getElementById("briefingContent");
    const persona = this.caseData.client_persona || {};
    content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <strong>De:</strong> ${persona.name || "Cliente"} (${persona.role || "Stakeholder"})<br>
                <strong>Assunto:</strong> ${this.caseData.title}
            </div>
            <p>${this.caseData.scenario.replace(/\n/g, "<br>")}</p>
            <br>
            <strong>Objetivo principal:</strong>
            <p>${this.caseData.objective}</p>
            
            ${this.caseData.budget_usd ? `<p><strong>Orçamento mensal estimado:</strong> U$ ${this.caseData.budget_usd}</p>` : ""}
            
            ${
              this.caseData.constraints && this.caseData.constraints.length > 0
                ? `
            <br><strong>Restrições conhecidas:</strong>
            <ul>
                ${this.caseData.constraints.map((c) => `<li>${c}</li>`).join("")}
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
        const card = document.createElement("div");
        card.className = "service-card";
        card.onclick = () => {
          if (this.selectedServices.has(s.id)) {
            this.selectedServices.delete(s.id);
            card.classList.remove("selected");
          } else {
            this.selectedServices.add(s.id);
            card.classList.add("selected");
          }
        };

        card.innerHTML = `
                    <div>
                        <strong>${s.name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary)">${s.short_desc}</div>
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
      alert("Selecione pelo menos um serviço para a sua arquitetura.");
      return;
    }

    const res = await fetch(`/api/cases/${this.caseId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selected_service_ids: Array.from(this.selectedServices),
      }),
    });

    const data = await res.json();
    if (data.success) {
      this.renderEvaluation(data.data);
      this.nextStage();
    } else {
      alert("Erro ao avaliar: " + data.message);
    }
  }

  renderEvaluation(evaluation) {
    const container = document.getElementById("evaluationContent");

    let html = `
            <div class="score-display">
                <div class="score-circle">${evaluation.finalPercentage}%</div>
                <p>Aderência ao Well-Architected Framework</p>
            </div>
        `;

    if (evaluation.missingCritical.length > 0) {
      html += `
                <div class="email-card" style="border-color: #e74c3c;">
                    <strong style="color: #e74c3c">⚠️ Serviços Críticos Faltantes:</strong>
                    <p>${evaluation.missingCritical.join(", ")}</p>
                </div>
            `;
    }

    for (const [pillar, data] of Object.entries(evaluation.pillars)) {
      if (data.max > 0 || data.feedback.length > 0) {
        html += `
                    <div class="pillar-card">
                        <div class="pillar-header">
                            <span>${pillar.charAt(0).toUpperCase() + pillar.slice(1)}</span>
                            <span>${data.percentage}%</span>
                        </div>
                        <div>
                            ${data.feedback
                              .map(
                                (f) => `
                                <div class="feedback-item">
                                    <span class="${f.impact > 0 ? "impact-pos" : f.impact < 0 ? "impact-neg" : ""}">
                                        ${f.impact > 0 ? "✓" : f.impact < 0 ? "✗" : "-"}
                                    </span>
                                    <span><strong>${f.service}</strong>: ${f.message}</span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                `;
      }
    }

    container.innerHTML = html;
  }

  updateStepper() {
    document.querySelectorAll(".step").forEach((s, idx) => {
      if (idx + 1 === this.currentStage) s.classList.add("active");
      else s.classList.remove("active");
    });

    document.querySelectorAll(".stage-panel").forEach((p, idx) => {
      if (idx + 1 === this.currentStage) p.classList.add("active");
      else p.classList.remove("active");
    });
  }

  nextStage() {
    if (this.currentStage < 4) {
      this.currentStage++;
      this.updateStepper();
    }
  }

  prevStage() {
    if (this.currentStage > 1) {
      this.currentStage--;
      this.updateStepper();
    }
  }
}
