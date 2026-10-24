/** Password reset request — sends a recovery email via Supabase Auth. */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, humanizeAuthError } from '../../auth/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button } from '../../components/ui';
import { IconArrowRight, IconCheck, IconMail } from '../../components/ui/icons';

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(humanizeAuthError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="If an account exists for this email, a recovery link is on its way."
      >
        <div className="notice-banner" role="status">
          <IconMail size={18} className="text-accent" />
          <div>
            Open the link we sent to <strong>{email}</strong> to choose a new password. The link
            opens this app directly.
          </div>
        </div>
        <Link to="/auth/login">
          <Button variant="secondary" size="lg" className="btn-block">
            <IconArrowRight size={15} /> Back to sign in
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email tied to your account and we'll send a secure recovery link."
    >
      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            className={`input${error ? ' invalid' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner spinner-sm" /> Sending link…
            </>
          ) : (
            <>
              <IconCheck size={15} /> Send recovery link
            </>
          )}
        </Button>
      </form>

      <div className="auth-link-row" style={{ marginTop: 22 }}>
        <span className="text-dim">Remembered it?</span>
        <Link to="/auth/login" className="auth-link">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
