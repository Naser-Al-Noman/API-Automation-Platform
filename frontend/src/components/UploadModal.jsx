import { useState } from 'react';

export default function UploadModal({
  title,
  nameLabel = 'Name (optional — taken from file if empty)',
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('file'); // file | paste
  const [file, setFile] = useState(null);
  const [rawJson, setRawJson] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'file') {
        if (!file) {
          throw new Error('Choose a .json file to upload');
        }
        await onSubmit({ name: name.trim() || undefined, file });
      } else {
        if (!rawJson.trim()) {
          throw new Error('Paste JSON to continue');
        }
        const parsed = JSON.parse(rawJson);
        await onSubmit({ name: name.trim() || undefined, json: parsed });
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err instanceof SyntaxError ? 'JSON is invalid' : err.message) ||
          'Upload failed'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{nameLabel}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === 'file' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Upload file
            </button>
            <button
              type="button"
              onClick={() => setMode('paste')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === 'paste' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Paste JSON
            </button>
          </div>

          {mode === 'file' ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">JSON file</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Raw JSON</span>
              <textarea
                rows={10}
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-slate-500"
                placeholder="{ ... }"
              />
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
