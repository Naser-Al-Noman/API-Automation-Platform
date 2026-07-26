export default function LoadingSpinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center gap-3 text-fg-muted ${className}`}>
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-spinner-track border-t-spinner-head"
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
