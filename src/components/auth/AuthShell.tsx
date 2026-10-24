/** Shared editorial shell for all authentication pages. */

import type { ReactNode } from 'react';
import { AuthVisual } from './AuthVisual';
import { Wordmark } from '../ui/Brand';
import { IconShield } from '../ui/icons';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-layout">
      <AuthVisual />
      <div className="auth-form-side">
        <div className="auth-mobile-bar">
          <Wordmark />
        </div>
        <div className="auth-form-wrap">
          <h1 className="auth-form-title">{title}</h1>
          <p className="auth-form-sub">{subtitle}</p>
          <div className="auth-form">{children}</div>
          {footer ? <div className="auth-foot">{footer}</div> : null}
          <div className="auth-secure-note" style={{ marginTop: 18 }}>
            <IconShield size={14} />
            Secured by Supabase Auth · your data stays private
          </div>
        </div>
      </div>
    </div>
  );
}
