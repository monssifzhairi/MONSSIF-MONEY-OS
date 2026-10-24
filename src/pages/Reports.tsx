/** Reports: monthly summaries, category breakdowns, history, CSV export. */

import { useMemo, useState } from 'react';
import { useFinance } from '../data/store';
import {
  calculateTotals,
  categoryBreakdown,
  monthlySummaries,
  monthlySeries,
} from '../lib/calculations';
import { formatMAD, formatMonthKey, monthKey, todayISO } from '../lib/format';
import { csvFilename, downloadCSV, transactionsToCSV } from '../lib/csv';
import { AppShell } from '../components/layout/AppShell';
import { CategoryDonut, MonthlyFlowChart } from '../components/charts/Charts';
import { Button, EmptyState, useToast } from '../components/ui';
import { IconDownload } from '../components/ui/icons';
import { ActivityList } from '../components/transactions/TransactionTable';

export function Reports() {
  const { data, deleteTransaction, ready } = useFinance();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => monthKey(todayISO()));

  const summaries = useMemo(() => monthlySummaries(data.transactions), [data.transactions]);
  const series = useMemo(() => monthlySeries(data.transactions, 6), [data.transactions]);
  const expenseCats = useMemo(
    () => categoryBreakdown(data.transactions, 'expense'),
    [data.transactions],
  );
  const incomeCats = useMemo(
    () => categoryBreakdown(data.transactions, 'income'),
    [data.transactions],
  );

  const monthTransactions = useMemo(
    () => data.transactions.filter((t) => monthKey(t.date) === selectedMonth),
    [data.transactions, selectedMonth],
  );
  const monthTotals = useMemo(() => calculateTotals(monthTransactions), [monthTransactions]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>(summaries.map((s) => s.key));
    keys.add(monthKey(todayISO()));
    return [...keys].sort().reverse();
  }, [summaries]);

  const handleExport = () => {
    if (data.transactions.length === 0) {
      toast.error('Nothing to export', 'Record some transactions first.');
      return;
    }
    downloadCSV(transactionsToCSV(data.transactions), csvFilename());
    toast.success('CSV exported', `${data.transactions.length} transactions saved to a file.`);
  };

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Building your reports…</span>
      </div>
    );
  }

  return (
    <AppShell
      title="Reports"
      dateLabel="Monthly summaries, category breakdowns and full history."
      actions={
        <Button variant="secondary" onClick={handleExport}>
          <IconDownload size={15} />
          Export all CSV
        </Button>
      }
    >
      {data.transactions.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No data to report yet"
            text="Reports appear once you record income and expenses. Try loading the sample dataset from Settings to preview the reports."
          />
        </div>
      ) : (
        <>
          <div className="grid-2-equal" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Monthly income vs expenses</div>
                  <div className="panel-hint">Last 6 months · MAD</div>
                </div>
              </div>
              <MonthlyFlowChart data={series} />
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Monthly summaries</div>
                  <div className="panel-hint">Newest first</div>
                </div>
              </div>
              <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'right' }}>Income</th>
                      <th style={{ textAlign: 'right' }}>Expenses</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => (
                      <tr key={s.key}>
                        <td className="cell-strong">{formatMonthKey(s.key)}</td>
                        <td className="cell-amount income">{formatMAD(s.income)}</td>
                        <td className="cell-amount expense">{formatMAD(s.expense)}</td>
                        <td className={`cell-amount ${s.net >= 0 ? 'income' : 'expense'}`}>
                          {formatMAD(s.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid-2-equal" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Expense breakdown</div>
                  <div className="panel-hint">
                    {expenseCats.length > 0
                      ? `${formatMAD(monthTotals.totalExpense)} this month · all-time split below`
                      : 'All time'}
                  </div>
                </div>
              </div>
              {expenseCats.length === 0 ? (
                <EmptyState title="No expenses yet" text="Expense categories will appear here." />
              ) : (
                <CategoryDonut data={expenseCats} type="expense" />
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Income breakdown</div>
                  <div className="panel-hint">All time</div>
                </div>
              </div>
              {incomeCats.length === 0 ? (
                <EmptyState title="No income yet" text="Income categories will appear here." />
              ) : (
                <CategoryDonut data={incomeCats} type="income" />
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Monthly history</div>
                <div className="panel-hint">Detailed transactions for one month</div>
              </div>
              <select
                className="select"
                style={{ width: 'auto', minWidth: 150 }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Select month"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthKey(key)}
                  </option>
                ))}
              </select>
            </div>
            <div className="row" style={{ gap: 16, marginBottom: 12 }}>
              <span className="text-sm text-muted">
                Income:{' '}
                <strong className="text-income tnum">{formatMAD(monthTotals.totalIncome)}</strong>
              </span>
              <span className="text-sm text-muted">
                Expenses:{' '}
                <strong className="text-expense tnum">{formatMAD(monthTotals.totalExpense)}</strong>
              </span>
              <span className="text-sm text-muted">
                Net:{' '}
                <strong
                  className={`tnum ${monthTotals.netSavings >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  {formatMAD(monthTotals.netSavings)}
                </strong>
              </span>
            </div>
            <ActivityList
              transactions={monthTransactions}
              onEdit={() => toast.success('Open Transactions to edit entries.')}
              onDelete={(tx) => deleteTransaction(tx.id)}
              emptyTitle="No transactions in this month"
              emptyText="Pick another month — or record something today."
            />
          </div>
        </>
      )}
    </AppShell>
  );
}
