import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
const taxonomyPath = path.join(dataDir, 'taxonomy', 'canonical_taxonomy.json');

const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const orphans = {};

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

function traverse(obj, file, certContext) {
    if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item, file, certContext));
    } else if (typeof obj === 'object' && obj !== null) {
        let svcKeys = ['service', 'aws_service', 'service_aws'];
        for (let k of svcKeys) {
            if (obj[k]) {
                let valList = Array.isArray(obj[k]) ? obj[k] : [obj[k]];
                for (let val of valList) {
                    let match = getServiceMatch(val);
                    if (!match) {
                        const v = String(val);
                        if (!orphans[v]) orphans[v] = { freq: 0, certs: new Set() };
                        orphans[v].freq++;
                        if (certContext) orphans[v].certs.add(certContext);
                    }
                }
            }
        }
        Object.keys(obj).forEach(k => {
             if (typeof obj[k] === 'object' && obj[k] !== null) {
                 traverse(obj[k], file, certContext);
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
        } else if (entry.name.endsWith('.json')) {
            try {
                let certContext = null;
                for (const c of taxonomy.certifications) {
                    if (entry.name.toLowerCase().includes(c.id.toLowerCase())) { certContext = c.id; break; }
                }
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                traverse(data, entry.name, certContext);
            } catch (e) {
                console.error(`Error in ${entry.name}: ${e.message}`);
            }
        }
    }
}

processDirectory(dataDir);

const output = Object.keys(orphans).map(k => {
    return {
        service_name: k,
        freq: orphans[k].freq,
        certs: Array.from(orphans[k].certs)
    };
}).sort((a, b) => b.freq - a.freq);

fs.writeFileSync(path.join(projectRoot, 'docs', 'orphans.json'), JSON.stringify(output, null, 2), 'utf8');
console.log(`Found ${output.length} orphan services.`);
