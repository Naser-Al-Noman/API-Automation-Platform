import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell';
import UploadModal from '../components/UploadModal';
import * as environmentsApi from '../api/environments';

function EnvironmentsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await environmentsApi.listEnvironments();
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload({ name, file, json }) {
    if (file) {
      await environmentsApi.createEnvironment({ name, file });
    } else {
      await environmentsApi.createEnvironment({ name, variables_json: json });
    }
    await load();
  }

  async function handleDelete(id, envName) {
    if (!window.confirm(`Delete environment "${envName}"?`)) return;
    try {
      await environmentsApi.deleteEnvironment(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  }

  return (
    <AppShell
      title="Environments"
      actions={
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Upload Environment
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading environments…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No environments yet — upload one to get started.</p>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Upload Environment
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Variables</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/environments/${item.id}`)}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.variable_count ?? '—'}</td>
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
          title="Upload Postman Environment"
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
        />
      )}
    </AppShell>
  );
}

function EnvironmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [environment, setEnvironment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await environmentsApi.getEnvironment(id);
        if (!cancelled) setEnvironment(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load environment');
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

  const values = Array.isArray(environment?.variables_json?.values)
    ? environment.variables_json.values
    : [];

  return (
    <AppShell
      title={environment?.name || 'Environment'}
      actions={
        <button
          type="button"
          onClick={() => navigate('/environments')}
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

      {!loading && !error && environment && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            Variables ({values.length})
          </div>
          {values.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">No variables in this environment.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {values.map((entry, index) => (
                  <tr key={`${entry.key}-${index}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.key}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{entry.value}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.enabled === false ? 'No' : 'Yes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default function Environments() {
  const { id } = useParams();
  if (id) return <EnvironmentDetail />;
  return <EnvironmentsList />;
}
