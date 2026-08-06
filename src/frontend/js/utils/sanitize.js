/**
 * utils/sanitize.js — Sanitização HTML leve para o simulador
 *
 * Permite apenas um subconjunto seguro de tags HTML nas questões,
 * evitando XSS por injeção de scripts ou atributos maliciosos.
 *
 * Tags permitidas: br, strong, em, b, i, code, span, p, ul, ol, li
 * Atributos permitidos: class (apenas nas tags acima)
 * Todos os outros elementos são preservados como texto, sem o wrapper de tag.
 *
 * Não usa dependências externas — funciona com o DOMParser nativo do browser.
 *
 * @module utils/sanitize
 */

/* global DOMParser, Node */

/** Tags cujo conteúdo é seguro para renderizar inline */
const ALLOWED_TAGS = new Set([
  "br",
  "strong",
  "em",
  "b",
  "i",
  "code",
  "span",
  "p",
  "ul",
  "ol",
  "li",
]);

/**
 * Sanitiza uma string HTML, preservando apenas tags e atributos seguros.
 * Retorna a string limpa que pode ser atribuída com segurança a `innerHTML`.
 *
 * @param {string} dirty - HTML ou texto a sanitizar
 * @returns {string} HTML sanitizado
 *
 * @example
 * sanitizeHTML('<strong>AWS S3</strong><script>alert(1)</script>')
 * // → '<strong>AWS S3</strong>'
 */
export function sanitizeHTML(dirty) {
  if (!dirty) return "";
  if (typeof dirty !== "string") return String(dirty);

  // Usa DOMParser para parsear a string como HTML seguro em ambiente isolado
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${dirty}</body>`, "text/html");
  const body = doc.body;

  return _serializeNode(body);
}

/**
 * Serializa recursivamente um nó DOM, mantendo apenas tags e atributos seguros.
 * @param {Node} node
 * @returns {string}
 */
function _serializeNode(node) {
  let result = "";

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Texto puro — escapar entidades HTML para prevenir injeção
      result += _escapeText(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();

      if (ALLOWED_TAGS.has(tag)) {
        // Tag permitida — reconstruir com atributos seguros apenas
        const attrs = _safeAttributes(child);
        const attrsStr = attrs ? ` ${attrs}` : "";

        if (tag === "br") {
          result += `<br>`;
        } else {
          result += `<${tag}${attrsStr}>${_serializeNode(child)}</${tag}>`;
        }
      } else {
        // Tag não permitida — descartar a tag, preservar o conteúdo textual
        result += _serializeNode(child);
      }
    }
    // Outros tipos de nó (comentários, CDATA, etc.) são ignorados
  }

  return result;
}

/**
 * Retorna string de atributos seguros para a tag (somente class).
 * @param {Element} el
 * @returns {string}
 */
function _safeAttributes(el) {
  const cls = el.getAttribute("class");
  if (cls) {
    // Permite apenas caracteres de classe CSS seguros
    const safeCls = cls.replace(/[^a-zA-Z0-9\s_-]/g, "");
    return safeCls ? `class="${safeCls}"` : "";
  }
  return "";
}

/**
 * Escapa caracteres especiais HTML em texto puro.
 * @param {string} text
 * @returns {string}
 */
function _escapeText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
