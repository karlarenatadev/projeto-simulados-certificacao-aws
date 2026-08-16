#!/usr/bin/env node

/**
 * Projects the versioned Cases catalog and canonical Services catalog into
 * the API database. Source JSON remains authoritative; user progress is not
 * touched by this seed.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  closeDatabase,
  executeQuery,
  initializeDatabase,
} from '../../backend/database/db.js';

const CASES_FILE = 'data/cases/architecture_cases.json';
const TAXONOMY_FILE = 'data/taxonomy/canonical_taxonomy.json';
const PRESENTATION_CATALOG_FILE = 'data/taxonomy/aws_services_catalog.json';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--data-dir') {
      args.dataDir = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

async function readJson(file) {
  const value = JSON.parse(await fs.readFile(path.join(process.cwd(), file), 'utf8'));
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function normalizeServiceReference(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function buildServiceReferenceMap(services, servicesBySlug) {
  const candidates = new Map();

  for (const service of services) {
    const canonicalSlug = service.service_slug;
    const databaseService = servicesBySlug.get(canonicalSlug);
    if (!databaseService) continue;

    const references = [
      canonicalSlug,
      service.service_id,
      service.service_name,
      ...asArray(service.aliases),
    ];
    for (const reference of references) {
      const normalized = normalizeServiceReference(reference);
      if (!normalized) continue;
      const targets = candidates.get(normalized) || new Set();
      targets.add(canonicalSlug);
      candidates.set(normalized, targets);
    }
  }

  const resolved = new Map();
  for (const [reference, targets] of candidates) {
    if (targets.size === 1) {
      resolved.set(reference, servicesBySlug.get([...targets][0]));
    }
  }
  return resolved;
}

function serviceMetadata(service, presentationCatalog) {
  const presentation = presentationCatalog.find((item) => item.slug === service.service_slug);
  return {
    slug: service.service_slug,
    name: service.service_name,
    category: presentation?.category || 'Other Services',
    short_desc: presentation?.description || service.service_name,
    icon_url: presentation?.icon_url || null,
    doc_url: presentation?.doc_url || null,
  };
}

async function upsertService(service, presentationCatalog) {
  const metadata = serviceMetadata(service, presentationCatalog);
  const rows = await executeQuery(
    `INSERT INTO aws_services (slug, name, category, short_desc, icon_url, doc_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       short_desc = EXCLUDED.short_desc,
       icon_url = EXCLUDED.icon_url,
       doc_url = EXCLUDED.doc_url
     RETURNING id, slug`,
    [metadata.slug, metadata.name, metadata.category, metadata.short_desc, metadata.icon_url, metadata.doc_url],
  );
  return rows[0];
}

async function upsertCase(item) {
  const certifications = asArray(item.certifications || item.certification);
  const rows = await executeQuery(
    `INSERT INTO cases (
       slug, title, scenario, objective, difficulty, certifications,
       architecture_graph, resources, content_pt, content_en, tags
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       scenario = EXCLUDED.scenario,
       objective = EXCLUDED.objective,
       difficulty = EXCLUDED.difficulty,
       certifications = EXCLUDED.certifications,
       architecture_graph = EXCLUDED.architecture_graph,
       resources = EXCLUDED.resources,
       content_pt = EXCLUDED.content_pt,
       content_en = EXCLUDED.content_en,
       tags = EXCLUDED.tags,
       updated_at = NOW()
     RETURNING id, slug`,
    [
      item.slug,
      item.title,
      item.scenario,
      item.objective,
      item.difficulty,
      certifications,
      JSON.stringify(item.architecture_graph || {}),
      JSON.stringify(item.resources || []),
      JSON.stringify(item),
      JSON.stringify(item.content_en || {}),
      [...asArray(item.tags), `source-case-id:${item.id}`],
    ],
  );
  return rows[0];
}

async function syncCaseServices(caseRow, item, serviceReferenceMap) {
  await executeQuery('DELETE FROM case_services WHERE case_id = $1', [caseRow.id]);
  let linked = 0;
  const missing = [];

  for (const service of asArray(item.services)) {
    const reference = service?.service_slug || service?.slug;
    const databaseService = serviceReferenceMap.get(normalizeServiceReference(reference));
    if (!databaseService) {
      missing.push(reference || '(empty)');
      continue;
    }
    await executeQuery(
      `INSERT INTO case_services (case_id, service_id, role_note)
       VALUES ($1, $2, $3)
       ON CONFLICT (case_id, service_id) DO UPDATE SET role_note = EXCLUDED.role_note`,
      [caseRow.id, databaseService.id, service.role_note || null],
    );
    linked += 1;
  }

  return { linked, missing };
}

export async function seedCatalog({ dataDir } = {}) {
  if (dataDir) process.env.DB_DATA_DIR = dataDir;
  const cases = await readJson(CASES_FILE);
  const taxonomy = await readJson(TAXONOMY_FILE);
  const presentationCatalog = await readJson(PRESENTATION_CATALOG_FILE);

  await initializeDatabase({
    dataDir: process.env.DB_DATA_DIR,
    environment: process.env.NODE_ENV || 'development',
  });

  try {
    await executeQuery('BEGIN');

    const servicesBySlug = new Map();
    for (const service of taxonomy.services || []) {
      const row = await upsertService(service, presentationCatalog);
      servicesBySlug.set(row.slug, row);
    }
    const serviceReferenceMap = buildServiceReferenceMap(taxonomy.services || [], servicesBySlug);

    let linkedServices = 0;
    const missingServices = [];
    for (const item of cases) {
      const caseRow = await upsertCase(item);
      const result = await syncCaseServices(caseRow, item, serviceReferenceMap);
      linkedServices += result.linked;
      missingServices.push(...result.missing);
    }

    await executeQuery('COMMIT');
    console.log(`[seed-cases] services=${servicesBySlug.size} cases=${cases.length} linkedServices=${linkedServices}`);
    if (missingServices.length > 0) {
      console.warn(`[seed-cases] skipped ${missingServices.length} case service references not present in canonical services: ${[...new Set(missingServices)].join(', ')}`);
    }
  } catch (error) {
    await executeQuery('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await closeDatabase();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await seedCatalog({ dataDir: args.dataDir });
}

if (process.argv[1]?.endsWith('seed-cases.mjs')) {
  main().catch(async (error) => {
    console.error(`[seed-cases] Failed: ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
}
