/**
 * Email + password auth screen — rendered ONLY in Supabase mode when no
 * session exists. Local mode never shows this (no account needed).
 */

import { useState } from 'react';
import { useFinance } from '../data/store';
import { Button, useToast } from './ui';

export function SupabaseSignIn() {
  const { signIn, signUp, error } = useFinance();
  const toast = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.includes('@') || password.length < 8) {
      setLocalError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setLocalError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success('Welcome back');
      } else {
        await signUp(email, password);
        toast.success('Account created', 'If email confirmation is enabled, check your inbox.');
      }
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="sidebar-brand" style={{ padding: 0, marginBottom: 22 }}>
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MONSSIF MONEY OS</div>
            <div className="brand-sub">Supabase mode</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, marginBottom: 8 }}>
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
          Your records are stored in your Supabase project and protected by Row Level Security —
          only your account can read them.
        </p>

        {error ? (
          <div className="error-banner" style={{ marginTop: 16 }}>
            {error}
          </div>
        ) : null}

        <div className="stack" style={{ gap: 12, marginTop: 18 }}>
          <div className="field">
            <label className="field-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
          {localError ? <span className="field-error">{localError}</span> : null}

          <Button variant="primary" size="lg" onClick={submit} disabled={busy}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <button
            className="btn btn-ghost"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin'
              ? 'No account yet? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
