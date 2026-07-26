import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '../components/ui';
import * as apiKeysApi from '../api/apiKeys';
import { formatDate } from '../utils/postmanUi';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiKeysApi.listApiKeys();
      setKeys(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setName('');
    setModalError('');
    setCreatedKey(null);
    setCopied(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setCreatedKey(null);
    setName('');
    setModalError('');
    setCopied(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const data = await apiKeysApi.createApiKey({ name: name.trim() });
      setCreatedKey(data);
      await load();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Failed to create key');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!createdKey?.key) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
    } catch {
      setModalError('Could not copy automatically — select and copy the key manually');
    }
  }

  async function handleDelete(id, keyName) {
    if (!window.confirm(`Delete API key "${keyName}"? CI workflows using it will stop working.`)) {
      return;
    }
    try {
      await apiKeysApi.deleteApiKey(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Delete failed');
    }
  }

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Authenticate GitHub Actions against /api/ci/* — keys are shown only once."
        actions={<Button onClick={openCreate}>Generate New Key</Button>}
      />

      {error && (
        <div className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading API keys…" />
      ) : keys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Generate a key to use with GitHub Actions CI."
          actionLabel="Generate New Key"
          onAction={openCreate}
        />
      ) : (
        <Card padding={false}>
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-fg">{key.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatDate(key.created_at)}</td>
                  <td className="px-4 py-3 text-fg-muted">
                    {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(key.id, key.name)}
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

      {showModal && (
        <Modal
          title={createdKey ? 'API key created' : 'Generate New Key'}
          onClose={closeModal}
        >
          {createdKey ? (
            <div className="space-y-4">
              <div className="rounded-md border border-badge-running-fg/30 bg-badge-running-bg px-3 py-2 text-sm text-badge-running-fg">
                Copy this key now — you will not be able to see it again.
              </div>
              <div className="rounded-md border border-border bg-surface-2 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {createdKey.name}
                </p>
                <code className="mt-2 block break-all font-mono text-xs text-fg">
                  {createdKey.key}
                </code>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={handleCopy}>{copied ? 'Copied' : 'Copy key'}</Button>
                <Button variant="secondary" onClick={closeModal}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {modalError && (
                <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
                  {modalError}
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg-secondary">Key name</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. GitHub Actions"
                  className="w-full rounded-md border border-border-strong px-3 py-2 text-fg outline-none focus:border-border-strong"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
