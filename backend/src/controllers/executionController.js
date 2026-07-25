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
  const result = await query(
    `SELECT e.*, c.name AS collection_name, c.user_id, env.name AS environment_name
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
  collectionJson,
  environmentJson,
}) {
  try {
    const result = await runCollection(collectionJson, environmentJson, executionId);
    const reportUrl = result.reportPath
      ? `/api/executions/${executionId}/report`
      : null;

    await query(
      `UPDATE executions
       SET status = $1,
           finished_at = NOW(),
           summary_json = $2::jsonb,
           report_url = $3
       WHERE id = $4`,
      [result.status, JSON.stringify(result.summary), reportUrl, executionId]
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
    const params = [req.user.id];
    let filter = '';

    if (req.query.collectionId) {
      const collectionId = Number(req.query.collectionId);
      if (!Number.isInteger(collectionId) || collectionId < 1) {
        return res.status(400).json({ message: 'Invalid collectionId filter' });
      }
      params.push(collectionId);
      filter = ` AND e.collection_id = $${params.length}`;
    }

    const result = await query(
      `SELECT e.id, e.collection_id, e.environment_id, e.status,
              e.started_at, e.finished_at, e.report_url, e.summary_json,
              c.name AS collection_name,
              env.name AS environment_name
       FROM executions e
       JOIN collections c ON c.id = e.collection_id
       LEFT JOIN environments env ON env.id = e.environment_id
       WHERE c.user_id = $1${filter}
       ORDER BY e.started_at DESC NULLS LAST, e.id DESC`,
      params
    );

    return res.json(result.rows);
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

    return res.json({ status: execution.status });
  } catch (err) {
    console.error('getExecutionStatus error:', err);
    return res.status(500).json({ message: 'Failed to fetch execution status' });
  }
}

async function getExecutionReport(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid execution id' });
    }

    const { execution, error } = await findOwnedExecution(id, req.user.id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    ensureReportsDir();
    const reportPath = path.join(REPORTS_DIR, `${id}.html`);

    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ message: 'Report file not found for this execution' });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(reportPath);
  } catch (err) {
    console.error('getExecutionReport error:', err);
    return res.status(500).json({ message: 'Failed to fetch execution report' });
  }
}

module.exports = {
  startExecution,
  listExecutions,
  getExecution,
  getExecutionStatus,
  getExecutionReport,
};
