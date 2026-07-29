const fs = require('fs');
const path = require('path');

const file = 'src/frontend/styles/cases.css';
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/#0f172a/g, 'var(--bg-main)');
content = content.replace(/#f1f5f9/g, 'var(--a3-surface-alt)');
content = content.replace(/#60a5fa/g, 'var(--a3-sky-frost)');
content = content.replace(/#334155/g, 'var(--border-theme)');
content = content.replace(/#1e293b/g, 'var(--a3-surface-soft)');
content = content.replace(/var\(--([a-zA-Z0-9-]+),\s*#[a-fA-F0-9]+\)/g, 'var(--$1)');

// Handle #fff
content = content.replace(/color:\s*#fff/g, 'color: var(--a3-text-inverse)');
content = content.replace(/border:\s*2px solid #fff/g, 'border: 2px solid var(--a3-surface)');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed hardcodes in cases.css');
