/** Email + password sign-in (Supabase Auth). */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, humanizeAuthError } from '../../auth/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button, useToast } from '../../components/ui';
import { PasswordField } from '../../components/ui/controls';
import { IconArrowRight, IconShield } from '../../components/ui/icons';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await signIn(email.trim(), password);
      toast.success('Welcome back');
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(humanizeAuthError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to reach your balance, transactions and goals."
      footer={
        <>
          <div className="auth-secure-note">
            <IconShield size={13} />
            Your session stays active on this device and is managed securely by Supabase Auth —
            passwords are never stored by this app.
          </div>
        </>
      }
    >
      {formError ? (
        <div className="error-banner" role="alert">
          {formError}
        </div>
      ) : null}

      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={`input${errors.email ? ' invalid' : ''}`}
            placeholder="you@example.com"
            value={email}
            aria-invalid={errors.email ? true : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email ? <span className="field-error">{errors.email}</span> : null}
        </div>

        <PasswordField
          label="Password"
          id="login-password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="auth-link-row">
          <span />
          <Link to="/auth/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner spinner-sm" /> Signing in…
            </>
          ) : (
            <>
              Sign in <IconArrowRight size={15} />
            </>
          )}
        </Button>
      </form>

      <div className="auth-link-row" style={{ marginTop: 22 }}>
        <span className="text-dim">New to MONSSIF MONEY OS?</span>
        <Link to="/auth/register" className="auth-link">
          Create an account
        </Link>
      </div>
    </AuthShell>
  );
}
