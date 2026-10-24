/** Formatting and small date helpers. Currency is always MAD. */

const madFormatter = new Intl.NumberFormat('en-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const madWholeFormatter = new Intl.NumberFormat('en-MA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** e.g. `1 234.50 MAD` */
export function formatMAD(amount: number): string {
  return `${formatMADNumber(amount)} MAD`;
}

/** Number part only, e.g. `1,234.50` — always the same MAD formatting. */
export function formatMADNumber(amount: number): string {
  return madFormatter.format(amount);
}

/** Compact form for chart axes: `1.2k`, `300` */
export function formatMADCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return madWholeFormatter.format(amount);
}

/** e.g. `24 Oct 2026` */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Today as `YYYY-MM-DD` in the user's local timezone. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM` month key of an ISO date. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** e.g. `Oct 2026` from a `YYYY-MM` key. */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** ISO date `YYYY-MM-DD` shifted by `months` (clamped to end of month). */
export function addMonthsISO(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day = Math.min(d, daysInTarget);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Whole days from `fromISO` until `toISO` (negative = past). */
export function daysBetween(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split('-').map(Number);
  const [y2, m2, d2] = toISO.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}
