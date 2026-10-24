import { describe, expect, it } from 'vitest';
import { CSV_HEADER, csvFilename, transactionsToCSV } from '../src/lib/csv';
import type { Transaction } from '../src/types/finance';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? 't1',
    type: partial.type ?? 'income',
    amount: partial.amount ?? 100,
    category: partial.category ?? 'Salary',
    date: partial.date ?? '2026-10-24',
    description: partial.description ?? '',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
  };
}

describe('transactionsToCSV', () => {
  it('writes a header and one row per transaction', () => {
    const csv = transactionsToCSV([
      tx({}),
      tx({ id: 't2', type: 'expense', amount: 42.5, category: 'Food', description: 'Bread' }),
    ]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-10-24,income,Salary,100.00,');
    expect(lines[2]).toBe('2026-10-24,expense,Food,42.50,Bread');
  });

  it('escapes commas, quotes and newlines', () => {
    const csv = transactionsToCSV([
      tx({ description: 'Say "hi", now\nplease' }),
    ]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[1]).toContain('"Say ""hi"", now\nplease"');
  });

  it('formats amounts with exactly 2 decimals', () => {
    const csv = transactionsToCSV([tx({ amount: 300 })]);
    expect(csv).toContain('300.00');
  });

  it('handles an empty list', () => {
    expect(transactionsToCSV([])).toBe(CSV_HEADER.join(',') + '\r\n');
  });
});

describe('csvFilename', () => {
  it('contains the prefix and a date stamp', () => {
    const name = csvFilename();
    expect(name.startsWith('monssif-money-os-transactions-')).toBe(true);
    expect(name.endsWith('.csv')).toBe(true);
  });
});
