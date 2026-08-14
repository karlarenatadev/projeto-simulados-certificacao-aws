/**
 * uiRenderer.js
 * Ponto central de renderização de serviços UI (Modals, Toasts).
 * Na arquitetura futura, será substituído por componentes React.
 */

import { getCurrentLanguage } from "./core/languageManager.js";
import { t } from "./i18n/useTranslation.js";

const tr = (key) => t(key, getCurrentLanguage());

export function initUIRenderer() {
  _setupToastContainer();
  _setupModalContainer();

  window.addEventListener("app:notification", (e) => _renderToast(e.detail));
  window.addEventListener("app:modal", (e) => _renderModal(e.detail));
  window.addEventListener("app:modal:close", (e) => _closeModal(e.detail.id));
}

function _setupToastContainer() {
  if (document.getElementById("a3-toast-container")) return;
  const container = document.createElement("div");
  container.id = "a3-toast-container";
  container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2";
  document.body.appendChild(container);
}

function _setupModalContainer() {
  if (document.getElementById("a3-modal-container")) return;
  const container = document.createElement("div");
  container.id = "a3-modal-container";
  container.className =
    "fixed inset-0 z-50 hidden items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity";
  document.body.appendChild(container);
}

function _renderToast({ type, message }) {
  const container = document.getElementById("a3-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  toast.className = `${colors[type] || "bg-gray-800"} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transform transition-all translate-y-10 opacity-0`;

  let icon = "fa-info-circle";
  if (type === "success") icon = "fa-check-circle";
  if (type === "error") icon = "fa-exclamation-circle";

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span class="text-sm font-medium">${message}</span>
  `;

  container.appendChild(toast);

  // Anim in
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-10", "opacity-0");
  });

  // Anim out & remove
  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function _renderModal({ type, payload, onResult }) {
  const container = document.getElementById("a3-modal-container");
  if (!container) return;

  container.innerHTML = ""; // Clear previous

  const card = document.createElement("div");
  card.className =
    "bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 transform scale-95 opacity-0 transition-all";

  if (type === "confirm") {
    card.innerHTML = `
      <h3 class="text-xl font-bold text-white mb-2">${payload.title || tr("common_attention")}</h3>
      <p class="text-slate-300 mb-6">${payload.message}</p>
      <div class="flex justify-end gap-3">
        <button id="modal-btn-cancel" class="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors">
          ${payload.cancelText || tr("cancel")}
        </button>
        <button id="modal-btn-confirm" class="px-4 py-2 rounded bg-aws-orange text-white hover:bg-orange-600 transition-colors font-medium">
          ${payload.confirmText || tr("confirm")}
        </button>
      </div>
    `;

    container.appendChild(card);
    container.classList.remove("hidden");
    container.classList.add("flex");

    requestAnimationFrame(() => {
      card.classList.remove("scale-95", "opacity-0");
    });

    const close = (result) => {
      card.classList.add("scale-95", "opacity-0");
      setTimeout(() => {
        container.classList.add("hidden");
        container.classList.remove("flex");
        if (onResult) onResult(result);
      }, 200);
    };

    document.getElementById("modal-btn-cancel").onclick = () => close(false);
    document.getElementById("modal-btn-confirm").onclick = () => close(true);
  } else if (type === "loading") {
    card.setAttribute("data-loading-id", payload.id);
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center p-4">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-aws-orange mb-4"></i>
        <p class="text-white font-medium">${payload.message}</p>
      </div>
    `;
    container.appendChild(card);
    container.classList.remove("hidden");
    container.classList.add("flex");
    requestAnimationFrame(() => card.classList.remove("scale-95", "opacity-0"));
  }
}

function _closeModal(id) {
  const container = document.getElementById("a3-modal-container");
  if (!container) return;
  const card = container.querySelector(`[data-loading-id="${id}"]`);
  if (card) {
    card.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      container.classList.add("hidden");
      container.classList.remove("flex");
      card.remove();
    }, 200);
  }
}
