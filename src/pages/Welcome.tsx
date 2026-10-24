/**
 * Setup screen shown when Supabase is NOT configured.
 *
 * The app never pretends authentication works here. Two clear paths:
 *  1. Connect Supabase (documented steps) → real accounts and cloud sync.
 *  2. Continue in Local Demo Mode — explicitly labeled, browser-only,
 *     no account, no sync, kept separate from cloud mode at all times.
 */

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AuthVisual } from '../components/auth/AuthVisual';
import { Wordmark } from '../components/ui/Brand';
import { Button, useToast } from '../components/ui';
import { IconArrowRight, IconLock, IconShield } from '../components/ui/icons';

export function Welcome() {
  const { enterLocalDemo } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <div className="welcome-layout">
      <AuthVisual />

      <div className="welcome-main">
        <div className="welcome-card">
          <div className="auth-mobile-bar" style={{ display: undefined, padding: '0 0 22px' }}>
            <Wordmark />
          </div>

          <div className="badge badge-warning" style={{ marginBottom: 14 }}>
            <IconLock size={11} /> Cloud mode not configured
          </div>

          <h1 className="welcome-title">Connect Supabase to enable real accounts</h1>
          <p className="welcome-sub">
            Authentication and cloud storage run on your own free Supabase project. Until then,
            this app has <strong className="text-muted">no login</strong> and stores nothing in
            the cloud — it will never pretend otherwise.
          </p>

          <div className="welcome-steps">
            <div className="step-item">
              <span className="step-num">1</span>
              <span className="step-text">
                Create a free project at <strong>supabase.com</strong>, then run{' '}
                <strong>supabase/migrations/0001_init.sql</strong> in its SQL editor (tables +
                Row Level Security).
              </span>
            </div>
            <div className="step-item">
              <span className="step-num">2</span>
              <span className="step-text">
                Copy <strong>.env.example</strong> to <strong>.env</strong> and set{' '}
                <strong>VITE_SUPABASE_URL</strong> + <strong>VITE_SUPABASE_ANON_KEY</strong> —
                the public key only, never the service-role key.
              </span>
            </div>
            <div className="step-item">
              <span className="step-num">3</span>
              <span className="step-text">
                Restart the app. You'll get real <strong>sign-up, sign-in and password
                reset</strong>, with each user locked to their own data.
              </span>
            </div>
          </div>

          <div className="welcome-actions">
            <a
              className="btn btn-primary btn-lg btn-block"
              href="https://github.com/monssifzhairi/MONSSIF-MONEY-OS#supabase-setup"
              target="_blank"
              rel="noreferrer"
            >
              <IconArrowRight size={15} /> Open the Supabase setup guide
            </a>

            <div className="welcome-sep">or</div>

            <Button
              variant="secondary"
              size="lg"
              className="btn-block"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                enterLocalDemo();
                toast.success(
                  'Local Demo Mode',
                  'Browser-only storage. No account, no sync — clearly separated from cloud mode.',
                );
              }}
            >
              {busy ? (
                <>
                  <span className="spinner spinner-sm" /> Opening…
                </>
              ) : (
                <>
                  Continue in Local Demo Mode
                </>
              )}
            </Button>
            <p className="text-xs text-dim" style={{ lineHeight: 1.7, textAlign: 'center' }}>
              Demo mode keeps data in this browser only (<span className="mono">localStorage</span>
              ). Nothing is uploaded, nothing is synced, and no account exists. Ideal for
              exploring the app before connecting Supabase.
            </p>
          </div>

          <div className="auth-foot" style={{ marginTop: 26 }}>
            <div className="auth-secure-note">
              <IconShield size={13} />
              No secrets in this bundle · no service-role keys · no shared demo accounts with
              financial data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
