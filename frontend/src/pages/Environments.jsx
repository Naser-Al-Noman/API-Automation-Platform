import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
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
    <>
      <PageHeader
        title="Environments"
        actions={<Button onClick={() => setShowUpload(true)}>Upload Environment</Button>}
      />

      {error && (
        <div className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading environments…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No environments yet — upload one to get started"
          actionLabel="Upload Environment"
          onAction={() => setShowUpload(true)}
        />
      ) : (
        <Card padding={false}>
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Variables</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/environments/${item.id}`)}
                      className="font-medium text-fg underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{item.variable_count ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showUpload && (
        <UploadModal
          title="Upload Postman Environment"
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
        />
      )}
    </>
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
    <>
      <PageHeader
        title={environment?.name || 'Environment'}
        actions={
          <Button variant="secondary" onClick={() => navigate('/environments')}>
            Back to list
          </Button>
        }
      />

      {loading && <LoadingSpinner label="Loading…" />}
      {error && (
        <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {!loading && !error && environment && (
        <Card padding={false}>
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-fg-secondary">
            Variables ({values.length})
          </div>
          {values.length === 0 ? (
            <p className="px-4 py-8 text-sm text-fg-muted">No variables in this environment.</p>
          ) : (
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-surface-2 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {values.map((entry, index) => (
                  <tr key={`${entry.key}-${index}`}>
                    <td className="px-4 py-3 font-medium text-fg">{entry.key}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-secondary">{entry.value}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {entry.enabled === false ? 'No' : 'Yes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}

export default function Environments() {
  const { id } = useParams();
  if (id) return <EnvironmentDetail />;
  return <EnvironmentsList />;
}
