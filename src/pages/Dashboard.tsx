/**
 * Dashboard — premium financial overview.
 *
 * Every figure is derived from the authoritative ledger:
 *   balance = opening balance + recorded income − recorded expenses.
 * Hypothetical income is never counted anywhere.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinance } from '../data/store';
import {
  calculateBalance,
  calculateTotals,
  categoryBreakdown,
  goalProgress,
  monthlySeries,
} from '../lib/calculations';
import { formatMAD, formatMADNumber, formatMonthKey, todayISO } from '../lib/format';
import { PageHeader } from '../components/layout/AppShell';
import { MonthlyFlowChart } from '../components/charts/Charts';
import { GoalRing } from '../components/charts/GoalRing';
import { Button, EmptyState, useToast } from '../components/ui';
import {
  IconCalendar,
  IconPlus,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
} from '../components/ui/icons';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { TransactionForm } from '../components/transactions/TransactionForm';

export function Dashboard() {
  const { data, addTransaction, deleteTransaction, ready, mode } = useFinance();
  const navigate = useNavigate();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const totals = useMemo(() => calculateTotals(data.transactions), [data.transactions]);
  const balance = useMemo(
    () => calculateBalance(data.account.openingBalance, data.transactions),
    [data.account.openingBalance, data.transactions],
  );
  const series = useMemo(() => monthlySeries(data.transactions, 6), [data.transactions]);
  const primaryGoal = data.goals[0] ?? null;
  const progress = useMemo(
    () => (primaryGoal ? goalProgress(primaryGoal, balance, todayISO()) : null),
    [primaryGoal, balance],
  );
  const currentMonth = series[series.length - 1];
  const topCategories = useMemo(
    () => categoryBreakdown(data.transactions, 'expense').slice(0, 4),
    [data.transactions],
  );

  if (!ready) {
    return null; // skeleton is rendered by the protected layout
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          mode === 'supabase'
            ? 'Your private ledger — stored securely in your Supabase project.'
            : 'Local demo ledger — browser-only, nothing leaves this device.'
        }
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <IconPlus size={15} />
            Add transaction
          </Button>
        }
      />

      {/* ── Hero: balance + goal ring ───────────────────────────────────── */}
      <section className="hero-card" aria-label="Financial overview">
        <div className="hero-grid">
          <div>
            <div className="hero-eyebrow">
              <IconWallet size={14} className="text-accent" />
              <span className="eyebrow">Current balance</span>
            </div>
            <div className="hero-balance">
              {formatMADNumber(balance)}{' '}
              <span className="unit">MAD</span>
            </div>
            <p className="hero-sub">
              Opening {formatMAD(data.account.openingBalance)} · recorded activity{' '}
              {totals.netSavings >= 0 ? '+' : '−'}
              {formatMAD(Math.abs(totals.netSavings)).replace(' MAD', '')} MAD
            </p>

            <div className="hero-chips">
              <span className="hero-chip">
                <IconTrendUp size={14} className="text-income" />
                Income <strong>{formatMAD(totals.totalIncome)}</strong>
              </span>
              <span className="hero-chip">
                <IconTrendDown size={14} className="text-expense" />
                Expenses <strong>{formatMAD(totals.totalExpense)}</strong>
              </span>
              <span className="hero-chip">
                Net savings{' '}
                <strong className={totals.netSavings >= 0 ? 'text-income' : 'text-expense'}>
                  {formatMAD(totals.netSavings)}
                </strong>
              </span>
            </div>
          </div>

          <div className="goal-ring-wrap">
            {progress ? (
              <>
                <GoalRing percent={progress.percent} />
                <div className="goal-ring-caption">
                  <strong className="text-sm">{progress.goal.name}</strong>
                  <br />
                  {progress.remaining > 0 ? (
                    <>
                      {formatMAD(progress.remaining)} to go ·{' '}
                      {progress.overdue
                        ? 'deadline passed'
                        : `${progress.daysLeft} days left`}
                    </>
                  ) : (
                    <span className="text-income">Target reached — fully funded</span>
                  )}
                  <br />
                  <span className="text-dim text-xs">
                    Measured on real balance only. Future income is never counted.
                  </span>
                </div>
              </>
            ) : (
              <div className="goal-ring-caption" style={{ maxWidth: 240 }}>
                <div className="empty-icon" style={{ margin: '0 auto 10px' }}>
                  <IconCalendar size={18} />
                </div>
                <strong className="text-sm">No savings goal yet</strong>
                <br />
                <span className="text-dim text-xs">
                  Create your first target — e.g. 1,000 MAD — and track it here.
                </span>
                <div style={{ marginTop: 12 }}>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/goals')}>
                    Create goal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-label">Opening balance</span>
            <span className="stat-icon">
              <IconWallet size={14} />
            </span>
          </div>
          <span className="stat-value tnum">{formatMAD(data.account.openingBalance)}</span>
          <span className="stat-meta">Set once · never duplicated</span>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-label">Total income</span>
            <span className="stat-icon income">
              <IconTrendUp size={14} />
            </span>
          </div>
          <span className="stat-value income tnum">{formatMAD(totals.totalIncome)}</span>
          <span className="stat-meta">All recorded income</span>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-label">Total expenses</span>
            <span className="stat-icon expense">
              <IconTrendDown size={14} />
            </span>
          </div>
          <span className="stat-value expense tnum">{formatMAD(totals.totalExpense)}</span>
          <span className="stat-meta">All recorded expenses</span>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span className="stat-label">Net savings</span>
            <span className="stat-icon">
              <IconCalendar size={14} />
            </span>
          </div>
          <span
            className={`stat-value tnum ${totals.netSavings >= 0 ? '' : 'expense'}`}
            style={totals.netSavings >= 0 ? { color: 'var(--text)' } : undefined}
          >
            {formatMAD(totals.netSavings)}
          </span>
          <span className="stat-meta">Income minus expenses</span>
        </div>
      </div>

      {/* ── Chart + side column ────────────────────────────────────────── */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Income vs expenses</div>
              <div className="card-hint">Last 6 months · MAD</div>
            </div>
            <div className="chart-legend">
              <span>
                <span className="legend-dot" style={{ background: '#2dd4a0' }} />
                Income
              </span>
              <span>
                <span className="legend-dot" style={{ background: '#ef7168' }} />
                Expenses
              </span>
            </div>
          </div>
          <MonthlyFlowChart data={series} />
          {currentMonth && (currentMonth.income > 0 || currentMonth.expense > 0) && (
            <div
              className="row-between text-xs text-muted"
              style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}
            >
              <span className="row" style={{ gap: 6 }}>
                {currentMonth.net >= 0 ? (
                  <IconTrendUp size={14} className="text-income" />
                ) : (
                  <IconTrendDown size={14} className="text-expense" />
                )}
                {formatMonthKey(currentMonth.key)} net:
                <strong className={currentMonth.net >= 0 ? 'text-income' : 'text-expense'}>
                  {formatMAD(currentMonth.net)}
                </strong>
              </span>
              <span className="text-dim">
                In {formatMAD(currentMonth.income)} · Out {formatMAD(currentMonth.expense)}
              </span>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">This month</div>
                <div className="card-hint">{formatMonthKey(currentMonth?.key ?? '')}</div>
              </div>
              <Link to="/reports" className="text-xs text-accent font-semibold">
                Full report
              </Link>
            </div>
            {currentMonth && (currentMonth.income > 0 || currentMonth.expense > 0) ? (
              <div className="stack" style={{ gap: 12 }}>
                <div className="row-between">
                  <span className="text-sm text-muted">Income</span>
                  <strong className="text-income tnum">{formatMAD(currentMonth.income)}</strong>
                </div>
                <div className="divider" style={{ margin: 0 }} />
                <div className="row-between">
                  <span className="text-sm text-muted">Expenses</span>
                  <strong className="text-expense tnum">{formatMAD(currentMonth.expense)}</strong>
                </div>
                <div className="divider" style={{ margin: 0 }} />
                <div className="row-between">
                  <span className="text-sm text-muted">Net</span>
                  <strong
                    className={`tnum ${currentMonth.net >= 0 ? 'text-income' : 'text-expense'}`}
                  >
                    {formatMAD(currentMonth.net)}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="text-sm text-dim">
                No activity recorded this month yet. Add your first entry to see the monthly
                picture.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Top spending</div>
              <Link to="/reports" className="text-xs text-accent font-semibold">
                Breakdown
              </Link>
            </div>
            {topCategories.length === 0 ? (
              <p className="text-sm text-dim">No expenses recorded yet.</p>
            ) : (
              <div className="bar-list">
                {topCategories.map((c) => (
                  <div className="bar-row" key={c.category}>
                    <span className="bar-label">{c.category}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill expense"
                        style={{ width: `${Math.max(4, c.percentage)}%` }}
                      />
                    </div>
                    <span className="bar-value">{formatMAD(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent transactions ────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Recent transactions</div>
            <div className="card-hint">Your latest 8 entries</div>
          </div>
          <Link to="/transactions" className="text-xs text-accent font-semibold">
            View all
          </Link>
        </div>
        {data.transactions.length === 0 ? (
          <EmptyState
            title="Your ledger is empty"
            text="Record your first income or expense — your balance and goal progress update instantly."
            action={
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                <IconPlus size={14} /> Add your first transaction
              </Button>
            }
          />
        ) : (
          <TransactionTable
            transactions={data.transactions}
            compact
            onEdit={() => navigate('/transactions')}
            onDelete={(tx) => deleteTransaction(tx.id)}
            onAdd={() => setFormOpen(true)}
          />
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input) => {
          try {
            await addTransaction(input);
            toast.success('Transaction added', 'Your balance has been recalculated.');
          } catch (err) {
            toast.error('Could not add transaction', (err as Error).message);
            throw err;
          }
        }}
      />
    </>
  );
}
