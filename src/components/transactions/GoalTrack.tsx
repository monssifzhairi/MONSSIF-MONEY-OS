import { formatMADNumber, formatDate, todayISO } from '../../lib/format';
import type { FinancialGoal } from '../../types/finance';

function monthsUntil(isoDate: string): number {
  const now = new Date(todayISO() + 'T00:00:00');
  const end = new Date(isoDate + 'T00:00:00');
  return Math.max(
    1,
    (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()),
  );
}

/**
 * Original savings-goal composition: an editorial figure block beside a
 * horizontal milestone track (opening → target) with remaining, percentage
 * and monthly pace — deliberately not a generic circular gauge.
 */
export function GoalTrack({
  goal,
  savedAmount,
  openingBalance,
}: {
  goal: FinancialGoal;
  savedAmount: number;
  openingBalance: number;
}) {
  const current = Math.min(savedAmount, goal.targetAmount);
  const pct = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - current);
  const reached = savedAmount >= goal.targetAmount;

  const months = monthsUntil(goal.deadline);
  const monthlyNeeded = remaining > 0 ? remaining / months : 0;
  const startDate = goal.createdAt.slice(0, 10);
  const start = new Date(startDate + 'T00:00:00');
  const elapsedMonths = Math.max(
    1,
    (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth()),
  );
  const paceSoFar = savedAmount / elapsedMonths;
  const openingPct = goal.targetAmount > 0 ? Math.min(100, (openingBalance / goal.targetAmount) * 100) : 0;

  return (
    <section className="panel" aria-label="Savings goal progress">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{goal.name}</h2>
          <p className="panel-hint">
            Milestone track · start {formatMADNumber(openingBalance)} → target{' '}
            {formatMADNumber(goal.targetAmount)} MAD · by {formatDate(goal.deadline)}
          </p>
        </div>
        {reached ? (
          <span className="badge badge-income">Target reached</span>
        ) : (
          <span className="badge badge-neutral">{Math.round(pct)}% funded</span>
        )}
      </div>

      <div className="goal-composition">
        <div>
          <div className="goal-figures">
            <span className="goal-current">{formatMADNumber(savedAmount)}</span>
            <span className="goal-target-note">
              MAD saved <span className="text-dim">·</span> of {formatMADNumber(goal.targetAmount)} MAD
            </span>
          </div>

          <div className="goal-track-wrap">
            <div
              className="goal-track"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${goal.name} progress`}
            >
              <div className="goal-track-fill" style={{ width: `${Math.max(pct, 1.5)}%` }} />
              <div className="goal-track-marker" style={{ left: `${openingPct}%` }} />
              <div className="goal-track-cap" style={{ left: `${Math.max(pct, 1.5)}%` }} />
            </div>
            <div className="goal-track-labels">
              <span>
                Opening
                <strong>{formatMADNumber(openingBalance)}</strong>
              </span>
              <span style={{ textAlign: 'center' }}>
                You are here
                <strong>{Math.round(pct)}%</strong>
              </span>
              <span style={{ textAlign: 'right' }}>
                Target
                <strong>{formatMADNumber(goal.targetAmount)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="goal-side">
          <div className="goal-side-item">
            <span>Remaining to target</span>
            <strong>{formatMADNumber(remaining)} MAD</strong>
          </div>
          <div className="goal-side-item">
            <span>Monthly pace so far</span>
            <strong>{formatMADNumber(paceSoFar)} MAD</strong>
          </div>
          <div className="goal-side-item">
            <span>Months to deadline</span>
            <strong>{months} months</strong>
          </div>
          {remaining > 0 && (
            <p className="pace-note">
              Setting aside <strong>{formatMADNumber(monthlyNeeded)} MAD</strong> each month reaches the
              target by {formatDate(goal.deadline)} — only transfers you record count.
            </p>
          )}
          {reached && (
            <p className="pace-note">
              <strong>Target reached.</strong> Your ledger already covers the full{' '}
              {formatMADNumber(goal.targetAmount)} MAD goal.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
