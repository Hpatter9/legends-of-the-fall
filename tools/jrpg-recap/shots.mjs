// JRPG-RECAP review in the built game, at the three upright sizes: a won wave with level-ups (mid-count and finished), a won wave
// with a big haul, a lost wave and the run's end recap, the Last Stand's end card with its eight, and the reduced-motion end state.
// Usage: node tools/jrpg-recap/shots.mjs [width|all] [port]  (serves out/web; screenshots to docs/samples/jrpg-recap-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : '';
const PORT = Number(process.argv[3] ?? 8890);
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
const EIGHT = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
// (the lasting XP totals of levels.ts, for a save whose heroes sit just under a level)
const plain = (n) => 30 * (n - 1) * n;
const xpFor = (n) => (n <= 20 ? plain(n) : plain(20) + 4 * (plain(n) - plain(20)));
const hideQuips = '#quip, .quip, .duoToast, .toast, #toasts { display: none !important; }';

async function newPage(w, h, meta) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(300000);
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
  await page.evaluate((meta) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(meta));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, meta);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.__game && window.__game.home, null, { timeout: 400000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => { const m = window.__game.meta; m.heroesSeen = [...m.unlocked]; });
  for (let i = 0; i < 8 && await page.locator('.tarotReveal, .earnedArrival').count(); i++) { await page.waitForTimeout(800); await page.locator('.tarotReveal, .earnedArrival').first().dispatchEvent('pointerdown'); }
  await page.addStyleTag({ content: hideQuips });
  return { ctx, page, errors };
}
const baseMeta = (party, xp) => ({ seed: 7, crowns: 1200, unlocked: party, party: party.slice(0, 5), heroesSeen: party, pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle'] });

async function shot(page, w, checks, name, sel) {
  await page.screenshot({ path: `docs/samples/jrpg-recap-${name}-${w}.png` });
  const lay = await page.evaluate((sel) => {
    const e = document.querySelector(sel);
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), pageOverflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, sideScroll: e.scrollWidth > e.clientWidth + 1 };
  }, sel);
  assert.ok(!lay.pageOverflow && !lay.sideScroll, `${name} overflows sideways at ${w}`);
  checks.push({ name, ...lay });
}

const rowsOf = (page) => page.evaluate(() => [...document.querySelectorAll('#jrBody .jrRow, .rcSheet .jrRow, .stEnd .jrRow')].map((r) => ({
  name: r.querySelector('.jrName b')?.textContent, up: r.classList.contains('up'), lv: r.querySelector('.lvb')?.textContent, xp: r.querySelector('.jrXp')?.textContent,
  stats: [...r.querySelectorAll('.jrStat')].map((s) => s.textContent), learnt: [...r.querySelectorAll('.jrLearn')].map((s) => s.textContent),
})));

