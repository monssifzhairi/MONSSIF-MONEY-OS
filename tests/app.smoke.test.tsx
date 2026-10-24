/**
 * App smoke tests: boot the real <App/> in happy-dom and drive the real flows.
 *
 * Environment: Supabase NOT configured → the setup screen must appear (never
 * a fake login), the user explicitly enters Local Demo Mode, then completes
 * first-time setup. All figures shown are computed from real data.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type MountedApp } from './appHelpers';

let app: MountedApp;

beforeEach(() => {
  localStorage.clear();
});

afterEach(async () => {
  if (app) await app.unmount();
  localStorage.clear();
});

async function bootToDemo() {
  app = await mountApp();
  await app.waitFor(() => app.bodyText().includes('Connect Supabase'));
  await app.clickButton(/Continue in Local Demo Mode/);
  await app.waitFor(() => app.bodyText().includes('Set up your money system'));
}

describe('Boot (Supabase not configured)', () => {
  it('shows the honest setup screen — no fake login, no fake auth', async () => {
    app = await mountApp();
    await app.waitFor(() => app.bodyText().includes('Connect Supabase'));
    const text = app.bodyText();
    expect(text).toContain('Cloud mode not configured');
    expect(text).toContain('will never pretend otherwise');
    expect(text).toContain('Continue in Local Demo Mode');
    expect(text).toContain('VITE_SUPABASE_URL');
    // There must be NO email/password login form on this screen.
    expect(app.container.querySelector('#login-email')).toBeNull();
    expect(app.container.querySelector('input[type="password"]')).toBeNull();
  });
});

describe('Local demo mode + first-time setup', () => {
  it('completes clean setup and lands on the dashboard with the 300 MAD balance', async () => {
    await bootToDemo();
    const balanceInput = app.container.querySelector('#setup-balance') as HTMLInputElement;
    expect(balanceInput.value).toBe('300');

    await app.clickButton(/Start clean/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    expect(app.bodyText()).toContain('Current balance');
    expect(app.bodyText()).toContain('300.00 MAD');
    // Demo mode is always labeled honestly.
    expect(app.bodyText()).toContain('Local demo');
  });

  it('completes setup with sample data and shows real computed figures', async () => {
    await bootToDemo();
    await app.clickButton(/Explore with sample data/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));

    // Sample data: opening 300, income 1,590, expenses 470 → balance 1,420.
    expect(app.bodyText()).toContain('1,420.00 MAD');
    expect(app.bodyText()).toContain('1,590.00 MAD');
    expect(app.bodyText()).toContain('470.00 MAD');
    // The "First 1,000 MAD" goal is fully funded by the real balance.
    expect(app.bodyText()).toContain('Target reached');
  });

  it('validates the starting balance before setup', async () => {
    await bootToDemo();
    await app.setInput('#setup-balance', '-5');
    await app.clickButton(/Start clean/);
    expect(app.bodyText()).toContain('Set up your money system');
    expect(app.bodyText()).toContain('greater than zero');
  });

  it('shows the one-time initialization language', async () => {
    await bootToDemo();
    expect(app.bodyText()).toContain('initialized only once');
  });
});

describe('Dashboard balance updates (local demo)', () => {
  it('recalculates the balance after adding an expense', async () => {
    await bootToDemo();
    await app.clickButton(/Start clean/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));

    await app.clickButton(/Add transaction/);
    await app.waitFor(() => app.bodyText().includes('Amount'));
    await app.setInput('#tx-amount', '100');
    await app.setSelect('#tx-category', 'Food');
    await app.clickButton(/Add transaction/, '.modal-foot');
    await app.waitFor(() => app.bodyText().includes('Transaction added'));

    // 300 opening − 100 expense = 200.
    expect(app.bodyText()).toContain('200.00 MAD');
    expect(app.bodyText()).toContain('100.00 MAD');
  });

  it('rejects an invalid amount with a visible error and no balance change', async () => {
    await bootToDemo();
    await app.clickButton(/Start clean/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));

    await app.clickButton(/Add transaction/);
    await app.waitFor(() => app.bodyText().includes('Amount'));
    await app.setInput('#tx-amount', '0');
    await app.clickButton(/Add transaction/, '.modal-foot');
    await app.waitFor(() => app.bodyText().includes('greater than zero'));

    expect(app.bodyText()).toContain('300.00 MAD');
  });

  it('deletes a transaction after confirmation and recalculates', async () => {
    await bootToDemo();
    await app.clickButton(/Start clean/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));

    await app.clickButton(/Add transaction/);
    await app.waitFor(() => app.bodyText().includes('Amount'));
    await app.setInput('#tx-amount', '50');
    await app.setSelect('#tx-category', 'Transport');
    await app.clickButton(/Add transaction/, '.modal-foot');
    await app.waitFor(() => app.bodyText().includes('250.00 MAD'));

    await app.clickButton(/Transactions/);
    await app.waitFor(() => app.bodyText().includes('transactions recorded'));
    await app.clickByAriaLabel('Delete transaction');
    await app.waitFor(() => app.bodyText().includes('Delete transaction?'));
    await app.clickButton(/Delete/, '.modal-foot');
    await app.waitFor(() => app.bodyText().includes('Transaction deleted'));

    expect(app.bodyText()).toContain('300.00 MAD');
    expect(app.bodyText()).toContain('No transactions yet');
  });
});

describe('Configuration error gate (misconfigured Supabase env)', () => {
  it('blocks the app with a clear error instead of pretending cloud mode is off', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    // VITE_SUPABASE_ANON_KEY deliberately missing.
    app = await mountApp();
    await app.waitFor(() => app.bodyText().includes('Cloud mode is misconfigured'));
    expect(app.bodyText()).toContain('VITE_SUPABASE_ANON_KEY is missing');
    expect(app.bodyText()).toContain('will never pretend');
    // No fake login, no demo fallback on a misconfigured deployment.
    expect(app.container.querySelector('#login-email')).toBeNull();
    vi.unstubAllEnvs();
  });
});
