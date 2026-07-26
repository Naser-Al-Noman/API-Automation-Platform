const STATUS_STYLES = {
  passed: 'bg-badge-passed-bg text-badge-passed-fg',
  failed: 'bg-badge-failed-bg text-badge-failed-fg',
  running: 'bg-badge-running-bg text-badge-running-fg',
  pending: 'bg-badge-pending-bg text-badge-pending-fg',
  default: 'bg-badge-default-bg text-badge-default-fg',
  success: 'bg-badge-passed-bg text-badge-passed-fg',
  danger: 'bg-badge-failed-bg text-badge-failed-fg',
  warning: 'bg-badge-running-bg text-badge-running-fg',
  info: 'bg-badge-pending-bg text-badge-pending-fg',
};

export default function Badge({ children, status, variant, className = '' }) {
  const key = (status || variant || 'default').toLowerCase();
  const styles = STATUS_STYLES[key] || STATUS_STYLES.default;

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
