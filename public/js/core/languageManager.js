import { SessionManager } from "./sessionManager.js";

const DEFAULT_LANGUAGE = "pt";
const LEGACY_LANGUAGE_KEYS = ["language", "aws_sim_lang"];

export function normalizeLanguage(language) {
  const normalized = String(language || "").trim().toLowerCase();
  if (normalized === "en" || normalized === "en-us" || normalized === "english") {
    return "en";
  }
  if (normalized === "pt" || normalized === "pt-br" || normalized === "portuguese") {
    return "pt";
  }
  return null;
}

function getLegacyLanguage() {
  for (const key of LEGACY_LANGUAGE_KEYS) {
    const language = normalizeLanguage(localStorage.getItem(key));
    if (language) return language;
  }
  return null;
}

/**
 * Returns the platform language and migrates a valid legacy preference into
 * the official user session when one exists.
 */
export function getCurrentLanguage() {
  const session = SessionManager.restore();
  const sessionLanguage = normalizeLanguage(session?.user?.language);
  if (session && sessionLanguage) return sessionLanguage;

  const legacyLanguage = getLegacyLanguage();
  if (session && legacyLanguage) {
    SessionManager.update({ language: legacyLanguage });
  }

  return sessionLanguage || legacyLanguage || DEFAULT_LANGUAGE;
}

/**
 * Persists language in the official session without replacing other user data.
 * Before a session exists, keeps the existing local-first compatibility key.
 */
export function setCurrentLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
  const session = SessionManager.restore();

  if (session?.user) {
    SessionManager.update({ language: normalizedLanguage });
  } else {
    localStorage.setItem("language", normalizedLanguage);
    localStorage.setItem("aws_sim_lang", normalizedLanguage);
  }

  return normalizedLanguage;
}
