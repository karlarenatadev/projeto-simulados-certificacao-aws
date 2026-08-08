import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

const elements = [
  'question-category',
  'question-validation-badge',
  'question-text',
  'current-q-num',
  'total-q-num',
  'progress-bar',
  'options-container',
  'btn-submit',
  'explanation-box',
  'btn-next',
  'btn-finish',
  'btn-flag',
  'timer-container',
  'mission-hud',
  'score-container'
];

function checkFile(file) {
  const html = fs.readFileSync(join(publicDir, file), 'utf8');
  console.log(`\n--- ${file} ---`);
  elements.forEach(el => {
    const exists = html.includes(`id="${el}"`);
    console.log(`${el}: ${exists}`);
  });
}

checkFile('index.html');
checkFile('simulados.html');
