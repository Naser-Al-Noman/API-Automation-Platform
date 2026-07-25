const { query } = require('../db/pool');
const { optionalJsonFile, parseUploadedJson } = require('../middleware/upload');
const {
  countCollectionRequests,
  isPostmanCollection,
} = require('../utils/postman');

function resolveCollectionInput(req) {
  const uploaded = parseUploadedJson(req);
  const body = req.body || {};

  let postmanJson = uploaded;
  if (!postmanJson && body.postman_json !== undefined) {
    postmanJson =
      typeof body.postman_json === 'string'
        ? JSON.parse(body.postman_json)
        : body.postman_json;
  }

  const nameFromBody = typeof body.name === 'string' ? body.name.trim() : '';
  const nameFromInfo =
    postmanJson && postmanJson.info && typeof postmanJson.info.name === 'string'
      ? postmanJson.info.name.trim()
      : '';

  return {
    name: nameFromBody || nameFromInfo,
    postman_json: postmanJson,
  };
}

async function createCollection(req, res) {
  try {
    const { name, postman_json: postmanJson } = resolveCollectionInput(req);

    if (!name) {
      return res.status(400).json({ message: 'Collection name is required' });
    }

    if (!isPostmanCollection(postmanJson)) {
      return res.status(400).json({
        message:
          'postman_json must be a Postman Collection v2.1 object with "info" and "item" keys',
      });
    }

    const result = await query(
      `INSERT INTO collections (user_id, name, postman_json)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, user_id, name, postman_json, created_at`,
      [req.user.id, name, JSON.stringify(postmanJson)]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid JSON payload' });
    }
    console.error('createCollection error:', err);
    return res.status(500).json({ message: 'Failed to create collection' });
  }
}

async function listCollections(req, res) {
  try {
    const result = await query(
      `SELECT id, name, created_at, postman_json
       FROM collections
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const collections = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      request_count: countCollectionRequests(row.postman_json?.item),
    }));

    return res.json(collections);
  } catch (err) {
    console.error('listCollections error:', err);
    return res.status(500).json({ message: 'Failed to list collections' });
  }
}

async function getCollection(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid collection id' });
    }

    const result = await query(
      `SELECT id, user_id, name, postman_json, created_at
       FROM collections
       WHERE id = $1`,
      [id]
    );

    const collection = result.rows[0];
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (collection.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this collection' });
    }

    return res.json({
      id: collection.id,
      name: collection.name,
      postman_json: collection.postman_json,
      created_at: collection.created_at,
      request_count: countCollectionRequests(collection.postman_json?.item),
    });
  } catch (err) {
    console.error('getCollection error:', err);
    return res.status(500).json({ message: 'Failed to fetch collection' });
  }
}

async function updateCollection(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid collection id' });
    }

    const existing = await query(
      `SELECT id, user_id, name, postman_json
       FROM collections
       WHERE id = $1`,
      [id]
    );

    const collection = existing.rows[0];
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    if (collection.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this collection' });
    }

    const uploaded = parseUploadedJson(req);
    const body = req.body || {};

    let nextName = collection.name;
    if (typeof body.name === 'string' && body.name.trim()) {
      nextName = body.name.trim();
    }

    let nextJson = collection.postman_json;
    if (uploaded) {
      nextJson = uploaded;
    } else if (body.postman_json !== undefined) {
      nextJson =
        typeof body.postman_json === 'string'
          ? JSON.parse(body.postman_json)
          : body.postman_json;
    }

    if (!isPostmanCollection(nextJson)) {
      return res.status(400).json({
        message:
          'postman_json must be a Postman Collection v2.1 object with "info" and "item" keys',
      });
    }

    const result = await query(
      `UPDATE collections
       SET name = $1, postman_json = $2::jsonb
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, postman_json, created_at`,
      [nextName, JSON.stringify(nextJson), id, req.user.id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid JSON payload' });
    }
    console.error('updateCollection error:', err);
    return res.status(500).json({ message: 'Failed to update collection' });
  }
}

async function deleteCollection(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid collection id' });
    }

    const existing = await query(
      `SELECT id, user_id FROM collections WHERE id = $1`,
      [id]
    );

    const collection = existing.rows[0];
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    if (collection.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this collection' });
    }

    const executions = await query(
      `SELECT COUNT(*)::int AS count FROM executions WHERE collection_id = $1`,
      [id]
    );

    if (executions.rows[0].count > 0) {
      return res.status(409).json({
        message:
          'Cannot delete collection while executions exist. Remove related executions first.',
      });
    }

    await query(`DELETE FROM collections WHERE id = $1 AND user_id = $2`, [
      id,
      req.user.id,
    ]);

    return res.status(204).send();
  } catch (err) {
    console.error('deleteCollection error:', err);
    return res.status(500).json({ message: 'Failed to delete collection' });
  }
}

module.exports = {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  optionalJsonFile,
};
