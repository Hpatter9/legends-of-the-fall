// Casts every king's spell once in a real fight in headless Chromium and logs what played: the cues (`window.__sfxLog`), the
// spell files (logged there as `sfx:<file>`) and the peak level at the page's output in the 2.5 s after each cast, with the battle music on.
//   npm run web && node tools/spell-sfx/probe.mjs [port]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = +(process.argv[2] ?? 8650);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
const ALL = ['heal', 'meteor', 'haste', 'shield', 'smite', 'chain', 'poison', 'frost', 'rally', 'quake', 'resurrect', 'cleanse', 'blink', 'hex', 'lance', 'renewal', 'deepfreeze', 'warcry', 'bulwark', 'wolves', 'starfall'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(([heroes]) => {
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [] }));
  localStorage.setItem('lotf-tips-off', '1');
  // (a tap on the page's output: everything that reaches the speakers also feeds an analyser, read for its peak)
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const c = dest.context;
      if (!c.__tap) { c.__tap = new AnalyserNode(c, { fftSize: 2048 }); window.__tap = c.__tap; }
      connect.call(this, c.__tap);
    }
    return connect.call(this, dest, ...rest);
  };
}, [HEROES]);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__game, {}, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.mouse.click(5, 5);
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 9999;
  for (let i = 0; i < 12; i++) document.getElementById('summon')?.click();
  g.run.stage = 6; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('auto')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(1500);
// (the screen spot of each tile, by asking the page which tile is under a grid of points)
const spots = await page.evaluate(() => {
  const g = window.__game; const out = {};
  const r = g.app.canvas.getBoundingClientRect();
  for (let y = r.top; y < r.bottom; y += 4) for (let x = r.left; x < r.right; x += 4) {
    const t = g.tileAtScreen(x, y); if (!t) continue;
    const k = t.join(','); (out[k] ??= []).push([x, y]);
  }
  for (const k in out) { const l = out[k]; out[k] = l[Math.floor(l.length / 2)]; }
  return out;
});
const peakOver = (ms) => page.evaluate((ms) => new Promise((ok) => {
  const a = window.__tap; const d = new Float32Array(a.fftSize); let peak = 0, sum = 0, n = 0;
  const t0 = performance.now();
  const id = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) { peak = Math.max(peak, Math.abs(x)); sum += x * x; n++; } if (performance.now() - t0 > ms) { clearInterval(id); ok({ peak, rms: Math.sqrt(sum / n) }); } }, 20);
}), ms);
const db = (x) => (20 * Math.log10(Math.max(1e-6, x))).toFixed(1);
const base = await peakOver(1500);
console.log(`music + fight, no spell: peak ${db(base.peak)} dB, rms ${db(base.rms)} dB; track ${JSON.stringify(await page.evaluate(() => window.__audioDebug().track))}`);
const report = [];
for (let i = 0; i < ALL.length; i += 3) {
  const group = ALL.slice(i, i + 3);
  for (const id of group) {
    const ok = await page.evaluate(([group, id]) => {
      const g = window.__game; const b = g.b;
      if (b.phase !== 'fight') return 'not in a fight';
      g.meta.spellbook.owned = [...new Set([...g.meta.spellbook.owned, ...group])];
      g.meta.spellbook.equipped = group; g.buildSpells();
      b.spells.mana = 10; for (const k of Object.keys(b.spells.ready)) b.spells.ready[k] = 0;
      // (keep the fight going: every unit stays alive long enough to be cast on)
      for (const u of b.units) if (u.alive) { if (u.side === 'foe') u.maxHp = Math.max(u.maxHp, 20000); u.hp = u.maxHp; }
      if (id === 'resurrect') { const h = b.units.find((u) => u.side === 'hero' && u.alive); h.alive = false; h.hp = 0; h.diedAt = b.t; }
      if (id === 'heal' || id === 'renewal') for (const u of b.units) if (u.side === 'hero' && u.alive) u.hp = Math.ceil(u.maxHp / 3);
      window.__sfxLog = [];
      return 'ok';
    }, [group, id]);
    if (ok !== 'ok') { console.log(id, ok); continue; }
    // (where to cast: on the foes for harm, on the heroes for help, a fallen hero's tile, an empty tile for a blink or the wolves)
    const tile = await page.evaluate((id) => {
      const b = window.__game.b; const units = b.units;
      const at = (u) => [u.u, u.v];
      if (id === 'resurrect') return at(units.find((u) => u.side === 'hero' && !u.alive));
      if (['heal', 'shield', 'haste', 'cleanse', 'renewal'].includes(id)) return at(units.find((u) => u.side === 'hero' && u.alive));
      const foe = units.find((u) => u.side === 'foe' && u.alive);
      if (id === 'blink' || id === 'wolves') {
        for (let r = 1; r < 4; r++) for (let du = -r; du <= r; du++) for (let dv = -r; dv <= r; dv++) {
          const u = foe.u + du, v = foe.v + dv;
          const t = b.board.tiles?.[v]?.[u];
          if (!units.some((x) => x.alive && x.u === u && x.v === v) && u >= 0 && v >= 0 && u < b.board.w && v < b.board.d) return [u, v];
        }
      }
      return at(foe);
    }, id);
    const card = page.locator(`#spellCards .spell[data-id="${id}"]`);
    await card.click();
    const target = await page.evaluate((id) => window.__game.b && ['rally', 'quake', 'warcry', 'bulwark'].includes(id), id);
    if (!target) {
      const s = await page.evaluate((t) => { const g = window.__game; const r = g.app.canvas.getBoundingClientRect(); let best = null; for (let y = r.top; y < r.bottom; y += 3) for (let x = r.left; x < r.right; x += 3) { const q = g.tileAtScreen(x, y); if (q && q[0] === t[0] && q[1] === t[1]) { best = [x, y]; } } return best; }, tile);
      if (!s) { console.log(id, 'no screen spot for tile', tile); continue; }
      await page.mouse.click(s[0], s[1]);
    }
    // (`SHOT=path`: a picture of the meteor shower on its way down)
    if (process.env.SHOT && id === 'starfall') { await page.waitForTimeout(700); await page.screenshot({ path: process.env.SHOT }); }
    const lvl = await peakOver(2500);
    const r = await page.evaluate(() => ({ cues: window.__sfxLog.filter((x) => !x.startsWith('sfx:')), files: window.__sfxLog.filter((x) => x.startsWith('sfx:')).map((x) => x.slice(4)), mana: window.__game.b.spells.mana }));
    report.push({ id, ...r, peak: db(lvl.peak), rms: db(lvl.rms) });
    console.log(`${id.padEnd(11)} cast=${r.mana < 9.5 ? 'yes' : 'NO'} peak ${db(lvl.peak)} rms ${db(lvl.rms)} | cues: ${r.cues.join(' ')} | files: ${(r.files ?? []).join(' ')}`);
  }
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
srv.close();
