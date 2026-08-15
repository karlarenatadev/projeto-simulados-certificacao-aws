import { normalizeCertificationId } from "./certUtils.js";

// Runtime projection of aliases whose punctuation differs from the canonical
// service slug. The canonical alias list remains in data/taxonomy.
const CANONICAL_SERVICE_ALIASES = Object.freeze({
  "route-53": "amazon-route-53",
  route53: "amazon-route-53",
});

export function normalizeServiceId(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/^(amazon|aws)[ -]+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return CANONICAL_SERVICE_ALIASES[normalized] || normalized;
}

export function normalizeLabIdentity(lab) {
  return {
    certificationId: normalizeCertificationId(lab?.certification),
    serviceId: normalizeServiceId(lab?.service),
  };
}
