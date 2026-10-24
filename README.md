# MONSSIF MONEY OS

A real, working **personal finance system** — track money, income, expenses, savings and
financial goals in **MAD (Moroccan dirham)**. Built as a private tool, not a dashboard mockup:
every figure on screen is computed from your recorded data, and **hypothetical income is
never counted as earned money**.

**Design principles**

- Current balance = opening balance + recorded income − recorded expenses. Nothing else.
- The starting balance (default **300 MAD**) is stored separately from transactions and is
  initialized **exactly once**. Changing it later goes through an explicit Settings workflow —
  it never creates or duplicates a transaction.
- Goal progress is measured against the **actual recorded balance**, never against planned
  income.
- Preserve savings first, build income second — the product language and defaults follow
  that priority.

---

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite 5                |
| Charts     | Recharts (restrained, dark-themed)            |
| Storage    | **Local mode** (browser `localStorage`) or **Supabase PostgreSQL** |
| Auth       | Supabase Auth (email + password), only in Supabase mode |
| Tests      | Vitest + happy-dom (unit + app smoke tests)   |
| Styling    | Hand-rolled design system CSS (no UI kit)     |

---

## Quick start (local mode — zero configuration)

No Supabase project is required. With Node.js 18+ installed:

```bash
npm install
npm run dev        # → http://localhost:5173
```

On first launch you get a one-time setup screen:

1. **Starting balance** — defaults to **300 MAD** (editable before you begin).
2. **Start clean** (empty ledger) or **Explore with sample data** (16 realistic demo
   entries around a 300 MAD start, plus a "First 1,000 MAD" goal). Sample data is always an
   explicit choice and can be re-loaded or wiped from **Settings**.

Data lives in your browser (`localStorage`, key `monssif-money-os:v1`) and survives reloads.
The app clearly labels this as **Local mode** in the sidebar — it never pretends a database
is connected when it is not.

### Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the development server                      |
| `npm run build`     | Type-check + production build into `dist/`        |
| `npm run preview`   | Serve the production build                        |
| `npm test`          | Run the full test suite once                      |
| `npm run test:watch`| Run tests in watch mode                           |
| `npm run typecheck` | TypeScript only                                   |

---

## Features

### Dashboard
- Current balance computed from the opening balance and all recorded transactions.
- Total income, total expenses, net savings cards.
- Progress toward your primary savings goal (e.g. **1,000 MAD**), with "to go" and days left.
- Income-vs-expense bar chart (last 6 months).
- Top spending categories and recent transactions.

### Transactions
- Add / edit / delete income and expense entries: **amount, type, category, date, description**.
- Client-side validation (positive amounts, ≤ 2 decimals, required fields, category matches
  type, ISO dates, description length) — the Supabase schema enforces the same rules again
  at the database level.
- Filter by type, category, date range, and free-text search.
- Deletion always asks for confirmation.
- Toasts for success/failure; empty, loading and error states everywhere.

### Financial goals
- Create/edit goals with **name, target amount, deadline** (duplicate names rejected).
- Progress = your real recorded balance capped at the target — with a visible note that
  future income is never counted.
- Overdue / completed badges, remaining amount, days left.

### Reports
- Monthly summaries table (income, expenses, net per month).
- Income and expense category breakdowns (donut charts).
- Per-month transaction history.
- **CSV export** (RFC-4180 escaping, works in Excel/Numbers/Sheets).

### Settings
- **Change starting balance** workflow (explicit, confirmed, never re-initializes).
- Export all transactions to CSV.
- Load sample data / reset everything (both behind confirmation dialogs).
- Storage-mode panel explaining exactly where data lives.

---

## Environment variables

Copy `.env.example` to `.env` and fill in values as needed. **Never commit `.env`.**

| Variable                  | Required for        | Notes |
| ------------------------- | ------------------- | ----- |
| `VITE_SUPABASE_URL`       | Supabase mode       | Project URL (Settings → API in Supabase). Leave empty for local mode. |
| `VITE_SUPABASE_ANON_KEY`  | Supabase mode       | The **anon/public** key only. **Never** put a `service_role` key in a frontend env var — it would be exposed in the built bundle. |
| `VITE_SEED_SAMPLE_DATA`   | optional            | Reserved flag; sample data is normally loaded from the setup screen or Settings. |

Supabase mode activates **only** when both variables are present and well-formed. Otherwise
the app runs in documented local mode. Nothing is faked either way — the sidebar and
Settings always show the true storage mode.

---

## Connecting the real database (Supabase) later

Everything needed is included; you only need a free Supabase project.

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. Open the **SQL editor** and run the migration file
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   It creates:
   - `profiles` — one row per auth user.
   - `accounts` — the opening balance (stored **separately** from transactions; a unique
     index on `user_id` makes one-time initialization enforceable).
   - `transactions` — type/amount/category/date/description with check constraints,
     foreign keys and indexes (`user_id + date`, `user_id + category`, `user_id + type`).
   - `financial_goals` — name, target amount, deadline.
   - `updated_at` triggers and an auth-signup trigger that auto-creates `profiles` rows.
   - **Row Level Security** on every table: authenticated users can only read/write their
     own rows. No table is public.
3. In `supabase` Auth settings, configure who can sign up (email confirmation is supported —
   the app handles both flows).
4. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. `npm run dev` — the app now shows **Supabase connected** and presents the sign-in screen
   (email + password) before first use.

The repository layer (`src/data/repository.ts`) is the seam between UI and storage:
`LocalFinanceRepository` and `SupabaseFinanceRepository` implement the same interface, so
both modes run identical validation and calculations.

### Security notes
- RLS is enabled on all four tables; policies scope every statement to `auth.uid() = user_id`.
- Only the anon key reaches the browser. The service-role key must never appear in frontend
  code, env vars, or the repository.
- No credentials or `.env` files are committed (`.gitignore` enforces this).
- Inputs are validated on the client *and* constrained again in the database schema.

---

## How the numbers are computed

| Concept        | Formula |
| -------------- | ------- |
| Current balance | `opening_balance + Σ income − Σ expenses` |
| Net savings     | `Σ income − Σ expenses` |
| Monthly chart   | bucketed by transaction date (`YYYY-MM`), continuous 6-month axis |
| Goal progress   | `min(current balance, target) / target` — recorded money only |

All money math rounds to 2 decimals (centimes) via a shared `roundMoney` helper; floating
point sums are re-rounded at every step (covered by tests).

---

## Data model (mirrors the Supabase schema)

```
profiles (id → auth.users, email, full_name)
accounts (id, user_id, name, currency='MAD', opening_balance, opening_balance_set_at)
   └── transactions (id, user_id, account_id, type, amount, category, date, description)
   └── financial_goals (id, user_id, account_id, name, target_amount, deadline)
```

UUID primary keys, `timestamptz` audit columns, FK cascade deletes, check constraints on
amounts/types/dates, and per-user indexes for the filter queries.

---

## Testing & verification results

`npm test` runs **59 tests** (Vitest + happy-dom), all passing at the time of writing:

- `tests/calculations.test.ts` — totals, balance (300 MAD opening scenario), monthly series,
  category breakdowns, goal progress (30 % of 1,000 MAD, capping, overdue, negative balance).
- `tests/validation.test.ts` — amount/date/type/category rules, sanitization, duplicate
  goal names, money rounding.
- `tests/localRepository.test.ts` — one-time opening-balance initialization, CRUD with
  validation, persistence across reloads, sample data never re-initializing the opening
  balance, full reset.
- `tests/csv.test.ts` — CSV generation and escaping.
- `tests/app.smoke.test.tsx` — boots the real `<App/>`, drives first-time setup (clean and
  sample), verifies rendered balances (e.g. sample data → **1,420.00 MAD** = 300 + 1,590 −
  470), adds invalid and valid transactions, confirms balance recalculation after add/delete.

`npm run build` performs `tsc --noEmit` (strict) + Vite production build — clean, with
vendor code split into separate chunks (the Supabase adapter loads only when configured).

---

## Deployment (free static hosting)

The build output in `dist/` is a static site — deploy anywhere free:

**Netlify** — build command `npm run build`, publish directory `dist`.
**Vercel** — framework preset "Vite", output `dist`.
**GitHub Pages** — build and push `dist/` (the app uses `HashRouter`, so no server-side
rewrite rules are needed).

Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as build-time environment variables in
the host's dashboard if you deploy in Supabase mode.

---

## Project structure

```
src/
├── main.tsx                 # entry
├── App.tsx                  # providers, routing, setup/auth gate
├── index.css                # design system (near-black / charcoal / emerald)
├── types/finance.ts         # domain types (mirror the SQL schema)
├── lib/
│   ├── calculations.ts      # pure money math (fully unit-tested)
│   ├── validation.ts        # shared client/server-side input rules
│   ├── format.ts            # MAD formatting, ISO date helpers
│   ├── csv.ts               # CSV export + download
│   └── id.ts                # UUID v4
├── data/
│   ├── repository.ts        # storage interface + mode detection
│   ├── localRepository.ts   # localStorage implementation
│   ├── supabaseRepository.ts# Supabase implementation (RLS-aware)
│   ├── sampleData.ts        # explicit sample dataset (300 MAD anchor)
│   ├── store.tsx            # React context + typed actions
│   └── errors.ts            # shared error types
├── components/
│   ├── layout/AppShell.tsx  # sidebar + mobile nav
│   ├── ui/                  # buttons, modal, toasts, empty states, icons
│   ├── charts/              # Recharts wrappers (bar + donut)
│   ├── transactions/        # form, table, filters
│   └── SupabaseSignIn.tsx   # auth screen (Supabase mode only)
└── pages/                   # Dashboard, Transactions, Goals, Reports, Settings, Setup
supabase/migrations/
└── 0001_init.sql            # schema + indexes + RLS + triggers
tests/                       # Vitest unit + smoke tests
```

---

## Status summary

**Works out of the box (local mode)** — full setup flow with the 300 MAD starting balance,
transactions CRUD with validation and filtering, goals with real progress, dashboard charts,
monthly/category reports, CSV export, one-time initialization and Settings workflows,
59 passing tests, clean strict-TS production build.

**Requires configuration** — Supabase persistence and authentication: create a free
project, run the included migration, fill the two env vars. Schema, RLS policies, the
repository adapter and the sign-in screen are already implemented; no data is invented and
the app never claims a database connection it does not have.

**Out of scope (intentionally)** — bank integrations, paid services, multi-currency,
risk-taking features. Budget for this project: 0 MAD.
