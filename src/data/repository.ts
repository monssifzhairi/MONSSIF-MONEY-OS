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
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
}

export function configuredMode(): StorageMode {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}
