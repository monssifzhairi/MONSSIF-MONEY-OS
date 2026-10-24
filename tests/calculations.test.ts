import { describe, expect, it } from 'vitest';
import {
  calculateBalance,
  calculateTotals,
  categoryBreakdown,
  dashboardStats,
  goalProgress,
  monthlySeries,
  monthlySummaries,
  runningBalanceHistory,
} from '../src/lib/calculations';
import type { FinancialGoal, Transaction } from '../src/types/finance';

function tx(partial: Partial<Transaction> & { amount: number; type: 'income' | 'expense' }): Transaction {
  return {
    id: partial.id ?? `id-${Math.random().toString(16).slice(2)}`,
    type: partial.type,
    amount: partial.amount,
    category: partial.category ?? (partial.type === 'income' ? 'Salary' : 'Food'),
    date: partial.date ?? '2026-10-01',
    description: partial.description ?? '',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}

describe('calculateTotals', () => {
  it('sums income and expenses separately and computes net savings', () => {
    const transactions = [
      tx({ type: 'income', amount: 1000 }),
      tx({ type: 'income', amount: 250.5 }),
      tx({ type: 'expense', amount: 300 }),
      tx({ type: 'expense', amount: 49.5 }),
    ];
    const totals = calculateTotals(transactions);
    expect(totals.totalIncome).toBe(1250.5);
    expect(totals.totalExpense).toBe(349.5);
    expect(totals.netSavings).toBe(901);
  });

  it('returns zeros for an empty ledger', () => {
    expect(calculateTotals([])).toEqual({ totalIncome: 0, totalExpense: 0, netSavings: 0 });
  });

  it('rounds floating point noise to 2 decimals', () => {
    const totals = calculateTotals([
      tx({ type: 'income', amount: 0.1 }),
      tx({ type: 'income', amount: 0.2 }),
    ]);
    expect(totals.totalIncome).toBe(0.3);
  });
});

describe('calculateBalance', () => {
  it('starts from the opening balance (the real 300 MAD start)', () => {
    expect(calculateBalance(300, [])).toBe(300);
  });

  it('applies recorded income and expenses to the opening balance', () => {
    const transactions = [
      tx({ type: 'income', amount: 200 }),
      tx({ type: 'expense', amount: 80 }),
    ];
    expect(calculateBalance(300, transactions)).toBe(420);
  });

  it('never counts hypothetical income — only recorded transactions', () => {
    // An empty ledger means the balance is exactly the opening balance.
    expect(calculateBalance(300, [])).toBe(300);
  });

  it('can go negative when expenses exceed the opening balance', () => {
    const transactions = [tx({ type: 'expense', amount: 500 })];
    expect(calculateBalance(300, transactions)).toBe(-200);
  });
});

describe('monthlySeries', () => {
  it('returns continuous months including empty ones', () => {
    const series = monthlySeries([], 6);
    expect(series).toHaveLength(6);
    expect(series.every((p) => p.income === 0 && p.expense === 0)).toBe(true);
    // Keys must be strictly increasing YYYY-MM.
    const keys = series.map((p) => p.key);
    expect([...keys].sort()).toEqual(keys);
  });

  it('buckets transactions into the right month', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const series = monthlySeries(
      [
        tx({ type: 'income', amount: 500, date: thisMonth }),
        tx({ type: 'expense', amount: 100, date: thisMonth }),
      ],
      6,
    );
    const current = series[series.length - 1];
    expect(current.income).toBe(500);
    expect(current.expense).toBe(100);
    expect(current.net).toBe(400);
  });
});

describe('categoryBreakdown', () => {
  it('ranks categories by total and computes percentages', () => {
    const transactions = [
      tx({ type: 'expense', amount: 100, category: 'Food' }),
      tx({ type: 'expense', amount: 300, category: 'Rent' }),
      tx({ type: 'income', amount: 999, category: 'Salary' }),
    ];
    const slices = categoryBreakdown(transactions, 'expense');
    expect(slices.map((s) => s.category)).toEqual(['Rent', 'Food']);
    expect(slices[0].percentage).toBe(75);
    expect(slices[1].percentage).toBe(25);
    expect(slices[0].count).toBe(1);
  });

  it('ignores the other transaction type', () => {
    const slices = categoryBreakdown([tx({ type: 'income', amount: 10 })], 'expense');
    expect(slices).toEqual([]);
  });
});

describe('monthlySummaries', () => {
  it('returns newest months first with counts', () => {
    const summaries = monthlySummaries([
      tx({ type: 'income', amount: 100, date: '2026-09-10' }),
      tx({ type: 'expense', amount: 40, date: '2026-09-20' }),
      tx({ type: 'income', amount: 60, date: '2026-10-05' }),
    ]);
    expect(summaries[0].key).toBe('2026-10');
    expect(summaries[1].key).toBe('2026-09');
    expect(summaries[1].net).toBe(60);
    expect(summaries[1].transactionCount).toBe(2);
  });
});

