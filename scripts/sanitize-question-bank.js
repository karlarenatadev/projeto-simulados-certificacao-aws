import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve('./data/questions');
const SANITIZED_DIR = path.resolve('./data_sanitized');
const MANIFEST_PATH = path.resolve('./data/taxonomy/certification-manifest.json');
const AUDIT_REPORT = path.resolve('./docs/question-bank-audit.md');
const SANITIZE_REPORT = path.resolve('./docs/question-bank-sanitization-report.md');

// Certifications that should NEVER be mentioned in a question for cert X
const ALL_CERTS = ['CLF', 'SAA', 'SAP', 'DVA', 'DOP', 'AIF', 'MLS', 'ANS', 'SCS', 'PAS', 'DEA'];

if (!fs.existsSync(SANITIZED_DIR)) {
  fs.mkdirSync(SANITIZED_DIR, { recursive: true });
}
if (!fs.existsSync(path.resolve('./docs'))) {
  fs.mkdirSync(path.resolve('./docs'), { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Helper to generate deterministic short ID
function generateId(text, certId) {
    const hash = crypto.createHash('sha256').update(certId + text).digest('hex');
    // base62 like short id, take first 8 chars
    return `${certId}-${hash.substring(0, 8)}`;
}

async function run() {
    let auditMarkdown = '# Question Bank Audit (Pre-Sanitization)\n\n';
    let sanitizeMarkdown = '# Question Bank Sanitization Report\n\n';

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'certification-manifest.json' && !f.includes('aws_services_catalog') && !f.includes('question_references'));

    let totalGlobalRemoved = 0;
    let totalGlobalProcessed = 0;
    let totalDuplicates = 0;

    for (const file of files) {
        // Extract certId from filename (e.g., "clf-c02.json" -> "clf-c02", "clf-c02-en.json" -> "clf-c02")
        const baseName = file.replace('.json', '');
        const certId = baseName.replace('-en', '');
        
        const certConfig = manifest[certId];
        if (!certConfig) {
            console.warn(`[WARN] Skipping ${file} because ${certId} is not in manifest.`);
            continue;
        }

        const rawData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
        let initialCount = rawData.length;
        
        auditMarkdown += `## ${file}\n`;
        auditMarkdown += `- Initial Questions: ${initialCount}\n`;

        sanitizeMarkdown += `## ${file}\n`;
        
        let removedCount = 0;
        let sanitizedData = [];
        let seenHashes = new Set();
        let reasons = { domains: 0, references: 0, duplicates: 0, structure: 0 };

        for (const q of rawData) {
            // 1. Structure Audit
            if (!q.question || !q.options || q.options.length < 2 || q.correct === undefined || !q.explanation) {
                removedCount++;
                reasons.structure++;
                continue;
            }

            // 2. Domain Audit
            if (!certConfig.allowedDomains.includes(q.domain)) {
                removedCount++;
                reasons.domains++;
                continue;
            }

            // 3. Contamination Audit (Mentions of other certs)
            const textToSearch = (q.question + " " + q.explanation).toUpperCase();
            let hasContamination = false;
            for (const otherCert of ALL_CERTS) {
                const certPrefix = certId.split('-')[0].toUpperCase(); // e.g. "CLF"
                if (otherCert !== certPrefix && textToSearch.includes(otherCert + '-')) {
                    hasContamination = true;
                    break;
                }
            }
            if (hasContamination) {
                removedCount++;
                reasons.references++;
                continue;
            }

            // 4. Duplicates Audit
            const idHash = generateId(q.question, certId);
            if (seenHashes.has(idHash)) {
                removedCount++;
                reasons.duplicates++;
                totalDuplicates++;
                continue;
            }
            seenHashes.add(idHash);

            // 5. Enrichment
            const enrichedQ = {
                questionId: idHash,
                certId: certId,
                examCode: certConfig.examCode,
                version: "1.0",
                domain: q.domain,
                difficulty: q.difficulty || "medium",
                services: q.services || [],
                tags: q.tags || [],
                question: q.question,
                options: q.options,
                correct: q.correct,
                explanation: q.explanation,
                reference_url: q.reference_url || "",
                validation: {
                    status: "validated",
                    validatedAt: new Date().toISOString(),
                    validatorVersion: "1.0",
                    createdBy: "A3 Cloud Academy"
                }
            };
            
            sanitizedData.push(enrichedQ);
        }

        totalGlobalProcessed += sanitizedData.length;
        totalGlobalRemoved += removedCount;

        auditMarkdown += `- Invalid Domains found: ${reasons.domains}\n`;
        auditMarkdown += `- Cross-Certification References found: ${reasons.references}\n`;
        auditMarkdown += `- Structural Errors found: ${reasons.structure}\n`;
        auditMarkdown += `- Duplicates found: ${reasons.duplicates}\n\n`;

        sanitizeMarkdown += `- Processed: ${sanitizedData.length}\n`;
        sanitizeMarkdown += `- Removed: ${removedCount}\n`;
        sanitizeMarkdown += `- Enrichment Applied: questionId, certId, examCode, version, validation block.\n\n`;

        fs.writeFileSync(path.join(SANITIZED_DIR, file), JSON.stringify(sanitizedData, null, 2));
    }

    auditMarkdown += `## Global Statistics\n`;
    auditMarkdown += `- Total Questions Removed: ${totalGlobalRemoved}\n`;
    auditMarkdown += `- Total Duplicates Detected: ${totalDuplicates}\n`;

    sanitizeMarkdown += `## Global Statistics\n`;
    sanitizeMarkdown += `- Total Questions Retained & Validated: ${totalGlobalProcessed}\n`;
    
    fs.writeFileSync(AUDIT_REPORT, auditMarkdown);
    fs.writeFileSync(SANITIZE_REPORT, sanitizeMarkdown);

    console.log("✅ Sanitization complete. Check /docs/ for reports.");
}

run();
