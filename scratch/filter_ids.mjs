import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../src/frontend/js');

const missingIds = [
  "detailed-report", "btn-start-personalized-diagnostic-quiz", "question-validation-badge", 
  "history-list", "streak-counter", "sidebar-btn-mistakes", "sidebar-mistakes-count", 
  "sidebar-cert-label", "sidebar-cert-badge", "sidebar-cert-status", "sidebar-pct-bar", 
  "sidebar-pct-text", "sidebar-streak-value", "study-recommendation-banner", "globalRadarChart", 
  "global-chart-empty", "global-chart-container", "global-stats-summary", "total-quizzes", 
  "avg-score", "total-questions", "btn-flashcards-home", "sortable-list", "btn-validate-interactive", 
  "interactive-feedback", "guild-leaderboard", "guild-total-questions", "guild-weekly-avg", 
  "sprint-reader-overlay", "gamificacao-trail", "trail-container", "history-card-title", 
  "btn-clear-history", "jornada-cert-title", "user-menu-btn", "user-dropdown", "user-menu-logout", 
  "user-menu-profile", "user-menu-settings", "sidebar-collapse-btn", "a3-toast-container", 
  "a3-modal-container", "modal-btn-cancel", "modal-btn-confirm"
];

const generatedIds = new Set();
const trulyMissingIds = new Set(missingIds);

function scanJSForCreation(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanJSForCreation(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const id of trulyMissingIds) {
        if (content.includes(`id="${id}"`) || content.includes(`id='${id}'`) || content.includes(`id = "${id}"`) || content.includes(`id = '${id}'`)) {
          generatedIds.add(id);
          trulyMissingIds.delete(id);
        }
      }
    }
  }
}

scanJSForCreation(srcDir);

console.log('--- DINAMICAMENTE GERADOS PELO JS (Seguros) ---');
console.log(Array.from(generatedIds).join(', '));

console.log('\n--- VERDADEIRAMENTE ÓRFÃOS (Perdidos na refatoração) ---');
console.log(Array.from(trulyMissingIds).join(', '));

