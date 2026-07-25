const crypto = require('crypto');
const { query } = require('../db/pool');

function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawApiKey() {
  return `aap_${crypto.randomBytes(32).toString('hex')}`;
}

async function createApiKey(req, res) {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: 'Name must be 100 characters or fewer' });
    }

    const rawKey = generateRawApiKey();
    const keyHash = hashApiKey(rawKey);

    const result = await query(
      `INSERT INTO api_keys (user_id, key_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, name, created_at, last_used_at`,
      [req.user.id, keyHash, name]
    );

    const row = result.rows[0];
    return res.status(201).json({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      // Shown once — never stored or returned again
      key: rawKey,
    });
  } catch (err) {
    console.error('createApiKey error:', err);
    return res.status(500).json({ message: 'Failed to create API key' });
  }
}

async function listApiKeys(req, res) {
  try {
    const result = await query(
      `SELECT id, name, created_at, last_used_at
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('listApiKeys error:', err);
    return res.status(500).json({ message: 'Failed to list API keys' });
  }
}

async function deleteApiKey(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid API key id' });
    }

    const existing = await query(
      `SELECT id, user_id FROM api_keys WHERE id = $1`,
      [id]
    );
    const row = existing.rows[0];
    if (!row) {
      return res.status(404).json({ message: 'API key not found' });
    }
    if (row.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this API key' });
    }

    await query(`DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, [
      id,
      req.user.id,
    ]);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteApiKey error:', err);
    return res.status(500).json({ message: 'Failed to delete API key' });
  }
}

module.exports = {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  hashApiKey,
};
