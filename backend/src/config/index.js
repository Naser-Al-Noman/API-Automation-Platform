require('dotenv').config();

function parseFrontendOrigins(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  /** Allowed browser origins for CORS (from FRONTEND_URL, comma-separated). */
  frontendOrigins: parseFrontendOrigins(process.env.FRONTEND_URL),
};
