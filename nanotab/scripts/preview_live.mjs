import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const DIST = path.resolve('dist');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-live-'));

function idFromBytes(buf) {
  const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
  return [...h].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}
const cands = [...new Set([idFromBytes(Buffer.from(DIST, 'utf8')), idFromBytes(Buffer.from(DIST, 'utf16le'))])];

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
    const r = await p.goto(`chrome-extension://${c}/newtab.html`, { timeout: 8000 });
    await p.waitForTimeout(800);
    const root = await p.locator('#root').innerHTML().catch(() => '');
    if (r && r.ok() && root.length > 0) {
      id = c;
      await p.close();
      break;
    }
  } catch (e) {
    console.log('候选失败', c, String(e.message).split('\n')[0]);
  }
  await p.close();
}
console.log('EXT_ID', id || '(未加载)');

const page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`chrome-extension://${id}/newtab.html`, { waitUntil: 'load' });
await page.waitForTimeout(1200);
console.log('READY: 腾龙起始页已在浏览器打开，可阅览和操作（点搜索框、开设置、点空白退出等）。关闭浏览器窗口即退出，30 分钟自动退出。');

ctx.on('close', () => process.exit(0));
setTimeout(() => process.exit(0), 30 * 60 * 1000);
await new Promise(() => {});
