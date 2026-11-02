/**
 * 用 Playwright 自带 Chromium 以「加载已解压扩展」方式跑 dist：
 * 扩展 ID 由目录路径确定性计算，直接访问 popup.html / newtab.html 抓报错。
 */
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const DIST = path.resolve('dist');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-ext-'));
const errors = [];

function idFromBytes(buf) {
  const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
  return [...h].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}
const cands = [...new Set([idFromBytes(Buffer.from(DIST, 'utf8')), idFromBytes(Buffer.from(DIST, 'utf16le'))])];
console.log('候选扩展 ID:', cands.join(', '));

const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    '--enable-unsafe-extension-debugging',
    '--disable-features=DisableLoadExtensionCommandLineSwitch',
    '--no-first-run',
    '--no-default-browser-check',
  ],
});
await new Promise((r) => setTimeout(r, 3000));

let id = null;
for (const c of cands) {
  const p = await ctx.newPage();
  try {
    const r = await p.goto(`chrome-extension://${c}/popup.html`, { timeout: 8000 });
    await p.waitForTimeout(600);
    const root = await p.locator('#root').innerHTML().catch(() => '');
    console.log(`候选 ${c}: status=${r?.status()} rootLen=${root.length}`);
    if (r && r.ok() && root.length > 0) {
      id = c;
      await p.close();
      break;
    }
  } catch (e) {
    console.log(`候选 ${c}: 无法打开 → ${String(e.message).split('\n')[0]}`);
  }
  await p.close();
}

console.log('\n最终 EXT_ID:', id || '(扩展未被加载)');

if (id) {
  for (const [name, file] of [
    ['POPUP', 'popup.html'],
    ['NEWTAB', 'newtab.html'],
  ]) {
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (!u.startsWith('data:')) errors.push(`${name} requestfailed: ${u} (${r.failure()?.errorText})`);
    });
    await page.setViewportSize({ width: file === 'popup.html' ? 350 : 1280, height: file === 'popup.html' ? 420 : 800 });
    const resp = await page.goto(`chrome-extension://${id}/${file}`, { waitUntil: 'load' }).catch((e) => e);
    await page.waitForTimeout(1600);
    const title = await page.title().catch(() => '');
    const root = await page.locator('#root').innerHTML().catch(() => '');
    console.log(`\n[${name}] status=${resp?.status?.() ?? 'n/a'} title=${title} rootLen=${root.length}`);
    console.log(`[${name}] 片段: ${root.replace(/\s+/g, ' ').slice(0, 160)}`);
    fs.mkdirSync('scripts/out', { recursive: true });
    await page.screenshot({ path: `scripts/out/${name}.png`, fullPage: true }).catch(() => {});
    await page.close();
  }
}

console.log('\n=== 错误汇总 ===');
console.log(errors.length ? errors.join('\n') : '无 console / pageerror / requestfailed');

await ctx.close();
try {
  fs.rmSync(userDataDir, { recursive: true, force: true });
} catch {}
