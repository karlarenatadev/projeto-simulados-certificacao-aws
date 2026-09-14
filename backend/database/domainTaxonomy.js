import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { certificationPaths } from "../../src/frontend/js/data.js";

const taxonomyPath = resolve(
  fileURLToPath(
    new URL("../../data/taxonomy/canonical_taxonomy.json", import.meta.url),
  ),
);
const canonicalTaxonomy = JSON.parse(readFileSync(taxonomyPath, "utf8"));

function key(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function canonicalDomainsFor(certification) {
  const certId = String(certification || "")
    .trim()
    .toUpperCase();
  return canonicalTaxonomy.certification_domains.filter(
    (domain) => domain.certification === certId,
  );
}

function runtimeDomainsFor(certification) {
  const certId = String(certification || "")
    .trim()
    .toLowerCase();
  return certificationPaths[certId]?.domains || [];
}

/**
 * Resolves UI/runtime IDs, labels, canonical taxonomy IDs and known aliases
 * without changing the stored question classification.
 */
export function getDomainTaxonomy(certification) {
  const canonicalDomains = canonicalDomainsFor(certification);
  return runtimeDomainsFor(certification).map((runtime) => {
    const canonical = canonicalDomains.find((candidate) => {
      const candidateKeys = [
        candidate.domain_id,
        candidate.official_name,
        ...(candidate.aliases || []),
      ].map(key);
      return [runtime.id, runtime.name, runtime.englishName]
        .map(key)
        .some((value) => candidateKeys.includes(value));
    });

    const aliases = new Set(
      [
        runtime.id,
        runtime.name,
        runtime.englishName,
        canonical?.domain_id,
        canonical?.official_name,
        ...(canonical?.aliases || []),
      ].filter(Boolean),
    );

    return {
      id: runtime.id,
      certification: String(certification || "")
        .trim()
        .toUpperCase(),
      labelPt: runtime.name,
      labelEn: runtime.englishName,
      canonicalId: canonical?.domain_id || null,
      officialName: canonical?.official_name || runtime.englishName,
      aliases: [...aliases],
    };
  });
}

export function hasDomainTaxonomy(certification) {
  return getDomainTaxonomy(certification).length > 0;
}

export function normalizeDomain(certification, value) {
  const normalized = key(value);
  if (!normalized) return null;
  return (
    getDomainTaxonomy(certification).find((domain) =>
      domain.aliases.some((alias) => key(alias) === normalized),
    ) || null
  );
}

export function normalizeDifficulty(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = String(value).trim().toLowerCase();
  return ["easy", "medium", "hard"].includes(normalized) ? normalized : null;
}
