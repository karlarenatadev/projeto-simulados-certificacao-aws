const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  });
  return files;
}

const jsFiles = getFiles('./src/frontend/js');
const exportsMap = {};

// Step 1: Collect exports
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const fileExports = [];
  
  // match 'export function foo' or 'export const foo' or 'export class foo'
  let m;
  const namedExportRegex = /export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g;
  while ((m = namedExportRegex.exec(content)) !== null) {
    fileExports.push(m[1]);
  }
  
  // match 'export { foo, bar }'
  const bracketExportRegex = /export\s+\{([^}]+)\}/g;
  while ((m = bracketExportRegex.exec(content)) !== null) {
    m[1].split(',').forEach(item => {
      const parts = item.trim().split(/\s+as\s+/);
      const name = parts[parts.length - 1].trim();
      if (name) fileExports.push(name);
    });
  }

  // match 'export default'
  if (/export\s+default\s+/.test(content)) {
    fileExports.push('default');
  }
  
  // Normalize path for lookup
  const normalizedPath = file.replace(/\\/g, '/').replace('src/frontend/js/', '');
  exportsMap[normalizedPath] = fileExports;
});

const importedVars = new Set();
const entryPoints = ['app.js', 'sw.js'];

// Step 2: Check imports
const brokenImports = [];
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  // match 'import { foo } from "./path.js"'
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const importVars = m[1].split(',').map(v => {
      const parts = v.trim().split(/\s+as\s+/);
      return parts[0].trim();
    }).filter(v => v);
    const importPathStr = m[2];
    
    // Resolve path
    if (importPathStr.startsWith('.')) {
       const dir = path.dirname(file);
       const targetPath = path.resolve(dir, importPathStr);
       const relativeToJs = path.relative(path.resolve('./src/frontend/js'), targetPath).replace(/\\/g, '/');
       
       const targetExports = exportsMap[relativeToJs] || [];
       importVars.forEach(v => {
         importedVars.add(`${relativeToJs}::${v}`);
         if (!targetExports.includes(v)) {
            brokenImports.push({ file, target: relativeToJs, importedVar: v });
         }
       });
    }
  }
});

// Find unused exports
const unusedExports = [];
Object.entries(exportsMap).forEach(([file, exportsList]) => {
    if (entryPoints.includes(file)) return; // Ignore entry points
    exportsList.forEach(exp => {
        if (!importedVars.has(`${file}::${exp}`)) {
            unusedExports.push({ file, unusedExport: exp });
        }
    });
});

console.log('Broken imports found:', brokenImports);
console.log('Unused exports found:', unusedExports);

