/**
 * Pure financial calculations. No I/O, no React — fully unit-testable.
 *
 * Ground rules:
 *  - The balance is derived ONLY from the opening balance plus recorded
 *    transactions. Hypothetical / future income is never counted.
 *  - Amounts are rounded to 2 decimals (centimes) at every step.
 */

import type { FinancialGoal, Transaction, TransactionType } from '../types/finance';
import { roundMoney } from './validation';
import { daysBetween, monthKey, todayISO } from './format';

export interface Totals {
  totalIncome: number;
  totalExpense: number;
  /** Income minus expenses from recorded transactions. */
  netSavings: number;
}

export function calculateTotals(transactions: Transaction[]): Totals {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  }
  return {
    totalIncome: roundMoney(totalIncome),
    totalExpense: roundMoney(totalExpense),
    netSavings: roundMoney(totalIncome - totalExpense),
  };
}

/** Current balance = opening balance + income − expenses (recorded only). */
export function calculateBalance(openingBalance: number, transactions: Transaction[]): number {
  const { netSavings } = calculateTotals(transactions);
  return roundMoney(openingBalance + netSavings);
}

export interface MonthlyPoint {
  key: string; // YYYY-MM
  label: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Income vs expense per calendar month for the last `months` months
 * (including the current one), oldest first. Months without data are
 * included with zeros so the chart has a continuous axis.
 */
export function monthlySeries(transactions: Transaction[], months = 6): MonthlyPoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  const map = new Map<string, { income: number; expense: number }>();
  for (const key of keys) map.set(key, { income: 0, expense: 0 });

  for (const tx of transactions) {
    const key = monthKey(tx.date);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expense += tx.amount;
  }

  return keys.map((key) => {
    const bucket = map.get(key)!;
    const income = roundMoney(bucket.income);
    const expense = roundMoney(bucket.expense);
    return {
      key,
      label: key,
      income,
      expense,
      net: roundMoney(income - expense),
    };
  });
}

export interface CategorySlice {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

/** Ranked category breakdown for one transaction type. */
export function categoryBreakdown(
  transactions: Transaction[],
  type: TransactionType,
): CategorySlice[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const bucket = map.get(tx.category) ?? { total: 0, count: 0 };
    bucket.total += tx.amount;
    bucket.count += 1;
    map.set(tx.category, bucket);
  }
  const grandTotal = [...map.values()].reduce((sum, b) => sum + b.total, 0);
  return [...map.entries()]
    .map(([category, b]) => ({
      category,
      total: roundMoney(b.total),
      count: b.count,
      percentage: grandTotal === 0 ? 0 : roundMoney((b.total / grandTotal) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MonthSummary {
  key: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

/** Monthly summaries for the whole history, newest month first. */
export function monthlySummaries(transactions: Transaction[]): MonthSummary[] {
  const map = new Map<string, { income: number; expense: number; count: number }>();
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    const bucket = map.get(key) ?? { income: 0, expense: 0, count: 0 };
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expense += tx.amount;
    bucket.count += 1;
    map.set(key, bucket);
  }
  return [...map.entries()]
    .map(([key, b]) => {
      const income = roundMoney(b.income);
      const expense = roundMoney(b.expense);
      return {
        key,
        income,
        expense,
        net: roundMoney(income - expense),
        transactionCount: b.count,
      };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

export interface GoalProgress {
  goal: FinancialGoal;
  /** Money already secured toward this goal (never exceeds the target). */
  saved: number;
  remaining: number;
  percent: number;
  daysLeft: number;
  overdue: boolean;
  completed: boolean;
}

/**
 * Progress toward a goal is based on the ACTUAL recorded balance only.
 * Future or planned income is never included. The balance is real money the
 * user owns today; it is capped at the target so a goal can complete.
 */
export function goalProgress(
  goal: FinancialGoal,
  actualBalance: number,
  asOfDate: string = todayISO(),
): GoalProgress {
  const balance = roundMoney(Math.max(0, actualBalance));
  const saved = roundMoney(Math.min(balance, goal.targetAmount));
  const remaining = roundMoney(Math.max(0, goal.targetAmount - balance));
  const percent =
    goal.targetAmount <= 0 ? 0 : roundMoney(Math.min(100, (saved / goal.targetAmount) * 100));
  return {
    goal,
    saved,
    remaining,
    percent,
    daysLeft: daysBetween(asOfDate, goal.deadline),
    overdue: daysBetween(asOfDate, goal.deadline) < 0 && saved < goal.targetAmount,
    completed: saved >= goal.targetAmount,
  };
}

export interface DashboardStats {
  balance: number;
  totals: Totals;
  /** Relative change of balance this month vs last month's net flow. */
  monthToDate: Totals;
}

/**
 * Balance history — a genuinely data-driven series of the running balance,
 * built ONLY from the opening balance and recorded transactions. Never
 * fabricated, never forward-looking.
 *
 * Returns daily points covering the recorded history (from the opening date /
 * earliest transaction until today). With no transactions, a single point is
 * returned so callers can decide to show an empty state instead.
 */
export interface BalancePoint {
  date: string; // ISO YYYY-MM-DD
  balance: number;
}

export function runningBalanceHistory(
  openingBalance: number,
  transactions: Transaction[],
  asOfDate: string = todayISO(),
): BalancePoint[] {
  if (transactions.length === 0) {
    return [{ date: asOfDate, balance: roundMoney(openingBalance) }];
  }

  const start = transactions.reduce(
    (min, tx) => (tx.date < min ? tx.date : min),
    transactions[0].date,
  );
  const [y, m, d] = start.split('-').map(Number);
  const end = new Date(Date.UTC(...(asOfDate.split('-').map(Number) as [number, number, number])));
  const cursor = new Date(Date.UTC(y, m - 1, d));

  const byDate = new Map<string, number>();
  for (const tx of transactions) {
    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    byDate.set(tx.date, (byDate.get(tx.date) ?? 0) + delta);
  }

  const points: BalancePoint[] = [];
  let balance = roundMoney(openingBalance);
  let guardCount = 0;
  while (cursor.getTime() <= end.getTime() && guardCount < 4000) {
    const iso = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`;
    balance = roundMoney(balance + (byDate.get(iso) ?? 0));
    points.push({ date: iso, balance });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guardCount += 1;
  }
  return points;
}

export function dashboardStats(
  openingBalance: number,
  transactions: Transaction[],
  asOfDate: string = todayISO(),
): DashboardStats {
  const totals = calculateTotals(transactions);
  const thisMonth = monthKey(asOfDate);
  const [y, m] = thisMonth.split('-').map(Number);
  const lastMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const lastMonth = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
  let monthIncome = 0;
  let monthExpense = 0;
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    if (key !== thisMonth && key !== lastMonth) continue;
    if (tx.type === 'income') monthIncome += tx.amount;
    else monthExpense += tx.amount;
  }
  return {
    balance: calculateBalance(openingBalance, transactions),
    totals,
    monthToDate: {
      totalIncome: roundMoney(monthIncome),
      totalExpense: roundMoney(monthExpense),
      netSavings: roundMoney(monthIncome - monthExpense),
    },
  };
}
