const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:opacity-90 disabled:opacity-60',
  secondary:
    'border border-border-strong bg-surface text-fg-secondary hover:bg-surface-2 disabled:opacity-60',
  danger:
    'border border-danger bg-surface text-danger hover:bg-danger-soft disabled:opacity-60',
};

const SIZES = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
