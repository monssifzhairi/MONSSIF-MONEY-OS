/**
 * Application shell: desktop sidebar, topbar with account menu, mobile header
 * and bottom navigation. The account menu reflects the true mode at all times
 * (signed-in Supabase user vs. explicitly labeled local demo).
 */

import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  IconDashboard,
  IconGoal,
  IconKey,
  IconLogOut,
  IconReports,
  IconSettings,
  IconTransactions,
} from '../ui/icons';
import { Menu } from '../ui/controls';
import { Badge, useToast } from '../ui';

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
        <div className="brand-word">MONSSIF MONEY OS</div>
        <div className="brand-sub">Personal finance</div>
      </div>
    </div>
  );
}

function ModePill() {
  const { status, user } = useAuth();
  const live = status === 'authenticated';
  return (
    <div
      className="mode-pill"
      title={
        live
          ? 'Signed in with Supabase. Your data is stored in your project and protected by Row Level Security.'
          : 'Local Demo Mode — data stays in this browser. No account, no sync.'
      }
    >
      <span className={`mode-dot${live ? ' live' : ''}`} />
      {live ? (
        <span>
          Supabase cloud
          <br />
          <span className="text-dim">{user?.email || 'signed in'}</span>
        </span>
      ) : (
        <span>
          <strong className="text-muted">Local demo</strong>
          <br />
          <span className="text-dim">browser-only · no sync</span>
        </span>
      )}
    </div>
  );
}

function AccountMenu() {
  const { status, user, signOut, exitLocalDemo } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const live = status === 'authenticated';
  const email = user?.email ?? 'Local demo';
  const initials = live && email ? email.slice(0, 2).toUpperCase() : 'MD';

  return (
    <Menu
      label="Account menu"
      trigger={
        <>
          <span className={`avatar${live ? '' : ' demo'}`} aria-hidden="true">
            {initials}
          </span>
          <span className="account-btn-label">{live ? email : 'Local demo'}</span>
        </>
      }
    >
      {(close) => (
        <>
          <div className="menu-header">
            <div className="menu-email">{live ? email : 'Local Demo Mode'}</div>
            <div style={{ marginTop: 6 }}>
              {live ? (
                <Badge kind="income">Supabase · authenticated</Badge>
              ) : (
                <Badge kind="warning">No account · no sync</Badge>
              )}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              close();
              navigate('/settings');
            }}
          >
            <IconSettings size={15} /> Settings
          </button>

          {live ? (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                close();
                navigate('/auth/update-password');
              }}
            >
              <IconKey size={15} /> Change password
            </button>
          ) : null}

          <div className="menu-divider" />

          {live ? (
            <button
              type="button"
              role="menuitem"
              className="menu-item danger"
              onClick={async () => {
                close();
                try {
                  await signOut();
                  toast.success('Signed out', 'Your session ended on this device.');
                  navigate('/auth/login', { replace: true });
                } catch (err) {
                  toast.error('Could not sign out', (err as Error).message);
                }
              }}
            >
              <IconLogOut size={15} /> Sign out
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="menu-item danger"
              onClick={() => {
                close();
                exitLocalDemo();
                toast.success('Left Local Demo Mode', 'Connect Supabase for real accounts.');
                navigate('/', { replace: true });
              }}
            >
              <IconLogOut size={15} /> Exit local demo
            </button>
          )}
        </>
      )}
    </Menu>
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
          <ModePill />
        </div>
      </aside>

      <div className="shell-main">
        <div className="shell-topbar">
          <AccountMenu />
        </div>

        <header className="mobile-header">
          <div className="sidebar-brand" style={{ padding: 0 }}>
            <div className="brand-mark">M</div>
            <div>
              <div className="brand-word">MONSSIF MONEY OS</div>
            </div>
          </div>
          <AccountMenu />
        </header>

        <main className="shell-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-inner">
          {NAV.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`bottom-nav-item${active ? ' active' : ''}`}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Keeps a11y landmark consistent for screen readers */}
      <h1 className="visually-hidden">MONSSIF MONEY OS — {current.label}</h1>
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
        <h2 className="page-title display">{title}</h2>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
