/** Add / edit transaction form with client-side validation. */

import { useEffect, useState } from 'react';
import type { Transaction, TransactionInput, TransactionType } from '../../types/finance';
import {
  MAX_DESCRIPTION_LENGTH,
  categoriesForType,
  sanitizeTransactionInput,
  validateTransactionInput,
} from '../../lib/validation';
import { todayISO } from '../../lib/format';
import { Button, Modal } from '../ui';

interface Props {
  open: boolean;
  /** When set, the form edits this transaction; otherwise it creates one. */
  editing?: Transaction | null;
  onClose: () => void;
  onSubmit: (input: TransactionInput) => Promise<void>;
}

export function TransactionForm({ open, editing, onClose, onSubmit }: Props) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setDescription(editing.description);
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      setDate(todayISO());
      setDescription('');
    }
    setErrors({});
  }, [open, editing]);

  const switchType = (next: TransactionType) => {
    setType(next);
    setCategory('');
    setErrors((e) => ({ ...e, category: '', type: '' }));
  };

  const handleSubmit = async () => {
    const input = sanitizeTransactionInput({
      type,
      amount: Number(amount.replace(',', '.')),
      category,
      date,
      description,
    });
    const result = validateTransactionInput(input);
    setErrors(result.errors);
    if (!result.valid) return;
    setBusy(true);
    try {
      await onSubmit(input);
      onClose();
    } catch {
      // Error toast is raised by the store/page layer.
    } finally {
      setBusy(false);
    }
  };

  const categories = categoriesForType(type);

  return (
    <Modal
      open={open}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">
          Type<span className="field-required">*</span>
        </span>
        <div className="segmented" role="group" aria-label="Transaction type">
          <button
            type="button"
            className={type === 'income' ? 'active-income' : ''}
            onClick={() => switchType('income')}
          >
            Income
          </button>
          <button
            type="button"
            className={type === 'expense' ? 'active-expense' : ''}
            onClick={() => switchType('expense')}
          >
            Expense
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="tx-amount">
            Amount<span className="field-required">*</span>
          </label>
          <div className="input-group">
            <input
              id="tx-amount"
              className={`input has-suffix${errors.amount ? ' invalid' : ''}`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            <span className="input-suffix">MAD</span>
          </div>
          {errors.amount ? <span className="field-error">{errors.amount}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-category">
            Category<span className="field-required">*</span>
          </label>
          <select
            id="tx-category"
            className={`select${errors.category ? ' invalid' : ''}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category ? <span className="field-error">{errors.category}</span> : null}
        </div>

        <div className="field full">
          <label className="field-label" htmlFor="tx-date">
            Date<span className="field-required">*</span>
          </label>
          <input
            id="tx-date"
            type="date"
            className={`input${errors.date ? ' invalid' : ''}`}
            value={date}
            max="2100-12-31"
            onChange={(e) => setDate(e.target.value)}
          />
          {errors.date ? <span className="field-error">{errors.date}</span> : null}
        </div>

        <div className="field full">
          <label className="field-label" htmlFor="tx-description">
            Description
            <span className="text-dim text-xs" style={{ marginLeft: 6, fontWeight: 450 }}>
              optional · {description.length}/{MAX_DESCRIPTION_LENGTH}
            </span>
          </label>
          <textarea
            id="tx-description"
            className={`textarea${errors.description ? ' invalid' : ''}`}
            placeholder="What was this for?"
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH + 10}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description ? <span className="field-error">{errors.description}</span> : null}
        </div>
      </div>
    </Modal>
  );
}
