import { describe, expect, it } from 'vitest';
import {
  isDuplicateGoalName,
  isValidISODate,
  roundMoney,
  sanitizeTransactionInput,
  validateAmount,
  validateGoalInput,
  validateTransactionInput,
} from '../src/lib/validation';
import type { FinancialGoal } from '../src/types/finance';

describe('validateAmount', () => {
  it('accepts positive numbers with up to 2 decimals', () => {
    expect(validateAmount(300)).toBeNull();
    expect(validateAmount('300.5')).toBeNull();
    expect(validateAmount('0.01')).toBeNull();
    expect(validateAmount(999999999.99)).toBeNull();
  });

  it('rejects zero and negative amounts', () => {
    expect(validateAmount(0)).toBeTruthy();
    expect(validateAmount(-10)).toBeTruthy();
  });

  it('rejects NaN, empty and garbage input', () => {
    expect(validateAmount('')).toBeTruthy();
    expect(validateAmount('abc')).toBeTruthy();
    expect(validateAmount(NaN)).toBeTruthy();
    expect(validateAmount(Infinity)).toBeTruthy();
  });

  it('rejects amounts above the maximum', () => {
    expect(validateAmount(1_000_000_000)).toBeTruthy();
  });
});

describe('isValidISODate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidISODate('2026-10-24')).toBe(true);
    expect(isValidISODate('2028-02-29')).toBe(true); // leap year
  });

  it('rejects impossible or malformed dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('24-10-2026')).toBe(false);
    expect(isValidISODate('2026-10-24T00:00:00Z')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });
});

describe('validateTransactionInput', () => {
  const valid = {
    type: 'expense' as const,
    amount: 42.5,
    category: 'Food',
    date: '2026-10-24',
    description: 'Groceries',
  };

  it('accepts a valid transaction', () => {
    const result = validateTransactionInput(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('requires amount, category and date', () => {
    const result = validateTransactionInput({ type: 'expense' });
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.category).toBeTruthy();
    expect(result.errors.date).toBeTruthy();
  });

  it('rejects a category that does not belong to the type', () => {
    const result = validateTransactionInput({ ...valid, category: 'Salary' });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  it('accepts income categories for income type', () => {
    const result = validateTransactionInput({
      ...valid,
      type: 'income',
      category: 'Salary',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a bad type', () => {
    const result = validateTransactionInput({ ...valid, type: 'other' as never });
    expect(result.valid).toBe(false);
    expect(result.errors.type).toBeTruthy();
  });

  it('caps description length', () => {
    const result = validateTransactionInput({ ...valid, description: 'x'.repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.errors.description).toBeTruthy();
  });
});

describe('sanitizeTransactionInput', () => {
  it('rounds money to centimes and trims text', () => {
    const clean = sanitizeTransactionInput({
      type: 'income',
      amount: 10.005,
      category: '  Salary  ',
      date: '2026-10-24',
      description: '  bonus  ',
    });
    expect(clean.amount).toBe(10.01);
    expect(clean.category).toBe('Salary');
    expect(clean.description).toBe('bonus');
  });
});

describe('validateGoalInput', () => {
  it('accepts a valid goal', () => {
    const result = validateGoalInput({
      name: 'First 1,000 MAD',
      targetAmount: 1000,
      deadline: '2027-04-01',
    });
    expect(result.valid).toBe(true);
  });

  it('requires name, target and deadline', () => {
    const result = validateGoalInput({});
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['deadline', 'name', 'targetAmount']);
  });

  it('rejects a zero target', () => {
    const result = validateGoalInput({
      name: 'Broken goal',
      targetAmount: 0,
      deadline: '2027-04-01',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.targetAmount).toBeTruthy();
  });
});

describe('isDuplicateGoalName', () => {
  const goals: FinancialGoal[] = [
    {
      id: 'a',
      name: 'First 1,000 MAD',
      targetAmount: 1000,
      deadline: '2027-01-01',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('detects duplicates case-insensitively', () => {
    expect(isDuplicateGoalName('first 1,000 mad', goals)).toBe(true);
    expect(isDuplicateGoalName(' FIRST 1,000 MAD ', goals)).toBe(true);
    expect(isDuplicateGoalName(' Emergency ', goals)).toBe(false);
  });

  it('ignores the goal being edited', () => {
    expect(isDuplicateGoalName('First 1,000 MAD', goals, 'a')).toBe(false);
  });
});

describe('roundMoney', () => {
  it('rounds half up to 2 decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
