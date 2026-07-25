const Ajv = require('ajv');
const { query } = require('../db/pool');

const ajv = new Ajv({ allErrors: true, strict: false });

function compileSchema(schemaJson) {
  if (!schemaJson || typeof schemaJson !== 'object' || Array.isArray(schemaJson)) {
    const error = new Error('schema_json must be a JSON object');
    error.status = 400;
    throw error;
  }

  try {
    ajv.compile(schemaJson);
  } catch (err) {
    const error = new Error(
      `schema_json is not a valid JSON Schema: ${err.message || 'compile failed'}`
    );
    error.status = 400;
    throw error;
  }
}

async function assertOwnedCollection(collectionId, userId) {
  const result = await query(
    `SELECT id, user_id FROM collections WHERE id = $1`,
    [collectionId]
  );
  const collection = result.rows[0];
  if (!collection) {
    return { error: { status: 404, message: 'Collection not found' } };
  }
  if (collection.user_id !== userId) {
    return { error: { status: 403, message: 'You do not have access to this collection' } };
  }
  return { collection };
}

async function findOwnedSchema(schemaId, userId) {
  const result = await query(
    `SELECT s.*, c.user_id
     FROM schemas s
     JOIN collections c ON c.id = s.collection_id
     WHERE s.id = $1`,
    [schemaId]
  );
  const schema = result.rows[0];
  if (!schema) {
    return { error: { status: 404, message: 'Schema not found' } };
  }
  if (schema.user_id !== userId) {
    return { error: { status: 403, message: 'You do not have access to this schema' } };
  }
  return { schema };
}

async function createSchema(req, res) {
  try {
    const collectionId = Number(req.body?.collectionId);
    const endpoint =
      typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : '';
    let schemaJson = req.body?.schema_json;

    if (typeof schemaJson === 'string') {
      schemaJson = JSON.parse(schemaJson);
    }

    if (!Number.isInteger(collectionId) || collectionId < 1) {
      return res.status(400).json({ message: 'collectionId is required' });
    }
    if (!endpoint) {
      return res.status(400).json({
        message: 'endpoint is required (Postman request name or Folder/Request path)',
      });
    }

    const { error: collectionError } = await assertOwnedCollection(
      collectionId,
      req.user.id
    );
    if (collectionError) {
      return res.status(collectionError.status).json({ message: collectionError.message });
    }

    compileSchema(schemaJson);

    const existing = await query(
      `SELECT id FROM schemas WHERE collection_id = $1 AND endpoint = $2`,
      [collectionId, endpoint]
    );
    if (existing.rows[0]) {
      return res.status(409).json({
        message: 'A schema already exists for this endpoint. Update or delete it instead.',
      });
    }

    const result = await query(
      `INSERT INTO schemas (collection_id, endpoint, schema_json)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, collection_id, endpoint, schema_json`,
      [collectionId, endpoint, JSON.stringify(schemaJson)]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid schema payload' });
    }
    console.error('createSchema error:', err);
    return res.status(500).json({ message: 'Failed to create schema' });
  }
}

async function listSchemas(req, res) {
  try {
    const collectionId = Number(req.query.collectionId);
    if (!Number.isInteger(collectionId) || collectionId < 1) {
      return res.status(400).json({ message: 'collectionId query parameter is required' });
    }

    const { error: collectionError } = await assertOwnedCollection(
      collectionId,
      req.user.id
    );
    if (collectionError) {
      return res.status(collectionError.status).json({ message: collectionError.message });
    }

    const result = await query(
      `SELECT id, collection_id, endpoint, schema_json
       FROM schemas
       WHERE collection_id = $1
       ORDER BY endpoint ASC`,
      [collectionId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('listSchemas error:', err);
    return res.status(500).json({ message: 'Failed to list schemas' });
  }
}

async function getSchema(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid schema id' });
    }

    const { schema, error } = await findOwnedSchema(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.json({
      id: schema.id,
      collection_id: schema.collection_id,
      endpoint: schema.endpoint,
      schema_json: schema.schema_json,
    });
  } catch (err) {
    console.error('getSchema error:', err);
    return res.status(500).json({ message: 'Failed to fetch schema' });
  }
}

async function updateSchema(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid schema id' });
    }

    const { schema, error } = await findOwnedSchema(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    let schemaJson = req.body?.schema_json;
    if (schemaJson === undefined) {
      return res.status(400).json({ message: 'schema_json is required' });
    }
    if (typeof schemaJson === 'string') {
      schemaJson = JSON.parse(schemaJson);
    }

    compileSchema(schemaJson);

    const nextEndpoint =
      typeof req.body?.endpoint === 'string' && req.body.endpoint.trim()
        ? req.body.endpoint.trim()
        : schema.endpoint;

    if (nextEndpoint !== schema.endpoint) {
      const clash = await query(
        `SELECT id FROM schemas
         WHERE collection_id = $1 AND endpoint = $2 AND id <> $3`,
        [schema.collection_id, nextEndpoint, id]
      );
      if (clash.rows[0]) {
        return res.status(409).json({
          message: 'Another schema already uses that endpoint name',
        });
      }
    }

    const result = await query(
      `UPDATE schemas
       SET endpoint = $1, schema_json = $2::jsonb
       WHERE id = $3
       RETURNING id, collection_id, endpoint, schema_json`,
      [nextEndpoint, JSON.stringify(schemaJson), id]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ message: err.message || 'Invalid schema payload' });
    }
    console.error('updateSchema error:', err);
    return res.status(500).json({ message: 'Failed to update schema' });
  }
}

async function deleteSchema(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid schema id' });
    }

    const { schema, error } = await findOwnedSchema(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    await query(`DELETE FROM schemas WHERE id = $1`, [schema.id]);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteSchema error:', err);
    return res.status(500).json({ message: 'Failed to delete schema' });
  }
}

module.exports = {
  createSchema,
  listSchemas,
  getSchema,
  updateSchema,
  deleteSchema,
  compileSchema,
};
