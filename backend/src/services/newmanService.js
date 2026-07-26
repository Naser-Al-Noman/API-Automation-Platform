const fs = require('fs');
const path = require('path');
const newman = require('newman');
const Ajv = require('ajv');

// Register htmlextra so newman can resolve the reporter by name
require('newman-reporter-htmlextra');

// HTML reports are written under backend/reports/ and also saved to Neon
// (executions.report_html) so they survive Render ephemeral disk wipes.
// See backend/REPORTS.md.
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

function getItemEndpointKeys(item) {
  const names = [];
  let cursor = item;

  while (cursor) {
    if (cursor.name) {
      names.unshift(cursor.name);
    }

    let parent = null;
    if (typeof cursor.parent === 'function') {
      try {
        parent = cursor.parent();
      } catch {
        parent = null;
      }
    }

    // Stop at Collection root (has .info / no request & is not an ItemGroup with items only)
    if (!parent || parent.info) {
      break;
    }
    cursor = parent;
  }

  const fullPath = names.join('/');
  const shortName = item?.name || 'Unnamed request';
  return { shortName, fullPath };
}

function resolveSchemaForItem(item, schemasByEndpoint) {
  if (!schemasByEndpoint || typeof schemasByEndpoint !== 'object') {
    return null;
  }

  const { shortName, fullPath } = getItemEndpointKeys(item);
  if (fullPath && schemasByEndpoint[fullPath]) {
    return { endpoint: fullPath, schema: schemasByEndpoint[fullPath] };
  }
  if (schemasByEndpoint[shortName]) {
    return { endpoint: shortName, schema: schemasByEndpoint[shortName] };
  }
  return null;
}

function validateResponseAgainstSchema(response, schemaJson) {
  if (!response) {
    return {
      valid: false,
      errors: ['No response received — cannot validate schema'],
    };
  }

  let body;
  try {
    if (typeof response.json === 'function') {
      body = response.json();
    } else if (response.stream) {
      body = JSON.parse(Buffer.from(response.stream).toString('utf8'));
    } else if (typeof response.text === 'function') {
      body = JSON.parse(response.text());
    } else {
      return {
        valid: false,
        errors: ['Response body is not available for JSON Schema validation'],
      };
    }
  } catch (err) {
    return {
      valid: false,
      errors: [
        `Response body is not valid JSON: ${err.message || 'parse failed'}`,
      ],
    };
  }

  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schemaJson);
    const valid = validate(body);
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = (validate.errors || []).map((e) => {
      const where = e.instancePath || e.schemaPath || '';
      return `${where} ${e.message || 'validation failed'}`.trim();
    });

    return {
      valid: false,
      errors: errors.length > 0 ? errors : ['Schema validation failed'],
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Schema validation error: ${err.message || String(err)}`],
    };
  }
}

function buildSummary(summary, err, schemaResultsByItemId = {}) {
  const run = summary?.run || {};
  const stats = run.stats || {};
  const timings = run.timings || {};
  const executions = Array.isArray(run.executions) ? run.executions : [];
  const failures = Array.isArray(run.failures) ? run.failures : [];

  const requests = executions.map((execution) => {
    const name = execution.item?.name || 'Unnamed request';
    const { fullPath } = getItemEndpointKeys(execution.item);
    const method =
      typeof execution.request?.method === 'string'
        ? execution.request.method.toUpperCase()
        : undefined;
    const responseTime = execution.response?.responseTime ?? null;

    const assertions = Array.isArray(execution.assertions)
      ? execution.assertions
      : [];
    const assertionFailures = assertions.filter((a) => a.error);
    const requestFailures = failures.filter(
      (f) => f.source?.id && execution.item?.id && f.source.id === execution.item.id
    );

    const errorMessages = [
      ...assertionFailures.map(
        (a) => a.error?.message || a.error?.name || 'Assertion failed'
      ),
      ...requestFailures.map(
        (f) => f.error?.message || f.error?.name || 'Request failed'
      ),
    ];

    if (!execution.response && execution.requestError) {
      errorMessages.push(
        execution.requestError.message || String(execution.requestError)
      );
    }

    const tests = {
      total: assertions.length,
      passed: assertions.length - assertionFailures.length,
      failed: assertionFailures.length,
    };

    const itemId = execution.item?.id;
    const schemaResult = itemId ? schemaResultsByItemId[itemId] : null;

    const newmanOk = errorMessages.length === 0 && !!execution.response;
    const schemaOk = !schemaResult || schemaResult.valid;
    const passed = newmanOk && schemaOk;

    return {
      name,
      endpoint: fullPath || name,
      method,
      passed,
      responseTime,
      error: errorMessages[0] || (!schemaOk ? schemaResult.errors?.[0] : null) || null,
      errors: errorMessages,
      tests,
      schema: schemaResult
        ? {
            endpoint: schemaResult.endpoint,
            valid: schemaResult.valid,
            errors: schemaResult.errors || [],
          }
        : null,
    };
  });

  const total = stats.requests?.total ?? requests.length;
  const schemaFailedCount = requests.filter((r) => r.schema && !r.schema.valid).length;
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
    err ||
    failed > 0 ||
    assertionFailed > 0 ||
    failures.length > 0 ||
    schemaFailedCount > 0
      ? 'failed'
      : 'passed';

  return {
    status,
    total,
    passed,
    failed,
    assertions: {
      total: stats.assertions?.total ?? 0,
      failed: assertionFailed,
    },
    schemaValidation: {
      checked: requests.filter((r) => r.schema).length,
      failed: schemaFailedCount,
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
 * schemasByEndpoint: { [endpointName]: schemaJson }
 * Always resolves — never throws to the caller.
 */
function runCollection(collectionJson, environmentJson, executionId, schemasByEndpoint = {}) {
  ensureReportsDir();

  const reportPath = path.join(REPORTS_DIR, `${executionId}.html`);
  const environment = toPostmanEnvironment(environmentJson);
  const schemaResultsByItemId = {};

  return new Promise((resolve) => {
    try {
      const runner = newman.run(
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
          timeout: 10 * 60 * 1000,
          timeoutRequest: 30 * 1000,
          insecure: true,
        },
        (err, summary) => {
          try {
            const structured = buildSummary(summary, err, schemaResultsByItemId);
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

      runner.on('request', (err, args) => {
        try {
          const item = args?.item;
          if (!item) return;

          const matched = resolveSchemaForItem(item, schemasByEndpoint);
          if (!matched) return;

          const result = err
            ? {
                valid: false,
                errors: [err.message || 'Request error during schema validation'],
              }
            : validateResponseAgainstSchema(args.response, matched.schema);

          if (item.id) {
            schemaResultsByItemId[item.id] = {
              endpoint: matched.endpoint,
              valid: result.valid,
              errors: result.errors || [],
            };
          }
        } catch (validationErr) {
          const item = args?.item;
          if (item?.id) {
            schemaResultsByItemId[item.id] = {
              endpoint: item.name || 'Unknown',
              valid: false,
              errors: [
                validationErr.message || 'Unexpected schema validation error',
              ],
            };
          }
        }
      });
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
