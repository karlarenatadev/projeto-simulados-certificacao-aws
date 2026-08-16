import { normalizeServiceId } from "../utils/serviceIdentity.js";
import { logger } from "../utils/logger.js";

const FALLBACK_ICON = Object.freeze({
  type: "fontawesome",
  value: "fa-solid fa-cloud",
});

// The legacy catalog remains only as a compatibility fallback while the
// remaining Cases are migrated. It is never used as a Case's answer key.
export const LEGACY_PALETTE = Object.freeze([
  ["amazon-ec2", "Amazon EC2", "Compute", "fa-solid fa-server"],
  ["aws-lambda", "AWS Lambda", "Compute", "fa-solid fa-bolt"],
  ["amazon-ecs", "Amazon ECS", "Compute", "fa-solid fa-box"],
  ["amazon-auto-scaling", "Auto Scaling", "Compute", "https://icon.icepanel.io/AWS/svg/Compute/Auto-Scaling.svg"],
  ["amazon-s3", "Amazon S3", "Storage", "fa-solid fa-bucket"],
  ["amazon-ebs", "Amazon EBS", "Storage", "fa-solid fa-hard-drive"],
  ["amazon-efs", "Amazon EFS", "Storage", "fa-solid fa-folder-tree"],
  ["amazon-rds", "Amazon RDS", "Database", "fa-solid fa-database"],
  ["amazon-dynamodb", "Amazon DynamoDB", "Database", "fa-solid fa-table-list"],
  ["amazon-elasticache", "Amazon ElastiCache", "Database", "https://icon.icepanel.io/AWS/svg/Database/ElastiCache.svg"],
  ["amazon-vpc", "Amazon VPC", "Networking", "fa-solid fa-network-wired"],
  ["amazon-cloudfront", "Amazon CloudFront", "Networking", "https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/CloudFront.svg"],
  ["amazon-api-gateway", "Amazon API Gateway", "Networking", "https://icon.icepanel.io/AWS/svg/App-Integration/API-Gateway.svg"],
  ["elastic-load-balancing", "Elastic Load Balancing", "Networking", "https://icon.icepanel.io/AWS/svg/Networking-Content-Delivery/Elastic-Load-Balancing.svg"],
  ["amazon-route53", "Amazon Route 53", "Networking", "fa-solid fa-route"],
  ["aws-iam", "AWS IAM", "Security", "fa-solid fa-id-card"],
  ["aws-kms", "AWS KMS", "Security", "fa-solid fa-key"],
  ["aws-waf", "AWS WAF", "Security", "fa-solid fa-shield-halved"],
  ["amazon-sqs", "Amazon SQS", "Messaging", "fa-solid fa-envelope"],
  ["amazon-sns", "Amazon SNS", "Messaging", "fa-solid fa-bell"],
  ["amazon-cloudwatch", "Amazon CloudWatch", "Monitoring", "https://icon.icepanel.io/AWS/svg/Management-Governance/CloudWatch.svg"],
  ["aws-cloudtrail", "AWS CloudTrail", "Monitoring", "fa-solid fa-shoe-prints"],
  ["user", "User / Client", "External", "fa-solid fa-user"],
  ["internet", "Internet", "External", "fa-solid fa-cloud"],
].map(([slug, name, category, icon]) => ({ slug, name, category, icon })));

function rawSlug(value) {
  return String(value || "").trim().toLowerCase();
}

/** Preserve canonical dataset slugs; use normalizeServiceId for comparisons. */
export function serviceSlug(service) {
  const raw = rawSlug(service?.service_slug || service?.slug || service);
  const normalized = normalizeServiceId(raw);
  const aliases = {
    "route-53": "amazon-route-53",
    route53: "amazon-route-53",
    "auto-scaling": "aws-auto-scaling",
  };
  return aliases[normalized] || raw;
}

export function serviceKey(value) {
  return normalizeServiceId(serviceSlug(value));
}

function uniqueSlugs(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).reduce((result, value) => {
    const slug = serviceSlug(value);
    const key = serviceKey(slug);
    if (slug && !seen.has(key)) {
      seen.add(key);
      result.push(slug);
    }
    return result;
  }, []);
}

