/**
 * Premium transaction list: search + type/category/date/amount filters,
 * income vs expense distinction, edit/delete actions, exceptional empty
 * states. Used on both the Dashboard and the Transactions page.
 */

import { useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '../../types/finance';
import { ALL_CATEGORIES } from '../../lib/validation';
import { formatMAD, formatDate, todayISO } from '../../lib/format';
import { EmptyState, ConfirmDialog, Button } from '../ui';
import { IconEdit, IconSearch, IconTrash, IconIncome, IconExpense, IconFilter, IconClose } from '../ui/icons';

export interface TransactionFilters {
  type: 'all' | TransactionType;
  category: string;
  from: string;
  to: string;
  search: string;
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: 'all',
  category: '',
  from: '',
  to: '',
  search: '',
  minAmount: '',
  maxAmount: '',
};

export function applyFilters(transactions: Transaction[], f: TransactionFilters): Transaction[] {
  const search = f.search.trim().toLowerCase();
  const min = f.minAmount !== '' ? Number(f.minAmount) : null;
  const max = f.maxAmount !== '' ? Number(f.maxAmount) : null;
  return transactions.filter((tx) => {
    if (f.type !== 'all' && tx.type !== f.type) return false;
    if (f.category && tx.category !== f.category) return false;
    if (f.from && tx.date < f.from) return false;
    if (f.to && tx.date > f.to) return false;
    if (min !== null && Number.isFinite(min) && tx.amount < min) return false;
    if (max !== null && Number.isFinite(max) && tx.amount > max) return false;
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
  const [showMore, setShowMore] = useState(
    Boolean(filters.minAmount || filters.maxAmount || filters.from || filters.to || filters.category),
  );

  return (
    <div>
      <div className="filters" style={{ marginBottom: showMore ? 10 : 18 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <label className="visually-hidden" htmlFor="f-search">
            Search
          </label>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', display: 'flex' }}>
            <IconSearch size={15} />
          </span>
          <input
            id="f-search"
            type="search"
            className="input"
            style={{ height: 40, paddingLeft: 38, fontSize: 13 }}
            placeholder="Search category or note…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="segmented three" style={{ flex: '1 1 220px', maxWidth: 280 }}>
          <button
            type="button"
            className={filters.type === 'all' ? 'active-income' : ''}
            onClick={() => onChange({ ...filters, type: 'all' })}
          >
            All
          </button>
          <button
            type="button"
            className={filters.type === 'income' ? 'active-income' : ''}
            onClick={() => onChange({ ...filters, type: 'income' })}
          >
            Income
          </button>
          <button
            type="button"
            className={filters.type === 'expense' ? 'active-expense' : ''}
            onClick={() => onChange({ ...filters, type: 'expense' })}
          >
            Expenses
          </button>
        </div>

        <button type="button" className="chip" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
          <IconFilter size={13} />
          {showMore ? 'Hide filters' : 'More filters'}
        </button>

        {(filters.category || filters.from || filters.to || filters.search || filters.minAmount || filters.maxAmount || filters.type !== 'all') && (
          <button type="button" className="chip" onClick={() => onChange(EMPTY_FILTERS)}>
            <IconClose size={13} />
            Clear
          </button>
        )}
      </div>

      {showMore && (
        <div className="filters">
          <div className="field">
            <label className="field-label" htmlFor="f-category">
              Category
            </label>
            <select
              id="f-category"
              className="select"
              style={{ height: 40, fontSize: 13 }}
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
              style={{ height: 40, fontSize: 13 }}
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
              style={{ height: 40, fontSize: 13 }}
              value={filters.to}
              min={filters.from || undefined}
              max={todayISO()}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-min">
              Min amount
            </label>
            <input
              id="f-min"
              type="number"
              min="0"
              step="0.01"
              className="input"
              style={{ height: 40, fontSize: 13 }}
              placeholder="0"
              value={filters.minAmount}
              onChange={(e) => onChange({ ...filters, minAmount: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="f-max">
              Max amount
            </label>
            <input
              id="f-max"
              type="number"
              min="0"
              step="0.01"
              className="input"
              style={{ height: 40, fontSize: 13 }}
              placeholder="Any"
              value={filters.maxAmount}
              onChange={(e) => onChange({ ...filters, maxAmount: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function typeLabel(tx: Transaction) {
  return tx.type === 'income' ? 'Income' : 'Expense';
}

export function ActivityList({
  transactions,
  onEdit,
  onDelete,
  emptyAction,
  emptyTitle = 'No transactions yet',
  emptyText = 'Record your first income or expense. Everything you enter is stored privately and recalculates your balance instantly.',
}: {
  transactions: Transaction[];
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => Promise<void> | void;
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const rows = useMemo(() => sortTransactions(transactions), [transactions]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        text={emptyText}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="activity" role="table" aria-label="Transactions">
        {rows.map((tx) => (
          <div className="activity-row" role="row" key={tx.id}>
            <span className={`activity-glyph ${tx.type}`} aria-hidden="true">
              {tx.type === 'income' ? <IconIncome size={17} /> : <IconExpense size={17} />}
            </span>
            <div className="activity-main">
              <div className="activity-title">{tx.description || tx.category}</div>
              <div className="activity-meta">
                {formatDate(tx.date)} · {tx.category} · {typeLabel(tx)}
              </div>
            </div>
            <div className={`activity-amount ${tx.type}`}>
              {tx.type === 'income' ? '+' : '−'}
              {formatMAD(tx.amount)}
            </div>
            <div className="activity-actions">
              {onEdit && (
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Edit transaction"
                  title="Edit transaction"
                  onClick={() => onEdit(tx)}
                >
                  <IconEdit size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="btn-icon danger"
                  aria-label="Delete transaction"
                  title="Delete transaction"
                  onClick={() => setPendingDelete(tx)}
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {pendingDelete && onDelete && (
        <ConfirmDialog
          open
          title="Delete transaction?"
          message="This entry will be removed from your ledger and every balance recalculated."
          confirmLabel="Delete"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            const tx = pendingDelete;
            setPendingDelete(null);
            await onDelete(tx);
          }}
        />
      )}
    </>
  );
}

/** Filterable list used by the Transactions page. */
export function TransactionList(props: {
  transactions: Transaction[];
  filters: TransactionFilters;
  onFiltersChange: (f: TransactionFilters) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => Promise<void> | void;
  emptyAction?: React.ReactNode;
}) {
  const filtered = useMemo(() => applyFilters(props.transactions, props.filters), [props.transactions, props.filters]);
  const hasFilters =
    props.filters.type !== 'all' ||
    Boolean(props.filters.category) ||
    Boolean(props.filters.from) ||
    Boolean(props.filters.to) ||
    Boolean(props.filters.search) ||
    Boolean(props.filters.minAmount) ||
    Boolean(props.filters.maxAmount);

  return (
    <>
      <FilterBar filters={props.filters} onChange={props.onFiltersChange} />
      {hasFilters && filtered.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Nothing matches these filters"
            text="No transaction in your ledger fits this combination. Loosen the range or clear the filters to see everything again."
            action={
              <Button variant="secondary" onClick={() => props.onFiltersChange(EMPTY_FILTERS)}>
                Clear all filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="panel" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <ActivityList
            transactions={filtered}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
            emptyAction={props.emptyAction}
          />
        </div>
      )}
    </>
  );
}

export { ActivityList as TransactionTable };
