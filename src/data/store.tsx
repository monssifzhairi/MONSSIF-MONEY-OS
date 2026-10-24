/**
 * Global finance state. A single provider owns the repository instance,
 * keeps an in-memory copy of AppData, and exposes typed actions to the UI.
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
import { createRepository, isAuthProvider, type FinanceRepository } from './repository';
import { AuthRequiredError, ValidationError } from './errors';

export interface FinanceContextValue {
  ready: boolean;
  error: string | null;
  mode: StorageMode;
  data: AppData;
  /** True when Supabase is configured but nobody is signed in yet. */
  needsAuth: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
  const [repo, setRepo] = useState<FinanceRepository | null>(null);
  const [data, setData] = useState<AppData>(emptyData());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repository = await createRepository();
        const loaded = await repository.load();
        if (cancelled) return;
        setRepo(repository);
        setData(loaded);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthRequiredError) {
          const repository = await createRepository();
          setRepo(repository);
          setNeedsAuth(true);
        } else {
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!repo || !isAuthProvider(repo)) {
        throw new Error('Sign-in is only available in Supabase mode.');
      }
      await repo.signIn(email, password);
      const loaded = await repo.load();
      setData(loaded);
      setNeedsAuth(false);
      setError(null);
    },
    [repo],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!repo || !isAuthProvider(repo)) {
        throw new Error('Sign-up is only available in Supabase mode.');
      }
      await repo.signUp(email, password);
      if (repo.mode === 'supabase') {
        // Email confirmation may leave the session empty — try loading, else
        // keep the auth screen with a friendly note.
        try {
          const loaded = await repo.load();
          setData(loaded);
          setNeedsAuth(false);
          setError(null);
        } catch {
          setError('Account created. Confirm your email if required, then sign in.');
          setNeedsAuth(true);
        }
      }
    },
    [repo],
  );

  const guard = useCallback(
    async <T,>(fn: (r: FinanceRepository) => Promise<T>): Promise<T> => {
      if (!repo) throw new Error('Storage is still initializing.');
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
        // Sample records first, then the user's chosen starting balance so it
        // is initialized exactly once — sample data can never re-do it.
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
      mode: repo?.mode ?? 'local',
      data,
      needsAuth,
      signIn,
      signUp,
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
      data,
      needsAuth,
      signIn,
      signUp,
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
