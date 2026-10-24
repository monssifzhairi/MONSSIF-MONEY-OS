/**
 * Transactions: full list, filtering, add / edit / delete with validation.
 * The header summary keeps the honest running totals for the current filter.
 */

import { useMemo, useState } from 'react';
import { useFinance } from '../data/store';
import type { Transaction, TransactionInput } from '../types/finance';
import { calculateTotals } from '../lib/calculations';
import { formatMAD } from '../lib/format';
import { csvFilename, downloadCSV, transactionsToCSV } from '../lib/csv';
import { AppShell, ModeChip } from '../components/layout/AppShell';
import { Button, useToast } from '../components/ui';
import { IconDownload, IconPlus } from '../components/ui/icons';
import {
  EMPTY_FILTERS,
  TransactionList,
  applyFilters,
  type TransactionFilters,
} from '../components/transactions/TransactionTable';
import { TransactionForm } from '../components/transactions/TransactionForm';

export function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction, ready, mode } = useFinance();
  const toast = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const filtered = useMemo(() => applyFilters(data.transactions, filters), [data.transactions, filters]);
  const filteredTotals = useMemo(() => calculateTotals(filtered), [filtered]);
  const hasFilters =
    filters.type !== 'all' ||
    Boolean(filters.category) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.search) ||
    Boolean(filters.minAmount) ||
    Boolean(filters.maxAmount);

  const handleSubmit = async (input: TransactionInput) => {
    try {
      if (editing) {
        await updateTransaction(editing.id, input);
        toast.success('Transaction updated', 'Balances have been recalculated.');
      } else {
        await addTransaction(input);
        toast.success('Transaction added', 'Your balance has been recalculated.');
      }
    } catch (err) {
      toast.error(editing ? 'Could not update transaction' : 'Could not add transaction', (err as Error).message);
      throw err;
    }
  };

  const handleDelete = async (tx: Transaction) => {
    try {
      await deleteTransaction(tx.id);
      toast.success('Transaction deleted', 'Your balance has been recalculated.');
    } catch (err) {
      toast.error('Could not delete transaction', (err as Error).message);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export', 'No transactions match the current filters.');
      return;
    }
    downloadCSV(transactionsToCSV(filtered), csvFilename());
    toast.success('CSV exported', `${filtered.length} transactions saved to a file.`);
  };

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Loading transactions…</span>
      </div>
    );
  }

  return (
    <AppShell
      title="Transactions"
      dateLabel="Everything you have recorded, in one place."
      actions={
        <>
          <ModeChip variant={mode === 'supabase' ? 'cloud' : 'local'} label={mode === 'supabase' ? 'Cloud · Supabase' : 'Local demo'} />
          <Button variant="secondary" onClick={handleExport}>
            <IconDownload size={15} />
            Export CSV
          </Button>
          <Button
            variant="ink"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus size={15} />
            Add transaction
          </Button>
        </>
      }
    >
      <div className="row-between" style={{ marginBottom: 18 }}>
        <div className="text-sm text-muted">
          {hasFilters ? (
            <>
              <strong className="text-accent">{filtered.length}</strong> matching transactions · In{' '}
              <strong className="text-income">{formatMAD(filteredTotals.totalIncome)}</strong> · Out{' '}
              <strong className="text-expense">{formatMAD(filteredTotals.totalExpense)}</strong>
            </>
          ) : (
            <>
              <strong className="text-accent">{data.transactions.length}</strong> transactions recorded · In{' '}
              <strong className="text-income">{formatMAD(filteredTotals.totalIncome)}</strong> · Out{' '}
              <strong className="text-expense">{formatMAD(filteredTotals.totalExpense)}</strong>
            </>
          )}
        </div>
      </div>

      <TransactionList
        transactions={data.transactions}
        filters={filters}
        onFiltersChange={setFilters}
        onEdit={(tx) => {
          setEditing(tx);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyAction={
          <Button
            variant="ink"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus size={15} />
            {data.transactions.length === 0 ? 'Add your first transaction' : 'Add transaction'}
          </Button>
        }
      />

      <TransactionForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </AppShell>
  );
}
