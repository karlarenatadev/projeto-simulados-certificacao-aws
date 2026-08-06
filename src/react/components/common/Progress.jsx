import '@/styles/components/badge-progress-empty.css';

/**
 * Progress — barra de progresso semântica
 *
 * @param {number} value   - valor atual (0–100)
 * @param {string} label   - texto à esquerda do header
 * @param {string} variant - 'default' | 'success' | 'warning' | 'danger' | 'accent'
 * @param {string} size    - 'sm' | 'md' (default) | 'lg'
 * @param {boolean} showValue - exibe o valor percentual
 */
export function Progress({
  value = 0,
  label,
  variant = 'default',
  size = 'md',
  showValue = true,
  className = '',
  ...props
}) {
  const clamped = Math.min(100, Math.max(0, value));

  const fillClass = [
    'progress-fill',
    variant !== 'default' && `progress-fill--${variant}`,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClass = [
    'progress',
    size !== 'md' && `progress-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClass} {...props}>
      {(label || showValue) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showValue && (
            <span className="progress-value">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={fillClass} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
