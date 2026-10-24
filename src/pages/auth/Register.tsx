/** Email + password account creation (Supabase Auth). */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, humanizeAuthError } from '../../auth/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button, useToast } from '../../components/ui';
import { PasswordField } from '../../components/ui/controls';
import { IconArrowRight, IconCheck, IconMail, IconShield } from '../../components/ui/icons';

const MIN_PASSWORD = 8;

export function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD) {
      next.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const result = await signUp(email.trim(), password);
      if (result.needsEmailConfirmation) {
        setSent(true);
      } else {
        toast.success('Account created', 'Welcome to MONSSIF MONEY OS.');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setFormError(humanizeAuthError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle="Your account is almost ready — one last step."
        footer={
          <div className="auth-secure-note">
            <IconShield size={13} />
            Passwords are hashed and stored only by Supabase Auth — never by this app.
          </div>
        }
      >
        <div className="notice-banner" role="status">
          <IconMail size={18} className="text-accent" />
          <div>
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
            account, then sign in here.
          </div>
        </div>
        <Link to="/auth/login">
          <Button variant="primary" size="lg" className="btn-block">
            Go to sign in <IconArrowRight size={15} />
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One private account for your balance, transactions and savings goals."
      footer={
        <div className="auth-secure-note">
          <IconShield size={13} />
          Protected by Row Level Security — only your account can read your financial records.
        </div>
      }
    >
      {formError ? (
        <div className="error-banner" role="alert">
          {formError}
        </div>
      ) : null}

      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <div className="field">
          <label className="field-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
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
          id="register-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          error={errors.password}
          hint="Use 8+ characters. Supabase Auth hashes and stores it securely."
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordField
          label="Confirm password"
          id="register-confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner spinner-sm" /> Creating account…
            </>
          ) : (
            <>
              <IconCheck size={15} /> Create account
            </>
          )}
        </Button>
      </form>

      <div className="auth-link-row" style={{ marginTop: 22 }}>
        <span className="text-dim">Already have an account?</span>
        <Link to="/auth/login" className="auth-link">
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
