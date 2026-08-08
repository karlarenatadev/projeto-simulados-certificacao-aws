import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../src/frontend/js');
const publicDir = path.join(__dirname, '../public');

// Regex patterns to find DOM interactions
const idRegex = /getElementById\(['"`](.*?)['"`]\)/g;
const querySelectorRegex = /querySelector\(['"`](.*?)['"`]\)/g;
const querySelectorAllRegex = /querySelectorAll\(['"`](.*?)['"`]\)/g;

const requestedIds = new Set();
const requestedSelectors = new Set();

function scanJSFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanJSFiles(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      let match;
      while ((match = idRegex.exec(content)) !== null) {
        requestedIds.add(match[1]);
      }
      while ((match = querySelectorRegex.exec(content)) !== null) {
        requestedSelectors.add(match[1]);
      }
      while ((match = querySelectorAllRegex.exec(content)) !== null) {
        requestedSelectors.add(match[1]);
      }
    }
  }
}

scanJSFiles(srcDir);

// Now get all IDs and Classes from HTML files
const htmlIds = new Set();
const htmlClasses = new Set();

const idAttrRegex = /id=['"](.*?)['"]/g;
const classAttrRegex = /class=['"](.*?)['"]/g;

function scanHTMLFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanHTMLFiles(fullPath);
    } else if (fullPath.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      let match;
      while ((match = idAttrRegex.exec(content)) !== null) {
        htmlIds.add(match[1]);
      }
      while ((match = classAttrRegex.exec(content)) !== null) {
        const classes = match[1].split(/\s+/);
        classes.forEach(c => htmlClasses.add(c));
      }
    }
  }
}

scanHTMLFiles(publicDir);

console.log('--- MISSING IDs ---');
const missingIds = [];
for (const id of requestedIds) {
  // If it contains dynamic template literals like ${}, skip it
  if (id.includes('${')) continue;
  if (!htmlIds.has(id)) {
    missingIds.push(id);
  }
}
console.log(missingIds.join(', '));

console.log('\n--- MISSING SELECTORS (Basic check) ---');
const missingSelectors = [];
for (const sel of requestedSelectors) {
  if (sel.includes('${')) continue;
  
  // Basic check for ID and Class selectors
  if (sel.startsWith('#')) {
    const id = sel.substring(1);
    if (!htmlIds.has(id)) {
      missingSelectors.push(sel);
    }
  } else if (sel.startsWith('.')) {
    // If it's a simple class selector
    if (!sel.includes(' ') && !sel.includes(':') && !sel.includes('>')) {
      const cls = sel.substring(1);
      if (!htmlClasses.has(cls)) {
        missingSelectors.push(sel);
      }
    }
  }
}
console.log(missingSelectors.join(', '));
