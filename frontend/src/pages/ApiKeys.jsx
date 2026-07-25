import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
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
    <AppShell
      title="API Keys"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Generate New Key
        </button>
      }
    >
      <p className="mb-6 max-w-2xl text-sm text-slate-600">
        API keys authenticate GitHub Actions (and other CI) against{' '}
        <code className="rounded bg-slate-200 px-1">/api/ci/*</code> endpoints.
        Keys are shown only once at creation — store them as GitHub Secrets.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading API keys…</p>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No API keys yet.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Generate New Key
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last used</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{key.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(key.created_at)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(key.id, key.name)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {createdKey ? 'API key created' : 'Generate New Key'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {createdKey ? (
              <div className="space-y-4">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Copy this key now — you will not be able to see it again.
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {createdKey.name}
                  </p>
                  <code className="mt-2 block break-all font-mono text-xs text-slate-900">
                    {createdKey.key}
                  </code>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {copied ? 'Copied' : 'Copy key'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {modalError && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {modalError}
                  </div>
                )}
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Key name
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. GitHub Actions"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {submitting ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
