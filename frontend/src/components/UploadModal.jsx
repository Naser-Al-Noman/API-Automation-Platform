import { useState } from 'react';
import { Button, Modal } from './ui';

export default function UploadModal({
  title,
  nameLabel = 'Name (optional — taken from file if empty)',
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('file');
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
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-fg-secondary">{nameLabel}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border-strong px-3 py-2 text-fg outline-none focus:border-border-strong"
          />
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'file' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('file')}
          >
            Upload file
          </Button>
          <Button
            type="button"
            variant={mode === 'paste' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('paste')}
          >
            Paste JSON
          </Button>
        </div>

        {mode === 'file' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-secondary">JSON file</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-fg-muted"
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-fg-secondary">Raw JSON</span>
            <textarea
              rows={10}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="w-full rounded-md border border-border-strong px-3 py-2 font-mono text-xs text-fg outline-none focus:border-border-strong"
              placeholder="{ ... }"
            />
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
