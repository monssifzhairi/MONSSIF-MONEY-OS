/**
 * Core domain types for MONSSIF MONEY OS.
 * These mirror the Supabase schema in `supabase/migrations/0001_init.sql`.
 */

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Always positive. Direction is defined by `type`. */
  amount: number;
  category: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  /** ISO date, `YYYY-MM-DD`. */
  deadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  currency: 'MAD';
  /**
   * Opening balance, stored separately from transactions.
   * Set exactly once during initial setup; afterwards only changed through
   * the explicit Settings workflow. Never duplicated as a transaction.
   */
  openingBalance: number;
  openingBalanceSetAt: string | null;
  createdAt: string;
}

export interface AppSettings {
  setupComplete: boolean;
  sampleDataLoaded: boolean;
}

export interface AppData {
  version: 1;
  account: Account;
  transactions: Transaction[];
  goals: FinancialGoal[];
  settings: AppSettings;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  deadline: string;
}

export type StorageMode = 'local' | 'supabase';
