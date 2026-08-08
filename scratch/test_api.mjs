
async function testApi() {
  try {
    const response = await fetch('http://localhost:3001/api/quiz/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '123e4567-e89b-12d3-a456-426614174000', // random valid uuid
        certification: 'clf-c02',
        num_questions: 1
      })
    });
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data && data.data.questions && data.data.questions.length > 0) {
      const q = data.data.questions[0];
      console.log('--- TYPE CHECK ---');
      console.log('Type of options:', typeof q.options);
      console.log('Is Array?', Array.isArray(q.options));
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

testApi();
