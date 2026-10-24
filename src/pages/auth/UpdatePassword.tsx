/**
 * Choose a new password. Shown when:
 *  - a recovery link was opened (`pendingPasswordRecovery`), or
 *  - a signed-in user changes their password from the account menu.
 * Requires an authenticated session — Supabase Auth applies the new password.
 */

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, humanizeAuthError } from '../../auth/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { Button, useToast } from '../../components/ui';
import { PasswordField } from '../../components/ui/controls';
import { IconArrowRight, IconLock } from '../../components/ui/icons';

const MIN_PASSWORD = 8;

export function UpdatePassword() {
  const { updatePassword, clearPasswordRecovery, pendingPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await updatePassword(password);
      clearPasswordRecovery();
      toast.success('Password updated', 'Your new password is active.');
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(humanizeAuthError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={pendingPasswordRecovery ? 'Choose a new password' : 'Change your password'}
      subtitle={
        pendingPasswordRecovery
          ? 'Your recovery link was verified. Set a new password to secure your account.'
          : 'Set a new password for your account. You stay signed in on this device.'
      }
    >
      {formError ? (
        <div className="error-banner" role="alert">
          {formError}
        </div>
      ) : null}

      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <PasswordField
          label="New password"
          id="update-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordField
          label="Confirm new password"
          id="update-confirm"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (
            <>
              <span className="spinner spinner-sm" /> Saving…
            </>
          ) : (
            <>
              <IconLock size={15} /> Update password
            </>
          )}
        </Button>

        <Button type="button" variant="ghost" onClick={() => navigate('/')}>
          <IconArrowRight size={15} /> Back to dashboard
        </Button>
      </form>
    </AuthShell>
  );
}
