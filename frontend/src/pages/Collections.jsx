import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import UploadModal from '../components/UploadModal';
import * as collectionsApi from '../api/collections';
import * as environmentsApi from '../api/environments';
import * as executionsApi from '../api/executions';
import { flattenCollectionItems, formatDate } from '../utils/postmanUi';

function CollectionsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await collectionsApi.listCollections();
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload({ name, file, json }) {
    if (file) {
      await collectionsApi.createCollection({ name, file });
    } else {
      await collectionsApi.createCollection({ name, postman_json: json });
    }
    await load();
  }

  async function handleDelete(id, collectionName) {
    if (!window.confirm(`Delete collection "${collectionName}"?`)) return;
    try {
      await collectionsApi.deleteCollection(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  }

  return (
    <AppShell
      title="Collections"
      actions={
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Upload Collection
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading collections…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No collections yet — upload one to get started.</p>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Upload Collection
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/collections/${item.id}`)}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.request_count ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <UploadModal
          title="Upload Postman Collection"
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
        />
      )}
    </AppShell>
  );
}

function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [data, envs] = await Promise.all([
          collectionsApi.getCollection(id),
          environmentsApi.listEnvironments(),
        ]);
        if (!cancelled) {
          setCollection(data);
          setEnvironments(envs);
          if (envs.length > 0) {
            setSelectedEnvId(String(envs[0].id));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load collection');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleRun() {
    setRunError('');
    if (!selectedEnvId) {
      setRunError('Select an environment to run against');
      return;
    }

    setRunning(true);
    try {
      const execution = await executionsApi.startExecution({
        collectionId: Number(id),
        environmentId: Number(selectedEnvId),
      });
      navigate(`/executions/${execution.id}`);
    } catch (err) {
      setRunError(err.response?.data?.message || err.message || 'Failed to start run');
    } finally {
      setRunning(false);
    }
  }

  const rows = flattenCollectionItems(collection?.postman_json?.item);

  return (
    <AppShell
      title={collection?.name || 'Collection'}
      actions={
        <button
          type="button"
          onClick={() => navigate('/collections')}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to list
        </button>
      }
    >
      {loading && <p className="text-slate-500">Loading…</p>}
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && collection && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">{formatDate(collection.created_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Requests</dt>
                <dd className="font-medium text-slate-900">{collection.request_count}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Schema</dt>
                <dd className="font-medium text-slate-900">
                  {collection.postman_json?.info?.schema?.includes('v2.1')
                    ? 'Postman Collection v2.1'
                    : 'Postman Collection'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-800">Run with Newman</p>
              {environments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Upload an environment first, then come back to run this collection.{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/environments')}
                    className="font-medium text-slate-900 underline"
                  >
                    Go to Environments
                  </button>
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block min-w-[220px] flex-1">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Environment
                    </span>
                    <select
                      value={selectedEnvId}
                      onChange={(e) => setSelectedEnvId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    >
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleRun}
                    disabled={running}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {running ? 'Starting…' : 'Run'}
                  </button>
                </div>
              )}
              {runError && (
                <p className="mt-2 text-sm text-red-700">{runError}</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
              Endpoints
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">No requests found in this collection.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <li key={`${row.type}-${row.name}-${index}`} className="px-4 py-3 text-sm">
                    {row.type === 'folder' ? (
                      <div className="font-medium text-slate-500">
                        {' '.repeat(row.path.length)}[Folder] {row.name}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-16 shrink-0 rounded bg-slate-900 px-2 py-0.5 text-center text-xs font-semibold text-white">
                          {row.method}
                        </span>
                        <span className="font-medium text-slate-900">{row.name}</span>
                        {row.path.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {row.path.join(' / ')}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function Collections() {
  const { id } = useParams();
  if (id) return <CollectionDetail />;
  return <CollectionsList />;
}
