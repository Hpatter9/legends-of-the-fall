// TRAIT-PERKS review: the built game at the three phone sizes. The deploy screen's trait row (each chip its count, its three pips and the
// perk awake), a trait's card with its whole ladder (a tap on the Undead chip), and the fight with the Undead's three skeletons risen.
// Usage: node tools/trait-perks/shots.mjs [width]  (serves out/web on :8698; screenshots to docs/samples/trait-perks-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8698;
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
mkdirSync('docs/samples', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const only = process.argv[2];
const PARTY = ['shambler', 'mummy', 'reaper', 'dreadPirate', 'knight'];
const report = [];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`, { timeout: 240000 });
    await page.evaluate((party) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, library: 0, stable: 0 }, armies: {}, xp: {}, daily: {}, stats: {} }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    }, PARTY);
    await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    const shot = async (name) => {
      await page.screenshot({ path: `docs/samples/trait-perks-${name}-${w}x${h}.png` });
      const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth);
      assert.ok(!over, `${name} overflows at ${w}`);
    };
    await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('orcs', 0)); });
    await page.locator('#ptGo').waitFor({ state: 'visible' });
    await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate((party) => {
      const g = window.__game;
      g.run.gold = 500; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
      g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.run.event = undefined; g.newBattle(); g.refresh();
      document.getElementById('events')?.setAttribute('hidden', '');
      g.autoArrange(true);
    }, PARTY);
    await page.waitForTimeout(900);
    const chips = await page.evaluate(() => [...document.querySelectorAll('#traits .trait')].map((e) => e.textContent));
    await shot('deploy');
    await page.locator('#traits .trait', { hasText: 'Undead' }).first().click();
    await page.locator('#traitCard').waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    const card = await page.evaluate(() => ({ tiers: [...document.querySelectorAll('#traitCard .tpTier')].map((e) => ({ on: e.classList.contains('tpOn'), text: e.querySelector('b')?.textContent })), fits: (() => { const r = document.querySelector('#traitCard .om').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })() }));
    await shot('card');
    await page.locator('#traitCard .omBack').click();
    await page.waitForTimeout(300);
    await page.click('#fight');
    await page.waitForTimeout(400);
    // (the foes held still a moment, so the picture shows the skeletons risen before the lines meet)
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.busyUntil = g.b.t + 4000; });
    await page.waitForTimeout(2600);
    const bones = await page.evaluate(() => window.__game.b.units.filter((u) => u.alive && u.pk?.raised === 'grave').map((u) => u.def));
    await shot('skeletons');
    report.push({ w, h, chips, card, bones, errors });
    assert.equal(bones.length, 3, `three skeletons at ${w}`);
    assert.ok(card.fits, `the card fits at ${w}`);
    assert.equal(card.tiers.filter((t) => t.on).length, 3, `the Undead's three tiers lit at ${w}`);
    assert.equal(errors.length, 0, errors.join('; '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  console.log(JSON.stringify(report, null, 1));
}
