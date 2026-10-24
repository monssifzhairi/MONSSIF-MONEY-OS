/**
 * Local development mode: the full dataset lives in browser localStorage.
 * Everything (opening balance, transactions, goals) survives reloads and
 * works with zero configuration. This is a real store, not a mock — the
 * calculations and validation are identical to Supabase mode.
 */

import type {
  Account,
  AppData,
  FinancialGoal,
  GoalInput,
  Transaction,
  TransactionInput,
} from '../types/finance';
import { sanitizeGoalInput, sanitizeTransactionInput, validateGoalInput, validateTransactionInput, roundMoney } from '../lib/validation';
import { newId } from '../lib/id';
import { sampleAppData } from './sampleData';
import { ValidationError } from './errors';
import type { FinanceRepository } from './repository';

export { ValidationError };

const STORAGE_KEY = 'monssif-money-os:v1';

function defaultData(): AppData {
  const now = new Date().toISOString();
  return {
    version: 1,
    account: {
      id: newId(),
      name: 'Main account',
      currency: 'MAD',
      openingBalance: 0,
      openingBalanceSetAt: null,
      createdAt: now,
    },
    transactions: [],
    goals: [],
    settings: { setupComplete: false, sampleDataLoaded: false },
  };
}

export class LocalFinanceRepository implements FinanceRepository {
  readonly mode = 'local' as const;
  private data: AppData;

  constructor() {
    this.data = this.read();
  }

  private read(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.version !== 1 || !parsed.account) return defaultData();
      return {
        version: 1,
        account: parsed.account,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        goals: Array.isArray(parsed.goals) ? parsed.goals : [],
        settings: parsed.settings ?? { setupComplete: false, sampleDataLoaded: false },
      };
    } catch {
      return defaultData();
    }
  }

  private write(data: AppData): AppData {
    this.data = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  async load(): Promise<AppData> {
    return this.data;
  }

  async setOpeningBalance(amount: number): Promise<Account> {
    const value = roundMoney(Number(amount));
    if (!Number.isFinite(value) || value < 0) {
      throw new ValidationError({ openingBalance: 'Starting balance must be zero or more.' });
    }
    const account: Account = {
      ...this.data.account,
      openingBalance: value,
      // Written exactly once; later changes keep the original timestamp
      // but never create a duplicate initialization transaction.
      openingBalanceSetAt: this.data.account.openingBalanceSetAt ?? new Date().toISOString(),
    };
    this.write({
      ...this.data,
      account,
      settings: { ...this.data.settings, setupComplete: true },
    });
    return account;
  }

  async addTransaction(input: TransactionInput): Promise<Transaction> {
    const clean = sanitizeTransactionInput(input);
    const result = validateTransactionInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: newId(),
      ...clean,
      createdAt: now,
      updatedAt: now,
    };
    this.write({ ...this.data, transactions: [tx, ...this.data.transactions] });
    return tx;
  }

  async updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<Transaction> {
    const existing = this.data.transactions.find((t) => t.id === id);
    if (!existing) throw new Error('Transaction not found.');
    const clean = sanitizeTransactionInput({ ...existing, ...patch });
    const result = validateTransactionInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const updated: Transaction = {
      ...existing,
      ...clean,
      updatedAt: new Date().toISOString(),
    };
    this.write({
      ...this.data,
      transactions: this.data.transactions.map((t) => (t.id === id ? updated : t)),
    });
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const next = this.data.transactions.filter((t) => t.id !== id);
    if (next.length === this.data.transactions.length) {
      throw new Error('Transaction not found.');
    }
    this.write({ ...this.data, transactions: next });
  }

  async addGoal(input: GoalInput): Promise<FinancialGoal> {
    const clean = sanitizeGoalInput(input);
    const result = validateGoalInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const now = new Date().toISOString();
    const goal: FinancialGoal = { id: newId(), ...clean, createdAt: now, updatedAt: now };
    this.write({ ...this.data, goals: [goal, ...this.data.goals] });
    return goal;
  }

  async updateGoal(id: string, patch: Partial<GoalInput>): Promise<FinancialGoal> {
    const existing = this.data.goals.find((g) => g.id === id);
    if (!existing) throw new Error('Goal not found.');
    const clean = sanitizeGoalInput({ ...existing, ...patch });
    const result = validateGoalInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const updated: FinancialGoal = {
      ...existing,
      ...clean,
      updatedAt: new Date().toISOString(),
    };
    this.write({
      ...this.data,
      goals: this.data.goals.map((g) => (g.id === id ? updated : g)),
    });
    return updated;
  }

  async deleteGoal(id: string): Promise<void> {
    const next = this.data.goals.filter((g) => g.id !== id);
    if (next.length === this.data.goals.length) {
      throw new Error('Goal not found.');
    }
    this.write({ ...this.data, goals: next });
  }

  async loadSampleData(): Promise<AppData> {
    const sample = sampleAppData();
    const alreadyInitialized = this.data.account.openingBalanceSetAt !== null;
    return this.write({
      ...sample,
      account: {
        ...sample.account,
        // Sample data must never re-initialize (or overwrite) a real
        // starting balance that was already set exactly once.
        openingBalance: alreadyInitialized
          ? this.data.account.openingBalance
          : sample.account.openingBalance,
        openingBalanceSetAt:
          this.data.account.openingBalanceSetAt ?? sample.account.openingBalanceSetAt,
      },
      settings: { setupComplete: true, sampleDataLoaded: true },
    });
  }

  async resetAll(): Promise<AppData> {
    localStorage.removeItem(STORAGE_KEY);
    return this.write(defaultData());
  }
}
