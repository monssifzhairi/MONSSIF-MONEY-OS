/**
 * Authentication & data-isolation tests with a MOCKED Supabase client.
 *
 * These verify our app's behavior around auth states, protected routes and
 * access-control assumptions. They do NOT verify real Supabase credentials or
 * live RLS enforcement — that requires a configured project (manual step,
 * documented in the README).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { mountApp, type MountedApp } from './appHelpers';
import { humanizeAuthError } from '../src/auth/AuthContext';
import { AuthRequiredError } from '../src/data/errors';

/* ─── Controllable fake Supabase ──────────────────────────────────────────── */

interface QueryBuilder {
  select(): QueryBuilder;
  insert(p: Record<string, unknown>): QueryBuilder;
  update(p: Record<string, unknown>): QueryBuilder;
  delete(): QueryBuilder;
  eq(): QueryBuilder;
  order(): QueryBuilder;
  maybeSingle(): Promise<{ data: unknown; error: null }>;
  single(): Promise<{ data: unknown; error: null }>;
  then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown): Promise<unknown>;
}

const state = vi.hoisted(() => {
  const s: {
    session: { user: { id: string; email: string } } | null;
    signInError: string | null;
    signUpError: string | null;
    signUpNeedsConfirm: boolean;
    rows: Record<string, Array<Record<string, unknown>>>;
    inserts: Array<{ table: string; payload: Record<string, unknown> }>;
    updates: Array<{ table: string; payload: Record<string, unknown> }>;
    listener: ((event: string, session: unknown) => void) | null;
    resetEmailCalls: string[];
    updateUserCalls: Array<Record<string, unknown>>;
    signOutCalls: number;
  } = {
    session: null,
    signInError: null,
    signUpError: null,
    signUpNeedsConfirm: true,
    rows: {},
    inserts: [],
    updates: [],
    listener: null,
    resetEmailCalls: [],
    updateUserCalls: [],
    signOutCalls: 0,
  };
  return s;
});

vi.mock('@supabase/supabase-js', () => {
  function makeBuilder(table: string): QueryBuilder {
    let lastInsert: Record<string, unknown> | null = null;
    let lastUpdate: Record<string, unknown> | null = null;
    const rows = () => state.rows[table] ?? [];
    const b: QueryBuilder = {
      select: () => b,
      insert: (p) => {
        state.inserts.push({ table, payload: p });
        lastInsert = p;
        state.rows[table] = [...rows(), p];
        return b;
      },
      update: (p) => {
        state.updates.push({ table, payload: p });
        lastUpdate = p;
        return b;
      },
      delete: () => b,
      eq: () => b,
      order: () => b,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      single: async () => ({
        data: lastInsert ?? lastUpdate ?? rows()[0] ?? {},
        error: null,
      }),
      then: (res, rej) => Promise.resolve({ data: rows(), error: null }).then(res, rej),
    };
    return b;
  }

  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: state.session } }),
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          state.listener = cb;
          return { data: { subscription: { unsubscribe: () => undefined } } };
        },
        signInWithPassword: async ({ email }: { email: string; password: string }) => {
          if (state.signInError) {
            return { data: { user: null, session: null }, error: { message: state.signInError } };
          }
          state.session = { user: { id: 'user-1', email } };
          return {
            data: {
              user: { id: 'user-1', email },
              session: { user: { id: 'user-1', email } },
            },
            error: null,
          };
        },
        signUp: async ({ email }: { email: string; password: string }) => {
          if (state.signUpError) {
            return { data: { user: null, session: null }, error: { message: state.signUpError } };
          }
          if (state.signUpNeedsConfirm) {
            return { data: { user: { id: 'user-1', email }, session: null }, error: null };
          }
          state.session = { user: { id: 'user-1', email } };
          return {
            data: {
              user: { id: 'user-1', email },
              session: { user: { id: 'user-1', email } },
            },
            error: null,
          };
        },
        signOut: async () => {
          state.signOutCalls += 1;
          state.session = null;
          return { error: null };
        },
        resetPasswordForEmail: async (email: string) => {
          state.resetEmailCalls.push(email);
          return { error: null };
        },
        updateUser: async (attrs: Record<string, unknown>) => {
          state.updateUserCalls.push(attrs);
          return { data: { user: {} }, error: null };
        },
      },
      from: (table: string) => makeBuilder(table),
    }),
  };
});

/* ─── Fixtures & lifecycle ────────────────────────────────────────────────── */

const SESSION_USER = { id: 'user-1', email: 'monssif@example.com' };

function seedAccount(openingBalance = 300, initialized = true) {
  state.rows.accounts = [
    {
      id: 'acc-1',
      name: 'Main account',
      currency: 'MAD',
      opening_balance: openingBalance,
      opening_balance_set_at: initialized ? '2026-10-01T00:00:00.000Z' : null,
      created_at: '2026-10-01T00:00:00.000Z',
      user_id: SESSION_USER.id,
    },
  ];
}

