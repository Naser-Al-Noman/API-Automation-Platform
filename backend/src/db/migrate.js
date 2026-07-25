require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function migrate() {
  const sqlPath = path.join(__dirname, 'migrate.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
