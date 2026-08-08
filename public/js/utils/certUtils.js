/**
 * utils/certUtils.js — Utilitários para padronização de certificações
 *
 * @module utils/certUtils
 */

/**
 * Normaliza um ID de certificação para garantir que esteja sempre
 * em lowercase e sem espaços em branco.
 *
 * @param {string} value - ID da certificação (ex: "CLF-C02", " clf-c02 ")
 * @returns {string} ID normalizado (ex: "clf-c02")
 */
export function normalizeCertificationId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
