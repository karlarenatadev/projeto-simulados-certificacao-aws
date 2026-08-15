import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SUPPORTED_CERTIFICATIONS = ['CLF-C02', 'SAA-C03', 'DVA-C02', 'AIF-C01'];
const QUESTION_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const LAB_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced', 'easy', 'medium', 'hard']);
const ISSUE_SEVERITIES = new Set(['ERROR', 'WARNING', 'CONTENT_GAP', 'LEGACY']);

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeCertification(value) {
  const normalized = normalize(value).toUpperCase();
  return SUPPORTED_CERTIFICATIONS.includes(normalized) ? normalized : null;
}

function issue(report, severity, dataset, code, message, file = null, index = null) {
  if (!ISSUE_SEVERITIES.has(severity)) throw new Error(`Invalid issue severity: ${severity}`);
  report.issues.push({ severity, dataset, code, message, file, index });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function createTaxonomyContext(taxonomy) {
  const domainsByCertification = new Map();
  const domainAliases = new Map();
  const servicesById = new Map();
  const serviceAliases = new Map();

  for (const domain of taxonomy.certification_domains || []) {
    const certification = normalizeCertification(domain.certification);
    if (!certification) continue;
    const key = `${certification}:${normalize(domain.domain_id)}`;
    domainsByCertification.set(key, domain);
    for (const alias of [domain.domain_id, domain.official_name, ...(domain.aliases || [])]) {
      const aliasKey = `${certification}:${normalize(alias)}`;
      const matches = domainAliases.get(aliasKey) || [];
      if (!matches.includes(domain.domain_id)) matches.push(domain.domain_id);
      domainAliases.set(aliasKey, matches);
    }
  }

  for (const service of taxonomy.services || []) {
    servicesById.set(normalize(service.service_id), service);
    for (const alias of [service.service_id, service.service_slug, service.service_name, ...(service.aliases || [])]) {
      const aliasKey = normalize(alias);
      const matches = serviceAliases.get(aliasKey) || [];
      matches.push(service.service_id);
      serviceAliases.set(aliasKey, matches);
    }
  }

  return { domainsByCertification, domainAliases, servicesById, serviceAliases };
}

export function validateQuestion(question, context, report, file = 'fixture', index = 0) {
  const required = ['questionId', 'certId', 'question', 'options', 'correct', 'domain', 'difficulty'];
  for (const field of required) {
    if (question?.[field] === undefined || question?.[field] === null || question?.[field] === '') {
      issue(report, 'ERROR', 'Questions', 'QUESTION_REQUIRED_FIELD', `Missing required field '${field}'.`, file, index);
    }
  }

  const certification = normalizeCertification(question?.certId);
  if (!certification) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_CERTIFICATION', `Unsupported certification '${question?.certId}'.`, file, index);
  }
  if (!Array.isArray(question?.options) || question.options.length < 2) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_OPTIONS', 'Question must contain at least two options.', file, index);
  } else if (question.options.some((option) => (typeof option === 'string' ? !option.trim() : !option?.text?.trim()))) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_EMPTY_OPTION', 'Question contains an empty option.', file, index);
  }

  const answers = Array.isArray(question?.correct) ? question.correct : [question?.correct];
  if (!answers.length || answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer >= (question.options?.length || 0))) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_CORRECT_ANSWER', 'correct must point to existing option indexes.', file, index);
  }
  if (question?.difficulty && !QUESTION_DIFFICULTIES.has(normalize(question.difficulty))) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_DIFFICULTY', `Unsupported difficulty '${question.difficulty}'.`, file, index);
  }

  if (certification) {
    const aliasKey = `${certification}:${normalize(question.domain)}`;
    const matches = context.domainAliases.get(aliasKey) || [];
    if (matches.length === 0) {
      issue(report, 'WARNING', 'Questions', 'UNKNOWN_DOMAIN', `Domain '${question.domain}' is not in taxonomy for ${certification}.`, file, index);
    } else if (matches.length > 1) {
      issue(report, 'ERROR', 'Questions', 'CONFLICTING_DOMAIN_ALIAS', `Domain '${question.domain}' maps to multiple canonical domains.`, file, index);
    }
  }

  if (!Array.isArray(question?.services)) {
    issue(report, 'WARNING', 'Questions', 'QUESTION_SERVICES', 'Question services field is not an array.', file, index);
  } else {
    for (const service of question.services) {
      if (!service?.service_id || !service?.service_name || !service?.service_slug) {
        issue(report, 'ERROR', 'Questions', 'QUESTION_SERVICE_SCHEMA', 'Question service requires service_id, service_name and service_slug.', file, index);
        continue;
      }
      if (!context.serviceAliases.has(normalize(service.service_id))) {
        issue(report, 'WARNING', 'Questions', 'UNKNOWN_SERVICE', `Service '${service.service_id}' is not in the canonical catalog.`, file, index);
      }
    }
  }
}

