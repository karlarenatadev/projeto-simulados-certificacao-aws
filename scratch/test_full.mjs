import { PGlite } from '@electric-sql/pglite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../backend/database/data'); // Assuming data is stored here, or memory

async function getValidUser() {
  try {
    // We don't need to connect to DB directly if we can just fetch an anonymous login first!
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@a3data.com.br', full_name: 'Test', nickname: 'Test' })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed', await loginRes.text());
      return;
    }
    const loginData = await loginRes.json();
    console.log(JSON.stringify(loginData, null, 2));
    const userId = loginData.data?.user?.id || loginData.user?.id || loginData.data?.id;
    
    const quizRes = await fetch('http://localhost:3001/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        certification: 'clf-c02',
        num_questions: 1
      })
    });
    
    if (!quizRes.ok) {
      console.error('Quiz start failed', await quizRes.text());
      return;
    }
    
    const quizData = await quizRes.json();
    const q = quizData.data.questions[0];
    
    console.log('--- PAYLOAD REAL DA API ---');
    console.log(JSON.stringify({ options: q.options, correct_answer: q.correct_answer }, null, 2));
    
    console.log('--- TIPO RECEBIDO ---');
    console.log('typeof q.options:', typeof q.options);
    console.log('Array.isArray:', Array.isArray(q.options));
    
  } catch(e) {
    console.error(e);
  }
}

getValidUser();
