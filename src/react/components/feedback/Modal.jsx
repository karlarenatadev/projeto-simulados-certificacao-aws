import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';
import '@/styles/components/toast-modal.css';

/**
 * Modal — diálogo bloqueante com portal
 *
 * @param {boolean}  isOpen      - controla visibilidade
 * @param {function} onClose     - callback para fechar
 * @param {string}   title       - título do modal
 * @param {string}   size        - 'sm' | 'md' (default) | 'lg' | 'xl' | 'full'
 * @param {boolean}  closeOnBackdrop - fechar ao clicar no backdrop (default: true)
 * @param {ReactNode} footer     - conteúdo do rodapé (botões de ação)
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnBackdrop = true,
  footer,
  children,
  className = '',
}) {
  // Fecha com Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalClasses = [
    'modal',
    size !== 'md' && `modal--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Impede propagação do clique para o backdrop ao clicar no modal */}
      <div
        className={modalClasses}
        onClick={(e) => e.stopPropagation()}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal__header">
          {title && (
            <h2 id="modal-title" className="modal__title">
              {title}
            </h2>
          )}
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <FaXmark aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">{children}</div>

        {/* Footer opcional */}
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
