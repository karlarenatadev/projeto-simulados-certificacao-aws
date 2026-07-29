const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/frontend/js/app.js'
];

filesToUpdate.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  let loggerPath;
  if (file === 'src/services/api.js') {
    loggerPath = '../frontend/js/utils/logger.js';
  } else {
    const dirs = file.split('/').length - 4; // 'src/frontend/js/' is 3
    if (dirs === 0) {
      loggerPath = './utils/logger.js';
    } else if (dirs === 1) {
      loggerPath = '../utils/logger.js';
    } else if (dirs === 2) {
      loggerPath = '../../utils/logger.js';
    }
  }

  if ((content.includes('console.log') || content.includes('console.warn') || content.includes('console.error')) && !content.includes('logger.js')) {
    const importStmt = `import { logger } from "${loggerPath}";\n`;
    
    const importMatch = content.match(/^(?:(?:(?:(?:\/\*[\s\S]*?\*\/)|(?:\/\/[^\n]*\n)|(?:\s*\n))*))(?:import |const |let |var |function |export )/);
    if (importMatch) {
      const idx = importMatch.index + importMatch[0].length - importMatch[0].trimStart().length;
      content = content.slice(0, idx) + importStmt + content.slice(idx);
    } else {
      content = importStmt + content;
    }
  }

  content = content.replace(/console\.log/g, 'logger.info');
  content = content.replace(/console\.warn/g, 'logger.warn');
  content = content.replace(/console\.error/g, 'logger.error');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
});
