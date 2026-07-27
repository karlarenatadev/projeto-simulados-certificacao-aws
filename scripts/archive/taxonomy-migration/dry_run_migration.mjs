import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
const taxonomyPath = path.join(dataDir, 'taxonomy', 'canonical_taxonomy.json');

const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

let recordsAnalyzed = 0;
let recordsChanged = 0;
const changes = [];
const conflicts = [];

function getCertMatch(val) {
    if (!val) return null;
    const s = String(val).toLowerCase();
    for (const c of taxonomy.certifications) {
        if (c.id.toLowerCase() === s) return c.id;
        for (const a of c.aliases) {
            if (a.toLowerCase() === s) return c.id;
        }
    }
    return null;
}

function getDomainMatch(val, certIdContext) {
    if (!val) return null;
    const s = String(val).toLowerCase();
    for (const d of taxonomy.certification_domains) {
        if (certIdContext && d.certification !== certIdContext) continue;
        if (d.domain_id.toLowerCase() === s || d.official_name.toLowerCase() === s) return d;
        for (const a of d.aliases) {
            if (a.toLowerCase() === s) return d;
        }
    }
    for (const d of taxonomy.certification_domains) {
        if (d.domain_id.toLowerCase() === s || d.official_name.toLowerCase() === s) return d;
        for (const a of d.aliases) {
            if (a.toLowerCase() === s) return d;
        }
    }
    return null;
}

function getServiceMatch(val) {
    if (!val) return null;
    const s = String(val).toLowerCase();
    for (const svc of taxonomy.services) {
        if (svc.service_id.toLowerCase() === s || svc.service_slug.toLowerCase() === s || svc.service_name.toLowerCase() === s) return svc;
        for (const a of svc.aliases) {
            if (a.toLowerCase() === s) return svc;
        }
    }
    return null;
}

function analyzeObject(obj, file, certContext) {
    let changed = false;

    let certKeys = ['certification', 'cert_target', 'certification_target'];
    for (let k of certKeys) {
        if (obj[k]) {
            let match = getCertMatch(obj[k]);
            if (match && match !== obj[k]) {
                changes.push({ file, field: k, old: obj[k], new: match });
                obj.certification = match;
                if (k !== 'certification') delete obj[k];
                changed = true;
            }
            if (match) certContext = match;
        }
    }

    let domainKeys = ['domain', 'category'];
    for (let k of domainKeys) {
        if (obj[k]) {
            let match = getDomainMatch(obj[k], certContext);
            if (match) {
                if (obj[k] !== match.official_name || !obj.domain_id || !obj.global_domain_id) {
                    changes.push({ file, field: k, old: obj[k], new: match.official_name });
                    obj.domain = match.official_name;
                    obj.domain_id = match.domain_id;
                    obj.global_domain_id = match.global_domain_id;
                    if (k !== 'domain') delete obj[k];
                    changed = true;
                }
            } else {
                conflicts.push({ file, field: k, value: obj[k], reason: "Domain not found in taxonomy" });
            }
        }
    }

    let svcKeys = ['service', 'aws_service', 'service_aws'];
    for (let k of svcKeys) {
        if (obj[k]) {
            let valList = Array.isArray(obj[k]) ? obj[k] : [obj[k]];
            let newServices = [];
            for (let val of valList) {
                let match = getServiceMatch(val);
                if (match) {
                     newServices.push({ service_id: match.service_id, service_name: match.service_name, service_slug: match.service_slug });
                     if (String(val) !== match.service_name) {
                         changes.push({ file, field: k, old: val, new: match.service_name });
                         changed = true;
                     }
                } else {
                     conflicts.push({ file, field: k, value: val, reason: "Service not found in taxonomy" });
                     newServices.push(val); 
                }
            }
            
            if (changed) {
                delete obj.service; delete obj.aws_service; delete obj.service_aws;
                obj.services_aws = Array.isArray(obj[k]) ? newServices : newServices[0];
            }
        }
    }

    if (changed) recordsChanged++;
}

function traverse(obj, file, certContext) {
    if (Array.isArray(obj)) {
        obj.forEach(item => { recordsAnalyzed++; traverse(item, file, certContext); });
    } else if (typeof obj === 'object' && obj !== null) {
        analyzeObject(obj, file, certContext);
        Object.keys(obj).forEach(k => {
             if (Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === 'object') {
                 traverse(obj[k], file, certContext);
             } else if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                 if (obj[k].domain || obj[k].service) { recordsAnalyzed++; traverse(obj[k], file, certContext); }
             }
        });
    }
}

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'taxonomy') processDirectory(fullPath);
        } else if (entry.name.endsWith('.json') && entry.name !== 'aws_services_catalog.json' && entry.name !== 'canonical_taxonomy.json') {
            try {
                let certContext = null;
                for (const c of taxonomy.certifications) {
                    if (entry.name.toLowerCase().includes(c.id.toLowerCase())) { certContext = c.id; break; }
                }
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (!Array.isArray(data)) recordsAnalyzed++;
                traverse(data, entry.name, certContext);
            } catch (e) {
                console.error(`Error in ${entry.name}: ${e.message}`);
            }
        }
    }
}

console.log("Starting Dry Run Analysis...");
processDirectory(dataDir);

const reportPath = path.join(projectRoot, 'docs', 'DRY_RUN_REPORT.md');
if (!fs.existsSync(path.dirname(reportPath))) fs.mkdirSync(path.dirname(reportPath), { recursive: true });

let md = `# Relatório de Dry-Run: Migração de Taxonomia\n\n`;
md += `- **Registros Analisados:** ${recordsAnalyzed}\n`;
md += `- **Registros que sofrerão alteração:** ${recordsChanged}\n`;
md += `- **Conflitos (Valores Órfãos):** ${conflicts.length}\n\n`;

md += `## Conflitos (Não mapeados na taxonomia canônica)\n`;
if (conflicts.length === 0) md += `Nenhum conflito encontrado! Tudo está mapeado.\n`;
else {
    const uniqueConflicts = [...new Set(conflicts.map(c => `${c.field}: "${c.value}" in ${c.file}`))];
    uniqueConflicts.slice(0, 50).forEach(c => md += `- ${c}\n`);
    if (uniqueConflicts.length > 50) md += `- ... e mais ${uniqueConflicts.length - 50}\n`;
}

md += `\n## Exemplos de Alterações\n`;
const sampleChanges = changes.slice(0, 20);
sampleChanges.forEach(c => {
    md += `- Arquivo: \`${c.file}\` | Campo: \`${c.field}\` | De: \`${c.old}\` ➡️ Para: \`${c.new}\`\n`;
});

fs.writeFileSync(reportPath, md, 'utf8');
console.log(`Dry Run completed. Report generated at ${reportPath}`);
