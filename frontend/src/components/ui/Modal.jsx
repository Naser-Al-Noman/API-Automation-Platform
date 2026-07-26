export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4">
      <div
        className={`w-full rounded-xl border border-border bg-surface p-6 shadow-lg ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? (
            <h2 className="text-lg font-semibold text-fg">{title}</h2>
          ) : (
            <div />
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-sm text-fg-muted hover:bg-surface-2"
            >
              Close
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
