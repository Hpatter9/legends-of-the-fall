// WAVE-RECAP-2 review: the spire and the Calamity in the built game. For each, a fresh saved run (`saves.ts`) is resumed; one fight is
// won (the short see-through card holds over the board and goes to the map by itself), the next is lost (the short last card, then the
// end summary with its per-hero detail). The Calamity's map recap is shown once with its real detail: the run's recap so far, under a
// labelled fixture map (no map is played through to its boss here).
// Usage: node tools/wave-recap/tower-shots.mjs [width]  (serves out/web on :8720; screenshots to docs/samples/wave-recap-2-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8720;
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/wave-recap/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/wr2-saves.mjs', logLevel: 'error' });
const S = await import('../../out/shots/wr2-saves.mjs');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg', css: 'text/css' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const only = process.argv[2];
const results = [];
const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'cleric'];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    const checks = [];
    results.push({ w, h, checks, errors });
    await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
    await page.evaluate((party) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    }, PARTY);
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
    await page.waitForTimeout(800);
    const shot = async (name, sel) => {
      await page.screenshot({ path: `docs/samples/wave-recap-2-${name}-${w}.png` });
      const lay = await page.evaluate((sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), pageOverflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth };
      }, sel);
      assert.ok(!lay.pageOverflow, `${name} overflows at ${w}`);
      checks.push({ name, ...lay });
    };
    const fightAndWin = async () => {
      await page.locator('#fight').waitFor({ state: 'visible', timeout: 30000 });
      await page.click('#fight'); await page.waitForTimeout(600);
      await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
      await page.waitForFunction(() => !document.getElementById('result').hidden && document.getElementById('result').classList.contains('passing'), null, { timeout: 60000 });
      await page.waitForTimeout(900);
    };
    const fightAndLose = async () => {
      await page.locator('#fight').waitFor({ state: 'visible', timeout: 30000 });
      await page.click('#fight'); await page.waitForTimeout(600);
      await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
      await page.locator('#next').waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(700);
    };
    const card = async () => page.evaluate(() => ({ banner: document.getElementById('banner').textContent, summary: document.getElementById('summary').textContent, notes: [...document.querySelectorAll('#waveNotes .wn')].map((e) => e.textContent), passing: document.getElementById('result').classList.contains('passing'), tableHidden: document.getElementById('fightStats').hidden && document.getElementById('xp').hidden }));
    const detail = async () => page.evaluate(() => ({ strip: [...document.querySelectorAll('#towerMap .rcWave')].map((e) => e.textContent), heroes: document.querySelectorAll('#towerMap .rcHero').length, mvp: document.querySelector('#towerMap .rcHero.mvp b')?.textContent ?? null, xp: document.querySelectorAll('#towerMap .rcXpRow').length, heads: [...document.querySelectorAll('#towerMap .rcDetail > h3')].map((e) => e.textContent) }));
    const scrollTo = async (cardSel) => { await page.evaluate((s) => { const c = document.querySelector(s); const d = c.querySelector('.rcDetail'); if (d) d.scrollIntoView({ block: 'start' }); }, cardSel); await page.waitForTimeout(300); };

    // ---- the spire: floor 1 won (the card holds, then the map), floor 2 lost (the last card, the summary)
    await page.evaluate((json) => { const g = window.__game; const r = JSON.parse(json); g.home.go(() => g.resumeSlot(r)); }, JSON.stringify(S.spire(21, PARTY)));
    await page.locator('#towerMap').waitFor({ state: 'visible', timeout: 30000 });
    const climb = async () => {
      await page.evaluate(() => { const g = window.__game; const t = g.run.tower; const n = t.map.find((x) => x.row === t.row && x.kind === 'fight') ?? t.map.find((x) => x.row === t.row); g.towerView.goTo(n.id); });
    };
    await climb();
    await fightAndWin();
    await shot('spire-card', '#result');
    checks.push({ name: 'spire-card', ...(await card()) });
    const t0 = Date.now();
    await page.locator('#towerMap').waitFor({ state: 'visible', timeout: 30000 });
    checks.push({ name: 'spire-card-went-to-map-by-itself', ms: Date.now() - t0, resultHidden: await page.evaluate(() => document.getElementById('result').hidden) });
    await page.waitForTimeout(800);
    await climb();
    await fightAndLose();
    await shot('spire-last-card', '#result');
    checks.push({ name: 'spire-last-card', ...(await card()), next: await page.textContent('#next') });
    await page.click('#next');
    await page.locator('#towerMap .rtCard.summary').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);
    await shot('spire-summary', '#towerMap');
    await scrollTo('#towerMap .rtCard.summary');
    await shot('spire-summary-detail', '#towerMap');
    checks.push({ name: 'spire-summary-detail', ...(await detail()) });
    await page.locator('#towerMap .rtCard.summary > .primary').click();
    await page.waitForFunction(() => document.getElementById('towerMap').hidden);

    // ---- the Calamity: a spot's fight won (the card, then the map), the map recap with its detail, a fight lost, the summary
    await page.evaluate((json) => { const g = window.__game; const r = JSON.parse(json); g.home.go(() => g.resumeSlot(r)); }, JSON.stringify(S.calamity(31)));
    await page.locator('#towerMap').waitFor({ state: 'visible', timeout: 30000 });
    const goSpot = async () => {
      await page.waitForTimeout(1500);
      await page.evaluate(() => document.querySelector('.cmSpot.open .cmHit').click());
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('.rtGo').click());
    };
    await goSpot();
    await fightAndWin();
    await shot('cal-card', '#result');
    checks.push({ name: 'cal-card', ...(await card()) });
    const t1 = Date.now();
    await page.locator('#towerMap').waitFor({ state: 'visible', timeout: 30000 });
    checks.push({ name: 'cal-card-went-to-map-by-itself', ms: Date.now() - t1, resultHidden: await page.evaluate(() => document.getElementById('result').hidden) });
    // (the map recap: a labelled fixture map, its detail the run's real recap so far)
    await page.evaluate(() => {
      const g = window.__game;
      g.run.tower.mapDone = { map: 1, spots: 6, total: 9, fights: 4, elites: 1, gold: 210, relics: [], gear: ['Rare steel armour'], heroes: [], events: ['A shrine in the ruins'], detail: g.run.recap };
      g.towerView.close(); g.towerView.open(g.run);
    });
    await page.locator('#towerMap .rtCard.ccCard').waitFor({ state: 'visible' });
    await page.waitForTimeout(600);
    await shot('cal-map-recap-fixture', '#towerMap');
    await scrollTo('#towerMap .rtCard.ccCard');
    await shot('cal-map-recap-detail-fixture', '#towerMap');
    checks.push({ name: 'cal-map-recap-detail', ...(await detail()) });
    await page.locator('#towerMap .rtCard.ccCard > .primary').click();
    await goSpot();
    await fightAndLose();
    await shot('cal-last-card', '#result');
    checks.push({ name: 'cal-last-card', ...(await card()), next: await page.textContent('#next') });
    await page.click('#next');
    await page.locator('#towerMap .rtCard.summary').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);
    await shot('cal-summary', '#towerMap');
    await scrollTo('#towerMap .rtCard.summary');
    await shot('cal-summary-detail', '#towerMap');
    checks.push({ name: 'cal-summary-detail', ...(await detail()) });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(`docs/samples/wave-recap-2-checks${only ? '-' + only : ''}.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
