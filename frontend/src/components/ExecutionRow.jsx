import { Link } from 'react-router-dom';
import { Badge, Button } from './ui';
import { formatDate } from '../utils/postmanUi';

export function durationLabel(startedAt, finishedAt, status) {
  if (!startedAt) return '—';
  if (!finishedAt) return status === 'running' ? 'In progress' : '—';
  const ms = new Date(finishedAt) - new Date(startedAt);
  if (Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Compact row for Dashboard recent list */
export function ExecutionRowCompact({ execution }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
      <Badge status={execution.status}>{execution.status}</Badge>
      <span className="font-medium text-fg">{execution.collection_name}</span>
      <span className="text-fg-muted">{formatDate(execution.started_at)}</span>
      <Link
        to={`/executions/${execution.id}`}
        className="ml-auto font-medium text-fg-secondary underline-offset-2 hover:underline"
      >
        View
      </Link>
    </li>
  );
}

/** Table row for Execution History */
export default function ExecutionRow({ execution, onDelete, deleting }) {
  return (
    <tr className="hover:bg-surface-2">
      <td className="px-4 py-3 font-medium text-fg">{execution.collection_name}</td>
      <td className="px-4 py-3 text-fg-muted">{execution.environment_name || '—'}</td>
      <td className="px-4 py-3">
        <Badge status={execution.status}>{execution.status}</Badge>
      </td>
      <td className="px-4 py-3 text-fg-muted">{formatDate(execution.started_at)}</td>
      <td className="px-4 py-3 text-fg-muted">
        {durationLabel(execution.started_at, execution.finished_at, execution.status)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/executions/${execution.id}`}
            className="font-medium text-fg underline-offset-2 hover:underline"
          >
            View
          </Link>
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={() => onDelete(execution)}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
