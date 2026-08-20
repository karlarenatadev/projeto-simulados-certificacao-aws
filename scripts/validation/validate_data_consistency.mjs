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
  const coveredDomains = new Set();
  for (const [index, lab] of labs.entries()) {
    for (const field of ['id', 'title', 'description', 'certification', 'domain', 'service', 'difficulty', 'duration', 'provider', 'externalUrl', 'active']) {
      if (lab?.[field] === undefined || lab?.[field] === null || lab?.[field] === '') issue(report, 'ERROR', 'Labs', 'LAB_REQUIRED_FIELD', `Missing required field '${field}'.`, file, index);
    }
    if (ids.has(lab?.id)) issue(report, 'ERROR', 'Labs', 'DUPLICATE_LAB_ID', `Duplicate lab id '${lab?.id}'.`, file, index);
    if (lab?.id) ids.add(lab.id);
    const certification = normalizeCertification(lab?.certification);
    if (!certification) issue(report, 'ERROR', 'Labs', 'LAB_CERTIFICATION', `Unsupported certification '${lab?.certification}'.`, file, index);
    const domainKey = certification ? `${certification}:${normalize(lab?.domain)}` : null;
    if (!domainKey || !context.domainsByCertification.has(domainKey)) {
      issue(report, 'ERROR', 'Labs', 'LAB_DOMAIN', `Unsupported domain '${lab?.domain}' for certification '${lab?.certification}'.`, file, index);
    } else if (lab?.active === true) {
      coveredDomains.add(domainKey);
    }
    if (lab?.difficulty && !LAB_DIFFICULTIES.has(normalize(lab.difficulty))) issue(report, 'ERROR', 'Labs', 'LAB_DIFFICULTY', `Unsupported difficulty '${lab.difficulty}'.`, file, index);
    if (typeof lab?.duration !== 'number' || lab.duration <= 0) issue(report, 'ERROR', 'Labs', 'LAB_DURATION', `Lab duration must be a positive number.`, file, index);
    if (typeof lab?.active !== 'boolean') issue(report, 'ERROR', 'Labs', 'LAB_ACTIVE', `Lab active must be boolean.`, file, index);
    if (lab?.externalUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(lab.externalUrl);
      } catch {
        parsedUrl = null;
      }
      const allowedHost = parsedUrl
        && ['explore.skillbuilder.aws', 'skillbuilder.aws'].includes(parsedUrl.hostname.toLowerCase());
      if (!parsedUrl || parsedUrl.protocol !== 'https:' || !allowedHost || /\[[^\]]+\]\([^\)]+\)/.test(lab.externalUrl)) {
        issue(report, 'ERROR', 'Labs', 'LAB_URL', `Invalid or non-canonical externalUrl '${lab.externalUrl}'.`, file, index);
      }
    }
    if (lab?.service && !context.serviceAliases.has(normalize(lab.service))) issue(report, 'WARNING', 'Labs', 'UNKNOWN_SERVICE', `Lab service '${lab.service}' is not in the canonical catalog.`, file, index);
    for (const [locale, content] of [['pt', lab?.content_pt], ['en', lab?.content_en]]) {
      for (const field of ['title', 'description']) {
        if (typeof content?.[field] !== 'string' || !content[field].trim()) {
          issue(report, 'CONTENT_GAP', 'Labs', 'LAB_BILINGUAL_FIELD', `Lab '${lab?.id}' ${locale} field '${field}' is missing.`, file, index);
        }
      }
    }
  }
  const taxonomyEntries = context?.domainsByCertification instanceof Map
    ? [...context.domainsByCertification.entries()]
    : [];
  const domainsByCertification = new Map(taxonomyEntries.reduce((groups, [key, domain]) => {
    const [cert] = key.split(':');
    const list = groups.get(cert) || [];
    list.push(domain.domain_id);
    groups.set(cert, list);
    return groups;
  }, new Map()));
  for (const [certification, domains] of domainsByCertification) {
    for (const domain of domains) {
      if (!coveredDomains.has(`${certification}:${normalize(domain)}`)) {
        issue(report, 'CONTENT_GAP', 'Labs', 'LAB_DOMAIN_COVERAGE', `No active Lab covers '${certification}:${domain}'.`, file);
      }
    }
  }
  report.counts.labs = labs.length;
}

