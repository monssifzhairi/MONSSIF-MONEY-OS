/**
 * Settings: starting-balance workflow, account management, data tools, and
 * an honest storage/privacy panel.
 *
 * The opening balance is stored separately from transactions and initialized
 * exactly once. Later changes go through this explicit workflow — they never
 * create or duplicate an initialization entry.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../data/store';
import { useAuth } from '../auth/AuthContext';
import { calculateBalance } from '../lib/calculations';
import { formatMAD, formatDate } from '../lib/format';
import { csvFilename, downloadCSV, transactionsToCSV } from '../lib/csv';
import { validateAmount } from '../lib/validation';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, ConfirmDialog, Modal, useToast } from '../components/ui';
import { PasswordField } from '../components/ui/controls';
import {
  IconAlert,
  IconDownload,
  IconKey,
  IconLock,
  IconLogOut,
  IconMail,
  IconRefresh,
  IconShield,
  IconWallet,
} from '../components/ui/icons';

function ChangeBalanceModal({
  open,
  current,
  onClose,
  onConfirm,
}: {
  open: boolean;
  current: number;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setValue(String(current));
      setError(null);
    }
  }

  const submit = async () => {
    const amountError = validateAmount(value);
    if (amountError) {
      setError(amountError);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(Number(value.replace(',', '.')));
      onClose();
    } catch {
      // Toast raised by parent.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Change starting balance"
      description="The starting balance is stored separately from your transactions. Changing it recalculates your current balance but does not create, duplicate or delete any transaction — and it never re-runs the one-time initialization."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save new starting balance'}
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="field-label" htmlFor="settings-balance">
          Starting balance
        </label>
        <div className="input-group">
          <input
            id="settings-balance"
            className={`input has-suffix${error ? ' invalid' : ''}`}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <span className="input-suffix">MAD</span>
        </div>
        {error ? <span className="field-error">{error}</span> : null}
        <span className="field-hint">
          Currently {formatMAD(current)}. Zero is allowed (start from nothing).
        </span>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { updatePassword } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setPassword('');
      setConfirm('');
      setErrors({});
    }
  }

  const submit = async () => {
    const next: typeof errors = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success('Password updated');
      onClose();
    } catch (err) {
      toast.error('Could not update password', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Change password"
      description="Supabase Auth applies the new password to your account. You stay signed in on this device."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </>
      }
    >
      <PasswordField
        label="New password"
        id="settings-new-password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordField
        label="Confirm new password"
        id="settings-confirm-password"
        autoComplete="new-password"
        placeholder="Repeat your new password"
        value={confirm}
        error={errors.confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
    </Modal>
  );
}

export function Settings() {
  const { data, mode, setOpeningBalance, loadSampleData, resetAll, ready } = useFinance();
  const { status, user, signOut, exitLocalDemo, resetPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [balanceModal, setBalanceModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const isCloud = status === 'authenticated';

  const balance = calculateBalance(data.account.openingBalance, data.transactions);

  const handleExport = () => {
    if (data.transactions.length === 0) {
      toast.error('Nothing to export', 'No transactions recorded yet.');
      return;
    }
    downloadCSV(transactionsToCSV(data.transactions), csvFilename());
    toast.success('CSV exported', `${data.transactions.length} transactions saved to a file.`);
  };

  if (!ready) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Account, starting balance, data and privacy."
      />

      <div className="stack">
        {/* ── Account ─────────────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Account</h3>
          </div>

          {isCloud ? (
            <>
              <div className="settings-row">
                <div className="settings-row-text">
                  <h4>
                    <IconMail size={13} /> {user?.email}
                  </h4>
                  <p>
                    Signed in with Supabase Auth. Your session persists securely on this device
                    and refreshes automatically — passwords are hashed and stored only by
                    Supabase, never by this app.
                  </p>
                </div>
                <Badge kind="income">
                  <IconShield size={11} /> Authenticated
                </Badge>
              </div>

              <div className="settings-row">
                <div className="settings-row-text">
                  <h4>
                    <IconKey size={13} /> Password
                  </h4>
                  <p>Change the password for your account at any time.</p>
                </div>
                <Button variant="secondary" onClick={() => setPasswordModal(true)}>
                  Change password
                </Button>
              </div>

              <div className="settings-row">
                <div className="settings-row-text">
                  <h4>
                    <IconLogOut size={13} /> Sign out
                  </h4>
                  <p>End the session on this device. Your data stays safely in Supabase.</p>
                </div>
                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      await signOut();
                      toast.success('Signed out');
                      navigate('/auth/login', { replace: true });
                    } catch (err) {
                      toast.error('Could not sign out', (err as Error).message);
                    }
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="settings-row">
              <div className="settings-row-text">
                <h4>
                  <IconLock size={13} /> Local Demo Mode — no account
                </h4>
                <p>
                  You are exploring without authentication. Data lives in this browser only and
                  is never uploaded. Connect Supabase (see the welcome screen) for real
                  accounts, sign-in and cloud sync.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  exitLocalDemo();
                  toast.success('Left Local Demo Mode', 'Connect Supabase to enable accounts.');
                  navigate('/', { replace: true });
                }}
              >
                Exit local demo
              </Button>
            </div>
          )}
        </div>

        {/* ── Financial setup ─────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Financial setup</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>
                <IconWallet size={13} /> Starting balance
              </h4>
              <p>
                Initialized exactly once at{' '}
                <strong className="tnum">{formatMAD(data.account.openingBalance)}</strong>
                {data.account.openingBalanceSetAt
                  ? ` on ${formatDate(data.account.openingBalanceSetAt.slice(0, 10))}`
                  : ''}
                . Stored separately from transactions — never as an income or expense entry,
                never re-added during rendering, refreshes or migrations.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setBalanceModal(true)}>
              Change starting balance
            </Button>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Current balance</h4>
              <p>
                Opening balance + recorded income − recorded expenses ={' '}
                <strong className="tnum">{formatMAD(balance)}</strong>. Hypothetical income is
                never included.
              </p>
            </div>
            <Badge kind="neutral">{data.transactions.length} transactions</Badge>
          </div>
        </div>

        {/* ── Data management ─────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Data management</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>
                <IconDownload size={13} /> Export transactions (CSV)
              </h4>
              <p>Download every transaction as a spreadsheet-friendly CSV file.</p>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              Export CSV
            </Button>
          </div>

          {!isCloud && (
            <div className="settings-row">
              <div className="settings-row-text">
                <h4>
                  <IconRefresh size={13} /> Load sample data
                </h4>
                <p>
                  Local Demo Mode only: explore with a realistic demo dataset. This replaces
                  current transactions and goals — and it is intentionally disabled in cloud
                  mode so a real account never contains fabricated records.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setConfirmSample(true)}>
                Load sample data
              </Button>
            </div>
          )}

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>
                <IconAlert size={13} className="text-danger" /> Reset all data
              </h4>
              <p>
                Permanently deletes every transaction, goal and the starting balance
                {isCloud ? ' from your Supabase account' : ' from this browser'}. You will go
                through first-time setup again.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset everything
            </Button>
          </div>

          {isCloud && (
            <div className="settings-row">
              <div className="settings-row-text">
                <h4>
                  <IconMail size={13} /> Password reset email
                </h4>
                <p>
                  Send yourself a password recovery link (same flow as "Forgot password" on the
                  sign-in page).
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!user?.email) return;
                  try {
                    await resetPassword(user.email);
                    toast.success('Recovery email sent', `Check ${user.email} for the link.`);
                  } catch (err) {
                    toast.error('Could not send email', (err as Error).message);
                  }
                }}
              >
                Send recovery link
              </Button>
            </div>
          )}
        </div>

        {/* ── Storage & privacy ───────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Storage & privacy</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>
                Storage mode:{' '}
                {mode === 'supabase' ? 'Supabase cloud (authenticated)' : 'Local demo (browser)'}
                {mode !== 'supabase' && (
                  <Badge kind="warning">
                    <IconLock size={11} /> No cloud sync
                  </Badge>
                )}
              </h4>
              <p>
                {mode === 'supabase'
                  ? 'Records are protected by Row Level Security: every SELECT, INSERT, UPDATE and DELETE is scoped to your authenticated user id — enforced in PostgreSQL, not just in the UI. The browser only ever holds the public anon key; the service-role key never ships to any client.'
                  : 'This is Local Demo Mode: a clearly separated, browser-only store (localStorage). No authentication exists here and nothing is synced — the app will never claim otherwise. Cloud mode with real accounts requires Supabase (see README).'}
              </p>
            </div>
            <Badge kind="neutral">MAD</Badge>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Currency</h4>
              <p>Moroccan dirham (MAD) — fixed for this version. Formatting is identical across the dashboard, tables, charts and exports.</p>
            </div>
            <Badge kind="neutral">MAD</Badge>
          </div>
        </div>
      </div>

      <ChangeBalanceModal
        open={balanceModal}
        current={data.account.openingBalance}
        onClose={() => setBalanceModal(false)}
        onConfirm={async (amount) => {
          try {
            await setOpeningBalance(amount);
            toast.success('Starting balance updated', 'Balances were recalculated.');
          } catch (err) {
            toast.error('Could not update balance', (err as Error).message);
            throw err;
          }
        }}
      />

      {isCloud && <ChangePasswordModal open={passwordModal} onClose={() => setPasswordModal(false)} />}

      <ConfirmDialog
        open={confirmSample}
        title="Load sample data?"
        message="This replaces your current transactions and goals with the sample dataset (Local Demo Mode only). Your starting balance value is preserved. Consider exporting a CSV backup first."
        confirmLabel="Load sample data"
        danger
        onCancel={() => setConfirmSample(false)}
        onConfirm={async () => {
          try {
            await loadSampleData();
            toast.success('Sample data loaded', 'Explore the dashboard, reports and goals.');
            navigate('/');
          } catch (err) {
            toast.error('Could not load sample data', (err as Error).message);
          }
          setConfirmSample(false);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset everything?"
        message={`All transactions, goals and the starting balance will be permanently deleted${isCloud ? ' from your Supabase account' : ' from this browser'}. This cannot be undone.`}
        confirmLabel="Reset everything"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          try {
            await resetAll();
            toast.success('All data reset', 'Starting first-time setup…');
            navigate('/');
          } catch (err) {
            toast.error('Could not reset data', (err as Error).message);
          }
          setConfirmReset(false);
        }}
      />
    </>
  );
}
