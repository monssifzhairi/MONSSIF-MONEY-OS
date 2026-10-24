/**
 * First-time setup. The starting balance is initialized EXACTLY once here
 * (default 300 MAD); afterwards it can only be changed via Settings.
 *
 * Cloud (authenticated) mode starts with a clean ledger only — sample/demo
 * data is never written into a real user's account. Local demo mode may
 * explore with a clearly-labeled sample dataset.
 */

import { useState } from 'react';
import { useFinance } from '../data/store';
import { useAuth } from '../auth/AuthContext';
import { validateAmount } from '../lib/validation';
import { useToast } from '../components/ui';
import { IconCheck, IconShield, IconWallet } from '../components/ui/icons';

export function Setup() {
  const { completeSetup, mode } = useFinance();
  const { status, user } = useAuth();
  const toast = useToast();
  const [amount, setAmount] = useState('300');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'fresh' | 'sample' | null>(null);
  const isCloud = status === 'authenticated';

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
            <div className="brand-word">MONSSIF MONEY OS</div>
            <div className="brand-sub">
              {isCloud ? (
                <>
                  <IconShield size={9} /> {user?.email || 'Supabase account'}
                </>
              ) : (
                'Local demo · browser only'
              )}
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 21, marginBottom: 8 }}>Set up your money system</h1>
        <p className="text-sm text-muted" style={{ lineHeight: 1.75 }}>
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
            Default 300 MAD. Stored separately from transactions and initialized only once —
            later changes go through Settings and never re-run this step.
          </span>
        </div>

        <div className="setup-choice">
          <button
            className="setup-choice-btn"
            disabled={busy !== null}
            onClick={() => start(false)}
          >
            <span>
              {isCloud ? 'Start my ledger' : 'Start clean'}
              <small>
                {isCloud
                  ? 'Your private account begins empty — record your real money from today.'
                  : 'Empty ledger — record your real money from today.'}
              </small>
            </span>
            {busy === 'fresh' ? <div className="spinner spinner-sm" /> : <IconCheck size={17} />}
          </button>

          {!isCloud && (
            <button
              className="setup-choice-btn"
              disabled={busy !== null}
              onClick={() => start(true)}
            >
              <span>
                Explore with sample data
                <small>
                  16 realistic demo entries for Local Demo Mode — replace them any time from
                  Settings.
                </small>
              </span>
              {busy === 'sample' ? <div className="spinner spinner-sm" /> : <IconWallet size={17} />}
            </button>
          )}
        </div>

        <div
          className="text-xs text-dim"
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            lineHeight: 1.75,
          }}
        >
          {isCloud ? (
            <>
              <strong className="text-muted">Cloud mode:</strong> your ledger is stored in your
              Supabase project and protected by Row Level Security — only your account
              ({user?.email}) can read it. Demo data is disabled so your account stays free of
              fabricated records.
            </>
          ) : (
            <>
              <strong className="text-muted">Local Demo Mode:</strong> data stays in this
              browser only. No account, no cloud sync — clearly separated from authenticated
              cloud mode. Connect Supabase from the welcome screen for real accounts.
            </>
          )}
          <span className="visually-hidden">Storage mode: {mode}</span>
        </div>
      </div>
    </div>
  );
}
