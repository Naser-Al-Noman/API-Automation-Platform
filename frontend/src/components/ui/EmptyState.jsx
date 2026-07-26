import { Link } from 'react-router-dom';
import Button from './Button';

export default function EmptyState({ title, description, actionLabel, onAction, actionHref }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
      <p className="font-medium text-fg-secondary">{title}</p>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link to={actionHref} className="mt-4 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
