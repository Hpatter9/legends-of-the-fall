// TEN-LIVES review: a real army run in the built game at the three phone sizes. The lives in the top bar; a hero down with its
// countdown (over its spot and on its row); the hero risen; the whole party down and raised at once; a wave won with lives spent (the
// short card); the last life gone and the wave lost; the recap.
// Usage: node tools/ten-lives/shots.mjs [width]  (serves out/web on :8697; screenshots to docs/samples/ten-lives-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8697;
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg' };
const server = createServer((q, r) => {
  const p = 'out/web/' + (decodeURIComponent(q.url.split('?')[0].slice(1)) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const only = process.argv[2];
const results = [];
const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'cleric'];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    if (only && only !== String(w)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    const checks = [];
    results.push({ w, h, checks, errors });
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
      await page.screenshot({ path: `docs/samples/ten-lives-${name}-${w}x${h}.png` });
      const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth);
      assert.ok(!over, `${name} overflows at ${w}`);
      const lives = await page.evaluate(() => { const r = document.getElementById('lives').getBoundingClientRect(); return { text: document.getElementById('lives').textContent, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), hidden: document.getElementById('lives').hidden }; });
      checks.push({ name, lives });
    };
    const state = () => page.evaluate(() => { const g = window.__game; return { phase: g.b.phase, lives: g.b.lives, runLives: g.run.lives ?? 0, falls: g.run.falls ?? 0, gold: g.run.gold, up: g.b.units.filter((u) => u.side === 'hero').map((u) => u.alive) }; });
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
    /** Hold the foes still and out of harm's way, so the heroes fall only when the script fells them. */
    const holdFoes = () => page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.maxHp = u.hp = 1e9; u.busyUntil = 1e12; } });
    const fell = (kinds) => page.evaluate((kinds) => { const g = window.__game; for (const u of g.b.units) if (u.side === 'hero' && (!kinds || kinds.includes(u.def))) { u.hp = 0; u.alive = false; u.diedAt = g.b.t; } }, kinds);
    // ---- wave 1: the lives in the top bar
    await page.click('#fight'); await page.waitForTimeout(700);
    await holdFoes();
    await shot('hud');
    checks.push({ name: 'start', ...(await state()) });
    // ---- a hero down: its countdown over its spot and on its row
    await fell(['archer']);
    await page.waitForFunction(() => { const g = window.__game; const a = g.b.units.find((u) => u.def === 'archer'); return !a.alive && g.b.t - a.diedAt >= 1500; }, null, { timeout: 30000 });
    await shot('down');
    checks.push({ name: 'down', row: await page.evaluate(() => [...document.querySelectorAll('.fhRow.rising')].map((e) => e.dataset.revive)) });
    // ---- the hero risen: a life spent, the count jumps
    await page.waitForFunction(() => window.__game.b.units.find((u) => u.def === 'archer').alive, null, { timeout: 30000 });
    await page.waitForTimeout(250);
    await shot('risen');
    checks.push({ name: 'risen', ...(await state()) });
    assert.equal((await state()).lives.left, 9);
    await page.waitForTimeout(1200);
    // ---- the whole party down: all rise at once, a life each, with a line saying so
    await page.waitForTimeout(1200);
    await fell();
    await page.waitForFunction(() => window.__game.b.lives.left === 4, null, { timeout: 30000 });
    await page.waitForTimeout(450);
    await shot('all-down');
    checks.push({ name: 'all-down', line: await page.evaluate(() => document.querySelector('.reviveLine')?.textContent), ...(await state()) });
    assert.equal((await state()).falls, 1);
    // ---- the wave won with lives spent: the short card says how many
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot('card');
    checks.push({ name: 'card', notes: await page.evaluate(() => [...document.querySelectorAll('#waveNotes .wn')].map((e) => e.textContent)) });
    await page.click('#banner').catch(() => {});
    await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 30000 });
    await clearEvent();
    // ---- wave 2: the last lives go, the fallen stay down, and with everyone down the wave and the run are lost
    await page.locator('#fight').waitFor({ state: 'visible' });
    await shot('deploy');
    await page.click('#fight'); await page.waitForTimeout(700);
    await holdFoes();
    // ---- a revive that falls due while an ultimate's show holds the fight: the show plays, the hero rises, the fight goes on
    // (the cleric is held still meanwhile: her own revive would raise the archer first, and spend no life)
    await page.evaluate(() => { const g = window.__game; g.b.units.find((u) => u.def === 'cleric').busyUntil = g.b.t + 9000; });
    await fell(['archer']);
    await page.waitForFunction(() => { const g = window.__game; const a = g.b.units.find((u) => u.def === 'archer'); return !a.alive && g.b.t - a.diedAt >= 4300; }, null, { timeout: 30000 });
    const fired = await page.evaluate(() => { const g = window.__game; for (const def of ['wizard', 'samurai', 'knight']) { const k = g.b.units.find((u) => u.def === def); k.charge2 = 1e6; g.hud.tapUlt(k.id); } return { order: !!g.b.orders?.some((o) => o.kind === 'ult'), t: g.b.t, full: g.ultAutoOn?.() }; });
    // (watched for eight seconds: whether the show was up, and whether the hero rose while it was or just after)
    const show = await page.evaluate(() => new Promise((done) => {
      const g = window.__game; const seen = { show: 0, roseAt: -1, heldAt: [] }; let n = 0;
      const id = setInterval(() => {
        if (g.ultm.queue.current) { seen.show++; seen.heldAt.push(g.b.t); }
        if (seen.roseAt < 0 && g.b.units.find((u) => u.def === 'archer').alive) seen.roseAt = g.b.t;
        if (++n >= 80) { clearInterval(id); seen.heldAt = [seen.heldAt[0], seen.heldAt.at(-1)]; done(seen); }
      }, 100);
    }));
    await page.waitForFunction(() => window.__game.b.units.find((u) => u.def === 'archer').alive, null, { timeout: 60000 });
    const t1 = await page.evaluate(() => window.__game.b.t);
    await page.waitForFunction((t) => window.__game.b.t > t + 2000 && !window.__game.ultm.queue.current, t1, { timeout: 60000 });
    checks.push({ name: 'revive-through-ultimate', fired, show, ults: await page.evaluate(() => window.__game.ultsFired.length), ...(await state()) });
    assert.ok(fired.order, 'the ultimate was ordered');
    assert.equal((await state()).lives.left, 3);
    await page.waitForTimeout(1200);
    await fell(['knight', 'samurai', 'wizard']);
    // (the three rise, by a life each or, for one of them now and then, by the cleric's own revive, which spends none; then the last lives go)
    await page.waitForFunction(() => window.__game.b.units.filter((u) => u.side === 'hero').every((u) => u.alive), null, { timeout: 60000 });
    await page.evaluate(() => { const g = window.__game; g.b.lives.spent += g.b.lives.left; g.b.lives.left = 0; g.run.lives = 10; g.refresh(); });
    await page.waitForTimeout(1300);
    await fell(['knight', 'archer']);
    await page.waitForTimeout(1500);
    await shot('none-left');
    checks.push({ name: 'none-left', rows: await page.evaluate(() => [...document.querySelectorAll('.fhRow.rising')].length), ...(await state()) });
    await fell();
    await page.locator('#next').waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForTimeout(900);
    await shot('lost');
    checks.push({ name: 'lost', banner: await page.textContent('#banner'), next: await page.textContent('#next') });
    await page.click('#next');
    await page.waitForTimeout(6500);
    await shot('recap');
    checks.push({ name: 'recap', text: await page.evaluate(() => (document.body.innerText.match(/Lives spent[^\n]*\n?[^\n]*/i) ?? [''])[0]) });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync('docs/samples/ten-lives-checks.json', JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results, null, 1));
}
