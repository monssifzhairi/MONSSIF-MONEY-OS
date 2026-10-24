/**
 * Global finance state. Owns the repository instance for the current mode
 * (local demo or authenticated Supabase), keeps an in-memory copy of AppData,
 * and exposes typed actions to the UI.
 *
 * The repository is chosen from the AUTH state:
 *  - `local-demo`    → LocalFinanceRepository (browser-only)
 *  - `authenticated` → SupabaseFinanceRepository (session-scoped, RLS)
 *  - anything else   → no repository; protected pages are unreachable.
 * Data is cleared whenever the authenticated user changes (e.g. sign-out).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Account,
  AppData,
  FinancialGoal,
  GoalInput,
  StorageMode,
  Transaction,
  TransactionInput,
} from '../types/finance';
import type { FinanceRepository } from './repository';
import { LocalFinanceRepository } from './localRepository';
import { ValidationError } from './errors';
import { useAuth } from '../auth/AuthContext';

export interface FinanceContextValue {
  ready: boolean;
  error: string | null;
  mode: StorageMode;
  data: AppData;
  setOpeningBalance: (amount: number) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<TransactionInput>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addGoal: (input: GoalInput) => Promise<FinancialGoal>;
  updateGoal: (id: string, patch: Partial<GoalInput>) => Promise<FinancialGoal>;
  deleteGoal: (id: string) => Promise<void>;
  loadSampleData: () => Promise<void>;
  resetAll: () => Promise<void>;
  completeSetup: (openingBalance: number, withSampleData: boolean) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function emptyData(): AppData {
  return {
    version: 1,
    account: {
      id: 'loading',
      name: 'Main account',
      currency: 'MAD',
      openingBalance: 0,
      openingBalanceSetAt: null,
      createdAt: new Date().toISOString(),
    },
    transactions: [],
    goals: [],
    settings: { setupComplete: false, sampleDataLoaded: false },
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof ValidationError) {
    return Object.values(err.errors)[0] ?? 'Invalid input.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const [repo, setRepo] = useState<FinanceRepository | null>(null);
  const [data, setData] = useState<AppData>(emptyData());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Repository lifecycle follows auth state ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (status === 'loading') {
        setReady(false);
        return;
      }

      if (status === 'local-demo') {
        const local = new LocalFinanceRepository();
        try {
          const loaded = await local.load();
          if (cancelled) return;
          setRepo(local);
          setData(loaded);
          setError(null);
        } catch (err) {
          if (!cancelled) setError(errorMessage(err));
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }

      if (status === 'authenticated') {
        try {
          const { SupabaseFinanceRepository } = await import('./supabaseRepository');
          const cloud = new SupabaseFinanceRepository();
          const loaded = await cloud.load();
          if (cancelled) return;
          setRepo(cloud);
          setData(loaded);
          setError(null);
        } catch (err) {
          if (cancelled) return;
          setRepo(null);
          setData(emptyData());
          setError(errorMessage(err));
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }

      // unconfigured / anonymous → nothing loaded; clear any previous data
      // (important on sign-out so another user cannot see it).
      setRepo(null);
      setData(emptyData());
      setError(null);
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);

  const guard = useCallback(
    async <T,>(fn: (r: FinanceRepository) => Promise<T>): Promise<T> => {
      if (!repo) throw new Error('Storage is not ready yet.');
      try {
        return await fn(repo);
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [repo],
  );

  const setOpeningBalance = useCallback(
    async (amount: number) => {
      const account = await guard((r) => r.setOpeningBalance(amount));
      setData((d) => ({ ...d, account }));
    },
    [guard],
  );

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      const tx = await guard((r) => r.addTransaction(input));
      setData((d) => ({ ...d, transactions: [tx, ...d.transactions] }));
      return tx;
    },
    [guard],
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<TransactionInput>) => {
      const tx = await guard((r) => r.updateTransaction(id, patch));
      setData((d) => ({
        ...d,
        transactions: d.transactions.map((t) => (t.id === id ? tx : t)),
      }));
      return tx;
    },
    [guard],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await guard((r) => r.deleteTransaction(id));
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    },
    [guard],
  );

  const addGoal = useCallback(
    async (input: GoalInput) => {
      const goal = await guard((r) => r.addGoal(input));
      setData((d) => ({ ...d, goals: [goal, ...d.goals] }));
      return goal;
    },
    [guard],
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<GoalInput>) => {
      const goal = await guard((r) => r.updateGoal(id, patch));
      setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? goal : g)) }));
      return goal;
    },
    [guard],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await guard((r) => r.deleteGoal(id));
      setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
    },
    [guard],
  );

  const loadSampleData = useCallback(async () => {
    const loaded = await guard((r) => r.loadSampleData());
    setData(loaded);
  }, [guard]);

  const resetAll = useCallback(async () => {
    const loaded = await guard((r) => r.resetAll());
    setData(loaded);
  }, [guard]);

  const completeSetup = useCallback(
    async (openingBalance: number, withSampleData: boolean) => {
      if (withSampleData) {
        // Local demo mode only — the cloud repository refuses this so real
        // accounts never contain fabricated transactions.
        await guard((r) => r.loadSampleData());
      }
      await guard((r) => r.setOpeningBalance(openingBalance));
      if (repo) setData(await repo.load());
    },
    [guard, repo],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ready,
      error,
      mode: repo?.mode ?? (status === 'authenticated' ? 'supabase' : 'local'),
      data,
      setOpeningBalance,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addGoal,
      updateGoal,
      deleteGoal,
      loadSampleData,
      resetAll,
      completeSetup,
    }),
    [
      ready,
      error,
      repo,
      status,
      data,
      setOpeningBalance,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addGoal,
      updateGoal,
      deleteGoal,
      loadSampleData,
      resetAll,
      completeSetup,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>');
  return ctx;
}

export type { Account, AppData, FinancialGoal, Transaction };