function resetState() {
  state.session = null;
  state.signInError = null;
  state.signUpError = null;
  state.signUpNeedsConfirm = true;
  state.rows = {};
  state.inserts = [];
  state.updates = [];
  state.listener = null;
  state.resetEmailCalls = [];
  state.updateUserCalls = [];
  state.signOutCalls = 0;
}

let current: MountedApp | null = null;

async function mount(startPath = '/'): Promise<MountedApp> {
  const a = await mountApp(startPath);
  current = a;
  return a;
}

beforeEach(() => {
  resetState();
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-1234567890abcdef');
  window.history.replaceState({}, '', '/');
});

afterEach(async () => {
  if (current) {
    await current.unmount();
    current = null;
  }
  localStorage.clear();
  vi.unstubAllEnvs();
});

/* ─── humanizeAuthError (pure) ────────────────────────────────────────────── */

describe('humanizeAuthError', () => {
  it('maps raw Supabase errors to friendly language', () => {
    expect(humanizeAuthError('Invalid login credentials')).toBe(
      'Wrong email or password. Try again.',
    );
    expect(humanizeAuthError('User already registered')).toContain('already exists');
    expect(humanizeAuthError('Password should be at least 8 characters')).toContain(
      'at least 8',
    );
    expect(humanizeAuthError('Something oddly specific')).toBe('Something oddly specific');
  });
});

/* ─── Protected routes & redirects ────────────────────────────────────────── */

describe('Protected routes (Supabase configured)', () => {
  it('redirects unauthenticated visitors from any route to the login page', async () => {
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    expect(window.location.pathname).toContain('/auth/login');
    expect(app.container.querySelector('#login-email')).toBeTruthy();
  });

  it('shows the login form fields, forgot-password and register links', async () => {
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    expect(app.bodyText()).toContain('Forgot password?');
    expect(app.bodyText()).toContain('Create an account');
    expect(app.container.querySelector('#login-password')).toBeTruthy();
    // Show/hide password control exists.
    expect(app.container.querySelector('button[aria-label="Show password"]')).toBeTruthy();
  });

  it('boots straight into the dashboard when a persistent session exists', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    expect(app.bodyText()).toContain('300.00 MAD');
    expect(app.bodyText()).toContain(SESSION_USER.email);
  });

  it('redirects authenticated users away from login/register pages', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const app = await mount('/auth/login');
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    expect(window.location.pathname).not.toContain('/auth/login');
  });

  it('renders the first-run setup when the opening balance was never set', async () => {
    state.session = { user: SESSION_USER };
    seedAccount(0, false);
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Set up your money system'));
    // Cloud mode never offers fabricated sample data.
    expect(app.bodyText()).not.toContain('Explore with sample data');
  });
});

/* ─── Sign-in / sign-up / sign-out flows ──────────────────────────────────── */

