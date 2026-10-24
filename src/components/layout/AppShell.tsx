/** Application shell: desktop sidebar, mobile header + bottom navigation. */

import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useFinance } from '../../data/store';
import {
  IconDashboard,
  IconGoal,
  IconReports,
  IconSettings,
  IconTransactions,
  IconWallet,
} from '../ui/icons';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: IconTransactions, end: false },
  { to: '/goals', label: 'Goals', icon: IconGoal, end: false },
  { to: '/reports', label: 'Reports', icon: IconReports, end: false },
  { to: '/settings', label: 'Settings', icon: IconSettings, end: false },
] as const;

function Brand() {
  return (
    <div className="sidebar-brand">
      <div className="brand-mark">M</div>
      <div>
        <div className="brand-name">MONSSIF MONEY OS</div>
        <div className="brand-sub">Personal finance</div>
      </div>
    </div>
  );
}

function ModeBadge() {
  const { mode } = useFinance();
  const isLocal = mode === 'local';
  return (
    <div className="mode-badge" title={isLocal ? 'Data is stored in this browser only.' : 'Connected to Supabase.'}>
      <span className={`mode-dot${isLocal ? '' : ' live'}`} />
      {isLocal ? 'Local mode · browser storage' : 'Supabase connected'}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="nav-list" aria-label="Main navigation">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const current =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))) ??
    NAV[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <div>
          <div className="nav-section-label">Menu</div>
          <NavItems />
        </div>
        <div className="sidebar-foot">
          <ModeBadge />
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-header">
          <div className="sidebar-brand" style={{ padding: 0 }}>
            <div className="brand-mark">M</div>
            <div>
              <div className="brand-name">MONSSIF MONEY OS</div>
            </div>
          </div>
          <ModeBadge />
        </header>

        <main className="shell-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-inner">
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to} end={end} className={`bottom-nav-item${active ? ' active' : ''}`}>
                <Icon size={19} />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Keeps a11y landmark consistent for screen readers */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        MONSSIF MONEY OS — {current.label}
      </h1>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export { IconWallet };
