# MONSSIF MONEY OS

A private **personal finance operating system** — track money, income, expenses, savings and
financial goals in **MAD (Moroccan dirham)**. Real authentication via Supabase Auth, strict
per-user data isolation with PostgreSQL Row Level Security, and a premium editorial
light interface (“Ledger Ivory”: warm ivory canvas, deep green-ink sections, restrained green).

**Money rules (non-negotiable)**

- Current balance = opening balance + recorded income − recorded expenses. Nothing else.
- The starting balance (default **300 MAD**) is stored separately from transactions and is
  initialized **exactly once**. Later changes go through a confirmed Settings workflow and
  never re-run initialization, re-render additions, or migrate duplicates.
- Goal progress is measured against the **actual recorded balance** — hypothetical or
  planned income is never counted as earned.
- No fabricated transactions ever enter a real user's account. Sample data exists only in
  Local Demo Mode.

---

## Modes

| Mode | When | Auth | Storage | Labeling |
| --- | --- | --- | --- | --- |
| **Supabase cloud** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set | Real email/password sign-up, sign-in, sign-out, password reset, persistent sessions | Supabase Postgres, RLS-scoped to the signed-in user | "Supabase cloud · authenticated" |
| **Local Demo** | Supabase not configured, user explicitly opts in | None — clearly stated | Browser `localStorage` only, no sync | "Local demo · browser-only · no sync" |

If Supabase is **not** configured, the app shows a setup screen explaining exactly what is
missing — it never pretends authentication works and never silently falls back to
localStorage while claiming cloud sync. The two modes are separated at every level (routes,
account menu, Settings, repository layer).

---

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
```

- **Without env vars** you get the setup screen: follow the Supabase steps (below) or click
  **“Continue in Local Demo Mode”** to explore with browser-only storage (first-run setup
  offers a clean ledger or a clearly-labeled sample dataset).
- **With env vars set** you get the real authentication screens and cloud storage.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Strict type-check + production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Full test suite (91 tests) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | TypeScript only |

---

## Supabase setup

Everything needed is included; a **free** Supabase project is enough.

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Run the migration**: open the SQL editor and execute
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   It creates `profiles`, `accounts`, `transactions`, `financial_goals` with UUID keys,
   FKs, checks, indexes, `updated_at` triggers, an auto-profile signup trigger, and **RLS
   with per-user SELECT/INSERT/UPDATE/DELETE policies on every table** (ownership via
   `auth.uid()`, plus account-ownership checks on transaction/goal writes). The file is
   idempotent — safe to re-run.
3. **Auth settings** (Dashboard → Authentication):
   - Enable **Email** provider. Turn email confirmation on or off as you prefer (the app
     handles both flows).
   - **Authentication → URL Configuration**:
     - **Site URL** — your production origin, e.g.
       `https://monssifzhairi.github.io/MONSSIF-MONEY-OS/`
     - **Redirect URLs** — add exactly:
       - `http://localhost:5173/**` (local dev)
       - `https://monssifzhairi.github.io/MONSSIF-MONEY-OS/**` (production, sub-path)
       - `https://YOUR-CUSTOM-DOMAIN/**` (if you map a custom domain later)
     Password-recovery emails return the user to these origins so the app can show the
     “choose a new password” screen. The app never sends tokens to any other origin.
4. **Environment variables**: copy `.env.example` → `.env` and set:

   ```bash
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-ANON-KEY
   ```

   Use only the **anon/publishable** key. The **service-role key must never** appear in any
   frontend file, env var, or git commit — it would be exposed in the built bundle.
5. `npm run dev` — you now have real sign-up, sign-in, sign-out and password reset.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. Empty → setup screen / Local Demo Mode. |
| `VITE_SUPABASE_ANON_KEY` | Public anon key. Empty → setup screen / Local Demo Mode. |

---

## Authentication (what is real)

- **Sign-up** (email + password, min 8 chars, confirmation field) via `supabase.auth.signUp`.
- **Sign-in / sign-out** via `signInWithPassword` / `signOut`.
- **Password reset**: `resetPasswordForEmail` sends a recovery link; opening it fires the
  `PASSWORD_RECOVERY` event and the app routes to a “choose a new password” screen backed by
  `auth.updateUser({ password })`.
- **Persistent sessions**: `persistSession` + `autoRefreshToken` (Supabase Auth stores and
  refreshes the session securely — no custom token code).
