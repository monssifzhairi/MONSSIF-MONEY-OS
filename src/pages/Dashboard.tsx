/** Dashboard: balance, income/expense totals, goal progress, chart, recent activity. */

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
import { formatMAD, formatMonthKey } from '../lib/format';
import { PageHeader } from '../components/layout/AppShell';
import { MonthlyFlowChart } from '../components/charts/Charts';
import { Button, EmptyState, ProgressBar, useToast } from '../components/ui';
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
  const { data, addTransaction, deleteTransaction, ready } = useFinance();
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
    () => (primaryGoal ? goalProgress(primaryGoal, balance) : null),
    [primaryGoal, balance],
  );
  const currentMonth = series[series.length - 1];
  const topCategories = useMemo(
    () => categoryBreakdown(data.transactions, 'expense').slice(0, 3),
    [data.transactions],
  );

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Loading your money…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your money at a glance — recorded data only."
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <IconPlus size={15} />
            Add transaction
          </Button>
        }
      />

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Current balance</span>
          <span className={`stat-value${balance >= 0 ? ' accent' : ' expense'}`}>
            {formatMAD(balance)}
          </span>
          <span className="stat-meta">
            Opening {formatMAD(data.account.openingBalance)} + recorded activity
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total income</span>
          <span className="stat-value income">{formatMAD(totals.totalIncome)}</span>
          <span className="stat-meta">All recorded income</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total expenses</span>
          <span className="stat-value expense">{formatMAD(totals.totalExpense)}</span>
          <span className="stat-meta">All recorded expenses</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Net savings</span>
          <span className={`stat-value${totals.netSavings >= 0 ? '' : ' expense'}`}>
            {formatMAD(totals.netSavings)}
          </span>
          <span className="stat-meta">Income minus expenses</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Income vs expenses</div>
              <div className="card-hint">Last 6 months · MAD</div>
            </div>
            <div className="chart-legend">
              <span>
                <span className="legend-dot" style={{ background: '#10b981' }} />
                Income
              </span>
              <span>
                <span className="legend-dot" style={{ background: '#e06c65' }} />
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
              <div className="card-title">Primary goal</div>
              <Link to="/goals" className="text-xs text-accent font-semibold">
                Manage goals
              </Link>
            </div>
            {progress ? (
              <div className="stack" style={{ gap: 12 }}>
                <div>
                  <div className="goal-amount-row">
                    <span className="goal-saved">{formatMAD(progress.saved)}</span>
                    <span className="goal-target">of {formatMAD(progress.goal.targetAmount)}</span>
                  </div>
                  <div className="text-xs text-dim" style={{ marginTop: 2 }}>
                    {progress.goal.name}
                  </div>
                </div>
                <ProgressBar
                  percent={progress.percent}
                  label="Progress"
                  value={`${progress.percent.toFixed(1)}%`}
                  warning={progress.overdue}
                />
                <div className="goal-meta">
                  <span className="goal-meta-item">
                    <IconWallet size={13} />
                    {progress.remaining > 0
                      ? `${formatMAD(progress.remaining)} to go`
                      : 'Target reached'}
                  </span>
                  <span className="goal-meta-item">
                    <IconCalendar size={13} />
                    {progress.overdue ? 'Deadline passed' : `${progress.daysLeft} days left`}
                  </span>
                </div>
                <div className="text-xs text-dim" style={{ lineHeight: 1.6 }}>
                  Progress uses your actual recorded balance only. Future or planned income is
                  never counted.
                </div>
              </div>
            ) : (
              <EmptyState
                title="No goal yet"
                text="Create your first savings goal — for example, 1,000 MAD."
                action={
                  <Button size="sm" variant="primary" onClick={() => navigate('/goals')}>
                    Create goal
                  </Button>
                }
              />
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Top spending</div>
              <Link to="/reports" className="text-xs text-accent font-semibold">
                Full report
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
        <TransactionTable
          transactions={data.transactions}
          compact
          onEdit={() => navigate('/transactions')}
          onDelete={(tx) => deleteTransaction(tx.id)}
          onAdd={() => setFormOpen(true)}
        />
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