function validateBuilderConfig(item, context, report, file, index) {
  const builder = item?.builder;
  if (!builder || typeof builder !== 'object' || Array.isArray(builder)) {
    return false;
  }

  const arrays = ['required_services', 'optional_services', 'distractors', 'required_connections'];
  arrays.forEach((field) => {
    if (!Array.isArray(builder[field])) {
      issue(report, 'ERROR', 'Cases', 'BUILDER_FIELD_SCHEMA', `Case '${item?.id}' builder.${field} must be an array.`, file, index);
    }
  });
  if (!Array.isArray(builder.required_services) || builder.required_services.length === 0) {
    issue(report, 'ERROR', 'Cases', 'BUILDER_REQUIRED_SERVICES', `Case '${item?.id}' builder.required_services must not be empty.`, file, index);
  }

  const categories = new Map();
  for (const [category, values] of [
    ['required_services', builder.required_services],
    ['optional_services', builder.optional_services],
    ['distractors', builder.distractors],
  ]) {
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const key = normalize(value);
      if (!key) {
        issue(report, 'ERROR', 'Cases', 'BUILDER_EMPTY_SERVICE', `Case '${item?.id}' contains an empty builder service.`, file, index);
        continue;
      }
      if (categories.has(key)) {
        issue(report, 'ERROR', 'Cases', 'BUILDER_DUPLICATE_SERVICE', `Case '${item?.id}' repeats builder service '${value}' across categories.`, file, index);
      }
    categories.set(key, category);
      if (!context.serviceAliases?.has(key)) {
        issue(report, 'ERROR', 'Cases', 'BUILDER_UNKNOWN_SERVICE', `Builder ${category} service '${value}' is not canonical or governance-pending.`, file, index);
      }
    }
  }

  for (const required of Array.isArray(builder.required_services) ? builder.required_services : []) {
    const serviceKey = normalize(required);
    if (!context.serviceAliases?.has(serviceKey)) {
      issue(report, 'ERROR', 'Cases', 'BUILDER_UNKNOWN_REQUIRED_SERVICE', `Required builder service '${required}' is not canonical or governance-pending.`, file, index);
    }
  }

  if (Array.isArray(builder.required_connections)) {
    builder.required_connections.forEach((connection) => {
      if (!Array.isArray(connection) || connection.length !== 2 || connection.some((service) => !categories.has(normalize(service)))) {
        issue(report, 'ERROR', 'Cases', 'BUILDER_CONNECTION_REFERENCE', `Case '${item?.id}' has a builder connection that does not reference two configured services.`, file, index);
      }
    });
  }
  return true;
}

