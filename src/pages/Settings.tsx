/**
 * Settings: starting-balance workflow, data management, storage mode info.
 *
 * The opening balance is stored separately from transactions and is
 * initialized exactly once (during setup). Changes afterwards go through the
 * explicit confirmation workflow below — they never create duplicate
 * initialization entries.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../data/store';
import { calculateBalance } from '../lib/calculations';
import { formatMAD, formatDate } from '../lib/format';
import { csvFilename, downloadCSV, transactionsToCSV } from '../lib/csv';
import { validateAmount } from '../lib/validation';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, ConfirmDialog, Modal, useToast } from '../components/ui';
import {
  IconAlert,
  IconDownload,
  IconLock,
  IconRefresh,
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

export function Settings() {
  const {
    data,
    mode,
    setOpeningBalance,
    loadSampleData,
    resetAll,
    ready,
  } = useFinance();
  const toast = useToast();
  const navigate = useNavigate();
  const [balanceModal, setBalanceModal] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

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
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Loading settings…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Starting balance, data management and storage mode."
      />

      <div className="stack">
        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Financial setup</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Starting balance</h4>
              <p>
                Initialized exactly once at{' '}
                <strong className="tnum">{formatMAD(data.account.openingBalance)}</strong>
                {data.account.openingBalanceSetAt
                  ? ` on ${formatDate(data.account.openingBalanceSetAt.slice(0, 10))}`
                  : ''}
                . It is stored separately from transactions — never as an income or expense
                entry.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setBalanceModal(true)}>
              <IconWallet size={15} />
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

        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Data management</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Export transactions (CSV)</h4>
              <p>Download every transaction as a spreadsheet-friendly CSV file.</p>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <IconDownload size={15} />
              Export CSV
            </Button>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Load sample data</h4>
              <p>
                Explore the app with a realistic demo dataset (16 entries around a 300 MAD
                starting balance). Your chosen starting balance is preserved; this replaces
                current transactions and goals.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setConfirmSample(true)}>
              <IconRefresh size={15} />
              Load sample data
            </Button>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Reset all data</h4>
              <p>
                <IconAlert size={12} className="text-danger" /> Permanently deletes every
                transaction, goal and the starting balance from this browser. You will go
                through first-time setup again.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset everything
            </Button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-head">
            <h3 className="card-title">Storage & privacy</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>
                Storage mode:{' '}
                {mode === 'local' ? 'Local (browser)' : 'Supabase (cloud)'}
                {mode === 'local' && (
                  <Badge kind="warning">
                    <IconLock size={11} />
                    No cloud sync
                  </Badge>
                )}
              </h4>
              <p>
                {mode === 'local'
                  ? 'No Supabase credentials were found, so MONSSIF MONEY OS runs in documented local mode: all data lives in this browser (localStorage). Nothing is sent anywhere. To switch to a real database later, create a free Supabase project, run supabase/migrations/0001_init.sql, copy .env.example to .env and fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, then rebuild. Authentication and Row Level Security are already defined in the migration.'
                  : 'Connected to your Supabase project. Records are protected by Row Level Security: each authenticated user can only read and write their own rows. The browser only ever receives the anon key — never a service-role key.'}
              </p>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4>Currency</h4>
              <p>Moroccan dirham (MAD) — fixed for this version.</p>
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

      <ConfirmDialog
        open={confirmSample}
        title="Load sample data?"
        message="This replaces your current transactions and goals with the sample dataset. Your starting balance value is preserved. Consider exporting a CSV backup first."
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
        message="All transactions, goals and the starting balance will be permanently deleted from this browser. This cannot be undone."
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
