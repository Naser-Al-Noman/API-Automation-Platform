const { query } = require('../db/pool');

const ALLOWED_DAYS = new Set([7, 30, 90]);

function formatDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function assertOwnedCollection(collectionId, userId) {
  const result = await query(
    `SELECT id FROM collections WHERE id = $1 AND user_id = $2`,
    [collectionId, userId]
  );
  if (result.rows.length === 0) {
    return { error: { status: 404, message: 'Collection not found' } };
  }
  return { ok: true };
}

function parseDays(raw) {
  const days = raw == null || raw === '' ? 30 : Number(raw);
  if (!Number.isInteger(days) || !ALLOWED_DAYS.has(days)) {
    return { error: { status: 400, message: 'days must be 7, 30, or 90' } };
  }
  return { days };
}

function parseOptionalCollectionId(raw) {
  if (raw == null || raw === '') return { collectionId: null };
  const collectionId = Number(raw);
  if (!Number.isInteger(collectionId) || collectionId < 1) {
    return { error: { status: 400, message: 'Invalid collectionId' } };
  }
  return { collectionId };
}

function parseRequiredCollectionId(raw) {
  const collectionId = Number(raw);
  if (!Number.isInteger(collectionId) || collectionId < 1) {
    return { error: { status: 400, message: 'collectionId is required' } };
  }
  return { collectionId };
}

/**
 * Pass rate per calendar day (UTC) for finished executions.
 */
async function getPassRateTrend(req, res) {
  try {
    const daysParsed = parseDays(req.query.days);
    if (daysParsed.error) {
      return res.status(daysParsed.error.status).json({ message: daysParsed.error.message });
    }
    const collParsed = parseOptionalCollectionId(req.query.collectionId);
    if (collParsed.error) {
      return res.status(collParsed.error.status).json({ message: collParsed.error.message });
    }

    const { days } = daysParsed;
    const { collectionId } = collParsed;
    const userId = req.user.id;

    if (collectionId != null) {
      const owned = await assertOwnedCollection(collectionId, userId);
      if (owned.error) {
        return res.status(owned.error.status).json({ message: owned.error.message });
      }
    }

    const params = [userId, days];
    let collectionFilter = '';
    if (collectionId != null) {
      params.push(collectionId);
      collectionFilter = ` AND e.collection_id = $${params.length}`;
    }

    const result = await query(
      `SELECT
         (DATE_TRUNC('day', e.started_at AT TIME ZONE 'UTC'))::date AS date,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE e.status = 'passed')::int AS passed,
         COUNT(*) FILTER (WHERE e.status = 'failed')::int AS failed,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE e.status = 'passed')
           / NULLIF(COUNT(*), 0),
           1
         )::float AS pass_rate
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       WHERE c.user_id = $1
         AND e.status IN ('passed', 'failed')
         AND e.started_at >= (NOW() AT TIME ZONE 'UTC') - ($2::int * INTERVAL '1 day')
         ${collectionFilter}
       GROUP BY 1
       ORDER BY 1 ASC`,
      params
    );

    return res.json(
      result.rows.map((row) => ({
        date: formatDateKey(row.date),
        total: row.total,
        passed: row.passed,
        failed: row.failed,
        passRate: row.pass_rate,
      }))
    );
  } catch (err) {
    console.error('getPassRateTrend error:', err);
    return res.status(500).json({ message: 'Failed to load pass rate trend' });
  }
}

/**
 * Average response time (ms) per day from summary_json.averageResponseTime.
 */
async function getResponseTimes(req, res) {
  try {
    const daysParsed = parseDays(req.query.days);
    if (daysParsed.error) {
      return res.status(daysParsed.error.status).json({ message: daysParsed.error.message });
    }
    const collParsed = parseOptionalCollectionId(req.query.collectionId);
    if (collParsed.error) {
      return res.status(collParsed.error.status).json({ message: collParsed.error.message });
    }

    const { days } = daysParsed;
    const { collectionId } = collParsed;
    const userId = req.user.id;

    if (collectionId != null) {
      const owned = await assertOwnedCollection(collectionId, userId);
      if (owned.error) {
        return res.status(owned.error.status).json({ message: owned.error.message });
      }
    }

    const params = [userId, days];
    let collectionFilter = '';
    if (collectionId != null) {
      params.push(collectionId);
      collectionFilter = ` AND e.collection_id = $${params.length}`;
    }

    const result = await query(
      `SELECT
         (DATE_TRUNC('day', e.started_at AT TIME ZONE 'UTC'))::date AS date,
         ROUND(AVG((e.summary_json->>'averageResponseTime')::numeric))::float AS avg_ms
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       WHERE c.user_id = $1
         AND e.status IN ('passed', 'failed')
         AND e.started_at >= (NOW() AT TIME ZONE 'UTC') - ($2::int * INTERVAL '1 day')
         AND e.summary_json ? 'averageResponseTime'
         AND jsonb_typeof(e.summary_json->'averageResponseTime') = 'number'
         ${collectionFilter}
       GROUP BY 1
       ORDER BY 1 ASC`,
      params
    );

    return res.json(
      result.rows.map((row) => ({
        date: formatDateKey(row.date),
        avgResponseTimeMs: row.avg_ms,
      }))
    );
  } catch (err) {
    console.error('getResponseTimes error:', err);
    return res.status(500).json({ message: 'Failed to load response time trend' });
  }
}

