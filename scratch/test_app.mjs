import fs from 'fs';

// Mock the DOM and necessary APIs to run startQuiz up to loadQuestionUI
const html = fs.readFileSync('public/simulados.html', 'utf-8');

console.log("simulados.html length:", html.length);

const quizEngineContent = fs.readFileSync('src/frontend/js/quizEngine.js', 'utf-8');
const appContent = fs.readFileSync('src/frontend/js/app.js', 'utf-8');

// We just want to know if there's any obvious syntax/runtime error in loadQuestionUI
// But it's heavily tied to the DOM.

console.log("Files read successfully.");
