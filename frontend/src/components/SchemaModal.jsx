import { useState } from 'react';

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["args", "headers", "url"],
  "properties": {
    "args": { "type": "object" },
    "headers": { "type": "object" },
    "url": { "type": "string" }
  },
  "additionalProperties": true
}`;

export default function SchemaModal({
  endpoint,
  existingSchema,
  onClose,
  onSave,
}) {
  const [text, setText] = useState(
    existingSchema
      ? JSON.stringify(existingSchema.schema_json, null, 2)
      : EXAMPLE_SCHEMA
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('JSON is not well-formed — fix syntax before saving');
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON Schema must be an object');
      }

      await onSave(parsed);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save schema');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {existingSchema ? 'Edit Schema' : 'Define Schema'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Endpoint: <span className="font-medium text-slate-900">{endpoint}</span>
            </p>
          </div>
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
            <span className="mb-1 block text-sm font-medium text-slate-700">
              JSON Schema
            </span>
            <textarea
              rows={16}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-slate-500"
              placeholder={EXAMPLE_SCHEMA}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Paste a draft-07 / modern JSON Schema object. It will be compiled with Ajv on save.
            </span>
          </label>

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
              {submitting ? 'Saving…' : 'Save Schema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
