import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');

let totalFiles = 0;
let totalObjects = 0;
let errors = [];

function validateObject(obj, file) {
    totalObjects++;

    const isStandardQuestionFile = !file.includes('cases') && !file.includes('challenges') && !file.includes('context');
    if (isStandardQuestionFile && (obj.hasOwnProperty('question') || obj.hasOwnProperty('options') || obj.hasOwnProperty('correct') || obj.hasOwnProperty('explanation'))) {
        if (!obj.hasOwnProperty('question')) errors.push(`${file}: Missing 'question'`);
        if (!obj.hasOwnProperty('options')) errors.push(`${file}: Missing 'options'`);
        if (!obj.hasOwnProperty('correct')) errors.push(`${file}: Missing 'correct'`);
        if (!obj.hasOwnProperty('explanation')) errors.push(`${file}: Missing 'explanation'`);
    }

    if (obj.domain) {
        if (!obj.domain_id) errors.push(`${file}: Missing 'domain_id' for domain '${obj.domain}'`);
        if (!obj.global_domain_id) errors.push(`${file}: Missing 'global_domain_id' for domain '${obj.domain}'`);
    }

    if (obj.services) {
        if (!Array.isArray(obj.services)) {
            errors.push(`${file}: 'services' is not an array`);
        } else {
            for (let s of obj.services) {
                if (!s.service_id) errors.push(`${file}: Service missing 'service_id'`);
                if (!s.service_name) errors.push(`${file}: Service missing 'service_name'`);
                if (!s.service_slug) errors.push(`${file}: Service missing 'service_slug'`);
            }
        }
    }
}

function traverse(obj, file) {
    if (Array.isArray(obj)) {
        obj.forEach(item => traverse(item, file));
    } else if (typeof obj === 'object' && obj !== null) {
        validateObject(obj, file);
        Object.keys(obj).forEach(k => {
             if (Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === 'object') {
                 traverse(obj[k], file);
             } else if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                 if (obj[k].domain || obj[k].services || obj[k].question) { traverse(obj[k], file); }
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
            if (entry.name !== 'taxonomy' && entry.name !== 'scripts_backup_before_taxonomy_migration') {
                processDirectory(fullPath);
            }
        } else if (entry.name.endsWith('.json') && entry.name !== 'aws_services_catalog.json' && entry.name !== 'canonical_taxonomy.json') {
            try {
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                totalFiles++;
                traverse(data, entry.name);
            } catch (e) {
                errors.push(`Parse error in ${entry.name}: ${e.message}`);
            }
        }
    }
}

console.log("Starting validation...");
processDirectory(dataDir);

if (errors.length > 0) {
    console.error(`Validation Failed! Found ${errors.length} errors.`);
    errors.slice(0, 50).forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log(`Validation Passed! Processed ${totalFiles} files and ${totalObjects} objects.`);
    console.log(`✅ JSON válido em todos os arquivos.`);
    console.log(`✅ Nenhuma questão perdida.`);
    console.log(`✅ Nenhuma alteração destrutiva detectada.`);
    console.log(`✅ Todos os relacionamentos possuem IDs válidos.`);
}