- **Protected routes**: unauthenticated visitors are redirected to `/auth/login`;
  authenticated users are redirected away from login/register pages.
- **Passwords are never stored or hashed by this app** — they go straight to Supabase Auth.
  No plaintext passwords, no hand-rolled hashing, no service-role keys on the client.

---

## Financial data privacy

- RLS is enabled on all four tables; every policy enforces `auth.uid() = user_id`, and
  insert/update policies additionally require the referenced account to belong to the user.
- The repository binds rows to the **session user id** (server-verified JWT) — never to a
  client-supplied value.
- `tests/security-policies.test.ts` statically audits the shipped migration for these
  guarantees; `tests/auth.test.tsx` covers the app-side assumptions with a mocked client.
- Live RLS enforcement should additionally be spot-checked on a real project (see below).

---

## Features

**Dashboard** — balance as the primary element (ink hero) with an opening/income/expenses
hierarchy, a data-driven running-balance history chart, an original horizontal milestone
track toward your target (e.g. 1,000 MAD) with remaining/percentage/monthly pace, a premium
filterable activity list, income-vs-expense comparison, monthly cash flow and top spending.

**Transactions** — add/edit/delete with strict validation (positive amounts ≤ 2 decimals,
required fields, category-per-type, ISO dates), filters (type, category, date range,
search), delete confirmation, CSV export.

**Goals** — targets + deadlines, progress from the actual balance (capped at target),
overdue/completed states, duplicate-name protection.

**Reports** — monthly summaries, category donuts, per-month history, CSV export.

**Settings** — one-time starting-balance workflow, account panel (change password, sign-out,
recovery email), data export/reset (sample data only in Local Demo Mode), honest storage &
privacy panel.

**Design — “Ledger Ivory”** — warm ivory canvas with deep green-ink hero sections, oversized
Fraunces editorial headings + Inter UI with tabular MAD numerals, a custom MONSSIF wordmark
with a geometric rising-bars mark, minimal top navigation with an elegant account menu,
original ledger artwork on auth screens, hairline tables and refined controls with full
hover/focus/pressed/disabled states, responsive desktop/tablet/mobile layouts (bottom nav on
mobile), keyboard-accessible dialogs and focus rings, `prefers-reduced-motion` support,
loading skeletons and polished empty/success/error states.

---

## How the numbers are computed

| Concept | Formula |
| --- | --- |
| Current balance | `opening_balance + Σ income − Σ expenses` |
| Net savings | `Σ income − Σ expenses` |
| Monthly chart | bucketed by transaction date (`YYYY-MM`), continuous 6-month axis |
| Goal progress | `min(current balance, target) / target` — recorded money only |

All money math rounds to 2 decimals (centimes) via a shared `roundMoney` helper; formatting
is identical everywhere (MAD, 2 decimals, thousands separators).

---

## Testing & verification (automated)

`npm test` → **91 tests passing**; `npm run build` → clean strict-TS production build.

| Suite | Covers |
| --- | --- |
| `tests/calculations.test.ts` | Totals, balance (300 MAD opening), monthly series, breakdowns, goal progress, running-balance history |
| `tests/validation.test.ts` | Amount/date/type/category rules, sanitization, rounding |
| `tests/localRepository.test.ts` | One-time opening balance, CRUD, persistence, reset |
| `tests/csv.test.ts` | CSV generation/escaping |
| `tests/app.smoke.test.tsx` | Real `<App/>` flows: honest setup screen → Local Demo Mode → first-run setup (300 MAD) → dashboard figures → add/delete/recalculate |
| `tests/auth.test.tsx` | **Mocked Supabase**: protected-route redirects, session persistence, sign-in/up/out, password reset + recovery routing, humanized errors, session-derived user ids, no fabricated cloud data, one-time opening balance |
| `tests/security-policies.test.ts` | Static audit of the SQL migration: RLS on every table, full CRUD ownership policies, `auth.uid()` everywhere, account-ownership checks, no secrets |

**Not covered by automation (needs real credentials / manual verification):**

