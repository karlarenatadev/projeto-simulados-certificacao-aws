import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

const taxonomyPath = path.join(projectRoot, 'data', 'taxonomy', 'canonical_taxonomy.json');
const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const orphans = JSON.parse(fs.readFileSync(path.join(projectRoot, 'docs', 'orphans.json'), 'utf8'));

// We want to map each orphan to an existing service OR a new service.
// Let's create a map of existing aliases to lower case to check.
const existingAliases = new Set();
taxonomy.services.forEach(s => {
    existingAliases.add(s.service_id.toLowerCase());
    existingAliases.add(s.service_slug.toLowerCase());
    existingAliases.add(s.service_name.toLowerCase());
    s.aliases.forEach(a => existingAliases.add(a.toLowerCase()));
});

let newServices = 0;

for (const o of orphans) {
    let name = o.service_name.trim();
    if (!name) continue;
    let lName = name.toLowerCase();
    if (existingAliases.has(lName)) continue;

    // Create a new service entry
    let slug = name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    if (!slug) slug = "unknown-service-" + Math.floor(Math.random()*1000);
    
    // Check if we already created a slug for another variation
    let existingService = taxonomy.services.find(s => s.service_slug === slug);
    if (existingService) {
        if (!existingService.aliases.map(a=>a.toLowerCase()).includes(lName)) {
            existingService.aliases.push(name);
            existingAliases.add(lName);
        }
    } else {
        taxonomy.services.push({
            service_id: slug,
            service_slug: slug,
            service_name: name,
            aliases: [name]
        });
        existingAliases.add(lName);
        newServices++;
    }
}

fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomy, null, 2), 'utf8');

// Generate report
let report = `# Relatório de Enriquecimento da Taxonomia\n\n`;
report += `- Novos Serviços Únicos Adicionados: ${newServices}\n\n`;
report += `### Principais Adições (Top 30 Ocorrências)\n\n`;
report += `| Serviço / String Encontrada | Ocorrências | Certificações | Categoria Sugerida |\n`;
report += `|---|---|---|---|\n`;

orphans.slice(0, 30).forEach(o => {
    report += `| ${o.service_name} | ${o.freq} | ${o.certs.join(', ')} | A Definir |\n`;
});

const reportPath = path.join(projectRoot, 'docs', 'ENRICHMENT_REPORT.md');
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`Enrichment complete. Added ${newServices} services. Report at ${reportPath}`);