try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const checks = [];
    const xp = { knight: xpFor(10) - 4, samurai: xpFor(30) - 4, wizard: xpFor(5) - 3, archer: xpFor(7) + 30, cleric: xpFor(3) - 2 };
    const { ctx, page, errors } = await newPage(w, h, baseMeta(PARTY, xp));
    results.push({ w, h, checks, errors });
    await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('undead', 0)); });
    await page.locator('#ptGo').waitFor({ state: 'visible' });
    await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate((party) => {
      const g = window.__game;
      g.run.gold = 500; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
      g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.newBattle(); g.refresh();
    }, PARTY);
    const win = async () => {
      await page.click('#fight'); await page.waitForTimeout(600);
      await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
      await page.waitForFunction(() => !document.getElementById('result').hidden && document.getElementById('result').classList.contains('jr'), null, { timeout: 120000 });
    };
    // ---- wave 1 won, three heroes rising a level (the knight to 10, the samurai to 30)
    await win();
    await page.waitForTimeout(1500);
    await shot(page, w, checks, 'win-mid', '#result');
    await page.waitForFunction(() => document.querySelector('#jrBody').classList.contains('done'), null, { timeout: 20000 });
    await page.waitForTimeout(400);
    await shot(page, w, checks, 'win', '#result');
    const rows = await rowsOf(page);
    checks.push({ name: 'win-rows', rows });
    assert.equal(rows.length, 5);
    const knight = rows.find((r) => r.lv === 'Lv 10');
    assert.ok(knight && knight.up && knight.stats.length === 2 && knight.learnt.some((l) => l.startsWith('New skill:')), 'the knight reaches 10, with stats and its new skill');
    assert.ok(rows.some((r) => r.learnt.some((l) => l.startsWith('Ultimate unlocked:'))), 'the samurai unlocks its ultimate');
    assert.ok(rows.some((r) => !r.up), 'a hero that did not level shows no burst');
    assert.ok(await page.locator('#jrHead .jrTitle').textContent() === 'VICTORY');
    // (a tap between waves goes on)
    await page.evaluate(() => { window.__game.earned = []; });
    await page.click('#jrHead .jrTitle');
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 20000 });
    if (await page.locator('#events').isVisible()) await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
    // ---- wave 2 won with a big haul: gear, chests, shards, tomes, a stone, a hero joining, the army's rare drop
    await page.evaluate(() => {
      const g = window.__game;
      window.__forceDrop = 'both';
      g.run.buff = { gear: { id: 900, slot: 'weapon', tier: 2, name: 'Steel Blade', hp: 0, atk: 0.16 }, gold: 12 };
      g.run.items = [];
      const orig = g.noteRecap;
      g.noteRecap = function (...a) {
        const m = this.meta;
        if (!m.unlocked.includes('reaper')) m.unlocked.push('reaper');
        m.stash.push({ army: 'undead', at: 5, tier: 0, seed: 11 }, { army: 'undead', at: 3, tier: 0, seed: 12 });
        m.shards.knight = (m.shards.knight ?? 0) + 5;
        m.tomes = { small: 2, medium: 1 };
        m.stones = (m.stones ?? 0) + 1;
        this.run.items.push({ id: 901, slot: 'charm', tier: 1, name: 'Jade Charm', hp: 0.03, atk: 0.03 }, { id: 902, slot: 'charm', tier: 3, name: 'Ember Charm', hp: 0.03, atk: 0.03 });
        this.noteRecap = orig;
        return orig.apply(this, a);
      };
    });
    await page.locator('#fight').waitFor({ state: 'visible' });
    await win();
    // (the first tap hurries the count-ups: tapped here only while they still run, as a slow machine may have finished them)
    await page.evaluate(() => { if (!window.__game.jr.done()) document.querySelector('#jrHead .jrTitle').click(); });
    await page.waitForTimeout(500);
    const items = await page.evaluate(() => [...document.querySelectorAll('#jrBody .jrItem')].map((e) => ({ text: e.textContent, icon: !!e.querySelector('.jrIco') })));
    const lines = await page.evaluate(() => [...document.querySelectorAll('#jrBody .jrLine')].map((e) => e.textContent));
    const counts = await page.evaluate(() => [...document.querySelectorAll('#jrBody .jrCount')].map((e) => e.textContent));
    checks.push({ name: 'haul', items, lines, counts, gains: await page.evaluate(() => JSON.stringify(window.__game.waveCard?.gains)), data: await page.evaluate(() => window.__game.jrData?.items.length) });
    if (!items.length) console.log(JSON.stringify(checks.at(-1)));
    assert.ok(items.length >= 6 && items.every((i) => i.icon), `items with icons: ${items.length}`);
    assert.ok(lines.some((l) => l.startsWith('✧Found:')), 'the rare drop is listed');
    assert.ok(await page.evaluate(() => document.querySelector('#jrBody').classList.contains('done')), 'one tap finished the count');
    await shot(page, w, checks, 'haul', '#result');
    await page.evaluate(() => { document.getElementById('result').scrollTop = 99999; });
    await page.waitForTimeout(300);
    await shot(page, w, checks, 'haul-end', '#result');
    await page.evaluate(() => { window.__game.earned = []; window.__forceDrop = undefined; });
    await page.click('#jrHead .jrTitle').catch(() => page.evaluate(() => document.getElementById('result').click()));
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 20000 });
    for (let i = 0; i < 6 && await page.locator('.earnedArrival, .tarotReveal').count(); i++) { await page.waitForTimeout(700); await page.locator('.earnedArrival, .tarotReveal').first().dispatchEvent('pointerdown'); }
    if (await page.locator('#events').isVisible()) await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
    // ---- wave 3 lost with no hearts left: DEFEAT, then the run's end recap
    await page.locator('#fight').waitFor({ state: 'visible' });
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; g.run.retries = 2; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
    await page.locator('#next').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('#jrBody')?.classList.contains('done'), null, { timeout: 20000 });
    await shot(page, w, checks, 'loss', '#result');
    assert.equal(await page.locator('#jrHead .jrTitle').textContent(), 'DEFEAT');
    assert.ok(await page.locator('#summary').isVisible(), 'a loss keeps its line');
    await page.click('#next');
    await page.locator('.rcSheet').waitFor({ state: 'visible' });
    await page.waitForTimeout(1200);
    await shot(page, w, checks, 'recap-mid', '#recap');
    await page.click('.rcSheet .jrTitle');
    await page.waitForTimeout(400);
    await shot(page, w, checks, 'recap', '#recap');
    const recapRows = await rowsOf(page);
    const heads = await page.evaluate(() => [...document.querySelectorAll('#recap h3')].map((e) => e.textContent));
    checks.push({ name: 'recap', recapRows, heads });
    assert.ok(recapRows.length >= 5 && recapRows.some((r) => r.up), 'the run recap fills each hero over the run');
    assert.ok(heads.includes('Wave by wave') && heads.includes('Company performance') && !heads.includes('Experience earned'));
    await page.evaluate(() => { const r = document.querySelector('#recap'); r.scrollTop = 99999; document.querySelector('.rcSheet').scrollTop = 99999; });
    await page.waitForTimeout(300);
    await shot(page, w, checks, 'recap-end', '#recap');
    await page.evaluate(() => document.querySelector('#recap .rcFoot button')?.click());
    await page.waitForTimeout(500);
    assert.deepEqual(errors, []);
    await ctx.close();

    // ---- the Last Stand's end: eight heroes
    const s = await newPage(w, h, baseMeta(EIGHT, Object.fromEntries(EIGHT.map((k) => [k, xpFor(20)]))));
    results.push({ w, h, stand: true, checks, errors: s.errors });
    await s.page.waitForFunction(() => document.getElementById('hmTower'), {}, { timeout: 60000 });
    await s.page.evaluate(() => document.getElementById('hmTower').click());
    await s.page.waitForTimeout(1500);
    if (await s.page.evaluate(() => !!document.querySelector('.stPick:not([hidden])'))) {
      await s.page.evaluate(() => [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click());
      await s.page.evaluate(() => document.querySelector('.stPick .primary').click());
      await s.page.waitForTimeout(800);
    }
    await s.page.waitForFunction(() => window.__game.stand?.state, null, { timeout: 30000 });
    await s.page.evaluate(() => { const st = window.__game.stand; st.debugJump(6, 3); document.querySelector('.stStart').click(); });
    await s.page.waitForTimeout(1500);
    await s.page.evaluate(() => {
      const s = window.__game.stand.state;
      s.run.heroes.forEach((h, i) => { h.lv = 2 + (i * 3) % 9; h.xp = 40 + i * 9; h.kills = 3 + ((i * 7) % 11); });
      s.king.hp = 1; for (const u of s.b.units) if (u.tag !== undefined) { u.alive = false; u.hp = 0; }
    });
    for (let i = 0; i < 60 && !(await s.page.evaluate(() => !document.querySelector('.stEnd').hidden)); i++) await s.page.waitForTimeout(1000);
    await s.page.waitForTimeout(1300);
    await shot(s.page, w, checks, 'stand8-mid', '.stEnd');
    await s.page.waitForFunction(() => document.querySelector('.stEnd .jrBody')?.classList.contains('done'), null, { timeout: 20000 });
    await shot(s.page, w, checks, 'stand8', '.stEnd');
    const standRows = await rowsOf(s.page);
    checks.push({ name: 'stand8-rows', standRows });
    assert.equal(standRows.length, 8);
    assert.ok(await s.page.evaluate(() => document.querySelector('.stEnd .jrBody').classList.contains('compact')));
    await s.page.evaluate(() => { const c = document.querySelector('.stEndCard'); c.scrollTop = 99999; });
    await s.page.waitForTimeout(300);
    await shot(s.page, w, checks, 'stand8-end', '.stEnd');
    assert.deepEqual(s.errors, []);
    await s.ctx.close();
  }
  // ---- reduced motion at 393: the end values at once, no count
  if (!only || only === '393') {
    const checks = [];
    const { ctx, page, errors } = await newPage(393, 852, baseMeta(PARTY, { knight: xpFor(10) - 4, samurai: xpFor(6) - 2, wizard: 100, archer: 0, cleric: 0 }));
    results.push({ w: 393, h: 852, calm: true, checks, errors });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('undead', 0)); });
    await page.locator('#ptGo').waitFor({ state: 'visible' });
    await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate((party) => { const g = window.__game; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 })); g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.newBattle(); g.refresh(); }, PARTY);
    await page.click('#fight'); await page.waitForTimeout(600);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => document.getElementById('result').classList.contains('jr'), null, { timeout: 120000 });
    await page.waitForTimeout(150);
    const calm = await page.evaluate(() => ({ done: document.querySelector('#jrBody').classList.contains('done'), calm: document.querySelector('#jrBody').classList.contains('calm') }));
    checks.push({ name: 'calm', ...calm });
    assert.ok(calm.done && calm.calm, 'reduced motion shows the end at once');
    await shot(page, 393, checks, 'calm', '#result');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(`docs/samples/jrpg-recap-checks${only ? '-' + only : ''}.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log('ok');
