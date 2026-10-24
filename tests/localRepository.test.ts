import { beforeEach, describe, expect, it } from 'vitest';
import { LocalFinanceRepository, ValidationError } from '../src/data/localRepository';
import { calculateBalance, calculateTotals } from '../src/lib/calculations';

describe('LocalFinanceRepository', () => {
  let repo: LocalFinanceRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalFinanceRepository();
  });

  it('starts empty with setup incomplete', async () => {
    const data = await repo.load();
    expect(data.transactions).toEqual([]);
    expect(data.goals).toEqual([]);
    expect(data.account.openingBalance).toBe(0);
    expect(data.account.openingBalanceSetAt).toBeNull();
    expect(data.settings.setupComplete).toBe(false);
  });

  it('initializes the opening balance exactly once (300 MAD scenario)', async () => {
    const account = await repo.setOpeningBalance(300);
    expect(account.openingBalance).toBe(300);
    const firstSetAt = account.openingBalanceSetAt;
    expect(firstSetAt).toBeTruthy();

    // A second call changes the value but never re-initializes.
    const updated = await repo.setOpeningBalance(350);
    expect(updated.openingBalance).toBe(350);
    expect(updated.openingBalanceSetAt).toBe(firstSetAt);
  });

  it('rejects invalid opening balances', async () => {
    await expect(repo.setOpeningBalance(-1)).rejects.toBeInstanceOf(ValidationError);
  });

  it('adds, updates and deletes transactions with validation', async () => {
    await repo.setOpeningBalance(300);
    const tx = await repo.addTransaction({
      type: 'income',
      amount: 250.5,
      category: 'Freelance',
      date: '2026-10-24',
      description: 'Logo job',
    });
    expect(tx.amount).toBe(250.5);

    const updated = await repo.updateTransaction(tx.id, { amount: 300 });
    expect(updated.amount).toBe(300);

    await repo.deleteTransaction(tx.id);
    const data = await repo.load();
    expect(data.transactions).toEqual([]);
  });

  it('rejects invalid transactions with field errors', async () => {
    await expect(
      repo.addTransaction({
        type: 'expense',
        amount: -5,
        category: 'Food',
        date: '2026-10-24',
        description: '',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      repo.addTransaction({
        type: 'income',
        amount: 10,
        category: 'NotARealCategory',
        date: '2026-10-24',
        description: '',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      repo.addTransaction({
        type: 'expense',
        amount: 10,
        category: 'Food',
        date: 'not-a-date',
        description: '',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('computes balance from opening + recorded transactions only', async () => {
    await repo.setOpeningBalance(300);
    await repo.addTransaction({
      type: 'income',
      amount: 450,
      category: 'Freelance',
      date: '2026-10-01',
      description: '',
    });
    await repo.addTransaction({
      type: 'expense',
      amount: 120,
      category: 'Food',
      date: '2026-10-02',
      description: '',
    });
    const data = await repo.load();
    expect(calculateBalance(data.account.openingBalance, data.transactions)).toBe(630);
    expect(calculateTotals(data.transactions).netSavings).toBe(330);
  });

  it('persists across repository instances (reload simulation)', async () => {
    await repo.setOpeningBalance(300);
    await repo.addTransaction({
      type: 'expense',
      amount: 50,
      category: 'Transport',
      date: '2026-10-24',
      description: 'Taxi',
    });

    const reloaded = new LocalFinanceRepository();
    const data = await reloaded.load();
    expect(data.account.openingBalance).toBe(300);
    expect(data.transactions).toHaveLength(1);
  });

  it('manages goals with validation and duplicate-name checks at UI level', async () => {
    const goal = await repo.addGoal({
      name: 'First 1,000 MAD',
      targetAmount: 1000,
      deadline: '2027-04-01',
    });
    expect(goal.targetAmount).toBe(1000);

    const updated = await repo.updateGoal(goal.id, { targetAmount: 1200 });
    expect(updated.targetAmount).toBe(1200);

    await repo.deleteGoal(goal.id);
    expect((await repo.load()).goals).toEqual([]);
  });

  it('loads sample data without re-initializing the opening balance', async () => {
    await repo.setOpeningBalance(555);
    const data = await repo.loadSampleData();
    expect(data.transactions.length).toBeGreaterThan(10);
    expect(data.goals.length).toBe(1);
    expect(data.account.openingBalance).toBe(555);
    expect(data.settings.sampleDataLoaded).toBe(true);
  });

  it('resets everything back to a blank slate', async () => {
    await repo.setOpeningBalance(300);
    await repo.addTransaction({
      type: 'income',
      amount: 10,
      category: 'Gift',
      date: '2026-10-24',
      description: '',
    });
    const data = await repo.resetAll();
    expect(data.transactions).toEqual([]);
    expect(data.account.openingBalanceSetAt).toBeNull();
    expect(data.settings.setupComplete).toBe(false);
  });
});
