import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { durationLabel } from '../components/ExecutionRow';
import { Badge, Button, Card, LoadingSpinner } from '../components/ui';
import * as executionsApi from '../api/executions';
import { formatDate } from '../utils/postmanUi';

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportUrl, setReportUrl] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [iframeFailed, setIframeFailed] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState('');
  const [downloadError, setDownloadError] = useState('');

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
      setReportUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setIframeFailed(false);
      setReportError('');
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

  // Auto-load HTML report into iframe when finished
  useEffect(() => {
    if (!execution || execution.status === 'running' || !execution.report_url) return undefined;

    let cancelled = false;

    async function loadReport() {
      setReportLoading(true);
      setReportError('');
      setIframeFailed(false);
      try {
        const blob = await executionsApi.fetchExecutionReportBlob(id);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setReportUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        if (!cancelled) {
          setReportError(
            err.response?.data?.message || err.message || 'Failed to load report'
          );
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [execution, id]);

  async function openReportInTab() {
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

  async function handleDownload() {
    setDownloadError('');
    try {
      const blob = await executionsApi.downloadExecutionReport(id);
      const file = new Blob([blob], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${id}-report.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      let message = err.message || 'Failed to download report';
      if (err.response?.data instanceof Blob) {
        try {
          const parsed = JSON.parse(await err.response.data.text());
          message = parsed.message || message;
        } catch {
          // keep message
        }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      setDownloadError(message);
    }
  }

  async function handleRerun() {
    if (!execution?.collection_id || !execution?.environment_id) {
      setRerunError('This execution is missing collection or environment details.');
      return;
    }
    setRerunning(true);
    setRerunError('');
    try {
      const created = await executionsApi.startExecution({
        collectionId: execution.collection_id,
        environmentId: execution.environment_id,
      });
      navigate(`/executions/${created.id}`);
    } catch (err) {
      setRerunError(err.response?.data?.message || err.message || 'Failed to re-run');
      setRerunning(false);
    }
  }

  const summary = execution?.summary_json;
  const requests = Array.isArray(summary?.requests) ? summary.requests : [];
  const canRerun =
    execution?.collection_id &&
    execution?.environment_id &&
    execution.status !== 'running';

  return (
    <>
      <PageHeader
        title={execution ? `Execution #${execution.id}` : 'Execution'}
        actions={
          <div className="flex flex-wrap gap-2">
            {canRerun && (
              <Button onClick={handleRerun} disabled={rerunning}>
                {rerunning ? 'Starting…' : 'Re-run this collection'}
              </Button>
            )}
            <Link to="/executions">
              <Button variant="secondary">Back to history</Button>
            </Link>
          </div>
        }
      />
      {loading && <LoadingSpinner label="Loading execution…" />}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {rerunError && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{rerunError}</div>
      )}

      {!loading && !error && execution && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Badge status={execution.status}>{execution.status}</Badge>
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
                  {durationLabel(execution.started_at, execution.finished_at, execution.status)}
                </dd>
              </div>
            </dl>
          </Card>

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
                  <Card key={card.label} className="!p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{card.value}</p>
                  </Card>
                ))}
              </div>

              {summary.error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {summary.error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={openReportInTab}>Open report in new tab</Button>
                {execution.report_url && (
                  <Button variant="secondary" onClick={handleDownload}>
                    Download Report
                  </Button>
                )}
                {(reportError || downloadError) && (
                  <span className="text-sm text-red-700">{reportError || downloadError}</span>
                )}
              </div>

              <Card padding={false}>
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
              </Card>

              {execution.report_url && (
                <Card padding={false} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">HTML report preview</p>
                    <Button variant="secondary" size="sm" onClick={openReportInTab}>
                      Open in new tab
                    </Button>
                  </div>

                  {reportLoading && (
                    <div className="px-4 py-12">
                      <LoadingSpinner label="Loading report…" />
                    </div>
                  )}

                  {!reportLoading && reportError && (
                    <div className="px-4 py-8 text-center text-sm text-slate-600">
                      <p>{reportError}</p>
                      <Button className="mt-3" variant="secondary" onClick={handleDownload}>
                        Download Report
                      </Button>
                    </div>
                  )}

                  {!reportLoading && !reportError && reportUrl && !iframeFailed && (
                    <iframe
                      title="Newman HTML report"
                      src={reportUrl}
                      className="min-h-[70vh] h-[min(85vh,900px)] w-full resize-y bg-white"
                      onError={() => setIframeFailed(true)}
                    />
                  )}

                  {!reportLoading && !reportError && iframeFailed && (
                    <div className="px-4 py-8 text-center text-sm text-slate-600">
                      <p>
                        The report could not be shown inline (some browsers restrict iframe
                        content). Open it in a new tab or download the HTML file instead.
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        <Button variant="secondary" onClick={openReportInTab}>
                          Open in new tab
                        </Button>
                        <Button onClick={handleDownload}>Download Report</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
