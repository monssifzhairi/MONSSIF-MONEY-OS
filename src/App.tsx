/** App root: providers, routing, setup gate. */

import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FinanceProvider, useFinance } from './data/store';
import { ToastProvider } from './components/ui';
import { AppShell } from './components/layout/AppShell';
import { SupabaseSignIn } from './components/SupabaseSignIn';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Setup } from './pages/Setup';

function Gate() {
  const { ready, error, data, needsAuth } = useFinance();

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Starting MONSSIF MONEY OS…</span>
      </div>
    );
  }

  if (needsAuth) {
    return <SupabaseSignIn />;
  }

  if (error && !data.settings.setupComplete) {
    return (
      <div className="center-screen">
        <div className="error-banner">
          Could not initialize storage: {error}
        </div>
      </div>
    );
  }

  if (!data.settings.setupComplete) {
    return <Setup />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <ToastProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </ToastProvider>
    </FinanceProvider>
  );
}
