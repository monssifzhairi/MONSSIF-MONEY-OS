/**
 * Supabase mode: persistent storage against Supabase Postgres with Row Level
 * Security (see `supabase/migrations/0001_init.sql`).
 *
 * Privacy & security rules:
 *  - The user id is ALWAYS taken from the authenticated session
 *    (server-verified JWT). It is never accepted from call parameters, so the
 *    frontend cannot read or write another user's rows even by tampering.
 *  - RLS re-checks ownership on every statement server-side.
 *  - This module is loaded ONLY when VITE_SUPABASE_URL and
 *    VITE_SUPABASE_ANON_KEY are configured. The anon key is safe for the
 *    browser. A service_role key must NEVER appear anywhere in frontend code.
 *  - Cloud mode never fabricates financial records: `loadSampleData` refuses
 *    to run so demo data can never enter a real user's account.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  Account,
  AppData,
  FinancialGoal,
  GoalInput,
  Transaction,
  TransactionInput,
} from '../types/finance';
import {
  sanitizeGoalInput,
  sanitizeTransactionInput,
  validateGoalInput,
  validateTransactionInput,
  roundMoney,
} from '../lib/validation';
import type { FinanceRepository } from './repository';
import { AuthRequiredError, ValidationError } from './errors';
import { getSupabaseClient } from './supabaseClient';

interface DbTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DbGoal {
  id: string;
  name: string;
  target_amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

interface DbAccount {
  id: string;
  name: string;
  currency: string;
  opening_balance: number;
  opening_balance_set_at: string | null;
  created_at: string;
}

function mapTransaction(row: DbTransaction): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    description: row.description ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGoal(row: DbGoal): FinancialGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccount(row: DbAccount): Account {
  return {
    id: row.id,
    name: row.name,
    currency: 'MAD',
    openingBalance: Number(row.opening_balance),
    openingBalanceSetAt: row.opening_balance_set_at,
    createdAt: row.created_at,
  };
}

export class SupabaseFinanceRepository implements FinanceRepository {
  readonly mode = 'supabase' as const;
  private client: SupabaseClient;
  private user: User | null = null;

  constructor() {
    this.client = getSupabaseClient();
  }

  /**
   * Resolve the CURRENT session user. Every query is scoped to this id, and
   * RLS enforces the same scope again on the server. Throws when no session
   * exists — there is no way to operate on behalf of someone else.
   */
  private async requireUser(): Promise<User> {
    if (this.user) return this.user;
    const { data } = await this.client.auth.getSession();
    if (data.session?.user) {
      this.user = data.session.user;
      return data.session.user;
    }
    throw new AuthRequiredError('Sign in to access your financial data.');
  }

  private async fetchAccount(userId: string): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return mapAccount(data as DbAccount);

    // First run for this user: create the account row exactly once
    // (the unique index on user_id prevents duplicates under concurrency).
    const { data: created, error: insertError } = await this.client
      .from('accounts')
      .insert({
        user_id: userId,
        name: 'Main account',
        currency: 'MAD',
        opening_balance: 0,
      })
      .select('*')
      .single();
    if (insertError) throw new Error(insertError.message);
    return mapAccount(created as DbAccount);
  }

  async load(): Promise<AppData> {
    const user = await this.requireUser();
    const account = await this.fetchAccount(user.id);

    const [txResult, goalResult] = await Promise.all([
      this.client
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      this.client
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (txResult.error) throw new Error(txResult.error.message);
    if (goalResult.error) throw new Error(goalResult.error.message);

    return {
      version: 1,
      account,
      transactions: (txResult.data as DbTransaction[]).map(mapTransaction),
      goals: (goalResult.data as DbGoal[]).map(mapGoal),
      settings: {
        setupComplete: account.openingBalanceSetAt !== null,
        sampleDataLoaded: false,
      },
    };
  }

  async setOpeningBalance(amount: number): Promise<Account> {
    const user = await this.requireUser();
    const value = roundMoney(Number(amount));
    if (!Number.isFinite(value) || value < 0) {
      throw new ValidationError({ openingBalance: 'Starting balance must be zero or more.' });
    }
    const account = await this.fetchAccount(user.id);
    const { data, error } = await this.client
      .from('accounts')
      .update({
        opening_balance: value,
        // `opening_balance_set_at` is written only if still null, so the
        // one-time initialization can never be duplicated by later edits.
        opening_balance_set_at: account.openingBalanceSetAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapAccount(data as DbAccount);
  }

  async addTransaction(input: TransactionInput): Promise<Transaction> {
    const user = await this.requireUser();
    const clean = sanitizeTransactionInput(input);
    const result = validateTransactionInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const account = await this.fetchAccount(user.id);
    const { data, error } = await this.client
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: account.id,
        type: clean.type,
        amount: clean.amount,
        category: clean.category,
        date: clean.date,
        description: clean.description || null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapTransaction(data as DbTransaction);
  }

  async updateTransaction(id: string, patch: Partial<TransactionInput>): Promise<Transaction> {
    const user = await this.requireUser();
    const { data: existing, error: fetchError } = await this.client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw new Error('Transaction not found.');

    const clean = sanitizeTransactionInput({
      ...mapTransaction(existing as DbTransaction),
      ...patch,
    });
    const result = validateTransactionInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);

    const { data, error } = await this.client
      .from('transactions')
      .update({
        type: clean.type,
        amount: clean.amount,
        category: clean.category,
        date: clean.date,
        description: clean.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapTransaction(data as DbTransaction);
  }

  async deleteTransaction(id: string): Promise<void> {
    const user = await this.requireUser();
    const { error } = await this.client
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  }

  async addGoal(input: GoalInput): Promise<FinancialGoal> {
    const user = await this.requireUser();
    const clean = sanitizeGoalInput(input);
    const result = validateGoalInput(clean);
    if (!result.valid) throw new ValidationError(result.errors);
    const account = await this.fetchAccount(user.id);
    const { data, error } = await this.client
      .from('financial_goals')
      .insert({
        user_id: user.id,
        account_id: account.id,
        name: clean.name,
        target_amount: clean.targetAmount,
        deadline: clean.deadline,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapGoal(data as DbGoal);
  }

  async updateGoal(id: string, patch: Partial<GoalInput>): Promise<FinancialGoal> {
    const user = await this.requireUser();
    const { data: existing, error: fetchError } = await this.client
      .from('financial_goals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!existing) throw new Error('Goal not found.');

    const merged = sanitizeGoalInput({ ...mapGoal(existing as DbGoal), ...patch });
    const result = validateGoalInput(merged);
    if (!result.valid) throw new ValidationError(result.errors);

    const { data, error } = await this.client
      .from('financial_goals')
      .update({
        name: merged.name,
        target_amount: merged.targetAmount,
        deadline: merged.deadline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapGoal(data as DbGoal);
  }

  async deleteGoal(id: string): Promise<void> {
    const user = await this.requireUser();
    const { error } = await this.client
      .from('financial_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
  }

  async loadSampleData(): Promise<AppData> {
    // Hard refusal: demo/sample records must never enter a real user's
    // account. Sample data exists only in local demo mode.
    throw new Error(
      'Sample data is only available in Local Demo Mode. Cloud accounts stay free of fabricated records.',
    );
  }

  async resetAll(): Promise<AppData> {
    const user = await this.requireUser();
    const account = await this.fetchAccount(user.id);
    const { error: txError } = await this.client
      .from('transactions')
      .delete()
      .eq('user_id', user.id);
    if (txError) throw new Error(txError.message);
    const { error: goalError } = await this.client
      .from('financial_goals')
      .delete()
      .eq('user_id', user.id);
    if (goalError) throw new Error(goalError.message);
    const { error: accountError } = await this.client
      .from('accounts')
      .update({
        opening_balance: 0,
        opening_balance_set_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .eq('user_id', user.id);
    if (accountError) throw new Error(accountError.message);
    return this.load();
  }
}
