import { createContext, useCallback, useContext, useReducer } from 'react';
import {
  FaCircleCheck,
  FaCircleXmark,
  FaTriangleExclamation,
  FaCircleInfo,
  FaXmark,
} from 'react-icons/fa6';
import '@/styles/components/toast-modal.css';

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload];
    case 'REMOVE':
      return state.filter((t) => t.id !== action.payload);
    default:
      return state;
  }
}

/**
 * ToastProvider — envolve o app e disponibiliza useToast()
 */
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const show = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD', payload: { id, type, title, message } });

    if (duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', payload: id }), duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id) => {
    dispatch({ type: 'REMOVE', payload: id });
  }, []);

  // Atalhos convenientes
  const toast = {
    show,
    dismiss,
    success: (title, message, opts) => show({ type: 'success', title, message, ...opts }),
    error: (title, message, opts) => show({ type: 'error', title, message, ...opts }),
    warning: (title, message, opts) => show({ type: 'warning', title, message, ...opts }),
    info: (title, message, opts) => show({ type: 'info', title, message, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * useToast — hook para disparar toasts em qualquer componente
 *
 * @example
 *   const toast = useToast();
 *   toast.success('Salvo!', 'Suas preferências foram atualizadas.');
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Componentes de apresentação ────────────────────────────────────────────

const ICONS = {
  success: FaCircleCheck,
  error: FaCircleXmark,
  warning: FaTriangleExclamation,
  info: FaCircleInfo,
};

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notificações"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] ?? FaCircleInfo;

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="toast__icon" aria-hidden="true" />
      <div className="toast__body">
        {toast.title && <p className="toast__title">{toast.title}</p>}
        {toast.message && <p className="toast__message">{toast.message}</p>}
      </div>
      <button
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
      >
        <FaXmark aria-hidden="true" />
      </button>
    </div>
  );
}
