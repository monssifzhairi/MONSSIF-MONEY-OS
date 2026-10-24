/**
 * App root: providers, protected routing, auth gates.
 *
 * Route policy
 *  - `/auth/*` (login, register, forgot-password): anonymous users only —
 *    authenticated users are redirected away to the dashboard.
 *  - `/auth/update-password`: authenticated users only (recovery links and
 *    the account menu's change-password flow).
 *  - Everything else: protected. Unauthenticated visitors are redirected to
 *    the login page; when Supabase is not configured, they see the setup
 *    screen instead of any fake authentication.
 */

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { getSupabaseConfigIssue } from './data/repository';
import { FinanceProvider, useFinance } from './data/store';
import { ToastProvider } from './components/ui';
import { DashboardSkeleton } from './components/ui/controls';
import { Wordmark } from './components/ui/Brand';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Setup } from './pages/Setup';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { UpdatePassword } from './pages/auth/UpdatePassword';

/**
 * Hard stop when Supabase env vars are partially or dangerously configured.
 * Never falls back to demo mode on a misconfigured deployment, and never
 * boots with a service-role key in the bundle.
 */
function ConfigErrorScreen({ issue }: { issue: string }) {
  return (
    <div className="center-screen" role="alert" style={{ padding: 24 }}>
      <Wordmark />
      <div className="panel" style={{ maxWidth: 560, textAlign: 'left' }}>
        <div className="badge badge-expense" style={{ marginBottom: 12 }}>
          Configuration error
        </div>
        <h1 className="auth-form-title" style={{ fontSize: 24, marginBottom: 10 }}>
          Cloud mode is misconfigured
        </h1>
        <p className="text-sm text-muted" style={{ lineHeight: 1.75, marginBottom: 14 }}>
          {issue}
        </p>
        <p className="text-sm text-dim" style={{ lineHeight: 1.75 }}>
          Fix the environment variables in your hosting provider (or local{' '}
          <span className="mono">.env</span>) and reload. This screen will never pretend
          authentication works, and no data is stored while it is shown.
        </p>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="center-screen" role="status" aria-label="Loading">
      <Wordmark />
      <div className="spinner" />
      <span className="text-dim text-sm">Starting MONSSIF MONEY OS…</span>
    </div>
  );
}

/** Blocks pages that require an authenticated (or local-demo) session. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { status, pendingPasswordRecovery } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash />;
  if (status === 'unconfigured') return <Welcome />;
  if (status === 'anonymous') return <Navigate to="/auth/login" replace />;

  // A recovery link was opened — force the "choose new password" screen.
  if (pendingPasswordRecovery && location.pathname !== '/auth/update-password') {
    return <Navigate to="/auth/update-password" replace />;
  }
  return <>{children}</>;
}

/** Login / register / forgot-password: only for signed-out users. */
function AnonymousOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'unconfigured') return <Welcome />;
  if (status === 'authenticated' || status === 'local-demo') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProtectedApp() {
  const { ready, data, error } = useFinance();

  // First-run: one-time starting-balance setup (full-page, focused).
  if (ready && !data.settings.setupComplete) {
    return <Setup />;
  }

  return (
    <>
      {error ? (
        <div className="error-banner" role="alert" style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 300, maxWidth: 'min(520px, calc(100vw - 24px))', boxShadow: 'var(--shadow-lift)' }}>
          {error}
        </div>
      ) : null}
      {!ready ? (
        <div className="shell">
          <div className="shell-content">
            <DashboardSkeleton />
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}

/**
 * Vite's BASE_URL is `/` at a domain root or `/repo-name/` on a sub-path host
 * (e.g. GitHub Pages project sites). React Router wants it without the
 * trailing slash so both deployments share one code path.
 */
const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

export default function App() {
  // Re-evaluated on every render so the gate reflects the actual runtime env.
  const configIssue = getSupabaseConfigIssue();
  if (configIssue) return <ConfigErrorScreen issue={configIssue} />;
  return (
    <AuthProvider>
      <FinanceProvider>
        <ToastProvider>
          <BrowserRouter basename={routerBasename}>
            <Routes>
              <Route
                path="/auth/login"
                element={
                  <AnonymousOnly>
                    <Login />
                  </AnonymousOnly>
                }
              />
              <Route
                path="/auth/register"
                element={
                  <AnonymousOnly>
                    <Register />
                  </AnonymousOnly>
                }
              />
              <Route
                path="/auth/forgot-password"
                element={
                  <AnonymousOnly>
                    <ForgotPassword />
                  </AnonymousOnly>
                }
              />
              <Route
                path="/auth/update-password"
                element={
                  <RequireAuth>
                    <UpdatePassword />
                  </RequireAuth>
                }
              />
              <Route
                path="/*"
                element={
                  <RequireAuth>
                    <ProtectedApp />
                  </RequireAuth>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </FinanceProvider>
    </AuthProvider>
  );
}
