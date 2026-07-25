const fs = require('fs');
const path = require('path');
const newman = require('newman');

// Register htmlextra so newman can resolve the reporter by name
require('newman-reporter-htmlextra');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function toPostmanEnvironment(environmentJson, name = 'Environment') {
  if (!environmentJson) {
    return {
      name,
      values: [],
      _postman_variable_scope: 'environment',
    };
  }

  if (Array.isArray(environmentJson.values)) {
    return {
      id: environmentJson.id,
      name: environmentJson.name || name,
      values: environmentJson.values.map((entry) => ({
        key: entry.key,
        value: entry.value == null ? '' : String(entry.value),
        enabled: entry.enabled !== false,
        type: entry.type || 'default',
      })),
      _postman_variable_scope:
        environmentJson._postman_variable_scope || 'environment',
    };
  }

  // Plain key/value object fallback
  if (typeof environmentJson === 'object' && !Array.isArray(environmentJson)) {
    return {
      name,
      values: Object.entries(environmentJson).map(([key, value]) => ({
        key,
        value: value == null ? '' : String(value),
        enabled: true,
        type: 'default',
      })),
      _postman_variable_scope: 'environment',
    };
  }

  return {
    name,
    values: [],
    _postman_variable_scope: 'environment',
  };
}

function buildSummary(summary, err) {
  const run = summary?.run || {};
  const stats = run.stats || {};
  const timings = run.timings || {};
  const executions = Array.isArray(run.executions) ? run.executions : [];
  const failures = Array.isArray(run.failures) ? run.failures : [];

  const requests = executions.map((execution) => {
    const name = execution.item?.name || 'Unnamed request';
    const method =
      typeof execution.request?.method === 'string'
        ? execution.request.method.toUpperCase()
        : undefined;
    const responseTime = execution.response?.responseTime ?? null;
    const assertionFailures = (execution.assertions || []).filter((a) => a.error);
    const requestFailures = failures.filter(
      (f) => f.source?.id && execution.item?.id && f.source.id === execution.item.id
    );

    const errorMessages = [
      ...assertionFailures.map((a) => a.error?.message || a.error?.name || 'Assertion failed'),
      ...requestFailures.map((f) => f.error?.message || f.error?.name || 'Request failed'),
    ];

    if (!execution.response && execution.requestError) {
      errorMessages.push(
        execution.requestError.message || String(execution.requestError)
      );
    }

    const passed = errorMessages.length === 0 && !!execution.response;

    return {
      name,
      method,
      passed,
      responseTime,
      error: errorMessages[0] || null,
      errors: errorMessages,
    };
  });

  const total = stats.requests?.total ?? requests.length;
  const failedFromStats = stats.requests?.failed ?? 0;
  const failedFromList = requests.filter((r) => !r.passed).length;
  const failed = Math.max(failedFromStats, failedFromList);
  const passed = Math.max(total - failed, 0);

  const responseTimes = requests
    .map((r) => r.responseTime)
    .filter((t) => typeof t === 'number' && !Number.isNaN(t));
  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : timings.responseAverage != null
        ? Math.round(timings.responseAverage)
        : null;

  const assertionFailed = stats.assertions?.failed ?? 0;
  const status =
    err || failed > 0 || assertionFailed > 0 || failures.length > 0 ? 'failed' : 'passed';

  return {
    status,
    total,
    passed,
    failed,
    assertions: {
      total: stats.assertions?.total ?? 0,
      failed: assertionFailed,
    },
    averageResponseTime,
    durationMs:
      timings.completed && timings.started
        ? Math.max(0, Math.round(timings.completed - timings.started))
        : null,
    requests,
    error: err ? err.message || String(err) : null,
  };
}

/**
 * Run a Postman collection with Newman and generate an HTML report.
 * Always resolves — never throws to the caller.
 */
function runCollection(collectionJson, environmentJson, executionId) {
  ensureReportsDir();

  const reportPath = path.join(REPORTS_DIR, `${executionId}.html`);
  const environment = toPostmanEnvironment(environmentJson);

  return new Promise((resolve) => {
    try {
      newman.run(
        {
          collection: collectionJson,
          environment,
          reporters: ['cli', 'htmlextra', 'json'],
          reporter: {
            htmlextra: {
              export: reportPath,
              omitHeaders: false,
              skipHeaders: false,
            },
          },
          // Guardrails for long / hung runs
          timeout: 10 * 60 * 1000, // entire collection: 10 minutes
          timeoutRequest: 30 * 1000, // per request: 30 seconds
          insecure: true,
        },
        (err, summary) => {
          try {
            const structured = buildSummary(summary, err);
            const reportExists = fs.existsSync(reportPath);

            resolve({
              status: structured.status || (err ? 'failed' : 'passed'),
              summary: structured,
              reportPath: reportExists ? reportPath : null,
            });
          } catch (parseErr) {
            resolve({
              status: 'failed',
              summary: {
                total: 0,
                passed: 0,
                failed: 0,
                averageResponseTime: null,
                requests: [],
                error: parseErr.message || 'Failed to parse Newman summary',
              },
              reportPath: fs.existsSync(reportPath) ? reportPath : null,
            });
          }
        }
      );
    } catch (err) {
      resolve({
        status: 'failed',
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          averageResponseTime: null,
          requests: [],
          error: err.message || 'Newman failed to start',
        },
        reportPath: null,
      });
    }
  });
}

module.exports = {
  runCollection,
  REPORTS_DIR,
  toPostmanEnvironment,
  ensureReportsDir,
};
