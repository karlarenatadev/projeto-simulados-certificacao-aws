import '@/styles/components/button.css';

/**
 * Button — componente de botão reutilizável
 *
 * @param {string}   variant   - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string}   size      - 'sm' | 'md' | 'lg'
 * @param {boolean}  loading   - exibe spinner e desabilita o botão
 * @param {boolean}  iconOnly  - padding quadrado para botões só com ícone
 * @param {string}   as        - elemento HTML ('button' | 'a' | 'link')
 * @param {string}   className - classes extras
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  iconOnly = false,
  disabled = false,
  as: Tag = 'button',
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    iconOnly && 'btn-icon-only',
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} disabled={disabled || loading} {...props}>
      {loading && <LoadingSpinner />}
      {children}
    </Tag>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