export function validateCases(cases, context, report, file = 'data/cases/architecture_cases.json') {
  if (!Array.isArray(cases)) {
    issue(report, 'ERROR', 'Cases', 'CASE_FILE_SHAPE', 'Cases source must be an array.', file);
    return;
  }
  const ids = new Set();
  const slugs = new Set();
  let builderConfigured = 0;
  for (const [index, item] of cases.entries()) {
    for (const field of ['id', 'slug', 'objective', 'scenario', 'services']) {
      if (item?.[field] === undefined || item?.[field] === null || item?.[field] === '') issue(report, 'ERROR', 'Cases', 'CASE_REQUIRED_FIELD', `Missing required field '${field}'.`, file, index);
    }
    if (ids.has(item?.id)) issue(report, 'ERROR', 'Cases', 'DUPLICATE_CASE_ID', `Duplicate case id '${item?.id}'.`, file, index);
    if (slugs.has(item?.slug)) issue(report, 'ERROR', 'Cases', 'DUPLICATE_CASE_SLUG', `Duplicate case slug '${item?.slug}'.`, file, index);
    if (item?.id) ids.add(item.id);
    if (item?.slug) slugs.add(item.slug);
    if (validateBuilderConfig(item, context, report, file, index)) builderConfigured += 1;
    else issue(report, 'ERROR', 'Cases', 'BUILDER_REQUIRED', `Case '${item?.id}' must define a Builder contract.`, file, index);
    const certifications = item?.certifications || [item?.certification];
    if (!certifications.length || certifications.some((certification) => !normalizeCertification(certification))) issue(report, 'ERROR', 'Cases', 'CASE_CERTIFICATION', `Unsupported certification in case '${item?.id}'.`, file, index);
    if (!Array.isArray(item?.services)) issue(report, 'ERROR', 'Cases', 'CASE_SERVICES', `Case '${item?.id}' services must be an array.`, file, index);
    else item.services.forEach((service) => {
      const serviceName = service?.service_slug || service?.slug || service?.service_name || service?.name;
      if (!serviceName || !context.serviceAliases.has(normalize(serviceName))) issue(report, 'WARNING', 'Cases', 'UNKNOWN_SERVICE', `Unknown case service '${serviceName}'.`, file, index);
    });
    if (!item?.architecture_graph || typeof item.architecture_graph !== 'object') issue(report, 'WARNING', 'Cases', 'CASE_ARCHITECTURE', `Case '${item?.id}' has no architecture_graph object.`, file, index);
    const english = item?.content_en;
    if (!english || typeof english !== 'object') {
      issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_CONTENT', `Case '${item?.id}' has no English content contract.`, file, index);
      continue;
    }
    for (const field of ['title', 'objective', 'scenario']) {
      if (typeof english[field] !== 'string' || !english[field].trim()) {
        issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_FIELD', `Case '${item?.id}' English field '${field}' is missing.`, file, index);
      }
    }
    if (!Array.isArray(english.services) || english.services.length !== item.services.length) {
      issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_SERVICES', `Case '${item?.id}' English services are incomplete.`, file, index);
    } else {
      english.services.forEach((service, serviceIndex) => {
        if (typeof service?.role_note !== 'string' || !service.role_note.trim()) {
          issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_SERVICE_ROLE', `Case '${item?.id}' English service role ${serviceIndex + 1} is missing.`, file, index);
        }
      });
    }
    if (item.architecture_graph?.content && (!english.architecture_graph?.content || !english.architecture_graph?.type)) {
      issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_ARCHITECTURE', `Case '${item?.id}' English architecture graph is incomplete.`, file, index);
    }
    if (!Array.isArray(english.questions) || english.questions.length !== (item.questions || []).length) {
      issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_QUESTIONS', `Case '${item?.id}' English questions are incomplete.`, file, index);
    } else {
      english.questions.forEach((question, questionIndex) => {
        const sourceQuestion = item.questions[questionIndex];
        if (typeof question?.question_text !== 'string' || !question.question_text.trim() || typeof question.explanation !== 'string' || !question.explanation.trim()) {
          issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_QUESTION_FIELD', `Case '${item?.id}' English question ${questionIndex + 1} is incomplete.`, file, index);
        }
        if (!Array.isArray(question?.options) || question.options.length !== (sourceQuestion.options || []).length || question.options.some((option) => typeof option?.text !== 'string' || !option.text.trim())) {
          issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_OPTIONS', `Case '${item?.id}' English question ${questionIndex + 1} options are incomplete.`, file, index);
        }
        if (JSON.stringify(question?.correct_answer || []) !== JSON.stringify(sourceQuestion.correct_answer || [])) {
          issue(report, 'ERROR', 'Cases', 'CASE_ANSWER_DRIFT', `Case '${item?.id}' question ${questionIndex + 1} changed correct_answer between languages.`, file, index);
        }
      });
    }
    if (Array.isArray(item.resources) && (!Array.isArray(english.resources) || english.resources.length !== item.resources.length || english.resources.some((resource) => typeof resource?.title !== 'string' || !resource.title.trim()))) {
      issue(report, 'CONTENT_GAP', 'Cases', 'CASE_EN_RESOURCES', `Case '${item?.id}' English resources are incomplete.`, file, index);
    }
  }
  report.counts.cases = cases.length;
  report.counts.builderConfigured = builderConfigured;
  report.counts.builderMigrationPending = cases.length - builderConfigured;
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

export function validateExamTips(tips, context, report, file = 'data/exam-tips.json') {
  const validTypes = new Set(['keyword', 'comparison', 'trap', 'mental-shortcut']);
  if (!Array.isArray(tips)) {
    issue(report, 'ERROR', 'ExamTips', 'EXAM_TIPS_FILE_SHAPE', 'Exam tips source must be an array.', file);
    return;
  }
  const ids = new Set();
  for (const [index, tip] of tips.entries()) {
    if (!tip?.id || ids.has(tip.id)) issue(report, 'ERROR', 'ExamTips', 'DUPLICATE_EXAM_TIP_ID', `Exam tip id '${tip?.id}' is missing or duplicated.`, file, index);
    if (tip?.id) ids.add(tip.id);
    if (!validTypes.has(tip?.type)) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_TYPE', `Exam tip '${tip?.id}' has an invalid type.`, file, index);
    const certifications = Array.isArray(tip?.certifications) ? tip.certifications : [];
    if (!certifications.length || certifications.some((certification) => !SUPPORTED_CERTIFICATIONS.includes(normalizeCertification(certification)))) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_CERTIFICATION', `Exam tip '${tip?.id}' has an unknown certification.`, file, index);
    const certification = normalizeCertification(certifications[0]);
    if (!tip?.domain || !context.domainAliases.has(`${certification}:${normalize(tip.domain)}`)) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_DOMAIN', `Exam tip '${tip?.id}' has an unknown domain.`, file, index);
    for (const language of ['pt', 'en']) {
      if (!tip?.title?.[language] || !tip?.description?.[language]) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_BILINGUAL_CONTENT', `Exam tip '${tip?.id}' requires title and description in ${language.toUpperCase()}.`, file, index);
    }
    if (!Array.isArray(tip?.keywords) || tip.keywords.length === 0 || !Array.isArray(tip?.services) || tip.services.length === 0) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_SEARCH_FIELDS', `Exam tip '${tip?.id}' requires keywords and services.`, file, index);
    for (const service of tip?.services || []) if (!context.serviceAliases.has(normalize(service))) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_UNKNOWN_SERVICE', `Exam tip '${tip?.id}' references unknown service '${service}'.`, file, index);
    if (tip?.type === 'comparison' && (!tip.comparison?.pt || !tip.comparison?.en)) issue(report, 'ERROR', 'ExamTips', 'EXAM_TIP_COMPARISON', `Comparison '${tip?.id}' requires PT and EN comparison content.`, file, index);
  }
  report.counts.examTips = tips.length;
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

export function validateSprintMaps(maps, report, file = 'src/frontend/js/gamificacao/sprintManager.js', pillData = null) {
  for (const certification of SUPPORTED_CERTIFICATIONS.map((value) => value.toLowerCase())) {
    const days = maps?.[certification] || {};
    const dayIds = Object.keys(days).map(Number).sort((a, b) => a - b);
    if (dayIds.length !== 14 || dayIds.some((day, index) => day !== index + 1)) issue(report, 'ERROR', 'Sprint', 'SPRINT_STRUCTURE', `${certification} must contain ordered days 1-14.`, file);
    for (const day of dayIds) {
      if (!days[day]?.pt || !days[day]?.en) issue(report, 'ERROR', 'Sprint', 'SPRINT_LABELS', `${certification} day ${day} requires PT and EN labels.`, file);
      const pill = pillData?.[certification]?.[day];
      for (const language of ['pt', 'en']) {
        const localized = pill?.[language];
        if (!localized?.title || !localized?.topic || !localized?.content || !localized?.keyTakeaway || !localized?.readTime) {
          issue(report, 'ERROR', 'Sprint', 'SPRINT_CONTENT', `${certification} day ${day} requires detailed ${language.toUpperCase()} content.`, file);
        }
      }
    }
  }
  report.counts.sprintStructure = SUPPORTED_CERTIFICATIONS.length * 14;
}

export async function collectGovernanceReport(rootDir) {
  const report = {
    issues: [],
    counts: { questions: {}, labs: 0, cases: 0, services: 0, flashcards: 0, examTips: 0, badges: 0, sprintStructure: 0 },
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
  validateExamTips(readJson(path.join(rootDir, 'data', 'exam-tips.json')), context, report);
  validateRuntimeTaxonomy(dataModule.certificationPaths, taxonomy, report);
  const sprintModule = await import(pathToFileURL(path.join(rootDir, 'src', 'frontend', 'js', 'gamificacao', 'sprintManager.js')).href);
  const sprintDataModule = await import(pathToFileURL(path.join(rootDir, 'src', 'frontend', 'js', 'sprintData.js')).href);
  validateSprintMaps(sprintModule.SPRINT_MAPS, report, undefined, sprintDataModule.sprintPillsData);

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
  console.log(`Cases with Builder config: ${report.counts.builderConfigured || 0}`);
  console.log(`Builder migration pending: ${report.counts.builderMigrationPending || 0}`);
  console.log(`Flashcards: ${report.counts.flashcards}`);
  console.log(`Exam tips: ${report.counts.examTips}`);
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