describe('Sign-in flow', () => {
  it('validates inputs before completing sign-in', async () => {
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    await app.setInput('#login-email', 'not-an-email');
    await app.clickButton(/Sign in/);
    expect(app.bodyText()).toContain('Enter a valid email address.');
    expect(app.bodyText()).toContain('Enter your password.');
    // Still on the login page — no session was created.
    expect(app.bodyText()).toContain('Welcome back');
  });

  it('shows a friendly error for wrong credentials', async () => {
    state.signInError = 'Invalid login credentials';
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    await app.setInput('#login-email', SESSION_USER.email);
    await app.setInput('#login-password', 'wrong-password');
    await app.clickButton(/Sign in/);
    await app.waitFor(() => app.bodyText().includes('Wrong email or password'));
  });

  it('signs in successfully and lands on the dashboard', async () => {
    seedAccount();
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    await app.setInput('#login-email', SESSION_USER.email);
    await app.setInput('#login-password', 'supersecret1');
    await app.clickButton(/Sign in/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    expect(app.bodyText()).toContain('300.00 MAD');
  });
});

describe('Sign-up flow', () => {
  it('enforces password rules and matching confirmation', async () => {
    const app = await mount('/auth/register');
    await app.waitFor(() => app.bodyText().includes('Create your account'));
    await app.setInput('#register-email', 'new@example.com');
    await app.setInput('#register-password', 'short');
    await app.setInput('#register-confirm', 'different');
    await app.clickButton(/Create account/);
    expect(app.bodyText()).toContain('at least 8');
    expect(app.bodyText()).toContain('do not match');
  });

  it('shows the check-your-inbox state when email confirmation is required', async () => {
    const app = await mount('/auth/register');
    await app.waitFor(() => app.bodyText().includes('Create your account'));
    await app.setInput('#register-email', 'new@example.com');
    await app.setInput('#register-password', 'supersecret1');
    await app.setInput('#register-confirm', 'supersecret1');
    await app.clickButton(/Create account/);
    await app.waitFor(() => app.bodyText().includes('Check your inbox'));
    expect(app.bodyText()).toContain('new@example.com');
  });
});

describe('Password reset flow', () => {
  it('validates the email and shows the sent state', async () => {
    const app = await mount('/auth/forgot-password');
    await app.waitFor(() => app.bodyText().includes('Reset your password'));
    await app.setInput('#forgot-email', 'nope');
    await app.clickButton(/Send recovery link/);
    expect(app.bodyText()).toContain('Enter a valid email address.');

    await app.setInput('#forgot-email', SESSION_USER.email);
    await app.clickButton(/Send recovery link/);
    await app.waitFor(() => app.bodyText().includes('Check your inbox'));
    expect(state.resetEmailCalls).toEqual([SESSION_USER.email]);
  });

  it('routes a recovery event to the choose-new-password screen', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    await act(async () => {
      state.listener?.('PASSWORD_RECOVERY', state.session);
      await Promise.resolve();
    });
    await app.waitFor(() => app.bodyText().includes('Choose a new password'));
  });

  it('updates the password via Supabase Auth', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const app = await mount('/auth/update-password');
    await app.waitFor(() => app.bodyText().includes('Change your password'));
    await app.setInput('#update-password', 'newpassword9');
    await app.setInput('#update-confirm', 'newpassword9');
    await app.clickButton(/Update password/);
    await app.waitFor(() => app.bodyText().includes('Current balance'));
    expect(state.updateUserCalls).toEqual([{ password: 'newpassword9' }]);
  });
});

describe('Sign-out', () => {
  it('ends the session and returns to the login page', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const app = await mount();
    await app.waitFor(() => app.bodyText().includes('Current balance'));

    await app.clickByAriaLabel('Account menu');
    await app.waitFor(() => app.bodyText().includes('Sign out'));
    await app.clickButton(/Sign out/);
    await app.waitFor(() => app.bodyText().includes('Welcome back'));
    expect(state.signOutCalls).toBe(1);
  });
});

/* ─── Access-control assumptions ──────────────────────────────────────────── */

describe('Data isolation assumptions (repository level)', () => {
  it('binds every insert to the SESSION user id — never a caller-supplied one', async () => {
    state.session = { user: SESSION_USER };
    const { SupabaseFinanceRepository } = await import('../src/data/supabaseRepository');
    const repo = new SupabaseFinanceRepository();
    await repo.load();
    await repo.addTransaction({
      type: 'income',
      amount: 100,
      category: 'Salary',
      date: '2026-10-24',
      description: 'test',
    });
    const txInsert = state.inserts.find((i) => i.table === 'transactions');
    expect(txInsert).toBeTruthy();
    expect(txInsert!.payload.user_id).toBe(SESSION_USER.id);
  });

  it('refuses to operate without a session', async () => {
    state.session = null;
    const { SupabaseFinanceRepository } = await import('../src/data/supabaseRepository');
    const repo = new SupabaseFinanceRepository();
    await expect(repo.load()).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('never fabricates financial records in cloud accounts', async () => {
    state.session = { user: SESSION_USER };
    seedAccount();
    const { SupabaseFinanceRepository } = await import('../src/data/supabaseRepository');
    const repo = new SupabaseFinanceRepository();
    await expect(repo.loadSampleData()).rejects.toThrow(/Sample data/i);
    expect(state.inserts.filter((i) => i.table === 'transactions')).toHaveLength(0);
  });

  it('initializes the opening balance exactly once via the account row', async () => {
    state.session = { user: SESSION_USER };
    state.rows.accounts = [
      {
        id: 'acc-1',
        name: 'Main account',
        currency: 'MAD',
        opening_balance: 0,
        opening_balance_set_at: null,
        created_at: '2026-10-01T00:00:00.000Z',
        user_id: SESSION_USER.id,
      },
    ];
    const { SupabaseFinanceRepository } = await import('../src/data/supabaseRepository');
    const repo = new SupabaseFinanceRepository();
    const account = await repo.setOpeningBalance(300);
    expect(account.openingBalance).toBe(300);
    expect(account.openingBalanceSetAt).toBeTruthy();
    // The opening balance is not a transaction — nothing was invented.
    expect(state.inserts.filter((i) => i.table === 'transactions')).toHaveLength(0);
    const accountUpdate = state.updates.find((u) => u.table === 'accounts');
    expect(accountUpdate).toBeTruthy();
    expect(accountUpdate!.payload.opening_balance).toBe(300);
  });
});
