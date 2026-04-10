/**
 * useTranslation.js
 * Translation function with variable interpolation support
 */

import { translations } from './translations.js';

/**
 * Translates a key to the specified language with variable interpolation
 * @param {string} key - Translation key
 * @param {string} lang - Language code ('pt' or 'en')
 * @param {Object} variables - Variables to interpolate (e.g., {count: 5})
 * @returns {string} Translated text
 */
export function t(key, lang, variables = {}) {
    // Get translation or return key if not found
    let text = translations[lang]?.[key] || translations['pt']?.[key] || key;
    
    // Replace all variables in the format {{variableName}}
    Object.keys(variables).forEach((varKey) => {
        const regex = new RegExp(`{{${varKey}}}`, 'g');
        text = text.replace(regex, variables[varKey]);
    });
    
    return text;
}
