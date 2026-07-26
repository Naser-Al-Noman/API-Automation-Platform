export default function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-sm ${
        padding ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
