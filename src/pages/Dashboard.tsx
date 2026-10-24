/**
 * Dashboard — the money moment.
 *
 * Composition: an ink hero holding the balance as the primary element with
 * an opening / income / expenses hierarchy and a data-driven balance
 * history; the savings goal as an original milestone track; a premium
 * filterable activity list; and supporting analytics with clear ranges.
 *
 * Every figure derives from the authoritative ledger:
 *   balance = opening balance + recorded income − recorded expenses.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFinance } from '../data/store';
import {
  calculateBalance,
  calculateTotals,
  categoryBreakdown,
  monthlySeries,
} from '../lib/calculations';
import { formatMAD, formatMADNumber, formatMonthKey, todayISO } from '../lib/format';
import { AppShell, ModeChip } from '../components/layout/AppShell';
import { BalanceHistory } from '../components/charts/BalanceHistory';
import { GoalTrack } from '../components/transactions/GoalTrack';
import {
  ActivityList,
  FilterBar,
  EMPTY_FILTERS,
  applyFilters,
  type TransactionFilters,
} from '../components/transactions/TransactionTable';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { Button, EmptyState, useToast } from '../components/ui';
import { IconPlus, IconTrendDown, IconTrendUp, IconTarget } from '../components/ui/icons';

const LONG_DATE = new Intl.DateTimeFormat('en-MA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function Dashboard() {
  const { data, addTransaction, deleteTransaction, ready, mode } = useFinance();
  const toast = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);

  const totals = useMemo(() => calculateTotals(data.transactions), [data.transactions]);
  const balance = useMemo(
    () => calculateBalance(data.account.openingBalance, data.transactions),
    [data.account.openingBalance, data.transactions],
  );
  const series = useMemo(() => monthlySeries(data.transactions, 6), [data.transactions]);
  const primaryGoal = data.goals[0] ?? null;
  const topCategories = useMemo(
    () => categoryBreakdown(data.transactions, 'expense').slice(0, 5),
    [data.transactions],
  );
  const filtered = useMemo(() => applyFilters(data.transactions, filters), [data.transactions, filters]);

  const maxCategory = topCategories[0]?.total ?? 1;

  const handleAdd = async (input: Parameters<typeof addTransaction>[0]) => {
    await addTransaction(input);
    toast.success('Transaction added', 'Your balance has been recalculated.');
  };

  const handleDelete = async (tx: { id: string }) => {
    try {
      await deleteTransaction(tx.id);
      toast.success('Transaction deleted', 'Your balance has been recalculated.');
    } catch (err) {
      toast.error('Could not delete transaction', (err as Error).message);
    }
  };

  if (!ready) return null; // skeleton rendered by the protected layout

  return (
    <AppShell
      title="Dashboard"
      dateLabel={LONG_DATE.format(new Date(todayISO() + 'T12:00:00'))}
      actions={
        <>
          <ModeChip variant={mode === 'supabase' ? 'cloud' : 'local'} label={mode === 'supabase' ? 'Cloud · Supabase' : 'Local demo'} />
          <Button variant="ink" onClick={() => setFormOpen(true)}>
            <IconPlus size={15} />
            Add transaction
          </Button>
        </>
      }
    >
      {/* ── Ink hero: balance + hierarchy + history ───────────────────────── */}
      <section className="ink-panel hero-grid" aria-label="Financial overview">
        <div>
          <div className="hero-label">
            <span
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-on-ink)', display: 'inline-block' }}
            />
            Current balance
          </div>
          <div className="hero-balance">
            {formatMADNumber(balance)}{' '}
            <span className="unit">MAD</span>
          </div>
          <p className="hero-note">
            Opening <strong>{formatMAD(data.account.openingBalance)}</strong> plus recorded net{' '}
            <strong>
              {totals.netSavings >= 0 ? '+' : '−'}
              {formatMADNumber(Math.abs(totals.netSavings))} MAD
            </strong>{' '}
            · only transactions you record move this number.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-label">Opening balance</div>
              <div className="hero-stat-value">{formatMADNumber(data.account.openingBalance)} MAD</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Income</div>
              <div className="hero-stat-value income">{formatMADNumber(totals.totalIncome)} MAD</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">Expenses</div>
              <div className="hero-stat-value expense">{formatMADNumber(totals.totalExpense)} MAD</div>
            </div>
          </div>
        </div>

        <BalanceHistory openingBalance={data.account.openingBalance} transactions={data.transactions} />
      </section>

      {/* ── Savings goal: original milestone composition ─────────────────── */}
      {primaryGoal ? (
        <GoalTrack
          goal={primaryGoal}
          savedAmount={Math.min(balance, primaryGoal.targetAmount)}
          openingBalance={data.account.openingBalance}
        />
      ) : (
        <section className="panel">
          <EmptyState
            icon={<IconTarget size={22} />}
            title="Goals turn a balance into a plan."
            text="Give this ledger a destination — a first 1,000 MAD, a cushion, anything with a number and a date."
            action={
              <Button variant="ink" onClick={() => navigate('/goals')}>
                <IconPlus size={15} />
                Create goal
              </Button>
            }
          />
        </section>
      )}

      {/* ── Activity + analytics ─────────────────────────────────────────── */}
      <div className="grid-2">
        <section className="panel" style={{ paddingTop: 18 }}>
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Recent activity</h2>
              <p className="panel-hint">Your ledger, newest first — search or filter without leaving the page.</p>
            </div>
            <Link className="panel-link" to="/transactions">
              View all transactions →
            </Link>
          </div>

          <FilterBar filters={filters} onChange={setFilters} />

          <ActivityList
            transactions={filtered.slice(0, 8)}
            onDelete={handleDelete}
            emptyTitle={data.transactions.length === 0 ? 'No transactions yet' : 'Nothing matches these filters'}
            emptyText={
              data.transactions.length === 0
                ? 'Record your first income or expense. Everything you enter is stored privately and recalculates your balance instantly.'
                : 'No transaction in your ledger fits this combination. Loosen the filters to see everything again.'
            }
            emptyAction={
              data.transactions.length === 0 ? (
                <Button variant="ink" onClick={() => setFormOpen(true)}>
                  <IconPlus size={15} />
                  Add transaction
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear all filters
                </Button>
              )
            }
          />
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Income vs expenses</h2>
                <p className="panel-hint">All time · recorded entries only</p>
              </div>
            </div>
            <div className="bar-list">
              <div className="bar-row">
                <span className="bar-label">
                  <IconTrendUp size={13} className="text-income" /> Income
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${totals.totalIncome + totals.totalExpense > 0 ? (totals.totalIncome / (totals.totalIncome + totals.totalExpense)) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="bar-value text-income">{formatMAD(totals.totalIncome)}</span>
              </div>
              <div className="bar-row">
                <span className="bar-label">
                  <IconTrendDown size={13} className="text-expense" /> Expenses
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill expense"
                    style={{
                      width: `${totals.totalIncome + totals.totalExpense > 0 ? (totals.totalExpense / (totals.totalIncome + totals.totalExpense)) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="bar-value">{formatMAD(totals.totalExpense)}</span>
              </div>
            </div>
            <div className="divider" style={{ margin: '18px 0 14px' }} />
            <div className="row-between">
              <span className="text-sm text-muted">Net savings</span>
              <strong className={`tnum ${totals.netSavings >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatMAD(totals.netSavings)}
              </strong>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Monthly cash flow</h2>
                <p className="panel-hint">
                  {series.length > 0
                    ? `${formatMonthKey(series[0].key)} → ${formatMonthKey(series[series.length - 1].key)}`
                    : 'Last 6 months'}
                </p>
              </div>
              <Link className="panel-link" to="/reports">
                Full reports →
              </Link>
            </div>
            {series.length === 0 || data.transactions.length === 0 ? (
              <p className="empty-text" style={{ margin: '6px 0' }}>
                Cash flow appears here as soon as this month has recorded activity.
              </p>
            ) : (
              <div className="bar-list">
                {series.slice(-3).map((m) => (
                  <div key={m.key}>
                    <div className="progress-row" style={{ marginBottom: 6 }}>
                      <span>{formatMonthKey(m.key)}</span>
                      <span className="tnum">
                        <strong className="text-income">+{formatMADNumber(m.income)}</strong>
                        <span className="text-dim"> / </span>
                        <strong className="text-expense">−{formatMADNumber(m.expense)}</strong>
                      </span>
                    </div>
                    <div className="progress" style={{ height: 5 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.max(2, Math.min(100, (m.income / Math.max(1, m.income + m.expense)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Top spending categories</h2>
                <p className="panel-hint">All time · expenses only</p>
              </div>
            </div>
            {topCategories.length === 0 ? (
              <p className="empty-text" style={{ margin: '6px 0' }}>
                No expenses recorded yet — categories will rank themselves automatically.
              </p>
            ) : (
              <div className="bar-list">
                {topCategories.map((c) => (
                  <div className="bar-row" key={c.category}>
                    <span className="bar-label">{c.category}</span>
                    <div className="bar-track">
                      <div className="bar-fill expense" style={{ width: `${(c.total / maxCategory) * 100}%` }} />
                    </div>
                    <span className="bar-value">{formatMAD(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <TransactionForm
        open={formOpen}
        editing={null}
        onClose={() => setFormOpen(false)}
        onSubmit={handleAdd}
      />
    </AppShell>
  );
}