function validateQuestionFile(file, questions, context, report) {
  if (!Array.isArray(questions)) {
    issue(report, 'ERROR', 'Questions', 'QUESTION_FILE_SHAPE', 'Question source must be an array.', file);
    return;
  }
  const ids = new Set();
  questions.forEach((question, index) => {
    const id = String(question?.questionId || '');
    if (ids.has(id)) issue(report, 'ERROR', 'Questions', 'DUPLICATE_QUESTION_ID', `Duplicate questionId '${id}'.`, file, index);
    if (id) ids.add(id);
    validateQuestion(question, context, report, file, index);
  });
  report.counts.questions[file] = questions.length;
  return ids;
}

export function validateLabs(labs, context, report, file = 'data/labs/labs.json') {
  if (!Array.isArray(labs)) {
    issue(report, 'ERROR', 'Labs', 'LAB_FILE_SHAPE', 'Labs source must be an array.', file);
    return;
  }
  const ids = new Set();
  for (const [index, lab] of labs.entries()) {
    for (const field of ['id', 'title', 'certification', 'service', 'difficulty', 'duration', 'provider']) {
      if (lab?.[field] === undefined || lab?.[field] === null || lab?.[field] === '') issue(report, 'ERROR', 'Labs', 'LAB_REQUIRED_FIELD', `Missing required field '${field}'.`, file, index);
    }
    if (ids.has(lab?.id)) issue(report, 'ERROR', 'Labs', 'DUPLICATE_LAB_ID', `Duplicate lab id '${lab?.id}'.`, file, index);
    if (lab?.id) ids.add(lab.id);
    if (!normalizeCertification(lab?.certification)) issue(report, 'ERROR', 'Labs', 'LAB_CERTIFICATION', `Unsupported certification '${lab?.certification}'.`, file, index);
    if (lab?.difficulty && !LAB_DIFFICULTIES.has(normalize(lab.difficulty))) issue(report, 'ERROR', 'Labs', 'LAB_DIFFICULTY', `Unsupported difficulty '${lab.difficulty}'.`, file, index);
    if (lab?.externalUrl && !/^https?:\/\//i.test(lab.externalUrl)) issue(report, 'ERROR', 'Labs', 'LAB_URL', `Invalid externalUrl '${lab.externalUrl}'.`, file, index);
    if (lab?.service && !context.serviceAliases.has(normalize(lab.service))) issue(report, 'WARNING', 'Labs', 'UNKNOWN_SERVICE', `Lab service '${lab.service}' is not in the canonical catalog.`, file, index);
  }
  report.counts.labs = labs.length;
}

export function validateCases(cases, context, report, file = 'data/cases/architecture_cases.json') {
  if (!Array.isArray(cases)) {
    issue(report, 'ERROR', 'Cases', 'CASE_FILE_SHAPE', 'Cases source must be an array.', file);
    return;
  }
  const ids = new Set();
  const slugs = new Set();
  for (const [index, item] of cases.entries()) {
    for (const field of ['id', 'slug', 'objective', 'scenario', 'services']) {
      if (item?.[field] === undefined || item?.[field] === null || item?.[field] === '') issue(report, 'ERROR', 'Cases', 'CASE_REQUIRED_FIELD', `Missing required field '${field}'.`, file, index);
    }
    if (ids.has(item?.id)) issue(report, 'ERROR', 'Cases', 'DUPLICATE_CASE_ID', `Duplicate case id '${item?.id}'.`, file, index);
    if (slugs.has(item?.slug)) issue(report, 'ERROR', 'Cases', 'DUPLICATE_CASE_SLUG', `Duplicate case slug '${item?.slug}'.`, file, index);
    if (item?.id) ids.add(item.id);
    if (item?.slug) slugs.add(item.slug);
    const certifications = item?.certifications || [item?.certification];
    if (!certifications.length || certifications.some((certification) => !normalizeCertification(certification))) issue(report, 'ERROR', 'Cases', 'CASE_CERTIFICATION', `Unsupported certification in case '${item?.id}'.`, file, index);
    if (!Array.isArray(item?.services)) issue(report, 'ERROR', 'Cases', 'CASE_SERVICES', `Case '${item?.id}' services must be an array.`, file, index);
    else item.services.forEach((service) => {
      const serviceName = service?.service_slug || service?.slug || service?.service_name || service?.name;
      if (!serviceName || !context.serviceAliases.has(normalize(serviceName))) issue(report, 'WARNING', 'Cases', 'UNKNOWN_SERVICE', `Unknown case service '${serviceName}'.`, file, index);
    });
    if (!item?.architecture_graph || typeof item.architecture_graph !== 'object') issue(report, 'WARNING', 'Cases', 'CASE_ARCHITECTURE', `Case '${item?.id}' has no architecture_graph object.`, file, index);
    if (!item?.content_en && !item?.scenario_en) issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_CONTENT', `Case '${item?.id}' has no English content contract.`, file, index);
  }
  report.counts.cases = cases.length;
}

export function validateTaxonomy(taxonomy, report, file = 'data/taxonomy/canonical_taxonomy.json') {
  const domainIds = new Set();
  const aliases = new Map();
  for (const domain of taxonomy.certification_domains || []) {
    if (domainIds.has(`${domain.certification}:${domain.domain_id}`)) issue(report, 'ERROR', 'Taxonomy', 'DUPLICATE_DOMAIN_ID', `Duplicate domain '${domain.certification}:${domain.domain_id}'.`, file);
    domainIds.add(`${domain.certification}:${domain.domain_id}`);
    for (const alias of [domain.domain_id, domain.official_name, ...(domain.aliases || [])]) {
      const key = `${domain.certification}:${normalize(alias)}`;
      const matches = aliases.get(key) || [];
      matches.push(domain.domain_id);
      aliases.set(key, matches);
    }
  }
  for (const [alias, matches] of aliases) {
    if (new Set(matches).size > 1) issue(report, 'ERROR', 'Taxonomy', 'CONFLICTING_DOMAIN_ALIAS', `Alias '${alias}' maps to multiple domains.`, file);
  }
  const serviceIds = new Set();
  const serviceSlugs = new Set();
  const serviceAliases = new Map();
  for (const service of taxonomy.services || []) {
    if (serviceIds.has(service.service_id)) issue(report, 'ERROR', 'Taxonomy', 'DUPLICATE_SERVICE_ID', `Duplicate service_id '${service.service_id}'.`, file);
    if (serviceSlugs.has(service.service_slug)) issue(report, 'ERROR', 'Taxonomy', 'DUPLICATE_SERVICE_SLUG', `Duplicate service_slug '${service.service_slug}'.`, file);
    serviceIds.add(service.service_id);
    serviceSlugs.add(service.service_slug);
    for (const alias of [service.service_id, service.service_slug, service.service_name, ...(service.aliases || [])]) {
      const key = normalize(alias);
      const matches = serviceAliases.get(key) || [];
      if (!matches.includes(service.service_id)) matches.push(service.service_id);
      serviceAliases.set(key, matches);
    }
  }
  for (const [alias, matches] of serviceAliases) {
    if (new Set(matches).size > 1) issue(report, 'ERROR', 'Taxonomy', 'CONFLICTING_SERVICE_ALIAS', `Alias '${alias}' maps to multiple services.`, file);
  }
  report.counts.services = taxonomy.services?.length || 0;
}

export function validateRuntimeTaxonomy(runtimePaths, taxonomy, report, file = 'src/frontend/js/data.js') {
  const canonicalCounts = new Map();
  for (const domain of taxonomy.certification_domains || []) {
    const certification = normalizeCertification(domain.certification);
    if (certification) canonicalCounts.set(certification, (canonicalCounts.get(certification) || 0) + 1);
  }

  for (const certification of SUPPORTED_CERTIFICATIONS) {
    const runtimeCertification = runtimePaths?.[certification.toLowerCase()];
    const domains = runtimeCertification?.domains || [];
    if (domains.length !== (canonicalCounts.get(certification) || 0)) {
      issue(report, 'WARNING', 'Taxonomy', 'RUNTIME_TAXONOMY_COUNT_DRIFT', `${certification} has ${domains.length} runtime domains but ${canonicalCounts.get(certification) || 0} canonical taxonomy domains.`, file);
    }
    domains.forEach((domain, index) => {
      if (!domain?.id || !domain?.name || !domain?.englishName) {
        issue(report, 'ERROR', 'Taxonomy', 'RUNTIME_DOMAIN_LABELS', `${certification} runtime domain at index ${index} requires id, name and englishName.`, file, index);
      }
    });
  }
}

export function validateFlashcards(cards, context, report, file = 'src/frontend/js/data.js') {
  const ids = new Set();
  for (const [index, card] of (cards || []).entries()) {
    for (const field of ['cert', 'domain', 'term', 'definition']) {
      if (card?.[field] === undefined) issue(report, 'ERROR', 'Flashcards', 'FLASHCARD_REQUIRED_FIELD', `Missing field '${field}'.`, file, index);
    }
    if (ids.has(card?.id)) issue(report, 'ERROR', 'Flashcards', 'DUPLICATE_FLASHCARD_ID', `Duplicate flashcard id '${card?.id}'.`, file, index);
    if (card?.id) ids.add(card.id);
    if (card?.cert !== 'all' && !normalizeCertification(card?.cert)) issue(report, 'ERROR', 'Flashcards', 'FLASHCARD_CERTIFICATION', `Unsupported certification '${card?.cert}'.`, file, index);
    if (card?.cert !== 'all' && card?.domain && !context.domainAliases.has(`${normalizeCertification(card.cert)}:${normalize(card.domain)}`)) issue(report, 'WARNING', 'Flashcards', 'UNKNOWN_DOMAIN', `Unknown flashcard domain '${card.domain}'.`, file, index);
    if (!card?.term?.pt || !card?.term?.en || !card?.definition?.pt || !card?.definition?.en) issue(report, 'CONTENT_GAP', 'Flashcards', 'FLASHCARD_BILINGUAL_CONTENT', 'Flashcard is missing PT/EN term or definition.', file, index);
  }
  report.counts.flashcards = cards?.length || 0;
}

export function validateGamification(badges, report, file = 'data/gamificacao/badges.json') {
  const ids = new Set();
  for (const [index, badge] of (badges || []).entries()) {
    if (!badge?.id || !badge?.regra_desbloqueio || !Number.isFinite(Number(badge?.recompensa_xp))) issue(report, 'ERROR', 'Gamification', 'BADGE_SCHEMA', 'Badge requires id, unlock rule and numeric XP reward.', file, index);
    if (ids.has(badge?.id)) issue(report, 'ERROR', 'Gamification', 'DUPLICATE_BADGE_ID', `Duplicate badge id '${badge?.id}'.`, file, index);
    if (badge?.id) ids.add(badge.id);
  }
  report.counts.badges = badges?.length || 0;
}

export function validateSprintMaps(maps, report, file = 'src/frontend/js/gamificacao/sprintManager.js') {
  for (const certification of SUPPORTED_CERTIFICATIONS.map((value) => value.toLowerCase())) {
    const days = maps?.[certification] || {};
    const dayIds = Object.keys(days).map(Number).sort((a, b) => a - b);
    if (dayIds.length !== 14 || dayIds.some((day, index) => day !== index + 1)) issue(report, 'ERROR', 'Sprint', 'SPRINT_STRUCTURE', `${certification} must contain ordered days 1-14.`, file);
    for (const day of dayIds) {
      if (!days[day]?.pt || !days[day]?.en) issue(report, 'ERROR', 'Sprint', 'SPRINT_LABELS', `${certification} day ${day} requires PT and EN labels.`, file);
    }
  }
  report.counts.sprintStructure = SUPPORTED_CERTIFICATIONS.length * 14;
}

export async function collectGovernanceReport(rootDir) {
  const report = {
    issues: [],
    counts: { questions: {}, labs: 0, cases: 0, services: 0, flashcards: 0, badges: 0, sprintStructure: 0 },
  };
  const taxonomyFile = path.join(rootDir, 'data', 'taxonomy', 'canonical_taxonomy.json');
  const taxonomy = readJson(taxonomyFile);
  const context = createTaxonomyContext(taxonomy);
  validateTaxonomy(taxonomy, report, path.relative(rootDir, taxonomyFile));

  const questionDir = path.join(rootDir, 'data', 'questions');
  const questionPairs = new Map();
  for (const file of fs.readdirSync(questionDir).filter((name) => name.endsWith('.json'))) {
    const ids = validateQuestionFile(path.relative(rootDir, path.join(questionDir, file)), readJson(path.join(questionDir, file)), context, report);
    const pair = file.replace(/-en(?=\.json$)/, '');
    questionPairs.set(pair, [...(questionPairs.get(pair) || []), { file, ids }]);
  }
  for (const [pair, files] of questionPairs) {
    if (files.length === 2 && files[0].ids && files[1].ids && files[0].ids.size !== files[1].ids.size) {
      issue(report, 'CONTENT_GAP', 'Questions', 'QUESTION_LANGUAGE_COUNT', `PT/EN question count differs for ${pair}: ${files[0].ids.size} vs ${files[1].ids.size}.`);
    }
  }

  const labsFile = path.join(rootDir, 'data', 'labs', 'labs.json');
  validateLabs(readJson(labsFile), context, report, path.relative(rootDir, labsFile));
  const casesFile = path.join(rootDir, 'data', 'cases', 'architecture_cases.json');
  validateCases(readJson(casesFile), context, report, path.relative(rootDir, casesFile));
  const badgesFile = path.join(rootDir, 'data', 'gamificacao', 'badges.json');
  validateGamification(readJson(badgesFile), report, path.relative(rootDir, badgesFile));

  const dataModule = await import(pathToFileURL(path.join(rootDir, 'src', 'frontend', 'js', 'data.js')).href);
  validateFlashcards(dataModule.glossaryTerms, context, report);
  validateRuntimeTaxonomy(dataModule.certificationPaths, taxonomy, report);
  const sprintModule = await import(pathToFileURL(path.join(rootDir, 'src', 'frontend', 'js', 'gamificacao', 'sprintManager.js')).href);
  validateSprintMaps(sprintModule.SPRINT_MAPS, report);

  for (const file of ['data/nivelamento/diagnostic-clf-c02.json', 'data/nivelamento/diagnostic-saa-c03.json', 'data/nivelamento/diagnostic-dva-c02.json', 'data/nivelamento/diagnostic-aif-c01.json']) {
    issue(report, 'LEGACY', 'Nivelamento', 'NIVELAMENTO_COMPATIBILITY', `${file} is retained for compatibility; Diagnóstico V2 uses the main question bank.`, file);
  }
  return report;
}

export function summarizeIssues(issues) {
  return Object.fromEntries([...ISSUE_SEVERITIES].map((severity) => [severity, issues.filter((item) => item.severity === severity).length]));
}

async function main() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const report = await collectGovernanceReport(projectRoot);
  const summary = summarizeIssues(report.issues);
  console.log('DATASET GOVERNANCE');
  console.log(`Questions: ${Object.values(report.counts.questions).reduce((total, count) => total + count, 0)}`);
  console.log(`Labs: ${report.counts.labs}`);
  console.log(`Cases: ${report.counts.cases}`);
  console.log(`Flashcards: ${report.counts.flashcards}`);
  console.log(`Services: ${report.counts.services}`);
  console.log(`Sprint structural days: ${report.counts.sprintStructure}`);
  console.log(`ERRORS: ${summary.ERROR}`);
  console.log(`WARNINGS: ${summary.WARNING}`);
  console.log(`CONTENT GAPS: ${summary.CONTENT_GAP}`);
  console.log(`LEGACY: ${summary.LEGACY}`);
  for (const severity of ['ERROR', 'WARNING', 'CONTENT_GAP', 'LEGACY']) {
    const items = report.issues.filter((item) => item.severity === severity);
    if (items.length) {
      console.log(`\n${severity}`);
      items.slice(0, 20).forEach((item) => console.log(`- [${item.dataset}] ${item.message}${item.file ? ` (${item.file})` : ''}`));
      if (items.length > 20) console.log(`- ... ${items.length - 20} more`);
    }
  }
  process.exitCode = summary.ERROR > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
