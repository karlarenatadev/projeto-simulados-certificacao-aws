import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('./data/questions');
const MANIFEST_PATH = path.resolve('./data/taxonomy/certification-manifest.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'certification-manifest.json' && !f.includes('aws_services_catalog') && !f.includes('question_references'));

let hasError = false;

function error(msg) {
    console.error(`❌ ERROR: ${msg}`);
    hasError = true;
}

const ALL_CERTS = ['CLF', 'SAA', 'SAP', 'DVA', 'DOP', 'AIF', 'MLS', 'ANS', 'SCS', 'PAS', 'DEA'];

for (const file of files) {
    const baseName = file.replace('.json', '');
    const certId = baseName.replace('-en', '');
    const certConfig = manifest[certId];

    if (!certConfig) {
        console.warn(`⚠️ Warning: No manifest config for ${file}, skipping validation.`);
        continue;
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    } catch(e) {
        error(`Could not parse JSON in ${file}`);
        continue;
    }

    const seenIds = new Set();
    const seenText = new Set();

    data.forEach((q, index) => {
        // 1. Check strict fields
        if (!q.questionId) error(`${file}[${index}]: Missing questionId`);
        if (q.certId !== certId) error(`${file}[${index}]: Invalid certId ${q.certId} (expected ${certId})`);
        if (!q.examCode) error(`${file}[${index}]: Missing examCode`);
        if (!q.version) error(`${file}[${index}]: Missing version`);
        if (!q.validation || q.validation.status !== 'validated') error(`${file}[${index}]: Missing validation block`);
        if (!q.question || q.question.trim() === "") error(`${file}[${index}]: Empty question`);
        if (!q.explanation || q.explanation.trim() === "") error(`${file}[${index}]: Empty explanation`);
        
        // 2. Check structure
        if (!Array.isArray(q.options) || q.options.length < 2) error(`${file}[${index}]: Invalid options array`);
        if (q.correct === undefined || q.correct === null) error(`${file}[${index}]: Missing correct answer`);
        
        // 3. Domain limits
        if (!certConfig.allowedDomains.includes(q.domain)) {
            error(`${file}[${index}]: Domain '${q.domain}' not allowed for ${certId}`);
        }
        
        // 4. Difficulty limits
        if (q.difficulty && !certConfig.allowedDifficulties.includes(q.difficulty)) {
            error(`${file}[${index}]: Difficulty '${q.difficulty}' not allowed`);
        }

        // 5. Check uniqueness
        if (q.questionId && seenIds.has(q.questionId)) {
            error(`${file}[${index}]: Duplicate questionId ${q.questionId}`);
        }
        seenIds.add(q.questionId);

        const textHash = q.question.trim().toLowerCase();
        if (seenText.has(textHash)) {
            error(`${file}[${index}]: Duplicate question text found`);
        }
        seenText.add(textHash);

        // 6. Contamination check
        const textToSearch = (q.question + " " + q.explanation).toUpperCase();
        for (const otherCert of ALL_CERTS) {
            const certPrefix = certId.split('-')[0].toUpperCase();
            if (otherCert !== certPrefix && textToSearch.includes(otherCert + '-')) {
                error(`${file}[${index}]: Contamination found. Mention of ${otherCert} in ${certId} question.`);
            }
        }
    });
}

if (hasError) {
    console.error("\n💥 Validation Failed! The question bank is corrupted.");
    process.exit(1);
} else {
    console.log("✅ Question bank validated successfully. No errors found.");
    process.exit(0);
}
