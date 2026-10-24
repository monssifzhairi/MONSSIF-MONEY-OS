/** Financial goals: create, edit, delete savings goals with real progress. */

import { useMemo, useState } from 'react';
import { useFinance } from '../data/store';
import type { FinancialGoal, GoalInput } from '../types/finance';
import { goalProgress } from '../lib/calculations';
import { calculateBalance } from '../lib/calculations';
import { formatMAD, formatDate, addMonthsISO, todayISO } from '../lib/format';
import {
  MAX_GOAL_NAME_LENGTH,
  isDuplicateGoalName,
  sanitizeGoalInput,
  validateGoalInput,
} from '../lib/validation';
import { PageHeader } from '../components/layout/AppShell';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  ProgressBar,
  useToast,
} from '../components/ui';
import {
  IconCalendar,
  IconEdit,
  IconGoal,
  IconPlus,
  IconTarget,
  IconTrash,
  IconWallet,
} from '../components/ui/icons';

function GoalFormModal({
  open,
  editing,
  existingGoals,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: FinancialGoal | null;
  existingGoals: FinancialGoal[];
  onClose: () => void;
  onSubmit: (input: GoalInput, id?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState(addMonthsISO(todayISO(), 6));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Reset whenever the dialog opens.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setTargetAmount(editing ? String(editing.targetAmount) : '');
      setDeadline(editing?.deadline ?? addMonthsISO(todayISO(), 6));
      setErrors({});
    }
  }

  const handleSubmit = async () => {
    const input = sanitizeGoalInput({
      name,
      targetAmount: Number(targetAmount.replace(',', '.')),
      deadline,
    });
    const result = validateGoalInput(input);
    const nextErrors = { ...result.errors };
    if (!nextErrors.name && isDuplicateGoalName(input.name, existingGoals, editing?.id)) {
      nextErrors.name = 'A goal with this name already exists.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      await onSubmit(input, editing?.id);
      onClose();
    } catch {
      // Toast raised by parent.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? 'Edit goal' : 'New savings goal'}
      description="Progress is measured against your real, recorded balance. Planned or future income is never counted."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="field-label" htmlFor="goal-name">
          Goal name<span className="field-required">*</span>
        </label>
        <input
          id="goal-name"
          className={`input${errors.name ? ' invalid' : ''}`}
          placeholder="e.g. First 1,000 MAD"
          maxLength={MAX_GOAL_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </div>

      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="goal-target">
            Target amount<span className="field-required">*</span>
          </label>
          <div className="input-group">
            <input
              id="goal-target"
              className={`input has-suffix${errors.targetAmount ? ' invalid' : ''}`}
              inputMode="decimal"
              placeholder="1000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
            <span className="input-suffix">MAD</span>
          </div>
          {errors.targetAmount ? <span className="field-error">{errors.targetAmount}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="goal-deadline">
            Deadline<span className="field-required">*</span>
          </label>
          <input
            id="goal-deadline"
            type="date"
            className={`input${errors.deadline ? ' invalid' : ''}`}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          {errors.deadline ? <span className="field-error">{errors.deadline}</span> : null}
        </div>
      </div>
    </Modal>
  );
}

export function Goals() {
  const { data, addGoal, updateGoal, deleteGoal, ready } = useFinance();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FinancialGoal | null>(null);

  const balance = useMemo(
    () => calculateBalance(data.account.openingBalance, data.transactions),
    [data.account.openingBalance, data.transactions],
  );

  const handleSubmit = async (input: GoalInput, id?: string) => {
    try {
      if (id) {
        await updateGoal(id, input);
        toast.success('Goal updated');
      } else {
        await addGoal(input);
        toast.success('Goal created', 'Progress tracks your real balance from now on.');
      }
    } catch (err) {
      toast.error('Could not save goal', (err as Error).message);
      throw err;
    }
  };

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="spinner" />
        <span>Loading goals…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Financial goals"
        subtitle="Targets and deadlines, measured against money you actually have."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus size={15} />
            New goal
          </Button>
        }
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="empty-icon" style={{ margin: 0 }}>
            <IconWallet size={20} />
          </div>
          <div>
            <div className="font-semibold">Available for goals: {formatMAD(balance)}</div>
            <div className="text-xs text-dim" style={{ marginTop: 2, lineHeight: 1.6 }}>
              This is your real balance — opening balance plus recorded income minus recorded
              expenses. Hypothetical income (expected salary, planned work, hoped-for gifts) is
              never counted as earned money.
            </div>
          </div>
        </div>
      </div>

      {data.goals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconGoal size={20} />}
            title="No savings goals yet"
            text="Set a target and a deadline — for example, your first 1,000 MAD by a chosen date."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <IconPlus size={15} />
                Create your first goal
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid-2-equal">
          {data.goals.map((goal) => {
            const p = goalProgress(goal, balance);
            return (
              <div className="goal-card" key={goal.id}>
                <div className="row-between">
                  <div>
                    <div className="font-semibold" style={{ fontSize: 15 }}>
                      {goal.name}
                    </div>
                    <div className="text-xs text-dim" style={{ marginTop: 3 }}>
                      Target by {formatDate(goal.deadline)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      className="btn-icon"
                      aria-label="Edit goal"
                      onClick={() => {
                        setEditing(goal);
                        setFormOpen(true);
                      }}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      className="btn-icon danger"
                      aria-label="Delete goal"
                      onClick={() => setPendingDelete(goal)}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="goal-amount-row">
                    <span className="goal-saved">{formatMAD(p.saved)}</span>
                    <span className="goal-target">of {formatMAD(goal.targetAmount)}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <ProgressBar
                      percent={p.percent}
                      label="Saved so far"
                      value={`${p.percent.toFixed(1)}%`}
                      warning={p.overdue}
                    />
                  </div>
                </div>

                <div className="goal-meta">
                  <span className="goal-meta-item">
                    <IconTarget size={13} />
                    {p.remaining > 0 ? `${formatMAD(p.remaining)} remaining` : 'Fully funded'}
                  </span>
                  <span className="goal-meta-item">
                    <IconCalendar size={13} />
                    {p.overdue
                      ? 'Deadline passed'
                      : p.completed
                        ? 'Completed'
                        : `${p.daysLeft} days left`}
                  </span>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  {p.completed && <Badge kind="income">Target reached</Badge>}
                  {p.overdue && <Badge kind="warning">Overdue</Badge>}
                  {!p.completed && !p.overdue && p.daysLeft <= 30 && (
                    <Badge kind="warning">{p.daysLeft} days left</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={formOpen}
        editing={editing}
        existingGoals={data.goals}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete goal?"
        message={`"${pendingDelete?.name ?? ''}" will be permanently removed. Your saved money is not affected — only the goal disappears.`}
        confirmLabel="Delete goal"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteGoal(pendingDelete.id);
            toast.success('Goal deleted');
          } catch (err) {
            toast.error('Could not delete goal', (err as Error).message);
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}
