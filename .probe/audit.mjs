/**
 * Mobile responsive audit — real headless Chromium (via @sparticuz/chromium).
 * Measures horizontal overflow and element-level out-of-viewport geometry at
 * target widths, and saves a screenshot per page/width for visual inspection.
 */
import chromium from '@sparticuz/chromium';
import { inflate } from '@sparticuz/chromium';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:4180';
const WIDTHS = [320, 360, 375, 390, 430];
const TAG = process.env.AUDIT_TAG || 'run';

const DEMO_SEED = {
  version: 1,
  account: {
    id: 'acc1', name: 'Main account', currency: 'MAD',
    openingBalance: 300, openingBalanceSetAt: '2026-07-01T10:00:00.000Z', createdAt: '2026-07-01T10:00:00.000Z',
  },
  transactions: [
    { id: 't1', type: 'income', amount: 1500, category: 'Freelance', date: '2026-10-20', description: 'Client project October', createdAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-20T09:00:00.000Z' },
    { id: 't2', type: 'expense', amount: 250.5, category: 'Food', date: '2026-10-18', description: 'Weekly groceries and household supplies', createdAt: '2026-10-18T09:00:00.000Z', updatedAt: '2026-10-18T09:00:00.000Z' },
    { id: 't3', type: 'expense', amount: 60, category: 'Transport', date: '2026-10-15', description: 'Train tickets', createdAt: '2026-10-15T09:00:00.000Z', updatedAt: '2026-10-15T09:00:00.000Z' },
    { id: 't4', type: 'income', amount: 90, category: 'Salary', date: '2026-10-10', description: 'Part-time', createdAt: '2026-10-10T09:00:00.000Z', updatedAt: '2026-10-10T09:00:00.000Z' },
    { id: 't5', type: 'expense', amount: 45.9, category: 'Entertainment', date: '2026-10-08', description: 'Cinema with family', createdAt: '2026-10-08T09:00:00.000Z', updatedAt: '2026-10-08T09:00:00.000Z' },
    { id: 't6', type: 'expense', amount: 20, category: 'Other', date: '2026-10-07', description: 'eSIM data recharge', createdAt: '2026-10-07T09:00:00.000Z', updatedAt: '2026-10-07T09:00:00.000Z' },
    { id: 't7', type: 'income', amount: 3200, category: 'Business', date: '2026-09-15', description: 'September invoicing', createdAt: '2026-09-15T09:00:00.000Z', updatedAt: '2026-09-15T09:00:00.000Z' },
    { id: 't8', type: 'expense', amount: 430, category: 'Housing', date: '2026-09-12', description: 'Rent share', createdAt: '2026-09-12T09:00:00.000Z', updatedAt: '2026-09-12T09:00:00.000Z' },
    { id: 't9', type: 'expense', amount: 120.25, category: 'Utilities', date: '2026-09-05', description: 'Electricity bill', createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z' },
    { id: 't10', type: 'income', amount: 2100, category: 'Business', date: '2026-08-14', description: 'August invoicing', createdAt: '2026-08-14T09:00:00.000Z', updatedAt: '2026-08-14T09:00:00.000Z' },
    { id: 't11', type: 'expense', amount: 310, category: 'Shopping', date: '2026-08-10', description: 'Winter clothes', createdAt: '2026-08-10T09:00:00.000Z', updatedAt: '2026-08-10T09:00:00.000Z' },
    { id: 't12', type: 'expense', amount: 88.8, category: 'Health', date: '2026-08-03', description: 'Pharmacy', createdAt: '2026-08-03T09:00:00.000Z', updatedAt: '2026-08-03T09:00:00.000Z' },
    { id: 't13', type: 'income', amount: 700, category: 'Other', date: '2026-07-12', description: 'Old laptop sale', createdAt: '2026-07-12T09:00:00.000Z', updatedAt: '2026-07-12T09:00:00.000Z' },
    { id: 't14', type: 'expense', amount: 240, category: 'Travel', date: '2026-07-08', description: 'Weekend trip', createdAt: '2026-07-08T09:00:00.000Z', updatedAt: '2026-07-08T09:00:00.000Z' },
  ],
  goals: [
    { id: 'g1', name: 'First 1,000 MAD', targetAmount: 1000, deadline: '2027-06-30', createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
    { id: 'g2', name: 'Emergency cushion for family and travel plans', targetAmount: 6000, deadline: '2027-02-28', createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' },
  ],
  settings: { setupComplete: true, sampleDataLoaded: true },
};

const PAGES = [
  { tag: 'welcome', path: '/', seed: 'none' },
  { tag: 'setup', path: '/', seed: 'setup' },
  { tag: 'dashboard', path: '/', seed: 'demo' },
  { tag: 'transactions', path: '/transactions', seed: 'demo' },
  { tag: 'goals', path: '/goals', seed: 'demo' },
  { tag: 'reports', path: '/reports', seed: 'demo' },
  { tag: 'settings', path: '/settings', seed: 'demo' },
  { tag: 'login', path: '/auth/login', seed: 'none' },
  { tag: 'register', path: '/auth/register', seed: 'none' },
  { tag: 'forgot', path: '/auth/forgot-password', seed: 'none' },
];

const MEASURE = () => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const overflowX = doc.scrollWidth > doc.clientWidth + 1;
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX)) return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.bottom < -2 || r.top > window.innerHeight + 2000) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el)) {
      offenders.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 70),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36),
      });
    }
  }
  // de-dupe nested offenders: keep the outermost
  const filtered = offenders.filter((o, i) => !offenders.some((p, j) => j < i && o.left >= p.left - 1 && o.right <= p.right + 1 && o.text.startsWith(p.text.slice(0, 10))));
  const modal = document.querySelector('.modal');
  let modalTooTall = null;
  if (modal) {
    const mr = modal.getBoundingClientRect();
    if (mr.height > window.innerHeight - 20) {
      const cs = getComputedStyle(modal);
      modalTooTall = { h: Math.round(mr.height), vh: window.innerHeight, internalScroll: cs.overflowY === 'auto' || cs.overflowY === 'scroll' };
    }
  }
  return { overflowX, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: filtered.slice(0, 12), modalTooTall };
};

