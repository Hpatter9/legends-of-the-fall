// HEART-ROWS review: the lives in the top bar at the three phone sizes, in a real army run of the built game. The bar with 10, 7, 3 and
// 0 lives (in a fight), the deploy, the result card and the march between waves, a filmstrip of one heart fading and of five fading
// at once (the whole party fell), and where every piece of the bar sits (nothing over another, nothing off the page).
// Usage: node tools/heart-rows/shots.mjs [width]  (serves out/web on :8698; to docs/samples/heart-rows/)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8698;
const OUT = 'docs/samples/heart-rows';
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
    const top = async () => page.evaluate(() => Math.ceil(document.getElementById('top').getBoundingClientRect().bottom) + 4);
    /** Where each piece of the bar sits, and that none lies over another or off the page. */
    const layout = () => page.evaluate(() => {
      const box = (id) => { const e = document.getElementById(id); if (!e || e.hidden || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
      const at = Object.fromEntries(['lives', 'gold', 'clock', 'mute', 'gear', 'speed', 'version', 'status', 'top'].map((id) => [id, box(id)]));
      // (the gold's text, not its column: the column may be wider than the words)
      const g = document.getElementById('gold'); const rg = document.createRange(); rg.selectNodeContents(g); const gr = rg.getBoundingClientRect();
      at.goldText = { l: Math.round(gr.left), r: Math.round(gr.right) };
      const row = ['lives', 'goldText', 'clock', 'mute', 'gear', 'speed'].filter((k) => at[k]);
      const clash = [];
      for (let i = 1; i < row.length; i++) if (at[row[i - 1]].r > at[row[i]].l) clash.push(`${row[i - 1]} over ${row[i]}`);
      if (at.version && at.lives && at.version.t < at.lives.b && at.version.l < at.lives.r) clash.push('version over lives');
      const hearts = [...document.querySelectorAll('#lives .hearts img')].map((i) => i.className);
      return { at, clash, off: Object.values(at).some((r) => r && r.r > innerWidth + 0.5), hearts, label: document.getElementById('lives').getAttribute('aria-label'), low: document.getElementById('lives').classList.contains('low') };
    });
    const shot = async (name, full = false) => {
      await page.screenshot({ path: `${OUT}/${name}-${w}x${h}.png`, ...(full ? {} : { clip: { x: 0, y: 0, width: w, height: await top() } }) });
      const l = await layout();
      checks.push({ name, ...l });
      assert.deepEqual(l.clash, [], `${name} at ${w}: ${l.clash}`);
      assert.ok(!l.off, `${name} runs off the page at ${w}`);
    };
    const setLeft = (n) => page.evaluate((n) => { const g = window.__game; const spent = 10 - n; if (g.b.lives) { g.b.lives.left = n; } g.run.lives = spent; g.refresh(); }, n);
    await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('undead', 0)); });
    await page.locator('#ptGo').waitFor({ state: 'visible' });
    await page.click('#ptGo');
    await page.waitForTimeout(900);
    await page.evaluate((party) => {
      const g = window.__game;
      g.run.gold = 12500; g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
      g.run.squad = party.map((_, i) => i + 1); g.run.nextId = 6; g.newBattle(); g.refresh();
    }, PARTY);
    await page.waitForTimeout(500);
    await shot('deploy-10', true);
    await page.click('#fight'); await page.waitForTimeout(700);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.maxHp = u.hp = 1e9; u.busyUntil = 1e12; } });
    await shot('fight-10');
    // ---- one heart fading: a filmstrip of the bar's left end every 80 ms
    const film = async (name, act) => {
      const r = await page.evaluate(() => { const e = document.querySelector('#lives .hearts').getBoundingClientRect(); return { x: Math.max(0, e.left - 6), y: Math.max(0, e.top - 6), width: e.width + 12, height: e.height + 12 }; });
      // (the fades are paused as they start and stepped through by hand, 60 ms a frame: a screenshot is slower than the fade)
      await act();
      const end = await page.evaluate(() => { const a = [...document.querySelectorAll('#lives .hearts img')].flatMap((i) => i.getAnimations()); a.forEach((x) => x.pause()); return Math.max(0, ...a.map((x) => x.effect.getComputedTiming().endTime)); });
      const frames = [];
      for (let t = 0; t <= end + 60; t += 60) {
        await page.evaluate((t) => { for (const i of document.querySelectorAll('#lives .hearts img')) for (const a of i.getAnimations()) a.currentTime = t; }, t);
        frames.push((await page.screenshot({ clip: r })).toString('base64'));
      }
      await page.evaluate(() => { for (const i of document.querySelectorAll('#lives .hearts img')) for (const a of i.getAnimations()) a.finish(); });
      // (laid side by side on one picture)
      const strip = await ctx.newPage();
      await strip.setContent(`<body style="margin:0;background:#111;display:flex;flex-wrap:wrap;gap:4px;padding:4px">${frames.map((f) => `<img style="width:${r.width}px" src="data:image/png;base64,${f}">`).join('')}</body>`);
      await strip.setViewportSize({ width: Math.ceil(Math.min(frames.length, 10) * (r.width + 4) + 4), height: Math.ceil(Math.ceil(frames.length / 10) * (r.height + 4) + 4) });
      await strip.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` });
      await strip.close();
    };
    await film('fade-one', () => setLeft(9));
    await page.waitForTimeout(400);
    await setLeft(7); await page.waitForTimeout(800);
    await shot('fight-7');
    await film('fade-five', () => setLeft(2));
    await page.waitForTimeout(800);
    await setLeft(3); await page.waitForTimeout(800);
    await shot('fight-3');
    assert.ok((await layout()).low, 'three left is the low state');
    await setLeft(0); await page.waitForTimeout(800);
    await shot('fight-0');
    // ---- the result card and the march between waves
    await setLeft(6); await page.waitForTimeout(300);
    await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot('card-6', true);
    await page.click('#banner').catch(() => {});
    await page.waitForTimeout(700);
    await shot('march-6', true);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync(`${OUT}/checks.json`, JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results.map((r) => ({ w: r.w, errors: r.errors, checks: r.checks.map((c) => ({ name: c.name, clash: c.clash, hearts: c.hearts?.filter((x) => x === 'full').length, lives: c.at?.lives, gold: c.at?.goldText, clock: c.at?.clock, version: c.at?.version })) })), null, 1));
}
