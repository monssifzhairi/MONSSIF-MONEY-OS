/**
 * Storage abstraction. The app talks only to this interface, so switching
 * from local mode to Supabase never touches the UI or the calculations.
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
  /** Persist the opening balance. In local mode the initial value is written once. */
  setOpeningBalance(amount: number): Promise<Account>;
  addTransaction(input: TransactionInput): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  addGoal(input: GoalInput): Promise<FinancialGoal>;
  updateGoal(id: string, patch: Partial<GoalInput>): Promise<FinancialGoal>;
  deleteGoal(id: string): Promise<void>;
  loadSampleData(): Promise<AppData>;
  resetAll(): Promise<AppData>;
}

/** Implemented by repositories that carry their own authentication. */
export interface AuthProvider {
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
}

export function isAuthProvider(
  repo: FinanceRepository,
): repo is FinanceRepository & AuthProvider {
  return typeof (repo as Partial<AuthProvider>).signIn === 'function';
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
}

export function configuredMode(): StorageMode {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

/**
 * Build the repository for the current environment. Supabase is used ONLY
 * when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present;
 * otherwise the app runs in documented local mode.
 */
export async function createRepository(): Promise<FinanceRepository> {
  if (isSupabaseConfigured()) {
    const { SupabaseFinanceRepository } = await import('./supabaseRepository');
    return new SupabaseFinanceRepository();
  }
  const { LocalFinanceRepository } = await import('./localRepository');
  return new LocalFinanceRepository();
}
