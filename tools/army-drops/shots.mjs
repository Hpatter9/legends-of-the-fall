// ARMY-DROPS review: a real army run in the built game with the rare drop forced (`window.__forceDrop`): wave 1 drops shards (the
// short card over the march), wave 2 a tome, wave 3 is lost, then the end recap's spoils.
// Usage: node tools/army-drops/shots.mjs [width]  (serves out/web on :8781; screenshots to docs/samples/army-drops-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8781;
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg', css: 'text/css' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const only = process.argv[2];
const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'cleric'];
const report = [];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`, { timeout: 180000 });
    await page.evaluate((party) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    }, PARTY);
    await page.goto(`http://localhost:${PORT}/`, { timeout: 180000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    const notes = () => page.evaluate(() => [...document.querySelectorAll('#waveNotes .wn')].map((e) => `${e.className}: ${e.textContent}`));
    await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('undead', 0)); });
    await page.locator('#ptGo').waitFor({ state: 'visible' });
    await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate((party) => {
      const g = window.__game;
      g.run.gold = 500; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
      g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.newBattle(); g.refresh();
    }, PARTY);
    const clearEvent = async () => {
      if (await page.locator('#events').isVisible()) {
        await page.evaluate(() => { const b = [...document.querySelectorAll('#events button')]; b.at(-1)?.click(); });
        await page.waitForTimeout(400);
        await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
      }
    };
    const winWave = async (force) => {
      await page.locator('#fight').waitFor({ state: 'visible' });
      await page.evaluate((f) => { window.__forceDrop = f; }, force);
      await page.click('#fight'); await page.waitForTimeout(600);
      await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') u.hp = 0; });
      await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 240000 });
      await page.waitForTimeout(1900);
    };
    // ---- wave 1: shards drop
    const tomesBefore = await page.evaluate(() => JSON.stringify(window.__game.meta.tomes ?? {}));
    await winWave('shards');
    await page.screenshot({ path: `docs/samples/army-drops-shards-${w}.png` });
    const n1 = await notes();
    assert.ok(n1.some((t) => /^wn drop: .Found: \d shards of /.test(t)), JSON.stringify(n1));
    const banked = await page.evaluate(() => { const m = window.__game.meta; const saved = JSON.parse(localStorage.getItem('legends.meta')); return { unlock: m.unlock, saved: saved.unlock, unlocked: m.unlocked.length }; });
    await page.click('#banner').catch(() => {});
    await page.waitForFunction(() => document.getElementById('result').hidden, null, { timeout: 120000 });
    await clearEvent();
    // ---- wave 2: a tome
    await winWave('tome');
    await page.screenshot({ path: `docs/samples/army-drops-tome-${w}.png` });
    const n2 = await notes();
    assert.ok(n2.some((t) => /XP tome/.test(t)), JSON.stringify(n2));
    const tomesAfter = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('legends.meta')).tomes ?? {}));
    await page.click('#banner').catch(() => {});
    await page.waitForFunction(() => document.getElementById('result').hidden, null, { timeout: 120000 });
    await clearEvent();
    // ---- wave 3: lost (no drop), then the recap's spoils
    await page.locator('#fight').waitFor({ state: 'visible' });
    await page.evaluate(() => { window.__forceDrop = undefined; });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; g.run.retries = 9; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.locator('#next').waitFor({ state: 'visible', timeout: 120000 });
    await page.waitForTimeout(800);
    await page.click('#next');
    await page.locator('.rcSheet').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
    await page.evaluate(() => { document.querySelector('.rcSheet').scrollTop = 99999; }); await page.waitForTimeout(400);
    await page.screenshot({ path: `docs/samples/army-drops-recap-${w}.png` });
    const spoils = await page.evaluate(() => [...document.querySelectorAll('#recap h3')].find((e) => e.textContent === 'Spoils found')?.nextElementSibling?.textContent ?? null);
    assert.ok(spoils && /shards of/.test(spoils) && /XP tome/.test(spoils), String(spoils));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    report.push({ w, h, n1, n2, banked, tomesBefore, tomesAfter, spoils, overflow, errors });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify(report, null, 1));
