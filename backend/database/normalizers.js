/**
 * Normalize certification IDs to match the PostgreSQL enum format.
 *
 * @param {string} certificationId - Example: clf-c02
 * @returns {string} Example: CLF-C02
 */
export function normalizeCertificationId(certificationId) {
  if (typeof certificationId !== 'string') {
    return certificationId;
  }

  return certificationId.trim().toUpperCase();
}

/**
 * Normalize the supported interface/content language codes.
 *
 * @param {string} language - Supported language code (pt or en)
 * @param {object} [options]
 * @param {boolean} [options.required=false]
 * @returns {string|undefined}
 */
export function normalizeLanguage(language, { required = false } = {}) {
  if (language === undefined || language === null || language === '') {
    if (required) {
      throw new Error('language is required');
    }
    return undefined;
  }

  const normalized = String(language).trim().toLowerCase();
  if (!['pt', 'en'].includes(normalized)) {
    throw new Error('language must be pt or en');
  }

  return normalized;
}
