/**
 * App smoke tests: boot the real <App/> in happy-dom, drive the first-time
 * setup flow, and verify rendered balance figures from real calculations.
 *
 * The data layer initializes asynchronously (dynamic repository import), so
 * these tests poll for rendered state instead of relying on fixed sleeps.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

let container: HTMLDivElement;
let root: Root | null = null;

function bodyText(): string {
  return container.textContent ?? '';
}

/** Poll inside `act` until `pred` is true (or fail after `timeoutMs`). */
async function waitFor(pred: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pred()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
  }
  expect(pred(), 'waitFor condition to become true').toBe(true);
}

async function clickButton(label: RegExp | string, scope = ''): Promise<void> {
  const selector = scope ? `${scope} button, ${scope} a` : 'button, a';
  const clickable = [...container.querySelectorAll(selector)];
  const target = clickable.find((b) => {
    const text = b.textContent ?? '';
    return typeof label === 'string' ? text.includes(label) : label.test(text);
  });
  expect(target, `button/link matching ${label}`).toBeTruthy();
  await act(async () => {
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

/** Click an icon-only button addressed by its aria-label. */
async function clickByAriaLabel(ariaLabel: string): Promise<void> {
  const button = container.querySelector(`button[aria-label="${ariaLabel}"]`);
  expect(button, `button[aria-label=${ariaLabel}]`).toBeTruthy();
  await act(async () => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setInput(selector: string, value: string): Promise<void> {
  const input = container.querySelector(selector) as HTMLInputElement | null;
  expect(input, `input ${selector}`).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(input, value);
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function setSelect(selector: string, value: string): Promise<void> {
  const select = container.querySelector(selector) as HTMLSelectElement | null;
  expect(select, `select ${selector}`).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    'value',
  )!.set!;
  await act(async () => {
    setter.call(select, value);
    select!.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
    root = null;
  }
  container.remove();
  localStorage.clear();
});

async function mountApp(): Promise<void> {
  await act(async () => {
    root = createRoot(container);
    root.render(<App />);
    await Promise.resolve();
  });
  // Wait for the async repository initialization to finish.
  await waitFor(() => !bodyText().includes('Starting MONSSIF'));
}

async function completeSetup(withSampleData: boolean): Promise<void> {
  await mountApp();
  await waitFor(() => bodyText().includes('Set up your money system'));
  await clickButton(withSampleData ? /Explore with sample data/ : /Start clean/);
  await waitFor(() => bodyText().includes('Dashboard'));
}

describe('App boot', () => {
  it('shows first-time setup when no data exists (300 MAD default)', async () => {
    await mountApp();
    expect(bodyText()).toContain('Set up your money system');
    expect(bodyText()).toContain('Local mode');
    const balanceInput = container.querySelector('#setup-balance') as HTMLInputElement;
    expect(balanceInput.value).toBe('300');
  });

  it('completes clean setup and lands on the dashboard with the 300 MAD balance', async () => {
    await completeSetup(false);
    expect(bodyText()).toContain('Current balance');
    expect(bodyText()).toContain('300.00 MAD');
    // No transactions yet → income and expenses are zero.
    expect(bodyText()).toContain('0.00 MAD');
    expect(bodyText()).toContain('Recent transactions');
  });

  it('completes setup with sample data and shows real computed figures', async () => {
    await completeSetup(true);

    // Sample data: opening 300, income 1,590, expenses 470 → balance 1,420.
    expect(bodyText()).toContain('1,420.00 MAD');
    expect(bodyText()).toContain('1,590.00 MAD');
    expect(bodyText()).toContain('470.00 MAD');
    // The "First 1,000 MAD" goal is fully funded by the real balance.
    expect(bodyText()).toContain('Target reached');
  });

  it('validates the starting balance before setup', async () => {
    await mountApp();
    await waitFor(() => bodyText().includes('Set up your money system'));
    await setInput('#setup-balance', '-5');
    await clickButton(/Start clean/);
    // Still on setup with a field error.
    expect(bodyText()).toContain('Set up your money system');
    expect(bodyText()).toContain('greater than zero');
  });
});

describe('Dashboard balance updates', () => {
  it('recalculates the balance after adding an expense', async () => {
    await completeSetup(false);

    await clickButton(/Add transaction/);
    await waitFor(() => bodyText().includes('Amount'));

    await setInput('#tx-amount', '100');
    await setSelect('#tx-category', 'Food');

    await clickButton(/Add transaction/, '.modal-foot');
    await waitFor(() => bodyText().includes('Transaction added'));

    // 300 opening − 100 expense = 200.
    expect(bodyText()).toContain('200.00 MAD');
    expect(bodyText()).toContain('100.00 MAD');
  });

  it('rejects an invalid amount with a visible error and no balance change', async () => {
    await completeSetup(false);

    await clickButton(/Add transaction/);
    await waitFor(() => bodyText().includes('Amount'));

    await setInput('#tx-amount', '0');
    await clickButton(/Add transaction/, '.modal-foot');
    await waitFor(() => bodyText().includes('greater than zero'));

    // Modal stays open with an error; the dashboard balance is unchanged.
    expect(bodyText()).toContain('300.00 MAD');
  });

  it('deletes a transaction after confirmation and recalculates', async () => {
    await completeSetup(false);

    await clickButton(/Add transaction/);
    await waitFor(() => bodyText().includes('Amount'));
    await setInput('#tx-amount', '50');
    await setSelect('#tx-category', 'Transport');
    await clickButton(/Add transaction/, '.modal-foot');
    await waitFor(() => bodyText().includes('250.00 MAD'));

    // Delete the transaction from the full list on the Transactions page
    // (the compact dashboard table has no action buttons).
    await clickButton(/Transactions/);
    await waitFor(() => bodyText().includes('transactions recorded'));
    await clickByAriaLabel('Delete transaction');
    await waitFor(() => bodyText().includes('Delete transaction?'));
    await clickButton(/Delete/, '.modal-foot');
    await waitFor(() => bodyText().includes('Transaction deleted'));

    expect(bodyText()).toContain('300.00 MAD');
    expect(bodyText()).toContain('No transactions yet');
  });
});
