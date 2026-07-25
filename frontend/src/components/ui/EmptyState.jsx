import { Link } from 'react-router-dom';
import Button from './Button';

export default function EmptyState({ title, description, actionLabel, onAction, actionHref }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
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
