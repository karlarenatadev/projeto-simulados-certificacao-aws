import { logger } from "../utils/logger.js";
/**
 * architectureRenderer.js — Practice Domain
 * Handles rendering Mermaid.js diagrams from the case's architecture_graph field.
 */

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

let mermaidInstance = null;
let loadPromise = null;

// ============================================================================
// Mermaid Loader (lazy — only loaded when a case view is opened)
// ============================================================================

async function loadMermaid() {
  if (mermaidInstance) {
    return mermaidInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const mod = await import(/* webpackIgnore: true */ MERMAID_CDN);
      mermaidInstance = mod.default;

      mermaidInstance.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains("dark")
          ? "dark"
          : "default",
        fontFamily: "Segoe UI, system-ui, sans-serif",
        flowchart: {
          htmlLabels: true,
          curve: "basis",
          nodeSpacing: 50,
          rankSpacing: 60,
        },
        themeVariables: {
          primaryColor: "#0033FF",
          primaryTextColor: "#f5f7ff",
          primaryBorderColor: "#001863",
          lineColor: "#94a3b8",
          secondaryColor: "#001863",
          tertiaryColor: "#1e293b",
          background: "#ffffff",
          mainBkg: "#001863",
          nodeBkg: "#0033FF",
          clusterBkg: "#f8fafc",
          titleColor: "#00083d",
          edgeLabelBackground: "#f5f5f5",
        },
      });

      return mermaidInstance;
    } catch (error) {
      logger.error("[architectureRenderer] Failed to load Mermaid.js:", error);
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

// ============================================================================
// Render
// ============================================================================

/**
 * Render the architecture graph inside the given container element.
 * @param {HTMLElement} container - DOM element that will hold the diagram
 * @param {Object} architectureGraph - { type: 'mermaid', content: '...' }
 * @returns {Promise<void>}
 */
export async function renderArchitecture(container, architectureGraph) {
  if (!container) {
    throw new Error("[architectureRenderer] container element is required");
  }

  // Clear previous content
  container.innerHTML = "";

  if (!architectureGraph || !architectureGraph.content) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--a3-text-muted);">
        <i class="fa-solid fa-diagram-project" style="font-size:2.5rem; opacity:0.3; display:block; margin-bottom:0.75rem;"></i>
        <p style="font-size:0.875rem;">Diagrama não disponível para este case.</p>
      </div>`;
    return;
  }

  if (architectureGraph.type !== "mermaid") {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem; color: var(--a3-text-muted);">
        <p style="font-size:0.875rem;">Tipo de diagrama não suportado: ${architectureGraph.type}</p>
      </div>`;
    return;
  }

  // Show loading indicator
  container.innerHTML = `
    <div style="text-align:center; padding: 2rem; color: var(--a3-text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;"></i>
      <p style="font-size:0.8rem; margin-top:0.5rem;">Carregando diagrama...</p>
    </div>`;

  try {
    const mermaid = await loadMermaid();

    // Re-initialize with current theme
    const isDark = document.documentElement.classList.contains("dark");
    mermaid.initialize({ theme: isDark ? "dark" : "default" });

    const diagramId = `arch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg } = await mermaid.render(diagramId, architectureGraph.content);

    container.innerHTML = svg;

    // Make the SVG responsive
    const svgEl = container.querySelector("svg");
    if (svgEl) {
      svgEl.removeAttribute("height");
      svgEl.style.maxWidth = "100%";
      svgEl.style.height = "auto";
    }
  } catch (error) {
    logger.error("[architectureRenderer] Render error:", error);
    container.innerHTML = `
      <div style="text-align:center; padding: 2rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.75rem; color:var(--a3-warning); display:block; margin-bottom:0.75rem;"></i>
        <p style="font-size:0.85rem; color:var(--a3-text-muted);">Não foi possível renderizar o diagrama.</p>
        <details style="margin-top:0.75rem; text-align:left; font-size:0.75rem;">
          <summary style="cursor:pointer; color:var(--a3-text-muted);">Detalhes</summary>
          <pre style="overflow-x:auto; padding:0.5rem; background:var(--a3-surface-soft); border-radius:6px; margin-top:0.5rem;">${escapeHtml(architectureGraph.content)}</pre>
        </details>
      </div>`;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
