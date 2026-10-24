/**
 * Static review of the shipped SQL migration: asserts the access-control
 * assumptions every user-owned table relies on (RLS + per-user CRUD policies).
 *
 * This tests the migration FILE as delivered. Live enforcement by Postgres
 * must additionally be verified against a configured Supabase project
 * (manual step documented in the README).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/0001_init.sql'),
  'utf8',
);

const USER_TABLES = ['profiles', 'accounts', 'transactions', 'financial_goals'] as const;

describe('Database migration security review', () => {
  it('creates exactly the four documented tables — no duplicates', () => {
    const creates = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map(
      (m) => m[1],
    );
    expect(creates.sort()).toEqual([...USER_TABLES].sort());
  });

  it('enables Row Level Security on every user-owned table', () => {
    for (const table of USER_TABLES) {
      expect(sql, `RLS enabled on ${table}`).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      );
    }
  });

  it('scopes SELECT, INSERT, UPDATE and DELETE to the authenticated user', () => {
    for (const table of USER_TABLES) {
      for (const action of ['select', 'insert', 'update', 'delete']) {
        const pattern = new RegExp(
          `create policy "[^"]*"\\s+on public\\.${table} for ${action}`,
          'i',
        );
        expect(sql, `${action} policy on ${table}`).toMatch(pattern);
      }
    }
  });

  it('every ownership policy compares against auth.uid() — not client input', () => {
    // One chunk per `create policy` statement (lookahead split).
    const policyBlocks = sql
      .split(/(?=create policy)/)
      .filter((chunk) => chunk.trimStart().startsWith('create policy'));
    expect(policyBlocks.length).toBeGreaterThanOrEqual(16);
    for (const block of policyBlocks) {
      expect(block).toMatch(/auth\.uid\(\)/);
    }
  });

  it('transaction and goal writes require the account to belong to the user', () => {
    for (const table of ['transactions', 'financial_goals']) {
      const blocks = sql
        .split(/(?=create policy)/)
        .filter((chunk) => chunk.trimStart().startsWith('create policy'))
        .filter((chunk) => new RegExp(`on public\\.${table} for (insert|update)`).test(chunk));
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      for (const b of blocks) {
        expect(b, `${table} write policy`).toMatch(
          /exists \([\s\S]*accounts[\s\S]*a\.user_id = auth\.uid\(\)/,
        );
      }
    }
  });

  it('keeps the opening balance on accounts — never as a transaction row', () => {
    expect(sql).toMatch(/opening_balance\s+numeric\(12, 2\)/);
    expect(sql).toMatch(/opening_balance_set_at\s+timestamptz/);
    // One account per user: one-time initialization is enforceable.
    expect(sql).toMatch(/create unique index if not exists accounts_user_id_key/);
  });

  it('validates amounts, types and dates at the database level', () => {
    expect(sql).toMatch(/check \(type in \('income', 'expense'\)\)/);
    expect(sql).toMatch(/check \(amount > 0 and amount <= 999999999\.99\)/);
    expect(sql).toMatch(/check \(target_amount > 0 and target_amount <= 999999999\.99\)/);
    expect(sql).toMatch(/date\s+date not null/);
  });

  it('never grants anonymous access to financial data', () => {
    const policyBlocks = [...sql.matchAll(/create policy[\s\S]*?;/g)].map((m) => m[0]);
    for (const block of policyBlocks) {
      expect(block, 'every policy requires the authenticated role').toMatch(/to authenticated/);
      expect(block).not.toMatch(/to anon/);
      expect(block).not.toMatch(/to public/);
    }
  });

  it('ships no credentials or secrets', () => {
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/password\s*=/i);
    expect(sql).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // JWT-shaped strings
  });
});
