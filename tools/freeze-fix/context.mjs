// FREEZE-FIX (docs/notes/freeze-fix.md): the graphics context taken away in the middle of a wave, of an ultimate's moment and of an
// Eidolon's call, on a real clock. Twice each: given back after a second (the picture must come back and the fight go on, with no
// reload), and never given back (the page must load again within a few seconds, into the same run and wave, nothing lost or counted
// twice).
//
//   npm run web && node tools/freeze-fix/context.mjs [--only wave|ultimate|call]        (ROOT=<dir> for another build)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const PORT = Number(process.env.PORT ?? 8713);
const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OWNED = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let failed = 0;

async function one(when, restore) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  const said = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  page.on('console', (m) => /graphics context/.test(m.text()) && said.push(m.text()));
  await page.addInitScript(([owned, xp]) => {
    if (sessionStorage.getItem('ctx-set')) return;
    sessionStorage.setItem('ctx-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts'], ultSeen: Object.fromEntries(owned.map((k) => [k, 1])), eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel', confirmed: true } }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, quips: false }));
  }, [OWNED, xpAt(32)]);
  const boot = async () => {
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
    await page.waitForTimeout(1500);
  };
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await boot();
  // (a run begun and saved as the game saves one, at stage 6, so the saved run is what a reload must come back to)
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 6, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
    localStorage.setItem('legends.run', JSON.stringify(g.run));
  }, OWNED);
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('bossCard')?.click(); document.getElementById('fight').click(); });
  await page.waitForFunction(() => window.__game.b.phase === 'fight' && window.__game.b.t > 2500, null, { timeout: 60000, polling: 200 });
  if (when === 'ultimate') {
    await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.alive && x.side === 'hero' && x.owner === undefined); u.charge2 = 100; document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await page.waitForFunction(() => !!window.__game.ultm.queue.current, null, { timeout: 20000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  if (when === 'call') {
    await page.evaluate(() => document.querySelector('.ehFight')?.click());
    await page.waitForFunction(() => !!window.__game.eid.p, null, { timeout: 20000, polling: 100 }).catch(() => {});
    await page.waitForTimeout(600);
  }
  const before = await page.evaluate(() => { const g = window.__game; return { stage: g.run.stage, crowns: g.meta.crowns, xp: JSON.stringify(g.meta.xp), horn: g.meta.eidolons?.horn, show: when2(), t: g.b.t }; function when2() { return g.ultm.queue.current ? 'moment' : g.eid.p ? 'call' : 'none'; } });
  await page.evaluate((restore) => {
    // (a mark on this page: a page loaded again has none)
    window.__mark = true;
    const gl = window.__game.app.renderer.gl;
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    if (restore) setTimeout(() => ext.restoreContext(), 1000);
  }, restore);
  // (given back: a few seconds to see that no reload comes. Never given back: up to half a minute for the reload, on a slow machine)
  let loaded = false;
  let last = { stage: before.stage, crowns: before.crowns, xp: before.xp };
  for (let i = 0; i < (restore ? 9 : 30) && !loaded; i++) {
    await page.waitForTimeout(1000);
    // (the save as it stands each second: a wave the fight goes on to win before the reload is counted, once, and the reload must
    // come back to what was saved then)
    const now = await page.evaluate(() => (window.__mark ? { stage: window.__game.run.stage, crowns: window.__game.meta.crowns, xp: JSON.stringify(window.__game.meta.xp) } : null)).catch(() => null);
    if (now) last = now;
    loaded = !(await page.evaluate(() => !!window.__mark).catch(() => false));
  }
  let out;
  if (loaded) {
    await page.waitForLoadState('load', { timeout: 240000 }).catch(() => {});
    await boot();
    await page.waitForTimeout(1000);
    out = await page.evaluate(() => { const g = window.__game; return { reloaded: true, stage: g.run.stage, phase: g.b.phase, home: !!g.homeUp, crowns: g.meta.crowns, xp: JSON.stringify(g.meta.xp), horn: g.meta.eidolons?.horn, lost: g.app.renderer.gl.isContextLost(), heroes: g.run.roster?.length }; });
  } else {
    // (the fight's clock, or the clock of the show that rightly holds it)
    const clock = () => page.evaluate(() => { const g = window.__game; return g.b.t + (g.ultm.queue.clock ?? 0) + (g.eid.p?.t ?? 0) + g.ultm.queue.seq * 1e6; });
    const t1 = await clock();
    await page.waitForTimeout(2500);
    const t2 = await clock();
    out = await page.evaluate(() => { const g = window.__game; return { reloaded: false, stage: g.run.stage, phase: g.b.phase, home: !!g.homeUp, crowns: g.meta.crowns, xp: JSON.stringify(g.meta.xp), horn: g.meta.eidolons?.horn, lost: g.app.renderer.gl.isContextLost(), t: g.b.t, ticker: g.app.ticker.started }; });
    out.moving = t2 !== t1 || out.phase !== 'fight';
  }
  // (the picture: a screenshot's middle is not one flat colour when the board is drawn)
  await page.screenshot({ path: `out/freeze-fix/context-${when}-${restore ? 'restored' : 'kept'}.png` }).catch(() => {});
  const same = out.stage === last.stage && out.crowns === last.crowns && (out.reloaded ? out.xp === last.xp : true);
  const ok = restore
    ? !out.reloaded && !out.lost && out.moving && errs.length === 0
    : out.reloaded && !out.lost && !out.home && out.phase === 'deploy' && same && errs.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} lost mid-${when} (${before.show}), ${restore ? 'given back after 1 s' : 'never given back'}: ${out.reloaded ? `page loaded again: stage ${before.stage} when lost, ${last.stage} saved before the reload, ${out.stage} after, ${out.phase}, home ${out.home}, crowns and xp ${same ? 'as they were' : 'CHANGED'}` : `no reload; context ${out.lost ? 'still lost' : 'back'}, fight ${out.moving ? 'going on' : 'not moving'}`}; page errors ${errs.length}${errs.length ? ` (${errs[0].slice(0, 120)})` : ''}; logged: ${said.join(' | ') || 'nothing'}`);
  await ctx.close();
}

import { mkdirSync } from 'node:fs';
mkdirSync('out/freeze-fix', { recursive: true });
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
for (const when of ['wave', 'ultimate', 'call'].filter((w) => !ONLY || w === ONLY)) for (const restore of [true, false]) await one(when, restore).catch((e) => { failed++; console.log(`FAIL lost mid-${when}: ${String(e.message).split('\n')[0]}`); });
console.log(failed ? `${failed} failed` : 'all passed');
await browser.close();
srv.close();
process.exit(failed ? 1 : 0);
