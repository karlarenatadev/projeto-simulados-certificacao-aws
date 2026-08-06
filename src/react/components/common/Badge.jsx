import '@/styles/components/badge-progress-empty.css';

/**
 * Badge — etiqueta de status, certificação ou destaque
 *
 * @param {string} variant - 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
 * @param {string} size    - 'sm' | 'md' (default) — 'cert' para badge de certificação
 */
export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const classes = [
    'badge',
    `badge-${variant}`,
    size === 'cert' && 'badge-cert',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
