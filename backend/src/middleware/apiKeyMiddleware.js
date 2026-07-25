const { query } = require('../db/pool');
const { hashApiKey } = require('../controllers/apiKeyController');

async function verifyApiKey(req, res, next) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return res.status(401).json({ message: 'X-API-Key header required' });
  }

  try {
    const keyHash = hashApiKey(rawKey.trim());
    const result = await query(
      `SELECT k.id AS key_id, k.user_id, u.email
       FROM api_keys k
       JOIN users u ON u.id = k.user_id
       WHERE k.key_hash = $1`,
      [keyHash]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    // Fire-and-forget last_used update — don't block the request
    query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [row.key_id]).catch(
      (err) => console.error('Failed to update api key last_used_at:', err.message)
    );

    req.user = {
      id: row.user_id,
      email: row.email,
    };
    req.apiKeyId = row.key_id;
    return next();
  } catch (err) {
    console.error('verifyApiKey error:', err);
    return res.status(500).json({ message: 'Failed to verify API key' });
  }
}

module.exports = {
  verifyApiKey,
};
