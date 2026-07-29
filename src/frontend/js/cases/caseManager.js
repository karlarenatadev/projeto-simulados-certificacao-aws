import { logger } from "../utils/logger.js";
/**
 * caseManager.js — Practice Domain
 * Service layer for fetching cases and AWS services from the API.
 * Falls back to static data when the API is unavailable (offline mode).
 */

import apiService from "../../../services/api.js";

let apiStatus = {
  apiAvailable: true,
  fallbackUsed: false
};

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
    const res = await fetch('./data/cases/architecture_cases.json');
    if (!res.ok) return [];
    let cases = await res.json();
    
    // Normalização (API vs JSON)
    return cases.map(c => ({
      ...c,
      slug: c.id,
      services: (c.services || []).map(s => ({
        ...s,
        slug: s.service_slug || s.slug,
        name: s.service_name || s.name
      }))
    }));
  } catch (err) {
    logger.warn('[caseManager] Falha ao carregar JSON local:', err);
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
    return response.data || [];
  } catch (error) {
    logger.warn('[caseManager] API unavailable, using fallback:', error.message);
    apiStatus.apiAvailable = false;
    apiStatus.fallbackUsed = true;
    
    let fallbackCases = await fetchFallbackCases();
    
    // Aplica filtros localmente
    if (filters.certification) {
      const filterCert = filters.certification.toLowerCase();
      fallbackCases = fallbackCases.filter(c => 
        (c.certification || '').toLowerCase() === filterCert
      );
    }
    if (filters.difficulty) {
      fallbackCases = fallbackCases.filter(c => c.difficulty === filters.difficulty);
    }
    
    return fallbackCases;
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
    return response.data || null;
  } catch (error) {
    logger.warn('[caseManager] Could not fetch case, using fallback:', error.message);
    apiStatus.apiAvailable = false;
    apiStatus.fallbackUsed = true;
    
    const fallbackCases = await fetchFallbackCases();
    return fallbackCases.find(c => c.id === idOrSlug || c.slug === idOrSlug) || null;
  }
}

/**
 * Mark a case as completed for the current user.
 * @param {string} caseId - Case UUID
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>}
 */
export async function markCaseComplete(caseId, userId) {
  try {
    await apiService.markCaseComplete(caseId, userId);
    // Persist completion locally so the UI works even without a re-fetch
    const completed = getLocalCompletedCases();
    completed.add(caseId);
    saveLocalCompletedCases(completed);
    return true;
  } catch (error) {
    logger.warn('[caseManager] Could not mark case as complete:', error.message);
    return false;
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
    logger.warn('[caseManager] Could not fetch services:', error.message);
    return [];
  }
}

// ============================================================================
// Local storage — completed cases
// ============================================================================

const COMPLETED_KEY = 'cases:completed';

export function getLocalCompletedCases() {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return new Set(JSON.parse(raw || '[]'));
  } catch {
    return new Set();
  }
}

function saveLocalCompletedCases(set) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...set]));
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
  beginner: { label: 'Iniciante', cls: 'beginner' },
  intermediate: { label: 'Intermediário', cls: 'intermediate' },
  advanced: { label: 'Avançado', cls: 'advanced' },
};

export function getDifficultyInfo(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || { label: difficulty, cls: 'intermediate' };
}

const RESOURCE_ICONS = {
  doc: 'fa-book',
  video: 'fa-play-circle',
  blog: 'fa-newspaper',
};

export function getResourceIcon(type) {
  return RESOURCE_ICONS[type] || 'fa-link';
}
