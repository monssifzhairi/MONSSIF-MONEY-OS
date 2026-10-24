/**
 * CSV export for transactions. RFC-4180-style escaping so the file opens
 * cleanly in Excel, Numbers and Google Sheets.
 */

import type { Transaction } from '../types/finance';

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const CSV_HEADER = ['Date', 'Type', 'Category', 'Amount (MAD)', 'Description'];

export function transactionsToCSV(transactions: Transaction[]): string {
  const rows = transactions.map((tx) =>
    [
      tx.date,
      tx.type,
      tx.category,
      tx.amount.toFixed(2),
      tx.description,
    ]
      .map((field) => escapeField(String(field)))
      .join(','),
  );
  return [CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n';
}

export function csvFilename(prefix = 'monssif-money-os'): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${prefix}-transactions-${stamp}.csv`;
}

/** Trigger a browser download of the CSV text. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
