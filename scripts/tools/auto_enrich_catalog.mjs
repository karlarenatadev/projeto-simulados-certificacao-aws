import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');

const catalogPath = path.join(dataDir, 'aws_services_catalog.json');
let catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// 1. Re-index catalog using slug as ID instead of srv-XX
catalog.forEach(item => {
    item.id = item.slug;
});

const catalogMap = new Map();
catalog.forEach(item => {
    catalogMap.set(item.id, item);
});

// Common aliases mapping
const aliasMap = {
    's3': 'amazon-s3',
    'ec2': 'amazon-ec2',
    'lambda': 'aws-lambda',
    'iam': 'aws-iam',
    'rds': 'amazon-rds',
    'vpc': 'amazon-vpc',
    'dynamodb': 'amazon-dynamodb',
    'cloudfront': 'amazon-cloudfront',
    'sqs': 'amazon-sqs',
    'sns': 'amazon-sns',
    'ecs': 'amazon-ecs',
    'eks': 'amazon-eks',
    'fargate': 'aws-fargate',
    'route-53': 'amazon-route-53',
    'api-gateway': 'amazon-api-gateway',
    'cloudwatch': 'amazon-cloudwatch',
    'cloudtrail': 'aws-cloudtrail',
    'kms': 'aws-kms',
    'cognito': 'amazon-cognito',
    'macie': 'amazon-macie',
    'guardduty': 'amazon-guardduty',
    'inspector': 'amazon-inspector',
    'organizations': 'aws-organizations',
    'athena': 'amazon-athena',
    'redshift': 'amazon-redshift',
    'emr': 'amazon-emr',
    'kinesis': 'amazon-kinesis',
    'glue': 'aws-glue',
    'sagemaker': 'amazon-sagemaker',
    'bedrock': 'amazon-bedrock',
    'aws': 'amazon-web-services',
    'aws-cloud': 'amazon-web-services',
    'amazon-web-services-aws': 'amazon-web-services'
};

function toTitleCase(str) {
    return str.replace(/-/g, ' ').replace(/\b\w/g, txt => txt.toUpperCase()).replace(/Aws/g, 'AWS').replace(/Amazon/g, 'Amazon');
}

const files = [
  'clf-c02.json', 'clf-c02-en.json',
  'saa-c03.json', 'saa-c03-en.json',
  'dva-c02.json', 'dva-c02-en.json',
  'aif-c01.json', 'aif-c01-en.json'
];

let addedCount = 0;
let modifiedQuestionsCount = 0;

files.forEach(f => {
  const filePath = path.join(dataDir, f);
  const qList = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fileModified = false;

  qList.forEach(obj => {
    if (obj.services && Array.isArray(obj.services)) {
      obj.services.forEach(s => {
        let sid = s.service_id;
        
        // 1. Resolve alias
        if (aliasMap[sid]) {
            sid = aliasMap[sid];
        }
        
        // 2. Fallback to add if not in catalog
        if (!catalogMap.has(sid)) {
            const isConcept = !sid.includes('aws') && !sid.includes('amazon') && !sid.includes('cloud');
            const newItem = {
                id: sid,
                slug: sid,
                name: toTitleCase(sid),
                category: isConcept ? "Cloud Concept" : "Other Services",
                description: "Auto-generated from question data.",
                doc_url: `https://aws.amazon.com/`,
                certs: []
            };
            catalogMap.set(sid, newItem);
            catalog.push(newItem);
            addedCount++;
        }

        // 3. Update the question's service node to ensure it exactly matches the catalog
        if (s.service_id !== sid || s.service_slug !== sid || s.service_name !== catalogMap.get(sid).name) {
            s.service_id = sid;
            s.service_slug = sid;
            s.service_name = catalogMap.get(sid).name;
            fileModified = true;
            modifiedQuestionsCount++;
        }
      });
    }
  });

  if (fileModified) {
      fs.writeFileSync(filePath, JSON.stringify(qList, null, 2), 'utf8');
  }
});

// Sort catalog
catalog.sort((a,b) => a.id.localeCompare(b.id));

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

console.log(`Enrichment complete!`);
console.log(`- New services added to catalog: ${addedCount}`);
console.log(`- Total catalog size: ${catalog.length}`);
console.log(`- Service references normalized in questions: ${modifiedQuestionsCount}`);
