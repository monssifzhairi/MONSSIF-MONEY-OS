/**
 * Input validation shared by the UI forms and the data layer.
 * Every rule is enforced on the client; the Supabase schema adds the same
 * constraints again at the database level (checks, not-null, numeric bounds).
 */

import type { FinancialGoal, GoalInput, TransactionInput, TransactionType } from '../types/finance';

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Gift',
  'Refund',
  'Investment',
  'Other income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Food',
  'Rent',
  'Transport',
  'Utilities',
  'Health',
  'Shopping',
  'Education',
  'Entertainment',
  'Subscriptions',
  'Other expense',
] as const;

export const ALL_CATEGORIES: string[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function categoriesForType(type: TransactionType): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const MAX_AMOUNT = 999_999_999.99;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_GOAL_NAME_LENGTH = 80;

/** Amounts are stored with at most 2 decimal places (centimes). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAmount(raw: number | string): string | null {
  const n = typeof raw === 'string' ? Number(raw.replace(',', '.')) : raw;
  if (raw === '' || raw === null || raw === undefined || Number.isNaN(n)) {
    return 'Enter a valid amount.';
  }
  if (!Number.isFinite(n)) return 'Enter a valid amount.';
  if (n <= 0) return 'Amount must be greater than zero.';
  if (n > MAX_AMOUNT) return 'Amount is too large.';
  if (Math.round(n * 100) !== n * 100 && String(n).split('.')[1]?.length > 2) {
    return 'Use at most 2 decimal places.';
  }
  return null;
}

export function validateTransactionInput(input: Partial<TransactionInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.type = 'Type must be income or expense.';
  }

  const amountError = validateAmount(input.amount as number | string);
  if (amountError) errors.amount = amountError;

  const category = (input.category ?? '').trim();
  if (!category) {
    errors.category = 'Category is required.';
  } else if (input.type && !categoriesForType(input.type as TransactionType).includes(category)) {
    errors.category = 'Choose a valid category for this type.';
  }

  const date = input.date ?? '';
  if (!date) {
    errors.date = 'Date is required.';
  } else if (!isValidISODate(date)) {
    errors.date = 'Enter a valid date (YYYY-MM-DD).';
  }

  const description = input.description ?? '';
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateGoalInput(input: Partial<GoalInput>): ValidationResult {
  const errors: Record<string, string> = {};

  const name = (input.name ?? '').trim();
  if (!name) errors.name = 'Goal name is required.';
  else if (name.length > MAX_GOAL_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_GOAL_NAME_LENGTH} characters or fewer.`;
  }

  const amountError = validateAmount(input.targetAmount as number | string);
  if (amountError) errors.targetAmount = amountError;

  const deadline = input.deadline ?? '';
  if (!deadline) {
    errors.deadline = 'Deadline is required.';
  } else if (!isValidISODate(deadline)) {
    errors.deadline = 'Enter a valid date (YYYY-MM-DD).';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function sanitizeTransactionInput(input: Partial<TransactionInput>): TransactionInput {
  return {
    type: (input.type ?? 'expense') as TransactionType,
    amount: roundMoney(Number(input.amount)),
    category: (input.category ?? '').trim(),
    date: input.date ?? '',
    description: (input.description ?? '').trim(),
  };
}

export function sanitizeGoalInput(input: Partial<GoalInput>): GoalInput {
  return {
    name: (input.name ?? '').trim(),
    targetAmount: roundMoney(Number(input.targetAmount)),
    deadline: input.deadline ?? '',
  };
}

/** Exported for tests: goal names must be unique across active goals. */
export function isDuplicateGoalName(
  name: string,
  goals: FinancialGoal[],
  excludeId?: string,
): boolean {
  const normalized = name.trim().toLowerCase();
  return goals.some(
    (g) => g.id !== excludeId && g.name.trim().toLowerCase() === normalized,
  );
}
