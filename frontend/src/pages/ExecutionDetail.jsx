import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import * as executionsApi from '../api/executions';
import { formatDate } from '../utils/postmanUi';

function statusBadgeClass(status) {
  if (status === 'passed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'failed') return 'bg-red-100 text-red-800';
  if (status === 'running') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function durationLabel(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return '—';
  const ms = new Date(finishedAt) - new Date(startedAt);
  if (Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportUrl, setReportUrl] = useState(null);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let pollTimer;

    async function loadFull() {
      const data = await executionsApi.getExecution(id);
      if (!cancelled) {
        setExecution(data);
        setLoading(false);
      }
      return data;
    }

    async function start() {
      setLoading(true);
      setError('');
      try {
        const data = await loadFull();
        if (data.status === 'running') {
          pollTimer = setInterval(async () => {
            try {
              const { status } = await executionsApi.getExecutionStatus(id);
              if (status !== 'running') {
                clearInterval(pollTimer);
                await loadFull();
              }
            } catch (err) {
              clearInterval(pollTimer);
              if (!cancelled) {
                setError(err.response?.data?.message || err.message || 'Polling failed');
              }
            }
          }, 2500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load execution');
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (reportUrl) URL.revokeObjectURL(reportUrl);
    };
  }, [reportUrl]);

  async function openReport() {
    setReportError('');
    try {
      if (reportUrl) {
        window.open(reportUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const blob = await executionsApi.fetchExecutionReportBlob(id);
      const url = URL.createObjectURL(blob);
      setReportUrl(url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setReportError(err.response?.data?.message || err.message || 'Failed to load report');
    }
  }

  const summary = execution?.summary_json;
  const requests = Array.isArray(summary?.requests) ? summary.requests : [];

  return (
    <AppShell
      title={execution ? `Execution #${execution.id}` : 'Execution'}
      actions={
        <Link
          to="/executions"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to history
        </Link>
      }
    >
      {loading && <p className="text-slate-500">Loading execution…</p>}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && execution && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${statusBadgeClass(
                  execution.status
                )}`}
              >
                {execution.status}
              </span>
              {execution.status === 'running' && (
                <span className="text-sm text-slate-500">Running — polling for results…</span>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-slate-500">Collection</dt>
                <dd className="font-medium text-slate-900">{execution.collection_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Environment</dt>
                <dd className="font-medium text-slate-900">
                  {execution.environment_name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Started</dt>
                <dd className="font-medium text-slate-900">{formatDate(execution.started_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-medium text-slate-900">
                  {durationLabel(execution.started_at, execution.finished_at)}
                </dd>
              </div>
            </dl>
          </div>

          {execution.status !== 'running' && summary && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total requests', value: summary.total ?? 0 },
                  { label: 'Passed', value: summary.passed ?? 0 },
                  { label: 'Failed', value: summary.failed ?? 0 },
                  {
                    label: 'Avg response',
                    value:
                      summary.averageResponseTime != null
                        ? `${summary.averageResponseTime} ms`
                        : '—',
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{card.value}</p>
                  </div>
                ))}
              </div>

              {summary.error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {summary.error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openReport}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  View Full HTML Report
                </button>
                {reportError && (
                  <span className="text-sm text-red-700">{reportError}</span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                  Request breakdown
                </div>
                {requests.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-slate-500">No per-request data available.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {requests.map((req, index) => {
                      const tests = req.tests || {
                        total: 0,
                        passed: 0,
                        failed: 0,
                      };
                      const schema = req.schema;

                      return (
                        <li key={`${req.name}-${index}`} className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                req.passed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {req.passed ? 'PASS' : 'FAIL'}
                            </span>
                            {req.method && (
                              <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                                {req.method}
                              </span>
                            )}
                            <span className="font-medium text-slate-900">{req.name}</span>
                            {req.responseTime != null && (
                              <span className="text-xs text-slate-500">
                                {req.responseTime} ms
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {tests.total > 0
                                ? `Tests: ${tests.passed}/${tests.total} passed`
                                : 'Tests: none'}
                            </span>
                            {schema ? (
                              <details className="inline">
                                <summary
                                  className={`cursor-pointer list-none rounded px-2 py-0.5 text-xs font-medium ${
                                    schema.valid
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  Schema: {schema.valid ? 'valid' : 'invalid'}
                                  {!schema.valid && schema.errors?.length
                                    ? ' (details)'
                                    : ''}
                                </summary>
                                {!schema.valid && schema.errors?.length > 0 && (
                                  <ul className="mt-2 space-y-1 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                                    {schema.errors.map((msg, i) => (
                                      <li key={i}>{msg}</li>
                                    ))}
                                  </ul>
                                )}
                              </details>
                            ) : (
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                Schema: not defined
                              </span>
                            )}
                          </div>

                          {req.error && !schema?.errors?.includes(req.error) && (
                            <p className="mt-1 text-xs text-red-700">{req.error}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {reportUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                    HTML report preview
                  </div>
                  <iframe
                    title="Newman HTML report"
                    src={reportUrl}
                    className="h-[70vh] w-full bg-white"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