describe('goalProgress', () => {
  const goal: FinancialGoal = {
    id: 'g1',
    name: 'First 1,000 MAD',
    targetAmount: 1000,
    deadline: '2027-01-01',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  it('measures progress against the actual balance (300 of 1,000 = 30%)', () => {
    const p = goalProgress(goal, 300, '2026-10-24');
    expect(p.saved).toBe(300);
    expect(p.remaining).toBe(700);
    expect(p.percent).toBe(30);
    expect(p.completed).toBe(false);
  });

  it('caps saved at the target and reports completion', () => {
    const p = goalProgress(goal, 1500, '2026-10-24');
    expect(p.saved).toBe(1000);
    expect(p.remaining).toBe(0);
    expect(p.percent).toBe(100);
    expect(p.completed).toBe(true);
    expect(p.overdue).toBe(false);
  });

  it('flags overdue goals that are not yet funded', () => {
    const p = goalProgress(goal, 500, '2027-06-01');
    expect(p.overdue).toBe(true);
  });

  it('computes days left from the as-of date', () => {
    const p = goalProgress(goal, 500, '2026-12-31');
    expect(p.daysLeft).toBe(1);
  });

  it('treats negative balances as zero progress', () => {
    const p = goalProgress(goal, -50, '2026-10-24');
    expect(p.saved).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.remaining).toBe(1000);
  });
});

describe('dashboardStats', () => {
  it('aggregates balance and recent-month flows', () => {
    const stats = dashboardStats(
      300,
      [tx({ type: 'income', amount: 200, date: '2026-10-12' })],
      '2026-10-24',
    );
    expect(stats.balance).toBe(500);
    expect(stats.totals.totalIncome).toBe(200);
  });
});

describe('runningBalanceHistory (balance history visualization)', () => {
  it('is driven only by recorded data — single point when the ledger is empty', () => {
    const points = runningBalanceHistory(300, [], '2026-10-24');
    expect(points).toEqual([{ date: '2026-10-24', balance: 300 }]);
  });

  it('tracks the running balance day by day from the first entry', () => {
    const points = runningBalanceHistory(
      300,
      [
        tx({ type: 'income', amount: 200, date: '2026-10-22' }),
        tx({ type: 'expense', amount: 80, date: '2026-10-23' }),
      ],
      '2026-10-24',
    );
    expect(points[0]).toEqual({ date: '2026-10-22', balance: 500 });
    expect(points[1]).toEqual({ date: '2026-10-23', balance: 420 });
    expect(points[2]).toEqual({ date: '2026-10-24', balance: 420 });
    expect(calculateBalance(300, [])).toBe(300);
  });

  it('final point equals the authoritative current balance', () => {
    const transactions = [
      tx({ type: 'income', amount: 450, date: '2026-10-10' }),
      tx({ type: 'expense', amount: 120, date: '2026-10-15' }),
    ];
    const points = runningBalanceHistory(300, transactions, '2026-10-24');
    expect(points[points.length - 1].balance).toBe(
      calculateBalance(300, transactions),
    );
  });
});

/* ─── Financial-correctness matrix (release gate) ─────────────────────────── */

describe('financial edge-case matrix', () => {
  it('income only: expenses stay zero and net equals income', () => {
    const t = calculateTotals([tx({ type: 'income', amount: 900 }), tx({ type: 'income', amount: 600 })]);
    expect(t.totalIncome).toBe(1500);
    expect(t.totalExpense).toBe(0);
    expect(t.netSavings).toBe(1500);
    expect(calculateBalance(300, [tx({ type: 'income', amount: 900 })])).toBe(1200);
  });

  it('expenses only: income stays zero and balance can drop below the opening', () => {
    const t = calculateTotals([tx({ type: 'expense', amount: 250 }), tx({ type: 'expense', amount: 220 })]);
    expect(t.totalIncome).toBe(0);
    expect(t.totalExpense).toBe(470);
    expect(t.netSavings).toBe(-470);
    expect(calculateBalance(300, [tx({ type: 'expense', amount: 400 })])).toBe(-100);
  });

  it('negative net cash flow shows negative monthly net without inventing income', () => {
    const series = monthlySeries(
      [tx({ type: 'expense', amount: 500, date: '2026-10-05' })],
      6,
    );
    const oct = series.find((m) => m.key === '2026-10');
    expect(oct?.income).toBe(0);
    expect(oct?.expense).toBe(500);
    expect(oct?.net).toBe(-500);
  });

  it('goal completion fires exactly at the 1,000 MAD target', () => {
    const goal: FinancialGoal = {
      id: 'g2',
      name: 'First 1,000 MAD',
      targetAmount: 1000,
      deadline: '2027-01-01',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };
    expect(goalProgress(goal, 999.99, '2026-10-24').completed).toBe(false);
    const exact = goalProgress(goal, 1000, '2026-10-24');
    expect(exact.completed).toBe(true);
    expect(exact.percent).toBe(100);
    expect(exact.remaining).toBe(0);
    // 300 MAD opening alone = 30% of the 1,000 MAD goal.
    expect(goalProgress(goal, 300, '2026-10-24').percent).toBe(30);
  });

  it('zero transactions: every summary stays at zero and balance equals opening', () => {
    expect(calculateTotals([]).totalIncome).toBe(0);
    expect(calculateTotals([]).totalExpense).toBe(0);
    expect(calculateBalance(300, [])).toBe(300);
    expect(runningBalanceHistory(300, [])).toEqual([{ date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), balance: 300 }]);
  });
});
