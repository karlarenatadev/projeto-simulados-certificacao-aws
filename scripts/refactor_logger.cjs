const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/frontend/js/cases/architectureRenderer.js',
  'src/frontend/js/cases/caseManager.js',
  'src/frontend/js/flashcards.js',
  'src/frontend/js/gamificacao/interactiveEngine.js',
  'src/frontend/js/gamificacao/leaderboard.js',
  'src/frontend/js/gamificacao/trailManager.js',
  'src/frontend/js/quizEngine.js',
  'src/frontend/js/quizManager.js',
  'src/frontend/js/simulator/engine.js',
  'src/frontend/js/storageManager.js',
  'src/frontend/js/userManager.js',
  'src/services/api.js'
];

filesToUpdate.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Determinar o path relativo para importar o logger
  // utils fica em src/frontend/js/utils/logger.js
  let loggerPath;
  if (file === 'src/services/api.js') {
    loggerPath = '../frontend/js/utils/logger.js';
  } else {
    // Quantas pastas voltar?
    const dirs = file.split('/').length - 4; // 'src/frontend/js/' is 3
    if (dirs === 0) {
      loggerPath = './utils/logger.js';
    } else if (dirs === 1) {
      loggerPath = '../utils/logger.js';
    } else if (dirs === 2) {
      loggerPath = '../../utils/logger.js';
    }
  }

  // Só adiciona import se tiver console. e o arquivo ainda não tiver logger
  if ((content.includes('console.log') || content.includes('console.warn') || content.includes('console.error')) && !content.includes('logger.js')) {
    const importStmt = `import { logger } from "${loggerPath}";\n`;
    
    // Inserir após os comentários iniciais ou na primeira linha
    const importMatch = content.match(/^(?:(?:(?:(?:\/\*[\s\S]*?\*\/)|(?:\/\/[^\n]*\n)|(?:\s*\n))*))(?:import |const |let |var |function |export )/);
    if (importMatch) {
      const idx = importMatch.index + importMatch[0].length - importMatch[0].trimStart().length;
      content = content.slice(0, idx) + importStmt + content.slice(idx);
    } else {
      content = importStmt + content;
    }
  }

  // Substituir console.log por logger.info, warn por logger.warn, error por logger.error
  content = content.replace(/console\.log/g, 'logger.info');
  content = content.replace(/console\.warn/g, 'logger.warn');
  content = content.replace(/console\.error/g, 'logger.error');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
});
