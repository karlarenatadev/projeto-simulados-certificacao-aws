import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
const taxonomyPath = path.join(dataDir, 'taxonomy', 'canonical_taxonomy.json');

const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

let filesProcessed = 0;
let recordsChanged = 0;
let newFieldsAdded = 0;
let domainsNormalized = 0;
let servicesLinked = 0;

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

    // Fix certification fields
    let certKeys = ['certification', 'cert_target', 'certification_target'];
    let originalCert = obj.certification;
    for (let k of certKeys) {
        if (obj[k]) {
            let match = getCertMatch(obj[k]);
            if (match) {
                obj.certification = match;
                if (k !== 'certification') delete obj[k];
                changed = true;
            }
            if (match) certContext = match;
        }
    }
    // ensure certification is retained if already correct
    if (!obj.certification && originalCert) obj.certification = originalCert;


    // Fix Domain fields
    let domainKeys = ['domain', 'category'];
    for (let k of domainKeys) {
        if (obj[k]) {
            let match = getDomainMatch(obj[k], certContext);
            if (match) {
                if (obj[k] !== match.official_name || !obj.domain_id || !obj.global_domain_id) {
                    obj.domain = match.official_name;
                    obj.domain_id = match.domain_id;
                    obj.global_domain_id = match.global_domain_id;
                    if (k !== 'domain') delete obj[k];
                    
                    changed = true;
                    domainsNormalized++;
                    newFieldsAdded += 2; // domain_id and global_domain_id
                }
            }
        }
    }

    // Fix Services fields
    let svcKeys = ['service', 'aws_service', 'service_aws', 'services', 'services_aws'];
    for (let k of svcKeys) {
        if (obj[k]) {
            let valList = Array.isArray(obj[k]) ? obj[k] : [obj[k]];
            let newServices = [];
            for (let val of valList) {
                // If it's already an object (safety check)
                if (typeof val === 'object' && val !== null && val.service_id) {
                    newServices.push(val);
                    continue;
                }
                let match = getServiceMatch(val);
                if (match) {
                     newServices.push({ 
                         service_id: match.service_id, 
                         service_name: match.service_name, 
                         service_slug: match.service_slug 
                     });
                     servicesLinked++;
                     newFieldsAdded++;
                     changed = true;
                } else {
                     newServices.push({ 
                         service_id: "unknown", 
                         service_name: String(val), 
                         service_slug: String(val).toLowerCase() 
                     });
                     changed = true;
                }
            }
            
            if (changed || k !== 'services') {
                if (k !== 'services') delete obj[k];
                // Ensure unique objects by ID
                const uniqueSvcs = [];
                const seenIds = new Set();
                for (let ns of newServices) {
                     if (!seenIds.has(ns.service_id)) {
                         seenIds.add(ns.service_id);
                         uniqueSvcs.push(ns);
                     }
                }
                obj.services = uniqueSvcs;
            }
        }
    }

    // Preserve core fields (no action needed, they just aren't deleted)
    if (changed) recordsChanged++;
}

function traverse(obj, file, certContext) {
    if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item, file, certContext));
    } else if (typeof obj === 'object' && obj !== null) {
        analyzeObject(obj, file, certContext);
        Object.keys(obj).forEach(k => {
             if (Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === 'object') {
                 traverse(obj[k], file, certContext);
             } else if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                 if (obj[k].domain || obj[k].service) { traverse(obj[k], file, certContext); }
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
                
                // Deep clone to compare if changed
                const originalStr = JSON.stringify(data);
                traverse(data, entry.name, certContext);
                const modifiedStr = JSON.stringify(data, null, 2);
                
                if (originalStr !== JSON.stringify(data)) {
                    fs.writeFileSync(fullPath, modifiedStr, 'utf8');
                    filesProcessed++;
                }
            } catch (e) {
                console.error(`Error in ${entry.name}: ${e.message}`);
            }
        }
    }
}

console.log("Starting Migration...");
processDirectory(dataDir);

const reportPath = path.join(projectRoot, 'docs', 'taxonomy_migration_report.md');
if (!fs.existsSync(path.dirname(reportPath))) fs.mkdirSync(path.dirname(reportPath), { recursive: true });

let md = `# Relatório de Migração de Taxonomia\n\n`;
md += `- **Data/Hora:** ${new Date().toISOString()}\n`;
md += `- **Arquivos Processados (Alterados):** ${filesProcessed}\n`;
md += `- **Registros Alterados:** ${recordsChanged}\n`;
md += `- **Novos Campos Adicionados:** ${newFieldsAdded}\n`;
md += `- **Domínios Normalizados:** ${domainsNormalized}\n`;
md += `- **Serviços AWS Vinculados:** ${servicesLinked}\n`;

fs.writeFileSync(reportPath, md, 'utf8');
console.log(`Migration completed. Report generated at ${reportPath}`);
