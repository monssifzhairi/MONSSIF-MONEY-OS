/**
 * Data-driven running-balance history. Renders a quiet line/area chart from
 * real ledger data via runningBalanceHistory(); shows an explicit empty
 * state when there is no history to plot.
 */

import { useMemo } from 'react';
import { runningBalanceHistory, type BalancePoint } from '../../lib/calculations';
import { formatMADNumber, formatDate } from '../../lib/format';
import type { Transaction } from '../../types/finance';

function niceRange(values: number[]): [number, number] {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 50;
    max += 50;
  }
  const pad = (max - min) * 0.12;
  return [min - pad, max + pad];
}

function buildPath(points: BalancePoint[], width: number, height: number, min: number, max: number) {
  const n = points.length;
  const x = (i: number) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.balance).toFixed(2)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(2)},${height} L${x(0).toFixed(2)},${height} Z`;
  return { line, area, x, y };
}

export function BalanceHistory({
  openingBalance,
  transactions,
  height = 200,
}: {
  openingBalance: number;
  transactions: Transaction[];
  height?: number;
}) {
  const points = useMemo(
    () => runningBalanceHistory(openingBalance, transactions),
    [openingBalance, transactions],
  );
  const hasHistory = transactions.length > 0 && points.length > 1;

  const width = 640;
  const [min, max] = niceRange(points.map((p) => p.balance));
  const { line, area, x, y } = buildPath(points, width, height, min, max);
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.balance - first.balance;

  return (
    <div className="hero-history">
      <div className="hero-history-head">
        <span className="hero-history-title">Balance history</span>
        {hasHistory ? (
          <span className="hero-history-meta">
            {formatDate(first.date)} → {formatDate(last.date)}
          </span>
        ) : null}
      </div>

      {hasHistory ? (
        <>
          <svg
            className="history-chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Balance history from ${formatDate(first.date)} to ${formatDate(last.date)}`}
          >
            <defs>
              <linearGradient id="balance-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FCC84" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4FCC84" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} stroke="#F2EEE4" strokeOpacity="0.08" strokeWidth="1" />
            ))}
            <path d={area} fill="url(#balance-area)" />
            <path d={line} fill="none" stroke="#4FCC84" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <circle cx={x(0)} cy={y(first.balance)} r="4" fill="#4FCC84" fillOpacity="0.7" />
            <circle cx={x(points.length - 1)} cy={y(last.balance)} r="5.5" fill="#4FCC84" stroke="#0C1712" strokeWidth="2" />
          </svg>
          <div className="hero-history-meta history-foot" style={{ marginTop: 10 }}>
            <span>
              {formatDate(first.date)} · {formatMADNumber(first.balance)} MAD
            </span>
            <span style={{ color: delta >= 0 ? 'var(--accent-on-ink)' : '#f2a49c' }}>
              {delta >= 0 ? '+' : '−'}
              {formatMADNumber(Math.abs(delta))} MAD over the period
            </span>
            <span>
              {formatDate(last.date)} · {formatMADNumber(last.balance)} MAD
            </span>
          </div>
        </>
      ) : (
        <div className="history-empty">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="m7 14 4-4 3 3 5-6" strokeOpacity="0.6" />
          </svg>
          <div>
            Your balance history will draw itself
            <br />
            from real transactions as you record them.
          </div>
          <div className="tnum">
            Ledger starts at {formatMADNumber(openingBalance)} MAD
          </div>
        </div>
      )}
    </div>
  );
}
