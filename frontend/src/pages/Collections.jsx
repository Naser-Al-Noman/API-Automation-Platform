import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../components/ui';
import UploadModal from '../components/UploadModal';
import SchemaModal from '../components/SchemaModal';
import * as collectionsApi from '../api/collections';
import * as environmentsApi from '../api/environments';
import * as executionsApi from '../api/executions';
import * as schemasApi from '../api/schemas';
import { flattenCollectionItems, formatDate } from '../utils/postmanUi';
import { buildCiWorkflowYaml } from '../utils/ciWorkflow';

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
    <>
      <PageHeader
        title="Collections"
        actions={<Button onClick={() => setShowUpload(true)}>Upload Collection</Button>}
      />
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading collections…" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No collections yet — upload one to get started"
          actionLabel="Upload Collection"
          onAction={() => setShowUpload(true)}
        />
      ) : (
        <Card padding={false}>
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
                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id, item.name)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showUpload && (
        <UploadModal
          title="Upload Postman Collection"
          onClose={() => setShowUpload(false)}
          onSubmit={handleUpload}
        />
      )}
    </>
  );
}

function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);
  const [schemaModal, setSchemaModal] = useState(null); // { endpoint, existing }

  const loadSchemas = useCallback(async () => {
    const data = await schemasApi.listSchemas(Number(id));
    setSchemas(data);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [data, envs, schemaRows] = await Promise.all([
          collectionsApi.getCollection(id),
          environmentsApi.listEnvironments(),
          schemasApi.listSchemas(Number(id)),
        ]);
        if (!cancelled) {
          setCollection(data);
          setEnvironments(envs);
          setSchemas(schemaRows);
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

  function schemaForEndpoint(endpoint, name) {
    return (
      schemas.find((s) => s.endpoint === endpoint) ||
      schemas.find((s) => s.endpoint === name) ||
      null
    );
  }

  async function handleSaveSchema(schemaJson) {
    const existing = schemaModal?.existing;
    if (existing) {
      await schemasApi.updateSchema(existing.id, {
        endpoint: schemaModal.endpoint,
        schema_json: schemaJson,
      });
    } else {
      await schemasApi.createSchema({
        collectionId: Number(id),
        endpoint: schemaModal.endpoint,
        schema_json: schemaJson,
      });
    }
    await loadSchemas();
  }

  async function handleDeleteSchema(schema) {
    if (!window.confirm(`Delete schema for "${schema.endpoint}"?`)) return;
    try {
      await schemasApi.deleteSchema(schema.id);
      await loadSchemas();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  }

  const rows = flattenCollectionItems(collection?.postman_json?.item);

  return (
    <>
      <PageHeader
        title={collection?.name || 'Collection'}
        actions={
          <Button variant="secondary" onClick={() => navigate('/collections')}>
            Back to list
          </Button>
        }
      />
      {loading && <LoadingSpinner label="Loading…" />}
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
                <dt className="text-slate-500">Schemas</dt>
                <dd className="font-medium text-slate-900">{schemas.length}</dd>
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
                  <Button onClick={handleRun} disabled={running}>
                    {running ? 'Starting…' : 'Run'}
                  </Button>
                </div>
              )}
              {runError && (
                <p className="mt-2 text-sm text-red-700">{runError}</p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-800">CI Integration</p>
              <p className="mt-1 text-sm text-slate-600">
                Copy this GitHub Actions workflow into{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">.github/workflows/</code>.
                Add secrets{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">BACKEND_URL</code> and{' '}
                <code className="rounded bg-slate-100 px-1 text-xs">API_KEY</code>
                {' '}(create a key under{' '}
                <button
                  type="button"
                  onClick={() => navigate('/api-keys')}
                  className="font-medium text-slate-900 underline"
                >
                  API Keys
                </button>
                ). Collection id <strong>{collection.id}</strong> is already filled in.
              </p>

              {environments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Upload an environment first to fill environmentId in the snippet.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <label className="block max-w-sm">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Environment for CI snippet
                    </span>
                    <select
                      value={selectedEnvId}
                      onChange={(e) => setSelectedEnvId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    >
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name} (id {env.id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="relative">
                    <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
                      {buildCiWorkflowYaml({
                        collectionId: collection.id,
                        environmentId: selectedEnvId ? Number(selectedEnvId) : undefined,
                      })}
                    </pre>
                    <button
                      type="button"
                      onClick={async () => {
                        const yaml = buildCiWorkflowYaml({
                          collectionId: collection.id,
                          environmentId: selectedEnvId
                            ? Number(selectedEnvId)
                            : undefined,
                        });
                        try {
                          await navigator.clipboard.writeText(yaml);
                          alert('Workflow YAML copied to clipboard');
                        } catch {
                          alert('Could not copy — select the YAML manually');
                        }
                      }}
                      className="absolute right-3 top-3 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20"
                    >
                      Copy YAML
                    </button>
                  </div>
                </div>
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
                {rows.map((row, index) => {
                  if (row.type === 'folder') {
                    return (
                      <li key={`folder-${row.name}-${index}`} className="px-4 py-3 text-sm">
                        <div className="font-medium text-slate-500">
                          {' '.repeat(row.path.length)}[Folder] {row.name}
                        </div>
                      </li>
                    );
                  }

                  const existing = schemaForEndpoint(row.endpoint, row.name);

                  return (
                    <li key={`req-${row.endpoint}-${index}`} className="px-4 py-3 text-sm">
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
                        {existing && (
                          <Badge variant="success">Schema defined</Badge>
                        )}
                        <div className="ml-auto flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setSchemaModal({
                                endpoint: row.endpoint,
                                existing,
                              })
                            }
                          >
                            {existing ? 'Edit Schema' : 'Define Schema'}
                          </Button>
                          {existing && (
                            <Button variant="danger" size="sm" onClick={() => handleDeleteSchema(existing)}>
                              Delete Schema
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {schemaModal && (
        <SchemaModal
          endpoint={schemaModal.endpoint}
          existingSchema={schemaModal.existing}
          onClose={() => setSchemaModal(null)}
          onSave={handleSaveSchema}
        />
      )}
    </>
  );
}

export default function Collections() {
  const { id } = useParams();
  if (id) return <CollectionDetail />;
  return <CollectionsList />;
}
