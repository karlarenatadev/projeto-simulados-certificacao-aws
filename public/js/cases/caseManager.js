import { logger } from "../utils/logger.js";
/**
 * caseManager.js — Practice Domain
 * Service layer for fetching cases and AWS services from the API.
 * Falls back to static data when the API is unavailable (offline mode).
 */

import apiService from "../services/api.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { normalizeServiceId } from "../utils/serviceIdentity.js";
import { storageManager } from "../storageManager.js";
import { getCurrentLanguage } from "../core/languageManager.js";

let apiStatus = {
  apiAvailable: true,
  fallbackUsed: false,
};

export function readCasesRecommendation(storage = globalThis.localStorage) {
  try {
    const key = storage === globalThis.localStorage
      ? storageManager.getUserScopedKey("last_diagnostic_recommendation")
      : "aws_sim_last_diagnostic_recommendation";
    const raw = storage?.getItem(key);
    const recommendation = raw ? JSON.parse(raw) : null;
    const context = recommendation?.recommendations?.cases?.context;
    if (
      recommendation?.source !== "diagnostic" ||
      recommendation?.recommendations?.cases?.enabled !== true ||
      !context?.certificationId ||
      !Array.isArray(context.services) ||
      !Array.isArray(context.weakDomains)
    ) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}

function getCaseCertifications(caseItem) {
  return Array.isArray(caseItem?.certifications)
    ? caseItem.certifications
    : caseItem?.certification
      ? [caseItem.certification]
      : [];
}

function getCaseServiceIds(caseItem) {
  return (caseItem?.services || [])
    .map((service) =>
      normalizeServiceId(
        typeof service === "string"
          ? service
          : service?.service_slug || service?.slug || service?.service_name || service?.name,
      ),
    )
    .filter(Boolean);
}

function asTranslationObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function mergeLocalizedServices(baseServices, localizedServices) {
  const localizedBySlug = new Map(
    (Array.isArray(localizedServices) ? localizedServices : []).map((service) => [
      service?.service_slug || service?.slug,
      service,
    ]),
  );
  return (Array.isArray(baseServices) ? baseServices : []).map((service) => {
    const key = service?.service_slug || service?.slug;
    const localized = localizedBySlug.get(key);
    return localized ? { ...service, ...localized } : service;
  });
}

function mergeLocalizedResources(baseResources, localizedResources) {
  const localized = Array.isArray(localizedResources) ? localizedResources : [];
  return (Array.isArray(baseResources) ? baseResources : []).map((resource, index) => ({
    ...resource,
    ...(localized[index] || {}),
    url: resource?.url || localized[index]?.url,
    type: resource?.type || localized[index]?.type,
  }));
}

/**
 * Applies the official platform language to one bilingual Case payload.
 * Structural identifiers remain sourced from the canonical PT/base object.
 */
export function localizeCase(caseItem, language = getCurrentLanguage()) {
  if (!caseItem || typeof caseItem !== "object") return caseItem;
  const normalizedLanguage = String(language || "pt").toLowerCase() === "en" ? "en" : "pt";
  const source = normalizedLanguage === "en"
    ? asTranslationObject(caseItem.content_en)
    : asTranslationObject(caseItem.content_pt);
  const localized = { ...caseItem, ...source };
  localized.services = mergeLocalizedServices(caseItem.services, source.services);
  localized.resources = mergeLocalizedResources(caseItem.resources, source.resources);
  localized.architecture_graph = source.architecture_graph || caseItem.architecture_graph;
  localized.questions = source.questions || caseItem.questions || [];
  return localized;
}

export function rankRecommendedCases(cases, context, limit = 3) {
  if (!Array.isArray(cases) || !context?.certificationId) {
    return { cases: [], fallback: false };
  }

  const certificationId = normalizeCertificationId(context.certificationId);
  const services = new Set((context.services || []).map(normalizeServiceId).filter(Boolean));
  const strongServices = new Set(
    (context.strongServices || []).map(normalizeServiceId).filter(Boolean),
  );
  const sameCertification = cases.filter((caseItem) =>
    getCaseCertifications(caseItem).some(
      (certification) => normalizeCertificationId(certification) === certificationId,
    ),
  );
  const matches = sameCertification
    .filter((caseItem) => getCaseServiceIds(caseItem).some((service) => services.has(service)))
    .map((caseItem) => ({
      caseItem,
      strong: getCaseServiceIds(caseItem).some((service) => strongServices.has(service)),
    }))
    .sort(
      (left, right) =>
        Number(right.strong) - Number(left.strong) ||
        String(left.caseItem.id || left.caseItem.slug).localeCompare(
          String(right.caseItem.id || right.caseItem.slug),
        ),
    )
    .slice(0, limit)
    .map(({ caseItem }) => caseItem);

  return matches.length > 0
    ? { cases: matches, fallback: false }
    : { cases: sameCertification.slice(0, limit), fallback: true };
}

export function getApiStatus() {
  return apiStatus;
}

// ============================================================================
// Cases API
// ============================================================================

/**
 * Função utilitária para carregar cases do JSON estático (Fallback)
 */
async function fetchFallbackCases() {
  try {
    const res = await fetch("./data/cases/architecture_cases.json");
    if (!res.ok) return [];
    let cases = await res.json();

    // Normalização defensiva: garante compatibilidade entre schema do JSON
    // e o schema esperado pelo frontend (API pode ter campos diferentes do JSON local)
    return cases.map((c) => ({
      ...c,
      // slug: usa id como fallback se slug ausente
      slug: c.slug || c.id,
      // certifications: array esperado pelo renderCard; converte string singular se necessário
      certifications:
        c.certifications || (c.certification ? [c.certification] : []),
      // difficulty: campo obrigatório para badge e filtros
      difficulty: c.difficulty || "intermediate",
      // services: normaliza campos do JSON (service_slug/service_name → slug/name)
      services: (c.services || []).map((s) => ({
        ...s,
        slug: s.service_slug || s.slug,
        name: s.service_name || s.name,
      })),
    }));
  } catch (err) {
    logger.warn("[caseManager] Falha ao carregar JSON local:", err);
    return [];
  }
}

/**
 * Fetch list of cases with optional filters.
 * @param {Object} [filters]
 * @param {string} [filters.certification]
 * @param {string} [filters.difficulty]
 * @param {number} [filters.limit]
 * @param {number} [filters.offset]
 * @returns {Promise<Array>}
 */
export async function getCases(filters = {}) {
  try {
    const response = await apiService.getCases(filters);
    apiStatus.apiAvailable = true;
    apiStatus.fallbackUsed = false;
    return (response.data || []).map((caseItem) => localizeCase(caseItem));
  } catch (error) {
    logger.warn(
      "[caseManager] API unavailable, using fallback:",
      error.message,
    );
    apiStatus.apiAvailable = false;
    apiStatus.fallbackUsed = true;

    let fallbackCases = await fetchFallbackCases();

    // Aplica filtros localmente
    if (filters.certification) {
      const filterCert = filters.certification.toLowerCase();
      fallbackCases = fallbackCases.filter((c) => {
        // Suporta tanto campo singular quanto array de certifications
        if (Array.isArray(c.certifications)) {
          return c.certifications.some(
            (cert) => cert.toLowerCase() === filterCert,
          );
        }
        return (c.certification || "").toLowerCase() === filterCert;
      });
    }
    if (filters.difficulty) {
      fallbackCases = fallbackCases.filter(
        (c) => c.difficulty === filters.difficulty,
      );
    }

    return fallbackCases.map((caseItem) => localizeCase(caseItem));
  }
}

/**
 * Fetch a single case by ID or slug.
 * @param {string} idOrSlug
 * @returns {Promise<Object|null>}
 */
export async function getCaseById(idOrSlug) {
  try {
    const response = await apiService.getCaseById(idOrSlug);
    apiStatus.apiAvailable = true;
    apiStatus.fallbackUsed = false;
    return localizeCase(response.data || null);
  } catch (error) {
    logger.warn(
      "[caseManager] Could not fetch case, using fallback:",
      error.message,
    );
    apiStatus.apiAvailable = false;
    apiStatus.fallbackUsed = true;

    const fallbackCases = await fetchFallbackCases();
    const caseItem = fallbackCases.find((c) => c.id === idOrSlug || c.slug === idOrSlug) || null;
    return localizeCase(caseItem);
  }
}

/**
 * Mark a case as completed for the current user.
 * @param {string} caseId - Case UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>}
 */
export async function markCaseComplete(caseId, userId) {
  // Persiste sempre localmente primeiro
  const completed = getLocalCompletedCases();
  completed.add(caseId);
  saveLocalCompletedCases(completed);

  try {
    await apiService.markCaseComplete(caseId, userId);
    return true;
  } catch (error) {
    logger.warn(
      "[caseManager] API call failed (ignoring for local mode):",
      error.message,
    );
    // Retorna true mesmo assim para que o UI reflita a conclusão
    return true;
  }
}

/**
 * Fetch AWS services catalog.
 * @param {string} [category]
 * @returns {Promise<Array>}
 */
export async function getAwsServices(category) {
  try {
    const response = await apiService.getAwsServices(category);
    return response.data || [];
  } catch (error) {
    logger.warn("[caseManager] Could not fetch services:", error.message);
    return [];
  }
}

// ============================================================================
// Local storage — completed cases
// ============================================================================

const COMPLETED_KEY = "cases:completed";

function getCompletedCasesKey() {
  return storageManager.getUserScopedKey(COMPLETED_KEY);
}

export function getLocalCompletedCases() {
  try {
    const raw = localStorage.getItem(getCompletedCasesKey());
    return new Set(JSON.parse(raw || "[]"));
  } catch {
    return new Set();
  }
}

function saveLocalCompletedCases(set) {
  try {
    localStorage.setItem(getCompletedCasesKey(), JSON.stringify([...set]));
  } catch {
    /* quota exceeded – ignore */
  }
}

export function isCompleted(caseId) {
  return getLocalCompletedCases().has(caseId);
}

// ============================================================================
// Helpers — labels
// ============================================================================

const DIFFICULTY_LABELS = {
  beginner: { label: "Iniciante", cls: "beginner" },
  intermediate: { label: "Intermediário", cls: "intermediate" },
  advanced: { label: "Avançado", cls: "advanced" },
};

export function getDifficultyInfo(difficulty) {
  return (
    DIFFICULTY_LABELS[difficulty] || { label: difficulty, cls: "intermediate" }
  );
}

const RESOURCE_ICONS = {
  doc: "fa-book",
  video: "fa-play-circle",
  blog: "fa-newspaper",
};

export function getResourceIcon(type) {
  return RESOURCE_ICONS[type] || "fa-link";
}