/**
 * Per-endpoint pass rates for one collection (worst first).
 */
async function getEndpointReliability(req, res) {
  try {
    const collParsed = parseRequiredCollectionId(req.query.collectionId);
    if (collParsed.error) {
      return res.status(collParsed.error.status).json({ message: collParsed.error.message });
    }
    const { collectionId } = collParsed;
    const userId = req.user.id;

    const owned = await assertOwnedCollection(collectionId, userId);
    if (owned.error) {
      return res.status(owned.error.status).json({ message: owned.error.message });
    }

    const result = await query(
      `SELECT
         COALESCE(NULLIF(req->>'endpoint', ''), req->>'name', 'Unknown') AS endpoint,
         COUNT(*)::int AS total_runs,
         COUNT(*) FILTER (WHERE (req->>'passed')::boolean IS TRUE)::int AS passed,
         COUNT(*) FILTER (WHERE (req->>'passed')::boolean IS NOT TRUE)::int AS failed,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE (req->>'passed')::boolean IS TRUE)
           / NULLIF(COUNT(*), 0),
           1
         )::float AS pass_rate
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       CROSS JOIN LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(e.summary_json->'requests') = 'array'
           THEN e.summary_json->'requests'
           ELSE '[]'::jsonb
         END
       ) AS req
       WHERE c.user_id = $1
         AND e.collection_id = $2
         AND e.status IN ('passed', 'failed')
         AND e.summary_json IS NOT NULL
       GROUP BY 1
       ORDER BY pass_rate ASC NULLS LAST, total_runs DESC, endpoint ASC`,
      [userId, collectionId]
    );

    return res.json(
      result.rows.map((row) => ({
        endpoint: row.endpoint,
        totalRuns: row.total_runs,
        passed: row.passed,
        failed: row.failed,
        passRate: row.pass_rate,
      }))
    );
  } catch (err) {
    console.error('getEndpointReliability error:', err);
    return res.status(500).json({ message: 'Failed to load endpoint reliability' });
  }
}

/**
 * Schema validation valid/invalid counts per endpoint for one collection.
 */
async function getSchemaValidationSummary(req, res) {
  try {
    const collParsed = parseRequiredCollectionId(req.query.collectionId);
    if (collParsed.error) {
      return res.status(collParsed.error.status).json({ message: collParsed.error.message });
    }
    const { collectionId } = collParsed;
    const userId = req.user.id;

    const owned = await assertOwnedCollection(collectionId, userId);
    if (owned.error) {
      return res.status(owned.error.status).json({ message: owned.error.message });
    }

    const result = await query(
      `SELECT
         COALESCE(
           NULLIF(req->'schema'->>'endpoint', ''),
           NULLIF(req->>'endpoint', ''),
           req->>'name',
           'Unknown'
         ) AS endpoint,
         COUNT(*) FILTER (WHERE (req->'schema'->>'valid')::boolean IS TRUE)::int AS schema_valid,
         COUNT(*) FILTER (WHERE (req->'schema'->>'valid')::boolean IS FALSE)::int AS schema_invalid
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       CROSS JOIN LATERAL jsonb_array_elements(
         CASE
           WHEN jsonb_typeof(e.summary_json->'requests') = 'array'
           THEN e.summary_json->'requests'
           ELSE '[]'::jsonb
         END
       ) AS req
       WHERE c.user_id = $1
         AND e.collection_id = $2
         AND e.status IN ('passed', 'failed')
         AND e.summary_json IS NOT NULL
         AND req->'schema' IS NOT NULL
         AND jsonb_typeof(req->'schema') = 'object'
       GROUP BY 1
       ORDER BY (COUNT(*) FILTER (WHERE (req->'schema'->>'valid')::boolean IS FALSE)) DESC,
                endpoint ASC`,
      [userId, collectionId]
    );

    return res.json(
      result.rows.map((row) => ({
        endpoint: row.endpoint,
        schemaValid: row.schema_valid,
        schemaInvalid: row.schema_invalid,
      }))
    );
  } catch (err) {
    console.error('getSchemaValidationSummary error:', err);
    return res.status(500).json({ message: 'Failed to load schema validation summary' });
  }
}

module.exports = {
  getPassRateTrend,
  getResponseTimes,
  getEndpointReliability,
  getSchemaValidationSummary,
};
