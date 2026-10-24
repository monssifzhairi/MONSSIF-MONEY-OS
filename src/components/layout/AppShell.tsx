import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  IconDashboard,
  IconTransactions,
  IconTarget,
  IconReports,
  IconSettings,
  IconLogOut,
  IconShield,
  IconUser,
  IconAlert,
} from '../ui/icons';
import { Wordmark } from '../ui/Brand';

type Props = {
  children: ReactNode;
  title: string;
  dateLabel?: string;
  actions?: ReactNode;
};

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: IconTransactions, end: false },
  { to: '/goals', label: 'Goals', icon: IconTarget, end: false },
  { to: '/reports', label: 'Reports', icon: IconReports, end: false },
  { to: '/settings', label: 'Settings', icon: IconSettings, end: false },
] as const;

export function ModeChip({ variant, label }: { variant: 'local' | 'cloud'; label: string }) {
  return (
    <span className={`mode-chip${variant === 'cloud' ? ' live' : ''}`}>
      <span className="mode-dot" />
      {label}
    </span>
  );
}

function initialsFor(email: string) {
  return (email.slice(0, 2) || '··').toUpperCase();
}

export function AccountMenu() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const email = auth.user?.email ?? '';
  const isDemo = auth.status === 'local-demo';

  return (
    <div className="menu-anchor">
      <button
        type="button"
        className="account-btn"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`avatar${isDemo ? ' demo' : ''}`}>{isDemo ? 'LD' : initialsFor(email)}</span>
        <span className="account-btn-label">{isDemo ? 'Local demo' : email}</span>
        <svg className="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="menu-panel">
          <div className="menu-header">
            <div className="menu-email">{isDemo ? 'Local demo mode' : email}</div>
            <div className="text-xs text-dim" style={{ marginTop: 4 }}>
              {isDemo ? 'Data lives in this browser only.' : 'Cloud account · Supabase'}
            </div>
          </div>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          >
            <IconSettings size={15} /> Settings
          </button>
          <div className="menu-divider" />
          {!isDemo && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setOpen(false);
                navigate('/auth/update-password');
              }}
            >
              <IconUser size={15} /> Change your password
            </button>
          )}
          {isDemo ? (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
            >
              <IconAlert size={15} /> About local demo mode
            </button>
          ) : (
            <button
              type="button"
              className="menu-item danger"
              onClick={() => {
                setOpen(false);
                void auth.signOut();
              }}
            >
              <IconLogOut size={15} /> Sign out
            </button>
          )}
          <div className="menu-divider" />
          <div className="menu-item" style={{ cursor: 'default', fontSize: 11.5, color: 'var(--text-dim)' }}>
            <IconShield size={14} /> Protected by Supabase Auth + RLS
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, title, dateLabel, actions }: Props) {
  return (
    <div className="shell">
      <header className="topnav">
        <div className="topnav-inner">
          <NavLink to="/" aria-label="MONSSIF MONEY OS — home" style={{ display: 'inline-flex' }}>
            <WordmarkInline />
          </NavLink>
          <nav className="topnav-links" aria-label="Primary">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="topnav-spacer" />
          <AccountMenu />
        </div>
      </header>

      <div className="mobile-topbar">
        <NavLink to="/" aria-label="MONSSIF MONEY OS — home" style={{ display: 'inline-flex' }}>
          <WordmarkInline />
        </NavLink>
        <AccountMenu />
      </div>

      <main className="shell-content">
        <div className="page-head">
          <div>
            <h1 className="page-title">{title}</h1>
            {dateLabel && <div className="page-date">{dateLabel}</div>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Primary mobile">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function WordmarkInline() {
  return <Wordmark />;
}
