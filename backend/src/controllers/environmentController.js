const { query } = require('../db/pool');
const { optionalJsonFile, parseUploadedJson } = require('../middleware/upload');
const { normalizeEnvironmentPayload } = require('../utils/postman');

function resolveEnvironmentInput(req, { requirePayload = true } = {}) {
  const uploaded = parseUploadedJson(req);
  const body = req.body || {};

  let payload = uploaded;

  if (!payload && body.variables_json !== undefined) {
    payload =
      typeof body.variables_json === 'string'
        ? JSON.parse(body.variables_json)
        : body.variables_json;
  } else if (!payload && Array.isArray(body.values)) {
    // Raw Postman environment export posted as the JSON body
    payload = body;
  }

  const nameHint = typeof body.name === 'string' ? body.name.trim() : '';

  if (!payload) {
    if (requirePayload) {
      throw Object.assign(new Error('Environment JSON is required'), { status: 400 });
    }
    return { name: nameHint, variables_json: null };
  }

  return normalizeEnvironmentPayload(payload, nameHint || undefined);
}

async function createEnvironment(req, res) {
  try {
    const { name, variables_json: variablesJson } = resolveEnvironmentInput(req);

    if (!name) {
      return res.status(400).json({ message: 'Environment name is required' });
    }

    const result = await query(
      `INSERT INTO environments (user_id, name, variables_json)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, user_id, name, variables_json`,
      [req.user.id, name, JSON.stringify(variablesJson)]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid JSON payload' });
    }
    console.error('createEnvironment error:', err);
    return res.status(500).json({ message: 'Failed to create environment' });
  }
}

async function listEnvironments(req, res) {
  try {
    const result = await query(
      `SELECT id, name, variables_json
       FROM environments
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );

    const environments = result.rows.map((row) => {
      const values = Array.isArray(row.variables_json?.values)
        ? row.variables_json.values
        : [];
      return {
        id: row.id,
        name: row.name,
        variable_count: values.length,
      };
    });

    return res.json(environments);
  } catch (err) {
    console.error('listEnvironments error:', err);
    return res.status(500).json({ message: 'Failed to list environments' });
  }
}

async function getEnvironment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid environment id' });
    }

    const result = await query(
      `SELECT id, user_id, name, variables_json
       FROM environments
       WHERE id = $1`,
      [id]
    );

    const environment = result.rows[0];
    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }
    if (environment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this environment' });
    }

    return res.json({
      id: environment.id,
      name: environment.name,
      variables_json: environment.variables_json,
    });
  } catch (err) {
    console.error('getEnvironment error:', err);
    return res.status(500).json({ message: 'Failed to fetch environment' });
  }
}

async function updateEnvironment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid environment id' });
    }

    const existing = await query(
      `SELECT id, user_id, name, variables_json
       FROM environments
       WHERE id = $1`,
      [id]
    );

    const environment = existing.rows[0];
    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }
    if (environment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this environment' });
    }

    const body = req.body || {};
    const uploaded = parseUploadedJson(req);

    let nextName = environment.name;
    if (typeof body.name === 'string' && body.name.trim()) {
      nextName = body.name.trim();
    }

    let nextVariables = environment.variables_json;
    if (uploaded || body.variables_json !== undefined || Array.isArray(body.values)) {
      const resolved = resolveEnvironmentInput(req, { requirePayload: true });
      nextVariables = resolved.variables_json;
      if (!body.name && resolved.name) {
        nextName = resolved.name;
      }
    }

    const result = await query(
      `UPDATE environments
       SET name = $1, variables_json = $2::jsonb
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, variables_json`,
      [nextName, JSON.stringify(nextVariables), id, req.user.id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid JSON payload' });
    }
    console.error('updateEnvironment error:', err);
    return res.status(500).json({ message: 'Failed to update environment' });
  }
}

async function deleteEnvironment(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid environment id' });
    }

    const existing = await query(
      `SELECT id, user_id FROM environments WHERE id = $1`,
      [id]
    );

    const environment = existing.rows[0];
    if (!environment) {
      return res.status(404).json({ message: 'Environment not found' });
    }
    if (environment.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have access to this environment' });
    }

    await query(`DELETE FROM environments WHERE id = $1 AND user_id = $2`, [
      id,
      req.user.id,
    ]);

    return res.status(204).send();
  } catch (err) {
    console.error('deleteEnvironment error:', err);
    return res.status(500).json({ message: 'Failed to delete environment' });
  }
}

module.exports = {
  createEnvironment,
  listEnvironments,
  getEnvironment,
  updateEnvironment,
  deleteEnvironment,
  optionalJsonFile,
};
