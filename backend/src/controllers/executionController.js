const path = require('path');
const fs = require('fs');
const { query } = require('../db/pool');
const { runCollection, REPORTS_DIR, ensureReportsDir } = require('../services/newmanService');

async function findOwnedCollection(collectionId, userId) {
  const result = await query(
    `SELECT id, user_id, name, postman_json
     FROM collections
     WHERE id = $1`,
    [collectionId]
  );
  const row = result.rows[0];
  if (!row) return { error: { status: 404, message: 'Collection not found' } };
  if (row.user_id !== userId) {
    return { error: { status: 403, message: 'You do not have access to this collection' } };
  }
  return { collection: row };
}

async function findOwnedEnvironment(environmentId, userId) {
  const result = await query(
    `SELECT id, user_id, name, variables_json
     FROM environments
     WHERE id = $1`,
    [environmentId]
  );
  const row = result.rows[0];
  if (!row) return { error: { status: 404, message: 'Environment not found' } };
  if (row.user_id !== userId) {
    return { error: { status: 403, message: 'You do not have access to this environment' } };
  }
  return { environment: row };
}

async function findOwnedExecution(executionId, userId) {
  // Omit report_html here — it can be large; load only when serving the report.
  const result = await query(
    `SELECT e.id, e.collection_id, e.environment_id, e.status,
            e.started_at, e.finished_at, e.report_url, e.summary_json,
            c.name AS collection_name, c.user_id, env.name AS environment_name
     FROM executions e
     JOIN collections c ON c.id = e.collection_id
     LEFT JOIN environments env ON env.id = e.environment_id
     WHERE e.id = $1`,
    [executionId]
  );
  const row = result.rows[0];
  if (!row) return { error: { status: 404, message: 'Execution not found' } };
  if (row.user_id !== userId) {
    return { error: { status: 403, message: 'You do not have access to this execution' } };
  }
  return { execution: row };
}

async function processExecutionAsync({
  executionId,
  collectionId,
  collectionJson,
  environmentJson,
}) {
  try {
    const schemaRows = await query(
      `SELECT endpoint, schema_json FROM schemas WHERE collection_id = $1`,
      [collectionId]
    );
    const schemasByEndpoint = {};
    for (const row of schemaRows.rows) {
      schemasByEndpoint[row.endpoint] = row.schema_json;
    }

    const result = await runCollection(
      collectionJson,
      environmentJson,
      executionId,
      schemasByEndpoint
    );

    let reportHtml = null;
    if (result.reportPath && fs.existsSync(result.reportPath)) {
      try {
        reportHtml = fs.readFileSync(result.reportPath, 'utf8');
      } catch (readErr) {
        console.error(`execution ${executionId}: failed to read report file:`, readErr);
      }
    }

    const reportUrl = result.reportPath
      ? `/api/executions/${executionId}/report`
      : null;

    await query(
      `UPDATE executions
       SET status = $1,
           finished_at = NOW(),
           summary_json = $2::jsonb,
           report_url = $3,
           report_html = $4
       WHERE id = $5`,
      [result.status, JSON.stringify(result.summary), reportUrl, reportHtml, executionId]
    );
  } catch (err) {
    console.error(`execution ${executionId} failed:`, err);
    await query(
      `UPDATE executions
       SET status = 'failed',
           finished_at = NOW(),
           summary_json = $1::jsonb
       WHERE id = $2`,
      [
        JSON.stringify({
          total: 0,
          passed: 0,
          failed: 0,
          averageResponseTime: null,
          requests: [],
          error: err.message || 'Unexpected execution error',
        }),
        executionId,
      ]
    );
  }
}

async function startExecution(req, res) {
  try {
    const collectionId = Number(req.body?.collectionId);
    const environmentId = Number(req.body?.environmentId);

    if (!Number.isInteger(collectionId) || collectionId < 1) {
      return res.status(400).json({ message: 'collectionId is required' });
    }
    if (!Number.isInteger(environmentId) || environmentId < 1) {
      return res.status(400).json({ message: 'environmentId is required' });
    }

    const { collection, error: collectionError } = await findOwnedCollection(
      collectionId,
      req.user.id
    );
    if (collectionError) {
      return res.status(collectionError.status).json({ message: collectionError.message });
    }

    const { environment, error: environmentError } = await findOwnedEnvironment(
      environmentId,
      req.user.id
    );
    if (environmentError) {
      return res.status(environmentError.status).json({ message: environmentError.message });
    }

    const inserted = await query(
      `INSERT INTO executions (collection_id, environment_id, status, started_at)
       VALUES ($1, $2, 'running', NOW())
       RETURNING id, collection_id, environment_id, status, started_at, finished_at, report_url, summary_json`,
      [collectionId, environmentId]
    );

    const execution = inserted.rows[0];

    // Fire-and-forget — client polls for completion
    setImmediate(() => {
      processExecutionAsync({
        executionId: execution.id,
        collectionId: collection.id,
        collectionJson: collection.postman_json,
        environmentJson: environment.variables_json,
      });
    });

    return res.status(202).json({
      id: execution.id,
      status: execution.status,
      collection_id: execution.collection_id,
      environment_id: execution.environment_id,
      started_at: execution.started_at,
    });
  } catch (err) {
    console.error('startExecution error:', err);
    return res.status(500).json({ message: 'Failed to start execution' });
  }
}

