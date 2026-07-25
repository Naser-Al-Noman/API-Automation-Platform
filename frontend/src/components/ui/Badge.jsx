const STATUS_STYLES = {
  passed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-amber-100 text-amber-900',
  pending: 'bg-sky-100 text-sky-800',
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-900',
  info: 'bg-sky-100 text-sky-800',
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
