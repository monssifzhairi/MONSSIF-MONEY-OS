/** Transactions: full list, filtering, add / edit / delete with validation. */

import { useMemo, useState } from 'react';
import { useFinance } from '../data/store';
import type { Transaction, TransactionInput } from '../types/finance';
import { calculateTotals } from '../lib/calculations';
import { formatMAD } from '../lib/format';
import { csvFilename, downloadCSV, transactionsToCSV } from '../lib/csv';
import { PageHeader } from '../components/layout/AppShell';
import { Button, EmptyState, useToast } from '../components/ui';
import { IconDownload, IconPlus } from '../components/ui/icons';
import {
  EMPTY_FILTERS,
  FilterBar,
  TransactionTable,
  applyFilters,
  type TransactionFilters,
} from '../components/transactions/TransactionTable';
import { TransactionForm } from '../components/transactions/TransactionForm';

export function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction, ready } = useFinance();
  const toast = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const filtered = useMemo(
    () => applyFilters(data.transactions, filters),
    [data.transactions, filters],
  );
  const filteredTotals = useMemo(() => calculateTotals(filtered), [filtered]);
  const hasFilters =
    filters.type !== 'all' ||
    Boolean(filters.category) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.search);

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
    <>
      <PageHeader
        title="Transactions"
        subtitle="Add, edit, filter and remove income and expense entries."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <IconDownload size={15} />
              Export CSV
            </Button>
            <Button
              variant="primary"
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
      />

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="text-sm text-muted">
          {hasFilters ? (
            <>
              <strong className="text-accent">{filtered.length}</strong> matching transactions ·
              In <strong className="text-income">{formatMAD(filteredTotals.totalIncome)}</strong> ·
              Out <strong className="text-expense">{formatMAD(filteredTotals.totalExpense)}</strong>
            </>
          ) : (
            <>
              <strong className="text-accent">{data.transactions.length}</strong> transactions
              recorded · In{' '}
              <strong className="text-income">{formatMAD(filteredTotals.totalIncome)}</strong> · Out{' '}
              <strong className="text-expense">{formatMAD(filteredTotals.totalExpense)}</strong>
            </>
          )}
        </div>
      </div>

      {data.transactions.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No transactions yet"
            text="Record your first income or expense. Everything you enter is stored privately and recalculates your balance instantly."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <IconPlus size={15} />
                Add your first transaction
              </Button>
            }
          />
        </div>
      ) : (
        <TransactionTable
          transactions={filtered}
          onEdit={(tx) => {
            setEditing(tx);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      <TransactionForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}