export function normalizeBuilderConfig(caseData) {
  const builder = caseData?.builder;
  if (!builder) {
    logger.error(
      "[Builder] missing builder config",
      caseData?.slug || caseData?.id,
    );
    return {
      required_services: [],
      optional_services: [],
      distractors: [],
      required_connections: [],
      legacy: false,
    };
  }

  return {
    required_services: uniqueSlugs(builder.required_services),
    optional_services: uniqueSlugs(builder.optional_services),
    distractors: uniqueSlugs(builder.distractors),
    required_connections: Array.isArray(builder.required_connections)
      ? builder.required_connections
          .filter((connection) => Array.isArray(connection) && connection.length === 2)
          .map((connection) => connection.map(serviceSlug))
      : [],
    legacy: false,
  };
}

export function normalizeIcon(icon) {
  if (
    icon &&
    typeof icon === "object" &&
    (icon.type === "fontawesome" || icon.type === "url")
  ) {
    return { type: icon.type, value: String(icon.value || "") };
  }
  const value = String(icon || "");
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { type: "url", value };
  }
  return value ? { type: "fontawesome", value } : FALLBACK_ICON;
}

export function resolveBuilderService(slug, caseData, legacyPalette = LEGACY_PALETTE) {
  const canonical = serviceSlug(slug);
  const key = serviceKey(canonical);
  const fromCase = (caseData?.services || []).find(
    (service) => serviceKey(service) === key,
  );
  const fromPalette = legacyPalette.find(
    (service) => serviceKey(service.slug) === key,
  );
  const source = { ...(fromPalette || {}), ...(fromCase || {}) };
  return {
    slug: canonical,
    name: source.name || source.service_name || canonical,
    category: source.category || "AWS Service",
    icon: normalizeIcon(source.icon || source.icon_url),
  };
}

export function getContextualPalette(caseData, legacyPalette = LEGACY_PALETTE) {
  const config = normalizeBuilderConfig(caseData);
  return uniqueSlugs([
    ...config.required_services,
    ...config.optional_services,
    ...config.distractors,
  ]).map((slug) => resolveBuilderService(slug, caseData, legacyPalette));
}

export function renderServiceIcon(
  serviceOrIcon,
  { className = "", alt = "", loading = "lazy" } = {},
) {
  const iconValue = serviceOrIcon?.icon !== undefined
    ? serviceOrIcon.icon
    : serviceOrIcon?.name
      ? null
      : serviceOrIcon;
  const icon = normalizeIcon(iconValue);
  if (icon.type === "url" && icon.value) {
    return `<img src="${escapeHtml(icon.value)}" alt="${escapeHtml(
      alt || serviceOrIcon?.name || "AWS service",
    )}" loading="${escapeHtml(loading)}" data-service-icon="url">`;
  }
  return `<i class="${escapeHtml(
    icon.value || FALLBACK_ICON.value,
  )} ${escapeHtml(className)}" aria-hidden="true" data-service-icon="fontawesome"></i>`;
}

