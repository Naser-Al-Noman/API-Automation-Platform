import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import * as executionsApi from '../api/executions';
import { formatDate } from '../utils/postmanUi';

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
    <>
      <PageHeader title="Execution History" />

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading executions…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No executions yet"
          description="Open a collection and click Run to start one."
          actionLabel="Go to Collections"
          actionHref="/collections"
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
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
                      <Badge status={item.status}>{item.status}</Badge>
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
        </Card>
      )}
    </>
  );
}
