/**
 * Resolve internal application routes from any page, including nested pages
 * and GitHub Pages deployments under a repository subpath.
 */
export function getAppBasePath(pathname = window.location.pathname) {
  const normalizedPath = String(pathname || '/').replace(/\\/g, '/');
  const validationIndex = normalizedPath.indexOf('/validation/');
  if (validationIndex >= 0) return normalizedPath.slice(0, validationIndex) || '';
  if (normalizedPath.endsWith('/')) return normalizedPath.slice(0, -1);

  const lastSegment = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);
  if (!lastSegment.includes('.')) return normalizedPath;
  return normalizedPath.slice(0, normalizedPath.lastIndexOf('/'));
}

export function resolveAppUrl(target, pathname = window.location.pathname) {
  const cleanTarget = String(target || '').replace(/^\.?\//, '');
  const basePath = getAppBasePath(pathname);
  return `${basePath || ''}/${cleanTarget}`;
}
