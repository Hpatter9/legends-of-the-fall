// RECAP-REVEAL review in the built game: a wave card listing several items gained, the end recap without the spoils list, and an
// earned hero's arrival (no summoner) through the reveal queue, at the three upright sizes.
// Usage: node tools/recap-reveal/shots.mjs [width] [port]  (serves out/web; screenshots to docs/samples/recap-reveal-*.png)
// The wave's drops beyond its own gear (a hero joining, a chest, shards, tomes, a stone) are added to the save as the wave settles,
// standing in for the systems that pay them, so one card shows them all.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : '';
const PORT = Number(process.argv[3] ?? 8801);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg', css: 'text/css' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'cleric'];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    const checks = [];
    results.push({ w, h, checks, errors });
    await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
    await page.evaluate((party) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, heroesSeen: party, pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    }, PARTY);
    await page.goto(`http://localhost:${PORT}/`);
    await page.waitForFunction(() => window.__game && window.__earned && window.__tarot, null, { timeout: 400000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    // (any hero the save is given on load has its reveal due: seen here, and a reveal already up is closed)
    await page.evaluate(() => { const m = window.__game.meta; m.heroesSeen = [...m.unlocked]; });
    for (let i = 0; i < 8 && await page.locator('.tarotReveal, .earnedArrival').count(); i++) { await page.waitForTimeout(800); await page.locator('.tarotReveal, .earnedArrival').first().dispatchEvent('pointerdown'); }
    const shot = async (name, sel) => {
      await page.screenshot({ path: `docs/samples/recap-reveal-${name}-${w}.png` });
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
    // ---- wave 1 won: a cursed path's gear prize (two pieces), and the save's drops added as the wave settles
    await page.evaluate(() => {
      const g = window.__game;
      g.run.buff = { gear: { id: 900, slot: 'weapon', tier: 2, name: 'Steel Blade', hp: 0, atk: 0.16 }, gold: 12 };
      g.run.items = [];
      const orig = g.noteRecap;
      g.noteRecap = function (...a) {
        const m = this.meta;
        (m.unlocked.includes('reaper') ? null : m.unlocked.push('reaper'));
        m.stash.push({ army: 'undead', at: 5, tier: 0, seed: 11 }, { army: 'undead', at: 3, tier: 0, seed: 12 });
        m.unlock = { ...(m.unlock ?? {}), ranger: (m.unlock?.ranger ?? 0) + 3 };
        m.shards.knight = (m.shards.knight ?? 0) + 5;
        m.tomes = { small: 2, medium: 1 };
        m.stones = (m.stones ?? 0) + 1;
        this.run.items.push({ id: 901, slot: 'charm', tier: 1, name: 'Jade Charm', hp: 0.03, atk: 0.03 }, { id: 902, slot: 'charm', tier: 1, name: 'Jade Charm', hp: 0.03, atk: 0.03 });
        this.noteRecap = orig;
        return orig.apply(this, a);
      };
    });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden && document.getElementById('result').classList.contains('passing'), null, { timeout: 120000 }).catch(async (e) => {
      console.log('STATE', JSON.stringify(await page.evaluate(() => { const g = window.__game; return { phase: g.b.phase, t: g.b.t, settled: g.settled, passing: g.passing, hidden: document.getElementById('result').hidden, cls: document.getElementById('result').className, overlays: [...document.querySelectorAll('.tarotReveal, .earnedArrival, #events:not([hidden])')].map((e) => e.className || e.id), foes: g.b.units.filter((u) => u.side === 'foe').map((u) => [u.hp, u.alive]) }; })));
      await page.screenshot({ path: 'docs/samples/recap-reveal-debug.png' });
      throw e;
    });
    await page.waitForTimeout(1500);
    const card = await shot('wave-card', '#result');
    const chips = await page.evaluate(() => [...document.querySelectorAll('#waveNotes .wgChip')].map((e) => ({ text: e.textContent, icon: !!e.querySelector('.wgIco') })));
    const notes = await page.evaluate(() => [...document.querySelectorAll('#waveNotes .wn')].map((e) => e.textContent));
    checks.push({ name: 'wave-card-items', chips, notes, summary: await page.textContent('#summary') });
    assert.ok(chips.length >= 8, `several chips at ${w}: ${chips.length}`);
    assert.ok(chips.every((c) => c.icon), 'every chip has its icon');
    assert.ok(chips.some((c) => c.text === 'Jade Charm (Common) ×2'), 'duplicates are grouped');
    assert.ok(!notes.some((n) => n.includes('Steel Blade')), 'the gear is a chip, not a found line too');
    assert.ok(card.bottom < h * 0.62, `the card keeps clear of most of the board at ${w}: ${card.bottom}`);
    // (the reaper joined in the settlement: its reveal waits in the queue; it is checked below, so mark it seen for now)
    await page.evaluate(() => { window.__game.earned = []; });
    await page.click('#banner');
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 15000 });
    // close any reveal the queue started (the reaper), after its guard
    for (let i = 0; i < 6 && await page.locator('.earnedArrival').count(); i++) { await page.waitForTimeout(700); await page.locator('.earnedArrival').dispatchEvent('pointerdown'); }
    if (await page.locator('#events').isVisible()) {
      await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
    }
    // ---- wave 2 lost with no hearts left: the defeat card, then the end recap with no spoils list
    await page.locator('#fight').waitFor({ state: 'visible' });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; g.run.retries = 2; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.locator('#next').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(800);
    await page.click('#next');
    await page.locator('.rcSheet').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);
    await shot('recap', '#recap');
    await page.evaluate(() => { document.querySelector('#recap').scrollTop = 99999; document.querySelector('.rcSheet').scrollTop = 99999; }); await page.waitForTimeout(300);
    await shot('recap-end', '#recap');
    const heads = await page.evaluate(() => [...document.querySelectorAll('#recap h3')].map((e) => e.textContent));
    const figs = await page.evaluate(() => [...document.querySelectorAll('#recap .rcFig span')].map((e) => e.textContent));
    checks.push({ name: 'recap-sections', heads, figs, foundKept: await page.evaluate(() => window.__game.run.recap?.found?.length ?? 0) });
    assert.ok(!heads.includes('Spoils found') && !(await page.locator('.rcFound').count()), 'no spoils list in the end recap');
    await page.evaluate(() => document.querySelector('#recap .rcFoot button')?.click());
    await page.waitForTimeout(600);
    // ---- an earned hero's arrival, through the reveal queue (as a milestone's join plays it): no summoner, no chamber
    await page.evaluate(() => { const m = window.__game.meta; m.unlocked = m.unlocked.filter((k) => k !== 'reaper'); m.unlocked.push('reaper'); m.heroesSeen = (m.heroesSeen ?? []).filter((k) => k !== 'reaper'); void window.__tarot.queueReveal(m, 'reaper'); });
    await page.locator('.earnedArrival').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.earnedArrival')?.dataset.stage === '2');
    await page.waitForTimeout(500);
    const walk = await page.evaluate(() => ({ stage: document.querySelector('.earnedArrival').dataset.stage, anim: document.querySelector('.earnedArrival .trFigure')?.dataset.anim, summoner: !!document.querySelector('.tarotReveal, .earnedArrival .summonerActor'), chamber: document.querySelector('.earnedArrival').style.backgroundImage.includes('sanctum'), deed: document.querySelector('.eaDeed b')?.textContent }));
    await shot('arrival-walk', '.earnedArrival');
    checks.push({ name: 'arrival-walking', ...walk });
    assert.equal(walk.summoner, false, 'no summoner or chamber');
    assert.equal(walk.deed, 'Earned: clear the Undead Legion on Hard');
    await page.waitForTimeout(2600);
    await shot('arrival', '.earnedArrival');
    const end = await page.evaluate(() => ({ stage: document.querySelector('.earnedArrival').dataset.stage, plate: document.querySelector('.eaPlate')?.innerText, anim: document.querySelector('.earnedArrival .trFigure')?.dataset.anim }));
    checks.push({ name: 'arrival-end', ...end });
    assert.equal(end.stage, '4');
    // (a tap closes the arrival once past the guard, and marks the hero seen and saved; the guard itself is the summoning's, SKIP_GUARD_MS)
    await page.locator('.earnedArrival').dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    if (await page.locator('.earnedArrival').count()) { await page.waitForTimeout(600); await page.locator('.earnedArrival').dispatchEvent('pointerdown'); await page.waitForTimeout(300); }
    const seen = await page.evaluate(() => ({ open: !!document.querySelector('.earnedArrival'), seen: window.__game.meta.heroesSeen.includes('reaper'), saved: JSON.parse(localStorage.getItem('legends.meta')).heroesSeen.includes('reaper') }));
    checks.push({ name: 'arrival-ack', ...seen });
    assert.ok(!seen.open && seen.seen && seen.saved);
    // (reduced motion: the calm fade, no walk)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { const m = window.__game.meta; m.heroesSeen = m.heroesSeen.filter((k) => k !== 'reaper'); void window.__tarot.queueReveal(m, 'reaper'); });
    await page.locator('.earnedArrival.calm').waitFor({ state: 'visible' });
    await page.waitForTimeout(1200);
    await shot('arrival-calm', '.earnedArrival');
    checks.push({ name: 'arrival-calm', stage: await page.evaluate(() => document.querySelector('.earnedArrival').dataset.stage) });
    await page.waitForTimeout(700);
    for (let i = 0; i < 3 && await page.locator('.earnedArrival').count(); i++) { await page.locator('.earnedArrival').dispatchEvent('pointerdown'); await page.waitForTimeout(600); }
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(`docs/samples/recap-reveal-checks${only ? '-' + only : ''}.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
