/** Transactions table with filter controls, edit and delete actions. */

import { useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '../../types/finance';
import { ALL_CATEGORIES } from '../../lib/validation';
import { formatMAD, formatDate, todayISO } from '../../lib/format';
import { Badge, Button, EmptyState, ConfirmDialog } from '../ui';
import { IconEdit, IconPlus, IconTrash } from '../ui/icons';

export interface TransactionFilters {
  type: 'all' | TransactionType;
  category: string;
  from: string;
  to: string;
  search: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: 'all',
  category: '',
  from: '',
  to: '',
  search: '',
};

export function applyFilters(transactions: Transaction[], f: TransactionFilters): Transaction[] {
  const search = f.search.trim().toLowerCase();
  return transactions.filter((tx) => {
    if (f.type !== 'all' && tx.type !== f.type) return false;
    if (f.category && tx.category !== f.category) return false;
    if (f.from && tx.date < f.from) return false;
    if (f.to && tx.date > f.to) return false;
    if (search) {
      const haystack = `${tx.category} ${tx.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date === b.date) return b.createdAt.localeCompare(a.createdAt);
    return a.date < b.date ? 1 : -1;
  });
}

export function FilterBar({
  filters,
  onChange,
  categories = ALL_CATEGORIES,
}: {
  filters: TransactionFilters;
  onChange: (f: TransactionFilters) => void;
  categories?: string[];
}) {
  return (
    <div className="filters">
      <div className="field">
        <label className="field-label" htmlFor="f-type">
          Type
        </label>
        <select
          id="f-type"
          className="select"
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value as TransactionFilters['type'] })}
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="f-category">
          Category
        </label>
        <select
          id="f-category"
          className="select"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="f-from">
          From
        </label>
        <input
          id="f-from"
          type="date"
          className="input"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="f-to">
          To
        </label>
        <input
          id="f-to"
          type="date"
          className="input"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
      </div>
      <div className="field" style={{ minWidth: 190 }}>
        <label className="field-label" htmlFor="f-search">
          Search
        </label>
        <input
          id="f-search"
          className="input"
          placeholder="Description or category…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange({ ...EMPTY_FILTERS })}
        disabled={
          filters.type === 'all' &&
          !filters.category &&
          !filters.from &&
          !filters.to &&
          !filters.search
        }
      >
        Clear
      </Button>
    </div>
  );
}

interface TableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => Promise<void>;
  onAdd?: () => void;
  compact?: boolean;
}

export function TransactionTable({ transactions, onEdit, onDelete, onAdd, compact = false }: TableProps) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const rows = useMemo(
    () => (compact ? sortTransactions(transactions).slice(0, 8) : sortTransactions(transactions)),
    [transactions, compact],
  );

  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState
          title="No transactions found"
          text={
            compact
              ? 'Record your first income or expense to see it here.'
              : 'Adjust the filters, or add a new transaction to get started.'
          }
          action={
            onAdd ? (
              <Button variant="primary" size="sm" onClick={onAdd}>
                <IconPlus size={14} />
                Add transaction
              </Button>
            ) : undefined
          }
        />
        <ConfirmDialog
          open={pendingDelete !== null}
          title="Delete transaction?"
          message="This action cannot be undone. The transaction will be permanently removed and your balances recalculated."
          confirmLabel="Delete"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            if (pendingDelete) await onDelete(pendingDelete);
            setPendingDelete(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              {!compact && <th className="cell-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td className="tnum" style={{ whiteSpace: 'nowrap' }}>
                  {formatDate(tx.date)}
                </td>
                <td>
                  <Badge kind={tx.type === 'income' ? 'income' : 'expense'}>
                    {tx.type === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                </td>
                <td className="cell-strong">{tx.category}</td>
                <td style={{ maxWidth: 240 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'bottom',
                    }}
                    title={tx.description}
                  >
                    {tx.description || <span className="text-dim">—</span>}
                  </span>
                </td>
                <td className={`cell-amount ${tx.type}`}>
                  {tx.type === 'income' ? '+' : '−'}
                  {formatMAD(tx.amount)}
                </td>
                {!compact && (
                  <td className="cell-actions">
                    <button
                      className="btn-icon"
                      aria-label="Edit transaction"
                      onClick={() => onEdit(tx)}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      className="btn-icon danger"
                      aria-label="Delete transaction"
                      onClick={() => setPendingDelete(tx)}
                    >
                      <IconTrash size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete transaction?"
        message="This action cannot be undone. The transaction will be permanently removed and your balances recalculated."
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

export { todayISO };
