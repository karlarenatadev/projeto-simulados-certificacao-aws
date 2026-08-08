import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('backend/database/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

db.get('SELECT * FROM questions LIMIT 1', (err, row) => {
  if (err) {
    console.error('Error querying:', err);
  } else {
    console.log('Row:', row);
    console.log('Type of options:', typeof row?.options);
  }
  db.close();
});
