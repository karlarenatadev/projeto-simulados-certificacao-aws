import '@/styles/components/card.css';

/**
 * Card — superfície elevada genérica
 *
 * @param {string}   variant   - 'default' | 'interactive' | 'flat'
 * @param {string}   accent    - '' | 'default' | 'success' | 'warning' | 'danger'
 * @param {boolean}  noPadding - remove o padding interno padrão
 * @param {string}   className - classes extras
 */
export function Card({
  children,
  variant = 'default',
  accent = '',
  noPadding = false,
  className = '',
  ...props
}) {
  const classes = [
    'card',
    !noPadding && 'card-padding',
    variant === 'interactive' && 'card-interactive',
    variant === 'flat' && 'card-flat',
    accent === 'default' && 'card-accent',
    accent === 'success' && 'card-accent-success',
    accent === 'warning' && 'card-accent-warning',
    accent === 'danger' && 'card-accent-danger',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * FeatureCard — card de navegação para o Dashboard
 *
 * @param {string}   title       - título do card
 * @param {string}   description - descrição breve
 * @param {ReactNode} icon       - ícone (react-icons ou emoji)
 * @param {string}   iconVariant - '' | 'accent' | 'success' | 'warning'
 * @param {function} onClick     - handler de clique
 * @param {string}   href        - URL (usa <a> em vez de <div>)
 */
export function FeatureCard({
  title,
  description,
  icon,
  iconVariant = '',
  onClick,
  href,
  className = '',
  ...props
}) {
  const Tag = href ? 'a' : 'div';
  const iconClasses = [
    'feature-card__icon',
    iconVariant && `feature-card__icon--${iconVariant}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      className={`feature-card ${className}`}
      onClick={onClick}
      href={href}
      role={!href && onClick ? 'button' : undefined}
      tabIndex={!href && onClick ? 0 : undefined}
      onKeyDown={
        !href && onClick
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e)
          : undefined
      }
      {...props}
    >
      {icon && <span className={iconClasses}>{icon}</span>}

      <div>
        <h3 className="feature-card__title">{title}</h3>
        {description && (
          <p className="feature-card__description">{description}</p>
        )}
      </div>

      <span className="feature-card__arrow" aria-hidden="true">→</span>
    </Tag>
  );
}
