import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import * as executionsApi from '../api/executions';
import { formatDate } from '../utils/postmanUi';

function statusBadgeClass(status) {
  if (status === 'passed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'failed') return 'bg-red-100 text-red-800';
  if (status === 'running') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function durationLabel(startedAt, finishedAt, status) {
  if (!startedAt) return '—';
  if (!finishedAt) return status === 'running' ? 'In progress' : '—';
  const ms = new Date(finishedAt) - new Date(startedAt);
  if (Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function ExecutionHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await executionsApi.listExecutions();
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title="Execution History">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading executions…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No executions yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Open a collection and click Run to start one.
          </p>
          <Link
            to="/collections"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to Collections
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Environment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.collection_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.environment_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${statusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.started_at)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {durationLabel(item.started_at, item.finished_at, item.status)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/executions/${item.id}`}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
