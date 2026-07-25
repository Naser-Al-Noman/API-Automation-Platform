const { Pool } = require('pg');
const config = require('../config');

if (!config.databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set. Database features will fail.');
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
