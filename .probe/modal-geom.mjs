import chromium from '@sparticuz/chromium';
import { inflate } from '@sparticuz/chromium';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const binDir = join(process.cwd(), 'node_modules/@sparticuz/chromium/bin');
await inflate(join(binDir, 'al2023.tar.br')).catch(() => {});
const execPath = await chromium.executablePath();
process.env.LD_LIBRARY_PATH = ['/tmp/al2023/lib', process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const browser = await puppeteer.launch({ args: [...chromium.args, '--no-sandbox', '--disable-gpu'], executablePath: execPath, headless: 'shell', env: process.env });
const page = await browser.newPage();
await page.setViewport({ width: 320, height: 800 });
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem('monssif-money-os:local-demo', '1');
  localStorage.setItem('monssif-money-os:v1', JSON.stringify({ version: 1,
    account: { id: 'a', name: 'Main', currency: 'MAD', openingBalance: 300, openingBalanceSetAt: '2026-07-01T10:00:00.000Z', createdAt: '2026-07-01T10:00:00.000Z' },
    transactions: [], goals: [], settings: { setupComplete: true, sampleDataLoaded: false } }));
});
await page.goto('http://127.0.0.1:4180/transactions', { waitUntil: 'networkidle0' }).catch(() => {});
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add transaction'))?.click());
await new Promise((r) => setTimeout(r, 500));
const g = await page.evaluate(() => {
  const m = document.querySelector('.modal');
  const o = document.querySelector('.modal-overlay');
  const mr = m.getBoundingClientRect();
  const or_ = o.getBoundingClientRect();
  const cs = getComputedStyle(m);
  return {
    modal: { top: Math.round(mr.top), bottom: Math.round(mr.bottom), h: Math.round(mr.height), w: Math.round(mr.width) },
    overlay: { top: Math.round(or_.top), h: Math.round(or_.height), scrollH: o.scrollHeight, clientH: o.clientHeight },
    modalScroll: { scrollH: m.scrollHeight, clientH: m.clientHeight, overflowY: cs.overflowY, maxH: cs.maxHeight, margin: cs.margin },
    vh: window.innerHeight,
  };
});
console.log(JSON.stringify(g, null, 1));
await browser.close();