async function listExecutions(req, res) {
  try {
    const conditions = ['c.user_id = $1'];
    const params = [req.user.id];

    if (req.query.collectionId) {
      const collectionId = Number(req.query.collectionId);
      if (!Number.isInteger(collectionId) || collectionId < 1) {
        return res.status(400).json({ message: 'Invalid collectionId filter' });
      }
      params.push(collectionId);
      conditions.push(`e.collection_id = $${params.length}`);
    }

    if (req.query.environmentId) {
      const environmentId = Number(req.query.environmentId);
      if (!Number.isInteger(environmentId) || environmentId < 1) {
        return res.status(400).json({ message: 'Invalid environmentId filter' });
      }
      params.push(environmentId);
      conditions.push(`e.environment_id = $${params.length}`);
    }

    if (req.query.status) {
      const status = String(req.query.status).toLowerCase();
      if (!['passed', 'failed', 'running'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
      }
      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Invalid startDate' });
      }
      params.push(start.toISOString());
      conditions.push(`e.started_at >= $${params.length}::timestamptz`);
    }

    if (req.query.endDate) {
      const endRaw = String(req.query.endDate);
      let end;
      if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
        end = new Date(`${endRaw}T23:59:59.999Z`);
      } else {
        end = new Date(endRaw);
      }
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid endDate' });
      }
      params.push(end.toISOString());
      conditions.push(`e.started_at <= $${params.length}::timestamptz`);
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        params.push(`%${search}%`);
        conditions.push(`c.name ILIKE $${params.length}`);
      }
    }

    let page = Number(req.query.page);
    let limit = Number(req.query.limit);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const where = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       LEFT JOIN environments env ON env.id = e.environment_id
       WHERE ${where}`,
      params
    );
    const total = countResult.rows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const offset = (page - 1) * limit;

    const listParams = [...params, limit, offset];
    const result = await query(
      `SELECT e.id, e.collection_id, e.environment_id, e.status,
              e.started_at, e.finished_at, e.report_url, e.summary_json,
              c.name AS collection_name,
              env.name AS environment_name
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       LEFT JOIN environments env ON env.id = e.environment_id
       WHERE ${where}
       ORDER BY e.started_at DESC NULLS LAST, e.id DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return res.json({
      executions: result.rows,
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error('listExecutions error:', err);
    return res.status(500).json({ message: 'Failed to list executions' });
  }
}

async function getExecution(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid execution id' });
    }

    const { execution, error } = await findOwnedExecution(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.json({
      id: execution.id,
      collection_id: execution.collection_id,
      environment_id: execution.environment_id,
      collection_name: execution.collection_name,
      environment_name: execution.environment_name,
      status: execution.status,
      started_at: execution.started_at,
      finished_at: execution.finished_at,
      report_url: execution.report_url,
      summary_json: execution.summary_json,
    });
  } catch (err) {
    console.error('getExecution error:', err);
    return res.status(500).json({ message: 'Failed to fetch execution' });
  }
}

async function getExecutionStatus(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid execution id' });
    }

    const { execution, error } = await findOwnedExecution(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.json({
      id: execution.id,
      status: execution.status,
      report_url: execution.report_url || null,
    });
  } catch (err) {
    console.error('getExecutionStatus error:', err);
    return res.status(500).json({ message: 'Failed to fetch execution status' });
  }
}

const REPORT_MISSING_MESSAGE =
  'Report is no longer available for this execution. Re-run the collection to generate a new report — new runs persist HTML in the database.';

/**
 * Resolve an owned execution's HTML report from local disk or Neon (report_html).
 * Prefers local file (fast after a fresh run); falls back to DB.
 */
async function resolveOwnedReport(executionId, userId) {
  const id = Number(executionId);
  if (!Number.isInteger(id) || id < 1) {
    return { error: { status: 400, message: 'Invalid execution id' } };
  }

  const { error } = await findOwnedExecution(id, userId);
  if (error) {
    return { error };
  }

  ensureReportsDir();
  const reportPath = path.join(REPORTS_DIR, `${id}.html`);

  if (fs.existsSync(reportPath)) {
    return { id, source: 'local', reportPath };
  }

  const htmlResult = await query(
    `SELECT report_html FROM executions WHERE id = $1`,
    [id]
  );
  const reportHtml = htmlResult.rows[0]?.report_html;
  if (reportHtml) {
    return { id, source: 'db', buffer: Buffer.from(reportHtml, 'utf8') };
  }

  return { error: { status: 404, message: REPORT_MISSING_MESSAGE } };
}

function sendReportResponse(res, resolved, disposition) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', disposition);

  if (resolved.source === 'local') {
    return res.sendFile(resolved.reportPath);
  }

  return res.send(resolved.buffer);
}

async function getExecutionReport(req, res) {
  try {
    const resolved = await resolveOwnedReport(req.params.id, req.user.id);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    return sendReportResponse(res, resolved, 'inline');
  } catch (err) {
    console.error('getExecutionReport error:', err);
    return res.status(500).json({ message: 'Failed to fetch execution report' });
  }
}

async function downloadExecutionReport(req, res) {
  try {
    const resolved = await resolveOwnedReport(req.params.id, req.user.id);
    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    return sendReportResponse(
      res,
      resolved,
      `attachment; filename="execution-${resolved.id}-report.html"`
    );
  } catch (err) {
    console.error('downloadExecutionReport error:', err);
    return res.status(500).json({ message: 'Failed to download execution report' });
  }
}

module.exports = {
  startExecution,
  listExecutions,
  getExecution,
  getExecutionStatus,
  getExecutionReport,
  downloadExecutionReport,
};
