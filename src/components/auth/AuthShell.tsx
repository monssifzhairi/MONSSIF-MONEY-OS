/** Shared split-screen shell for all authentication pages. */

import type { ReactNode } from 'react';
import { AuthVisual } from './AuthVisual';

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
    <div className="auth-split">
      <AuthVisual />
      <div className="auth-form-side">
        <div className="auth-mobile-bar">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-word">MONSSIF MONEY OS</div>
            <div className="brand-sub">Private finance · MAD</div>
          </div>
        </div>
        <div className="auth-form-wrap">
          <h1 className="auth-form-title">{title}</h1>
          <p className="auth-form-sub">{subtitle}</p>
          <div className="auth-form">{children}</div>
          {footer ? <div className="auth-foot">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
