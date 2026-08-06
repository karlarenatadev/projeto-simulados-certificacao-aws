import '@/styles/components/badge-progress-empty.css';

/**
 * EmptyState — estado vazio para listas e seções sem dados
 *
 * @param {ReactNode} icon        - ícone ou emoji (padrão: ☁️)
 * @param {string}    title       - título principal
 * @param {string}    description - texto explicativo
 * @param {ReactNode} action      - botão ou link de ação
 */
export function EmptyState({
  icon = '☁️',
  title = 'Nenhum dado encontrado',
  description,
  action,
  className = '',
  ...props
}) {
  return (
    <div className={`empty-state ${className}`} {...props}>
      {icon && (
        <span className="empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <div className="empty-state__action">{action}</div>
      )}
    </div>
  );
}
