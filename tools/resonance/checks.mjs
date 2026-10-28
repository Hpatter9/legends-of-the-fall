// Actual game checks of the two remade heroes at the three supported phone sizes.
// GAME_URL=http://127.0.0.1:8000 node tools/resonance/checks.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const out = 'docs/samples/resonance';
mkdirSync(out, { recursive: true });
const layout = require('../../src/art/units/sheets.json');
const assetChecks = [];
for (const id of ['hero_soldier', 'hero_samurai_archer']) {
  const l = layout[id];
  const { data, info } = await sharp(`src/art/units/${id}.png`).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, l.w * l.perRow);
  assert.equal(info.height, l.h * l.rows.length);
  for (let i = 3; i < data.length; i += 4) assert.ok(data[i] === 0 || data[i] === 255, `${id}: hard alpha`);
  for (let row = 0; row < l.rows.length; row++) for (let col = 0; col < l.counts[l.rows[row]]; col++) {
    let n = 0;
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const alpha = data[(((row + Math.floor(col / l.perRow)) * l.h + y) * info.width + (col % l.perRow) * l.w + x) * 4 + 3];
      if (!alpha) continue;
      n++;
      assert.ok(x > 0 && x < l.w - 1 && y > 0, `${id} ${l.rows[row]} ${col}: frame edge`);
    }
    assert.ok(n > 300, `${id} ${l.rows[row]} ${col}: visible`);
  }
  assetChecks.push({ id, frames: Object.values(l.counts).reduce((a, b) => a + b, 0), alpha: 'hard', geometry: 'fits' });
}
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = process.env.GAME_URL ? null : createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  try {
    const path = `out/web${pathname === '/' ? '/index.html' : pathname}`;
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end(); }
});
if (server) await new Promise(resolve => server.listen(8000, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
      localStorage.setItem('lotf-tips-off', '1');
    });
    await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/?seed=7`, { timeout: 120000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.evaluate(() => {
      const g = window.__game;
      document.getElementById('tipSkip')?.click();
      g.meta.unlocked = [...new Set([...g.meta.unlocked, 'knight', 'archer', 'wizard', 'samurai', 'cleric'])];
      g.meta.party = ['knight', 'archer', 'wizard', 'samurai', 'cleric'];
      g.home.open(); g.home.show('heroes');
    });
    await page.screenshot({ path: `${out}/roster-${width}.png` });
    for (const id of ['knight', 'archer']) {
      await page.evaluate(id => window.__game.home.openSheet(id), id);
      await page.waitForTimeout(600);
      assert.equal(await page.locator('.heroDetail').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
      const canvas = page.locator('.heroDetail canvas').first();
      assert.ok(await canvas.count(), `${id}: portrait canvas`);
      await page.screenshot({ path: `${out}/${id}-${width}.png` });
      await page.locator('.heroBack').click();
    }
    await page.evaluate(() => {
      const g = window.__game;
      localStorage.setItem('legends.meta', JSON.stringify(g.meta));
    });
    await page.reload();
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.evaluate(() => {
      document.getElementById('tipSkip')?.click();
      const g = window.__game;
      g.run.stage = 1; g.newBattle(); g.endIntro?.(); g.run.gold = 999;
    });
    for (let i = 0; i < 5; i++) await page.locator('#summon').click();
    await page.locator('#auto').click();
    await page.waitForTimeout(700);
    const deployed = await page.evaluate(() => window.__game.b.units.filter(u => u.side === 'hero' && u.alive).map(u => u.def));
    assert.ok(deployed.includes('knight') && deployed.includes('archer'), `Both heroes deployed: ${deployed}`);
    await page.screenshot({ path: `${out}/deploy-${width}.png` });
    await page.locator('#fight').click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/fight-${width}.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(300);
    assert.deepEqual(errors, []);
    results.push({ width, height, deployed, errors, reducedMotion: true });
    await context.close();
  }
} finally {
  await browser.close();
  server?.close();
  writeFileSync(`${out}/checks.json`, JSON.stringify({ assetChecks, results }, null, 2) + '\n');
}
console.log(JSON.stringify({ assetChecks, results }, null, 2));
