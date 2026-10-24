/**
 * First-time setup. The starting balance is initialized EXACTLY once here
 * (default 300 MAD); afterwards it can only be changed via Settings.
 * The user chooses between a clean start and a sample-data exploration set.
 */

import { useState } from 'react';
import { useFinance } from '../data/store';
import { validateAmount } from '../lib/validation';
import { useToast } from '../components/ui';
import { IconCheck, IconWallet } from '../components/ui/icons';

export function Setup() {
  const { completeSetup, mode } = useFinance();
  const toast = useToast();
  const [amount, setAmount] = useState('300');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'fresh' | 'sample' | null>(null);

  const start = async (withSampleData: boolean) => {
    const amountError = validateAmount(amount);
    if (amountError) {
      setError(amountError);
      return;
    }
    setError(null);
    setBusy(withSampleData ? 'sample' : 'fresh');
    try {
      await completeSetup(Number(amount.replace(',', '.')), withSampleData);
      toast.success(
        withSampleData ? 'Sample workspace ready' : 'Workspace ready',
        `Starting balance set to ${Number(amount.replace(',', '.')).toFixed(2)} MAD — once.`,
      );
    } catch (err) {
      toast.error('Setup failed', (err as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="sidebar-brand" style={{ padding: 0, marginBottom: 22 }}>
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MONSSIF MONEY OS</div>
            <div className="brand-sub">Private finance · MAD</div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Set up your money system</h1>
        <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
          Define your starting balance once. Everything you record afterwards is measured
          against real entries — income, expenses and savings. Planned or hoped-for money is
          never counted as earned.
        </p>

        <div className="field" style={{ marginTop: 20 }}>
          <label className="field-label" htmlFor="setup-balance">
            Starting balance
          </label>
          <div className="input-group">
            <input
              id="setup-balance"
              className={`input has-suffix${error ? ' invalid' : ''}`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') start(false);
              }}
            />
            <span className="input-suffix">MAD</span>
          </div>
          {error ? <span className="field-error">{error}</span> : null}
          <span className="field-hint">
            Default 300 MAD. This is stored separately from transactions and initialized only
            once. You can adjust it later through Settings.
          </span>
        </div>

        <div className="setup-choice">
          <button
            className="setup-choice-btn"
            disabled={busy !== null}
            onClick={() => start(false)}
          >
            <span>
              Start clean
              <small>Empty ledger — record your real money from today.</small>
            </span>
            {busy === 'fresh' ? <div className="spinner" /> : <IconCheck size={17} />}
          </button>
          <button
            className="setup-choice-btn"
            disabled={busy !== null}
            onClick={() => start(true)}
          >
            <span>
              Explore with sample data
              <small>16 realistic demo entries — replace them any time from Settings.</small>
            </span>
            {busy === 'sample' ? <div className="spinner" /> : <IconWallet size={17} />}
          </button>
        </div>

        <div
          className="text-xs text-dim"
          style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)', lineHeight: 1.7 }}
        >
          {mode === 'local' ? (
            <>
              <strong className="text-muted">Local mode:</strong> Supabase credentials are not
              configured, so your data is stored privately in this browser. See the README to
              connect a real Supabase database later — schema, Row Level Security and
              migrations are included.
            </>
          ) : (
            <>
              <strong className="text-muted">Supabase mode:</strong> your data will be stored in
              your Supabase project, protected by Row Level Security.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
