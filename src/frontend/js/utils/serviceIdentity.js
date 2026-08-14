import { normalizeCertificationId } from "./certUtils.js";

export function normalizeServiceId(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/^(amazon|aws)[ -]+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeLabIdentity(lab) {
  return {
    certificationId: normalizeCertificationId(lab?.certification),
    serviceId: normalizeServiceId(lab?.service),
  };
}