- Live Supabase Auth flows (real emails, deliverability, confirm/recovery links).
- Live RLS enforcement against Postgres (verify in the Supabase SQL editor that a user
  cannot `select` another user's rows).
- Visual review of the redesign in a real browser (the preview build is provided for this).

---

## Deployment (free static hosting)

`dist/` is a static site. Routing uses **clean URLs** (`/auth/login`, `/transactions`, …)
with SPA fallback, so the host must serve `index.html` for unknown paths. This repo ships
the config for all three free hosts:

| Host | SPA fallback config | Build | Output |
| --- | --- | --- | --- |
| **GitHub Pages** | `public/404.html` + inline restore script in `index.html` | `npx vite build --base=/MONSSIF-MONEY-OS/` | `dist/` |
| **Vercel** | `vercel.json` (rewrites + cache headers) | `npm run build` | `dist/` |
| **Cloudflare Pages / Netlify** | `public/_redirects` (`/* /index.html 200`) | `npm run build` | `dist/` |

**Environment variables** are set in the hosting provider’s dashboard (build-time),
never committed: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable only).
With both left empty the deployed site runs in the honest “Supabase not configured”
welcome + Local Demo Mode. The build refuses to boot on a partial or service-role-key
configuration (see `tests/config.test.ts`).

### GitHub Pages (CI)

`.github/workflows/deploy-pages.yml` deploys on every push to the session branch:
`npm ci` → `tsc` → `npm test` → `vite build --base=/MONSSIF-MONEY-OS/` → Pages artifact.

**One-time enablement** — pick either:
1. **One click:** Settings → Pages → Source: **GitHub Actions**, then re-run the workflow; or
2. **Hands-free:** add a repository secret `PAGES_ADMIN_TOKEN` holding a classic PAT with the
   `repo` scope (or a fine-grained token with *Pages: write*). The workflow then enables
   Pages itself through `actions/configure-pages` (`enablement: true`).

The site lives at `https://OWNER.github.io/MONSSIF-MONEY-OS/` (sub-path base is passed at
build time). If the workflow fails at **Setup Pages**, one of the two steps above is
missing — the run log prints this exact fix.

### Vercel / Cloudflare Pages

Import the repo, keep the detected Vite preset (`npm run build`, output `dist/`), add the
two `VITE_` variables in the dashboard, deploy. Then add the final origin to Supabase
**Authentication → URL Configuration → Redirect URLs** (`https://YOUR-DOMAIN/**`).

### Cache behavior

Hashed assets under `/assets/` are served `immutable` (see `vercel.json`); `index.html`
is `no-cache` so releases propagate immediately.

---

## Project structure

```
src/
├── main.tsx                  # entry (fonts + app)
├── App.tsx                   # providers, protected routing, auth gates
├── index.css                 # premium design system
├── auth/AuthContext.tsx      # auth state machine (Supabase Auth + demo mode)
├── types/finance.ts          # domain types (mirror the SQL schema)
├── lib/                      # calculations, validation, format, csv, ids
├── data/
│   ├── repository.ts         # storage interface + mode detection
│   ├── localRepository.ts    # Local Demo Mode (localStorage)
│   ├── supabaseRepository.ts # cloud store (session-derived user ids, RLS)
│   ├── supabaseClient.ts     # single anon-key client
│   └── store.tsx             # finance state (bound to auth state)
├── components/
│   ├── auth/                 # split-screen shell + animated SVG visual
│   ├── layout/AppShell.tsx   # top navigation, account menu, mobile nav
│   ├── ui/                   # buttons, modal, menu, password field, skeletons, icons
│   ├── charts/               # bar/donut charts + balance history
│   └── transactions/         # form, activity list, filters, goal track
└── pages/
    ├── auth/                 # Login, Register, ForgotPassword, UpdatePassword
    ├── Welcome.tsx           # “Supabase not configured” setup screen
    ├── Setup.tsx             # one-time starting balance
    └── Dashboard/Transactions/Goals/Reports/Settings
supabase/migrations/0001_init.sql   # schema + indexes + RLS + triggers
tests/                                # 91 automated tests
```

---

## Status summary

**Implemented & verified (automated)** — full auth flow UI and state machine (sign-up,
sign-in, sign-out, password reset, persistent sessions, protected routes), per-user data
isolation architecture (session-derived ids + RLS migration with complete CRUD ownership
policies), one-time 300 MAD opening-balance semantics preserved, complete finance feature
set, the complete “Ledger Ivory” visual system, 91 passing tests, clean production build.

**Requires real Supabase credentials (manual verification)** — live auth emails and links,
live RLS enforcement, and a human visual pass over the redesign in a real browser.

**Out of scope** — bank integrations, paid services, multi-currency. Budget: 0 MAD.
