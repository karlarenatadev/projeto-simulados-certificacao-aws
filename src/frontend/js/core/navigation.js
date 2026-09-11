/**
 * Resolve internal application routes from any page, including nested pages
 * and GitHub Pages deployments under a repository subpath.
 */
export function getAppBasePath(pathname = window.location.pathname) {
  const normalizedPath = String(pathname || "/").replace(/\\/g, "/");
  const validationIndex = normalizedPath.indexOf("/validation/");
  if (validationIndex >= 0)
    return normalizedPath.slice(0, validationIndex) || "";
  if (normalizedPath.endsWith("/")) return normalizedPath.slice(0, -1);

  const lastSegment = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
  if (!lastSegment.includes(".")) return normalizedPath;
  return normalizedPath.slice(0, normalizedPath.lastIndexOf("/"));
}

export function resolveAppUrl(target, pathname = window.location.pathname) {
  const cleanTarget = String(target || "").replace(/^\.?\//, "");
  const basePath = getAppBasePath(pathname);
  return `${basePath || ""}/${cleanTarget}`;
}

/**
 * Resolve links declarativos da aplicação sem remover o fallback HTML.
 *
 * O atributo href continua funcional sem JavaScript. Quando o shell inicia,
 * data-app-route garante que a mesma navegação respeite o base path usado no
 * localhost, em páginas aninhadas e no GitHub Pages.
 *
 * @param {ParentNode} root
 * @param {string} pathname
 * @returns {HTMLAnchorElement[]} Links atualizados.
 */
export function resolveAppLinks(
  root = document,
  pathname = window.location.pathname,
) {
  if (!root?.querySelectorAll) return [];

  const links = Array.from(root.querySelectorAll("a[data-app-route]"));
  links.forEach((link) => {
    const target = link.getAttribute("data-app-route");
    if (target) link.setAttribute("href", resolveAppUrl(target, pathname));
  });
  return links;
}