export function scoreBuilderServices(selectedSlugs, caseData) {
  const config = normalizeBuilderConfig(caseData);
  const selected = new Set(uniqueSlugs(selectedSlugs));
  const required = new Set(config.required_services);
  const optional = new Set(config.optional_services);
  const distractors = new Set(config.distractors);
  const hasService = (set, slug) => [...set].some((value) => serviceKey(value) === serviceKey(slug));
  const correct = [...selected].filter((slug) => hasService(required, slug) || hasService(optional, slug));
  const missing = [...required].filter((slug) => !hasService(selected, slug));
  const extra = [...selected].filter((slug) => !hasService(required, slug) && !hasService(optional, slug));
  const score = required.size === 0
    ? 100
    : Math.round(((required.size - missing.length) / required.size) * 100);
  return { config, selected, required, optional, distractors, correct, missing, extra, score };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function attachIconFallbacks(container) {
  container.querySelectorAll('img[data-service-icon="url"]').forEach((image) => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("i");
      fallback.className = "fa-solid fa-cloud builder-icon-fallback";
      fallback.setAttribute("aria-hidden", "true");
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function serviceInfoForSlug(slug, palette, caseData) {
  return palette.find((service) => serviceKey(service.slug) === serviceKey(slug))
    || resolveBuilderService(slug, caseData, palette);
}

export function initArchitectureBuilder({ caseData, legacyPalette = LEGACY_PALETTE } = {}) {
  const currentCase = caseData || window._caseData;
  const palette = getContextualPalette(currentCase || {}, legacyPalette);
  const config = normalizeBuilderConfig(currentCase || {});
  const container = document.getElementById("aws-service-palette");
  if (!container) return null;

  const groups = {};
  palette.forEach((service) => {
    (groups[service.category] ||= []).push(service);
  });
  container.innerHTML = Object.entries(groups).map(([category, services]) => `
    <div class="palette-group-label">${escapeHtml(category)}</div>
    ${services.map((service) => `
      <div class="palette-item" draggable="true" data-slug="${escapeHtml(service.slug)}"
        data-name="${escapeHtml(service.name)}" data-category="${escapeHtml(service.category)}"
        title="Arrastar: ${escapeHtml(service.name)}">
        ${renderServiceIcon(service, { className: "text-3xl mb-2 text-gray-500", alt: service.name })}
        <span class="palette-item-text">${escapeHtml(service.name)}</span>
      </div>`).join("")}
  `).join("");
  attachIconFallbacks(container);

  let drawflowEditor = null;
  let nodeCount = 0;
  let initialized = false;
  let nodeSlugs = [];

  const setStatus = (message) => {
    const status = document.getElementById("builder-status");
    if (!status) return;
    status.textContent = message;
    clearTimeout(status._builderTimer);
    status._builderTimer = setTimeout(() => { status.textContent = ""; }, 3000);
  };
  const updateHint = () => {
    const hint = document.getElementById("builder-empty-hint");
    if (hint) hint.style.display = nodeCount === 0 ? "flex" : "none";
  };
  const nodeTemplate = (service) => `
    <div class="aws-node-inner">
      ${renderServiceIcon(service, { className: "text-[32px] text-blue-500 mb-1", alt: service.name })}
      <div class="aws-node-name">${escapeHtml(service.name)}</div>
      <div class="aws-node-cat">${escapeHtml(service.category)}</div>
    </div>`;

  const showResult = (result) => {
    const resultPanel = document.getElementById("builder-result-panel");
    if (!resultPanel) return;
    document.getElementById("builder-phase-banner")?.style.setProperty("display", "none");
    resultPanel.classList.add("visible");
    const circle = document.getElementById("builder-score-circle");
    circle.className = "builder-score-circle";
    circle.classList.add(result.score >= 70 ? "builder-score-circle--pass" : "builder-score-circle--fail");
    document.getElementById("builder-score-title").textContent = result.score >= 70 ? "Bom trabalho!" : "Precisa melhorar";
    document.getElementById("builder-score-pct").textContent = `${result.score}%`;
    document.getElementById("builder-score-sub").textContent = `Você identificou ${result.correct.filter((slug) => result.required.has(slug)).length} de ${result.required.size} serviços essenciais.`;
    const renderGroup = (className, icon, title, services) => services.length === 0 ? "" : `
      <div class="builder-result-group ${className}">
        <div class="builder-result-group-title"><i class="${icon}"></i> ${title} (${services.length})</div>
        ${services.map((slug) => {
          const service = serviceInfoForSlug(slug, palette, currentCase);
          return `<div class="builder-result-item">${renderServiceIcon(service, { alt: service.name })}${escapeHtml(service.name)}</div>`;
        }).join("")}
      </div>`;
    const requiredCorrect = result.correct.filter((slug) => result.required.has(slug));
    const optionalCorrect = result.correct.filter((slug) => result.optional.has(slug));
    document.getElementById("builder-result-lists").innerHTML = [
      renderGroup("builder-result-group--correct", "fa-solid fa-check", "Corretos", requiredCorrect),
      renderGroup("builder-result-group--optional", "fa-solid fa-circle-info", "Opcionais", optionalCorrect),
      renderGroup("builder-result-group--missing", "fa-solid fa-xmark", "Faltando", result.missing),
      renderGroup("builder-result-group--extra", "fa-solid fa-triangle-exclamation", "Desnecessários", result.extra),
    ].join("");
    attachIconFallbacks(document.getElementById("builder-result-lists"));
  };

  const hideResult = () => {
    document.getElementById("builder-phase-banner")?.style.setProperty("display", "flex");
    document.getElementById("builder-result-panel")?.classList.remove("visible");
    document.getElementById("builder-gabarito")?.classList.remove("visible");
  };

  const verify = () => {
    if (!drawflowEditor || nodeCount === 0) {
      alert("Adicione pelo menos um serviço ao canvas para verificar.");
      return;
    }
    const exported = drawflowEditor.export();
    const nodes = Object.values(exported?.drawflow?.Home?.data || {});
    const selected = [...new Set(nodes.map((node) => serviceSlug(node.name || node.data?.svc?.slug)).filter(Boolean))];
    showResult(scoreBuilderServices(selected, currentCase));
    setStatus("Verificação concluída!");
  };

  const init = () => {
    if (initialized || typeof window.Drawflow !== "function") return;
    const canvas = document.getElementById("drawflow");
    if (!canvas) return;
    initialized = true;
    drawflowEditor = new window.Drawflow(canvas);
    drawflowEditor.reroute = true;
    drawflowEditor.reroute_fix_curvature = true;
    drawflowEditor.start();
    const addService = (service, x, y) => {
      drawflowEditor.addNode(service.slug, 1, 1, x, y, service.slug, { svc: service }, nodeTemplate(service));
      nodeSlugs.push(service.slug);
      nodeCount += 1;
      updateHint();
      setStatus(`Nó adicionado: ${service.name}`);
    };
    canvas.addEventListener("dragover", (event) => event.preventDefault());
    canvas.addEventListener("drop", (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/aws-service");
      if (!raw) return;
      const service = JSON.parse(raw);
      const rect = canvas.getBoundingClientRect();
      const zoom = drawflowEditor.zoom;
      const x = (event.clientX - rect.left) / zoom - drawflowEditor.canvas_x / zoom;
      const y = (event.clientY - rect.top) / zoom - drawflowEditor.canvas_y / zoom;
      addService(service, x - 65, y - 55);
    });
    canvas.addEventListener("contextmenu", (event) => {
      const node = event.target.closest(".drawflow-node");
      if (!node) return;
      event.preventDefault();
      drawflowEditor.removeNodeId(node.id);
      nodeCount = Math.max(0, nodeCount - 1);
      updateHint();
      setStatus("Nó removido.");
    });
  };

  container.querySelectorAll(".palette-item").forEach((item) => {
    item.addEventListener("click", () => {
      init();
      if (!drawflowEditor) return;
      const service = serviceInfoForSlug(item.dataset.slug, palette, currentCase);
      addServiceToCanvas(service);
    });
    item.addEventListener("dragstart", (event) => {
      const service = serviceInfoForSlug(item.dataset.slug, palette, currentCase);
      event.dataTransfer.setData("application/aws-service", JSON.stringify(service));
    });
  });
  document.getElementById("builder-btn-clear")?.addEventListener("click", () => {
    if (!drawflowEditor) return;
    if (!confirm("Limpar todo o canvas?")) return;
    drawflowEditor.clearModuleSelected();
    nodeCount = 0;
    nodeSlugs = [];
    updateHint();
    hideResult();
  });
  document.getElementById("builder-btn-verify")?.addEventListener("click", verify);
  document.getElementById("builder-btn-retry")?.addEventListener("click", hideResult);
  document.getElementById("builder-btn-export")?.addEventListener("click", () => {
    if (!drawflowEditor) return;
    const blob = new Blob([JSON.stringify(drawflowEditor.export(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arquitetura-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("tab-btn-builder")?.addEventListener("click", () => setTimeout(init, 50));
  document.getElementById("builder-btn-gabarito")?.addEventListener("click", async () => {
    const panel = document.getElementById("builder-gabarito");
    panel?.classList.add("visible");
    const container = document.getElementById("builder-gabarito-diagram");
    if (!container || container.dataset.rendered || !currentCase?.architecture_graph) return;
    container.dataset.rendered = "true";
    const { renderArchitecture } = await import("./architectureRenderer.js");
    renderArchitecture(container, currentCase.architecture_graph);
  });
  updateHint();
  init();
  return { config, palette, verify, init };

  function addServiceToCanvas(service) {
    if (!drawflowEditor) return;
    const column = nodeCount % 3;
    const row = Math.floor(nodeCount / 3);
    drawflowEditor.addNode(
      service.slug,
      1,
      1,
      80 + column * 220,
      80 + row * 150,
      service.slug,
      { svc: service },
      nodeTemplate(service),
    );
    nodeSlugs.push(service.slug);
    nodeCount += 1;
    updateHint();
    setStatus(`Nó adicionado: ${service.name}`);
  }
}

let activeBuilder = null;
function startFromPage() {
  if (activeBuilder || !window._caseData) return;
  activeBuilder = initArchitectureBuilder({ caseData: window._caseData });
}
window.addEventListener("case:data-ready", startFromPage);
if (window._caseData) startFromPage();
