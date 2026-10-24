/**
 * Extra UI controls: password field with show/hide, dropdown menu,
 * and loading skeletons.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { IconChevronDown, IconEye, IconEyeOff } from './icons';

/* ── Password field ──────────────────────────────────────────────────────── */

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  optionalLabel?: string;
}

export function PasswordField({
  label,
  error,
  hint,
  optionalLabel,
  id,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? `pw-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        <span>
          {label}
          {optionalLabel ? (
            <span className="text-dim text-xs" style={{ marginLeft: 6, fontWeight: 450 }}>
              {optionalLabel}
            </span>
          ) : null}
        </span>
      </label>
      <div className="input-group">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`input has-password-toggle${error ? ' invalid' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          tabIndex={0}
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </div>
      {error ? (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

/* ── Dropdown menu (account menu) ────────────────────────────────────────── */

export function Menu({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'left' | 'right';
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu-anchor" ref={anchorRef}>
      <button
        type="button"
        className="account-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        <IconChevronDown size={13} className="caret" />
      </button>
      {open ? (
        <div
          className="menu-panel"
          role="menu"
          aria-label={label}
          style={align === 'left' ? { right: 'auto', left: 0 } : undefined}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  );
}

/* ── Skeletons ───────────────────────────────────────────────────────────── */

export function Skeleton({
  width,
  height = 12,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-label="Loading dashboard" role="status">
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <Skeleton width={120} height={11} />
          <Skeleton width={260} height={34} />
        </div>
        <Skeleton width={170} height={38} radius={19} />
      </div>
      <div className="hero-card" style={{ marginBottom: 18, borderRadius: 28 }}>
        <div className="hero-grid">
          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <Skeleton width={130} height={10} />
            <Skeleton width={300} height={56} />
            <Skeleton width={210} height={12} />
            <div className="stat-grid" style={{ marginTop: 14 }}>
              <Skeleton height={58} radius={12} />
              <Skeleton height={58} radius={12} />
              <Skeleton height={58} radius={12} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'stretch' }}>
            <Skeleton width={150} height={10} />
            <Skeleton height={170} radius={14} />
          </div>
        </div>
      </div>
      <Skeleton height={190} radius={20} style={{ marginBottom: 18 }} />
      <div className="grid-2">
        <Skeleton height={330} radius={20} />
        <Skeleton height={330} radius={20} />
      </div>
    </div>
  );
}

export type { ButtonHTMLAttributes };
