/** Phase 2: auth forms (configured build) at target mobile widths. */
import chromium from '@sparticuz/chromium';
import { inflate } from '@sparticuz/chromium';
import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:4180';
const WIDTHS = [320, 360, 375, 390, 430];
const PAGES = [
  { tag: 'login', path: '/auth/login' },
  { tag: 'register', path: '/auth/register' },
  { tag: 'forgot', path: '/auth/forgot-password' },
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
    if ((r.right > vw + 1 || r.left < -1) && !clippedByAncestor(el)) {
      offenders.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
      });
    }
  }
  return { overflowX, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: offenders.slice(0, 10) };
};

const binDir = join(process.cwd(), 'node_modules/@sparticuz/chromium/bin');
await inflate(join(binDir, 'al2023.tar.br')).catch(() => {});
const execPath = await chromium.executablePath();
process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox', '--disable-gpu'], executablePath: execPath, headless: 'shell', env: process.env });

mkdirSync('.probe/shots', { recursive: true });
const report = [];
for (const p of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    try {
      await page.goto(BASE + p.path, { waitUntil: 'networkidle0', timeout: 20000 });
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
    const m = await page.evaluate(MEASURE);
    await page.screenshot({ path: `.probe/shots/auth-${p.tag}-${width}.png` });
    report.push({ page: p.tag, width, ...m });
    await page.close();
  }
}
await browser.close();
writeFileSync('.probe/report-auth.json', JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.overflowX || r.offenders.length);
console.log(`=== auth: ${report.length} checks, ${bad.length} with overflow ===`);
for (const b of bad) {
  console.log(`✗ ${b.page} @ ${b.width}px scrollWidth=${b.scrollWidth}`);
  for (const o of b.offenders) console.log(`   · <${o.tag} class="${o.cls}"> [${o.left}..${o.right}] "${o.text}"`);
}
if (!bad.length) console.log('no horizontal overflow detected');
