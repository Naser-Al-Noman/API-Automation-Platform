const VARIANTS = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60',
  danger:
    'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60',
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
