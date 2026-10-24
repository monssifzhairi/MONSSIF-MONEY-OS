/**
 * Sample dataset for local development mode. Realistic small-scale data
 * anchored on the user's real starting point: 300 MAD opening balance and a
 * 1,000 MAD first target. Loaded explicitly — never silently mixed with
 * real records.
 */

import type { AppData, Transaction } from '../types/finance';
import { addMonthsISO, todayISO } from '../lib/format';
import { newId } from '../lib/id';

interface SampleTx {
  /** Days in the past (0 = today). */
  daysAgo: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}

const SAMPLE_TRANSACTIONS: SampleTx[] = [
  { daysAgo: 84, type: 'income', amount: 450, category: 'Freelance', description: 'Logo design for a local shop' },
  { daysAgo: 80, type: 'expense', amount: 65, category: 'Food', description: 'Weekly groceries' },
  { daysAgo: 74, type: 'expense', amount: 40, category: 'Transport', description: 'Train tickets' },
  { daysAgo: 68, type: 'income', amount: 220, category: 'Freelance', description: 'Social media management' },
  { daysAgo: 61, type: 'expense', amount: 55, category: 'Utilities', description: 'Phone and internet' },
  { daysAgo: 55, type: 'expense', amount: 70, category: 'Food', description: 'Groceries' },
  { daysAgo: 48, type: 'income', amount: 300, category: 'Business', description: 'Selling used textbooks' },
  { daysAgo: 42, type: 'expense', amount: 35, category: 'Education', description: 'Online course material' },
  { daysAgo: 36, type: 'expense', amount: 48, category: 'Health', description: 'Pharmacy' },
  { daysAgo: 30, type: 'income', amount: 380, category: 'Freelance', description: 'Website landing page' },
  { daysAgo: 24, type: 'expense', amount: 60, category: 'Food', description: 'Groceries' },
  { daysAgo: 18, type: 'expense', amount: 25, category: 'Subscriptions', description: 'Design tool subscription' },
  { daysAgo: 12, type: 'income', amount: 150, category: 'Gift', description: 'Birthday gift from family' },
  { daysAgo: 7, type: 'expense', amount: 42, category: 'Transport', description: 'Fuel and taxi' },
  { daysAgo: 3, type: 'expense', amount: 30, category: 'Entertainment', description: 'Cinema with friends' },
  { daysAgo: 1, type: 'income', amount: 90, category: 'Refund', description: 'Returned a duplicate order' },
];

function isoDaysAgo(days: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sampleTransactions(): Transaction[] {
  return SAMPLE_TRANSACTIONS.map((s) => {
    const now = new Date().toISOString();
    return {
      id: newId(),
      type: s.type,
      amount: s.amount,
      category: s.category,
      date: isoDaysAgo(s.daysAgo),
      description: s.description,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function sampleAppData(): AppData {
  const now = new Date().toISOString();
  return {
    version: 1,
    account: {
      id: newId(),
      name: 'Main account',
      currency: 'MAD',
      // The user's documented starting point — 300 MAD, exactly once.
      openingBalance: 300,
      openingBalanceSetAt: now,
      createdAt: now,
    },
    transactions: sampleTransactions(),
    goals: [
      {
        id: newId(),
        name: 'First 1,000 MAD',
        targetAmount: 1000,
        deadline: addMonthsISO(todayISO(), 6),
        createdAt: now,
        updatedAt: now,
      },
    ],
    settings: { setupComplete: true, sampleDataLoaded: true },
  };
}
