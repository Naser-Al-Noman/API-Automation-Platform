import { useState } from 'react';
import { Button, Modal } from './ui';

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
    <Modal
      wide
      onClose={onClose}
      title={existingSchema ? 'Edit Schema' : 'Define Schema'}
    >
      <p className="-mt-2 mb-4 text-sm text-slate-600">
        Endpoint: <span className="font-medium text-slate-900">{endpoint}</span>
      </p>

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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Schema'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