async function main() {
  const binDir = join(process.cwd(), 'node_modules/@sparticuz/chromium/bin');
  if (existsSync(join(binDir, 'al2023.tar.br'))) await inflate(join(binDir, 'al2023.tar.br'));
  const execPath = await chromium.executablePath();
  process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-gpu'],
    executablePath: execPath,
    headless: 'shell',
    env: process.env,
  });

  mkdirSync('.probe/shots', { recursive: true });
  const report = [];

  for (const p of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument((seed, payload) => {
        localStorage.clear();
        if (seed === 'demo' || seed === 'setup') {
          localStorage.setItem('monssif-money-os:local-demo', '1');
          if (seed === 'setup') payload = { ...payload, settings: { setupComplete: false, sampleDataLoaded: false } };
          localStorage.setItem('monssif-money-os:v1', JSON.stringify(payload));
        }
      }, p.seed, DEMO_SEED);
      try {
        await page.goto(BASE + p.path, { waitUntil: 'networkidle0', timeout: 20000 });
      } catch {
        // networkidle0 can time out on the unconfigured fake-supabase build; fall back.
      }
      await new Promise((r) => setTimeout(r, 350));
      const m = await page.evaluate(MEASURE);
      await page.screenshot({ path: `.probe/shots/${TAG}-${p.tag}-${width}.png` });
      report.push({ page: p.tag, width, path: p.path, ...m });
      await page.close();
    }
  }

  // ── Interaction checks: open modals/dialogs and measure them ─────────────
  const INTERACTIONS = [
    { tag: 'tx-modal', path: '/transactions', seed: 'demo', click: 'Add transaction' },
    { tag: 'goal-modal', path: '/goals', seed: 'demo', click: 'New goal' },
  ];
  for (const it of INTERACTIONS) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument((seed, payload) => {
        localStorage.clear();
        localStorage.setItem('monssif-money-os:local-demo', '1');
        localStorage.setItem('monssif-money-os:v1', JSON.stringify(payload));
      }, it.seed, DEMO_SEED);
      try {
        await page.goto(BASE + it.path, { waitUntil: 'networkidle0', timeout: 20000 });
      } catch {}
      await new Promise((r) => setTimeout(r, 350));
      const clicked = await page.evaluate((label) => {
        const btn = [...document.querySelectorAll('button, a')].find((b) => (b.textContent || '').includes(label));
        if (btn) { btn.click(); return true; }
        return false;
      }, it.click);
      await new Promise((r) => setTimeout(r, 450));
      const m = await page.evaluate(MEASURE);
      m.modalOpen = await page.evaluate(() => Boolean(document.querySelector('.modal')));
      await page.screenshot({ path: `.probe/shots/${TAG}-${it.tag}-${width}.png` });
      report.push({ page: it.tag, width, path: it.path, clicked, ...m });
      await page.close();
    }
  }

  await browser.close();
  writeFileSync(`.probe/report-${TAG}.json`, JSON.stringify(report, null, 2));
  const bad = report.filter((r) => r.overflowX || r.offenders.length > 0 || (r.modalTooTall && !r.modalTooTall.internalScroll));
  console.log(`\n=== ${TAG}: ${report.length} checks, ${bad.length} with overflow ===`);
  for (const b of bad) {
    console.log(`\n✗ ${b.page} @ ${b.width}px  scrollWidth=${b.scrollWidth} clientWidth=${b.clientWidth}`);
    for (const o of b.offenders) console.log(`   · <${o.tag} class="${o.cls}"> w=${o.w} [${o.left}..${o.right}] "${o.text}"`);
    if (b.modalTooTall) console.log(`   · modal too tall: ${JSON.stringify(b.modalTooTall)}`);
  }
  if (bad.length === 0) console.log('no horizontal overflow detected');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
