/**
 * UI primitives: buttons, modal, confirm dialog, toasts, empty state,
 * progress bar, badge. All styled by `src/index.css`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { IconAlert, IconCheck, IconClose, IconInbox } from './icons';

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghost-ink' | 'ink' | 'danger' | 'danger-solid';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button type={type} className={`btn btn-${variant} ${sizeClass} ${className}`.trim()} {...props} />
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────── */

export function Badge({
  kind = 'neutral',
  children,
}: {
  kind?: 'income' | 'expense' | 'neutral' | 'warning';
  children: ReactNode;
}) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {description ? <p className="modal-desc">{description}</p> : null}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <IconClose size={16} />
          </button>
        </div>
        {children ? <div className="modal-body">{children}</div> : null}
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ── Confirm dialog ──────────────────────────────────────────────────────── */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger-solid' : 'primary'}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="modal-desc" style={{ marginTop: 0 }}>
        {message}
      </p>
    </Modal>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon ?? <IconInbox size={20} />}</div>
      <div className="empty-title">{title}</div>
      {text ? <div className="empty-text">{text}</div> : null}
      {action}
    </div>
  );
}

/* ── Progress ────────────────────────────────────────────────────────────── */

export function ProgressBar({
  percent,
  label,
  value,
  warning = false,
}: {
  percent: number;
  label?: string;
  value?: string;
  warning?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {(label || value) && (
        <div className="progress-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      )}
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`progress-fill${warning ? ' warning' : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ── Toasts ──────────────────────────────────────────────────────────────── */

interface Toast {
  id: number;
  kind: 'success' | 'error';
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: 'success' | 'error', title: string, message?: string) => {
    const id = ++toastCounter;
    setToasts((t) => [...t, { id, kind, title, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="toast-icon">
              {t.kind === 'success' ? <IconCheck size={16} /> : <IconAlert size={16} />}
            </span>
            <div>
              <div className="toast-title">{t.title}</div>
              {t.message ? <div>{t.message}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
