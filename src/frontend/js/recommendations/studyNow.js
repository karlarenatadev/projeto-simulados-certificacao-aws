/**
 * Study Now ("O Que Estudar Agora")
 * Componente isolado de recomendacao que exibe na sidebar os 3 dominios com
 * maior taxa de erro do usuario, com links para a documentacao oficial AWS e
 * um botao que inicia um quiz filtrado pelo dominio mais fraco.
 *
 * @module recommendations/studyNow
 */

import apiService from "../../services/api.js";
import { userManager } from "../userManager.js";
import { storageManager } from "../storageManager.js";
import { certificationPaths } from "../data.js";

const CONTENT_ID = "weak-domains-content";
const WEAK_THRESHOLD = 70;
const MAX_DOMAINS = 3;

const AWS_STUDY_LINKS = {
  "conceitos-cloud":
    "https://aws.amazon.com/pt/getting-started/cloud-essentials/",
  "cloud-concepts":
    "https://aws.amazon.com/pt/getting-started/cloud-essentials/",
  seguranca:
    "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
  security:
    "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
  "security-compliance":
    "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html",
  tecnologia: "https://aws.amazon.com/pt/products/",
  faturamento:
    "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html",
  "billing-cost-management":
    "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html",
  "design-resiliente":
    "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
  "design-resilient-architectures":
    "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
  "design-performance":
    "https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html",
  "design-high-performing-architectures":
    "https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html",
  "seguranca-aplicacoes":
    "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
  "design-secure-architectures":
    "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
  "design-custo":
    "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
  "design-cost-optimized-architectures":
    "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
  "fundamentals-ai-ml": "https://aws.amazon.com/pt/machine-learning/learn/",
  "inteligencia-artificial":
    "https://aws.amazon.com/pt/machine-learning/learn/",
  "fundamentals-genai": "https://aws.amazon.com/pt/generative-ai/",
  "applications-foundation-models": "https://aws.amazon.com/pt/bedrock/",
  "guidelines-responsible-ai":
    "https://aws.amazon.com/pt/machine-learning/responsible-ai/",
  "security-compliance-governance":
    "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html",
  "desenvolvimento-servicos": "https://aws.amazon.com/pt/developer/",
  development: "https://aws.amazon.com/pt/developer/",
  "seguranca-app":
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
  implementacao: "https://aws.amazon.com/pt/products/developer-tools/",
  deployment: "https://aws.amazon.com/pt/products/developer-tools/",
  "resolucao-problemas":
    "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
  "troubleshooting-performance":
    "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
  arquitetura: "https://aws.amazon.com/pt/architecture/well-architected/",
  automacao:
    "https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html",
  rede: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
  operacoes:
    "https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html",
  "cloud-storage":
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
};

let onStudyWeakest = null;

/**
 * Inicializa o componente, registrando o callback que inicia um quiz filtrado.
 *
 * @param {object} options
 * @param {(domainId: string, certId: string|null) => void} options.startFilteredQuiz
 */
export function initStudyNow({ startFilteredQuiz } = {}) {
  onStudyWeakest =
    typeof startFilteredQuiz === "function" ? startFilteredQuiz : null;
}

function getContainer() {
  return document.getElementById(CONTENT_ID);
}

function getDomainName(id) {
  for (const cert of Object.values(certificationPaths)) {
    const found = cert.domains?.find((d) => d.id === id);
    if (found) return found.name;
  }
  return id;
}

function getCertForDomain(id) {
  for (const [certId, cert] of Object.entries(certificationPaths)) {
    if (cert.domains?.some((d) => d.id === id)) return certId;
  }
  return null;
}

function severityForAccuracy(accuracy) {
  if (accuracy === null || accuracy < 40) return "high";
  if (accuracy < 55) return "medium";
  return "low";
}

function renderEmpty(message, success = false) {
  const container = getContainer();
  if (!container) return;
  const cls = success ? "study-now-success" : "study-now-empty";
  const icon = success ? '<i class="fa-solid fa-circle-check"></i> ' : "";
  container.innerHTML = `<p class="${cls}">${icon}${message}</p>`;
}

function render(domains) {
  const container = getContainer();
  if (!container) return;

  const items = domains
    .map((d, i) => {
      const domainKey = d.domain || d.id || String(d);
      const label = getDomainName(domainKey);
      const link = AWS_STUDY_LINKS[domainKey] || null;
      const accuracy = typeof d.accuracy === "number" ? d.accuracy : null;
      const pct = accuracy === null ? "--" : Math.round(accuracy);
      const severity = severityForAccuracy(accuracy);
      const studyLink = link
        ? `<a href="${link}" target="_blank" rel="noopener noreferrer" class="study-now-link">Estudar <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
        : "";

      return `<div class="study-now-item">
        <span class="study-now-rank">${i + 1}.</span>
        <span class="study-now-label" title="${label}">${label}</span>
        <span class="study-now-badge study-now-badge--${severity}">${pct}%</span>
        ${studyLink}
      </div>`;
    })
    .join("");

  const weakest = domains[0]?.domain || domains[0]?.id || null;
  const button = weakest
    ? `<button type="button" class="study-now-btn" data-domain="${weakest}">
        <i class="fa-solid fa-bolt"></i> Estudar Meus Pontos Fracos
      </button>`
    : "";

  container.innerHTML = `<div class="study-now-list">${items}</div>${button}`;

  const btn = container.querySelector(".study-now-btn");
  if (btn && onStudyWeakest) {
    btn.addEventListener("click", () => {
      const domainId = btn.getAttribute("data-domain");
      onStudyWeakest(domainId, getCertForDomain(domainId));
    });
  }
}

/**
 * Busca os dominios fracos na API e re-renderiza o card.
 * Deve ser chamado no carregamento e apos cada quiz concluido.
 */
export async function refreshStudyNow() {
  const container = getContainer();
  if (!container) return;

  const userId = userManager.getUserId();
  if (!userId || userId.startsWith("local_")) {
    renderEmpty("Complete um quiz para ver suas áreas de foco.");
    return;
  }

  container.innerHTML = '<p class="study-now-loading">Analisando dados...</p>';

  try {
    const response = await apiService.getWeakDomains(userId, WEAK_THRESHOLD);
    if (!response.success) throw new Error("API error");

    const domains = (response.data?.weak_domains || []).slice(0, MAX_DOMAINS);

    if (domains.length === 0) {
      const history = storageManager.getHistory();
      const hasHistory = Array.isArray(history) && history.length > 0;
      if (hasHistory) {
        renderEmpty("Mandando bem! Nenhum domínio abaixo de 70%.", true);
      } else {
        renderEmpty("Complete um quiz para ver suas áreas de foco.");
      }
      return;
    }

    render(domains);
  } catch {
    renderEmpty("Não foi possível carregar suas áreas de foco.");
  }
}
