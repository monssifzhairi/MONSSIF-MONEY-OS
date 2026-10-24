/**
 * Storage abstraction. The app talks only to this interface, so switching
 * from local demo mode to Supabase never touches the UI or the calculations.
 *
 * Privacy rules enforced across implementations:
 *  - Every stored record is bound to the *authenticated* user. User IDs are
 *    taken from the Supabase session (server-verified JWT) — never from
 *    client-supplied parameters.
 *  - Cloud mode never fabricates financial records (no sample/demo data).
 *  - Local demo mode is browser-only and clearly separated from cloud mode.
 */

import type {
  Account,
  AppData,
  FinancialGoal,
  GoalInput,
  StorageMode,
  Transaction,
  TransactionInput,
} from '../types/finance';

export interface FinanceRepository {
  readonly mode: StorageMode;
  load(): Promise<AppData>;
  /** Persist the opening balance. The initial value is written exactly once. */
  setOpeningBalance(amount: number): Promise<Account>;
  addTransaction(input: TransactionInput): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  addGoal(input: GoalInput): Promise<FinancialGoal>;
  updateGoal(id: string, patch: Partial<GoalInput>): Promise<FinancialGoal>;
  deleteGoal(id: string): Promise<void>;
  /**
   * Load a demo dataset. LOCAL DEMO MODE ONLY — the Supabase implementation
   * refuses this so a real user's account is never polluted with fabricated
   * transactions.
   */
  loadSampleData(): Promise<AppData>;
  resetAll(): Promise<AppData>;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigIssue() === null && Boolean(getRawSupabaseUrl() && getRawSupabaseAnonKey());
}

function getRawSupabaseUrl(): string | undefined {
  return (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
}

function getRawSupabaseAnonKey(): string | undefined {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
}

/**
 * Production startup validation for the Supabase environment.
 *
 * Returns a human-readable problem description, or `null` when the app is
 * either fully configured or intentionally unconfigured (local/demo mode).
 * A *partial* or dangerous configuration is always an error — the app must
 * never silently pretend cloud mode is unavailable while credentials exist,
 * and a service-role key must never be shipped in a browser bundle.
 */
export function getSupabaseConfigIssue(): string | null {
  const url = getRawSupabaseUrl();
  const key = getRawSupabaseAnonKey();

  if (!url && !key) return null; // Intentional: local mode / Supabase not configured yet.

  if (!url) {
    return 'VITE_SUPABASE_ANON_KEY is set but VITE_SUPABASE_URL is missing. Set both values (Project Settings → API), or clear both to run in local demo mode.';
  }
  if (!key) {
    return 'VITE_SUPABASE_URL is set but VITE_SUPABASE_ANON_KEY is missing. Set both values (Project Settings → API), or clear both to run in local demo mode.';
  }
  if (!/^https?:\/\//.test(url)) {
    return 'VITE_SUPABASE_URL must start with https:// (Project Settings → API → Project URL).';
  }
  if (url.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(url)) {
    return 'VITE_SUPABASE_URL must use https:// outside of localhost — plain http would leak Supabase tokens on the wire.';
  }
  if (key.length <= 20) {
    return 'VITE_SUPABASE_ANON_KEY looks truncated or invalid. Copy the full anon/publishable key from Project Settings → API.';
  }
  if (/service_role/i.test(key) || jwtRole(key) === 'service_role') {
    return 'VITE_SUPABASE_ANON_KEY appears to be a SERVICE-ROLE key. Never put a service-role key in frontend code or env vars — it would be exposed to every visitor. Use the anon/publishable key instead.';
  }
  return null;
}

/** Best-effort JWT payload `role` claim (base64url). Never throws. */
function jwtRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

export function configuredMode(): StorageMode {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}
