// WAVE-RECAP review: a real army run in the built game. Wave 1 won with a hero down (the short card over the march, no tap),
// wave 2 won after a heart burns, wave 3 lost with no hearts left (the short defeat card), then the full end recap.
// Usage: node tools/wave-recap/shots.mjs [width]  (serves out/web on :8690; screenshots to docs/samples/wave-recap-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8690;
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
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    const shot = async (name, sel) => {
      await page.screenshot({ path: `docs/samples/wave-recap-${name}-${w}.png` });
      const lay = await page.evaluate((sel) => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), pageOverflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth };
      }, sel);
      assert.ok(!lay.pageOverflow, `${name} overflows at ${w}`);
      checks.push({ name, ...lay });
      return lay;
    };
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
      // (an event between waves keeps its own card: chosen here by its last option, so the run goes on)
      if (await page.locator('#events').isVisible()) {
        await page.evaluate(() => { const b = [...document.querySelectorAll('#events button')]; b.at(-1)?.click(); });
        await page.waitForTimeout(400);
        await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
      }
    };
    // ---- wave 1: won, the archer down: the short card rides over the march and goes by itself
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) { if (u.side === 'foe') u.hp = 0; if (u.side === 'hero' && u.def === 'archer') { u.hp = 0; u.alive = false; } } });
    await page.waitForFunction(() => !document.getElementById('result').hidden && document.getElementById('result').classList.contains('passing'), null, { timeout: 60000 }).catch(async (e) => {
      console.log('STATE', JSON.stringify(await page.evaluate(() => { const g = window.__game; return { phase: g.b.phase, t: g.b.t, settled: g.settled, endWait: g.endWait, passing: g.passing, hidden: document.getElementById('result').hidden, cls: document.getElementById('result').className, foes: g.b.units.filter((u) => u.side === 'foe').map((u) => [u.hp, u.alive]) }; })));
      throw e;
    });
    const moving = await page.evaluate(() => document.body.hasAttribute('data-move'));
    await page.waitForTimeout(1400);
    const midMarch = await page.evaluate(() => document.body.hasAttribute('data-move'));
    const card = await shot('march', '#result');
    checks.push({ name: 'march-under-card', marchingWhenCardShowed: moving, stillMarchingAtShot: midMarch, nextButtonHidden: !(await page.locator('#next').isVisible()) });
    assert.ok(card.bottom < h * 0.5, `the card keeps to the upper half at ${w}: ${card.bottom}`);
    const notes1 = await page.evaluate(() => [...document.querySelectorAll('#waveNotes .wn')].map((e) => e.textContent));
    checks.push({ name: 'wave1-notes', notes: notes1, banner: await page.textContent('#banner'), summary: await page.textContent('#summary') });
    const t0 = Date.now();
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 30000 });
    checks.push({ name: 'card-left-by-itself', msAfterShot: Date.now() - t0 });
    await clearEvent();
    // (wave 2's card is seen with reduced motion: no fades, the lines there at once)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // ---- wave 2: the party falls with hearts left (a heart burns, the fight resumes), then it wins
    await page.locator('#fight').waitFor({ state: 'visible' });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.waitForFunction(() => window.__game.run.retries === 1 && window.__game.b.phase === 'fight', null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(1600);
    await shot('heart', '#result');
    checks.push({ name: 'wave2-notes', notes: await page.evaluate(() => [...document.querySelectorAll('#waveNotes .wn')].map((e) => e.textContent)), banner: await page.textContent('#banner') });
    // (a tap on the card goes on at once)
    await page.click('#banner');
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 10000 });
    checks.push({ name: 'tap-goes-on', passed: true });
    await clearEvent();
    // ---- wave 3: lost with no hearts left: the short defeat card, then the full recap
    await page.locator('#fight').waitFor({ state: 'visible' });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; g.run.retries = 2; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.locator('#next').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(800);
    await shot('defeat', '#result');
    checks.push({ name: 'defeat-card', banner: await page.textContent('#banner'), next: await page.textContent('#next'), passing: await page.evaluate(() => document.getElementById('result').classList.contains('passing')), statsHidden: await page.evaluate(() => document.getElementById('fightStats').hidden && document.getElementById('xp').hidden) });
    await page.click('#next');
    await page.locator('.rcSheet').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
    await shot('recap', '#recap');
    await page.locator('.rcWaves').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    await shot('recap-waves', '#recap');
    await page.evaluate(() => { document.querySelector('.rcSheet').scrollTop = 99999; }); await page.waitForTimeout(300);
    await shot('recap-end', '#recap');
    checks.push({ name: 'recap-strip', waves: await page.evaluate(() => [...document.querySelectorAll('.rcWave')].map((e) => e.textContent)), heroes: await page.locator('.rcHero').count(), xpRows: await page.locator('.rcXpRow').count() });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(`docs/samples/wave-recap-checks${only ? '-' + only : ''}.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
