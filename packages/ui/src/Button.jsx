import React from 'react';

/**
 * Button — shared primitive component.
 *
 * Props:
 *   variant  'primary' | 'ghost' | 'danger'  (default: 'primary')
 *   size     'sm' | 'md' | 'lg'              (default: 'md')
 *   disabled boolean
 *   onClick  function
 *   children ReactNode
 *   className string  (extra Tailwind classes)
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500',
    ghost:
      'bg-transparent text-gray-300 border border-gray-600 hover:bg-gray-700 focus:ring-gray-500',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  const classes = [base, variants[variant] ?? variants.primary, sizes[size] ?? sizes.md, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
